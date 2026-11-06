// Real-data deployment sample; never synthesizes missing rows or presents a subset as a full release.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import db, { initialize_genshin, genshin_source_info } from '../../src/utils/genshin';
import { get_output_root } from '../../src/utils/output';
import { convert_outfit_records } from '../../src/outfit';
import { export_category } from '../../src/utils/page';
import { write_image_requests } from '../../src/utils/images';
import type { OutfitSourceRecord } from '../../src/utils/data';
import type { OutfitDirectory } from '../../src/data/data';
import directory from '../../src/data/outfits.js';

const { validateLock, readJSON, writeJSON } = require('./sandbox-common.cjs');
async function main() {
const lock = validateLock(readJSON(process.argv[2]));
assert.equal(lock.job.mode, 'smoke');
assert(process.env.INTEYVAT_SANDBOX_RUN, 'Run only as a sandbox deployment sample');
const chosen = new Set<number>(lock.job.ids);
const entries = Object.entries(directory.glider).filter(([, source]) => typeof source === 'number' && chosen.has(source));
assert.equal(entries.length, chosen.size, 'Sample IDs must be in the maintained glider export catalogue');
const selected: OutfitDirectory = {character: {}, weapon: {}, glider: Object.fromEntries(entries)};
await initialize_genshin({folders: ['windgliders']});
const output = get_output_root();
assert(!fs.existsSync(output), 'Sample requires a new output directory');
const languages = [['zh_hans', db.Language.ChineseSimplified], ['en', db.Language.English]] as const;
for (const [language, resultLanguage] of languages) {
    const records: OutfitSourceRecord[] = lock.job.ids.map((id: number) => {
        const data = db.windgliders(String(id), {matchIds: true, matchNames: false, matchAltNames: false, resultLanguage});
        assert(data && !Array.isArray(data) && typeof data !== 'string' && data.name, `Missing real windglider ${id}/${language}`);
        return {folder: 'windgliders', data};
    });
    const converted = convert_outfit_records(records, selected, {output, character: () => null});
    assert.equal(converted.files.length, chosen.size);
    if (lock.job.requireImages) assert(converted.files.every(file => file.data.images.length > 0), 'Each sample must include at least one real extracted image');
    export_category(path.join(output, language, 'outfit'), converted.list, converted.files, {assets: converted.assets});
}
write_image_requests();
writeJSON(process.argv[3], {schema: 1, kind: 'real-windglider-sample', completeDataset: false, uploadAllowed: false,
    versions: lock.job.versions, ids: entries.map(([id, source]) => ({id, source})), languages: languages.map(([language]) => language),
    source: genshin_source_info()});
console.log(`Exported ${chosen.size} real windglider(s) in two languages. This is not a complete production dataset.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
