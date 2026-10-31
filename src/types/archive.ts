import type { PageDataTrait } from '~/types/common';
import type { TaskTalk } from '~/types/task';

export type ArchiveCategory = 'serenitea' | 'tcg' | 'miliastra';
export type ArchiveClassification = { id: string; group_id: string; group_name: string; name: string };
export type ArchiveImage = { name: string; url: string | null; kind?: string };
export type ArchiveRelation = {
    category: string;
    id: string;
    name: string;
    role: string;
    count?: number;
};
export type ArchiveTalk = TaskTalk & { source_id: number; title: string };
export type ArchiveItem = {
    name: string;
    type: string;
    description: string;
    sections: { title?: string; kind?: string; text: string }[];
    classifications?: ArchiveClassification[];
    card_type?: { id: string; name: string };
    tags?: { id: string; name: string; order?: number; hidden?: boolean }[];
    images: ArchiveImage[];
    relations: ArchiveRelation[];
    talks: Record<string, ArchiveTalk>;
    entry_talks: number[];
    source: { table: string; id: string; hashes: string[]; references?: string[] };
    diagnostics?: string[];
};
export interface ArchivePage extends PageDataTrait {
    source_id?: string;
    type: string; description: string; classifications?: ArchiveClassification[];
    card_type?: ArchiveItem['card_type']; tags?: ArchiveItem['tags'];
}
export type ArchiveExport = { files: { id: string; data: ArchiveItem }[]; list: ArchivePage[] };
