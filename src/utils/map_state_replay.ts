import type { MapRecord } from '@inteyvat-wiki/genshin-db';

function shape(value: unknown, fields: string[], label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || Object.keys(value).some(key => !fields.includes(key)) || fields.some(key => !Object.hasOwn(value, key))) throw new Error(`Invalid ${label}`);
    return value as Record<string, unknown>;
}
export function map_layer_write(record: MapRecord) {
    if (record.data.layer_state_change === undefined) return undefined;
    const value = shape(record.data.layer_state_change, ['profile','unlocked','execution_order'], 'layer state write');
    if (value.profile !== 'map-layer-unlock-v1' || typeof value.unlocked !== 'boolean'
        || !Number.isSafeInteger(value.execution_order) || (value.execution_order as number) < 0) throw new Error('Unsupported layer state write');
    return { visible: value.unlocked, order: value.execution_order as number };
}
// Explicit conversion boundary: new upstream interpretations require review here.
export function map_initial_state(record: MapRecord) {
    if (record.data.state_model === undefined) return undefined;
    const value = shape(record.data.state_model, ['profile','initial_open','initial_source','mode'], 'map state model');
    if (value.profile !== 'map-area-bool-v1' || typeof value.initial_open !== 'boolean'
        || !['configured','constructor-default'].includes(String(value.initial_source))
        || !['direct','level-tag','erosion'].includes(String(value.mode))) throw new Error('Unsupported map state model');
    return { initialVisible: value.initial_open, direct: value.mode === 'direct' };
}
export function map_state_write(record: MapRecord) {
    if (record.data.area_state_change === undefined) return undefined;
    const value = shape(record.data.area_state_change, ['profile','open','execution_order'], 'map state write');
    if (value.profile !== 'map-area-bool-v1' || typeof value.open !== 'boolean'
        || !Number.isSafeInteger(value.execution_order) || (value.execution_order as number) < 0) throw new Error('Unsupported map state write');
    return { visible: value.open, order: value.execution_order as number };
}
const level_profile = 'level-tag-groups-7.1-v1';
function identifier(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0; }
export function map_level_state(record: MapRecord) {
    if (record.data.level_tag_state === undefined) return undefined;
    const value = shape(record.data.level_tag_state, ['profile','series_id','group_index','members','visible_tags','initial_visible','image_index','image_binding','source_sha256'], 'level state model');
    if (value.profile !== level_profile || !identifier(value.series_id) || !identifier(value.group_index)
        || !Array.isArray(value.members) || !value.members.length || !value.members.every(identifier)
        || !Array.isArray(value.visible_tags) || !value.visible_tags.length || !value.visible_tags.every(id => value.members instanceof Array && value.members.includes(id))
        || typeof value.initial_visible !== 'boolean' || value.image_index !== 0 || value.image_binding !== 'sole-native-group'
        || typeof value.source_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.source_sha256)) throw new Error('Unsupported level state model');
    return { series: value.series_id, group: value.group_index, members: value.members as number[], visibleTags: value.visible_tags as number[], initialVisible: value.initial_visible };
}
export function map_level_write(record: MapRecord) {
    if (record.data.level_tag_change === undefined) return undefined;
    const value = shape(record.data.level_tag_change, ['profile','series_id','group_index','tag_id','execution_order'], 'level state write');
    if (value.profile !== level_profile || !identifier(value.series_id) || !identifier(value.group_index)
        || !identifier(value.tag_id) || !identifier(value.execution_order)) throw new Error('Unsupported level state write');
    return { series:value.series_id, group:value.group_index, tag:value.tag_id, order:value.execution_order };
}
