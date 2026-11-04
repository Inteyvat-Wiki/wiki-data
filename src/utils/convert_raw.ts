
import type { Character, Weapon, MapRecord } from 'genshin-db';
import type { MapCatalogueKind } from '@inteyvat-wiki/wiki-contracts/map';
import { map_area_polygon } from './map_areas';
import { map_initial_state, map_state_write, map_level_state, map_level_write, map_layer_write } from './map_state_replay';

import type { ElementType, WeaponType } from '@inteyvat-wiki/wiki-contracts/common';
import type { OutfitType } from '@inteyvat-wiki/wiki-contracts/outfit';
import type { ArchiveCategory, ArchiveType, ArchiveTalk, CardType } from '@inteyvat-wiki/wiki-contracts/archive';
import type { MiscType, TutorialCategory, MessageKind, LoadingAction, LoadingTerrain, LoadingDungeonType } from '@inteyvat-wiki/wiki-contracts/misc';

import { images, prefer_image } from './images';

function get_images_url(filename: string | undefined, converted_path: string): string;
function get_images_url(filename: string | undefined, converted_path: string, options: { output: string; nullable: true }): string | null;
function get_images_url(filename: string | undefined, converted_path: string, options?: { output: string; nullable: true }): string | null {
    const result = images.fromName(filename, converted_path, options?.output);
    return result ?? (options?.nullable ? null : '');
}

// Source and Wiki namespaces are independent. Do not infer new mappings.
export function mapped_key<const V extends string>(map: Readonly<Record<string, V>>, key: string, category: string): V {
    if (!Object.hasOwn(map, key)) throw new Error(`Unmapped ${category}: ${key}`);
    return map[key]!;
}
const condition_keys = {
    QUEST_COND_ACTIVITY_OPEN: 'activity_open',
    QUEST_COND_GCG_INVITE_TYPE: 'gcg_invite_type',
    QUEST_COND_GCG_LEVEL_UNLOCKED: 'gcg_level_unlocked',
    QUEST_COND_GCG_NPC_TYPE: 'gcg_npc_type',
    QUEST_COND_HOMEWORLD_NPC_EVENT: 'homeworld_npc_event',
    QUEST_COND_SCENE_POINT_UNLOCK: 'scene_point_unlock',
} as const;

type DirectoryTypes = { [C in ArchiveCategory]: ArchiveType<C> } & { misc: MiscType };
type DirectoryTypeMaps = { [C in keyof DirectoryTypes]: Readonly<Record<string, DirectoryTypes[C]>> };
const archive_type_maps = {
    serenitea: { realm: 'realm', furniture: 'furniture', suite: 'suite', companion: 'companion' },
    tcg: { card: 'card', card_back: 'card_back', card_table: 'card_table', player: 'player', stage: 'stage' },
    miliastra: { costume: 'costume', suit: 'suit', catalog: 'catalog', hall: 'hall' },
    misc: { achievement: 'achievement', achievement_group: 'achievement_group', expedition: 'expedition',
        gallant_path: 'gallant_path', loading_tip: 'loading_tip', namecard: 'namecard',
        profile_frame: 'profile_frame', profile_picture: 'profile_picture', tutorial: 'tutorial', graeae_message: 'graeae_message' },
} as const satisfies DirectoryTypeMaps;

function map_source_object(value: unknown, allowed: readonly string[], context: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${context}`);
    for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unmapped ${context} field: ${key}`);
    return value as Record<string, unknown>;
}
function map_source_list(value: unknown): unknown[] {
    if (!Array.isArray(value)) throw new Error('Invalid map point list');
    return value;
}
function map_source_number(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid map point number');
    return value;
}
function map_source_string(value: unknown): string {
    if (typeof value !== 'string') throw new Error('Invalid map point text');
    return value;
}
function map_source_enum<const V extends string>(mapping: Readonly<Record<string, V>>, value: unknown, context: string): V {
    if (typeof value !== 'string') throw new Error(`Unmapped ${context}: ${String(value)}`);
    return mapped_key(mapping, value, context);
}
function map_optional_enum<const V extends string>(mapping: Readonly<Record<string, V>>, value: unknown, context: string): V | undefined {
    return value === undefined ? undefined : map_source_enum(mapping, value, context);
}
function convert_map_point_display(value: unknown) {
    if (value === undefined) return undefined;
    const policy = map_source_object(value, ['status', 'reason'], 'point map display');
    const reason = map_source_enum({
        'point-never': 'hidden_point', 'explicit-mark-invisible': 'hidden_icon',
        'point-on-unlocked': 'requires_unlock', 'visibility-unresolved': 'unknown_visibility',
    }, policy.reason, 'point map display reason');
    const status = map_source_enum({ excluded: 'omit', conditional: 'conditional', unresolved: 'unknown' }, policy.status, 'point map display status');
    const expected = { hidden_point: 'omit', hidden_icon: 'omit', requires_unlock: 'conditional', unknown_visibility: 'unknown' } as const;
    if (status !== expected[reason]) throw new Error('Inconsistent point map display status');
    return { exclude: status === 'omit' };
}

