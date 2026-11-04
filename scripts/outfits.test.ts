import test from 'node:test';
import assert from 'node:assert/strict';
import { convert_outfit_records, outfit_image_requests, type OutfitDirectory } from '../src/outfit';
import type { OutfitSourceRecord } from '../src/utils/data';
import { ConvertRaw } from '../src/utils/convert_raw';
import { named_entries } from '../src/utils/page';

const costume = (): OutfitSourceRecord => ({ folder: 'outfits', data: {
    id: 200301, name: 'Original costume', description: 'Plain description', descriptionRaw: '<color=#FFF>Original description</color>',
    story: 'Original story\nSecond line', isDefault: false, characterId: 10000003, characterName: 'Jean', source: ['Original source'],
    images: { filename_icon: 'UI_Icon', filename_iconCircle: 'UI_Circle', filename_splash: 'UI_Splash', filename_card: 'UI_Card' },
    version: '1.x', url: {},
} });
const glider = (): OutfitSourceRecord => ({ folder: 'windgliders', data: {
    id: 140001, name: 'Original wings', description: 'Plain', descriptionRaw: 'Original wing description', story: 'Wing story',
    rarity: 4, source: [], images: { filename_icon: 'UI_Wing', filename_gacha: 'UI_Wing' }, version: '1.x',
} });
const weapon = (): OutfitSourceRecord => ({ folder: 'weaponskins', data: {
    id: 380001, itemId: 341801, name: 'Star Omen', description: 'Plain', descriptionRaw: 'Original weapon description',
    weaponType: 'WEAPON_CATALYST', rarity: 4, source: ['Original source'], groups: [{id:1,name:'Source group'}],
    images: {filename_icon:'UI_Weapon',filename_gacha:'UI_Weapon_Gacha'},
} });
const directory: OutfitDirectory = { character: { sea_breeze: 200301 }, weapon: {}, glider: { first_flight: 140001 } };
const options = { output: 'unused', character: () => ({id:'jean',name:'Jean'}), image: (name: string) => `/images/${name}.png` };

test('outfits use maintained IDs, original text and explicit published character links', () => {
    const result = convert_outfit_records([costume(), glider()], directory, options);
    assert.deepEqual(result.files.map(file => file.id), ['sea_breeze', 'first_flight']);
    const item = result.files[0]!.data;
    assert.equal(item.description, '<color=#FFF>Original description</color>');
    assert.equal(item.story, 'Original story\nSecond line');
    assert.deepEqual(item.character, {id:'jean',name:'Jean'});
    assert.deepEqual(item.images.map(image => image.kind), ['icon', 'splash', 'card']);
    assert.equal(result.list[0]!.type, 'character');
    assert.equal(result.list[1]!.type, 'glider');
    assert.deepEqual(result.list[0]!.items, ['sea_breeze']);
    assert(!JSON.stringify(result.files).includes('filename_'));
    assert(!Object.hasOwn(item, 'characterId'));
    assert(!Object.hasOwn(item, 'version'));
});

test('missing images and unpublished characters do not create false URLs', () => {
    const result = convert_outfit_records([costume(), glider()], directory,
        {output:'unused',character:()=>null,image:()=>null});
    assert.equal(result.files[0]!.data.icon, null);
    assert.deepEqual(result.files[0]!.data.images, []);
    assert.deepEqual(result.files[0]!.data.character, {id:null,name:'Jean'});
    assert.equal(result.assets.length, 4);
    assert.deepEqual(outfit_image_requests(glider()), [{name:'UI_Wing',kind:'icon'}]);
});

test('default outfits have no placeholder card and source-less stories remain absent', () => {
    const record = costume();
    assert.equal(record.folder, 'outfits');
    if (record.folder !== 'outfits') return;
    record.data.isDefault = true; record.data.story = '';
    const result = convert_outfit_records([record], {...directory,glider:{}}, options);
    assert.deepEqual(result.files[0]!.data.images, [{kind:'icon',url:'/images/UI_Icon.png'}]);
    assert.equal(result.files[0]!.data.story, null);
});

