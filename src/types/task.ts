import type { PageDataTrait } from "~/types/common";

// ---- 任务索引与列表 ----

export type TaskType = 'archon_quests' | 'story_quests' | 'hangout_quests'
    | 'event_quests' | 'world_quests' | 'commission_quests';

export interface TaskPage extends PageDataTrait {
    hidden: boolean;
    description: string | null;
    chapter: string | null;
    type: TaskType;
}

export type TaskPages = TaskPage[];

// ---- 任务条件：语义化后的条件表达式（供前端展示与交互）----
// 条件统一携带 id/title/subtitle 用于前端展示；
// type 区分 step（任务步骤）/ number（数值）/ boolean（布尔）。
// step 条件的 task 为 null 表示本任务内部步骤，否则为外部任务 id。
// 数值/布尔条件由各类 QUEST_COND_* 原始条件映射而来，见 src/utils/task_condition.ts。

export type TaskState = 'unstarted' | 'ongoing' | 'finished' | 'failed';
export type TaskComparison = 'equal' | 'not_equal' | 'greater' | 'greater_equal' | 'less' | 'less_equal';

export type TaskConditionBase = {
    id: string,
    title: string,
    subtitle: string,
};

export type TaskStepCondition = TaskConditionBase & {
    type: 'step',
    task: string | null,
    step: number,
    state?: TaskState,
};

export type TaskNumberCondition = TaskConditionBase & {
    type: 'number',
    value: number,
    comparison: TaskComparison,
};

export type TaskBooleanCondition = TaskConditionBase & {
    type: 'boolean',
    value: boolean,
};

export type TaskCondition = TaskStepCondition | TaskNumberCondition | TaskBooleanCondition;
export type TaskConditionToken = TaskCondition | 'and' | 'or' | 'not';
export type TaskFinishConditionToken = TaskConditionToken | { type: 'talk', talk: number };

// ---- 对话与触发 ----

export type TaskDialogRole = 'npc' | 'select' | 'black_screen' | 'text';

export type TaskDialogBranch = {
    id: string,
    type: 'random' | 'result',
    option: number,
};

export type TaskDialogNext = {
    dialog: number,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskVariableOperation = {
    type: 'variable',
    action: 'set' | 'input',
    id: string,
    value?: number | boolean,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskItemOperation = {
    type: 'item',
    action: 'obtain' | 'give' | 'remove',
    items: { id: number, count: number | null, name?: string, icon?: string, page?: string }[],
    choices?: { id: number, name?: string, icon?: string, page?: string }[],
    count?: number,
    giving_id?: number,
    reward_id?: number,
    remove?: boolean,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskOperation = TaskVariableOperation | TaskItemOperation;

export type TaskDialog = {
    content: string,
    role: TaskDialogRole,
    speaker?: string,
    speaker_subtitle?: string,
    next_dialogs: TaskDialogNext[],
    operations?: TaskOperation[],
    actions?: { type: string, timing: 'before' | 'while' | 'after', source: string }[],
};

export type TaskTriggerPoint = {
    scene_id: number,
    point_id?: number,
    position: [number, number, number],
};

export type TaskTalk = {
    operations?: TaskOperation[],
    priority: number,
    begin_way: 'manual' | 'auto' | null,
    next_talks: number[],
    trigger_ids: string[],
    conditions: TaskConditionToken[],
    objects: string[],
    trigger_points: TaskTriggerPoint[],
    initial_dialogs?: TaskDialogNext[],
    dialogs: Record<string, TaskDialog>,
};

export type TaskStep = {
    operations?: TaskOperation[],
    hidden: boolean,
    description: string,
    talks: number[],
    finish_conditions: TaskFinishConditionToken[],
    fail_conditions: TaskFinishConditionToken[],
};

// ---- 正式导出结构 ----

export type Task = {
    operations?: TaskOperation[],
    name: string | null,
    description: string | null,
    unlock_description: string | null,
    chapter: string | null,
    previous_tasks: string[],
    suggested_tasks: string[],
    steps: Record<string, TaskStep>,
    talks: Record<string, TaskTalk>,
    narrations: Record<string, TaskNarration>,
    bubbles?: Record<string, TaskBubble>,
};

export type TaskNarration = {
    type: 'narration',
    step: number,
    event: 'start' | 'finish' | 'failed',
    source: string,
    delay?: number,
    after?: string,
    conditions: TaskConditionToken[],
    dialogs: Record<string, TaskDialog & { duration?: number }>,
};

export type TaskBubble = {
    type: 'speech_bubble',
    step: number,
    event: 'start' | 'finish' | 'failed',
    source: string,
    api: string,
    action: 'create' | 'trigger' | 'clear_task' | 'clear_npc',
    npc_id?: number,
    dialog_id?: number,
    dialog?: TaskDialog,
    dialog_speaker?: { id?: string, type: string },
    text_sources?: string[],
    // Actual trailing arguments; native timing/repeat/distance semantics are not inferred.
    parameters?: (number | boolean | string | null | { reference: string } | { unknown: true })[],
    delay?: number,
    after?: string,
    callbacks?: { source: string, method: string, argument: number }[],
    conditions: TaskConditionToken[],
};

export type TaskExport = {
    files: {
        id: string,
        task: Task,
    }[],
    list: TaskPages,
};

// ---- 原始数据（genshin-db）中间结构 ----

export type SourceTaskCondition = {
    type: string,
    params: (string | number | boolean)[],
    step_id?: number,
    talk_id?: number,
    state?: string,
};

export type SourceTaskConditions = {
    logic: string,
    conditions: SourceTaskCondition[],
};

// step 条件的引用信息：外部任务标题/步骤描述，用于生成条件的 title/subtitle
export type TaskStepReference = {
    task: string,
    step: number,
    title: string,
    subtitle: string,
};
