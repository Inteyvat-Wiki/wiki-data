import fs from 'fs';

import { TaskData } from "~/utils/data";
import { Lang, t } from "~/utils/i18n";
import { LegacyTask, Task, TaskConditionToken, TaskExport, Tasks, TaskStepCondition } from "~/types/task";
import task_list from "~/data/tasks";

const typed_task_list = task_list as Record<string, string[]>;

// 语义化取值（与 Task 内联的联合保持一致）
type QuestState = 'unstarted' | 'ongoing' | 'finished' | 'failed';
type RoleType = 'npc' | 'player' | 'black_screen';
type TaskType = Tasks[number]['type'];

// 从原始/正式结构中取出子结构，避免拆出大量小类型
type LegacyStep = LegacyTask['steps'][number];
type LegacyTalk = LegacyTask['talks'][number];
type LegacyDialog = LegacyTalk['dialogs'][number];
type LegacyBeginCondition = LegacyTalk['begin_conditions']['conditions'][number];
type TaskStep = Task['steps'][string];
type TaskTalk = Task['talks'][string];
type TaskDialog = TaskTalk['dialogs'][string];

type RawCondition = {
    type?: string,
    stateName?: string,
    stepId?: number,
    rawParams?: (string | number | boolean)[],
};

type RawConditionGroup = {
    logic?: string,
    conditions?: RawCondition[],
};

function get_task_names(): string[] {
    return Object.values(typed_task_list).flat();
}

function is_show_task(task_data: any): boolean {
    return task_data.showType === 'QUEST_SHOW';
}

function get_step_ids(task_data: any): Set<number> {
    return new Set(task_data.steps.map((step: any) => step.id));
}

function get_ordered_steps(task_data: any): any[] {
    return task_data.steps
        .map((step: any, index: number) => ({ step, index }))
        .sort((a: any, b: any) => a.step.order - b.step.order || a.index - b.index)
        .map((item: any) => item.step);
}

function get_state_candidates(
    condition: RawCondition,
    steps: any[],
    step_ids: Set<number>,
): Set<number> {
    if (condition.stepId === undefined || !step_ids.has(condition.stepId)) {
        return new Set(steps.map(step => step.id));
    }

    const index = steps.findIndex(step => step.id === condition.stepId);
    const state = condition.stateName || '';
    if (index < 0) return new Set();

    let result: Set<number>;
    if (state === 'QUEST_STATE_UNSTARTED') {
        result = new Set(steps.slice(0, index).map(step => step.id));
    } else if (state === 'QUEST_STATE_UNFINISHED') {
        result = new Set([condition.stepId]);
    } else if (state === 'QUEST_STATE_FINISHED') {
        result = new Set(steps.slice(index + 1).map(step => step.id));
    } else {
        return new Set(steps.map(step => step.id));
    }

    if (condition.type?.includes('NOT_EQUAL')) {
        return new Set(steps.filter(step => !result.has(step.id)).map(step => step.id));
    }
    return result;
}

function union(left: Set<number>, right: Set<number>): Set<number> {
    return new Set([...left, ...right]);
}

function intersect(left: Set<number>, right: Set<number>): Set<number> {
    return new Set([...left].filter(id => right.has(id)));
}

function get_possible_step_ids(group: RawConditionGroup, steps: any[], step_ids: Set<number>): Set<number> {
    const conditions = group.conditions || [];
    if (!group.logic || group.logic === 'LOGIC_NONE' || conditions.length === 0) return new Set();

    const candidates = conditions.map(condition => get_state_candidates(condition, steps, step_ids));
    if (candidates.length === 1) return candidates[0];
    if (group.logic === 'LOGIC_OR' || group.logic === 'LOGIC_A_OR_ETCAND') {
        const first = candidates[0];
        const rest = candidates.slice(1).reduce(intersect, new Set(steps.map(step => step.id)));
        return group.logic === 'LOGIC_A_OR_ETCAND' ? union(first, rest) : candidates.reduce(union, new Set());
    }
    if (group.logic === 'LOGIC_A_AND_ETCOR') {
        const rest = candidates.slice(1).reduce(union, new Set());
        return intersect(candidates[0], rest);
    }

    return candidates.reduce(intersect);
}

