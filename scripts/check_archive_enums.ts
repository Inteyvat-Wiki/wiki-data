import assert from 'node:assert/strict';
import fs from 'node:fs';
import genshindb from 'genshin-db';
import { ConvertRaw } from '../src/utils/convert_raw';
import { ArchiveData, MiscData } from '../src/utils/data';
import { archive_directories, select_directory_records } from '../src/utils/archive_directory';
import { convert_archive_images } from '../src/utils/archive_images';
const source_images = [{ name: 'base', kind: 'card' }, { name: 'gold', kind: 'card_face:GCG_CARD_FACE_GOLD:1' },
    { name: '123456789', kind: 'icon' }, { name: 'prefab', kind: 'card_view:cardPrefabName' }];
const resolved: string[] = [];
const resolve_image = (name: string, kind?: string) => { resolved.push(name); return { name, kind, url: `/images/${name}.png` }; };
assert.deepEqual(convert_archive_images('tcg', 'card', source_images, resolve_image).map(image => image.name), ['base']);
assert.deepEqual(resolved, ['base'], 'unused images must not even enter the copy/manifest pipeline');
assert.equal(convert_archive_images('miliastra', 'suit', [{ name: 'resolved_icon', kind: 'hash_icon' }], resolve_image).length, 1,
    'a resolved named icon is not an opaque resource hash');
assert.equal(source_images.length, 4, 'upstream resources must stay untouched');
assert.throws(() => convert_archive_images('tcg', 'card', [{ name: 'unknown', kind: 'FUTURE' }], resolve_image), /Unmapped/);
assert.equal(ConvertRaw.get_furniture_role('VirtualFurnitrue'), 'virtual');
assert.equal(ConvertRaw.get_furniture_role('FurnitureSuite'), 'suite_placeholder');
assert.throws(() => ConvertRaw.get_furniture_role('FUTURE'), /Unmapped/);
const replacements = [{ name: 'small', kind: 'theme' }, { name: 'large', kind: 'preview', replaces: 'small' }];
resolved.length = 0;
assert.deepEqual(convert_archive_images('miliastra', 'hall', replacements, resolve_image).map(image => image.name), ['large']);
assert.deepEqual(resolved, ['large']);
assert.deepEqual(convert_archive_images('miliastra', 'hall', replacements, (name, kind) => ({ name, kind, url: name === 'large' ? null : '/images/small.png' })).map(image => image.name), ['small', 'large']);
const fixture = { id: '["QUEST_COND_GCG_NPC_TYPE",["1"]]', subtitle: 'QUEST_COND_GCG_NPC_TYPE', text: 'QUEST_COND_GCG_NPC_TYPE' };
assert.deepEqual(ConvertRaw.convert_dialogue_keys(fixture), { id: '["condition:gcg_npc_type",["1"]]', subtitle: 'gcg_npc_type', text: fixture.text });
assert(fixture.id.includes('QUEST_COND_'));
assert.equal(ConvertRaw.get_card_type('GCG_CARD_CHARACTER'), 'character');
assert.equal(ConvertRaw.get_card_tag('GCG_TAG_ELEMENT_CRYO'), 'element_cryo');
assert.equal(ConvertRaw.get_archive_image_kind('card_face:GCG_CARD_FACE_GOLD:123'), 'card_face:gold:123');
assert.throws(() => ConvertRaw.get_card_type('GCG_CARD_UNKNOWN'), /Unmapped/);
assert.throws(() => ConvertRaw.get_card_tag('GCG_TAG_FUTURE'), /Unmapped card tag: GCG_TAG_FUTURE/);
assert.throws(() => ConvertRaw.get_card_tag('toString'), /Unmapped/);
assert.throws(() => ConvertRaw.get_archive_image_kind('card_face:GCG_CARD_FACE_FUTURE:123'), /Unmapped card face/);
assert.throws(() => ConvertRaw.get_archive_image_kind('future_image'), /Unmapped archive image kind/);
assert.throws(() => ConvertRaw.convert_dialogue_keys({ subtitle: 'QUEST_COND_FUTURE' }), /Unmapped condition/);
assert.throws(() => ConvertRaw.convert_dialogue_keys({ id: '["QUEST_COND_FUTURE",[]]' }), /Unmapped condition/);
assert.throws(() => ConvertRaw.get_archive_type('tcg', 'future_type'), /Unmapped tcg type/);
assert.throws(() => ConvertRaw.get_archive_type('toString', 'card'), /Unmapped archive category/);
assert.throws(() => ConvertRaw.get_archive_relation_category('future_category'), /Unmapped relation category/);
assert.throws(() => ConvertRaw.get_archive_relation_role('future_role'), /Unmapped relation role/);
assert.throws(() => ConvertRaw.get_archive_section_kind('future:123'), /Unmapped section kind/);
assert.equal(ConvertRaw.get_archive_section_kind('biography:123'), 'biography:123');
for (const lang of ['zh_hans', 'en'] as const) for (const category of ['serenitea', 'tcg', 'miliastra', 'misc'] as const) {
    const records = category === 'misc' ? MiscData.get_records(lang) : ArchiveData.get_records(category, lang);
    const before = JSON.stringify(records);
    for (const { record } of select_directory_records<(typeof records)[number]>(records, archive_directories[category])) {
        assert.equal(ConvertRaw.get_archive_type(category, record.type), record.type);
        for (const relation of record.relations) {
            assert.equal(ConvertRaw.get_archive_relation_category(relation.category), relation.category);
            assert.equal(ConvertRaw.get_archive_relation_role(relation.role), relation.role);
        }
        for (const section of record.sections) assert.equal(ConvertRaw.get_archive_section_kind(section.kind), section.kind);
        for (const image of record.images) ConvertRaw.get_archive_image_kind(image.kind);
    }
    assert.equal(JSON.stringify(records), before);
}
for (const lang of ['zh_hans', 'en']) {
    const language = lang === 'en' ? genshindb.Language.English : genshindb.Language.ChineseSimplified;
    const pages = JSON.parse(fs.readFileSync(`data/${lang}/tcg/pages.json`, 'utf8'));
    for (const page of pages.filter((p: any) => p.type === 'card')) {
        const raw = genshindb.tcg(page.source_id, { resultLanguage: language, queryLanguages: [language], matchIds: true, matchNames: false, matchAltNames: false })!;
        const item = JSON.parse(fs.readFileSync(`data/${lang}/tcg/items/${page.id}.json`, 'utf8'));
        assert.equal(item.card_type.id, ConvertRaw.get_card_type(raw.card_type!.id));
        assert.deepEqual(item.tags, raw.tags!.map(tag => ({ ...tag, id: ConvertRaw.get_card_tag(tag.id) })));
        assert.deepEqual(item.card_type, page.card_type);
        assert.deepEqual(item.tags, page.tags);
        assert(raw.card_type!.id.startsWith('GCG_CARD_'), 'query cache must stay unchanged');
        assert(item.images.every((image: any) => !image.kind?.includes('GCG_CARD_FACE_')));
        assert(item.images.every((image: any) => image.kind === 'card'));
    }
}
console.log('Bilingual archive/misc type, relation, section, card and image mappings; unknown-key rejection and source immutability passed.');
