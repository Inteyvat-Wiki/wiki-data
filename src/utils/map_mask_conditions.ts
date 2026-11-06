import type { MapRecord } from '@inteyvat-wiki/genshin-db';
import type { MapMaskConditions, MapMaskRule, MapOverlay, MapScene } from '@inteyvat-wiki/wiki-contracts/map';
import type { TaskCondition, TaskStepReference } from '../types/task';
import { escape_map_text, map_id } from './map_catalogue';
import { map_initial_state, map_state_write, map_level_state, map_level_write } from './map_state_replay';

type Locale = 'zh_hans' | 'en';
// A record's generic name can be a developer comment or an asset filename.
// Only an explicitly named TextMap entry is eligible as original display text.
function original_name(record?: MapRecord): string {
    const names = [...new Set(record?.texts.filter(entry => entry.role === 'name' && entry.hash
        && record.source.hashes.includes(entry.hash) && entry.text).map(entry => entry.text) || [])];
    return names.length === 1 ? display_text(names[0]!) : '';
}
function display_text(value: string): string {
    // Explicit internal-text markers are not player-facing names, even in TextMap.
    return /\$HIDDEN|^\s*[（(\[]test[）)\]]/i.test(value) ? '' : value;
}
/** Pure conversion of already-associated upstream records. Manual plot descriptions are not inputs. */
export function add_map_mask_conditions(scene: MapScene, records: MapRecord[], sources: ReadonlyMap<string, MapRecord>, lang: Locale,
    references: ReadonlyMap<number, TaskStepReference> = new Map()) {
    const zh = lang === 'zh_hans', byId = new Map(records.map(record => [record.id, record]));
    const text = (cn: string, en: string) => zh ? cn : en;
    const integer = (value: unknown, context: string): number => {
        if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?\d+$/.test(value))) throw new Error(`Invalid ${context}`);
        const number = Number(value); if (!Number.isSafeInteger(number)) throw new Error(`Invalid ${context}`); return number;
    };
    const areaLabel = (area: MapRecord): string => original_name(area) || text(`地图区域 ${integer(area.data.area_id,'mask area id')}（占位名称）`, `Map area ${integer(area.data.area_id,'mask area id')} (placeholder)`);
    const tagLabel = (tag: MapRecord): string => original_name(tag) || text(`关卡状态 ${integer(tag.data.tag_id,'mask level state id')}（占位名称）`, `Level state ${integer(tag.data.tag_id,'mask level state id')} (placeholder)`);
    const stepCondition = (id: number, state: 'finished' | 'failed'): TaskCondition => {
        const ref = references.get(id);
        return { id: `map-task-step-${id}`, type: 'step', task: ref?.task || null, step: ref?.step ?? id, state,
            title: escape_map_text(display_text(ref?.title || '') || text(`任务步骤 ${id}`, `Quest step ${id}`)), subtitle: escape_map_text(display_text(ref?.subtitle || '')) };
    };
    const groups = new Map<string, { group: MapMaskConditions; entries: Array<{ overlay: MapOverlay; source?: MapRecord }>; controller?: string }>();
    for (const overlay of scene.overlays) {
        const source = sources.get(overlay.id), controllers = source?.relations.filter(relation => relation.role === 'variant_controller' && relation.category === 'maps') || [];
        if (overlay.kind !== 'cover' && !controllers.length) continue;
        const controller = controllers.length === 1 ? controllers[0]!.id : undefined;
        const id = controller ? `mask-${controller}` : `mask-${overlay.id}`;
        let entry = groups.get(id);
        if (!entry) {
            const areaNames = source?.relations.filter(relation => relation.role === 'map_area').map(relation => {
                const area = byId.get(relation.id); if (!area || area.kind !== 'map_area') throw new Error(`Missing mask area ${relation.id}`);
                return areaLabel(area);
            }) || [];
            const label = [...new Set(areaNames)].join(' / ') || original_name(source) || text(`遮罩 ${groups.size + 1}（占位名称）`, `Mask ${groups.size + 1} (placeholder)`);
            entry = { group: { id, label, overlayIds: [], previewKey: `preview-${id}`, rules: [], issues: [] }, entries: [], controller };
            groups.set(id,entry);
        }
        entry.group.overlayIds.push(overlay.id); entry.entries.push({overlay,source});
    }
    for (const {group,entries,controller} of groups.values()) {
        const areaIds = new Set<string>(), tagIds = new Set<string>(), variants = new Map<number,string[]>();
        const add = (rule: MapMaskRule) => { if (!group.rules.some(existing => existing.id === rule.id)) group.rules.push(rule); };
        for (const {overlay,source} of entries) {
            if (!source) continue;
            for (const relation of source.relations) {
                if (relation.role === 'map_area') areaIds.add(relation.id);
                if (relation.role === 'level_tag' || relation.role === 'level_tag_context') tagIds.add(relation.id);
            }
            const nativeVariants = source.data.area_variants as Array<{area_id:number;index:number}> | undefined;
            if (controller && nativeVariants?.length === 1) {
                const variant = nativeVariants[0]!, index = integer(variant.index, 'mask variant index');
                if (index < 0 || !Number.isSafeInteger(variant.area_id)) throw new Error('Invalid mask area variant');
                if (source.relations.some(relation => relation.role === 'map_area')
                    && !source.relations.some(relation => relation.role === 'map_area' && relation.id === `map-area-${variant.area_id}`)) throw new Error('Mask variant disagrees with its area relation');
                const images = variants.get(index) || []; images.push(overlay.id); variants.set(index,images);
            }
        }
        const completeVariants = variants.size > 0 && entries.every(({overlay}) => [...variants.values()].some(ids => ids.includes(overlay.id)));
        const area = areaIds.size === 1 ? byId.get([...areaIds][0]!) : undefined;
        const initial = area && map_initial_state(area);
        // Only the ordinary, single-image controller has a corroborated gate.
        // A sole nonzero index does not prove the controller's default choice.
        const consistentArea = area && entries.every(({source}) => (source?.data.area_variants as Array<{area_id:number}> | undefined)?.[0]?.area_id === area.data.area_id);
        const ordinary = initial?.direct && consistentArea && completeVariants && variants.size === 1 && variants.has(0)
            && !tagIds.size && !(Number(area?.data.scene_point_id) > 0);
        if (ordinary) group.replay = { initialVisible: initial.initialVisible, visibleOption: 'index-0', evidence: 'inferred' };
        const level = area && map_level_state(area);
        const levelReplay = level && consistentArea && completeVariants && variants.size === 1 && variants.has(0);
        if (levelReplay) group.replay = {initialVisible:level.initialVisible,visibleOption:'index-0',evidence:'inferred'};
        const preview = (index: number): Pick<MapMaskRule, 'previewOption'> => completeVariants && variants.has(index) ? {previewOption:`index-${index}`} : {};
        // A selector is a verified child-group association, not proof that its parent is enabled.
        for (const [index,ids] of variants) if (!group.replay) add({ id:`${group.id}-index-${index}`, kind:'selector',
            label:text('图像组选择', 'Image-group selector'), when:[{id:`${group.id}-index`,type:'number',comparison:'equal',value:index,
                title:escape_map_text(group.label),subtitle:text('图像组索引', 'Image-group index')}],
            effect:text(`选择图像组 ${index}（${ids.length} 张图像）`, `Select image group ${index} (${ids.length} images)`), ...preview(index) });
        for (const areaId of areaIds) {
            const area = byId.get(areaId); if (!area || area.kind !== 'map_area') throw new Error(`Missing mask area ${areaId}`);
            if (area.data.state !== undefined) {
                const labels: Record<string,string> = {MistOpen:text('开放状态','Open state'),MistClose:text('关闭状态','Closed state')};
                const label = labels[String(area.data.state)]; if (!label) throw new Error(`Unmapped mask area state: ${area.data.state}`);
                add({id:`${group.id}-${areaId}-configured`,kind:'requirement',label:text('配置状态（非玩家当前状态）','Configured state (not current player state)'),when:[],effect:label,recordId:area.id});
            }
        }
        for (const tagId of tagIds) {
            const tag = byId.get(tagId); if (!tag || tag.kind !== 'level_tag') throw new Error(`Missing mask level tag ${tagId}`);
            if (levelReplay) continue;
            const links = (tag.data.map_areas as Array<{area_id:number;index?:number}> || []).filter(area => areaIds.has(`map-area-${area.area_id}`));
            for (const link of links) {
                if (link.index === undefined) {
                    group.issues.push(text(`${tagLabel(tag)}的图像组索引未提供，未补成 0。`, `The image-group index for ${tagLabel(tag)} is unspecified; zero is not assumed.`));
                    continue;
                }
                const index=integer(link.index,'level-tag mask index');
                add({id:`${group.id}-${tagId}-${link.area_id}-${index}`,kind:'selector',label:text('关卡状态映射','Level-state mapping'),
                    when:[{id:`map-level-state-${tag.data.tag_id}`,type:'boolean',value:true,title:escape_map_text(tagLabel(tag)),subtitle:text('关卡状态生效','Level state active')}],
                    effect:text(`地图区域 ${link.area_id} → 图像组 ${index}`,`Map area ${link.area_id} → image group ${index}`),recordId:tag.id,...preview(index)});
            }
        }
        // Every transition in the same upstream state group affects this image,
        // including transitions that turn it off in favour of a sibling image.
        const targets = new Set([...areaIds,...tagIds,...(levelReplay ? level.members.map(id => `level-tag-${id}`) : [])]);
        for (const event of records) {
            if (event.kind !== 'quest_event' || !event.relations.some(relation => relation.role === 'target' && relation.category === 'maps' && targets.has(relation.id))) continue;
            const data = event.data, phase = data.phase;
            if (phase !== 'finish' && phase !== 'fail') throw new Error(`Unmapped mask event phase: ${phase}`);
            const step = integer(data.quest_id,'mask quest step');
            let effect: string;
            if (data.action === 'QUEST_EXEC_CHANGE_MAP_AREA_STATE') {
                const state = integer(data.state,'mask state action');
                const areas=event.relations.filter(relation=>relation.role==='target'&&areaIds.has(relation.id));
                effect=areas.map(relation=>text(`${areaLabel(byId.get(relation.id)!)}：设置状态值 ${state}`,`${areaLabel(byId.get(relation.id)!)}: set state value ${state}`)).join(' / ');
            } else if (data.action === 'QUEST_EXEC_CHANGE_SCENE_LEVEL_TAG') {
                effect=text('切换关卡状态：','Change level state: ')+event.relations.filter(relation=>relation.role==='target'&&targets.has(relation.id)).map(relation=>tagLabel(byId.get(relation.id)!)).join(' / ');
            } else throw new Error(`Unmapped mask state-changing action: ${data.action}`);
            const condition = stepCondition(step,phase==='finish'?'finished':'failed');
            const tagWrite = map_level_write(event);
            const write = levelReplay ? tagWrite && tagWrite.series === level.series && tagWrite.group === level.group && level.members.includes(tagWrite.tag)
                ? {visible:level.visibleTags.includes(tagWrite.tag),order:tagWrite.order} : undefined
                : data.action === 'QUEST_EXEC_CHANGE_MAP_AREA_STATE' ? map_state_write(event) : undefined;
            // Missing exported task identity or normalized execution semantics is
            // not an empty history: the group cannot safely fall back to its initial state.
            if (group.replay && (!write || condition.type !== 'step' || !condition.task)) {
                delete group.replay;
                group.issues.push(text('部分状态写入尚无可用的任务步骤关联，未自动计算此遮罩。','Some state writes lack an exported task-step binding; this mask is not computed automatically.'));
            }
            add({id:event.id,kind:'event',label:phase==='finish'?text('步骤完成时','When the step completes'):text('步骤失败时','When the step fails'),
                when:[condition],effect,recordId:map_id(event.id),...(group.replay && write ? {write:{visible:write.visible,order:write.order}} : {})});
        }
        if (group.replay) group.issues.push(text('按任务顺序计算区域状态；开启对应显示是经图片与任务交叉核对的推断，未还原全部客户端显示逻辑。','Area states follow ordered quest writes. Open-to-visible is corroborated inference, not a reconstruction of every client display rule.'));
        else {
            for (const rule of group.rules) delete rule.write;
            // If a later unbound write prevented replay, restore the explicit selector.
            if (ordinary || levelReplay) for (const [index,ids] of variants) add({id:`${group.id}-index-${index}`,kind:'selector',label:text('图像组选择','Image-group selector'),
                when:[{id:`${group.id}-index`,type:'number',comparison:'equal',value:index,title:escape_map_text(group.label),subtitle:text('图像组索引','Image-group index')}],
                effect:text(`选择图像组 ${index}（${ids.length} 张图像）`,`Select image group ${index} (${ids.length} images)`),...preview(index)});
            group.issues.unshift(text('此控制器的完整显示规则尚未确认，保留显式图像选择。','The complete display rule for this controller remains unconfirmed; explicit image selection is retained.'));
        }
        if (!areaIds.size && !controller) group.issues.push(text('尚未找到此图像与源条件的可靠关联。','A reliable source-condition association for this image has not been found.'));
        group.issues=[...new Set(group.issues)];
        // Independent, explicit image preview. It never inherits a hand-written story state or default.
        const options=[{id:'hidden',label:text('隐藏','Hidden')}];
        if (completeVariants) {
            for(const index of [...variants.keys()].sort((a,b)=>a-b)) options.push({id:`index-${index}`,label:text(`图像组 ${index}`,`Image group ${index}`)});
            for(const {overlay} of entries) {
                const index=[...variants].find(([,ids])=>ids.includes(overlay.id))![0];
                overlay.condition={op:'selected',key:group.previewKey,values:[`index-${index}`]};
                overlay.conditionEvidence='unresolved';
            }
        } else {
            options.push({id:'visible',label:text('显示','Visible')});
            for(const {overlay} of entries) {overlay.condition={op:'selected',key:group.previewKey,values:['visible']};overlay.conditionEvidence='unresolved';}
        }
        scene.states.push({id:group.previewKey,label:group.label,evidence:'preview',default:'hidden',options});
    }
    if(groups.size) scene.maskConditions=[...groups.values()].map(value=>value.group);
}
