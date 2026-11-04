#!/usr/bin/env node
'use strict';

// Inspect published files only. Do not import generators, catalogues, or providers.
const fs = require('node:fs');
const path = require('node:path');
const { CONTENT_CATEGORIES } = require('@inteyvat-wiki/wiki-contracts/registry');
const { isWikiId } = require('@inteyvat-wiki/wiki-contracts/ids');
const { isPageDataTrait } = require('@inteyvat-wiki/wiki-contracts/common');
const { isOutfitItem, isOutfitPage } = require('@inteyvat-wiki/wiki-contracts/outfit');

const LANGUAGES = Object.freeze(['zh_hans', 'en']);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameMembers = (left, right) => JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

function selectCategories(selection) {
    if (selection === undefined) return [...CONTENT_CATEGORIES];
    if (!Array.isArray(selection) || !selection.length) throw new Error('--categories requires a nonempty category list');
    for (const category of selection) {
        if (!CONTENT_CATEGORIES.includes(category)) {
            if (category === 'map') throw new Error('map uses a separate protocol; run npm run check:maps:export -- <output>');
            throw new Error(`Unknown content category: ${JSON.stringify(category)}`);
        }
    }
    if (new Set(selection).size !== selection.length) throw new Error('Duplicate --categories entries');
    return [...selection];
}

/** Returns all discovered errors without creating, repairing, or deleting files.
 * Generic documents are checked as JSON objects, not guessed category schemas.
 * Outfit documents/pages additionally use the complete published-shape guards.
 */
