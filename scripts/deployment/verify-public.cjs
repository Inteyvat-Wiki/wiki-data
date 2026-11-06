'use strict';
// Read-only deployment verification against an explicitly supplied export snapshot.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {CONTENT_CATEGORIES} = require('@inteyvat-wiki/wiki-contracts/registry');

const ROUTES = Object.freeze({character: 'characters', weapon: 'weapons', artifact: 'artifacts', book: 'books',
    material: 'materials', readable: 'readables', living_being: 'living-beings', geography: 'geographies',
    chapter_group: 'chapter-groups', task: 'tasks', npc: 'npcs', quest_item: 'quest-items',
    serenitea: 'archive/serenitea', tcg: 'archive/tcg', miliastra: 'archive/miliastra', misc: 'misc', outfit: 'outfits'});
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function main(args = process.argv.slice(2)) {
    const sample = args.length === 3 && args[2] === '--test-only';
    assert(args.length === 2 || sample, 'Usage: verify-public.cjs BASE_URL EXPORT_ROOT [--test-only]');
    const base = new URL(args[0]), root = fs.realpathSync(args[1]);
    assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password && !base.search && !base.hash && base.pathname === '/', 'Use a credential-free origin');
    assert.deepEqual(Object.keys(ROUTES).sort(), [...CONTENT_CATEGORIES].sort());
    if (sample) {
        const provenance = read(root + '.provenance.json');
        assert(provenance.scope === 'real-windglider-deployment-sample' && provenance.productionReady === false);
    }
    const checks = [];
    async function request(route, status = 200, options = {}) {
        const response = await fetch(new URL(route, base), {redirect: 'error', signal: AbortSignal.timeout(60000), ...options});
        assert.equal(response.status, status, `Unexpected HTTP response: ${route}`);
        checks.push({route, method: options.method || 'GET', status});
        return response;
    }
    async function json(route) {
        const response = await request(route);
        assert.match(response.headers.get('content-type') || '', /application\/json/);
        return response.json();
    }
    const homepage = await request('/');
    assert.match(homepage.headers.get('content-type') || '', /text\/html/);
    await homepage.body.cancel();
    assert.deepEqual(await json('/api/menu'), read(path.join(root, 'common/menu.json')));
    for (const lang of ['zh_hans', 'en']) {
        for (const [category, route] of Object.entries(ROUTES)) {
            const actual = await json(`/api/${route}?lang=${lang}`);
            const expected = read(path.join(root, lang, category, 'pages.json'));
            assert(Array.isArray(actual), `Invalid list: ${category}/${lang}`);
            assert.deepEqual(actual.map(page => page.id), expected.map(page => page.id), `List membership/order differs: ${category}/${lang}`);
        }
        const scenes = await json(`/api/map/scenes?lang=${lang}`);
        assert.deepEqual(scenes, read(path.join(root, lang, 'map/scenes.json')));
        for (const scene of scenes.scenes) {
            assert.deepEqual(await json(`/api/map/scenes/${encodeURIComponent(scene.id)}?lang=${lang}`), read(path.join(root, lang, 'map/scenes', scene.id + '.json')));
        }
        const catalogue = await json(`/api/map/catalogue?lang=${lang}`);
        const expectedCatalogue = read(path.join(root, lang, 'map/catalogue.json'));
        assert(catalogue.schema === 1 && catalogue.total === expectedCatalogue.items.length);
        if (!sample) assert(catalogue.total > 0 && catalogue.items.length > 0);
        else assert.equal(catalogue.items.length, 0);
    }
    // Stable known examples exercise display conversion, not only raw JSON reads.
    const examples = sample ? read(path.join(root, 'common/outfit/ids.json')).map(id => ['outfit', id])
        : [['character', 'mitya'], ['character', 'valeriy'], ['weapon', 'starsealed_edict'], ['outfit', 'wings_of_first_flight']];
    for (const [category, id] of examples) {
        for (const lang of ['zh_hans', 'en']) {
            const object = await json(`/api/${category}/${id}?lang=${lang}`);
            assert(typeof object.name === 'string' && object.name.length > 0, `Missing example: ${category}/${id}/${lang}`);
        }
        const source = read(path.join(root, 'zh_hans', category, 'items', id + '.json'));
        assert(typeof source.icon === 'string' && source.icon.startsWith('/images/'));
        assert(!source.icon.includes('..') && !source.icon.includes('\\'));
        const image = await request(source.icon);
        assert.equal(image.headers.get('content-type'), 'image/png');
        assert.equal(digest(Buffer.from(await image.arrayBuffer())), digest(fs.readFileSync(path.join(root, source.icon.slice(1)))), 'Published image differs from the verified export');
        const head = await request(source.icon, 200, {method: 'HEAD'});
        assert(Number(head.headers.get('content-length')) > 0);
        const etag = head.headers.get('etag');
        assert(etag);
        await request(source.icon, 304, {headers: {'if-none-match': etag}});
    }
    for (const route of ['/api/admin/data', '/api/admin/data?status=1']) {
        const response = await request(route, 404); await response.body.cancel();
    }
    console.log(JSON.stringify({origin: base.origin, exportRoot: root, scope: sample ? 'real-sample-only' : 'complete-export', checked: checks.length, checks}, null, 2));
}
module.exports = {main};
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
