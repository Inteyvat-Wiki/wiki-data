import type { MapRecord } from 'genshin-db';
import type { MapMaskConditions, MapScene } from '@inteyvat-wiki/wiki-contracts/map';
import type { TaskStepCondition, TaskStepReference } from '../types/task';
import { escape_map_text, map_id } from './map_catalogue';
import { map_layer_write } from './map_state_replay';

/** Convert exact upstream layer relations and normalized writes, never asset-name guesses. */
export function add_map_layer_conditions(scene: MapScene, records: MapRecord[], sources: ReadonlyMap<string, MapRecord>,
    lang: 'zh_hans' | 'en', references: ReadonlyMap<number, TaskStepReference>) {
    const zh = lang === 'zh_hans', byId = new Map(records.map(record => [record.id, record]));
    const text = (cn: string, en: string) => zh ? cn : en;
    const stepCondition = (id: number, state: 'finished' | 'failed'): TaskStepCondition => {
        if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid layer quest step');
        const ref = references.get(id);
        return { id: `map-task-step-${id}`, type: 'step', task: ref?.task || null, step: ref?.step ?? id, state,
            title: escape_map_text(ref?.title || text(`任务步骤 ${id}`, `Quest step ${id}`)), subtitle: escape_map_text(ref?.subtitle || '') };
    };
    const names = new Map<string, TaskStepCondition>();
    for (const floor of scene.layers) {
        const source = byId.get(floor.id), change = source?.data.name_condition as { type?: string; parameters?: number[] } | undefined;
        if (!source?.data.alternate_name || source.data.alternate_name === source.name
            || change?.type !== 'MAP_FLOOR_NAME_CHANGE_QUEST' || change.parameters?.length !== 1) continue;
        const condition = stepCondition(change.parameters[0]!, 'finished');
        if (!condition.task) continue; // Keep the original name until an exported task step is known.
        const key = `task-${condition.task}-step-${condition.step}`;
        if (!scene.states.some(choice => choice.id === key)) scene.states.push({ id: key, label: condition.title, evidence: 'source',
            options: [{ id: 'fulfilled', label: text('已完成', 'Completed') }, { id: 'unfulfilled', label: text('未完成', 'Not completed') }], taskCondition: condition });
        floor.labelVariants = [{ label: String(source.data.alternate_name), condition: { op: 'selected', key, values: ['fulfilled'] } }];
        names.set(floor.id, condition);
    }
    const writes = new Map<string, MapRecord[]>();
    for (const event of records) {
        if (event.kind !== 'quest_event' || event.data.action !== 'QUEST_EXEC_SET_MAP_LAYER_UNLOCK_STATE') continue;
        // Validate upstream interpretation even if this event has no exported image.
        map_layer_write(event);
        for (const relation of event.relations.filter(r => r.role === 'target' && r.category === 'maps')) {
            const list = writes.get(relation.id) || []; list.push(event); writes.set(relation.id, list);
        }
    }
    const groups = new Map<string, MapMaskConditions>();
    for (const overlay of scene.overlays) {
        if (overlay.kind !== 'layer' || !overlay.layerId) continue;
        const source = sources.get(overlay.id), layers = source?.relations.filter(r => r.role === 'layer' && r.category === 'maps') || [];
        if (layers.length !== 1 || scene.maskConditions?.some(group => group.overlayIds.includes(overlay.id))) continue;
        const layerId = layers[0]!.id, events = writes.get(layerId) || [], name = names.get(overlay.layerId);
        if (!events.length && !name) continue;
        if (byId.get(layerId)?.kind !== 'layer') throw new Error(`Missing source layer ${layerId}`);
        const id = `mask-${layerId}`;
        let group = groups.get(id);
        if (!group) {
            const floor = scene.layers.find(floor => floor.id === overlay.layerId)!;
            group = { id, label: floor.label, overlayIds: [], previewKey: `preview-${id}`, rules: [],
                issues: events.length ? [text('初始图层解锁状态尚未确认；仅重放已关联的任务写入。', 'The initial layer unlock state is unknown; only associated quest writes are replayed.')] : [],
                ...(events.length ? { replay: { initialVisible: null, visibleOption: 'visible', evidence: 'inferred' as const } } : {}) };
            for (const event of events) {
                const phase = event.data.phase;
                if (phase !== 'finish' && phase !== 'fail') throw new Error(`Unsupported layer write phase: ${phase}`);
                const condition = stepCondition(Number(event.data.quest_id), phase === 'finish' ? 'finished' : 'failed');
                const write = map_layer_write(event);
                if (!write || !condition.task) delete group.replay;
                group.rules.push({ id: event.id, kind: 'event', label: phase === 'finish' ? text('步骤完成时', 'When the step completes') : text('步骤失败时', 'When the step fails'),
                    when: [condition], effect: write ? write.visible ? text('解锁图层', 'Unlock layer') : text('锁定图层', 'Lock layer') : '',
                    recordId: map_id(event.id), ...(write && condition.task ? { write: { visible: write.visible, order: write.order } } : {}) });
            }
            if (name) group.rules.push({ id: `name-${floor.id}`, kind: 'requirement', label: text('楼层名称', 'Floor name'), when: [name], effect: '' });
            if (events.length && !group.replay) {
                for (const rule of group.rules) delete rule.write;
                group.issues.push(text('存在未绑定的任务写入，保留未知显示状态。', 'An unbound quest write prevents replay; visibility remains unknown.'));
            }
            groups.set(id, group);
            scene.states.push({ id: group.previewKey, label: group.label, evidence: 'preview', options: [
                { id: 'hidden', label: text('隐藏', 'Hidden') }, { id: 'visible', label: text('显示', 'Visible') }] });
        }
        group.overlayIds.push(overlay.id);
        if (group.replay) overlay.condition = { op: 'selected', key: group.previewKey, values: ['visible'] };
    }
    if (groups.size) scene.maskConditions = [...scene.maskConditions || [], ...groups.values()];
}
