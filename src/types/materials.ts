import type { MaterialType } from "~/types/common";

export type Materials = {
    id: string,
    name: string,
    icon: string,
    star: 1 | 2 | 3 | 4 | 5 | null,
    type: MaterialType,
    count: number,
}[];