function get_direct_talk_ids(step: any): number[] {
    return (step.finishConditions || [])
        .filter((condition: any) => condition.type === 'QUEST_CONTENT_COMPLETE_TALK')
        .map((condition: any) => condition.talkId)
        .filter((id: any): id is number => typeof id === 'number');
}

function get_step_talk_map(steps: any[]): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (const step of steps) {
        for (const talk_id of get_direct_talk_ids(step)) {
            if (map.has(talk_id)) continue;
            map.set(talk_id, [step.id]);
        }
    }
    return map;
}

function get_task_talk(talk_data: any): LegacyTalk {
    // 只保留带 stepId 的 step 条件；非 step 条件（物品/变量等）无法用 step 语义表达，丢弃
    const conditions: LegacyBeginCondition[] = [];
    for (const condition of (talk_data.beginConditions?.conditions || [])) {
        if (condition.stepId === undefined) continue;
        conditions.push({
            stepId: condition.stepId,
            type: condition.type,
            ...(condition.stateName ? { state_name: condition.stateName } : {}),
        });
    }

    return {
        id: talk_data.id,
        begin_conditions: {
            logic: talk_data.beginConditions?.logic || '',
            conditions,
        },
        trigger: {
            begin_way: talk_data.beginWay,
            mark: talk_data.mark,
            object_names: talk_data.trigger.objectNames,
            points: talk_data.trigger.points.map((point: any) => ({
                scene_id: point.sceneId,
                ...(point.pointId === undefined ? {} : { point_id: point.pointId }),
                position: point.position,
            })),
        },
        dialogs: talk_data.dialogs.map((dialog: any) => ({
            id: dialog.id,
            content: dialog.content,
            role_type: dialog.roleType,
            ...(dialog.speakerTitle ? { speaker_title: dialog.speakerTitle } : {}),
            ...(dialog.speakerSubtitle ? { speaker_subtitle: dialog.speakerSubtitle } : {}),
            next_dialog_ids: dialog.nextDialogs,
        })),
    };
}

export function get_task(name: string, lang: Lang): LegacyTask | null {
    const task_data: any = TaskData.get_task(name, lang);
    if (!is_show_task(task_data)) return null;

    const steps = get_ordered_steps(task_data);
    const step_ids = get_step_ids(task_data);
    const talks = task_data.talks as any[];
    const direct_map = get_step_talk_map(steps);
    const related_map = new Map<number, number[]>();

    for (const talk of talks) {
        if (direct_map.has(talk.id)) continue;
        const possible_ids = get_possible_step_ids(talk.beginConditions || {}, steps, step_ids);
        if (possible_ids.size > 0) related_map.set(talk.id, [...possible_ids]);
    }

    return {
        id: task_data.id,
        name: task_data.name,
        description: task_data.description,
        unlock_description: task_data.unlockDescription,
        chapter: task_data.chapter,
        prev_task_ids: task_data.prevMainQuestList,
        suggest_task_ids: task_data.suggestTrackMainQuestList,
        steps: steps.map(step => ({
            id: step.id,
            order: step.order,
            description: step.description,
            talk_ids: [...new Set(get_direct_talk_ids(step))]
                .filter(talk_id => direct_map.get(talk_id)?.[0] === step.id),
            related_talk_ids: talks
                .filter(talk => related_map.get(talk.id)?.includes(step.id))
                .map(talk => talk.id),
        })),
        talks: talks.map(talk => get_task_talk(talk)),
    };
}

export function get_task_list(lang: Lang) {
    const result: any = {};
    for (const [type, names] of Object.entries(typed_task_list)) {
        result[type] = names.filter(name => get_task(name, lang) !== null);
    }
    return result;
}

// 任务名/任务 id 与文件名映射只依赖任务数据，与语言无关，全局只构建一次
let cached_items: { name: string, id: number }[] | null = null;
let cached_filename_map: Map<string, string> | null = null;
let cached_id_filename_map: Map<number, string> | null = null;

