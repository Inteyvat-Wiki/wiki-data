import test from 'node:test';
import assert from 'node:assert/strict';
import { ConvertRaw } from '../src/utils/convert_raw';
import type { MapRecord } from '@inteyvat-wiki/genshin-db';
import { convert_map_catalogue, convert_map_record } from '../src/utils/map_catalogue';
import { map_dungeon_pages } from '../src/utils/map_dungeon_links';

function record(overrides: Partial<MapRecord> = {}): MapRecord {
    return { schema: 1, id: 'floor-1', kind: 'floor', name: 'Original', description: '', texts: [], relations: [],
        data: { floor_id: 1, group_id: 2, number: -1, alternate_name: 'Conditional', layer_ids: [3],
            name_condition: { type: 'MAP_FLOOR_NAME_CHANGE_QUEST', parameters: [7321964] } },
        source: { file: 'upstream-only', id: '1', hashes: [], fields: ['OBFUSCATED'] }, diagnostics: [], ...overrides };
}
test('source evolution stops at the explicit export boundary', () => {
    assert.throws(() => convert_map_record(record({ data: { ...record().data, unexpected: 1 } }), 'en'), /Unmapped/);
    assert.throws(() => convert_map_record({ ...record(), leaked: true } as MapRecord, 'en'), /Unmapped/);
    assert.throws(() => convert_map_record(record({ data: { ...record().data, name_condition: { type: 'NEW_ENUM' } } }), 'en'), /Unmapped/);
    assert.throws(() => convert_map_record(record({ schema: 2 } as unknown as Partial<MapRecord>), 'en'), /schema/);
    assert.throws(() => ConvertRaw.get_map_record(record({ diagnostics: ['new_diagnostic'] })), /Unmapped map diagnostic/);
    assert.throws(() => ConvertRaw.get_map_record(record({ texts: [{ role: 'new_role', text: 'Original' }] })), /Unmapped map text role/);
});

test('catalogue contains original text and target names without source explanations', () => {
    const floor = record({ texts: [{ role: 'alternate_name', text: '<Original alternate>' }],
        relations: [{ category: 'maps', role: 'group', id: 'layer-group-2' }], diagnostics: ['missing_text'] });
    const group = record({ id: 'layer-group-2', kind: 'layer_group', name: 'Original <group>', data: { floor_ids: [1] } });
    const before = structuredClone([floor, group]);
    for (const lang of ['zh_hans', 'en'] as const) {
        const catalogue = convert_map_catalogue([floor, group], lang);
        assert.deepEqual(catalogue.items[0]!.texts, [{ label: '', text: '&lt;Original alternate&gt;' }]);
        assert.deepEqual(catalogue.items[0]!.relations, [{ label: 'Original &lt;group&gt;', target: { category: 'map', id: 'layer-group-2' } }]);
        for (const item of catalogue.items) { assert.deepEqual(item.details, []); assert.deepEqual(item.issues, []); }
        assert(!/MAP_FLOOR_NAME_CHANGE_QUEST|missing_text|alternate_name|Record identifier|资料编号/.test(JSON.stringify(catalogue)));
    }
    const converted = ConvertRaw.get_map_record(floor);
    assert.deepEqual(Object.keys(converted).sort(), ['description','id','kind','name','related','texts']);
    converted.texts.push('mutation');
    assert.deepEqual([floor, group], before);
});

test('surface label anchors are accepted while serialized words and references stay upstream', () => {
    const label = record({ id: 'map-place-surface', kind: 'map_place', name: 'Original <label>', texts: [],
        data: { scene_id: 3, position: { x: 2928, z: -1792 }, coordinate_origin: 'projected-label-anchor',
            native_label: { profile: 'gi-surface-map-labels-7.1-v1', component: 'private-component', group: 0, offset: 56,
                layout_word: 1, group_word: 0, prefab: { fileID: 3, PathID: '-99' }, packed_word: 2147581949, trailing_word: 0, position: [192, 220] } } });
    const output = convert_map_record(label, 'en');
    assert.equal(output.label, 'Original &lt;label&gt;');
    assert(!/private-component|packed_word|2147581949|PathID|native_label/.test(JSON.stringify(output)));
    const changed = structuredClone(label);
    (changed.data.native_label as Record<string, unknown>).new_control = true;
    assert.throws(() => convert_map_record(changed, 'en'), /Unmapped native label/);
    const unknown = structuredClone(label);
    (unknown.data.native_label as Record<string, unknown>).profile = 'new-version';
    assert.throws(() => convert_map_record(unknown, 'en'), /Unmapped native label profile/);
});

