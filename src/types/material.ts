import type { MaterialType, ItemCommon, PageDataTrait } from "~/types/common";

export type Material = ItemCommon<MaterialType>;

export interface MaterialPage extends PageDataTrait {
    icon: string;
    type: MaterialType;
}

export type MaterialPages = MaterialPage[];