// Internal conversion only. The catalogue and scene exporters explicitly select
// their output fields; omitted point metadata must not become display copy again.
function convert_map_point_metadata(data: Record<string, unknown>) {
    const entranceCategory = map_optional_enum({
        DUNGEN_ENTRY_TYPE_RELIQUARY: 'artifact', DUNGEN_ENTRY_TYPE_WEAPON_PROMOTE: 'weapon_ascension',
        DUNGEN_ENTRY_TYPE_AVATAR_TALENT: 'character_talent', DUNGEON_ENTRY_TYPE_NORMAL: 'normal',
        DUNGEON_ENTRY_TYPE_OBSCURAE: 'obscurae', DUNGEON_ENTRY_TYPE_TRIAL: 'trial',
        DUNGEON_ENTRY_TYPE_ACTIVITY: 'activity', DUNGEON_ENTRY_TYPE_ROLE_COMBAT: 'role_combat',
        DUNGEON_ENTRY_TYPE_LEY_LINE_CHALLENGE: 'ley_line_challenge',
    }, data.dungeon_entry_category, 'point entrance category');
    const entranceType = map_optional_enum({
        Daily: 'daily', Tower: 'tower', Weekly: 'weekly', RoleCombat: 'role_combat', DirectEnter: 'direct_entry',
        ActivityPenAdvBladeDance: 'pen_adventure_blade_dance', RogueDiary: 'rogue_diary', LeyLineChallenge: 'ley_line_challenge',
        ActivitySummerTimeV2Story: 'summer_v2_story', ActivitySummerTimeV2Battle: 'summer_v2_battle',
    }, data.dungeon_entry_type, 'point entrance type');
    const iconOrigin = map_optional_enum({ point: 'point_config', building: 'building_config', 'category-preview': 'category_reference' }, data.icon_source, 'point icon source');
    const entranceAccess = (() => {
        if (data.entry_access === undefined) return undefined;
        const access = map_source_object(data.entry_access, ['conditions', 'combination', 'default_open'], 'entrance access');
        const operator = map_optional_enum({ LOGIC_OR: 'any', LOGIC_AND: 'all' }, access.combination, 'entrance logic');
        const requirements = map_source_list(access.conditions).map(value => {
            const condition = map_source_object(value, ['type', 'parameter_1', 'parameter_2'], 'entrance requirement');
            return {
                kind: map_source_enum({ DUNGEON_ENTRY_CONDITION_LEVEL: 'level', DUNGEON_ENTRY_CONDITION_QUEST: 'quest' }, condition.type, 'entrance requirement type'),
                first: condition.parameter_1 === undefined ? undefined : map_source_number(condition.parameter_1),
                second: condition.parameter_2 === undefined ? undefined : map_source_number(condition.parameter_2),
            };
        });
        if (access.default_open !== undefined && typeof access.default_open !== 'boolean') throw new Error('Invalid entrance default');
        return { operator, requirements, openByDefault: access.default_open };
    })();
    const availability = (() => {
        if (data.presence === undefined) return undefined;
        const presence = map_source_object(data.presence, ['classification', 'lifetime', 'activities'], 'point presence');
        return {
            kind: map_source_enum({ 'activity-associated': 'activity_linked', unresolved: 'unknown' }, presence.classification, 'point presence classification'),
            duration: map_source_enum({ unresolved: 'unknown' }, presence.lifetime, 'point lifetime'),
            relatedActivities: map_source_list(presence.activities).map(value => {
                const activity = map_source_object(value, ['id', 'name', 'dungeon_ids', 'configured_duration'], 'point activity');
                return { id: map_source_number(activity.id), title: map_source_string(activity.name),
                    domainIds: map_source_list(activity.dungeon_ids).map(map_source_number),
                    configuredDuration: activity.configured_duration === undefined ? undefined : map_source_number(activity.configured_duration) };
            }),
        };
    })();
    return { display: convert_map_point_display(data.map_display), entranceCategory, entranceType, iconOrigin, entranceAccess, availability };
}

const map_catalogue_kinds: Record<string, MapCatalogueKind> = {
    scene: 'scene', world_area: 'world-area', map_area: 'map-area', layer_group: 'layer-group', floor: 'floor', layer: 'layer',
    label: 'label', point: 'point', point_collection: 'point', level_tag: 'level-tag', scene_tag: 'scene-tag',
    limit_region: 'boundary', open_state: 'access-rule', quest_event: 'state-change', map_tag: 'map-tag',
    map_icon: 'map-icon', map_settings: 'map-settings', resource: 'resource',
    viewpoint: 'viewpoint', npc_instance: 'npc-instance', layer_region: 'layer-region', ability_map: 'ability-map', boundary_geometry: 'boundary-geometry',
    map_trigger: 'map-trigger', map_place: 'map-place',
};

const map_catalogue_fields: Record<string, string[]> = {
    scene: ['scene_id', 'scene_type', 'script', 'world_scene_id', 'image_scene_id', 'fixed_time', 'allow_map_mark', 'boundary_values'],
    world_area: ['area_id', 'scene_id', 'level', 'area_1_id', 'area_2_id', 'tower_point_id', 'minimap_scale', 'polygons'],
    map_area: ['area_id', 'scene_id', 'area_1_ids', 'state', 'area_type', 'scene_point_id', 'config', 'state_model', 'level_tag_state'],
    layer_group: ['group_id', 'area_ids', 'reference_floor_id', 'floor_ids', 'scene_id'],
    floor: ['floor_id', 'group_id', 'number', 'alternate_name', 'name_condition', 'layer_ids', 'scene_id'],
    layer: ['layer_id', 'floor_id', 'image_name', 'image_name_method', 'scene_id'],
    label: ['label_id', 'place_name_id', 'sub_area_id', 'action', 'map_tag_type', 'condition', 'target_type', 'world_area_id'],
    point: ['scene_id', 'point_id', 'point_type', 'position', 'rotation', 'trans_position', 'trans_rotation', 'area_id', 'sub_area_id', 'world_area_id',
        'layer_id', 'floor_id', 'gadget_id', 'dungeon_ids', 'visibility', 'unlocked', 'forbid_simple_unlock', 'show_level', 'entry_point_id', 'point_class', 'transport_type',
        'building_type', 'map_icon_id', 'icon', 'title_text_id', 'description_text_id', 'name_source', 'description_source', 'dungeon_entry_id',
        'statue_city_id', 'icon_source', 'dungeon_entry_type', 'dungeon_entry_category', 'entry_access', 'presence', 'transport_subtype', 'map_display'],
    point_collection: ['scene_id', 'count'],
    level_tag: ['tag_id', 'scene_id', 'add_scene_tags', 'remove_scene_tags', 'fixed_time', 'can_fix_time', 'map_areas'],
    scene_tag: ['tag_id', 'scene_id', 'default_valid', 'independent', 'conditions'],
    limit_region: ['region_id', 'scene_id', 'region_type', 'order', 'hide_paimon', 'open_state_name', 'open_state_id', 'reminder_id', 'polygons', 'geometry_status'],
    open_state: ['state_id', 'allow_client_open', 'conditions'],
    quest_event: ['quest_id', 'parent_quest_id', 'phase', 'action', 'parameters', 'target_ids', 'state', 'order', 'scene_id', 'condition_evidence', 'state_dependencies', 'area_state_change', 'level_tag_change', 'layer_state_change'],
    map_tag: ['tag_id', 'tag_type', 'icon', 'scene_ids', 'hide_before_unlock', 'point_id', 'sort'],
    map_icon: ['icon', 'effect', 'mark_type', 'layer', 'radar_visibility', 'map_visibility', 'show_on_locked_area', 'show_height', 'material_index',
        'title_text_id', 'description_text_id', 'image_file', 'image_sha256', 'image_width', 'image_height', 'badge_state'],
    map_settings: ['minimap_ui_radius', 'minimap_sight_radius', 'minimap_scale', 'minimap_scales', 'map_scale', 'map_scale_min', 'map_scale_max', 'mark_near_threshold'],
    resource: ['category', 'status', 'source_entry', 'decoded', 'references', 'serialized_file', 'visibility_status', 'layout', 'component_color', 'material',
        'asset_name', 'root_name', 'area_ids', 'scene_id', 'group_id', 'layer_id', 'floor_id', 'display_geometry', 'image_file', 'image_sha256', 'image_width', 'image_height', 'render_order', 'area_variants', 'limit_region_id', 'mask', 'rim'],
    boundary_geometry: ['polygons', 'active_reference'],
    layer_region: ['group_id', 'layer_id', 'scene_id', 'shapes', 'polygons', 'footprints', 'bounds_validation'],
    viewpoint: ['viewpoint_id', 'scene_id', 'world_area_id', 'group_id', 'config_id', 'gadget_id', 'image_name', 'show_only_unlocked', 'disused'],
    npc_instance: ['npc_id', 'instance_id', 'scene_id', 'position', 'rotation', 'group_id', 'room_id', 'suite_ids', 'conditions', 'condition_logic', 'hide_name', 'invisible'],
    ability_map: ['ability_name', 'variant', 'source_path', 'modifier', 'prefab_name', 'activation', 'operation', 'parameters'],
    map_trigger: ['source_kind', 'operation', 'scene_tag_id', 'source_path', 'quest_id', 'is_add', 'dialogue_id', 'parameters', 'state_id', 'gadget_id', 'level_tag_id', 'slots'],
    map_place: ['text_key', 'root_name', 'source_entry', 'layout', 'place_name_id', 'group_id', 'scene_id', 'display_geometry', 'position', 'coordinate_origin', 'native_label'],
};

