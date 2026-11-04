const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const localRequire = createRequire(path.join(root, 'package.json'));

// Load the real converter bodies, but fail on any unlisted dependency. No source
// catalogues, image scans, provider initialization or data export are permitted.
function load(relative, dependencies = {}) {
    const filename = path.join(root, relative);
    const source = fs.readFileSync(filename, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: {
        target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
    } }).outputText;
    const module = { exports: {} };
    const requireDependency = id => {
        if (Object.hasOwn(dependencies, id)) return dependencies[id];
        if (id === 'node:path' || id.startsWith('@inteyvat-wiki/wiki-contracts/')) return localRequire(id);
        throw new Error(`Unexpected dependency (no data access allowed): ${id}`);
    };
    new Function('require', 'module', 'exports', '__dirname', code)(requireDependency, module, module.exports, path.dirname(filename));
    return module.exports;
}

const writes = [];
const page = load('src/utils/page.ts', { 'node:fs': {
    mkdirSync() {}, writeFileSync(file, data) { writes.push([file, data]); }, readdirSync() { return []; },
} });
const { ConvertRaw, mapped_key } = load('src/utils/convert_raw.ts', { './images': {
    images: { fromName: () => null, fromPath: () => null, failures: new Set() }, prefer_image() {},
}, './map_areas': load('src/utils/map_areas.ts'), './map_state_replay': load('src/utils/map_state_replay.ts') });
const archiveImages = load('src/utils/archive_images.ts', { './convert_raw': { ConvertRaw } });
let records = [];
const directories = {
    archive_directories: { tcg: {}, serenitea: {}, miliastra: {}, misc: {} },
    select_directory_records: values => values.map(record => ({ id: 'fixture_' + record.id.replaceAll('-', '_'), source_id: record.id, record })),
    directory_id() {}, directory_common: () => ({}),
};
const grouping = { apply_page_groups: result => result, hall_page_groups: () => [], achievement_page_groups: () => [] };
const references = { PageReferences: class { resolve() { return null; } has() { return false; } } };
const archive = load('src/utils/archive.ts', {
    '~/utils/page': page,
    '~/utils/dialogue': { get_source_dialog: value => value, get_talk_dialogs: () => ({ dialogs: {} }) },
    '~/utils/task_condition': { get_task_conditions: () => [] },
    '~/utils/archive_directory': directories,
    '~/utils/convert_raw': { ConvertRaw }, '~/utils/images': { image_basename: name => name },
    '~/utils/data': { ArchiveData: { get_records: () => records } },
    '~/utils/page_reference': references, '~/utils/page_groups': grouping, '~/utils/archive_images': archiveImages,
});
const misc = load('src/misc.ts', {
    '~/utils/data': { MiscData: { get_records: () => records } }, '~/utils/page': page,
    '~/utils/archive': archive, '~/utils/page_reference': references, '~/utils/convert_raw': { ConvertRaw },
    '~/utils/page_groups': grouping, '~/utils/archive_directory': directories, '~/utils/archive_images': archiveImages,
});

test('compile-only negative cases and precise return types (no emitted files)', () => {
    const config = ts.readConfigFile(path.join(root, 'tsconfig.check.json'), ts.sys.readFile);
    assert.equal(config.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    assert.equal(parsed.options.allowJs, true, 'Catalogue imports must retain their JS types');
    assert.equal(parsed.options.checkJs, true, 'Maintained JS catalogue contents must be checked');
    const program = ts.createProgram([path.join(__dirname, 'generator_boundaries.types.ts'), path.join(root, 'src/data/data.d.ts')], {
        ...parsed.options, strict: true, noEmit: true, incremental: false,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: name => name, getCurrentDirectory: () => root, getNewLine: () => '\n',
    }));
});

