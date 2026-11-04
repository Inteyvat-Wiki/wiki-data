export type * from '@inteyvat-wiki/wiki-contracts/task';

// Generator-only intermediate types; never part of the browser contract.
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