test('outside fog evidence stays upstream without forwarding native shader fields or explanations', () => {
    const fog = record({ id: 'resource-outside-fog-3', kind: 'resource', data: {
        category: 'outside-fog', scene_id: 3, shader_profile: 'open-area-stencil-fog-7.1-v1', preview: 'all-areas-open-time-zero',
        groups: [{ area_id: 1 }], fog: { parameters: { _Stencil: 129 } }, sources: { file: 'private-evidence' }, projection: {},
    } });
    const result = convert_map_record(fog, 'en');
    assert.deepEqual(result.details, []); assert.deepEqual(result.issues, []);
    assert(!JSON.stringify(result).includes('_Stencil'));
    assert(!JSON.stringify(result).includes('private-evidence'));
    assert.throws(() => convert_map_record({ ...fog, data: { ...fog.data, unexpected: true } }, 'en'), /Unmapped/);
});

test('omitted point metadata is still validated without exporting auxiliary descriptions', () => {
    const point = record({ id: 'point-3-48', kind: 'point', data: {
        name_source: 'city_statue', icon_source: 'category-preview', dungeon_entry_type: 'Daily',
        dungeon_entry_category: 'DUNGEN_ENTRY_TYPE_RELIQUARY',
        entry_access: { default_open: true, combination: 'LOGIC_OR', conditions: [{ type: 'DUNGEON_ENTRY_CONDITION_QUEST', parameter_1: 35802 }] },
        presence: { classification: 'activity-associated', lifetime: 'unresolved', activities: [{ id: 1, name: '<Event & name>', dungeon_ids: [100], configured_duration: 14 }] },
    } });
    const output = convert_map_record(point, 'en');
    assert.deepEqual(output, convert_map_record({ ...point, data: { name_source: 'city_statue' } }, 'en'));
    assert(!JSON.stringify(output).includes('DUNGEON_ENTRY_CONDITION_QUEST'));
    assert(!JSON.stringify(output).includes('configured_duration'));
    const unexpected = structuredClone(point);
    (unexpected.data.presence as Record<string, unknown>).automatic = true;
    assert.throws(() => convert_map_record(unexpected, 'en'), /Unmapped point presence field/);
    (unexpected.data.presence as Record<string, unknown>) = { classification: 'permanent', lifetime: 'unresolved', activities: [] };
    assert.throws(() => convert_map_record(unexpected, 'en'), /Unmapped point presence classification/);
    for (const field of ['dungeon_entry_category', 'dungeon_entry_type', 'icon_source'])
        assert.throws(() => convert_map_record({ ...point, data: { ...point.data, [field]: 'future-value' } }, 'en'), /Unmapped point/);
});

