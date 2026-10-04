import type { ItemCommon } from "~/types/common";

export type Book = ItemCommon<null>[];

export type Books = {
    id: string,
    name: string,
    icon: string,
    set: string,
}[];
