'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {loadConfig, configEnvironment} = require('../config/pipeline.cjs');
const {parse, images, lua, resources, checkSourceBoundary} = require('./pipeline.cjs');
function fixture(t, content = {version: 1}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-pipeline-'));
    t.after(() => { assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, {recursive: true, force: true}); });
    const file = path.join(root, 'config.json'); fs.writeFileSync(file, JSON.stringify(content));
    return {root, file, config: () => loadConfig({file, env: {}})};
}
test('config paths are relative to the configuration, not current working directory', t => {
    const f = fixture(t, {version: 1, source: {root: './raw', historyRefs: ['HEAD', 'refs/tags/7.1']},
        resources: {studio: './studio', assetMap: './game.map', imageRoots: ['./legacy-images'], caches: {mapBase: './base.json'}},
        cache: {root: './cache'}, output: {data: './output'}});
    const config = f.config();
    assert.equal(config.source.root, path.join(f.root, 'raw'));
    assert.equal(config.resources.caches.mapBase, path.join(f.root, 'base.json'));
    assert.deepEqual(config.resources.imageRoots, [path.join(f.root, 'legacy-images'), path.join(f.root, 'cache/resources/images')]);
    assert.equal(config.cache.exports, path.join(f.root, 'cache/genshin-data'));
    assert.equal(config.output.data, path.join(f.root, 'output'));
});
test('explicit config wins over environment selection, environment settings override file paths', t => {
    const f = fixture(t, {version: 1, source: {root: './raw'}, cache: {root: './cache'}});
    const config = loadConfig({file: f.file, cwd: f.root, env: {WIKI_DATA_CONFIG: 'absent.json', GENSHIN_DATA_SOURCE: './override', WIKI_DATA_PREPARE: '0'}});
    assert.equal(config.source.root, path.join(f.root, 'override')); assert.equal(config.query.prepare, false);
    assert.throws(() => loadConfig({file: path.join(f.root, 'missing.json'), env: {}}), /not found/);
});
test('child exports preserve environment-relative resource and history paths when cwd changes', t => {
    const f = fixture(t);
    const config = loadConfig({file: f.file, cwd: f.root, env: {MAP_BASE_RESOURCE_CACHE: './base.json', GENSHIN_HISTORY_SEED: './seed', WIKI_CACHE_ROOT: './cache'}});
    const reopened = loadConfig({cwd: path.dirname(f.root), env: configEnvironment(config)});
    assert.deepEqual(reopened.resources.caches, config.resources.caches);
    assert.equal(reopened.source.historySeedCache, config.source.historySeedCache);
    assert.equal(reopened.cache.root, config.cache.root);
});
test('configuration rejects unknown fields and invalid types instead of silently ignoring them', t => {
    for (const config of [{version: 2}, {version: 1, resources: {caches: {bad: 'x'}}}, {version: 1, source: {versions: 'false'}},
        {version: 1, source: {historyRefs: []}}, {version: 1, resources: {imageRoots: 'x'}}, {version: 1, query: {prepare: 1}},
        {version: 1, query: {snapshot: 'latest'}}, {version: 1, cache: {indexes: 123}}, {version: 1, source: {versionOverrides: []}},
        {version: 1, resources: false}, {version: 1, source: {versionOverrides: false}}, {version: 1, resources: {caches: null}},
        {version: 1, query: {backend: ''}}, {version: 1, resources: {game: ''}}]) {
        assert.throws(() => fixture(t, config).config());
    }
});
test('default cache is external to installed packages and pinned snapshot disables preparing', t => {
    const f = fixture(t, {version: 1, query: {snapshot: 'a'.repeat(64)}}), config = f.config();
    assert(!config.cache.root.includes('node_modules')); assert(!config.cache.root.startsWith(f.root));
    assert.equal(config.query.prepare, false); assert.equal(config.source.root, undefined);
    assert.equal(fs.readdirSync(f.root).length, 1, 'loading config must not create caches');
});
test('outputs cannot be placed inside raw inputs or installed package directories', t => {
    for (const config of [{version: 1, source: {root: './raw'}, output: {data: './raw/export'}},
        {version: 1, cache: {root: './node_modules/cache'}}]) assert.throws(() => fixture(t, config).config(), /overlaps|node_modules/);
});
test('CLI rejects unknown flags, incomplete values and cross-command options', () => {
    assert.deepEqual(parse(['export', 'misc', '--config', 'x']), {command: 'export', target: 'misc', config: 'x'});
    for (const args of [['export', '--apply'], ['images', '--config'], ['oops'], ['images', '--typo', 'x']]) assert.throws(() => parse(args));
});
test('image preview does not invoke AnimeStudio, create a cache or extract images', t => {
    const f = fixture(t, {version: 1, cache: {root: './cache'}}), file = path.join(f.root, 'requests.json');
    fs.writeFileSync(file, JSON.stringify({schema: 1, names: ['UI_Test']}));
    const result = images(f.config(), {manifest: file}, {imageName: name => ({name}), readAssetMap() {throw new Error('unexpected external tool');}});
    assert.equal(result.requested, 1); assert.equal(result.extracted, false); assert(!fs.existsSync(path.join(f.root, 'cache')));
});
test('image apply retains all preferred candidates and feeds extracted images directly to the configured cache', t => {
    const f = fixture(t, {version: 1, cache: {root: './cache'}, resources: {studio: './studio', assetMap: './map'}});
    const file = path.join(f.root, 'requests.json'); fs.writeFileSync(file, JSON.stringify({schema: 1, names: ['UI_A', 'UI_B']}));
    let extraction;
    const result = images(f.config(), {manifest: file, apply: true}, {
        imageName: name => ({name}), readAssetMap: () => ({entries: [{Name: 'UI_A', Type: 'Sprite', PathID: '1'}, {Name: 'UI_A', Type: 'Sprite', PathID: '2'}]}),
        selectImageEntries: entries => entries, extractResources: options => {extraction = options;},
    });
    assert.equal(extraction.entries.length, 2); assert.equal(extraction.selection, 'largest');
    assert(extraction.output.startsWith(result.imageRoot + path.sep)); assert.deepEqual(result.missing, ['UI_B']);
    assert(fs.existsSync(path.join(result.work, 'report.json')));
});
test('Lua preview requires an exact plan and does not invent resource IDs', t => {
    const f = fixture(t), file = path.join(f.root, 'lua.json');
    fs.writeFileSync(file, JSON.stringify({entries: [{Name: 'Verified', PathID: '9007199254740993', Offset: 0}]}));
    assert.equal(lua(f.config(), {plan: file}, {}).planned, 1);
});
test('Lua extraction does not write into an explicitly configured verified input', t => {
    const f = fixture(t, {version: 1, cache: {root: './cache'}, resources: {studio: './studio', luaRoot: './verified'}});
    const file = path.join(f.root, 'plan.json'); fs.writeFileSync(file, JSON.stringify({entries: [{Name: 'Verified'}]}));
    let output;
    const result = lua(f.config(), {plan: file, apply: true}, {extractLuaResources(options) {
        output = options.output; return {output, status: 'complete', resources: []};
    }});
    assert(output.startsWith(path.join(f.root, 'cache/resources/lua') + path.sep));
    assert.equal(result.exportInput, path.join(f.root, 'verified')); assert(!fs.existsSync(result.exportInput));
});
test('configured resource root rejects a stale asset map pointing outside it', t => {
    const f = fixture(t), inside = path.join(f.root, 'blocks'), file = path.join(f.root, 'not-a-block');
    fs.mkdirSync(inside); fs.writeFileSync(file, 'test');
    assert.throws(() => checkSourceBoundary([{Source: file}], inside), /outside resources.root/);
    checkSourceBoundary([{Source: file}], f.root);
});
test('resource plans use public preparation options and register new caches without copying data', t => {
    const f = fixture(t, {version: 1, source: {root: './raw'}, cache: {root: './cache'}, resources: {assetMap: './game.map'}});
    const file = path.join(f.root, 'plan.json'); fs.writeFileSync(file, JSON.stringify({rawReportFile: './report.json'}));
    let calls = 0;
    const api = {supportedKinds: ['levelTags'], prepare(kind, options) {
        calls++; assert.equal(options.rawReportFile, path.join(f.root, 'report.json'));
        fs.writeFileSync(options.output, '{}'); return {kind, cachePath: options.output, result: {verified: true}};
    }};
    assert.equal(resources(f.config(), {kind: 'levelTags', plan: file}, api).extracted, false);
    assert.equal(calls, 0);
    const result = resources(f.config(), {kind: 'levelTags', plan: file, apply: true}, api);
    assert.equal(calls, 1); assert.equal(f.config().resources.caches.levelTags, result.cachePath);
    const moved = loadConfig({file: f.file, env: {GENSHIN_DATA_SOURCE: path.join(f.root, 'different')}});
    assert.equal(moved.resources.caches.levelTags, undefined);
});

test('map effects preparation resolves evidence paths and persists its export binding', t => {
    const f = fixture(t, {version: 1, source: {root: './raw'}, cache: {root: './cache'}, resources: {assetMap: './game.map'}});
    const file = path.join(f.root, 'effects.json');
    fs.writeFileSync(file, JSON.stringify({prefabCacheFile: './prefabs.json', outlineCacheFile: './outlines.json'}));
    const result = resources(f.config(), {kind: 'mapEffects', plan: file, apply: true}, {
        supportedKinds: ['mapEffects'], prepare(kind, options) {
            assert.equal(options.prefabCacheFile, path.join(f.root, 'prefabs.json'));
            assert.equal(options.outlineCacheFile, path.join(f.root, 'outlines.json'));
            assert.equal(path.extname(options.output), '.json');
            fs.writeFileSync(options.output, '{}');
            return {kind, cachePath: options.output};
        },
    });
    assert.equal(result.registered, true);
    assert.equal(f.config().resources.caches.mapEffects, result.cachePath);
    assert.equal(configEnvironment(f.config()).MAP_EFFECT_RESOURCE_CACHE, result.cachePath);
});