function get_cached_items(): { name: string, id: number }[] {
    if (!cached_items) {
        // showType 与 id 不随语言变化，用任意语言（此处 zh_hans）即可
        const items: { name: string, id: number }[] = [];
        for (const name of get_task_names()) {
            const data: any = TaskData.get_task(name, 'zh_hans');
            if (!is_show_task(data)) continue;
            items.push({ name, id: data.id });
        }
        cached_items = items;
    }
    return cached_items;
}

// 任务名(当前 id) -> 新文件名
function get_cached_filename_map(): Map<string, string> {
    if (!cached_filename_map) cached_filename_map = get_filename_map(get_cached_items());
    return cached_filename_map;
}

// 任务 id(quest id) -> 新文件名（供 chapters 导出引用）
export function get_task_id_filename_map(): Map<number, string> {
    if (!cached_id_filename_map) {
        const filename_map = get_cached_filename_map();
        const result = new Map<number, string>();
        for (const item of get_cached_items()) {
            result.set(item.id, filename_map.get(item.name)!);
        }
        cached_id_filename_map = result;
    }
    return cached_id_filename_map;
}

// 新的索引：把 tasks.js 转为新文件名，去掉分类合并为一个数组
// 保持 tasks.js 的分区顺序（与 list.json 一致）
export function get_task_index(lang: Lang): string[] {
    const filename_map = get_cached_filename_map();
    const result: string[] = [];
    for (const names of Object.values(typed_task_list)) {
        for (const name of names) {
            const filename = filename_map.get(name);
            if (filename !== undefined) result.push(filename);
        }
    }
    return result;
}

export function gen_task(lang: Lang, path: string) {
    fs.mkdirSync(`${path}`, { recursive: true });

    // 收集导出结果
    const tasks: { name: string, task: LegacyTask }[] = [];
    for (const name of get_task_names()) {
        const task = get_task(name, lang);
        if (!task) continue;
        tasks.push({ name, task });
    }

    // 重新编号 + 重命名（复用与语言无关的文件名映射）
    const { files, list } = process_task_export(typed_task_list, tasks, lang, get_cached_filename_map());

    // 清空旧输出，写入修改后的结果
    fs.rmSync(`${path}`, { recursive: true, force: true });
    fs.mkdirSync(`${path}`, { recursive: true });
    for (const { filename, task } of files) {
        fs.writeFileSync(`${path}/${filename}.json`, JSON.stringify(task, null, 4), 'utf-8');
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(list, null, 4), 'utf-8');
}

// ---- 重新编号 + 重命名（与 gen_task 分离的独立转换） ----
// 基于现有导出结果（get_task 输出）：
//  - 文件名取第一个 '-' 之前的部分，重名时按任务 id 升序，第一个保留原名，后续追加 -1、-2…；
//  - steps/talks/dialogs 改为以 1 起始的 key 为键名的对象，并移除内容中的 id；
//  - talk_keys/related_talk_keys 改为本任务内 talk 的 key；
//  - next_dialog_keys 改为同 talk 内 dialog 的 key；
//  - conditions 为完整 step 条件的后缀表达式：内部 step task_name 为 null，外部 step 为文件名+step_key，
//    找不到对应 step 的一律丢弃并输出到控制台；
//  - prev_tasks/suggest_tasks 改为对应任务的新文件名，找不到的一律丢弃；
//  - quest_id 为原始任务数字 id。

// name(当前 id) -> 新文件名；同基础名按任务 id 升序，第一个保留原名，后续 -1、-2…
// 只依赖任务名与任务 id，与语言无关
function get_filename_map(items: { name: string, id: number }[]): Map<string, string> {
    const result = new Map<string, string>();
    const groups = new Map<string, { name: string, id: number }[]>();
    for (const { name, id } of items) {
        const base = name.split('-')[0];
        const group = groups.get(base) ?? [];
        group.push({ name, id });
        groups.set(base, group);
    }

    for (const [base, group] of groups) {
        group.sort((a, b) => a.id - b.id);
        group.forEach((item, index) => result.set(item.name, index === 0 ? base : `${base}-${index}`));
    }

    return result;
}

