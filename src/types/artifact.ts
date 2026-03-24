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
        "1-piece": string,
        "2-piece": string,
        "3-piece": string,
        "4-piece": string,
        "5-piece": string,
    },
    flower: ArtifactItem | null,
    plume: ArtifactItem | null,
    sands: ArtifactItem | null,
    goblet: ArtifactItem | null,
    circlet: ArtifactItem,
};

export type Artifacts = {
    id: string,
    name: string,
    icon: string,
    stars: (1 | 2 | 3 | 4 | 5)[],
}[];