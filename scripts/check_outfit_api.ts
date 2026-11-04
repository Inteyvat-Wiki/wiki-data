import assert from 'node:assert/strict';
import { isOutfitItem, isOutfitPage } from '@inteyvat-wiki/wiki-contracts/outfit';

async function main() {
    const base = process.argv[2] || 'http://127.0.0.1:4000';
    const images = new Set<string>();
    let ids: string[] | undefined;
    for (const language of ['zh_hans','en']) {
        const response = await fetch(`${base}/api/outfits?lang=${language}`);
        assert.equal(response.status,200);
        const pages: unknown = await response.json();
        assert(Array.isArray(pages) && pages.length && pages.every(isOutfitPage));
        const current_ids = [...new Set(pages.flatMap(page=>[...page.items,...page.related_items]))];
        if (ids) assert.deepEqual(current_ids,ids);
        ids = current_ids;
        const items = new Map();
        for (const id of ids) {
            const detail = await fetch(`${base}/api/outfit/${id}?lang=${language}`);
            assert.equal(detail.status,200,`${language}/${id}`);
            const item: unknown = await detail.json(); assert(isOutfitItem(item),`${language}/${id}`);
            items.set(id,item);
            assert(!/<\/?color\b|\\n|\{(?:LINK#|NICKNAME)/i.test([item.description,item.story,...item.sources].join('\n')), `${id}: unresolved source formatting`);
            if (item.icon) images.add(item.icon);
            item.images.forEach(image=>images.add(image.url));
        }
        for (const page of pages) {
            assert.equal(items.get(page.items[0])?.name,page.name);
            for (const id of [...page.items,...page.related_items]) assert.equal(items.get(id)?.type,page.type);
        }
        assert.deepEqual(pages.filter(page=>page.show).flatMap(page=>page.items).sort(), [...ids].sort());
        console.log(`${language}: ${pages.filter(page=>page.show).length} visible outfit pages / ${ids.length} item responses passed`);
    }
    for (const image of images) assert.equal((await fetch(base+image,{method:'HEAD'})).status,200,image);
    assert.equal((await fetch(`${base}/api/outfit/nonexistent-outfit?lang=en`)).status,404);
    console.log(`${images.size} image URLs passed; unknown IDs return 404`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
