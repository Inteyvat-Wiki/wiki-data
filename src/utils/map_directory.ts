import type { MapRecord } from 'genshin-db';
import type { MapScene } from '@inteyvat-wiki/wiki-contracts/map';

export interface MapDirectoryEntry {
    id: string; source: string; sceneId: number; title?: { zh_hans: string; en: string }; boundary?: string;
    places: Set<string>; labels: Set<string>; areas: Set<string>; maskGroups: Record<string, string[]>;
}
export type MapSelection = Map<number, MapDirectoryEntry>;
function object(value: unknown, allowed: string[], context: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid map directory ${context}`);
    for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unknown map directory field ${context}.${key}`);
    return value as Record<string, unknown>;
}
export function map_directory_entries(value: unknown): MapSelection {
    const root = object(value, ['schema', 'scenes'], 'root');
    if (root.schema !== 1 || !root.scenes || typeof root.scenes !== 'object' || Array.isArray(root.scenes)) throw new Error('Invalid map directory schema');
    const result: MapSelection = new Map(), seen = new Set<string>();
    for (const [id, raw] of Object.entries(root.scenes)) {
        if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) throw new Error(`Invalid map route ${id}`);
        const entry = object(raw, ['source', 'title', 'places', 'labels', 'areas', 'maskGroups', 'boundary'], id);
        if (typeof entry.source !== 'string' || !/^scene-[1-9]\d*$/.test(entry.source)) throw new Error(`Invalid map scene source ${id}`);
        const sceneId = Number(entry.source.slice(6));
        if (!Number.isSafeInteger(sceneId) || result.has(sceneId)) throw new Error(`Duplicate or invalid map scene ${id}`);
        if (entry.boundary !== undefined && (typeof entry.boundary !== 'string' || !/^resource-boundary-[a-z0-9-]+$/.test(entry.boundary)))
            throw new Error(`Invalid fixed map boundary ${id}`);
        const list = (key: 'places' | 'labels' | 'areas') => {
            const values = entry[key];
            if (!Array.isArray(values)) throw new Error(`Missing map directory ${id}.${key}`);
            for (const source of values) {
                if (typeof source !== 'string' || !/^[a-z][a-z0-9-]*$/.test(source) || seen.has(source)) throw new Error(`Duplicate or invalid map directory source ${source}`);
                seen.add(source);
            }
            return new Set(values as string[]);
        };
        let title: MapDirectoryEntry['title'];
        if (entry.title !== undefined) {
            const text = object(entry.title, ['zh_hans','en'], `${id}.title`);
            if (typeof text.zh_hans !== 'string' || !text.zh_hans.trim() || typeof text.en !== 'string' || !text.en.trim()) throw new Error(`Invalid map title ${id}`);
            title = { zh_hans:text.zh_hans, en:text.en };
        }
        if (!entry.maskGroups || typeof entry.maskGroups !== 'object' || Array.isArray(entry.maskGroups)) throw new Error(`Missing map directory ${id}.maskGroups`);
        const maskGroups: Record<string, string[]> = {}, maskIds = new Set<string>();
        for (const [groupId, members] of Object.entries(entry.maskGroups)) {
            if (!/^[a-z][a-z0-9-]*$/.test(groupId) || !Array.isArray(members) || !members.length) throw new Error(`Invalid mask group ${id}/${groupId}`);
            for (const member of members) {
                if (typeof member !== 'string' || !/^[a-z][a-z0-9-]*$/.test(member) || maskIds.has(member)) throw new Error(`Duplicate or invalid mask group member ${id}/${member}`);
                maskIds.add(member);
            }
            maskGroups[groupId] = [...members];
        }
        result.set(sceneId, { id, source:entry.source, sceneId, ...(title ? {title} : {}), ...(entry.boundary ? { boundary:entry.boundary as string } : {}), places:list('places'), labels:list('labels'), areas:list('areas'), maskGroups });
    }
    return result;
}
export function select_map_directory(records: MapRecord[], value: unknown): MapSelection {
    const selection = map_directory_entries(value), byId = new Map(records.map(record => [record.id, record]));
    for (const entry of selection.values()) {
        const scene = byId.get(entry.source);
        if (!scene || scene.kind !== 'scene' || scene.data.scene_id !== entry.sceneId) throw new Error(`Missing map scene source ${entry.source}`);
        if (!records.some(record => record.kind === 'resource' && record.data.category === 'base-tile' && record.data.scene_id === entry.sceneId)) throw new Error(`Selected map scene has no native base: ${entry.id}`);
        if (entry.boundary) {
            const boundary = byId.get(entry.boundary);
            if (!boundary || boundary.kind !== 'resource' || boundary.data.category !== 'native-boundary' || boundary.data.scene_id !== entry.sceneId)
                throw new Error(`Missing or mismatched fixed map boundary: ${entry.id}/${entry.boundary}`);
        }
        for (const id of Object.values(entry.maskGroups).flat()) {
            const record = byId.get(id);
            if (!record || record.kind !== 'resource' || record.data.category !== 'atlas-image' || record.data.scene_id !== entry.sceneId)
                throw new Error(`Missing or mismatched mask group source: ${entry.id}/${id}`);
        }
        for (const [key, sources] of [['places', entry.places], ['labels', entry.labels], ['areas', entry.areas]] as const) for (const id of sources) {
            const record = byId.get(id);
            const kinds: string[] = key === 'places' ? ['point','viewpoint','npc_instance'] : key === 'labels' ? ['map_place'] : ['world_area'];
            if (!record || !kinds.includes(record.kind) || record.data.scene_id !== entry.sceneId) throw new Error(`Missing or mismatched map directory source: ${entry.id}/${key}/${id}`);
            if (key === 'areas') for (const parent of record.relations.filter(link => link.role === 'parent_area')) {
                if (!entry.areas.has(parent.id)) throw new Error(`Selected area requires its parent in the directory: ${id}/${parent.id}`);
            }
        }
    }
    return selection;
}
export function selected_map_scenes(scenes: MapScene[], selection: MapSelection): MapScene[] {
    return [...selection.values()].map(entry => {
        const scene = scenes.find(scene => scene.id === entry.id);
        if (!scene || !scene.overlays.some(overlay => overlay.kind === 'base' && overlay.evidence === 'native')) throw new Error(`Selected scene has no converted base: ${entry.id}`);
        if (entry.boundary && (!scene.overlays.some(overlay => overlay.id === `${entry.boundary}-mask` && !overlay.condition)
            || !scene.regions.some(region => region.id === `${entry.boundary}-rim` && region.mesh && !region.condition)))
            throw new Error(`Fixed map boundary was not exported: ${entry.id}`);
        for (const [sources, values] of [[entry.places, scene.markers.filter(marker => marker.kind !== 'label')],
            [entry.labels, scene.markers.filter(marker => marker.kind === 'label')], [entry.areas, scene.areas || []]] as const) {
            const actual = new Set(values.map(value => value.id));
            if (sources.size !== actual.size || [...sources].some(id => !actual.has(id))) throw new Error(`Map directory entries were not exported: ${entry.id}`);
        }
        return scene;
    });
}
