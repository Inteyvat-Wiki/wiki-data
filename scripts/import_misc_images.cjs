'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {imageName, crc32, validatePng, importResourceImages} = require('@inteyvat-wiki/resource-tools');
const {loadConfig} = require('../config/pipeline.cjs');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));

function runImport({root, temporary, outputName = 'misc-import', apply = false} = {}) {
    const config = loadConfig();
    assert(temporary && path.isAbsolute(temporary), 'An absolute extraction work directory is required');
    assert(/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(outputName), 'Invalid output folder name');
    const dataRoot = root ? path.join(root, 'data') : config.output.data;
    const manifestPath = path.join(dataRoot, 'common/misc/assets.json');
    const output = path.join(root ? path.join(root, 'src/images') : path.join(config.cache.resources, 'images'), outputName);
    assert(fs.existsSync(manifestPath), 'Awaiting data/common/misc/assets.json; no import performed');
    if (apply) assert(!fs.existsSync(output), 'Use a new output folder; selected output already exists');
    const reportFile = path.join(temporary, apply ? 'misc-images-import-report.json' : 'misc-images-import-dry-run-report.json');
    assert(!fs.existsSync(reportFile), 'Import report exists; preserve/review it before another run');
    const manifestBytes = fs.readFileSync(manifestPath), manifest = JSON.parse(manifestBytes.toString('utf8').replace(/^\uFEFF/, ''));
    const match = json(path.join(temporary, 'misc-images-match-report.json'));
    assert.equal(match.schema, 1); assert.equal(match.manifest_sha256, sha256(manifestBytes), 'Manifest changed; prepare again');
    assert(Array.isArray(manifest) && Array.isArray(match.selected_names));
    const selected = new Map(match.selected_names.map(entry => [entry.name, entry.kind]));
    const diagnostics = [], references = new Map(), records = new Map();
    let missingReferences = 0;
    for (const asset of manifest) {
        assert(asset.category === 'misc' && /^[a-z0-9_-]+$/.test(asset.id) && typeof asset.available === 'boolean', 'Invalid misc manifest');
        missingReferences++;
        const parsed = imageName(asset.name);
        const diagnostic = {id: asset.id, reference: asset.name};
        if (parsed.reason) { diagnostics.push({...diagnostic, reason: parsed.reason}); continue; }
        if (!records.has(asset.id)) {
            const file = path.join(dataRoot, 'zh_hans/misc/items', asset.id + '.json');
            records.set(asset.id, fs.existsSync(file) ? json(file) : null);
        }
        const record = records.get(asset.id);
        const used = record?.images?.filter(image => image.name === asset.name) || [];
        if (!used.length) { diagnostics.push({...diagnostic, reason: 'not_referenced_by_misc_record'}); continue; }
        // Semantic metadata only; never infer an image from an English record/name.
        if (used.every(image => /prefab|config/i.test(image.kind || ''))) {
            diagnostics.push({...diagnostic, reason: 'non_display_kind'}); continue;
        }
        if (!references.has(parsed.name)) references.set(parsed.name, []);
        references.get(parsed.name).push(diagnostic);
    }
    const wanted = new Map();
    for (const [name, refs] of references) {
        if (!['Sprite', 'Texture2D'].includes(selected.get(name))) diagnostics.push({name, reason: 'no_exact_Texture2D_or_Sprite', references: refs});
        else wanted.set(name, selected.get(name));
    }
    const imported = importResourceImages({
        directories: [['Sprite', 'misc-images-sprites-7.1'], ['Texture2D', 'misc-images-textures-7.1']]
            .map(([kind, directory]) => ({kind, directory: path.join(temporary, directory)})),
        wanted, selection: 'largest', apply, output, inputs: [manifestPath],
    });
    const images = new Map(imported.images.map(image => [image.name, image]));
    const candidates = new Map(imported.candidates.map(group => [group.name, group.images]));
    const ignoredPngs = imported.ignoredPngs;
    diagnostics.push(...imported.diagnostics);
    const summary = {mode: apply ? 'apply' : 'dry_run', missing_references: missingReferences,
        referenced_unique_names: references.size, importable_pngs: images.size, imported_pngs: imported.imported,
        ignored_unrequested_pngs: ignoredPngs, bytes: [...images.values()].reduce((sum, image) => sum + image.bytes, 0),
        diagnostics: Object.fromEntries([...new Set(diagnostics.map(item => item.reason))].sort()
            .map(reason => [reason, diagnostics.filter(item => item.reason === reason).length]))};
    assert.equal(sha256(fs.readFileSync(manifestPath)), match.manifest_sha256, 'Manifest changed during validation');
    if (apply) assert.equal(images.size, wanted.size, 'Incomplete extraction: inspect a dry-run report before importing');
    fs.writeFileSync(reportFile, JSON.stringify({schema: 1, output, manifest_sha256: match.manifest_sha256,
        summary, images: [...images.values()], candidates: [...candidates].map(([name, images]) => ({name, images})), diagnostics}, null, 2) + '\n', {flag: 'wx'});
    return summary;
}

module.exports = {imageName, crc32, validatePng, runImport};
if (require.main === module) {
    try {
        const args = process.argv.slice(2);
        const work = args.indexOf('--work'), output = args.indexOf('--output-name');
        assert(work >= 0 && args[work + 1], 'Usage: node scripts/import_misc_images.cjs --work ABSOLUTE_DIR [--output-name NAME] [--apply]');
        console.log(JSON.stringify(runImport({temporary: path.resolve(args[work + 1]),
            outputName: output >= 0 ? args[output + 1] : 'misc-import', apply: args.includes('--apply')}), null, 2));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
