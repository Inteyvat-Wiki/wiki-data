import type { ItemCommon, PageDataTrait } from "~/types/common";

export type Book = ItemCommon<null>;

export interface BookPage extends PageDataTrait {
    icon: string;
    set: string;
}

export type BookPages = BookPage[];