test('menu uses the last catalogue entry and reports empty lists before querying data', () => {
    const lists = { characters: ['first', 'last'], weapons: ['weapon'], artifacts: ['artifact'] };
    const calls = [];
    const getter = (name, lang) => { calls.push([name, lang]); return { icon: `${name}.png` }; };
    const { get_menu } = load('src/menu.ts', {
        '~/data/characters': lists.characters, '~/data/weapons': lists.weapons, '~/data/artifacts': lists.artifacts,
        '~/character': { get_character: getter }, '~/weapon': { get_weapon: getter }, '~/artifact': { get_artifact: getter },
    });
    assert.deepEqual(get_menu(), {
        character: { icon: 'last.png' }, weapon: { icon: 'weapon.png' }, artifact: { icon: 'artifact.png' },
    });
    assert.deepEqual(calls, [['last', 'zh_hans'], ['weapon', 'zh_hans'], ['artifact', 'zh_hans']]);
    for (const [key, category] of [['characters', 'character'], ['weapons', 'weapon'], ['artifacts', 'artifact']]) {
        const original = lists[key].splice(0);
        calls.length = 0;
        assert.throws(() => get_menu(), new RegExp(`Empty menu catalogue: ${category}`));
        assert(calls.every(([name]) => name !== undefined));
        lists[key].push(...original);
    }
});

test('create_page matches the previous spread/default order and copies entry arrays', () => {
    const entry = { id: 'group', show: true, items: ['other', 'demo'], related_items: ['third'] };
    const fixtures = [
        { id: 'demo', name: 'Demo' },
        { id: 'demo', name: 'Demo', icon: undefined, star: undefined },
        { id: 'demo', name: 'Demo', icon: '/icon', star: 5, show: false, items: ['old'], related_items: [], type: 'character' },
        { id: 'demo', name: 'Demo', show: undefined, icon: null, star: null },
    ];
    for (const metadata of fixtures) for (const group of [undefined, entry]) {
        const previous = { show: true, items: [metadata.id], related_items: [], ...metadata,
            icon: metadata.icon ?? null, star: metadata.star ?? null,
            ...(group ? { show: group.show, items: [...group.items], related_items: [...group.related_items] } : {}) };
        const result = page.create_page(metadata, group);
        assert.equal(JSON.stringify(result), JSON.stringify(previous));
        if (group) { assert.notEqual(result.items, group.items); assert.notEqual(result.related_items, group.related_items); }
    }
});

test('explicit mappings keep old spellings and reject unknown or inherited keys', () => {
    const cases = [
        ['get_tutorial_category', 'CODEX_ELEMENT', 'element'], ['get_message_kind', 'HESPERIDES_MAP', 'map'],
        ['get_loading_dungeon_type', 'DUNGEON_CHAR_MASTER', 'character_master'],
        ['get_loading_action', 'SITUATION_TYPE_ENTER_BYD_HALL', 'miliastra_hall'],
        ['get_loading_terrain', 'LOADING_AREA_CITY', 'city'], ['get_card_type', 'GCG_CARD_MODIFY', 'equipment'],
        ['get_card_tag', 'GCG_TAG_WEAPON_POLE', 'weapon_pole'], ['get_furniture_role', '', 'entry'],
    ];
    for (const [method, input, expected] of cases) {
        assert.equal(ConvertRaw[method](input), expected);
        for (const invalid of ['FUTURE_UNKNOWN', '__proto__', 'toString']) assert.throws(() => ConvertRaw[method](invalid), /Unmapped/);
    }
    assert.equal(mapped_key({ A: 'a' }, 'A', 'fixture'), 'a');
    assert.throws(() => mapped_key(Object.create({ inherited: 'bad' }), 'inherited', 'fixture'), /Unmapped/);
    assert.equal(ConvertRaw.get_element('ELEMENT_NONE'), undefined);
    assert.equal(ConvertRaw.get_weapon_type('WEAPON_POLE'), 'polearm');
    assert.equal(ConvertRaw.get_archive_image_kind('card_face:GCG_CARD_FACE_GOLD:003'), 'card_face:gold:003');
    assert.equal(ConvertRaw.get_archive_section_kind('biography:17'), 'biography:17');
    assert.equal(ConvertRaw.get_archive_image_kind(undefined), undefined);
});

