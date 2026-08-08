export type ChapterGroup = {
    id: string,
    name: string,
    chapters: {
        id: string,
        name: string,
        icon: string,
        tasks: string[],
    }[],
};

export type ChapterGroups = Omit<ChapterGroup, 'id'>[];