test('ConvertRaw constructs point metadata with mapped keys and rejects nested source drift', () => {
    const source = {
        dungeon_entry_category: 'DUNGEN_ENTRY_TYPE_WEAPON_PROMOTE', dungeon_entry_type: 'Daily', icon_source: 'category-preview',
        map_display: { status: 'conditional', reason: 'point-on-unlocked' },
        entry_access: { default_open: false, combination: 'LOGIC_AND', conditions: [
            { type: 'DUNGEON_ENTRY_CONDITION_LEVEL', parameter_1: 10, parameter_2: 0 },
            { type: 'DUNGEON_ENTRY_CONDITION_QUEST', parameter_1: 35802 },
        ] },
        presence: { classification: 'activity-associated', lifetime: 'unresolved', activities: [
            { id: 1, name: 'Original title', dungeon_ids: [100], configured_duration: 14 },
        ] },
    };
    const before = structuredClone(source);
    const result = ConvertRaw.get_map_point_metadata(source);
    assert.deepEqual(result, {
        display: { exclude: false }, entranceCategory: 'weapon_ascension', entranceType: 'daily', iconOrigin: 'category_reference',
        entranceAccess: { operator: 'all', openByDefault: false, requirements: [
            { kind: 'level', first: 10, second: 0 }, { kind: 'quest', first: 35802, second: undefined },
        ] },
        availability: { kind: 'activity_linked', duration: 'unknown', relatedActivities: [
            { id: 1, title: 'Original title', domainIds: [100], configuredDuration: 14 },
        ] },
    });
    assert(!/DUNGEON_|DUNGEN_|LOGIC_|dungeon_entry_|entry_access|icon_source|map_display|parameter_|dungeon_ids|configured_duration/.test(JSON.stringify(result)));
    assert.deepEqual(source, before);
    assert.notEqual(result.availability!.relatedActivities[0]!.domainIds, source.presence.activities[0]!.dungeon_ids);
    assert.equal(ConvertRaw.get_map_point_metadata({}).display, undefined);
    const access = ConvertRaw.get_map_point_metadata({ entry_access: { conditions: [] } }).entranceAccess!;
    assert.equal(access.openByDefault, undefined); assert.equal(access.operator, undefined);
    for (const patch of [
        { entry_access: { ...source.entry_access, combination: 'LOGIC_FUTURE' } },
        { entry_access: { ...source.entry_access, conditions: [{ type: 'DUNGEON_ENTRY_CONDITION_FUTURE' }] } },
        { entry_access: { ...source.entry_access, conditions: [{ type: 'DUNGEON_ENTRY_CONDITION_LEVEL', extra: 1 }] } },
        { presence: { ...source.presence, activities: [{ ...source.presence.activities[0], extra: true }] } },
        { presence: { ...source.presence, lifetime: 'permanent' } },
    ]) assert.throws(() => ConvertRaw.get_map_point_metadata({ ...source, ...patch }), /Unmapped/);
    for (const method of [ConvertRaw.get_map_point_text_source, ConvertRaw.get_map_point_visibility, ConvertRaw.get_map_point_marker_kind]) {
        assert.equal(method(undefined), undefined);
        for (const key of ['FUTURE_VALUE', '__proto__', 'toString', null]) assert.throws(() => method(key), /Unmapped/);
    }
});
test('original text is escaped and conditional names do not replace the original name', () => {
    const raw = '<img src=x onerror="alert(1)">&{NICKNAME}\n原文';
    const output = convert_map_record(record({ name: raw, texts: [{ role: 'alternate_name', text: '<i>Conditional</i>' }] }), 'en');
    assert.equal(output.label, '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;{NICKNAME}\n原文');
    assert.equal(output.texts[0]?.text, '&lt;i&gt;Conditional&lt;/i&gt;');
    assert(!JSON.stringify(output).includes('OBFUSCATED'));
    assert(!JSON.stringify(output).includes('MAP_FLOOR_NAME_CHANGE_QUEST'));
    assert(!Object.hasOwn(output, 'source'));
});
test('missing booleans stay unspecified and incomplete coordinates are not zero-filled', () => {
    const output = convert_map_record(record({ id: 'point-3-1', kind: 'point', data: { scene_id: 3, point_id: 1, position: { x: 1, z: 2 } } }), 'en');
    assert.equal(output.position, undefined);
    assert.deepEqual(output.details, []);
    assert.deepEqual(output.issues, []);
    const explicit = convert_map_record(record({ id: 'point-3-1', kind: 'point', data: { unlocked: false } }), 'en');
    assert.deepEqual(explicit.details, []);
    assert.throws(() => convert_map_record(record({ id: 'point-3-1', kind: 'point', data: { unlocked: 'false' } }), 'en'), /Invalid/);
});
test('unresolved relation IDs stay upstream and cannot become guessed links or explanatory text', () => {
    const output = convert_map_catalogue([record({ relations: [{ category: 'tasks', role: 'quest', id: '75020' },
        { category: 'maps', role: 'group', id: 'layer-group-999' }] })], 'en');
    assert.deepEqual(output.items[0]?.relations, []);
    assert.deepEqual(output.items[0]?.details, []);
    assert(!JSON.stringify(output).includes('75020'));
    assert(!JSON.stringify(output).includes('layer-group-999'));
    assert.throws(() => convert_map_catalogue([record(), record()], 'en'), /contract/);
});
test('resource properties are explicitly converted without leaking Unity fields', () => {
    const output = convert_map_record(record({ id: 'resource-image-abc', kind: 'resource', data: {
        category: 'image', status: 'material-parameters-only', source_entry: { PathID: '-8737632003105306629' },
        component_color: [1, 1, 1, 0.409], visibility_status: 'unresolved',
        layout: { coordinateSpace: 'prefab-ui', projectionStatus: 'not-calibrated', corners: [] },
        material: { softEdge: { enabled: true, strength: 3.9984996 }, shaderStatus: 'verified-shader-bytes' },
    } }), 'en');
    assert.deepEqual(output.details, []);
    assert.throws(() => convert_map_record(record({ id: 'resource-image-abc', kind: 'resource', data: {
        category: 'image', component_color: [1, 1, 1, 1.1],
    } }), 'en'), /Invalid map image component colour/);
    assert(!JSON.stringify(output).includes('PathID'));
    assert(!JSON.stringify(output).includes('component_color'));
    assert.equal(output.position, undefined);
});

