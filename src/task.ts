import fs from 'fs';

import { InteractionData, TaskData } from "~/utils/data";
import { Lang, t } from "~/utils/i18n";
import { get_task_conditions } from "~/utils/task_condition";
import { get_interaction_dialogs } from "~/utils/task_interaction";
import type { InteractionDialog } from "~/utils/task_interaction";
import task_index from "~/data/tasks";
import type {
    SourceTaskCondition,
    SourceTaskConditions,
    Task,
    TaskDialog,
    TaskDialogNext,
    TaskDialogRole,
    TaskExport,
    TaskStep,
    TaskStepReference,
    TaskTalk,
    TaskTriggerPoint,
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
    id: number,
    hidden: boolean,
    description: string,
    talks: number[],
};

type SourceTaskDialog = {
    id: number,
    content: string,
    role: string,
    show_type?: string,
    speaker_name?: string,
    speaker_title?: string,
    speaker_subtitle?: string,
    next_dialogs: number[],
};

type SourceTaskTalk = {
    id: number,
    priority: number,
    perform_cfg?: string,
    conditions: SourceTaskConditions,
    objects: string[],
    trigger_points: TaskTriggerPoint[],
    dialogs: SourceTaskDialog[],
};

type SourceTask = {
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
let task_id_map: Map<number, string> | undefined;

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

function get_source_dialog(dialog: any): SourceTaskDialog {
    return {
        id: dialog.id,
        content: dialog.content,
        role: dialog.roleType,
        ...(dialog.showType ? { show_type: dialog.showType } : {}),
        ...(dialog.speakerName ? { speaker_name: dialog.speakerName } : {}),
        ...(dialog.speakerTitle ? { speaker_title: dialog.speakerTitle } : {}),
        ...(dialog.speakerSubtitle ? { speaker_subtitle: dialog.speakerSubtitle } : {}),
        next_dialogs: dialog.nextDialogs,
    };
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
            id: step.id,
            hidden: get_hidden(step.listShowType) === true,
            description: step.description,
            talks: get_step_talks(step),
        }));

    return {
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

// 源数据 id -> 导出序号（从 1 开始）
function get_key_map(items: { id: number }[]): Map<number, number> {
    return new Map(items.map((item, index) => [item.id, index + 1]));
}

// 按映射转换 id 列表；映射不到的 id 丢弃（前置/后续任务可能不在导出范围内）
function map_ids(ids: number[], references: Map<number, number | string>): (number | string)[] {
    return ids.flatMap(id => {
        const reference = references.get(id);
        return reference === undefined ? [] : [reference];
    });
}

const black_screen_roles = [
    'TALK_ROLE_BLACK_SCREEN',
    'TALK_ROLE_NEED_CLICK_BLACK_SCREEN',
    'TALK_ROLE_CONSEQUENT_BLACK_SCREEN',
    'TALK_ROLE_CONSEQUENT_NEED_CLICK_BLACK_SCREEN',
];

// 原始角色类型 -> 语义化角色；无法识别的返回 undefined（表示丢弃该对话）
function get_dialog_role(role: string, show_type?: string, is_choice = false): TaskDialogRole | undefined {
    // 黑屏是独立的显示语义；其余显式选择和分支选择优先于说话人角色。
    if (black_screen_roles.includes(role)) return 'black_screen';
    const is_select = is_choice || show_type === 'TALK_SHOW_FORCE_SELECT';
    if (role === 'TALK_ROLE_NPC' || role === 'TALK_ROLE_MATE_AVATAR') return is_select ? 'select' : 'npc';
    if (role === 'TALK_ROLE_PLAYER' || role === 'TALK_ROLE_NONE') return is_select ? 'select' : 'text';
    return undefined;
}

// 说话人：同伴用通用称呼，玩家用 {NICKNAME} 占位（由前端 process_text 替换）
function get_speaker(dialog: SourceTaskDialog, lang: Lang): string | undefined {
    if (dialog.role === 'TALK_ROLE_MATE_AVATAR') return t('ingame.mate_name', lang);
    if (dialog.role === 'TALK_ROLE_NPC') return dialog.speaker_title || dialog.speaker_name;
    if (dialog.role === 'TALK_ROLE_PLAYER') {
        return dialog.speaker_title || dialog.speaker_name || '#{NICKNAME}';
    }
    return dialog.speaker_title;
}

function get_choice_dialog_ids(
    dialogs: SourceTaskDialog[],
    next_dialogs: Map<number, number[]>,
    interaction_dialogs: Map<number, InteractionDialog>,
): Set<number> {
    const visible_ids = new Set(dialogs
        .filter(dialog => get_dialog_role(dialog.role, dialog.show_type) !== undefined)
        .map(dialog => dialog.id));
    const choice_ids = new Set<number>();

    // 选择关系由父节点的有效分支决定，不能只依据子节点的 showType。
    for (const dialog of dialogs) {
        const interaction = interaction_dialogs.get(dialog.id);
        const next_ids = interaction
            ? interaction.next_dialogs.filter(next => next.choice).map(next => next.dialog)
            : [...new Set(next_dialogs.get(dialog.id) || [])];
        const visible_next_ids = next_ids.filter(id => visible_ids.has(id));
        if (interaction || visible_next_ids.length > 1) {
            visible_next_ids.forEach(id => choice_ids.add(id));
        }
    }
    return choice_ids;
}

function get_dialogs(
    talk: SourceTaskTalk,
    references: Map<number, TaskStepReference>,
    own_references: Map<number, TaskStepReference>,
    lang: Lang,
): { dialogs: Record<string, TaskDialog>, initial_dialogs?: TaskDialogNext[] } {
    const dialogs = talk.dialogs;
    const interaction = talk.perform_cfg
        ? get_interaction_dialogs(
            () => InteractionData.find_interaction(talk.perform_cfg!)
                || InteractionData.find_interaction_by_dialog_ids(dialogs.map(dialog => dialog.id)),
            dialogs.map(dialog => dialog.id),
            conditions => get_task_conditions(conditions, references, own_references, lang),
            talk.perform_cfg,
        )
        : { dialogs: new Map<number, InteractionDialog>(), initial_dialogs: [] };
    const interaction_dialogs = interaction.dialogs;
    const effective_next_dialogs = new Map(dialogs.map(dialog => [
        dialog.id,
        interaction_dialogs.get(dialog.id)?.next_dialogs.map(next => next.dialog) || dialog.next_dialogs,
    ]));

    // 丢弃角色类型无法识别的对话，再统一重编号
    const visible_dialogs = dialogs.filter(dialog => get_dialog_role(dialog.role, dialog.show_type) !== undefined);
    const choice_ids = get_choice_dialog_ids(dialogs, effective_next_dialogs, interaction_dialogs);
    const keys = get_key_map(visible_dialogs);

    function map_next(next: InteractionDialog['next_dialogs'][number]): TaskDialogNext | undefined {
        const key = keys.get(next.dialog);
        if (key === undefined) return undefined;
        return {
            dialog: key,
            ...(next.conditions ? { conditions: next.conditions } : {}),
            ...(next.branches ? { branches: next.branches } : {}),
        };
    }

    const result = Object.fromEntries(visible_dialogs.map((dialog, index) => {
        const role = get_dialog_role(dialog.role, dialog.show_type, choice_ids.has(dialog.id))!;
        const speaker = get_speaker(dialog, lang);
        const interaction = interaction_dialogs.get(dialog.id);
        const next_dialogs = interaction
            ? interaction.next_dialogs.flatMap(next => map_next(next) || [])
            : map_ids(dialog.next_dialogs, keys).map(next => ({ dialog: next as number }));
        return [String(index + 1), {
            content: dialog.content,
            role,
            ...(speaker ? { speaker } : {}),
            ...(dialog.speaker_subtitle ? { speaker_subtitle: dialog.speaker_subtitle } : {}),
            next_dialogs,
            ...(interaction?.operations ? { operations: interaction.operations } : {}),
        }];
    }));
    const initial_dialogs = interaction.initial_dialogs.flatMap(next => map_next(next) || []);
    return {
        dialogs: result,
        ...(initial_dialogs.length > 0 ? { initial_dialogs } : {}),
    };
}

function get_steps(steps: SourceTaskStep[], talk_keys: Map<number, number>): Record<string, TaskStep> {
    return Object.fromEntries(steps.map((step, index) => [String(index + 1), {
        hidden: step.hidden,
        description: step.description,
        talks: map_ids(step.talks, talk_keys) as number[],
    }]));
}

function get_talks(
    talks: SourceTaskTalk[],
    references: Map<number, TaskStepReference>,
    own_references: Map<number, TaskStepReference>,
    lang: Lang,
): Record<string, TaskTalk> {
    return Object.fromEntries(talks.map((talk, index) => {
        const dialog_data = get_dialogs(talk, references, own_references, lang);
        return [String(index + 1), {
            priority: talk.priority,
            conditions: get_task_conditions(talk.conditions, references, own_references, lang),
            objects: talk.objects,
            trigger_points: talk.trigger_points,
            dialogs: dialog_data.dialogs,
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
        description: source.description,
        unlock_description: source.unlock_description,
        chapter: source.chapter,
        previous_tasks: map_ids(source.previous_tasks, get_task_id_map()) as string[],
        suggested_tasks: map_ids(source.suggested_tasks, get_task_id_map()) as string[],
        steps: get_steps(source.steps, talk_keys),
        talks: get_talks(source.talks, references, own_references, lang),
    };
}

function get_task_export(lang: Lang): TaskExport {
    const source_tasks = get_source_tasks(lang);
    const references = get_step_references(source_tasks, lang);
    const available_entries = entries.filter(entry => source_tasks.has(entry.source));

    return {
        files: available_entries.map(entry => ({
            id: entry.id,
            task: get_task(entry, source_tasks.get(entry.source)!, references, lang),
        })),
        list: available_entries.map(entry => {
            const task = source_tasks.get(entry.source)!;
            return {
                id: entry.id,
                name: task.name,
                description: task.description,
                chapter: task.chapter,
                type: entry.type,
            };
        }),
    };
}

export function gen_task(lang: Lang, path: string) {
    const { files, list } = get_task_export(lang);

    fs.rmSync(path, { recursive: true, force: true });
    fs.mkdirSync(path, { recursive: true });
    for (const file of files) {
        fs.writeFileSync(`${path}/${file.id}.json`, JSON.stringify(file.task, null, 4), 'utf-8');
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(list, null, 4), 'utf-8');
}
