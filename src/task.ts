import { get_key_map, map_ids, get_source_dialog, get_talk_dialogs } from '~/utils/dialogue';
import type { SourceDialog } from '~/utils/dialogue';
import { create_page, export_category } from '~/utils/page';

import { TaskData } from "~/utils/data";
import { Lang, t } from "~/utils/i18n";
import { get_task_conditions } from "~/utils/task_condition";
import { get_task_narrations } from "~/utils/task_narration";
import { get_task_bubbles } from "~/utils/task_bubble";
import { get_task_item_operation } from "~/utils/task_item";
import task_index from "~/data/tasks";
import type {
    SourceTaskCondition,
    SourceTaskConditions,
    Task,
    TaskExport,
    TaskItemOperation,
    TaskStep,
    TaskStepReference,
    TaskTalk,
    TaskTriggerPoint,
    TaskFinishConditionToken,
    TaskType,
} from "~/types/task";

type TaskIndex = Record<TaskType, Record<string, string>>;

type TaskEntry = {
    id: string,
    type: TaskType,
    source: string,
};

// ---- 原始数据（genshin-db）中间结构 ----

type SourceTaskStep = {
    operations: TaskItemOperation[],
    id: number,
    hidden: boolean,
    description: string,
    talks: number[],
    finish_conditions: SourceTaskCondition[],
    fail_conditions: SourceTaskCondition[],
};

type SourceTaskTalk = {
    id: number,
    priority: number,
    begin_way: TaskTalk['begin_way'],
    next_talks: number[],
    trigger_ids: string[],
    perform_cfg?: string,
    conditions: SourceTaskConditions,
    objects: string[],
    trigger_points: TaskTriggerPoint[],
    dialogs: SourceDialog[],
};

type SourceTask = {
    operations: TaskItemOperation[],
    quest_id: number,
    hidden: boolean,
    name: string | null,
    description: string | null,
    unlock_description: string | null,
    chapter: string | null,
    previous_tasks: number[],
    suggested_tasks: number[],
    steps: SourceTaskStep[],
    talks: SourceTaskTalk[],
};

const entries = Object.entries(task_index as TaskIndex).flatMap(([type, tasks]) =>
    Object.entries(tasks).map(([id, source]) => ({ id, type: type as TaskType, source })));
const source_names = [...new Set(entries.map(entry => entry.source))];
const task_cache = new Map<Lang, Map<string, SourceTask>>();
const quest_item_tasks_cache = new Map<Lang, Map<number, Set<string>>>();
let task_id_map: Map<number, string> | undefined;

function get_item_operations(operations: any[] = [], lang: Lang): TaskItemOperation[] {
    return operations.map(operation => get_task_item_operation({
        type: 'item',
        action: operation.action,
        items: operation.items,
        ...(operation.choices?.length ? { choices: operation.choices } : {}),
        ...(operation.count === undefined ? {} : { count: operation.count }),
        ...(operation.givingId === undefined ? {} : { giving_id: operation.givingId }),
        ...(operation.rewardId === undefined ? {} : { reward_id: operation.rewardId }),
        ...(operation.remove === undefined ? {} : { remove: operation.remove }),
    }, lang));
}

// 任务/步骤的 showType 决定是否对外展示；无法判断的返回 undefined（表示丢弃该任务）
function get_hidden(show_type: unknown): boolean | undefined {
    if (show_type === 'QUEST_SHOW') return false;
    if (show_type === 'QUEST_HIDDEN') return true;
    return undefined;
}

function get_source_conditions(data: any): SourceTaskConditions {
    const conditions: SourceTaskCondition[] = (data?.conditions || []).map((condition: any) => ({
        type: condition.type,
        params: condition.rawParams || [],
        ...(condition.stepId === undefined ? {} : { step_id: condition.stepId }),
        ...(condition.talkId === undefined ? {} : { talk_id: condition.talkId }),
        ...(condition.stateName ? { state: condition.stateName } : {}),
    }));
    return {
        logic: data?.logic || '',
        conditions,
    };
}