const map_catalogue_roles = [
    'name', 'developer_name', 'description', 'alternate_name',
    'replacement_name', 'ruby_name', 'alias', 'resource_name',
    'quest_description', 'world_scene', 'image_scene', 'scene',
    'statue', 'parent_area', 'point', 'world_area',
    'hidden_point', 'floor', 'reference_floor', 'group',
    'layer', 'name_change_quest', 'condition_area', 'condition_quest',
    'dungeon', 'entry_point', 'removed_scene_tag', 'added_scene_tag',
    'map_area', 'open_state', 'quest', 'quest_step',
    'target', 'image_object', 'game_object', 'transform',
    'image_asset', 'npc', 'geography', 'layer_group',
    'level_tag', 'ability_control', 'name_rule', 'target_world_area',
    'configuration_name', 'native_image', 'level_tag_context', 'variant_controller',
    'native_boundary', 'limit_region', 'map_icon', 'locked_map_icon',
    'unexplored_map_icon', 'quest_control', 'map_area_control', 'activity_name',
];

const map_catalogue_diagnostics = [
    'outside_fog_all_areas_open_static_preview', 'outside_fog_runtime_animation_and_color_space_unverified', 'missing_building_mark', 'statue_city_unresolved',
    'special_transport_profile_unresolved', 'map_icon_runtime_state_unresolved', 'missing_point_map_icon', 'map_icon_image_unresolved',
    'conflicting_point_map_icon', 'ambiguous_dungeon_entry', 'ambiguous_dungeon_query_id', 'missing_text',
    'missing_manual_text', 'ambiguous_parent_area', 'config_inner_id_differs_from_lookup_key', 'missing_map_area_config',
    'reference_floor_is_not_verified_default', 'native_layout_and_visibility_required', 'condition_parameters_preserved_without_state_guess', 'nonstandard_point_array_not_interpreted',
    'open_state_symbol_unresolved', 'playable_boundary_geometry_not_resolved', 'action_parameters_retained_without_target_guess', 'mutation_is_not_complete_visibility_predicate',
    'missing_relation', 'unresolved_point_subarea', 'resource_identity-only', 'resource_script-unresolved',
    'resource_unsupported-script', 'resource_unsupported-layout', 'resource_unsupported-component-layout', 'resource_missing-file',
    'resource_missing-object', 'resource_missing-origin', 'resource_ambiguous-origin', 'resource_ambiguous-file',
    'resource_ambiguous-object', 'resource_invalid-file-id', 'resource_geometry-unresolved', 'resource_image-transform-unresolved',
    'resource_image-asset-unresolved', 'resource_image-export-origin-mismatch', 'layer_group_scene_unresolved', 'boundary_rendering_and_activation_unverified',
    'unreferenced_boundary_not_current', 'layer_volume_not_playable_boundary', 'layer_region_shape_projection_unresolved', 'layer_region_polygon_projection_unresolved',
    'layer_region_bounds_mismatch', 'viewpoint_instance_position_unresolved', 'instance_presence_requires_runtime_state', 'ability_activation_not_complete_visibility',
    'trigger_activation_not_complete_visibility', 'atlas_root-unresolved', 'atlas_geometry-unresolved', 'atlas_scene-unresolved',
    'atlas_display_projection_unresolved', 'place_text_key_unresolved', 'place_scene_unresolved', 'place_display_projection_unresolved',
    'layer_native_image_unresolved', 'area_variant_controller_unresolved', 'area_variant_default_index_unverified', 'boundary_runtime_activation_unverified',
    'native_boundary_canvas-group-animation-not-reproduced', 'native_boundary_mesh-sprite-uv-mapping-unverified', 'native_boundary_boundary-geometry-or-shader-unresolved',
];

const map_catalogue_enums = {
    SCENE_DUNGEON: 'domain', SCENE_WORLD: 'world', SCENE_ROOM: 'room', SCENE_HOME_WORLD: 'realm',
    SCENE_HOME_ROOM: 'realm_room', SCENE_BEYOND_EDIT: 'miliastra_editor', SCENE_HALL_WORLD: 'hall',
    LEVEL_1: 'primary', LEVEL_2: 'secondary', MistOpen: 'open', MistClose: 'closed',
    MAP_AREA_TYPE_EROSION: 'erosion', MAP_AREA_TYPE_LEVEL_TAG: 'level_tag',
    LIMIT_REGION_TYPE_ACTIVITY: 'activity', LIMIT_REGION_TYPE_BIGWORLD: 'world', LIMIT_REGION_TYPE_HOMEWORLD: 'realm', LIMIT_REGION_TYPE_BEYOND: 'miliastra',
    Close: 'close', Open: 'open', SwitchName: 'rename', MultiSwitchName: 'rename_in_stages',
    Always: 'always', Invisible: 'hidden', Around: 'nearby', Never: 'never', OnUnlocked: 'when_unlocked',
    Quest: 'quest', MapArea: 'area', ErosionArea: 'erosion_area', MultiQuest: 'quests', MAP_FLOOR_NAME_CHANGE_QUEST: 'quest_rename',
    OPEN_STATE_COND_QUEST: 'quest_step', OPEN_STATE_COND_PARENT_QUEST: 'quest', OPEN_STATE_COND_PLAYER_LEVEL: 'adventure_rank',
    OPEN_STATE_OFFERING_LEVEL: 'offering_level', OPEN_STATE_CITY_REPUTATION_LEVEL: 'city_reputation', OPEN_STATE_COND_GCG_LEVEL: 'tcg_level',
    OPEN_STATE_COND_PLAYER_BEYOND_LEVEL: 'miliastra_level', OPEN_STATE_TRIBAL_REPUTATION_FINISH_NUM: 'tribal_reputation_count',
    SCENE_TAG_COND_TYPE_SPECIFIC_ACTIVITY_OPEN: 'activity_open', SCENE_TAG_COND_TYPE_QUEST_GLOBAL_VAR_EQUAL: 'quest_variable_equal',
    SCENE_TAG_COND_TYPE_ACTIVITY_CONTENT_OPEN: 'activity_content_open', SCENE_TAG_COND_TYPE_QUEST_FINISH: 'quest_finished',
    finish: 'finished', fail: 'failed', QUEST_EXEC_CHANGE_MAP_AREA_STATE: 'area_state', QUEST_EXEC_CHANGE_SCENE_LEVEL_TAG: 'level_tag',
    QUEST_EXEC_SET_MAP_LAYER_UNLOCK_STATE: 'layer_unlock', QUEST_EXEC_SHOW_MAP_LAYER_GROUP: 'show_layer_group',
    QUEST_EXEC_SET_LIMIT_REGION_STATE: 'boundary_state', QUEST_EXEC_SET_ABYSS_WAR_LIMIT_REGION_STATE: 'stygian_boundary_state',
    QUEST_EXEC_HIDE_SCENE_POINT: 'hide_point', QUEST_EXEC_UNHIDE_SCENE_POINT: 'show_point', QUEST_EXEC_UNLOCK_POINT: 'unlock_point',
    QUEST_EXEC_LOCK_POINT: 'lock_point', QUEST_EXEC_UNLOCK_AREA: 'unlock_area', QUEST_EXEC_UNLOCK_PLAYER_WORLD_SCENE: 'unlock_scene',
    QUEST_EXEC_SET_OPEN_STATE: 'access_state', QUEST_EXEC_SET_OPEN_STATE_V2: 'access_state_v2', QUEST_EXEC_BATCH_SET_OPEN_STATE: 'access_states',
    QUEST_EXEC_ADD_SCENE_TAG: 'add_scene_tag', QUEST_EXEC_DEL_SCENE_TAG: 'remove_scene_tag', QUEST_EXEC_MODIFY_DUNGEON_EXIT_POINT: 'domain_exit',
    parsed: 'decoded', unparsed: 'unknown', 'image-extracted': 'image_ready', 'image-reference': 'image_reference',
    'static-serialized-state': 'static_state', 'material-parameters-only': 'material_only', 'sprite-and-component-color': 'sprite_color',
} as const;

