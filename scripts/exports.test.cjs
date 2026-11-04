'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { CONTENT_CATEGORIES } = require('@inteyvat-wiki/wiki-contracts/registry');
const { validateExports, parseArguments } = require('./check_exports.cjs');

const LANGUAGES = ['zh_hans', 'en'];
const script = path.join(__dirname, 'check_exports.cjs');
function write(root, relative, value) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
}
function outfit() {
    return { name: 'Outfit', type: 'glider', description: '', story: null, sources: [],
        character: null, weapon_type: null, is_default: false, icon: null, images: [] };
}
function page(id, category) {
    const result = { id, name: id, icon: null, star: null, show: true, items: [id], related_items: [] };
    if (category === 'outfit') Object.assign(result, {
        type: 'glider', description: '', character: null, weapon_type: null, is_default: false,
    });
    return result;
}
function fixture(t, categories = ['outfit']) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-export-validator-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const category of categories) {
        const ids = ['first', 'second.v1'];
        write(root, `common/${category}/ids.json`, ids);
        write(root, `common/${category}/id_aliases.json`, { old: 'first' });
        write(root, `common/${category}/source_ids.json`, { 'opaque/source:key': 'second.v1' });
        for (const lang of LANGUAGES) {
            write(root, `${lang}/${category}/pages.json`, ids.map(id => page(id, category)));
            for (const id of ids) write(root, `${lang}/${category}/items/${id}.json`,
                category === 'outfit' ? outfit() : { name: id, opaque: { raw_conditions: ['not interpreted'] } });
        }
    }
    return root;
}
const subset = root => validateExports(root, { categories: ['outfit'] });
function hasError(report, code, suffix) {
    assert(report.errors.some(error => error.code === code && (!suffix || error.path.endsWith(suffix))), JSON.stringify(report.errors));
}
function snapshot(root) {
    const result = {};
    function visit(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(file);
            else result[path.relative(root, file)] = { bytes: fs.readFileSync(file).toString('base64'), mtime: fs.statSync(file).mtimeMs };
        }
    }
    visit(root);
    return result;
}

test('complete synthetic export passes all shared categories without changing any files', t => {
    const root = fixture(t, CONTENT_CATEGORIES);
    const before = snapshot(root);
    const report = validateExports(root);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.categories, CONTENT_CATEGORIES);
    assert.equal(report.mode, 'complete');
    assert.equal(report.summaries.length, CONTENT_CATEGORIES.length);
    assert.match(report.notes.join('\n'), /Maps are NOT validated/);
    assert.deepEqual(snapshot(root), before);
});

test('outfit-only export needs explicit subset mode; default does not silently skip categories', t => {
    const root = fixture(t);
    assert.deepEqual(subset(root).errors, []);
    assert.equal(subset(root).mode, 'subset');
    hasError(validateExports(root), 'missing_path', 'common/character');
});

test('missing indexed item and its broken alias/page references are reported', t => {
    const root = fixture(t);
    fs.unlinkSync(path.join(root, 'en/outfit/items/first.json'));
    const report = subset(root);
    hasError(report, 'missing_item', 'en/outfit/items/first.json');
    hasError(report, 'bilingual_item_ids');
    hasError(report, 'broken_page_reference');
    hasError(report, 'broken_alias');
});

test('stale index ID and unindexed item files are both rejected', t => {
    const root = fixture(t);
    write(root, 'common/outfit/ids.json', ['first', 'second.v1', 'deleted']);
    write(root, 'en/outfit/items/stale.json', outfit());
    const report = subset(root);
    hasError(report, 'missing_item', 'zh_hans/outfit/items/deleted.json');
    hasError(report, 'missing_item', 'en/outfit/items/deleted.json');
    hasError(report, 'stale_item', 'en/outfit/items/stale.json');
});

test('unsafe and duplicate common IDs fail before they can become read paths', t => {
    const root = fixture(t);
    write(root, 'common/outfit/ids.json', ['first', 'first', '../outside', 'bad\\name', 12, 'second.v1']);
    const report = subset(root);
    hasError(report, 'duplicate_id');
    assert.equal(report.errors.filter(error => error.code === 'invalid_id').length, 3);
    assert(!report.errors.some(error => error.path.includes('../outside')));
});