test('archive type mapping is category-bound at runtime', () => {
    for (const [category, type] of [['tcg', 'card'], ['serenitea', 'furniture'], ['miliastra', 'hall'], ['misc', 'tutorial']]) {
        assert.equal(ConvertRaw.get_archive_type(category, type), type);
    }
    assert.throws(() => ConvertRaw.get_archive_type('tcg', 'furniture'), /Unmapped tcg type/);
    assert.throws(() => ConvertRaw.get_archive_type('unknown', 'card'), /Unmapped archive category/);
});

function baseRecord(type) {
    return { id: `${type}-1`, type, name: 'Fixture', order: 1, show: true, description: 'Description',
        sections: [], images: [], relations: [], source: { table: 'Fixture', id: '1', hashes: ['hash'] } };
}
test('misc loading branches preserve JSON, order, omission, and source immutability', () => {
    const source = { ...baseRecord('loading_tip'), images: [{ name: 'loading', kind: 'loading_background' }], loading_situations: [
        { id: 'transport', action: 'SITUATION_TYPE_COMMON_TRANSPORT', image: { name: 'loading', kind: 'loading_background' }, areas: [{ id: 'a', name: 'Area' }], terrain: 'LOADING_AREA_OUTDOOR', scene_ids: ['ignored'] },
        { id: 'dungeon', action: 'SITUATION_TYPE_ENTER_CERTAIN_DUNGEON', areas: [], dungeon_type: 'DUNGEON_TPS_SHOOTING_RANGE', dungeons: [{ id: 'd', name: 'Dungeon' }] },
        { id: 'room', action: 'SITUATION_TYPE_ENTER_SPECIFIED_ROOM', areas: [], scene_ids: [] },
        { id: 'room-absent', action: 'SITUATION_TYPE_ENTER_SPECIFIED_ROOM', areas: [] },
        { id: 'login', action: 'SITUATION_TYPE_LOGIN', areas: [], terrain: 'IGNORED', dungeon_type: 'IGNORED' },
    ] };
    const before = JSON.stringify(source);
    const result = misc.convert_misc_records([source], 'en', {});
    const expected = [
        { id: 'transport', action: 'transport', image: { name: 'loading', url: null, kind: 'loading_background' }, areas: [{ id: 'a', name: 'Area' }], terrain: 'outdoor' },
        { id: 'dungeon', action: 'certain_dungeon', dungeon_type: 'tps_shooting_range', dungeons: [{ id: 'd', name: 'Dungeon' }] },
        { id: 'room', action: 'specified_room', scene_ids: [] }, { id: 'room-absent', action: 'specified_room' },
        { id: 'login', action: 'login' },
    ];
    assert.equal(JSON.stringify(result.files[0].data.loading_situations), JSON.stringify(expected));
    assert.equal(JSON.stringify(source), before);
    source.loading_situations[0].terrain = 'UNKNOWN';
    assert.throws(() => misc.convert_misc_records([source], 'en', {}), /Unmapped loading terrain/);
});

test('misc tutorial/message enums and resolved images retain the existing JSON shape', () => {
    const source = { ...baseRecord('tutorial'), tutorial_category: 'CODEX_SYSTEM', images: [{ name: 'picture', kind: 'illustration' }],
        message_thread: { initial: ['one'], nodes: [{ id: 'one', kind: 'IMAGE', text: 'Text', next: [], image: { name: 'picture', kind: 'illustration' } }] } };
    const result = misc.convert_misc_records([source], 'en', {});
    assert.equal(result.files[0].data.tutorial_category, 'system');
    assert.equal(result.list[0].tutorial_category, 'system');
    assert.equal(JSON.stringify(result.files[0].data.message_thread), JSON.stringify({ initial: ['one'], nodes: [
        { id: 'one', kind: 'image', text: 'Text', next: [], image: { name: 'picture', url: null, kind: 'illustration' } },
    ] }));
    source.message_thread.nodes[0].image.name = 'missing';
    assert.throws(() => misc.convert_misc_records([source], 'en', {}), /Missing Graeae image reference/);
});

