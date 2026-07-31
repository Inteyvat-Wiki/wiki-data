export type ChapterGroup = {
    id: string,
    name: string,
    chapters: {
        id: string,
        name: string,
        icon: string,
        task_ids: number[],
    }[],
};

export type ChapterGroups = Omit<ChapterGroup, 'id'>[];