test('common IDs must be an array', t => {
    const root = fixture(t);
    write(root, 'common/outfit/ids.json', { first: true });
    hasError(subset(root), 'invalid_ids');
});

test('invalid page shape, unsafe page ID, and duplicate page ID fail', t => {
    const root = fixture(t);
    write(root, 'en/outfit/pages.json', [page('first', 'outfit'), page('first', 'outfit'),
        { ...page('second.v1', 'outfit'), icon: 5 }, page('../escape', 'outfit')]);
    const report = subset(root);
    hasError(report, 'duplicate_page_id');
    assert.equal(report.errors.filter(error => error.code === 'invalid_page').length, 2);
});

test('pages must be an array and page references must be safe IDs', t => {
    const root = fixture(t);
    write(root, 'en/outfit/pages.json', {});
    hasError(subset(root), 'invalid_pages');
    write(root, 'en/outfit/pages.json', [{ ...page('first', 'outfit'), items: ['../escape'] }]);
    hasError(subset(root), 'invalid_page');
});

test('member and related-item references must be published in the same category', t => {
    const root = fixture(t);
    write(root, 'en/outfit/pages.json', [{ ...page('first', 'outfit'), items: ['not_exported'], related_items: ['also_missing'] }]);
    const report = subset(root);
    assert.equal(report.errors.filter(error => error.code === 'broken_page_reference').length, 2);
});

test('page member lists reject duplicates', t => {
    const root = fixture(t);
    write(root, 'en/outfit/pages.json', [{ ...page('first', 'outfit'), items: ['first', 'first'] }]);
    hasError(subset(root), 'duplicate_page_reference');
});

test('bilingual pages compare identity, membership, related items, and group identity', t => {
    const root = fixture(t);
    write(root, 'en/outfit/pages.json', [{ ...page('first', 'outfit'), items: ['second.v1'], related_items: ['first'], group: { id: 'new_group', mode: 'variants' } }]);
    const report = subset(root);
    hasError(report, 'bilingual_page_ids');
    assert.equal(report.errors.filter(error => error.code === 'bilingual_page_membership').length, 2);
    hasError(report, 'bilingual_page_group');
});

test('localized visibility/text, page/list order, and non-item group page IDs are allowed', t => {
    const root = fixture(t);
    for (const lang of LANGUAGES) {
        const pages = [
            { ...page('group', 'outfit'), name: lang, show: lang === 'en', items: lang === 'en' ? ['second.v1', 'first'] : ['first', 'second.v1'], group: { id: 'group', mode: 'variants' } },
            { ...page('first', 'outfit'), show: false, related_items: ['second.v1'] },
        ];
        write(root, `${lang}/outfit/pages.json`, lang === 'en' ? pages.reverse() : pages);
    }
    assert.deepEqual(subset(root).errors, []);
});

test('missing required language, category, index, pages, or items directory fails', async t => {
    for (const relative of ['en', 'common/outfit', 'en/outfit', 'common/outfit/ids.json', 'en/outfit/pages.json', 'en/outfit/items']) {
        await t.test(relative, child => {
            const root = fixture(child);
            fs.rmSync(path.join(root, relative), { recursive: true, force: true });
            hasError(subset(root), 'missing_path', relative);
        });
    }
});

test('alias indexes must target canonical items published in both languages', t => {
    const root = fixture(t);
    write(root, 'common/outfit/id_aliases.json', { old: 'missing', chain: 'old', unsafe: '../escape', numeric: 12, first: 'second.v1', '../bad': 'first' });
    write(root, 'common/outfit/source_ids.json', { upstream: 'missing' });
    const report = subset(root);
    assert.equal(report.errors.filter(error => error.code === 'broken_alias').length, 5);
    hasError(report, 'shadowed_alias');
    hasError(report, 'invalid_alias');
});

test('alias indexes are optional but malformed ones fail', t => {
    const root = fixture(t);
    for (const file of ['id_aliases', 'source_ids']) fs.unlinkSync(path.join(root, `common/outfit/${file}.json`));
    assert.deepEqual(subset(root).errors, []);
    write(root, 'common/outfit/id_aliases.json', []);
    hasError(subset(root), 'invalid_aliases');
});

