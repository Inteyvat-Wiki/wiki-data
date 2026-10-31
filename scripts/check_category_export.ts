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
for (const category of fs.readdirSync('data/zh_hans')) {
    const pages = `data/zh_hans/${category}/pages.json`;
    if (!fs.existsSync(pages)) continue;
    const target = path.join(root, 'zh_hans', category, 'pages.json');
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(pages, target);
}
for (const [category, gen] of Object.entries({ serenitea: gen_serenitea, tcg: gen_tcg, miliastra: gen_miliastra, misc: gen_misc })) {
    gen('zh_hans', path.join(root, 'zh_hans', category)); // No global output setup or CLI post-processing.
    const common = directory_common(category as Parameters<typeof directory_common>[0]);
    for (const [name, expected] of Object.entries(common)) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'common', category, name + '.json'), 'utf8')), expected);
    const assets = JSON.parse(fs.readFileSync(path.join(root, 'common', category, 'assets.json'), 'utf8'));
    assert(assets.length > 0 && assets.every((asset: any) => asset.category === category));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'zh_hans', category, 'pages.json'), 'utf8')),
        JSON.parse(fs.readFileSync(`data/zh_hans/${category}/pages.json`, 'utf8')));
    console.log(`${category}: direct gen exports pages, objects, IDs, source/legacy mappings and assets in the selected output.`);
}
console.log(`Validation output retained at ${root}`);
