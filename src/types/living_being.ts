import type { LivingBeingType, ItemCommon } from "~/types/common";

export type LivingBeing = ItemCommon<LivingBeingType>[];

export type LivingBeings = {
    id: string,
    name: string,
    icon: string,
    type: LivingBeingType,
    count: number,
}[];