function validateExports(output = 'data', options = {}) {
    const categories = selectCategories(options.categories);
    const root = path.resolve(output);
    const report = {
        root,
        mode: categories.length === CONTENT_CATEGORIES.length ? 'complete' : 'subset',
        categories,
        languages: [...LANGUAGES],
        summaries: [],
        errors: [],
        notes: [
            'Maps are NOT validated here (separate protocol). Run npm run check:maps:export -- <output>.',
            'Checks cover content indexes, item files, page contracts/membership, bilingual identity, and alias targets. Only outfits receive deep document validation; menus, images, and other nested document shapes are outside this check.',
        ],
    };
    function error(code, file, message) {
        report.errors.push({ code, path: path.relative(root, file).split(path.sep).join('/') || '.', message });
    }
    // Reject links rather than following a published path into an external input.
    // Every parent directory is checked before any of its children are read.
    function expectPath(file, kind, optional = false) {
        try {
            const stat = fs.lstatSync(file);
            if (stat.isSymbolicLink() || !(kind === 'directory' ? stat.isDirectory() : stat.isFile())) {
                error('invalid_path', file, `Expected a regular ${kind}, not a link or another file type`);
                return false;
            }
            return true;
        } catch (cause) {
            if (optional && cause.code === 'ENOENT') return false;
            error(cause.code === 'ENOENT' ? 'missing_path' : 'unreadable_path', file,
                `Cannot access required ${kind}: ${cause.code || cause.message}`);
            return false;
        }
    }
    function readJson(file, optional = false) {
        if (!expectPath(file, 'file', optional)) return undefined;
        try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
        catch (cause) {
            error(cause instanceof SyntaxError ? 'invalid_json' : 'unreadable_file', file, cause.message);
            return undefined;
        }
    }
    function checkIds(file) {
        const value = readJson(file);
        if (value === undefined) return null;
        if (!Array.isArray(value)) {
            error('invalid_ids', file, 'Expected an array of Wiki IDs');
            return null;
        }
        const ids = new Set();
        for (const [index, id] of value.entries()) {
            if (!isWikiId(id)) {
                error('invalid_id', file, `ids[${index}] is not a safe Wiki ID: ${JSON.stringify(id)}`);
                continue;
            }
            if (ids.has(id)) error('duplicate_id', file, `Duplicate item ID: ${id}`);
            ids.add(id);
        }
        return ids;
    }
    function checkItems(directory, category, ids) {
        const files = new Set(), published = new Set();
        if (!expectPath(directory, 'directory')) return { files, published, count: null };
        let entries;
        try { entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)); }
        catch (cause) {
            error('unreadable_path', directory, cause.message);
            return { files, published, count: null };
        }
        for (const entry of entries) {
            const file = path.join(directory, entry.name);
            if (!entry.isFile() || !entry.name.endsWith('.json')) {
                error('unexpected_item_entry', file, 'Expected only regular <Wiki ID>.json item files');
                continue;
            }
            const id = entry.name.slice(0, -5);
            if (!isWikiId(id)) {
                error('invalid_id', file, 'Item filename is not a safe Wiki ID');
                continue;
            }
            files.add(id);
            if (ids && !ids.has(id)) error('stale_item', file, `Item is absent from common/${category}/ids.json`);
            const document = readJson(file);
            if (document === undefined) continue;
            if (!isRecord(document)) error('invalid_item', file, 'Expected one JSON document object');
            else if (category === 'outfit' && !isOutfitItem(document)) error('invalid_outfit_item', file, 'Does not satisfy isOutfitItem');
            else published.add(id);
        }
        if (ids) for (const id of ids) {
            if (!files.has(id)) error('missing_item', path.join(directory, `${id}.json`), 'Indexed item has no exported file');
        }
        return { files, published, count: files.size };
    }
    function checkPages(file, category, ids, itemFiles) {
        const value = readJson(file);
        if (value === undefined) return null;
        if (!Array.isArray(value)) {
            error('invalid_pages', file, 'Expected a page array');
            return null;
        }
        const pages = new Map(), seen = new Set();
        for (const [index, page] of value.entries()) {
            if (isRecord(page) && isWikiId(page.id)) {
                if (seen.has(page.id)) error('duplicate_page_id', file, `Duplicate page ID: ${page.id}`);
                seen.add(page.id);
            }
            if (!isPageDataTrait(page)) {
                error('invalid_page', file, `pages[${index}] does not satisfy isPageDataTrait (including safe IDs)`);
                continue;
            }
            if (category === 'outfit' && !isOutfitPage(page)) {
                error('invalid_outfit_page', file, `Page ${page.id} does not satisfy isOutfitPage`);
            }
            pages.set(page.id, page);
            for (const field of ['items', 'related_items']) {
                if (new Set(page[field]).size !== page[field].length) {
                    error('duplicate_page_reference', file, `Page ${page.id} has duplicate ${field}`);
                }
                for (const id of page[field]) {
                    if ((ids && !ids.has(id)) || !itemFiles.has(id)) {
                        error('broken_page_reference', file, `Page ${page.id}.${field} references unpublished item ${id}`);
                    }
                }
            }
        }
        return pages;
    }
    function comparePages(category, left, right) {
        if (!left || !right) return;
        const file = path.join(root, 'en', category, 'pages.json');
        for (const id of new Set([...left.keys(), ...right.keys()])) {
            const a = left.get(id), b = right.get(id);
            if (!a || !b) {
                error('bilingual_page_ids', file, `Page ${id} is missing from ${a ? 'en' : 'zh_hans'}`);
                continue;
            }
            for (const field of ['items', 'related_items']) {
                if (!sameMembers(a[field], b[field])) error('bilingual_page_membership', file, `Page ${id}.${field} differs between zh_hans and en`);
            }
            // Visibility and translated presentation fields can vary by locale.
            // Group identity, like item membership, is language-independent.
            if (a.group?.id !== b.group?.id || a.group?.mode !== b.group?.mode) {
                error('bilingual_page_group', file, `Page ${id} group identity differs between zh_hans and en`);
            }
        }
    }
    function checkAliases(directory, ids, items) {
        // These are the two published compatibility indexes, not arbitrary fields
        // within documents. Source IDs are opaque; only Wiki IDs use isWikiId.
        for (const name of ['id_aliases', 'source_ids']) {
            const file = path.join(directory, `${name}.json`);
            const aliases = readJson(file, true);
            if (aliases === undefined) continue;
            if (!isRecord(aliases)) {
                error('invalid_aliases', file, 'Expected an alias-to-published-item object');
                continue;
            }
            for (const [alias, target] of Object.entries(aliases)) {
                if (name === 'id_aliases' && !isWikiId(alias)) error('invalid_alias', file, `Unsafe Wiki alias: ${JSON.stringify(alias)}`);
                if (name === 'id_aliases' && ids?.has(alias)) error('shadowed_alias', file, `Alias ${alias} shadows a canonical item ID`);
                if (!isWikiId(target) || (ids && !ids.has(target)) || !LANGUAGES.every(lang => items[lang]?.published.has(target))) {
                    error('broken_alias', file, `Alias ${JSON.stringify(alias)} targets an invalid or unpublished item: ${JSON.stringify(target)}`);
                }
            }
        }
    }

    if (!expectPath(root, 'directory')) return report;
    const parents = Object.fromEntries(['common', ...LANGUAGES].map(name =>
        [name, expectPath(path.join(root, name), 'directory')]));
    for (const category of categories) {
        const common = path.join(root, 'common', category);
        const hasCommon = parents.common && expectPath(common, 'directory');
        const ids = hasCommon ? checkIds(path.join(common, 'ids.json')) : null;
        const items = {}, pages = {};
        for (const language of LANGUAGES) {
            const directory = path.join(root, language, category);
            if (!parents[language] || !expectPath(directory, 'directory')) continue;
            items[language] = checkItems(path.join(directory, 'items'), category, ids);
            pages[language] = checkPages(path.join(directory, 'pages.json'), category, ids, items[language].files);
        }
        if (items.zh_hans && items.en && !sameMembers(items.zh_hans.files, items.en.files)) {
            error('bilingual_item_ids', path.join(root, 'en', category, 'items'), 'Item file sets differ between zh_hans and en');
        }
        comparePages(category, pages.zh_hans, pages.en);
        if (hasCommon) checkAliases(common, ids, items);
        report.summaries.push({
            category, ids: ids?.size ?? null,
            items: Object.fromEntries(LANGUAGES.map(lang => [lang, items[lang]?.count ?? null])),
            pages: Object.fromEntries(LANGUAGES.map(lang => [lang, pages[lang]?.size ?? null])),
        });
    }
    return report;
}