// 步骤直接关联的对话：取自 finishConditions 里的 QUEST_CONTENT_COMPLETE_TALK 条件
function get_step_talks(step: any): number[] {
    return [...new Set<number>((step.finishConditions || [])
        .filter((condition: any) => condition.type === 'QUEST_CONTENT_COMPLETE_TALK')
        .map((condition: any) => condition.talkId)
        .filter((id: unknown): id is number => typeof id === 'number'))];
}

function get_source_talk(talk: any): SourceTaskTalk {
    // 触发点位：仅保留场景 id 与三维坐标均合法的条目
    const trigger_points: TaskTriggerPoint[] = (talk.trigger?.points || []).flatMap((point: any) => {
        if (typeof point.sceneId !== 'number' || !Array.isArray(point.position) || point.position.length !== 3) {
            return [];
        }
        const position = point.position.map(Number);
        if (!position.every(Number.isFinite)) return [];

        return [{
            scene_id: point.sceneId,
            ...(typeof point.pointId === 'number' ? { point_id: point.pointId } : {}),
            position: position as [number, number, number],
        }];
    });

    return {
        id: talk.id,
        priority: talk.priority ?? 0,
        begin_way: talk.beginWay === 'TALK_BEGIN_MANUAL' ? 'manual'
            : talk.beginWay === 'TALK_BEGIN_AUTO' ? 'auto' : null,
        next_talks: talk.nextTalks || [],
        trigger_ids: [
            ...(talk.trigger?.objectIds || []).map((id: number) => `npc:${id}`),
            ...trigger_points.map(point => `point:${point.scene_id}:${point.point_id ?? point.position.join(',')}`),
        ],
        ...(talk.performCfg ? { perform_cfg: talk.performCfg } : {}),
        conditions: get_source_conditions(talk.beginConditions),
        objects: talk.trigger?.objectNames || [],
        trigger_points,
        dialogs: talk.dialogs.map(get_source_dialog),
    };
}

function get_source_task(source: string, lang: Lang): SourceTask | undefined {
    const data: any = TaskData.get_task(source, lang);
    const hidden = get_hidden(data.showType);
    if (hidden === undefined) return undefined;

    if (typeof data.name === 'string' && data.name.includes('$UNRELEASED')) {
        console.warn(`[task] $UNRELEASED title: ${source} (${data.id}) ${data.name}`);
    }

    const steps = [...data.steps]
        .map((step: any, index: number) => ({ step, index }))
        .sort((left, right) => left.step.order - right.step.order || left.index - right.index)
        .map(({ step }) => ({
            operations: get_item_operations(step.itemOperations, lang),
            id: step.id,
            hidden: get_hidden(step.listShowType) === true,
            description: step.description,
            talks: get_step_talks(step),
            finish_conditions: get_source_conditions({ conditions: step.finishConditions }).conditions,
            fail_conditions: get_source_conditions({ conditions: step.failConditions }).conditions,
        }));

    return {
        operations: get_item_operations(data.itemOperations, lang),
        quest_id: data.id,
        hidden,
        name: hidden ? null : data.name,
        description: hidden ? null : data.description,
        unlock_description: hidden ? null : data.unlockDescription,
        chapter: data.chapter || null,
        previous_tasks: data.prevMainQuestList || [],
        suggested_tasks: data.suggestTrackMainQuestList || [],
        steps,
        talks: data.talks.map(get_source_talk),
    };
}

function get_source_tasks(lang: Lang): Map<string, SourceTask> {
    const cached = task_cache.get(lang);
    if (cached) return cached;

    const tasks = new Map<string, SourceTask>();
    for (const source of source_names) {
        const task = get_source_task(source, lang);
        if (task) tasks.set(source, task);
    }
    task_cache.set(lang, tasks);
    return tasks;
}

// 原始 quest_id -> 任务文件名，供前置/后续任务与章节引用
export function get_task_id_map(): Map<number, string> {
    if (task_id_map) return task_id_map;

    task_id_map = new Map<number, string>();
    const tasks = get_source_tasks('zh_hans');
    for (const entry of entries) {
        const task = tasks.get(entry.source);
        if (task) task_id_map.set(task.quest_id, entry.id);
    }
    return task_id_map;
}

