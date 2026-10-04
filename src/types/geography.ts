import type { GeographyType, GeographyArea, PageDataTrait } from "~/types/common";

export type Geography = {
    name: string,
    description: string,
    image: string,
    type: GeographyType,
    area: GeographyArea,
    tabs: {
        name: string,
        description: string,
    }[],
};

export interface GeographyPage extends PageDataTrait {
    icon: string;
    type: GeographyType;
    area: GeographyArea;
}

export type GeographyPages = GeographyPage[];
