'use strict';
// Explicit test-only adapter: retain the exact real sample and declare all other
// categories empty. Never promote this as a full export or modify a production tree.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {CONTENT_CATEGORIES} = require('@inteyvat-wiki/wiki-contracts/registry');
const {inventory, validateDataset} = require('../upload_data.cjs');
const {noLinks} = require('./sandbox-common.cjs');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function main(args = process.argv.slice(2)) {
    assert(args.length === 3 && args[2] === '--test-only', 'Usage: sample-release.cjs PASSED_SANDBOX_RUN NEW_TEST_EXPORT --test-only');
    const run = fs.realpathSync(args[0]), destination = path.resolve(args[1]);
    noLinks(run); noLinks(path.dirname(destination));
    assert(!fs.existsSync(destination) && !fs.existsSync(destination + '.provenance.json'), 'Test destination must be new');
    const source = path.join(run, 'output/data');
    assert(!destination.startsWith(run + path.sep), 'Test export must be outside the sandbox run');
    const result = read(path.join(run, 'output/result.json'));
    const state = read(path.join(run, 'host-state.json'));
    assert.equal(read(path.join(run, 'exec-response.json')).ExitCode, 0, 'A successful guest launcher exit is required');
    assert(result.schema === 1 && result.status === 'passed' && result.mode === 'smoke' && result.productionReady === false,
        'A passed real sandbox smoke run is required; diagnostic/synthetic output is not accepted');
    assert.equal(result.id, state.id); assert.equal(result.lockSha256, state.lockSha256);
    assert.equal(hash(fs.readFileSync(path.join(run, 'input/lock.json'))), state.lockSha256);
    const outputs = read(path.join(run, 'output/provenance/outputs.json'));
    const files = inventory(source), expected = new Map(outputs.map(file => [file.path, file]));
    assert.equal(expected.size, outputs.length); assert.equal(files.length, outputs.length);
    for (const file of files) {
        assert(/^(?:common\/image-requests\.json|common\/outfit\/(?:ids|assets)\.json|(?:en|zh_hans)\/outfit\/(?:pages\.json|items\/[a-z0-9_.-]+\.json)|images\/outfit\/[^\\]+\.png)$/.test(file.path),
            `Unexpected sample file: ${file.path}`);
        assert.equal(file.stat.size, expected.get(file.path)?.bytes);
        assert.equal(hash(fs.readFileSync(file.file)), expected.get(file.path)?.sha256);
    }
    const ids = read(path.join(source, 'common/outfit/ids.json'));
    assert(ids.length >= 1 && ids.length <= 5);
    fs.mkdirSync(destination);
    const write = (name, value) => {
        const target = path.join(destination, name);
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.writeFileSync(target, JSON.stringify(value), {flag: 'wx'});
    };
    for (const file of files) {
        const target = path.join(destination, file.path);
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.copyFileSync(file.file, target, fs.constants.COPYFILE_EXCL);
        assert.equal(hash(fs.readFileSync(target)), expected.get(file.path).sha256);
    }
    for (const category of CONTENT_CATEGORIES.filter(category => category !== 'outfit')) {
        write(`common/${category}/ids.json`, []);
        for (const lang of ['en', 'zh_hans']) {
            write(`${lang}/${category}/pages.json`, []);
            fs.mkdirSync(path.join(destination, lang, category, 'items'));
        }
    }
    write('common/menu.json', {});
    write('common/maps.json', {});
    write('common/map/task_dependencies.json', {schema: 1, sameTaskOrder: 'ascending', edges: []});
    for (const lang of ['en', 'zh_hans']) {
        write(`${lang}/map/catalogue.json`, {schema: 1, items: []});
        write(`${lang}/map/scenes.json`, {schema: 1, scenes: []});
    }
    validateDataset(destination);
    const report = {schema: 1, scope: 'real-windglider-deployment-sample', productionReady: false,
        runId: result.id, lockSha256: state.lockSha256, sourceCommit: result.sourceCommit, versions: result.versions, ids,
        populatedCategories: ['outfit'], emptyCategories: CONTENT_CATEGORIES.filter(category => category !== 'outfit')};
    fs.writeFileSync(destination + '.provenance.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
    console.log(JSON.stringify({destination, ...report}));
    return report;
}
module.exports = {main};
if (require.main === module) { try { main(); } catch (error) {console.error(error.message); process.exitCode = 1;} }
