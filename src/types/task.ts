// ---- 任务索引与列表 ----

export type TaskType = 'archon_quests' | 'story_quests' | 'hangout_quests'
    | 'event_quests' | 'world_quests' | 'commission_quests';

export type TaskSummary = {
    id: string,
    name: string | null,
    description: string | null,
    chapter: string | null,
    type: TaskType,
};

export type Tasks = TaskSummary[];

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

export type TaskDialogSetOperation = {
    type: 'set',
    id: string,
    value: number | boolean,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskDialogInputOperation = {
    type: 'input',
    id: string,
    conditions?: TaskConditionToken[],
    branches?: TaskDialogBranch[],
};

export type TaskDialogOperation = TaskDialogSetOperation | TaskDialogInputOperation;

export type TaskDialog = {
    content: string,
    role: TaskDialogRole,
    speaker?: string,
    speaker_subtitle?: string,
    next_dialogs: TaskDialogNext[],
    operations?: TaskDialogOperation[],
};

export type TaskTriggerPoint = {
    scene_id: number,
    point_id?: number,
    position: [number, number, number],
};

export type TaskTalk = {
    priority: number,
    conditions: TaskConditionToken[],
    objects: string[],
    trigger_points: TaskTriggerPoint[],
    initial_dialogs?: TaskDialogNext[],
    dialogs: Record<string, TaskDialog>,
};

export type TaskStep = {
    hidden: boolean,
    description: string,
    talks: number[],
};

// ---- 正式导出结构 ----

export type Task = {
    name: string | null,
    description: string | null,
    unlock_description: string | null,
    chapter: string | null,
    previous_tasks: string[],
    suggested_tasks: string[],
    steps: Record<string, TaskStep>,
    talks: Record<string, TaskTalk>,
};

export type TaskExport = {
    files: {
        id: string,
        task: Task,
    }[],
    list: Tasks,
};

// ---- 原始数据（genshin-db）中间结构 ----

export type SourceTaskCondition = {
    type: string,
    params: (string | number | boolean)[],
    step_id?: number,
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
