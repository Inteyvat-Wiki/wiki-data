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
    for (const page of pages) {
        assert(ids.has(page.id));
        const npc: Npc = read(`items/${page.id}`);
        assert(!('steps' in npc));
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
    const greeting = Object.values(timmie.talks).find(talk => talk.source_id === 6156701)!;
    assert.deepEqual(greeting.next_talks.map(key => timmie.talks[key]!.source_id),
        [6156706, 6156707, 7070601, 6156705, 6156702, 6156703, 6156704]);
    const wheat = Object.values(timmie.talks).find(talk => talk.source_id === 7070601)!;
    assert.equal(wheat.source, 'BinOutput/Talk/Quest/7070601.json');
    const sara: Npc = read('items/sara');
    const takeout = Object.values(sara.talks).find(talk => talk.source_id === 41701)!;
    assert.equal(takeout.dialogs[takeout.initial_dialogs![0]!.dialog]!.role, 'select');
    const charles: Npc = read('items/charles');
    const shop = Object.values(charles.talks).find(talk => talk.source_id === 6146501)!;
    assert(Object.values(shop.dialogs).some(dialog => dialog.actions?.some(action => action.type === 'shop')));
    console.log(`${lang}: ${pages.length} NPCs; graph references, menu order, quest body and shop passed`);
}
const by_id = genshindb.npcs('1567', { matchIds: true })!;
assert.equal(by_id.id, 1567);
assert.equal(genshindb.npcs('NPC 1567', { matchAliases: true })!.id, by_id.id);
assert.equal(genshindb.npcs('Timmie')!.id, by_id.id);
assert.equal(genshindb.npcs('NPC 2078', { matchAliases: true })!.id, 2078);
console.log('NPC name, alias, ID and duplicate-name queries passed');
