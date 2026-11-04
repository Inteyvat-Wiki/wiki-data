import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { export_category, create_page } from '../src/utils/page';
import { directory_common } from '../src/utils/archive_directory';
import { gen_serenitea } from '../src/serenitea';
import { gen_tcg } from '../src/tcg';
import { gen_miliastra } from '../src/miliastra';
import { gen_misc } from '../src/misc';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-category-export-'));
const directory = path.join(root, 'en', 'fixture');
const page = create_page({ id: 'one', name: 'One' });
export_category(directory, [page], [{ id: 'one', data: { name: 'One' } }], { assets: [], source_ids: { 'raw-1': 'one' } });
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'common/fixture/ids.json'), 'utf8')), ['one']);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'common/fixture/source_ids.json'), 'utf8')), { 'raw-1': 'one' });
for (const name of ['../escape', 'ids', 'bad/name']) assert.throws(() => export_category(directory, [page],
    [{ id: 'one', data: {} }], { [name]: {} }), /Invalid common export name/);

// Publish the same cross-category context as the formal dataset, only in a temp directory.
for (const lang of ['zh_hans', 'en']) for (const category of fs.readdirSync(`data/${lang}`)) {
    const pages = `data/${lang}/${category}/pages.json`;
    if (!fs.existsSync(pages)) continue;
    const target = path.join(root, lang, category, 'pages.json');
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(pages, target);
}
for (const lang of ['zh_hans', 'en'] as const) for (const [category, gen] of Object.entries({ serenitea: gen_serenitea, tcg: gen_tcg, miliastra: gen_miliastra, misc: gen_misc })) {
    gen(lang, path.join(root, lang, category)); // No global output setup or CLI post-processing.
    const common = directory_common(category as Parameters<typeof directory_common>[0]);
    for (const [name, expected] of Object.entries(common)) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'common', category, name + '.json'), 'utf8')), expected);
    const assets = JSON.parse(fs.readFileSync(path.join(root, 'common', category, 'assets.json'), 'utf8'));
    assert(assets.length > 0 && assets.every((asset: any) => asset.category === category));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, lang, category, 'pages.json'), 'utf8')),
        JSON.parse(fs.readFileSync(`data/${lang}/${category}/pages.json`, 'utf8')));
    const actual = path.join(root, lang, category, 'items');
    const expected = path.join('data', lang, category, 'items');
    const files = fs.readdirSync(expected).filter(name => name.endsWith('.json')).sort();
    assert.deepEqual(fs.readdirSync(actual).sort(), files, `${lang}/${category}: exported document set`);
    for (const file of files) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(actual, file), 'utf8')),
        JSON.parse(fs.readFileSync(path.join(expected, file), 'utf8')), `${lang}/${category}/${file}`);
    console.log(`${lang}/${category}: ${files.length} documents and pages unchanged; IDs, mappings and assets verified in isolated output.`);
}
console.log(`Validation output retained at ${root}`);
