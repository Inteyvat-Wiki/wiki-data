import type { ItemCommon, PageDataTrait } from "~/types/common";

export type QuestItem = ItemCommon<null>;

export interface QuestItemPage extends PageDataTrait {
    icon: string;
}

export type QuestItemPages = QuestItemPage[];
