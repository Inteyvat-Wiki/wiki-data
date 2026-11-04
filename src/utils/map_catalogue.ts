import type { MapRecord } from 'genshin-db';
import { isMapCatalogue, type MapCatalogue, type MapCatalogueItem } from '@inteyvat-wiki/wiki-contracts/map';
import { map_icon_exporter } from './map_icons';
import { ConvertRaw } from './convert_raw';
import { map_dungeon_link, type MapDungeonPage } from './map_dungeon_links';

type Locale = 'zh_hans' | 'en';

/** Original text is escaped once; the Wiki only renders the converted document. */
export function escape_map_text(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function map_id(value: string): string { return ConvertRaw.get_map_id(value); }

export function convert_map_record(record: MapRecord, _lang: Locale, icon?: string): MapCatalogueItem {
    const source = ConvertRaw.get_map_record(record);
    const result: MapCatalogueItem = {
        id: source.id, kind: source.kind,
        label: escape_map_text(source.name), description: escape_map_text(source.description),
        // Required by the shared schema. Research metadata stays in the upstream cache.
        details: [], issues: [],
        texts: source.texts.map(text => ({ label: '', text: escape_map_text(text) })),
        relations: source.related.map(id => ({ label: '', target: { category: 'map', id } })),
    };
    if (icon) result.icon = icon;
    if (source.position) result.position = { x: source.position.x, y: source.position.y, z: source.position.z };
    return result;
}

export function convert_map_catalogue(records: MapRecord[], lang: Locale, dungeonPages: ReadonlyMap<number, MapDungeonPage> = new Map()): MapCatalogue {
    const exportIcon = map_icon_exporter(records);
    const result: MapCatalogue = { schema: 1, items: records.map(record => convert_map_record(record, lang, exportIcon(record))) };
    const byId = new Map(result.items.map(item => [item.id, item]));
    for (const item of result.items) item.relations = item.relations.flatMap(relation => {
        const target = byId.get(relation.target.id);
        return target ? [{ label: target.label, target: { category: 'map' as const, id: target.id } }] : [];
    });
    for (const [index, record] of records.entries()) {
        const link = map_dungeon_link(record, dungeonPages);
        if (link) result.items[index]!.relations.push(link);
    }
    if (!isMapCatalogue(result)) throw new Error('Map catalogue failed the shared Wiki contract');
    return result;
}
