import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { isOutfitItem, isOutfitPage, OUTFIT_TYPES } from '@inteyvat-wiki/wiki-contracts/outfit';
import { readPngHeader } from '@inteyvat-wiki/resource-tools';

const root = path.resolve(process.argv.find((value, index) => index > 1 && !value.startsWith('--')) || './data');
const ids: string[] = JSON.parse(fs.readFileSync(path.join(root, 'common/outfit/ids.json'), 'utf8'));
assert(ids.length && ids.length === new Set(ids).size);
const summaries = [], missing_icons = [], images = new Set<string>();
let page_ids: string[] | undefined;
for (const language of ['zh_hans', 'en']) {
    const pages: unknown = JSON.parse(fs.readFileSync(path.join(root, language, 'outfit/pages.json'), 'utf8'));
    assert(Array.isArray(pages) && pages.every(isOutfitPage));
    const current_page_ids = pages.map(page => page.id);
    assert.equal(new Set(current_page_ids).size, pages.length);
    if (page_ids) assert.deepEqual(current_page_ids, page_ids);
    page_ids = current_page_ids;
    assert.deepEqual(pages.filter(page => page.show).flatMap(page => page.items).sort(), [...ids].sort(), 'Each item belongs to one visible page');
    const characters = new Set<string>(JSON.parse(fs.readFileSync(path.join(root, language, 'character/pages.json'), 'utf8')).map((page: { id: string }) => page.id));
    let stories = 0;
    const documents = new Map();
    for (const id of ids) {
        const data: unknown = JSON.parse(fs.readFileSync(path.join(root, language, 'outfit/items', id + '.json'), 'utf8'));
        assert(isOutfitItem(data), `${language}/${id}: invalid document`);
        assert(data.name.trim(), `${language}/${id}: missing name`);
        documents.set(id, data);
        if (data.character?.id) assert(characters.has(data.character.id), `${id}: broken character reference`);
        if (data.story) stories++;
        if (!data.icon) missing_icons.push(`${language}/${id}`);
        for (const url of [...(data.icon ? [data.icon] : []), ...data.images.map(image => image.url)]) {
            assert(/^\/images\/outfit\/[a-z0-9_-]+\/[a-z0-9_-]+\.png$/.test(url), url);
            images.add(url); readPngHeader(path.join(root, url.slice(1)));
        }
    }
    for (const page of pages) {
        assert(page.items.length > 0);
        const data = documents.get(page.items[0]); assert(data);
        assert.equal(data.name, page.name); assert.equal(data.icon, page.icon);
        for (const id of [...page.items, ...page.related_items]) assert.equal(documents.get(id)?.type, page.type);
        if (!page.show) {
            assert.deepEqual(page.items, [page.id]);
            const parent = pages.find(value => value.show && value.items.includes(page.id)); assert(parent);
            assert.deepEqual(page.related_items, parent.items.filter(id => id !== page.id));
        }
    }
    summaries.push({language,items:ids.length,pages:pages.filter(page=>page.show).length,
        groups:pages.filter(page=>page.show && page.items.length>1).length,stories,
        types:Object.fromEntries(OUTFIT_TYPES.map(type => [type,pages.filter(page => page.show && page.type === type).length]))});
}
console.log(JSON.stringify({root,summaries,images:images.size,missing_icons},null,2));
if (process.argv.includes('--require-icons')) assert.equal(missing_icons.length,0,'Some selected outfits have no image');
