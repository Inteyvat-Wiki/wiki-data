import type { Npc as SourceNpc } from 'genshin-db';
import npc_index from '~/data/npcs';
import { create_page, export_category } from '~/utils/page';
import { NpcData } from '~/utils/data';
import { Lang } from '~/utils/i18n';
import { get_key_map, get_source_dialog, get_talk_dialogs, map_ids } from '~/utils/dialogue';
import { get_task_conditions } from '~/utils/task_condition';
import { get_task_id_map, get_task_step_references } from '~/task';
import type { Npc, NpcPages } from '~/types/npc';
import type { SourceTaskConditions } from '~/types/task';

function get_conditions(source: SourceNpc['talks'][number]['beginConditions']): SourceTaskConditions {
    return {
        logic: source.logic,
        conditions: source.conditions.map(condition => ({
            type: condition.type,
            params: condition.rawParams,
            ...('stepId' in condition ? { step_id: condition.stepId, state: condition.stateName } : {}),
        })),
    };
}

const reference_cache = new Map<Lang, ReturnType<typeof get_task_step_references>>();

export function get_npc(source: SourceNpc, lang: Lang): Npc {
    if (!reference_cache.has(lang)) reference_cache.set(lang, get_task_step_references(lang));
    const references = reference_cache.get(lang)!;
    const tasks = get_task_id_map();
    const keys = get_key_map(source.talks);
    const menu_options = new Set(source.talks.flatMap(talk => talk.nextTalks));
    return {
        name: source.name,
        npc_id: source.id,
        entry_talks: map_ids(source.entryTalks, keys) as number[],
        diagnostics: source.diagnostics,
        talks: Object.fromEntries(source.talks.map((talk, index) => {
            const dialogs = talk.dialogs.map(get_source_dialog);
            const initial = dialogs.find(dialog => dialog.id === talk.initDialog);
            const dialogue = get_talk_dialogs({
                dialogs,
                perform_cfg: talk.performCfg,
                initial_dialog: talk.initDialog,
                menu_option: menu_options.has(talk.id),
            }, references, new Map(), lang);
            return [String(index + 1), {
                ...dialogue,
                source_id: talk.id,
                title: initial?.content || source.name,
                task: talk.questId ? tasks.get(talk.questId) || null : null,
                ...(talk.questId ? { quest_id: talk.questId } : {}),
                active_mode: talk.activeMode,
                source: talk.source,
                priority: talk.priority,
                begin_way: talk.beginWay === 'TALK_BEGIN_MANUAL' ? 'manual'
                    : talk.beginWay === 'TALK_BEGIN_AUTO' ? 'auto' : null,
                next_talks: map_ids(talk.nextTalks, keys) as number[],
                trigger_ids: talk.trigger.objectIds.map(id => `npc:${id}`),
                conditions: get_task_conditions(get_conditions(talk.beginConditions), references, new Map(), lang),
                objects: talk.trigger.objectNames,
                trigger_points: [],
            }];
        })),
    };
}

export function get_npc_export(lang: Lang): { files: { id: string, data: Npc }[], list: NpcPages } {
    const files = Object.entries(npc_index as Record<string, string>).map(([id, name]) => ({
        id, data: get_npc(NpcData.get_npc(name, lang), lang),
    }));
    const configured = new Set(files.map(file => file.data.npc_id));
    for (const source of NpcData.get_npcs(lang)) {
        if (!configured.has(source.id)) files.push({ id: `npc_${source.id}`, data: get_npc(source, lang) });
    }
    return {
        files,
        list: files.map(({ id, data }) => create_page({
            id, name: data.name, talk_count: Object.keys(data.talks).length,
        })),
    };
}

export function gen_npc(lang: Lang, path: string) {
    const { files, list } = get_npc_export(lang);
    export_category(path, list, files);
}
