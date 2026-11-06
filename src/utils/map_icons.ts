import fs from 'node:fs';
import type { MapRecord } from '@inteyvat-wiki/genshin-db';
import type { MapScene } from '@inteyvat-wiki/wiki-contracts/map';
import { validatePng } from '@inteyvat-wiki/resource-tools';
import { images } from './images';

/** Consume only the upstream's verified icon association and image identity. */
export function map_icon_exporter(records: MapRecord[],
    copyImage: (source: string, target: string) => string | null = (source, target) => images.fromPath(source, target)) {
    const byId = new Map(records.map(record => [record.id, record]));
    const exported = new Map<string, string>();
    return (record: MapRecord): string | undefined => {
        const relations = record.kind === 'point' ? record.relations.filter(relation => relation.role === 'map_icon' && relation.category === 'maps') : [];
        if (relations.length > 1) throw new Error(`Ambiguous map icon association: ${record.id}`);
        const iconId = record.kind === 'map_icon' ? record.id : relations[0]?.id;
        if (iconId === undefined) return undefined;
        if (typeof iconId !== 'string') throw new Error(`Invalid map icon association: ${record.id}`);
        const source = byId.get(iconId);
        if (!source || source.kind !== 'map_icon') throw new Error(`Missing map icon record: ${record.id} → ${iconId}`);
        const data = source.data;
        const fields = ['image_file', 'image_sha256', 'image_width', 'image_height'];
        if (fields.every(field => data[field] === undefined)) return undefined;
        if (typeof data.image_file !== 'string' || typeof data.image_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(data.image_sha256)
            || !Number.isSafeInteger(data.image_width) || !Number.isSafeInteger(data.image_height)) throw new Error(`Incomplete map icon image identity: ${source.id}`);
        const cached = exported.get(source.id); if (cached) return cached;
        const identity = validatePng(fs.readFileSync(data.image_file));
        if (identity.sha256 !== data.image_sha256 || identity.width !== data.image_width || identity.height !== data.image_height)
            throw new Error(`Map icon image changed after snapshot preparation: ${source.id}`);
        const url = copyImage(data.image_file, `map/icons/${identity.sha256.slice(0, 24)}`);
        if (!url) throw new Error(`Could not export verified map icon: ${source.id}`);
        exported.set(source.id, url);
        return url;
    };
}

/** Map the upstream role explicitly; raw sprite names never reach the Wiki. */
export function map_layer_marker_icons(records: MapRecord[], exportIcon: ReturnType<typeof map_icon_exporter>): MapScene['layerMarkerIcons'] {
    const icons = records.filter(record => record.kind === 'map_icon' && record.data.badge_state !== undefined);
    if (!icons.length) return undefined;
    const result: Partial<NonNullable<MapScene['layerMarkerIcons']>> = {};
    for (const record of icons) {
        const state = record.data.badge_state;
        if (state !== 'normal' && state !== 'active') throw new Error(`Unmapped layer marker badge state: ${state}`);
        if (result[state]) throw new Error(`Ambiguous layer marker badge: ${state}`);
        const image = exportIcon(record);
        if (!image) throw new Error(`Missing verified layer marker badge: ${state}`);
        result[state] = image;
    }
    if (!result.normal || !result.active) throw new Error('Incomplete layer marker badge pair');
    return { normal: result.normal, active: result.active };
}