function convert_map_id(value: string): string {
    const prefixes = { 'open-state-': 'access-rule-', 'quest-event-': 'state-change-', 'limit-region-': 'boundary-', 'point-collection-': 'point-set-' };
    for (const [from, to] of Object.entries(prefixes)) if (value.startsWith(from)) return to + value.slice(from.length);
    if (/^(?:scene|world-area|map-area|layer-group|floor|layer|label|point|level-tag|scene-tag|map-tag|map-icon|map-settings|resource|viewpoint|npc-instance|layer-region|ability-map|boundary-geometry|map-trigger|map-place)-[a-zA-Z0-9_.-]+$/.test(value)) return value;
    throw new Error(`Unmapped map record identity: ${value}`);
}
function map_known(value: unknown, allowed: readonly string[], context: string): string {
    if (typeof value !== 'string' || !allowed.includes(value)) throw new Error(`Unmapped ${context}: ${String(value)}`);
    return value;
}
function map_scalar(value: unknown): void {
    if (typeof value === 'number') map_source_number(value);
    else map_source_string(value);
}
function map_condition(value: unknown, raw = false): void {
    const entry = map_source_object(value, raw ? ['condType', 'param', 'param1', 'param2'] : ['type', 'parameters'], 'map condition');
    const type = entry[raw ? 'condType' : 'type'];
    if (type === undefined) { if (Object.keys(entry).length) throw new Error('Condition without a type'); return; }
    map_source_enum(map_catalogue_enums, type, 'map condition type');
    if (raw) for (const field of ['param', 'param1', 'param2']) { if (entry[field] !== undefined) map_scalar(entry[field]); }
    else if (entry.parameters !== undefined) map_source_list(entry.parameters).forEach(map_scalar);
}
type ConvertedMapRecord = {
    id: string; kind: MapCatalogueKind; name: string; description: string; texts: string[]; related: string[];
    position?: { x: number; y: number; z: number };
};

