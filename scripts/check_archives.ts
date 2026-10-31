import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { get_serenitea_export } from '../src/serenitea';
import { get_tcg_export } from '../src/tcg';
import { get_miliastra_export } from '../src/miliastra';
import { set_archive_output } from '../src/utils/archive';
import type { ArchiveExport } from '../src/types/archive';

const output = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-archives-'));
set_archive_output(output);
const generators = { serenitea: get_serenitea_export, tcg: get_tcg_export, miliastra: get_miliastra_export };
const allowed = {
    serenitea: new Set(['realm', 'furniture', 'suite', 'companion']),
    tcg: new Set(['card', 'card_back', 'card_table', 'player', 'stage']),
    miliastra: new Set(['costume', 'suit', 'catalog', 'hall']),
};
const previous = new Map<string, string[]>();
for (const lang of ['zh_hans', 'en'] as const) {
    const results: Record<string, ArchiveExport> = Object.fromEntries(Object.entries(generators).map(([name, get]) => [name, get(lang)]));
    for (const [category, result] of Object.entries(results)) {
        const ids = result.files.map(file => file.id);
        const available = new Set(ids);
        assert.equal(available.size, ids.length, `${category}: duplicate IDs`);
        if (previous.has(category)) assert.deepEqual(ids.slice().sort(), previous.get(category), `${category}: language ID parity`);
        previous.set(category, ids.slice().sort());
        assert.equal(result.list.length, ids.length);
        for (const page of result.list) {
            assert(available.has(page.id));
            assert(page.items.every(id => available.has(id)));
            assert(page.related_items.every(id => available.has(id)));
        }
        let dialogue_count = 0;
        const counts: Record<string, number> = {};
        for (const { id, data } of result.files) {
            assert(/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(id));
            assert(allowed[category as keyof typeof allowed].has(data.type), `${category}/${id}: excluded type ${data.type}`);
            counts[data.type] = (counts[data.type] || 0) + 1;
            assert(data.source.table && data.source.id);
            assert(data.source.hashes.every(hash => typeof hash === 'string'));
            for (const image of data.images) if (image.url) {
                assert(image.url.startsWith('/images/'));
                assert(fs.existsSync(path.join(output, image.url.slice(1))), `${category}/${id}: missing output image`);
            }
            for (const relation of data.relations) if (results[relation.category]) {
                assert(results[relation.category]!.files.some(file => file.id === relation.id), `${category}/${id}: dangling relation ${relation.id}`);
            }
            for (const entry of data.entry_talks) assert(data.talks[entry], `${id}: invalid talk entry`);
            for (const talk of Object.values(data.talks)) {
                for (const next of talk.next_talks) assert(data.talks[next], `${id}: dangling next talk`);
                for (const initial of talk.initial_dialogs || []) assert(talk.dialogs[initial.dialog]);
                for (const dialog of Object.values(talk.dialogs)) {
                    dialogue_count++;
                    for (const next of dialog.next_dialogs) assert(talk.dialogs[next.dialog], `${id}: dangling dialog`);
                }
            }
            assert(!('layout' in data), 'unused furnishing layouts stay upstream');
        }
        console.log(JSON.stringify({ lang, category, entries: ids.length, counts, dialogue_count }));
    }
}
console.log(`Archive checks passed; generated test assets: ${output}`);
