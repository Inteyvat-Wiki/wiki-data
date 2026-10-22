import assert from 'node:assert/strict';
import fs from 'node:fs';
import genshindb from 'genshin-db';
import type { Npc, NpcPages } from '../src/types/npc';

for (const lang of ['zh_hans', 'en']) {
    const read = (file: string) => JSON.parse(fs.readFileSync(`data/${lang}/npc/${file}.json`, 'utf8'));
    const pages: NpcPages = read('pages');
    const ids = new Set(JSON.parse(fs.readFileSync('data/common/npc/ids.json', 'utf8')));
    assert.equal(pages.length, ids.size);
    assert(pages.length > 1800);
    let positioned = 0;
    for (const page of pages) {
        assert(ids.has(page.id));
        const npc: Npc = read(`items/${page.id}`);
        assert(!('steps' in npc));
        assert(Array.isArray(npc.birth_points));
        if (npc.birth_points.some(point => point.position)) positioned++;
        for (const point of npc.birth_points) {
            assert(Number.isInteger(point.scene_id));
            assert(Number.isInteger(point.id));
            assert(point.source.startsWith('BinOutput/Scene/SceneNpcBorn'));
            if (point.position !== null) {
                assert.equal(point.position.length, 3);
                assert(point.position.every(Number.isFinite));
            }
        }
        if (lang === 'en') {
            const chinese: Npc = JSON.parse(fs.readFileSync(`data/zh_hans/npc/items/${page.id}.json`, 'utf8'));
            assert.deepEqual(npc.birth_points, chinese.birth_points);
        }
        for (const key of npc.entry_talks) assert(npc.talks[key]);
        for (const talk of Object.values(npc.talks)) {
            for (const key of talk.next_talks) assert(npc.talks[key]);
            for (const next of talk.initial_dialogs || []) assert(talk.dialogs[next.dialog]);
            for (const dialog of Object.values(talk.dialogs)) {
                for (const next of dialog.next_dialogs) assert(talk.dialogs[next.dialog]);
            }
        }
    }
    const timmie: Npc = read('items/timmie');
    assert.equal(timmie.title, null);
    assert.equal(timmie.birth_points.length, 1);
    assert.equal(timmie.birth_points[0]!.scene_id, 3);
    assert.deepEqual(timmie.birth_points[0]!.position, [2184.87890625, 211.62879943847656, -1016.6090087890625]);
    const greeting = Object.values(timmie.talks).find(talk => talk.source_id === 6156701)!;
    assert.deepEqual(greeting.next_talks.map(key => timmie.talks[key]!.source_id),
        [6156706, 6156707, 7070601, 6156705, 6156702, 6156703, 6156704]);
    const wheat = Object.values(timmie.talks).find(talk => talk.source_id === 7070601)!;
    assert.equal(wheat.source, 'BinOutput/Talk/Quest/7070601.json');
    const sara: Npc = read('items/sara');
    assert.equal(sara.title, lang === 'zh_hans' ? '「猎鹿人」侍应生' : 'Waitress, Good Hunter');
    const takeout = Object.values(sara.talks).find(talk => talk.source_id === 41701)!;
    assert.equal(takeout.dialogs[takeout.initial_dialogs![0]!.dialog]!.role, 'select');
    const charles: Npc = read('items/charles');
    assert.equal(charles.birth_points[0]!.scene_id, 1009);
    assert.equal(charles.birth_points[0]!.room_id, 1);
    const multiple: Npc = read('items/npc_10260');
    assert(multiple.birth_points.length > 1);
    assert(multiple.birth_points.every(point => point.group_id === 133103907));
    assert.deepEqual(multiple.birth_points.flatMap(point => point.suite_ids || []), [2, 3, 4, 5, 6]);
    const platform: Npc = read('items/npc_2514');
    assert.equal(platform.birth_points[0]!.position, null);
    assert.deepEqual(platform.birth_points[0]!.platform, { group_id: 133101350, config_id: 350001 });
    assert.deepEqual(read('items/npc_1574').birth_points, []);
    assert(read('items/npc_1517').birth_points.some((point: Npc['birth_points'][number]) => point.raw_conditions?.length));
    assert.equal(charles.title, lang === 'zh_hans' ? '「天使的馈赠」酒保' : "Bartender, Angel's Share");
    const shop = Object.values(charles.talks).find(talk => talk.source_id === 6146501)!;
    assert(Object.values(shop.dialogs).some(dialog => dialog.actions?.some(action => action.type === 'shop')));
    console.log(`${lang}: ${pages.length} NPCs, ${positioned} with coordinates; birth points, graph references, menu order, quest body and shop passed`);
}
const by_id = genshindb.npcs('1567', { matchIds: true })!;
assert.equal(by_id.id, 1567);
assert.equal(genshindb.npcs('NPC 1567', { matchAliases: true })!.id, by_id.id);
assert.equal(genshindb.npcs('Timmie')!.id, by_id.id);
assert.equal(genshindb.npcs('NPC 2078', { matchAliases: true })!.id, 2078);
console.log('NPC name, alias, ID and duplicate-name queries passed');
