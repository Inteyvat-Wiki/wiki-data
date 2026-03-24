import type { MaterialType } from "~/types/common";

export type Material = {
    name: string,
    icon: string,
    star: 1 | 2 | 3 | 4 | 5 | null,
    type: string,
    info: {
        title: string,
        description: string,
    }[],
    effect: string | null,
    description_full: string | null,
}[];

export type Materials = {
    id: string,
    name: string,
    icon: string,
    star: 1 | 2 | 3 | 4 | 5 | null,
    type: MaterialType,
    count: number,
}[];