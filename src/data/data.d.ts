import type { ArchiveType } from '@inteyvat-wiki/wiki-contracts/archive';
import type { ChapterGroupType } from '@inteyvat-wiki/wiki-contracts/chapter_group';
import type { GeographyType } from '@inteyvat-wiki/wiki-contracts/common';
import type { MiscType } from '@inteyvat-wiki/wiki-contracts/category';
import type { OutfitType } from '@inteyvat-wiki/wiki-contracts/outfit';
import type { TaskType } from '@inteyvat-wiki/wiki-contracts/task';

// Generator inputs only. Each JS catalogue declares its own type so both its
// maintained contents and its consumers are checked, without wildcard modules.
export type NameList = string[];
export type NamedDirectory<T extends string | number> = Record<string, T | Record<string, T>>;
export type MaterialDirectory = Record<string, Array<string | string[]>>;
export type GeographyDirectory = Record<GeographyType, string[]>;
export type LivingBeingDirectory = Record<'enemy' | 'animal', string[]>;
export type ChapterDirectory = Record<ChapterGroupType, Record<string, string[]>>;
export type TaskSource = `Quest ${number}` | `Quest ${number}, File ${number}`;
export type TaskDirectory = Record<TaskType, Record<string, TaskSource>>;
export type QuestItemDirectory = NamedDirectory<`QuestItem ${number}`>;
export type ReadableDirectory = Record<string, `Document ${number}`>;
export type NpcDirectory = Record<string, `NPC ${number}`>;
export type WeaponRefineMaterialDirectory = Record<string, string>;
export type OutfitDirectory = Record<OutfitType, NamedDirectory<number>>;

export interface ArchiveDirectoryTypes {
    serenitea: ArchiveType<'serenitea'>;
    tcg: ArchiveType<'tcg'>;
    // The commented-out legacy lore section is retained in the catalogue.
    miliastra: ArchiveType<'miliastra'> | 'lore';
    misc: MiscType;
}
export type SourceDirectory<T extends string> = { [K in T]: Record<string, `${K}-${number}`> };
export type SereniteaDirectory = SourceDirectory<ArchiveDirectoryTypes['serenitea']>;
export type TcgDirectory = SourceDirectory<ArchiveDirectoryTypes['tcg']>;
export type MiliastraDirectory = SourceDirectory<ArchiveDirectoryTypes['miliastra']>;
export type MiscDirectory = SourceDirectory<ArchiveDirectoryTypes['misc']>;
export type ArchiveIdAliases = {
    [C in keyof ArchiveDirectoryTypes]?: Record<string, `${ArchiveDirectoryTypes[C]}-${number}`>;
};
export type MiliastraHallGroups = Array<[`hall-${number}`, `hall-${number}`]>;

// Unlike the parsed selection, maintained map lists contain arrays, not Sets.
export interface MapDirectoryScene {
    source: `scene-${number}`;
    title?: { zh_hans: string; en: string };
    boundary?: `resource-boundary-${string}`;
    places: string[];
    labels: string[];
    areas: string[];
    maskGroups: Record<string, string[]>;
}
export interface MapDirectory {
    schema: 1;
    scenes: Record<string, MapDirectoryScene>;
}
export type { MapTaskDependencies } from '@inteyvat-wiki/wiki-contracts/map';
