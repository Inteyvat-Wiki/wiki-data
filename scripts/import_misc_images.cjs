'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const ROOT = path.resolve(__dirname, '..');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));

function imageName(value) {
    if (typeof value !== 'string' || !value.trim()) return {reason: 'invalid_name'};
    const name = value.replaceAll('\\', '/').split('/').at(-1).replace(/\.(png|tga|jpg|jpeg)$/i, '');
    if (/^\d+$/.test(name) || /^(?:0x[0-9a-f]+|[0-9a-f]{16})$/i.test(name)) {
        return {name, reason: 'numeric_or_hash_not_resolved'};
    }
    if (!name || /[<>:"/\\|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) || name.length > 180
        || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) return {name, reason: 'unsafe_filename'};
    return {name};
}

const crcTable = Array.from({length: 256}, (_, n) => {
    for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
});
function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

// Validate full PNG structure, CRCs, zlib stream, scanline lengths and filter bytes.
// Bound memory and reject damaged/header-only/oversized files instead of importing them.
function validatePng(bytes) {
    assert(bytes.length <= 64 * 1024 * 1024, 'PNG exceeds 64 MiB safety limit');
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'not PNG');
    let offset = 8, width, height, depth, color, interlace, ended = false, palette = false, idatEnded = false;
    const idat = [];
    while (offset < bytes.length) {
        assert(offset + 12 <= bytes.length, 'truncated chunk');
        const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
        assert(end <= bytes.length, 'truncated chunk data');
        const type = bytes.toString('ascii', offset + 4, offset + 8);
        assert(/^[A-Za-z]{4}$/.test(type), 'invalid chunk type');
        assert.equal(crc32(bytes.subarray(offset + 4, end - 4)), bytes.readUInt32BE(end - 4), 'bad PNG CRC');
        const data = bytes.subarray(offset + 8, end - 4);
        if (offset === 8) assert.equal(type, 'IHDR', 'IHDR must be first');
        if (type === 'IHDR') {
            assert.equal(offset, 8, 'duplicate IHDR'); assert.equal(length, 13);
            width = data.readUInt32BE(0); height = data.readUInt32BE(4);
            depth = data[8]; color = data[9]; interlace = data[12];
            assert(width > 0 && height > 0 && width <= 16384 && height <= 16384, 'invalid/oversized dimensions');
            assert(({0: [1,2,4,8,16], 2: [8,16], 3: [1,2,4,8], 4: [8,16], 6: [8,16]})[color]?.includes(depth), 'bad color/depth');
            assert(data[10] === 0 && data[11] === 0 && interlace <= 1, 'unsupported PNG encoding');
        } else if (type === 'PLTE') {
            assert(!palette && !idat.length && length > 0 && length <= 768 && length % 3 === 0, 'invalid palette');
            assert(color !== 0 && color !== 4, 'palette in grayscale PNG');
            if (color === 3) assert(length / 3 <= 2 ** depth, 'palette too large');
            palette = true;
        } else if (type === 'IDAT') {
            assert(!idatEnded, 'non-contiguous IDAT'); idat.push(data);
        } else if (type === 'IEND') {
            assert.equal(length, 0); assert.equal(end, bytes.length, 'trailing bytes'); ended = true;
        } else {
            assert(type[0] === type[0].toLowerCase(), `unknown critical chunk ${type}`);
        }
        if (idat.length && type !== 'IDAT') idatEnded = true;
        offset = end;
    }
    assert(ended && idat.length && (color !== 3 || palette), 'missing PNG chunks');
    const channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color];
    const passes = interlace ? [[0,0,8,8], [4,0,8,8], [0,4,4,8], [2,0,4,4], [0,2,2,4], [1,0,2,2], [0,1,1,2]] : [[0,0,1,1]];
    const rows = passes.map(([x,y,dx,dy]) => {
        const w = Math.max(0, Math.ceil((width - x) / dx)), h = Math.max(0, Math.ceil((height - y) / dy));
        return {stride: Math.ceil(w * channels * depth / 8) + 1, count: w ? h : 0};
    });
    const expected = rows.reduce((sum, row) => sum + row.stride * row.count, 0);
    assert(expected > 0 && expected <= 128 * 1024 * 1024, 'decoded PNG exceeds safety limit');
    const decoded = zlib.inflateSync(Buffer.concat(idat), {maxOutputLength: expected});
    assert.equal(decoded.length, expected, 'bad scanline length');
    let cursor = 0;
    for (const row of rows) for (let i = 0; i < row.count; i++, cursor += row.stride) {
        assert(decoded[cursor] <= 4, 'bad PNG row filter');
    }
    return {width, height, bytes: bytes.length, sha256: sha256(bytes)};
}

