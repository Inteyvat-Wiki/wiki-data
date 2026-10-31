import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import genshindb, { type MiscRecord } from 'genshin-db';
import { convert_misc_records, get_misc_export, misc_asset_manifest, set_misc_output } from '../src/misc';
import { MISC_TYPES } from '../src/types/misc';
import { ConvertRaw } from '../src/utils/convert_raw';
import { directory_id } from '../src/utils/archive_directory';

const output = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-misc-check-'));
set_misc_output(output);
const read = fs.readFileSync;
fs.readFileSync = ((file: any, ...args: any[]) => {
    const name = String(file).replaceAll('\\', '/');
    assert(!/(?:\/ExcelBinOutput\/|\/BinOutput\/|\/TextMap\/|\/src\/lua\/|\/\.cache\/lua\/|GenshinData-scripts\/config\.json)/i.test(name),
        `Wiki misc export attempted to read a game input: ${name}`);
    return (read as any)(file, ...args);
}) as typeof fs.readFileSync;
try {
    const image_fixture = (name: string, width: number, height: number, bytes: number) => {
        const header = Buffer.alloc(bytes);
        Buffer.from('89504e470d0a1a0a', 'hex').copy(header);
        header.write('IHDR', 12); header.writeUInt32BE(width, 16); header.writeUInt32BE(height, 20);
        const file = path.join(output, name); fs.writeFileSync(file, header); return file;
    };
    const small = image_fixture('small.png', 52, 64, 4096), large = image_fixture('large.png', 206, 248, 100);
    assert(ConvertRaw.prefer_image(large, small), 'resolution must beat encoded file size');
    assert(!ConvertRaw.prefer_image(small, large));
    const large_bytes = image_fixture('large-bytes.png', 206, 248, 200);
    assert(ConvertRaw.prefer_image(large_bytes, large), 'equal resolution uses encoded size');
    const invalid_image = image_fixture('invalid.png', 0, 248, 100);
    assert.throws(() => ConvertRaw.prefer_image(invalid_image, large), /Invalid image dimensions/);
    fs.mkdirSync(path.join(output, 'zh_hans/task'), { recursive: true });
    fs.writeFileSync(path.join(output, 'zh_hans/task/pages.json'), JSON.stringify([{ id: 'birds_eye_view' }]));
    const sample: MiscRecord = { id: 'tutorial-1', order: 2, show: false, type: 'tutorial', name: 'same name',
        description: '<color=#AABBCC>Original</color>\\n{0}', sections: [{ kind: 'PC', text: 'Full source text' }],
        images: [{ name: 'missing-test-resource', kind: 'PC' }, { name: 'category-icon', kind: 'icon' }], relations: [],
        source: { table: 'Test', id: '1', hashes: ['42'] }, version: '1.x' };
    const second: MiscRecord = { ...structuredClone(sample), id: 'tutorial-2', order: 1, show: true,
        source: { table: 'Test', id: '2', hashes: ['43'] },
        relations: [{ category: 'misc', id: 'tutorial-1', name: 'same name', role: 'previous_stage' },
            { category: 'task', id: '352', source_id: 352, name: 'A different translated name', role: 'unlock_quest' },
            { category: 'character', id: '0', source_id: 0, name: 'not a real character', role: 'unlock_avatar' }] };
    const before = JSON.stringify([sample, second]);
    assert.throws(() => ConvertRaw.get_tutorial_category('CODEX_FUTURE'), /Unmapped/);
    assert.throws(() => ConvertRaw.get_message_kind('FUTURE'), /Unmapped/);
    assert.throws(() => ConvertRaw.get_loading_action('SITUATION_TYPE_FUTURE'), /Unmapped loading action/);
    assert.throws(() => ConvertRaw.get_loading_terrain('LOADING_AREA_FUTURE'), /Unmapped loading terrain/);
    assert.throws(() => ConvertRaw.get_loading_dungeon_type('DUNGEON_FUTURE'), /Unmapped loading dungeon type/);
    const fixture_directory = { tutorial:{second:'tutorial-2', first:'tutorial-1'} };
    const converted = convert_misc_records([sample, second], 'zh_hans', fixture_directory);
    assert.deepEqual(converted.files.map(file => file.id), ['second', 'first']);
    assert.equal(converted.list[0].show, true);
    assert.equal(converted.list[1].show, false);
    assert.equal(converted.files[0].data.relations.length, 2);
    assert.equal(converted.files[0].data.relations[1].id, 'birds_eye_view', 'links must use explicit source IDs, not names');
    assert(converted.files[0].data.diagnostics?.includes('unresolved_wiki_relation:character:0:unlock_avatar'));
    assert.equal(converted.files[1].data.images[0].url, null);
    assert.equal(converted.files[1].data.images.length, 1, 'tutorial category icons must not become detail images');
    assert.equal(converted.files[1].data.images[0].kind, ConvertRaw.get_archive_image_kind('PC'), 'platform illustrations must survive');
    assert.equal(converted.files[1].data.description, sample.description, 'text processing belongs to the server');
    assert.equal(JSON.stringify([sample, second]), before);
    assert.throws(() => convert_misc_records([sample, sample], 'en'), /Duplicate/);
    assert.throws(() => convert_misc_records([{ ...sample, id: '../escape' }], 'en'), /identity/);
    assert.throws(() => convert_misc_records([{ ...sample, relations: [{ category: 'misc', id: 'tutorial-999',
        name: '', role: 'next_stage' }] }], 'en', {tutorial:{first:'tutorial-1'}}), /Dangling/);

    let expected: string[] | undefined;
    for (const [lang, language] of [['zh_hans', genshindb.Language.ChineseSimplified], ['en', genshindb.Language.English]] as const) {
        const records = genshindb.misc('names', { resultLanguage: language, queryLanguages: [language],
            matchCategories: true, verboseCategories: true });
        assert(Array.isArray(records) && records.length > 0);
        const snapshot = JSON.stringify(records);
        const raw_entries = new Map(records.map(record => [directory_id('misc', record.id), record]));
        const result = get_misc_export(lang);
        const ids = result.files.map(file => file.id).sort();
        if (expected) assert.deepEqual(ids, expected, 'bilingual source identity parity');
        expected = ids;
        assert.equal(result.list.length, result.files.length);
        const available = new Set(ids), counts: Record<string, number> = {};
        const groups = result.files.filter(file => file.data.type === 'achievement_group');
        const frames = result.files.filter(file => file.data.type === 'profile_frame');
        assert.equal(frames.length, 12);
        for (const frame of frames) {
            assert(frame.data.images.some(image => image.url), `Missing profile-frame image: ${lang}/${frame.id}`);
            assert(result.list.find(page => page.id === frame.id)?.icon, `Missing profile-frame list icon: ${lang}/${frame.id}`);
        }
        assert.equal(groups.length, 73);
        assert(available.has(directory_id('misc', 'achievement_group-0')!));
        assert(!ids.some(id => id.startsWith('mail_template-')));
        const entries = new Map(result.files.map(file => [file.id, file.data]));
        const membership = new Set<string>();
        for (const group of groups) for (const member of group.data.relations.filter(relation => relation.role === 'achievement')) {
            assert(!membership.has(member.id), `duplicate achievement collection membership: ${member.id}`);
            membership.add(member.id);
            assert(entries.get(member.id)?.relations.some(relation => relation.category === 'misc' && relation.role === 'group' && relation.id === group.id));
        }
        assert.equal(membership.size, 1854);
        for (const { id, data } of result.files) {
            assert(MISC_TYPES.includes(data.type));
            counts[data.type] = (counts[data.type] || 0) + 1;
            assert(data.source.table && data.source.id);
            assert(data.source.hashes.every(hash => typeof hash === 'string'));
            assert(!('talks' in data) && !('layout' in data), 'misc must not require archive dialogue scaffolding');
            assert.deepEqual(Object.keys(data).filter(key => /reward|cost|progress|rarity|rankLevel/i.test(key)), []);
            if (data.type === 'achievement') {
                assert(!/\{param\d+\}/.test(data.description), `Unresolved achievement target: ${lang}/${id}`);
                assert(!data.sections.some(section => section.kind === 'ps5_title'), `Excluded PS5 title: ${lang}/${id}`);
            }
            const raw = raw_entries.get(id)!;
            assert.equal(data.loading_situations?.length, raw.loading_situations?.length);
            for (const [index, situation] of (data.loading_situations || []).entries()) {
                const source = raw.loading_situations![index]!;
                assert.equal(situation.action, ConvertRaw.get_loading_action(source.action));
                assert.equal(situation.image?.name, source.image?.name);
                if (situation.image) assert.deepEqual(situation.image, data.images.find(image => image.name === source.image!.name));
                assert.equal(situation.terrain, source.terrain ? ConvertRaw.get_loading_terrain(source.terrain) : undefined);
                assert.deepEqual(situation.areas, situation.action === 'transport' ? source.areas : undefined);
                assert.deepEqual(situation.scene_ids, situation.action === 'specified_room' ? source.scene_ids : undefined);
                assert.deepEqual(situation.dungeons, situation.action === 'certain_dungeon' ? source.dungeons : undefined);
                assert.equal(situation.dungeon_type, situation.action === 'certain_dungeon' && source.dungeon_type ? ConvertRaw.get_loading_dungeon_type(source.dungeon_type) : undefined);
            }
            if (data.type === 'tutorial') {
                assert(data.images.every(image => image.kind !== 'icon'));
                const raw_images = raw_entries.get(id)!.images.filter(image => image.kind !== 'icon');
                assert.deepEqual(data.images.map(image => [image.name, image.kind]), raw_images.map(image =>
                    [image.name, ConvertRaw.get_archive_image_kind(image.kind)]));
            }
            for (const image of data.images) if (image.url) {
                assert(image.url.startsWith(`/images/misc/${id}/`));
                assert(fs.existsSync(path.join(output, image.url.slice(1))));
            }
            for (const relation of data.relations) {
                assert(!(relation.category === 'miliastra' && relation.role === 'lore'));
                assert(!('source_id' in relation));
                if (relation.category === 'misc') assert(available.has(relation.id));
                else if (relation.category !== 'source') {
                    const file = path.join(output, lang, relation.category, 'pages.json');
                    assert(fs.existsSync(file));
                    assert(JSON.parse(read(file, 'utf8')).some((page: any) => page.id === relation.id));
                }
            }
        }
        for (const type of MISC_TYPES) assert(counts[type] > 0, `missing miscellaneous type ${type}`);
        for (const page of result.list) {
            assert(available.has(page.id));
            assert(page.items.every(id => available.has(id)));
            assert(page.related_items.every(id => available.has(id)));
        }
        assert.equal(JSON.stringify(records), snapshot, 'conversion must not mutate the database cache');
        console.log(JSON.stringify({ lang, count: ids.length, counts, images: misc_asset_manifest().filter(asset => asset.available).length }));
    }
    console.log('Misc shared schema, source IDs, actual assets and relations passed without game input access.');
} finally {
    fs.readFileSync = read;
    assert.equal(path.dirname(output), path.resolve(os.tmpdir()));
    assert(path.basename(output).startsWith('wiki-misc-check-'));
    assert(!fs.lstatSync(output).isSymbolicLink());
    fs.rmSync(output, { recursive: true, force: true });
}