/** Check source evolution even for omitted metadata; only explicitly constructed fields can leave this boundary. */
function convert_map_record_source(record: MapRecord): ConvertedMapRecord {
    const source = map_source_object(record, ['schema', 'id', 'kind', 'name', 'description', 'texts', 'relations', 'data', 'source', 'diagnostics', 'version'], 'map record');
    if (source.schema !== 1) throw new Error(`Unsupported map source schema: ${source.schema}`);
    const provenance = map_source_object(source.source, ['file', 'id', 'hashes', 'fields'], 'map provenance');
    map_source_string(provenance.id); map_source_string(provenance.file);
    map_source_list(provenance.hashes).forEach(map_source_string); map_source_list(provenance.fields).forEach(map_source_string);
    const kind = map_source_enum(map_catalogue_kinds, source.kind, 'map kind');
    const data = map_source_object(source.data, record.kind === 'resource' && record.data.category === 'outside-fog'
        ? ['category', 'scene_id', 'shader_profile', 'projection', 'preview', 'groups', 'fog', 'sources'] : map_catalogue_fields[record.kind]!, record.kind);
    const result: ConvertedMapRecord = { id: convert_map_id(map_source_string(source.id)), kind,
        name: map_source_string(source.name), description: map_source_string(source.description), texts: [], related: [] };
    const numeric = (...fields: string[]) => { for (const field of fields) if (data[field] !== undefined) map_source_number(data[field]); };
    const boolean = (...fields: string[]) => { for (const field of fields) if (data[field] !== undefined && typeof data[field] !== 'boolean') throw new Error(`Invalid ${field}`); };
    const enumeration = (...fields: string[]) => { for (const field of fields) map_optional_enum(map_catalogue_enums, data[field], field); };
    const position = () => {
        if (data.position === undefined) return;
        const pos = map_source_object(data.position, ['x', 'y', 'z'], 'map position');
        for (const axis of ['x', 'y', 'z']) if (pos[axis] !== undefined) map_source_number(pos[axis]);
        if (['x', 'y', 'z'].every(axis => pos[axis] !== undefined)) result.position = { x: map_source_number(pos.x), y: map_source_number(pos.y), z: map_source_number(pos.z) };
    };
    switch (record.kind) {
        case 'scene': enumeration('scene_type'); boolean('allow_map_mark'); break;
        case 'world_area':
            enumeration('level'); numeric('minimap_scale');
            if (data.polygons !== undefined) map_source_list(data.polygons).forEach((polygon, i) => map_area_polygon(polygon, `${record.id} polygon ${i}`));
            break;
        case 'map_area':
            map_initial_state(record); map_level_state(record); enumeration('state', 'area_type');
            if (data.config !== undefined) {
                const config = map_source_object(data.config, ['key', 'id', 'type', 'prefab', 'sort', 'index', 'map_positions', 'hidden_point_ids', 'use_sub_anchor', 'source'], 'area configuration');
                if (config.source) {
                    const origin = map_source_object(config.source, ['kind', 'asset_path', 'resource_key', 'block', 'offset', 'path_id', 'sha256', 'decoder'], 'client area source');
                    map_known(origin.kind, ['client-map-area'], 'area source');
                }
            }
            break;
        case 'layer_group': map_source_list(data.floor_ids); break;
        case 'floor': numeric('number'); if (data.name_condition) map_condition(data.name_condition); break;
        case 'layer': break;
        case 'label': enumeration('action'); map_condition(data.condition); break;
        case 'point':
            convert_map_point_metadata(data);
            ConvertRaw.get_map_point_text_source(data.name_source); ConvertRaw.get_map_point_text_source(data.description_source);
            ConvertRaw.get_map_point_marker_kind(data.point_class); ConvertRaw.get_map_point_visibility(data.visibility);
            boolean('unlocked', 'forbid_simple_unlock'); numeric('show_level'); position(); break;
        case 'point_collection': numeric('count'); break;
        case 'level_tag':
            boolean('can_fix_time'); numeric('fixed_time');
            for (const entry of map_source_list(data.map_areas)) {
                const area = map_source_object(entry, ['area_id', 'index'], 'tag area');
                map_source_number(area.area_id); if (area.index !== undefined) map_source_number(area.index);
            }
            break;
        case 'scene_tag': boolean('default_valid', 'independent'); map_source_list(data.conditions).forEach(value => map_condition(value, true)); break;
        case 'limit_region': enumeration('region_type'); boolean('hide_paimon'); break;
        case 'open_state': boolean('allow_client_open'); map_source_list(data.conditions).forEach(value => map_condition(value, true)); break;
        case 'quest_event':
            map_state_write(record); map_level_write(record); map_layer_write(record);
            enumeration('phase', 'action'); numeric('quest_id', 'order'); map_source_list(data.parameters).forEach(map_scalar);
            if (data.condition_evidence) map_source_list(data.condition_evidence);
            if (data.state_dependencies) for (const value of map_source_list(data.state_dependencies)) {
                const dependency = map_source_object(value, ['quest_id', 'state', 'comparison', 'source_field'], 'quest state dependency');
                map_source_enum({ equal: 'equal', 'not-equal': 'different' }, dependency.comparison, 'state comparison');
                map_source_number(dependency.quest_id); map_scalar(dependency.state);
            }
            break;
        case 'map_tag': boolean('hide_before_unlock'); break;
        case 'map_icon':
            enumeration('map_visibility', 'radar_visibility');
            map_optional_enum({ normal: 'other_floor', active: 'current_floor' }, data.badge_state, 'layer marker badge');
            boolean('show_on_locked_area', 'show_height'); break;
        case 'map_settings': numeric('minimap_sight_radius', 'minimap_scale', 'map_scale', 'map_scale_min', 'map_scale_max', 'mark_near_threshold'); break;
        case 'resource':
            if (data.category === 'outside-fog') {
                map_known(data.shader_profile, ['open-area-stencil-fog-7.1-v1'], 'outside fog profile');
                map_known(data.preview, ['all-areas-open-time-zero'], 'outside fog preview'); map_source_list(data.groups); break;
            }
            map_known(data.category, ['image', 'object', 'atlas-image', 'base-tile', 'native-boundary'], 'map resource category'); enumeration('status');
            if (data.layout) {
                const layout = map_source_object(data.layout, ['coordinateSpace', 'corners', 'projectionStatus'], 'resource layout');
                map_known(layout.coordinateSpace, ['prefab-ui'], 'map coordinate space'); map_known(layout.projectionStatus, ['not-calibrated'], 'map projection');
            }
            if (data.component_color) {
                const color = map_source_list(data.component_color).map(map_source_number);
                if (color.length !== 4 || color[3]! < 0 || color[3]! > 1) throw new Error('Invalid map image component colour');
            }
            if (data.material) {
                const material = map_source_object(data.material, ['texture', 'textureScale', 'textureOffset', 'color', 'softEdge', 'smoothMaskEnabled', 'renderingStatus', 'shaderStatus', 'softEdgeProfile'], 'map material');
                if (material.softEdge) {
                    const edge = map_source_object(material.softEdge, ['enabled', 'strength'], 'soft edge');
                    if (typeof edge.enabled !== 'boolean') throw new Error('Invalid soft edge switch'); map_source_number(edge.strength);
                }
                if (material.shaderStatus !== undefined) map_known(material.shaderStatus, ['verified-shader-bytes', 'unverified-shader'], 'shader verification state');
            }
            if (data.visibility_status !== undefined) map_known(data.visibility_status, ['unresolved', 'runtime-activation-unresolved'], 'resource visibility state');
            numeric('image_width', 'image_height');
            if (data.display_geometry) {
                const geometry = map_source_object(data.display_geometry, ['space', 'corners', 'profile'], 'display geometry');
                map_known(geometry.space, ['world-xz'], 'display coordinate space');
            }
            if (data.mask) { const mask = data.mask as Record<string, unknown>; map_source_number(mask.image_width); map_source_number(mask.image_height); }
            if (data.rim) map_source_list((data.rim as Record<string, unknown>).triangles);
            break;
        case 'viewpoint': boolean('show_only_unlocked', 'disused'); break;
        case 'npc_instance':
            numeric('npc_id'); boolean('hide_name', 'invisible'); position();
            if (data.conditions) for (const group of map_source_list(data.conditions)) for (const value of map_source_list(group)) {
                const condition = map_source_object(value, ['kind', 'type', 'parameters', 'source_type'], 'NPC condition');
                map_source_enum({
                    QUEST_COND_ACTIVITY_CLIENT_COND: 'activity_client', QUEST_COND_QUEST_GLOBAL_VAR_EQUAL: 'variable_equal', QUEST_COND_STATE_EQUAL: 'state_equal',
                    QUEST_COND_QUEST_GLOBAL_VAR_LESS: 'variable_less', QUEST_COND_IS_WORLD_OWNER: 'world_owner', QUEST_COND_QUEST_NOT_RECEIVE: 'not_received',
                    QUEST_COND_QUEST_STATE_NOT_EQUAL: 'state_different', QUEST_COND_IS_DAYTIME: 'daytime', QUEST_COND_ACTIVITY_OPEN: 'activity_open',
                    QUEST_COND_ACTIVITY_NPC_BORN: 'activity_spawn', QUEST_COND_ACTIVITY_ALCHEMY_SIM_LOCK_STAGE: 'alchemy_stage_locked',
                    QUEST_COND_QUEST_GLOBAL_VAR_GREATER: 'variable_greater', QUEST_COND_QUEST_GLOBAL_VAR_NOT_EQUAL: 'variable_different',
                    unresolved: 'unknown', 'special-scenes': 'scene_list',
                }, condition.type, 'NPC condition type'); map_source_list(condition.parameters).forEach(map_scalar);
            }
            if (data.condition_logic !== undefined) map_known(data.condition_logic, ['unverified'], 'NPC condition logic');
            break;
        case 'layer_region': map_source_list(data.shapes); if (data.footprints) map_source_list(data.footprints); break;
        case 'boundary_geometry': map_source_list(data.polygons); break;
        case 'ability_map': {
            map_source_enum({ 'show-background': 'background', 'activity-marker': 'activity_marker' }, data.operation, 'ability map operation');
            const activation = map_source_object(data.activation, ['kind', 'paths', 'complete'], 'ability activation'); map_source_list(activation.paths); break;
        }
        case 'map_trigger':
            map_source_enum({ interaction: 'interaction', dialogue: 'dialogue', gadget: 'object' }, data.source_kind, 'map trigger source');
            map_source_enum({ 'scene-tag': 'scene_tag', 'open-state': 'access_state', 'gadget-slot': 'object_state' }, data.operation, 'map trigger operation');
            boolean('is_add'); numeric('dialogue_id', 'gadget_id'); if (data.slots) map_source_list(data.slots); break;
        case 'map_place':
            if (data.coordinate_origin !== undefined) map_known(data.coordinate_origin, ['projected-label-rectangle-center', 'projected-label-anchor'], 'place coordinate origin');
            if (data.native_label !== undefined) {
                const native = map_source_object(data.native_label, ['profile', 'component', 'group', 'offset', 'layout_word', 'group_word', 'prefab', 'packed_word', 'trailing_word', 'position'], 'native label');
                map_known(native.profile, ['gi-surface-map-labels-7.1-v1'], 'native label profile');
                map_source_object(native.prefab, ['fileID', 'PathID'], 'native label prefab');
            }
            break;
    }
    for (const value of map_source_list(source.texts)) {
        const entry = map_source_object(value, ['role', 'text', 'hash'], 'map text');
        map_known(entry.role, map_catalogue_roles, 'map text role'); result.texts.push(map_source_string(entry.text));
    }
    for (const value of map_source_list(source.relations)) {
        const entry = map_source_object(value, ['role', 'category', 'id'], 'map relation');
        map_known(entry.role, map_catalogue_roles, 'map relation role');
        const category = map_source_enum({ maps: 'map', quest_step: 'step', tasks: 'task', dungeons: 'domain', npcs: 'npc', geographies: 'geography' }, entry.category, 'map relation category');
        const id = map_source_string(entry.id);
        if (category === 'map') result.related.push(convert_map_id(id)); // Other IDs require their own maintained directory join.
    }
    for (const value of map_source_list(source.diagnostics)) map_known(map_source_string(value).split(':')[0], map_catalogue_diagnostics, 'map diagnostic');
    return result;
}