function* files(directory) {
    if (!fs.existsSync(directory)) return;
    assert(!fs.lstatSync(directory).isSymbolicLink(), 'symlink input directory refused');
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) yield* files(full);
        else if (entry.isFile()) yield full; // Never follow symlinks/junctions.
    }
}

function runImport({root = ROOT, temporary, outputName = 'misc-7.1-reextract', apply = false} = {}) {
    assert(temporary && path.isAbsolute(temporary), 'An absolute extraction work directory is required');
    assert(/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(outputName), 'Invalid output folder name');
    const manifestPath = path.join(root, 'data/common/misc/assets.json');
    const output = path.join(root, 'src/images', outputName);
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
            const file = path.join(root, 'data/zh_hans/misc/items', asset.id + '.json');
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
    const images = new Map(), candidates = new Map();
    let ignoredPngs = 0;
    for (const [kind, directory] of [['Sprite', 'misc-images-sprites-7.1'], ['Texture2D', 'misc-images-textures-7.1']]) {
        for (const file of files(path.join(temporary, directory))) {
            if (!/\.png$/i.test(file)) continue;
            const name = path.parse(file).name;
            if (wanted.get(name) !== kind) { ignoredPngs++; continue; }
            try {
                assert(fs.statSync(file).size <= 64 * 1024 * 1024, 'PNG exceeds safety limit');
                const value = {name, kind, file, ...validatePng(fs.readFileSync(file))};
                const previous = images.get(name);
                if (!candidates.has(name)) candidates.set(name, []);
                candidates.get(name).push(value);
                // Preserve all candidates in the work directory; select resolution,
                // then encoded size, then path for a deterministic tie-break.
                if (!previous || value.width * value.height > previous.width * previous.height
                    || value.width * value.height === previous.width * previous.height && (value.bytes > previous.bytes
                        || value.bytes === previous.bytes && value.file < previous.file)) images.set(name, value);
            } catch (error) { diagnostics.push({name, reason: 'invalid_png', file, detail: error.message}); }
        }
    }
    for (const [name, kind] of wanted) {
        if (!images.has(name)) diagnostics.push({name, reason: 'missing_valid_selected_png', kind});
    }
    const summary = {mode: apply ? 'apply' : 'dry_run', missing_references: missingReferences,
        referenced_unique_names: references.size, importable_pngs: images.size, imported_pngs: 0,
        ignored_unrequested_pngs: ignoredPngs, bytes: [...images.values()].reduce((sum, image) => sum + image.bytes, 0),
        diagnostics: Object.fromEntries([...new Set(diagnostics.map(item => item.reason))].sort()
            .map(reason => [reason, diagnostics.filter(item => item.reason === reason).length]))};
    assert.equal(sha256(fs.readFileSync(manifestPath)), match.manifest_sha256, 'Manifest changed during validation');
    if (apply) assert.equal(images.size, wanted.size, 'Incomplete extraction: inspect a dry-run report before importing');
    if (apply && images.size) {
        // Exclusive mkdir plus COPYFILE_EXCL: never merge into or overwrite an earlier import.
        fs.mkdirSync(output);
        for (const [name, image] of images) {
            assert.equal(sha256(fs.readFileSync(image.file)), image.sha256, 'PNG changed after validation');
            fs.copyFileSync(image.file, path.join(output, name + '.png'), fs.constants.COPYFILE_EXCL);
            summary.imported_pngs++;
        }
    }
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
            outputName: output >= 0 ? args[output + 1] : 'misc-7.1-reextract', apply: args.includes('--apply')}), null, 2));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
