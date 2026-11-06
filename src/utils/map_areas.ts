import type { MapRecord } from '@inteyvat-wiki/genshin-db';
import type { MapArea, MapAreaPolygon } from '@inteyvat-wiki/wiki-contracts/map';

function object(value: unknown, allowed: string[], context: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${context}`);
    for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unmapped ${context} field: ${key}`);
    return value as Record<string, unknown>;
}
function vector(value: unknown, context: string) {
    const point = object(value, ['x', 'y', 'z'], context);
    for (const [axis, coordinate] of Object.entries(point)) if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) throw new Error(`Invalid ${context}.${axis}`);
    return point as { x?: number; y?: number; z?: number };
}
export function map_area_polygon(value: unknown, context: string): MapAreaPolygon {
    const source = object(value, ['file', 'source', 'minimum', 'maximum', 'points'], context);
    if (source.file !== undefined && typeof source.file !== 'string') throw new Error(`Invalid ${context} file`);
    if (source.source !== undefined) {
        const origin = object(source.source, ['kind', 'resource_key', 'block', 'offset', 'path_id', 'sha256', 'decoder'], `${context} source`);
        if (origin.kind !== 'client-world-area') throw new Error(`Unmapped ${context} source kind`);
        if (typeof origin.resource_key !== 'string' || !/^\d+$/.test(origin.resource_key) || BigInt(origin.resource_key) > 0xffffffffffffffffn
            || typeof origin.path_id !== 'string' || !/^-?\d+$/.test(origin.path_id)
            || typeof origin.block !== 'string' || !/^\d+\.blk$/.test(origin.block)
            || !Number.isSafeInteger(origin.offset) || (origin.offset as number) < 0
            || typeof origin.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(origin.sha256)
            || typeof origin.decoder !== 'string' || !origin.decoder) throw new Error(`Invalid ${context} client source`);
        // Provenance is validated here and deliberately omitted from display data.
    }
    if (!Array.isArray(source.points) || source.points.length < 3) throw new Error(`Invalid ${context} points`);
    const points = source.points.map(value => {
        const point = vector(value, `${context} point`);
        if (point.x === undefined || point.z === undefined) throw new Error(`Missing ${context} X/Z coordinate`);
        return { x: point.x, y: point.z };
    });
    const minimum = source.minimum === undefined ? undefined : vector(source.minimum, `${context} minimum`).y;
    const maximum = source.maximum === undefined ? undefined : vector(source.maximum, `${context} maximum`).y;
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) throw new Error(`Inverted ${context} height`);
    return { points, ...(minimum === undefined ? {} : { minimumHeight: minimum }), ...(maximum === undefined ? {} : { maximumHeight: maximum }) };
}

/** Convert the upstream association; never infer parentage from an ID prefix or a footprint. */
export function map_area(record: MapRecord, records: ReadonlyMap<string, MapRecord>): MapArea {
    if (record.kind !== 'world_area') throw new Error(`Invalid area record: ${record.id}`);
    const data = object(record.data, ['area_id', 'scene_id', 'level', 'area_1_id', 'area_2_id', 'tower_point_id', 'minimap_scale', 'polygons'], record.id);
    for (const key of ['area_id', 'scene_id', 'area_1_id', ...(data.level === 'LEVEL_2' ? ['area_2_id'] : [])]) {
        if (!Number.isSafeInteger(data[key]) || (data[key] as number) < 0) throw new Error(`Invalid ${record.id}.${key}`);
    }
    const level = data.level === 'LEVEL_1' ? 1 : data.level === 'LEVEL_2' ? 2 : undefined;
    if (!level) throw new Error(`Unmapped area level: ${data.level}`);
    if (typeof record.name !== 'string' || typeof record.description !== 'string') throw new Error(`Invalid area text: ${record.id}`);
    const parents = record.relations.filter(relation => relation.role === 'parent_area');
    if (parents.length !== (level === 2 ? 1 : 0)) throw new Error(`Invalid area parent count: ${record.id}`);
    const parentLink = parents[0], parent = parentLink && records.get(parentLink.id);
    if (parentLink && (parentLink.category !== 'maps' || !parent || parent.kind !== 'world_area' || parent.data.level !== 'LEVEL_1'
        || parent.data.scene_id !== data.scene_id || parent.data.area_1_id !== data.area_1_id)) throw new Error(`Inconsistent area parent: ${record.id}`);
    if (data.polygons !== undefined && !Array.isArray(data.polygons)) throw new Error(`Invalid area polygons: ${record.id}`);
    // Scene labels are plain text, like markers, and are rendered with textContent.
    // Rich catalogue text is escaped separately by convert_map_record.
    return { id: record.id, recordId: record.id, label: record.name, description: record.description, level,
        ...(parentLink ? { parentId: parentLink.id } : {}),
        polygons: (data.polygons as unknown[] | undefined || []).map((value, i) => map_area_polygon(value, `${record.id} polygon ${i}`)) };
}