export const ConvertRaw = {
    get_map_record: convert_map_record_source,
    get_map_id: convert_map_id,
    get_map_point_display: convert_map_point_display,
    get_map_point_metadata: convert_map_point_metadata,
    get_map_point_text_source: (value: unknown) => map_optional_enum({
        point: 'point_config', map_icon: 'icon_config', dungeon_entry: 'domain_entrance', city_statue: 'regional_statue',
    }, value, 'point text source'),
    get_map_point_visibility: (value: unknown) => map_optional_enum({
        Always: 'always', Never: 'never', Invisible: 'hidden', Around: 'nearby', OnUnlocked: 'when_unlocked',
    }, value, 'point visibility'),
    get_map_point_marker_kind: (value: unknown) => map_optional_enum({
        'domain-entry': 'domain', 'domain-exit': 'domain', 'domain-waypoint': 'domain', 'domain-quit': 'domain', 'domain-revive': 'domain',
        transport: 'teleport', statue: 'statue', 'personal-scene-jump': 'point', building: 'place',
        'virtual-transport': 'teleport', 'vehicle-summon': 'point', unresolved: 'point',
    }, value, 'point class'),
    get_outfit_type: (folder: string): OutfitType => mapped_key({
        outfits: 'character', weaponskins: 'weapon', windgliders: 'glider',
    }, folder, 'outfit folder'),
    get_outfit_weapon_type: (key: string): WeaponType => mapped_key({
        WEAPON_SWORD_ONE_HAND: 'sword', WEAPON_CLAYMORE: 'claymore', WEAPON_POLE: 'polearm',
        WEAPON_BOW: 'bow', WEAPON_CATALYST: 'catalyst',
    }, key, 'outfit weapon type'),
    get_furniture_role: (key: string) => mapped_key({
        '': 'entry', NPC: 'character', Paimon: 'character', VirtualFurnitrue: 'virtual', FurnitureSuite: 'suite_placeholder',
        BlockDependent: 'entry', Apartment: 'entry', FarmField: 'entry', TeleportPoint: 'entry', Fishpond: 'entry',
        Fish: 'entry', LavaFish: 'entry', CustomBaseFurnitrue: 'entry', CustomNodeFurnitrue: 'entry', GroupFurnitrue: 'entry',
        CoopPictureFrame: 'entry', ChangeBgmFurniture: 'entry', ServerGadget: 'entry', Fishtank: 'entry', LavaFishpond: 'entry',
    }, key, 'furniture role'),
    get_tutorial_category: (key: string): TutorialCategory => mapped_key({
        CODEX_ELEMENT: 'element', CODEX_ENEMY: 'enemy', CODEX_SYSTEM: 'system', CODEX_ADVENTURE: 'adventure',
        TUTORIAL_ACTIVITY: 'activity', TUTORIAL_OTHER: 'other',
    } as const satisfies Record<string, TutorialCategory>, key, 'tutorial category'),
    get_message_kind: (key: string): MessageKind => mapped_key({
        TEXT: 'text', CONTROL: 'control', OPTION: 'option', IMAGE: 'image', LOCATION: 'location', HESPERIDES_MAP: 'map',
    } as const satisfies Record<string, MessageKind>, key, 'Graeae message kind'),
    get_loading_dungeon_type: (key: string): LoadingDungeonType => mapped_key({
        DUNGEON_CHAR_MASTER: 'character_master', DUNGEON_LEY_LINE_CHALLENGE: 'ley_line_challenge',
        DUNGEON_TPS_MERCENARIES: 'tps_mercenaries', DUNGEON_TPS_SHOOTING_RANGE: 'tps_shooting_range',
    } as const satisfies Record<string, LoadingDungeonType>, key, 'loading dungeon type'),
    get_loading_action: (key: string): LoadingAction => mapped_key({
        SITUATION_TYPE_COMMON_TRANSPORT: 'transport', SITUATION_TYPE_ENTER_QUEST_DUNGEON: 'quest_dungeon',
        SITUATION_TYPE_ENTER_DAILY_DUNGEON: 'daily_dungeon', SITUATION_TYPE_ENTER_TOWER: 'tower',
        SITUATION_TYPE_ENTER_ROOM: 'room', SITUATION_TYPE_LOGIN: 'login', SITUATION_TYPE_LOGOUT: 'logout',
        SITUATION_TYPE_REVIVE: 'revive', SITUATION_TYPE_ENTER_HOMEWORLD: 'homeworld', SITUATION_TYPE_ENTER_ISLAND: 'island',
        SITUATION_TYPE_ENTER_GCG_NORMAL: 'gcg_normal', SITUATION_TYPE_ENTER_GCG_CATPUB: 'gcg_catpub',
        SITUATION_TYPE_ENTER_GCG_PVE: 'gcg_pve', SITUATION_TYPE_ENTER_GCG_AI: 'gcg_ai', SITUATION_TYPE_ENTER_GCG_PVP: 'gcg_pvp',
        SITUATION_TYPE_ENTER_GCG_FESTIVAL: 'gcg_festival', SITUATION_TYPE_ENTER_CERTAIN_DUNGEON: 'certain_dungeon',
        SITUATION_TYPE_ENTER_GCG_ABC: 'gcg_abc', SITUATION_TYPE_ENTER_BYD_HALL: 'miliastra_hall',
        SITUATION_TYPE_ENTER_SPECIFIED_ROOM: 'specified_room',
    } as const satisfies Record<string, LoadingAction>, key, 'loading action'),
    get_loading_terrain: (key: string): LoadingTerrain => mapped_key({
        LOADING_AREA_CITY: 'city', LOADING_AREA_OUTDOOR: 'outdoor',
    } as const satisfies Record<string, LoadingTerrain>, key, 'loading terrain'),

    get_archive_type: <C extends keyof DirectoryTypes>(category: C, type: string): DirectoryTypes[C] => {
        // A checked indexed view preserves the category/result relationship without a cast.
        const types: DirectoryTypeMaps = archive_type_maps;
        if (!Object.hasOwn(types, category)) throw new Error(`Unmapped archive category: ${category}`);
        return mapped_key(types[category]!, type, `${category} type`);
    },

    get_archive_relation_category: (category: string) => mapped_key({
        character: 'character', enemy: 'enemy', loading_situation: 'loading_situation', material: 'material',
        miliastra: 'miliastra', misc: 'misc', npc: 'npc', outfit: 'outfit', region: 'region',
        serenitea: 'serenitea', task: 'task', tcg: 'tcg',
    }, category, 'relation category'),

    get_archive_relation_role: (role: string) => mapped_key({
        achievement: 'achievement', catalog: 'catalog', character: 'character', component: 'component',
        costume: 'costume', dialogue: 'dialogue', dialogue_participant: 'dialogue_participant',
        group: 'group', lore: 'lore', monster: 'monster', next_stage: 'next_stage', npc: 'npc',
        opponent: 'opponent', opponent_card: 'opponent_card', player: 'player', player_card: 'player_card',
        previous_stage: 'previous_stage', quest: 'quest', region: 'region', stage: 'stage', suit: 'suit',
        suite: 'suite', unlock_avatar: 'unlock_avatar', unlock_costume: 'unlock_costume',
        unlock_material: 'unlock_material', unlock_quest: 'unlock_quest',
    }, role, 'relation role'),

    get_archive_section_kind: (kind?: string): string | undefined => {
        if (kind === undefined) return undefined;
        // The suffix is a source record ID, not a new kind. Only this known family is supported.
        if (/^biography:[1-9]\d*$/.test(kind)) return `biography:${kind.slice('biography:'.length)}`;
        return mapped_key({
            classification: 'classification', preferred_characters: 'preferred_characters', source: 'source', unlock: 'unlock',
            story: 'story', body_type: 'body_type', category: 'category', color: 'color', quality: 'quality', slot: 'slot', variant: 'variant',
            Mobile: 'Mobile', PC: 'PC', PS: 'PS', acquisition: 'acquisition', alternate_title: 'alternate_title', subtitle: 'subtitle',
        }, kind, 'section kind');
    },

    get_card_type: (id: string): CardType => {
        const types = {
            GCG_CARD_CHARACTER: 'character', GCG_CARD_MODIFY: 'equipment',
            GCG_CARD_EVENT: 'event', GCG_CARD_ASSIST: 'support',
        } as const satisfies Record<string, CardType>;
        return mapped_key(types, id, 'card type');
    },

    get_card_tag: (id: string) => {
        const tags = {
            GCG_TAG_ALLY: 'ally',
            GCG_TAG_ARKHE_OUSIA: 'arkhe_ousia',
            GCG_TAG_ARKHE_PNEUMA: 'arkhe_pneuma',
            GCG_TAG_ARTIFACT: 'artifact',
            GCG_TAG_CAMP_EREMITE: 'camp_eremite',
            GCG_TAG_CAMP_FATUI: 'camp_fatui',
            GCG_TAG_CAMP_HILICHURL: 'camp_hilichurl',
            GCG_TAG_CAMP_MONSTER: 'camp_monster',
            GCG_TAG_CAMP_SACREAD: 'camp_sacread',
            GCG_TAG_CARD_BLESSING: 'card_blessing',
            GCG_TAG_ELEMENT_ANEMO: 'element_anemo',
            GCG_TAG_ELEMENT_CRYO: 'element_cryo',
            GCG_TAG_ELEMENT_DENDRO: 'element_dendro',
            GCG_TAG_ELEMENT_ELECTRO: 'element_electro',
            GCG_TAG_ELEMENT_GEO: 'element_geo',
            GCG_TAG_ELEMENT_HYDRO: 'element_hydro',
            GCG_TAG_ELEMENT_PYRO: 'element_pyro',
            GCG_TAG_FOOD: 'food',
            GCG_TAG_HEXENZIRKEL: 'hexenzirkel',
            GCG_TAG_ITEM: 'item',
            GCG_TAG_LEGEND: 'legend',
            GCG_TAG_NATION_COSMIC_CALAMITY: 'nation_cosmic_calamity',
            GCG_TAG_NATION_FONTAINE: 'nation_fontaine',
            GCG_TAG_NATION_INAZUMA: 'nation_inazuma',
            GCG_TAG_NATION_LIYUE: 'nation_liyue',
            GCG_TAG_NATION_MONDSTADT: 'nation_mondstadt',
            GCG_TAG_NATION_NATLAN: 'nation_natlan',
            GCG_TAG_NATION_NODKRAI: 'nation_nodkrai',
            GCG_TAG_NATION_SIMULANKA: 'nation_simulanka',
            GCG_TAG_NATION_SUMERU: 'nation_sumeru',
            GCG_TAG_NON_DISCOVERABLE: 'non_discoverable',
            GCG_TAG_NOT_HENSHIN: 'not_henshin',
            GCG_TAG_PLACE: 'place',
            GCG_TAG_RESONANCE: 'resonance',
            GCG_TAG_SLOWLY: 'slowly',
            GCG_TAG_SUB_HURT: 'sub_hurt',
            GCG_TAG_TALENT: 'talent',
            GCG_TAG_VEHICLE: 'vehicle',
            GCG_TAG_WEAPON: 'weapon',
            GCG_TAG_WEAPON_BOW: 'weapon_bow',
            GCG_TAG_WEAPON_CATALYST: 'weapon_catalyst',
            GCG_TAG_WEAPON_CLAYMORE: 'weapon_claymore',
            GCG_TAG_WEAPON_NONE: 'weapon_none',
            GCG_TAG_WEAPON_POLE: 'weapon_pole',
            GCG_TAG_WEAPON_SWORD: 'weapon_sword',
        } as const;
        return mapped_key(tags, id, 'card tag');
    },

    get_archive_image_kind: (kind?: string): string | undefined => {
        if (kind === undefined) return undefined;
        if (kind.startsWith('card_face:')) {
            const match = /^card_face:([^:]+):(\d+)$/.exec(kind);
            if (!match) throw new Error(`Invalid card face key: ${kind}`);
            return `card_face:${mapped_key({
                GCG_CARD_FACE_GOLD: 'gold', GCG_CARD_FACE_PLATINUM: 'platinum',
            }, match[1]!, 'card face')}:${match[2]}`;
        }
        // Same spelling is intentional, not a pass-through rule for future keys.
        return mapped_key({
            'battle_table:tablePrefabName': 'battle_table:tablePrefabName',
            'battle_table:tablePrefabNameMobile': 'battle_table:tablePrefabNameMobile',
            card: 'card',
            'card_back:historyStaticImageHash': 'card_back:historyStaticImageHash',
            'card_back:prefabName': 'card_back:prefabName',
            'card_back:staticImageHash': 'card_back:staticImageHash',
            'card_table:stagePrefabPath': 'card_table:stagePrefabPath',
            'card_table:staticImageHash': 'card_table:staticImageHash',
            'card_view:cardPrefabName': 'card_view:cardPrefabName',
            'card_view:cardPrefabNameSpecialB': 'card_view:cardPrefabNameSpecialB',
            'card_view:cardStaticImageHash': 'card_view:cardStaticImageHash',
            'card_view:goldenSkinSpinePrefabList': 'card_view:goldenSkinSpinePrefabList',
            'card_view:goldenSkinSpinePrefabListSpecialA': 'card_view:goldenSkinSpinePrefabListSpecialA',
            'card_view:historyImageHash': 'card_view:historyImageHash',
            'card_view:historySmallImageHash': 'card_view:historySmallImageHash',
            'card_view:skinEffectJsonConfig': 'card_view:skinEffectJsonConfig',
            'card_view:skinEffectJsonConfigSpecialB': 'card_view:skinEffectJsonConfigSpecialB',
            costume_icon: 'costume_icon',
            'dice_table:tablePrefabName': 'dice_table:tablePrefabName',
            'dice_table:tablePrefabNameMobile': 'dice_table:tablePrefabNameMobile',
            effect: 'effect', hash_icon: 'hash_icon', icon: 'icon', landscape: 'landscape',
            map_icon: 'map_icon', material_icon: 'material_icon', opponent: 'opponent',
            player: 'player', 'player:imageNameHash': 'player:imageNameHash',
            portrait: 'portrait', preview: 'preview', resource: 'resource', resource_icon: 'resource_icon',
            side_portrait: 'side_portrait', stage_loading: 'stage_loading', theme: 'theme',
            Mobile: 'Mobile', PC: 'PC', PS: 'PS', background: 'background', banner: 'banner',
            group_icon: 'group_icon', illustration: 'illustration', loading_background: 'loading_background', monster_icon: 'monster_icon',
        }, kind, 'archive image kind');
    },

    // Keep condition identities consistent in both tokens and dialogue flows.
    convert_dialogue_keys: (value: ArchiveTalk): ArchiveTalk => {
        function convert(value: string, key: string): string {
            if (key === 'subtitle' && value.startsWith('QUEST_COND_')) return mapped_key(condition_keys, value, 'condition');
            if (key === 'id' && value.startsWith('["QUEST_COND_')) {
                const identity: unknown = JSON.parse(value);
                if (!Array.isArray(identity) || typeof identity[0] !== 'string') throw new Error(`Invalid condition identity: ${value}`);
                identity[0] = `condition:${mapped_key(condition_keys, identity[0], 'condition')}`;
                return JSON.stringify(identity);
            }
            return value;
        }
        // Only string-valued id/subtitle fields change; no literal-preserving T -> T promise.
        const result = structuredClone(value);
        function visit(value: unknown): void {
            if (!value || typeof value !== 'object') return;
            for (const [key, child] of Object.entries(value)) {
                if (typeof child === 'string') Reflect.set(value, key, convert(child, key));
                else visit(child);
            }
        }
        visit(result);
        return result;
    },

    get_images_url,
    prefer_image,

    get_failed_images_list: () => {
        return [...images.failures];
    },

    get_images_path: (filepath: string | null, converted_path: string) => {
        return images.fromPath(filepath, converted_path) || '';
    },

    process_inline_images: (text: string, converted_path: string) => {
        let regex = /<image name=([^\/]+)\/>/g;
        return text.replace(regex, (match, p1) => {
            const filename = p1.trim();
            const url = ConvertRaw.get_images_url(filename, converted_path);
            return url ? `<img src="${url}" class="inline_image" />` : '';
        });
    },

    get_element: (element: Character['elementType']): ElementType | undefined => {

        const element_map: Partial<Record<Character['elementType'], ElementType>> = {
            'ELEMENT_ANEMO': 'anemo',
            'ELEMENT_CRYO': 'cryo',
            'ELEMENT_DENDRO': 'dendro',
            'ELEMENT_ELECTRO': 'electro',
            'ELEMENT_GEO': 'geo',
            'ELEMENT_HYDRO': 'hydro',
            'ELEMENT_PYRO': 'pyro',
        }

        return element_map[element];
    },

    get_weapon_type: (weapon: Weapon['weaponType']): WeaponType => {

        const weapon_map = {
            'WEAPON_BOW': 'bow',
            'WEAPON_CATALYST': 'catalyst',
            'WEAPON_CLAYMORE': 'claymore',
            'WEAPON_POLE': 'polearm',
            'WEAPON_SWORD_ONE_HAND': 'sword',
        } as const satisfies Record<Weapon['weaponType'], WeaponType>;

        return weapon_map[weapon];
    },

    is_precent_stat_type: (stat: Character['substatType']) => {
        if ([
            'FIGHT_PROP_ATTACK_PERCENT',
            'FIGHT_PROP_CHARGE_EFFICIENCY',
            'FIGHT_PROP_CRITICAL',
            'FIGHT_PROP_CRITICAL_HURT',
            'FIGHT_PROP_DEFENSE_PERCENT',
            'FIGHT_PROP_ELEC_ADD_HURT',
            // 'FIGHT_PROP_ELEMENT_MASTERY',
            'FIGHT_PROP_FIRE_ADD_HURT',
            'FIGHT_PROP_GRASS_ADD_HURT',
            'FIGHT_PROP_HEAL_ADD',
            'FIGHT_PROP_HP_PERCENT',
            'FIGHT_PROP_ICE_ADD_HURT',
            'FIGHT_PROP_PHYSICAL_ADD_HURT',
            'FIGHT_PROP_ROCK_ADD_HURT',
            'FIGHT_PROP_WATER_ADD_HURT',
            'FIGHT_PROP_WIND_ADD_HURT'
        ].includes(stat)) {
            return true;
        }
        return false;
    },
}
