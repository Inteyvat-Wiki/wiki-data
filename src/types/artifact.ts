import type { PageDataTrait } from "~/types/common";

export type ArtifactItem = {
    name: string,
    icon: string,
    description: string,
    story: string,
}

export type Artifact = {
    name: string,
    icon: string,
    stars: (1 | 2 | 3 | 4 | 5)[],
    effect: {
        "1-piece": string | null,
        "2-piece": string | null,
        "3-piece": string | null,
        "4-piece": string | null,
        "5-piece": string | null,
    },
    flower: ArtifactItem | null,
    plume: ArtifactItem | null,
    sands: ArtifactItem | null,
    goblet: ArtifactItem | null,
    circlet: ArtifactItem | null,
};

export interface ArtifactPage extends PageDataTrait {
    icon: string;
    stars: (1 | 2 | 3 | 4 | 5)[];
}

export type ArtifactPages = ArtifactPage[];
