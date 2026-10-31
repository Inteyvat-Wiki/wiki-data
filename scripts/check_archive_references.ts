import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PageReferences, source_page_ids } from '../src/utils/page_reference';
import { ArchiveData } from '../src/utils/data';

const output = path.resolve('tmp/page-reference-regression');
fs.mkdirSync(path.join(output, 'en/npc'), { recursive: true });
fs.writeFileSync(path.join(output, 'en/npc/pages.json'), JSON.stringify([
    { id: 'npc_9310', name: 'Same name' }, { id: 'npc_9501', name: 'Same name' },
]));
const refs = new PageReferences(output);
assert.deepEqual(source_page_ids('npc').get(9501), ['npc_9501']);
assert.equal(refs.resolve('npc', 9501, 'en')!.id, 'npc_9501', 'same-name records must not shadow the exact source ID');
assert.equal(refs.resolve('npc', 9501, 'zh_hans'), null, 'publication is language-specific');
assert.equal(refs.resolve('npc', 9502, 'en'), null, 'never substitute another same-name NPC');
assert.equal(new PageReferences(path.join(output, 'empty')).resolve('npc', 9501, 'en'), null, 'publication is output-specific');
assert.equal(refs.resolve('unknown', 9501, 'en'), null);

for (const lang of ['zh_hans', 'en'] as const) {
    const realm_ids = JSON.parse(fs.readFileSync('data/common/serenitea/source_ids.json', 'utf8'));
    for (const record of ArchiveData.get_records('serenitea', lang).filter(record => record.type === 'realm')) {
        const id = realm_ids[record.id];
        if (!id) continue;
        const item = JSON.parse(fs.readFileSync(`data/${lang}/serenitea/items/${id}.json`, 'utf8'));
        assert(!item.relations.some((relation: any) => relation.role === 'component'), 'realm composition must stay upstream');
    }
    const published = new PageReferences(path.resolve('data'));
    const ids = JSON.parse(fs.readFileSync('data/common/tcg/source_ids.json', 'utf8'));
    let count = 0;
    let stage_cards = 0;
    for (const record of ArchiveData.get_records('tcg', lang)) {
        if (!ids[record.id]) continue;
        if (record.type === 'stage') {
            const item = JSON.parse(fs.readFileSync(`data/${lang}/tcg/items/${ids[record.id]}.json`, 'utf8'));
            stage_cards += record.relations.filter(relation => ['player_card', 'opponent_card'].includes(relation.role)).length;
            assert(!item.relations.some((relation: any) => ['player_card', 'opponent_card'].includes(relation.role)), 'stage card associations must stay upstream');
        }
        const linked = record.relations.filter(relation => relation.category === 'npc' && relation.source_id! > 0);
        if (!linked.length) continue;
        const item = JSON.parse(fs.readFileSync(`data/${lang}/tcg/items/${ids[record.id]}.json`, 'utf8'));
        for (const relation of linked) {
            const target = item.relations.find((value: any) => value.category === 'npc' && value.role === relation.role);
            const expected = published.resolve('npc', relation.source_id!, lang);
            if (!expected) { assert(!target); continue; }
            assert(target, `${record.id}: missing NPC relation`);
            const npc = JSON.parse(fs.readFileSync(`data/${lang}/npc/items/${target.id}.json`, 'utf8'));
            assert.equal(npc.npc_id, relation.source_id, `${record.id}: wrong NPC context`);
            count++;
        }
    }
    assert.equal(count, 202);
    assert(stage_cards > 0, 'genshin-db still retains the original deck associations');
    console.log(`${lang}: all ${count} published TCG NPC relations match exact source IDs (including the 100 formerly mismatched records).`);
}