test('weapon appearances expose only translated publication fields', () => {
    const result = convert_outfit_records([weapon()], {character:{},weapon:{star_omen:380001},glider:{}}, options);
    const item = result.files[0]!.data;
    assert.equal(item.type, 'weapon');
    assert.equal(item.weapon_type, 'catalyst');
    assert.equal(item.description, 'Original weapon description');
    assert.equal(item.story, null);
    assert.equal(item.character, null);
    assert.deepEqual(item.images, [{kind:'icon',url:'/images/UI_Weapon.png'}]);
    assert(!JSON.stringify(item).includes('WEAPON_'));
    assert(!Object.hasOwn(item, 'groups'));
    assert(!Object.hasOwn(item, 'itemId'));
});

test('unmapped upstream keys and stale or duplicate directory entries fail closed', () => {
    assert.throws(() => ConvertRaw.get_outfit_type('future_folder'), /Unmapped outfit folder/);
    assert.throws(() => ConvertRaw.get_outfit_weapon_type('WEAPON_NEW'), /Unmapped outfit weapon type/);
    assert.equal(ConvertRaw.get_outfit_weapon_type('WEAPON_CATALYST'), 'catalyst');
    assert.throws(() => convert_outfit_records([costume()], directory, options), /Missing\/duplicate selected outfit/);
    assert.throws(() => convert_outfit_records([costume(),costume()], {...directory,glider:{}}, options), /Duplicate outfit source/);
    assert.throws(() => convert_outfit_records([costume()], {character:{one:200301,two:200301},weapon:{},glider:{}}, options), /Missing\/duplicate selected outfit/);
    assert.throws(() => convert_outfit_records([costume()], {character:{'../escape':200301},weapon:{},glider:{}}, options), /Invalid outfit page ID/);
});

test('manual groups reuse named entries without merging item data or changing IDs', () => {
    const first = weapon(), second = weapon();
    second.data.id = 380002; second.data.name = 'Sublimation'; second.data.descriptionRaw = 'Distinct variant text';
    const records = [first, second], before = JSON.stringify(records);
    const result = convert_outfit_records(records, {character:{}, weapon:{
        star_omen:{star_omen:380001,star_omen_sublimation:380002},
    }, glider:{}}, options);
    assert.deepEqual(result.files.map(file => file.id), ['star_omen','star_omen_sublimation']);
    const [root, child] = result.list;
    assert.equal(root!.show, true);
    assert.deepEqual(root!.items, ['star_omen','star_omen_sublimation']);
    assert.match(root!.description, /Distinct variant text/);
    assert(root!.description.startsWith('Original weapon description'), 'do not repeat the list title in its summary');
    assert.equal(child!.show, false);
    assert.deepEqual(child!.items, ['star_omen_sublimation']);
    assert.deepEqual(child!.related_items, ['star_omen']);
    assert.equal(child!.name, 'Sublimation');
    assert.equal(result.files[0]!.data.description, 'Original weapon description');
    assert.equal(result.files[1]!.data.description, 'Distinct variant text');
    assert.equal(JSON.stringify(records), before);
    assert.deepEqual(named_entries({group:{one:'source-a',two:'source-b'}}), named_entries({group:{one:1,two:2}}));
    const external = convert_outfit_records(records, {character:{},weapon:{group:{one:380001,two:380002}},glider:{}},options);
    assert.deepEqual(external.list.map(page=>[page.id,page.show]), [['group',true],['one',false],['two',false]]);
});

test('manual groups reject empty, stale, repeated or unsafe members', () => {
    const run = (weapon: OutfitDirectory['weapon']) => convert_outfit_records([weapon_record], {character:{},weapon,glider:{}},options);
    const weapon_record = weapon();
    assert.throws(()=>run({empty:{}}), /Empty group/);
    assert.throws(()=>run({group:{missing:123}}), /Missing\/duplicate selected outfit/);
    assert.throws(()=>run({group:{one:380001,two:380001}}), /Missing\/duplicate selected outfit/);
    assert.throws(()=>run({group:{'../escape':380001}}), /Invalid\/duplicate outfit Wiki ID/);
    assert.throws(()=>run({group:{one:380001},one:380001}), /Duplicate page IDs/);
});