function narrativeTalk() {
    return { source_id: 1, title: 'Talk', priority: 0, begin_way: null, next_talks: [], trigger_ids: [],
        trigger_points: [], objects: [], dialogs: { '1': { role: 'npc', content: 'Hi', next_dialogs: [] } }, conditions: [] };
}
test('archive documents/pages keep converted card metadata and do not mutate source records', () => {
    records = [{ ...baseRecord('card'), card_type: { id: 'GCG_CARD_CHARACTER', name: 'Character' },
        tags: [{ id: 'GCG_TAG_ELEMENT_PYRO', name: 'Pyro', order: 0, hidden: false }], entry_talks: [1], talks: { '1': narrativeTalk() } }];
    const before = JSON.stringify(records);
    const result = archive.get_archive_export('tcg', 'en');
    const expected = { name: 'Fixture', type: 'card', description: 'Description', sections: [],
        card_type: { id: 'character', name: 'Character' }, tags: [{ id: 'element_pyro', name: 'Pyro', order: 0, hidden: false }],
        entry_talks: [1], relations: [], images: [], talks: { '1': narrativeTalk() }, source: records[0].source };
    assert.equal(JSON.stringify(result.files[0].data), JSON.stringify(expected));
    assert.deepEqual(result.list[0].card_type, expected.card_type);
    assert.deepEqual(result.list[0].tags, expected.tags);
    assert.equal(JSON.stringify(records), before);
    records[0].card_type.id = 'GCG_CARD_UNKNOWN';
    assert.throws(() => archive.get_archive_export('tcg', 'en'), /Unmapped card type/);
});

test('archive narrative and source-dialogue paths cannot assert invalid conditions into the contract', () => {
    const talk = narrativeTalk();
    assert.equal(JSON.stringify(archive.convert_archive_talk(talk, 'en')), JSON.stringify(talk));
    assert.throws(() => archive.convert_archive_talk({ ...talk, conditions: [{ type: 'boolean', value: 'bad' }] }, 'en'), /Invalid narrative archive talk/);
    assert.throws(() => archive.convert_archive_talk({ ...talk, dialogs: undefined }, 'en'), /Invalid narrative archive talk/);
    const { conditions, dialogs, ...base } = talk;
    const result = archive.convert_archive_talk({ ...base, source_dialogue: {
        dialogs: [], perform_cfg: '', menu_option: false, conditions: { logic: 'LOGIC_AND', conditions: [] }, labels: [],
    } }, 'en');
    assert.deepEqual(result, { ...base, dialogs: {}, conditions: [] });
});

test('dialogue key rewriting updates nested tokens without mutating input or unrelated strings', () => {
    const token = { id: '["QUEST_COND_ACTIVITY_OPEN",1]', subtitle: 'QUEST_COND_ACTIVITY_OPEN', title: 'Title', type: 'boolean', value: true };
    const talk = { ...narrativeTalk(), conditions: [token], initial_dialogs: [{ dialog: 1, conditions: [token] }] };
    const result = ConvertRaw.convert_dialogue_keys(talk);
    const expectedToken = { ...token, id: '["condition:activity_open",1]', subtitle: 'activity_open' };
    assert.deepEqual(result, { ...talk, conditions: [expectedToken], initial_dialogs: [{ dialog: 1, conditions: [expectedToken] }] });
    assert.equal(talk.conditions[0].subtitle, 'QUEST_COND_ACTIVITY_OPEN');
    assert.throws(() => ConvertRaw.convert_dialogue_keys({ ...talk, conditions: [{ ...token, subtitle: 'QUEST_COND_UNKNOWN' }] }), /Unmapped condition/);
});

test('low-level category writer serializes unchanged JSON and checks identity without disk writes', () => {
    writes.length = 0;
    const pages = [page.create_page({ id: 'fixture', name: 'Fixture' })];
    page.export_category(path.join(root, 'unused-test-output', 'en', 'misc'), pages, [{ id: 'fixture', data: { name: 'Fixture' } }]);
    assert.equal(writes.length, 3);
    assert.equal(writes[0][1], JSON.stringify({ name: 'Fixture' }, null, 4));
    assert.equal(writes[1][1], JSON.stringify(pages, null, 4));
    assert.throws(() => page.export_category('unused', pages, [{ id: 'fixture', data: 42 }]), /Expected one data object/);
    assert.throws(() => page.export_category('unused', pages, []), /Missing data/);
});
