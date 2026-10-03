import type { ItemCommon } from "~/types/common";

export type QuestItem = ItemCommon<null>[];

export type QuestItems = {
    id: string,
    name: string,
    icon: string,
    star: 1 | 2 | 3 | 4 | 5 | null,
    count: number,
}[];