// step id -> { 所属文件名, 该任务内的 step key }
function get_step_ref_map(tasks: { name: string, task: LegacyTask }[], filename_map: Map<string, string>): Map<number, { filename: string, key: number }> {
    const result = new Map<number, { filename: string, key: number }>();
    for (const { name, task } of tasks) {
        const filename = filename_map.get(name)!;
        task.steps.forEach((step, index) => result.set(step.id, { filename, key: index + 1 }));
    }
    return result;
}

// 任务 id -> 新文件名
function get_task_id_ref_map(tasks: { name: string, task: LegacyTask }[], filename_map: Map<string, string>): Map<number, string> {
    const result = new Map<number, string>();
    for (const { name, task } of tasks) {
        result.set(task.id, filename_map.get(name)!);
    }
    return result;
}

// 把一组 id 映射为 key，找不到对应 key 的直接丢弃
function map_to_keys(ids: number[], key_map: Map<number, number>): number[] {
    const result: number[] = [];
    for (const id of ids) {
        const key = key_map.get(id);
        if (key !== undefined) result.push(key);
    }
    return result;
}

// 任务 id 列表 -> 新文件名列表，找不到对应任务的一律丢弃
function map_to_filenames(ids: number[], ref_map: Map<number, string>): string[] {
    const result: string[] = [];
    for (const id of ids) {
        const filename = ref_map.get(id);
        if (filename !== undefined) result.push(filename);
    }
    return result;
}

// 原始任务状态 -> 语义状态；NONE 视为未开始，FAILED 视为已完成
function get_quest_state(state_name: string): QuestState {
    switch (state_name) {
        case 'QUEST_STATE_UNSTARTED':
        case 'QUEST_STATE_NONE':
            return 'unstarted';
        case 'QUEST_STATE_UNFINISHED':
            return 'ongoing';
        case 'QUEST_STATE_FINISHED':
            return 'finished';
        case 'QUEST_STATE_FAILED':
            return 'failed';
        default:
            return 'unstarted';
    }
}

// 每段条件（一段可能已含 'not'，即原 not_equal）-> 后缀表达式（操作数与运算符交替）。
// 各逻辑对应的中缀式：
//   LOGIC_AND / LOGIC_NONE（默认）       g1 AND g2 AND ...
//   LOGIC_OR                             g1 OR g2 OR ...
//   LOGIC_A_AND_ETCOR                    g1 AND (g2 OR g3 ...)
//   LOGIC_A_OR_ETCAND                    g1 OR (g2 AND g3 ...)
//   LOGIC_A_AND_B_AND_ETCOR              (g1 AND g2) AND (g3 OR g4 ...)
//   LOGIC_A_AND_B_OR_ETCAND              (g1 AND g2) OR (g3 AND g4 ...)
//   LOGIC_A_OR_B_OR_ETCAND               (g1 OR g2) OR (g3 AND g4 ...)
//   LOGIC_NOT                             NOT g1
function build_postfix(logic: string, groups: TaskConditionToken[][]): TaskConditionToken[] {
    const n = groups.length;
    if (n === 0) return [];
    if (n === 1) return logic === 'LOGIC_NOT' ? [...groups[0], 'not'] : [...groups[0]];

    const [a, b, ...rest] = groups;
    switch (logic) {
        case 'LOGIC_OR':
            // a b OR c OR d OR ...
            return [...a, ...b, 'or', ...rest.flatMap(c => [...c, 'or' as const])];
        case 'LOGIC_A_OR_ETCAND':
            // a b ...rest(AND) OR
            return [...a, ...b, ...rest.flatMap(c => [...c, 'and' as const]), 'or'];
        case 'LOGIC_A_AND_ETCOR':
            // a b ...rest(OR) AND
            return [...a, ...b, ...rest.flatMap(c => [...c, 'or' as const]), 'and'];
        case 'LOGIC_A_AND_B_AND_ETCOR':
            // a b AND ...rest(OR) AND
            return [...a, ...b, 'and', ...rest.flat(), ...rest.slice(1).map(() => 'or' as const), ...(rest.length ? ['and' as const] : [])];
        case 'LOGIC_A_AND_B_OR_ETCAND':
            // a b AND ...rest(AND) OR
            return [...a, ...b, 'and', ...rest.flat(), ...rest.slice(1).map(() => 'and' as const), ...(rest.length ? ['or' as const] : [])];
        case 'LOGIC_A_OR_B_OR_ETCAND':
            // a b OR ...rest(AND) OR
            return [...a, ...b, 'or', ...rest.flat(), ...rest.slice(1).map(() => 'and' as const), ...(rest.length ? ['or' as const] : [])];
        default:
            // LOGIC_AND / LOGIC_NONE：a b AND c AND d AND ...
            return [...a, ...b, 'and', ...rest.flatMap(c => [...c, 'and' as const])];
    }
}

