// ---- 任务索引与列表 ----

export type Tasks = {
    id: string,
    name: string,
    description: string,
    chapter: string | null,
    type: 'archon_quests' | 'story_quests' | 'hangout_quests' | 'event_quests' | 'world_quests' | 'commission_quests',
}[];

// ---- 计算阶段：原始导出结构（值来自 genshin-db，保持原值）----

export type LegacyTask = {
    id: number,
    name: string,
    description: string,
    unlock_description: string,
    chapter: string,
    prev_task_ids: number[],
    suggest_task_ids: number[],
    steps: {
        id: number,
        order: number,
        description: string,
        talk_ids: number[],
        related_talk_ids: number[],
    }[],
    talks: {
        id: number,
        begin_conditions: {
            logic: string,
            conditions: {
                stepId: number,
                type: string,
                state_name?: string,
            }[],
        },
        trigger: {
            begin_way: string,
            mark: string,
            object_names: string[],
            points: {
                scene_id: number,
                point_id?: number,
                position: [number, number, number],
            }[],
        },
        dialogs: {
            id: number,
            content: string,
            role_type: string,
            speaker_title?: string,
            speaker_subtitle?: string,
            next_dialog_ids: number[],
        }[],
    }[],
};

// ---- 整理导出（正式导出）：重命名 + 重编号 + 语义化 ----

// 一个 step 条件：外部 step 的 task_name 为任务文件名，内部 step 为 null
// state_name 已语义化；'not_equal'（条件取反）直接用后缀表达式的 'not' 运算符表达，无独立字段

export type TaskStepCondition = {
    task_name: string | null,
    step_key: number,
    state_name?: 'unstarted' | 'ongoing' | 'finished' | 'failed',
};

// 后缀表达式：操作数（step 条件）与运算符交替保存
export type TaskConditionToken = TaskStepCondition | 'and' | 'or' | 'not';

export type Task = {
    name: string,
    description: string,
    unlock_description: string,
    chapter: string,
    prev_tasks: string[],
    suggest_tasks: string[],
    steps: Record<string, {
        order: number,
        description: string,
        talk_keys: number[],
        related_talk_keys: number[],
    }>,
    talks: Record<string, {
        conditions: TaskConditionToken[],
        trigger: {
            object_names: string[],
            points: {
                scene_id: number,
                point_id?: number,
                position: [number, number, number],
            }[],
        },
        dialogs: Record<string, {
            content: string,
            role_type: 'npc' | 'player' | 'black_screen',
            speaker_title?: string,
            speaker_subtitle?: string,
            next_dialog_keys: number[],
        }>,
    }>,
};

export type TaskExport = {
    files: {
        filename: string,
        task: Task,
    }[],
    list: Tasks,
};