test('invalid JSON and non-object item documents are reported, not repaired', t => {
    const root = fixture(t);
    fs.writeFileSync(path.join(root, 'en/outfit/items/first.json'), '{');
    write(root, 'zh_hans/outfit/items/first.json', []);
    const report = subset(root);
    hasError(report, 'invalid_json');
    hasError(report, 'invalid_item');
});

test('outfit item and page deep guards are actually applied', t => {
    const root = fixture(t);
    write(root, 'en/outfit/items/first.json', { ...outfit(), images: [{ kind: 'icon', url: '' }] });
    write(root, 'en/outfit/pages.json', [{ ...page('first', 'outfit'), unexpected_source_field: true }]);
    const report = subset(root);
    hasError(report, 'invalid_outfit_item');
    hasError(report, 'invalid_outfit_page');
});

test('nested directories and non-JSON files cannot masquerade as item files', t => {
    const root = fixture(t);
    fs.mkdirSync(path.join(root, 'en/outfit/items/extra.json'));
    fs.writeFileSync(path.join(root, 'en/outfit/items/notes.txt'), 'not an item');
    assert.equal(subset(root).errors.filter(error => error.code === 'unexpected_item_entry').length, 2);
});

test('validator imports only contracts/builtins and accesses only the selected export, read-only', t => {
    const root = fixture(t);
    const allowed = new Set(['node:path', '@inteyvat-wiki/wiki-contracts/registry', '@inteyvat-wiki/wiki-contracts/ids',
        '@inteyvat-wiki/wiki-contracts/common', '@inteyvat-wiki/wiki-contracts/outfit']);
    const readonlyFs = new Proxy({}, { get(_target, method) {
        assert(['lstatSync', 'readFileSync', 'readdirSync'].includes(method), `Unexpected filesystem access: ${String(method)}`);
        return (file, ...args) => {
            const relative = path.relative(root, path.resolve(file));
            assert(!relative.startsWith('..') && !path.isAbsolute(relative), `Read escaped export: ${file}`);
            return fs[method](file, ...args);
        };
    } });
    const isolated = { exports: {} };
    const restrictedRequire = name => {
        if (name === 'node:fs') return readonlyFs;
        assert(allowed.has(name), `Unexpected dependency: ${name}`);
        return require(name);
    };
    new Function('require', 'module', 'exports', fs.readFileSync(script, 'utf8').replace(/^#![^\n]*\n/, ''))(
        restrictedRequire, isolated, isolated.exports);
    assert.deepEqual(isolated.exports.validateExports(root, { categories: ['outfit'] }).errors, []);
    write(root, 'common/outfit/ids.json', ['first', 'second.v1', '../outside']);
    hasError(isolated.exports.validateExports(root, { categories: ['outfit'] }), 'invalid_id');
});

test('argument parsing rejects invalid or accidentally empty subset selections', () => {
    for (const args of [['--categories'], ['--categories='], ['--categories', 'outfit,'], ['--categories', 'outfit,outfit'],
        ['--categories', 'unknown'], ['--categories', '../escape'], ['--categories', 'map'], ['--unknown'], ['one', 'two']]) {
        assert.throws(() => parseArguments(args));
    }
    assert.throws(() => validateExports('unused', { categories: [] }), /nonempty/);
    assert.deepEqual(parseArguments(['--categories=outfit,character', 'some-output']).categories, ['outfit', 'character']);
    assert.equal(parseArguments([]).output, 'data');
});

test('CLI handles positional output, default data, help, failures, and map instructions', t => {
    const root = fixture(t);
    const run = (args, cwd = root) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
    const result = run([root, '--categories', 'outfit']);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).mode, 'subset');
    assert.equal(run([root]).status, 1);
    const invalid = run(['--categories=map']);
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /check:maps:export/);
    const help = run(['--help']);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /No files are written/);
    const defaultRoot = path.join(root, 'data');
    fs.mkdirSync(defaultRoot);
    for (const directory of ['common', ...LANGUAGES]) fs.cpSync(path.join(root, directory), path.join(defaultRoot, directory), { recursive: true });
    const defaults = run(['--categories=outfit']);
    assert.equal(defaults.status, 0, defaults.stderr || defaults.stdout);
    assert.equal(JSON.parse(defaults.stdout).root, defaultRoot);
});
