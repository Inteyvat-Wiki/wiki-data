import type { LivingBeingType } from "~/types/common";

export type LivingBeings = {
    id: string,
    name: string,
    icon: string,
    type: LivingBeingType,
    count: number,
}[];