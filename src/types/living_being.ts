import type { LivingBeingType, ItemCommon, PageDataTrait } from "~/types/common";

export type LivingBeing = ItemCommon<LivingBeingType>;

export interface LivingBeingPage extends PageDataTrait {
    icon: string;
    type: LivingBeingType;
}

export type LivingBeingPages = LivingBeingPage[];
