const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { isMapCatalogue, isMapScene, isMapSceneIndex } = require('@inteyvat-wiki/wiki-contracts/map');
const { readPngHeader } = require('@inteyvat-wiki/resource-tools');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
const output = fs.mkdtempSync(path.join(root, 'tmp', 'migration-'));
const report = { output, runs: {}, files: {}, differences: [], differenceCount: 0 };
// These new documents have no legacy provider equivalent. Validate the exact
// intended additions; every pre-existing map/image still participates in equality.
const addedMapCatalogues = new Set(['zh_hans/map/catalogue.json', 'en/map/catalogue.json']);
report.validatedAdditions = [];
const config = require('../config/pipeline.cjs').loadConfig();
const snapshot = require('@inteyvat-wiki/genshin-db').openSnapshot({ cacheRoot: config.cache.exports,
    snapshotId: config.query.snapshot, indexCacheRoot: config.cache.indexes });
const manifest = snapshot.manifest();
report.source = { snapshotId: snapshot.snapshotId, source: manifest.plan.source, history: manifest.plan.history };
function run(backend) {
    const destination = path.join(output, backend);
    const log = fs.openSync(path.join(output, `${backend}.log`), 'w');
    const start = Date.now();
    const args = ['--import', 'tsx', '--import', './scripts/data_bootstrap.mts'];
    if (backend === 'snapshot') args.push('--require', './scripts/migration_guard.cjs');
    args.push('index.ts', destination);
    const result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env,
        WIKI_DATA_BACKEND: backend, WIKI_DATA_PREPARE: '0', WIKI_DATA_OUTPUT: destination,
        WIKI_DATA_SNAPSHOT: snapshot.snapshotId }, windowsHide: true, stdio: ['ignore', log, log] });
    fs.closeSync(log);
    report.runs[backend] = { status: result.status, milliseconds: Date.now() - start, error: result.error?.message };
    console.log(`${backend}: exit ${result.status}, ${report.runs[backend].milliseconds}ms; ${destination}`);
    return destination;
}
function files(directory, prefix = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const relative = prefix + entry.name;
        return entry.isDirectory() ? files(path.join(directory, entry.name), relative + '/') : [relative];
    });
}
function difference(file, reason) {
    report.differenceCount++;
    if (report.differences.length < 100) report.differences.push({ file, reason });
}
const baseline = process.env.WIKI_DATA_MIGRATION_BASELINE ? path.resolve(process.env.WIKI_DATA_MIGRATION_BASELINE) : run('legacy');
if (process.env.WIKI_DATA_MIGRATION_BASELINE) {
    if (!fs.statSync(baseline).isDirectory()) throw new Error('Baseline must be an existing isolated export');
    report.runs.legacy = { status: 0, reused: baseline };
}
const candidate = run('snapshot');
if (report.runs.legacy.status === 0 && report.runs.snapshot.status === 0) {
    const before = files(baseline), after = files(candidate), afterSet = new Set(after), beforeSet = new Set(before);
    const addedMapScenes = new Set(), addedMapImages = new Set();
    for (const language of ['zh_hans', 'en']) {
        const indexName = `${language}/map/scenes.json`;
        if (!afterSet.has(indexName)) continue;
        try {
            const index = JSON.parse(fs.readFileSync(path.join(candidate, indexName), 'utf8'));
            assert(isMapSceneIndex(index) && index.scenes.length, 'Invalid map scene index');
            addedMapScenes.add(indexName);
            for (const entry of index.scenes) {
                const name = `${language}/map/scenes/${entry.id}.json`;
                const scene = JSON.parse(fs.readFileSync(path.join(candidate, name), 'utf8'));
                assert(isMapScene(scene) && scene.id === entry.id, 'Invalid map scene');
                for (const key of ['overlays', 'markers', 'regions', 'layers']) assert.equal(scene[key].length, entry.counts[key]);
                addedMapScenes.add(name);
                const sceneImages = [...scene.overlays.map(overlay => overlay.image), ...scene.regions.flatMap(region => region.mesh ? [region.mesh.texture] : [])];
                for (const reference of sceneImages) {
                    assert(/^\/images\/map\/scenes\/[a-zA-Z0-9_./-]+\.png$/.test(reference), 'Unexpected map image location');
                    const imageName = reference.slice(1), imageFile = path.resolve(candidate, imageName);
                    assert(imageFile.startsWith(candidate + path.sep), 'Invalid map image path');
                    readPngHeader(imageFile);
                    addedMapImages.add(imageName);
                }
            }
        } catch (error) { difference(indexName, `Invalid map scene export: ${error.message}`); }
    }
    for (const name of before) {
        if (!afterSet.has(name)) { difference(name, 'missing'); continue; }
        const a = fs.readFileSync(path.join(baseline, name)), b = fs.readFileSync(path.join(candidate, name));
        if (name.endsWith('.json')) {
            try { assert.deepStrictEqual(JSON.parse(b), JSON.parse(a)); }
            catch { difference(name, 'JSON content or array order changed'); }
        } else if (!a.equals(b)) difference(name, 'binary content changed');
    }
    for (const name of after) if (!beforeSet.has(name)) {
        if (addedMapCatalogues.has(name)) {
            const document = JSON.parse(fs.readFileSync(path.join(candidate, name), 'utf8'));
            if (!isMapCatalogue(document) || !document.items.length) difference(name, 'invalid new map catalogue');
            else report.validatedAdditions.push(name);
        } else if (addedMapScenes.has(name) || addedMapImages.has(name)) report.validatedAdditions.push(name);
        else difference(name, 'added');
    }
    for (const [backend, list] of [['legacy', before], ['snapshot', after]]) {
        const counts = {};
        for (const name of list) {
            const group = name.startsWith('images/') ? 'images' : name.split('/').slice(0, 2).join('/');
            counts[group] = (counts[group] || 0) + 1;
        }
        report.files[backend] = { total: list.length, counts };
    }
    // Record hashes of shared generated metadata, without retaining full data in the report.
    report.metadata = Object.fromEntries(after.filter(name => name.startsWith('common/') && name.endsWith('.json'))
        .map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(candidate, name))).digest('hex')]));
}
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.runs.legacy.status !== 0 || report.runs.snapshot.status !== 0 || report.differenceCount) process.exitCode = 1;
