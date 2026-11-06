import type { Dungeon, MapRecord } from '@inteyvat-wiki/genshin-db';
import { inline_link_text } from '@inteyvat-wiki/wiki-contracts/inline_link';
import type { MapCatalogueItem } from '@inteyvat-wiki/wiki-contracts/map';

export interface MapDungeonPage { id: string; sceneId: number; pointId: number }

function source_id(value: unknown, context: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw new Error(`Missing or invalid ${context}; prepare an updated dungeon snapshot`);
    return value;
}

/** Keys are unique entry configuration IDs, never the legacy scene-local ID. */
export function map_dungeon_pages(entries: Array<{ id: string; record: Dungeon }>): Map<number, MapDungeonPage> {
    const pages = new Map<number, MapDungeonPage>(), points = new Set<string>();
    for (const { id, record } of entries) {
        if (!inline_link_text('geography', id)) throw new Error(`Invalid map dungeon page: ${id}`);
        const entryId = source_id(record.entryId, 'dungeon entry ID');
        const sceneId = source_id(record.sceneId, 'dungeon scene ID');
        const pointId = source_id(record.id, 'dungeon point ID'), point = `${sceneId}:${pointId}`;
        if (pages.has(entryId) || points.has(point)) throw new Error(`Duplicate dungeon directory identity: ${id}`);
        pages.set(entryId, { id, sceneId, pointId }); points.add(point);
    }
    return pages;
}

/** Match the upstream's scene-scoped entrance join to the maintained directory. */
export function map_dungeon_link(record: MapRecord, pages: ReadonlyMap<number, MapDungeonPage>): MapCatalogueItem['relations'][number] | undefined {
    if (record.kind !== 'point' || !record.name || record.data.dungeon_entry_id === undefined) return;
    const page = pages.get(source_id(record.data.dungeon_entry_id, 'point dungeon entry ID'));
    if (!page) return;
    if (source_id(record.data.scene_id, 'point scene ID') !== page.sceneId || source_id(record.data.point_id, 'point ID') !== page.pointId)
        throw new Error(`Inconsistent map dungeon identity: ${record.id}`);
    const label = inline_link_text('geography', page.id);
    if (!label) throw new Error(`Invalid map dungeon page: ${page.id}`);
    return { label, target: { category: 'geography', id: page.id } };
}