// 原始角色 -> 语义角色；无角色（TALK_ROLE_NONE 等）返回 null，用于丢弃该条对话
function get_role_type(role_type: string): RoleType | null {
    switch (role_type) {
        case 'TALK_ROLE_NPC':
        case 'TALK_ROLE_MATE_AVATAR':
            return 'npc';
        case 'TALK_ROLE_PLAYER':
            return 'player';
        case 'TALK_ROLE_BLACK_SCREEN':
        case 'TALK_ROLE_NEED_CLICK_BLACK_SCREEN':
        case 'TALK_ROLE_CONSEQUENT_BLACK_SCREEN':
        case 'TALK_ROLE_CONSEQUENT_NEED_CLICK_BLACK_SCREEN':
            return 'black_screen';
        default:
            return null;
    }
}

function get_renumbered_dialog(dialog: LegacyDialog, dialog_key_map: Map<number, number>, lang: Lang): TaskDialog {
    const role_type = get_role_type(dialog.role_type)!;
    return {
        content: dialog.content,
        role_type,
        // 同伴（双子）的说话者标题用 i18n 标记
        ...(dialog.role_type === 'TALK_ROLE_MATE_AVATAR'
            ? { speaker_title: t('ingame.mate_name', lang) }
            : dialog.speaker_title ? { speaker_title: dialog.speaker_title } : {}),
        ...(dialog.speaker_subtitle ? { speaker_subtitle: dialog.speaker_subtitle } : {}),
        next_dialog_keys: map_to_keys(dialog.next_dialog_ids, dialog_key_map),
    };
}

// dialogs -> 丢弃无角色对话后，以 1 起始的 key 为键名的对象
function get_renumbered_dialogs(dialogs: LegacyDialog[], lang: Lang): Record<string, TaskDialog> {
    const kept = dialogs.filter(dialog => get_role_type(dialog.role_type) !== null);
    const dialog_key_map = new Map<number, number>();
    kept.forEach((dialog, index) => dialog_key_map.set(dialog.id, index + 1));

    const result: Record<string, TaskDialog> = {};
    kept.forEach((dialog, index) => result[String(index + 1)] = get_renumbered_dialog(dialog, dialog_key_map, lang));
    return result;
}

// 完整 step 条件 -> 后缀表达式：
//   内部 step（stepId 属于当前任务）task_name 为 null，step_key 取当前任务内 key；
//   外部 step 查全局 step_ref_map 得到任务文件名与 key，找不到的直接丢弃并输出到控制台。
function get_condition_postfix(
    begin_conditions: LegacyTalk['begin_conditions'],
    step_ref_map: Map<number, { filename: string, key: number }>,
    current_step_key_map: Map<number, number>,
    filename: string,
): TaskConditionToken[] {
    const groups: TaskConditionToken[][] = [];
    for (const condition of begin_conditions.conditions) {
        const internal_key = current_step_key_map.get(condition.stepId);
        let task_name: string | null;
        let step_key: number;
        if (internal_key !== undefined) {
            task_name = null;
            step_key = internal_key;
        } else {
            const ref = step_ref_map.get(condition.stepId);
            if (!ref) {
                console.log(`${filename}: step id ${condition.stepId} not found`);
                continue;
            }
            task_name = ref.filename;
            step_key = ref.key;
        }
        const operand: TaskStepCondition = {
            task_name,
            step_key,
            ...(condition.state_name ? { state_name: get_quest_state(condition.state_name) } : {}),
        };
        // not_equal 直接用后缀表达式的 'not' 运算符表达（等价于条件取反），无需独立 type 字段
        groups.push(condition.type.includes('NOT_EQUAL') ? [operand, 'not'] : [operand]);
    }
    return build_postfix(begin_conditions.logic, groups);
}