export function get_task_ids(): string[] {
    const source_tasks = get_source_tasks('zh_hans');
    return entries
        .filter(entry => source_tasks.has(entry.source))
        .map(entry => entry.id);
}

// step 条件的引用信息：任务名 + 步骤描述，生成条件的 title/subtitle
function get_step_reference(task_id: string, task: SourceTask, step: SourceTaskStep, key: number, lang: Lang): TaskStepReference {
    return {
        task: task_id,
        step: key,
        title: task.name || task_id || t('task_condition.task', lang),
        subtitle: step.description || String(key),
    };
}

function get_step_references(tasks: Map<string, SourceTask>, lang: Lang): Map<number, TaskStepReference> {
    const references = new Map<number, TaskStepReference>();
    for (const entry of entries) {
        const task = tasks.get(entry.source);
        if (!task) continue;
        task.steps.forEach((step, index) => {
            references.set(step.id, get_step_reference(entry.id, task, step, index + 1, lang));
        });
    }
    return references;
}

function get_step_end_conditions(
    step: SourceTaskStep,
    event: 'finish' | 'fail',
    talk_keys: Map<number, number>,
    references: Map<number, TaskStepReference>,
    own_references: Map<number, TaskStepReference>,
    lang: Lang,
): TaskFinishConditionToken[] {
    return step[`${event}_conditions`].flatMap((condition, index): TaskFinishConditionToken[] => {
        const talk = condition.talk_id === undefined ? undefined : talk_keys.get(condition.talk_id);
        const semantic = /^QUEST_CONTENT_QUEST_(?:GLOBAL_)?VAR_/.test(condition.type)
            || /^QUEST_CONTENT_QUEST_STATE_(?:NOT_)?EQUAL$/.test(condition.type);
        let tokens: TaskFinishConditionToken[] = talk === undefined
            ? get_task_conditions({
                logic: '',
                conditions: [{
                    ...condition,
                    type: semantic ? condition.type.replace(/^QUEST_CONTENT_/, 'QUEST_COND_') : condition.type,
                    ...(/QUEST_CONTENT_QUEST_STATE_(NOT_)?EQUAL/.test(condition.type)
                        ? { step_id: Number(condition.params[0]), state: ['QUEST_STATE_NONE',
                            'QUEST_STATE_UNSTARTED', 'QUEST_STATE_UNFINISHED', 'QUEST_STATE_FINISHED',
                            'QUEST_STATE_FAILED'][Number(condition.params[1])] } : {}),
                }],
            }, references, own_references, lang)
            : [{ type: 'talk', talk }];
        if (!tokens.length) tokens = get_task_conditions({ logic: '', conditions: [condition] },
            references, own_references, lang);
        if (talk === undefined && !semantic) tokens = tokens.map(token => typeof token === 'string'
            || token.type === 'talk' ? token : { ...token,
                id: JSON.stringify([event, step.id, condition.type, condition.params]) });
        return [...tokens, ...(index > 0 ? ['or' as const] : [])];
    });
}

function get_steps(
    steps: SourceTaskStep[],
    talk_keys: Map<number, number>,
    references: Map<number, TaskStepReference>,
    own_references: Map<number, TaskStepReference>,
    lang: Lang,
): Record<string, TaskStep> {
    return Object.fromEntries(steps.map((step, index) => [String(index + 1), {
        hidden: step.hidden,
        ...(step.operations.length ? { operations: step.operations } : {}),
        description: step.description,
        talks: map_ids(step.talks, talk_keys) as number[],
        finish_conditions: get_step_end_conditions(step, 'finish', talk_keys, references, own_references, lang),
        fail_conditions: get_step_end_conditions(step, 'fail', talk_keys, references, own_references, lang),
    }]));
}