const USAGE = `Usage: node scripts/check_exports.cjs [output-directory] [--categories outfit,character]
Default: ./data, all CONTENT_CATEGORIES, both zh_hans and en.
--categories explicitly checks a subset; it does not certify a complete export.
Maps require the separate check:maps:export command. No files are written.
Exit codes: 0 valid selected content; 1 validation errors; 2 invalid arguments.`;

function parseArguments(args) {
    let output, categories, positionalOnly = false, help = false;
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (!positionalOnly && arg === '--') { positionalOnly = true; continue; }
        if (!positionalOnly && (arg === '--help' || arg === '-h')) { help = true; continue; }
        if (!positionalOnly && (arg === '--categories' || arg.startsWith('--categories='))) {
            if (categories !== undefined) throw new Error('--categories may be specified only once');
            const value = arg === '--categories' ? args[++index] : arg.slice('--categories='.length);
            if (!value || value.startsWith('--')) throw new Error('--categories requires a comma-separated category list');
            categories = selectCategories(value.split(',').map(category => category.trim()));
        } else if (!positionalOnly && arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
        else if (output !== undefined) throw new Error('Expected at most one output directory');
        else output = arg;
    }
    return { output: output ?? 'data', categories, help };
}

module.exports = { validateExports, parseArguments };
if (require.main === module) {
    try {
        const args = parseArguments(process.argv.slice(2));
        if (args.help) console.log(USAGE);
        else {
            const report = validateExports(args.output, { categories: args.categories });
            console.log(JSON.stringify(report, null, 2));
            process.exitCode = report.errors.length ? 1 : 0;
        }
    } catch (cause) {
        console.error(`${cause.message}\n${USAGE}`);
        process.exitCode = 2;
    }
}
