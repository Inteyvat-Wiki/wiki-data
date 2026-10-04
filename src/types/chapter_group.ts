import type { PageDataTrait } from "~/types/common";
import type { TaskType } from '~/types/task';

export type ChapterGroupType = Exclude<TaskType, 'commission_quests'>;

export type Chapter = {
    id: string,
    name: string,
    icon: string,
    tasks: string[],
};

export type ChapterGroup = {
    id: string,
    type: ChapterGroupType,
    name: string,
    chapters: Chapter[],
};

export interface ChapterGroupPage extends PageDataTrait {
    type: ChapterGroup['type'];
    chapter_count: number;
    task_count: number;
}

export type ChapterGroupPages = ChapterGroupPage[];

// 原始索引：类型 -> 章节组 id -> 章节 id 列表（来自 genshin-db）
export type ChapterGroupIndex = Record<ChapterGroupType, Record<string, string[]>>;
