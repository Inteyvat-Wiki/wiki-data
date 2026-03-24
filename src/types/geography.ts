import type { GeographyType, GeographyArea } from "~/types/common";

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

export type Geographies = {
    id: string,
    name: string,
    image: string,
    type: GeographyType,
    area: GeographyArea,
}[];