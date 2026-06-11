export type Mapback = {
    coordinate?: [{ x: number, y: number }, { x: number, y: number }];
    images: {
        name: string | null;
        image: string;
        coordinate: [{ x: number, y: number }, { x: number, y: number }];
        z_index: number;
        shown_condition?: string;
    }[];
};

export type Maplayer = {
    name: string | null;
    region: string;
    layers: {
        name: string;
        name_old: string | null;
        floor: number;
        images: {
            image: string;
            coordinate: [{ x: number, y: number }, { x: number, y: number }];
            z_index: number;
            shown_condition?: string;
        }[];
    }[];
};

export type MapList = {
    [region: string]: {
        [name: string]: {
            coordinate: { x: number, y: number };
            layers: {
                name: string;
                name_old: string | null;
                floor: number;
            }[];
        };
    };
};

export type Maps = {
    [region: string]: string[];
}

export type MapConditions = {
    [name: string]: {
        [name: string]: {
            description: string | null;
            default?: boolean;
        };
    };
};