test('place metadata is explicitly mapped, escaped, and linked to its icon definition', () => {
    const raw = record({ id: 'point-3-201', kind: 'point', name: 'Alchemy & <source>', description: 'Original <description>',
        data: { building_type: 'Alchemy', map_icon_id: 'MarkAlchemy', icon: 'UI_MarkPoint_Combine',
            name_source: 'map_icon', description_source: 'dungeon_entry' },
        relations: [{ role: 'map_icon', category: 'maps', id: 'map-icon-MarkAlchemy' }] });
    const output = convert_map_record(raw, 'en', '/images/map/icons/example.png');
    assert.equal(output.label, 'Alchemy &amp; &lt;source&gt;');
    assert.equal(output.description, 'Original &lt;description&gt;');
    assert.equal(output.icon, '/images/map/icons/example.png');
    assert.equal(output.relations[0]?.target.id, 'map-icon-MarkAlchemy');
    assert.deepEqual(output.details, []);
    assert.deepEqual(output.issues, []);
    assert(!JSON.stringify(output).includes('UI_MarkPoint_Combine'));
    assert(!JSON.stringify(output).includes('building_type'));
    assert.throws(() => convert_map_record({ ...raw, data: { ...raw.data, name_source: 'future_source' } }, 'en'), /Unmapped/);
});

test('domain inline links use maintained IDs and preserve the original name', () => {
    const point = record({ id: 'point-3-48', kind: 'point', name: 'Midsummer Courtyard', description: '<Original & description>',
        data: { dungeon_entry_id: 1, scene_id: 3, point_id: 48 }, relations: [] });
    const pages = new Map([[1, { id: 'midsummer_courtyard', sceneId: 3, pointId: 48 }]]);
    const item = convert_map_catalogue([point], 'en', pages).items[0]!;
    assert.equal(item.label, point.name);
    assert.equal(item.description, '&lt;Original &amp; description&gt;');
    assert.deepEqual(item.relations, [{ label: '[[iw:geography/midsummer_courtyard?style=text]]', target: { category: 'geography', id: 'midsummer_courtyard' } }]);
    // The same point ID in an activity scene must not acquire the main-world link.
    assert.deepEqual(convert_map_catalogue([{ ...point, data: { dungeon_entry_id: 1046, scene_id: 9, point_id: 48 } }], 'en', pages).items[0]!.relations, []);
    // A legacy ID or matching name alone cannot bypass the complete identity.
    assert.deepEqual(convert_map_catalogue([{ ...point, data: {}, relations: [{ role: 'dungeon', category: 'dungeons', id: '48' }] }], 'en', pages).items[0]!.relations, []);
    assert.deepEqual(convert_map_catalogue([point], 'en').items[0]!.relations, []);
    const differentName = convert_map_catalogue([{ ...point, name: 'Original <entrance title>' }], 'en', pages).items[0]!;
    assert.equal(differentName.label, 'Original &lt;entrance title&gt;');
    assert.deepEqual(differentName.relations, item.relations);
    assert.throws(() => convert_map_catalogue([{ ...point, data: { ...point.data, scene_id: 9 } }], 'en', pages), /Inconsistent map dungeon identity/);
    assert.throws(() => convert_map_catalogue([{ ...point, data: { ...point.data, point_id: 50 } }], 'en', pages), /Inconsistent map dungeon identity/);
    assert.throws(() => convert_map_catalogue([{ ...point, data: { ...point.data, dungeon_entry_id: '1' } }], 'en', pages), /Invalid|invalid/);
    assert.equal(convert_map_record({ ...point, name: '' }, 'en').label, '');
});

test('dungeon page directory allows cross-scene point IDs and rejects stale or conflicting identities', () => {
    const source = { id: 50, entryId: 2, sceneId: 3, description: '', tabs: [], images: { filename_image: '' } };
    const main = { id: 'cecilia_garden', record: source };
    const event = { id: 'event_entrance', record: { ...source, entryId: 1047, sceneId: 9 } };
    const pages = map_dungeon_pages([main, event]);
    assert.equal(pages.get(2)?.id, 'cecilia_garden');
    assert.equal(pages.get(1047)?.id, 'event_entrance');
    assert.throws(() => map_dungeon_pages([{ ...main, record: { ...source, entryId: undefined } }]), /updated dungeon snapshot/);
    assert.throws(() => map_dungeon_pages([{ ...main, record: { ...source, sceneId: undefined } }]), /updated dungeon snapshot/);
    assert.throws(() => map_dungeon_pages([main, { ...event, record: { ...event.record, entryId: 2 } }]), /Duplicate/);
    assert.throws(() => map_dungeon_pages([main, { ...event, record: { ...event.record, sceneId: 3 } }]), /Duplicate/);
});
