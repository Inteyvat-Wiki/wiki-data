import type { LivingBeingType } from "~/types/common";

export type LivingBeing = {
    name: string,
    icon: string,
    type: string,
    info: {
        title: string,
        description: string,
    }[],
    description_full: string | null,
}[];

export type LivingBeings = {
    id: string,
    name: string,
    icon: string,
    type: LivingBeingType,
    count: number,
}[];