function get_talks(
    talks: SourceTaskTalk[],
    references: Map<number, TaskStepReference>,
    own_references: Map<number, TaskStepReference>,
    lang: Lang,
): Record<string, TaskTalk> {
    const talk_keys = get_key_map(talks);
    return Object.fromEntries(talks.map((talk, index) => {
        const dialog_data = get_talk_dialogs(talk, references, own_references, lang);
        return [String(index + 1), {
            priority: talk.priority,
            begin_way: talk.begin_way,
            next_talks: map_ids(talk.next_talks, talk_keys) as number[],
            trigger_ids: talk.trigger_ids,
            conditions: get_task_conditions(talk.conditions, references, own_references, lang),
            objects: talk.objects,
            trigger_points: talk.trigger_points,
            dialogs: dialog_data.dialogs,
            ...(dialog_data.operations ? { operations: dialog_data.operations } : {}),
            ...(dialog_data.initial_dialogs ? { initial_dialogs: dialog_data.initial_dialogs } : {}),
        }];
    }));
}

function get_task(
    entry: TaskEntry,
    source: SourceTask,
    references: Map<number, TaskStepReference>,
    lang: Lang,
): Task {
    const talk_keys = get_key_map(source.talks);
    // 本任务自己的 step 引用：条件中引用的步骤优先解析为内部步骤
    const own_references = new Map<number, TaskStepReference>();
    source.steps.forEach((step, index) => {
        own_references.set(step.id, get_step_reference(entry.id, source, step, index + 1, lang));
    });

    return {
        name: source.name,
        ...(source.operations.length ? { operations: source.operations } : {}),
        description: source.description,
        unlock_description: source.unlock_description,
        chapter: source.chapter,
        previous_tasks: map_ids(source.previous_tasks, get_task_id_map()) as string[],
        suggested_tasks: map_ids(source.suggested_tasks, get_task_id_map()) as string[],
        steps: get_steps(source.steps, talk_keys, references, own_references, lang),
        talks: get_talks(source.talks, references, own_references, lang),
        narrations: get_task_narrations(source.quest_id, get_key_map(source.steps), lang),
        bubbles: get_task_bubbles(source.quest_id, get_key_map(source.steps), lang),
    };
}

export function get_task_export(lang: Lang): TaskExport {
    const source_tasks = get_source_tasks(lang);
    const references = get_step_references(source_tasks, lang);
    const available_entries = entries.filter(entry => source_tasks.has(entry.source));

    const files = available_entries.map(entry => ({
        id: entry.id,
        task: get_task(entry, source_tasks.get(entry.source)!, references, lang),
    }));
    const related_tasks = new Map<number, Set<string>>();
    for (const { id, task } of files) {
        if (!task.name) continue;
        const operations = [
            ...(task.operations || []),
            ...Object.values(task.steps).flatMap(step => step.operations || []),
            ...Object.values(task.talks).flatMap(talk => [
                ...(talk.operations || []),
                ...Object.values(talk.dialogs).flatMap(dialog => dialog.operations || []),
            ]),
        ];
        for (const operation of operations) {
            if (operation.type !== 'item') continue;
            for (const item of [...operation.items, ...(operation.choices || [])]) {
                let names = related_tasks.get(item.id);
                if (!names) related_tasks.set(item.id, names = new Set());
                names.add(id);
            }
        }
    }
    quest_item_tasks_cache.set(lang, related_tasks);

    return {
        files,
        list: available_entries.map(entry => {
            const task = source_tasks.get(entry.source)!;
            return create_page({
                id: entry.id,
                name: task.name || '',
                hidden: !task.name,
                description: task.description,
                chapter: task.chapter,
                type: entry.type,
            });
        }),
    };
}

export function get_quest_item_tasks(id: number, lang: Lang): string[] {
    if (!quest_item_tasks_cache.has(lang)) get_task_export(lang);
    return [...(quest_item_tasks_cache.get(lang)!.get(id) || [])];
}

export function gen_task(lang: Lang, path: string) {
    const { files, list } = get_task_export(lang);
    export_category(path, list, files.map(file => ({ id: file.id, data: file.task })));
}

export function get_task_step_references(lang: Lang): Map<number, TaskStepReference> {
    return get_step_references(get_source_tasks(lang), lang);
}