// talks -> 以 1 起始的 key 为键名的对象；trigger 丢弃 begin_way/mark
function get_renumbered_talks(
    talks: LegacyTalk[],
    step_ref_map: Map<number, { filename: string, key: number }>,
    current_step_key_map: Map<number, number>,
    filename: string,
    lang: Lang,
): Record<string, TaskTalk> {
    const result: Record<string, TaskTalk> = {};
    talks.forEach((talk, index) => {
        result[String(index + 1)] = {
            conditions: get_condition_postfix(talk.begin_conditions, step_ref_map, current_step_key_map, filename),
            trigger: {
                object_names: talk.trigger.object_names,
                points: talk.trigger.points,
            },
            dialogs: get_renumbered_dialogs(talk.dialogs, lang),
        };
    });
    return result;
}

// steps -> 以 1 起始的 key 为键名的对象
function get_renumbered_steps(steps: LegacyStep[], talk_key_map: Map<number, number>): Record<string, TaskStep> {
    const result: Record<string, TaskStep> = {};
    steps.forEach((step, index) => {
        result[String(index + 1)] = {
            order: step.order,
            description: step.description,
            talk_keys: map_to_keys(step.talk_ids, talk_key_map),
            related_talk_keys: map_to_keys(step.related_talk_ids, talk_key_map),
        };
    });
    return result;
}

// 输入：
//   task_list    —— tasks.js 的原始分组（章节 -> 任务名列表），用于输出新的 list；
//   tasks       —— 现有导出结果，name 为当前 id（如 the_wind_has_ceased-70065），task 为 LegacyTask 对象；
//   filename_map —— 可选，由调用方传入已构建的文件名映射，不传则自行构建。
// 输出：
//   files —— 每个 { filename, task }（重命名 + 重编号后的任务对象）；
//   list —— 每个任务记录 id、任务名、描述、所属章节名、任务类型。
export function process_task_export(
    task_list: Record<string, string[]>,
    tasks: { name: string, task: LegacyTask }[],
    lang: Lang,
    filename_map: Map<string, string> = get_filename_map(tasks.map(({ name, task }) => ({ name, id: task.id }))),
): TaskExport {
    const step_ref_map = get_step_ref_map(tasks, filename_map);
    const task_id_ref_map = get_task_id_ref_map(tasks, filename_map);
    const task_by_name = new Map(tasks.map(task => [task.name, task.task] as const));

    const files = tasks.map(({ name, task }) => {
        const filename = filename_map.get(name)!;
        const talk_key_map = new Map<number, number>();
        task.talks.forEach((talk, index) => talk_key_map.set(talk.id, index + 1));
        // 当前任务内 stepId -> key（用于判定内部 step）
        const current_step_key_map = new Map<number, number>();
        task.steps.forEach((step, index) => current_step_key_map.set(step.id, index + 1));

        return {
            filename,
            task: {
                name: task.name,
                description: task.description,
                unlock_description: task.unlock_description,
                chapter: task.chapter,
                prev_tasks: map_to_filenames(task.prev_task_ids, task_id_ref_map),
                suggest_tasks: map_to_filenames(task.suggest_task_ids, task_id_ref_map),
                steps: get_renumbered_steps(task.steps, talk_key_map),
                talks: get_renumbered_talks(task.talks, step_ref_map, current_step_key_map, filename, lang),
            },
        };
    });

    // 新的 list：每个任务记录 id、任务名、描述、所属章节名、任务类型
    const exported_names = new Set(tasks.map(t => t.name));
    const list: Tasks = [];
    for (const [section, names] of Object.entries(task_list)) {
        for (const name of names) {
            if (!exported_names.has(name)) continue;
            const task = task_by_name.get(name)!;
            list.push({
                id: filename_map.get(name)!,
                name: task.name,
                description: task.description,
                chapter: task.chapter || null,
                type: section as TaskType,
            });
        }
    }

    return { files, list };
}
