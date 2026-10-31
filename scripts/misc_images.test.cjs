'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const {test} = require('node:test');
const {crc32, validatePng, runImport} = require('./import_misc_images.cjs');
const { run: importResources } = require('./import_miliastra_resource_images.cjs');

test('named resource plan explicitly chooses full resolution; keyed plans remain strict', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-graeae-images-'));
    try {
        const work = path.join(root, 'extraction');
        fs.mkdirSync(work);
        const image = { Name: 'UI_Test', Source: 'source.blk' };
        const plan = { schema: 1, image_selection: 'largest', inputs: [], resources: { one: { image } } };
        fs.writeFileSync(path.join(work, 'resource-plan.json'), JSON.stringify(plan));
        for (const [folder, data] of [['small', png(52, 64, 0)], ['full', png(206, 248, 9)]]) {
            const directory = path.join(work, 'source.blk_export', folder);
            fs.mkdirSync(directory, { recursive: true });
            fs.writeFileSync(path.join(directory, 'UI_Test.png'), data);
        }
        importResources(work, path.join(root, 'selected'));
        assert.equal(validatePng(fs.readFileSync(path.join(root, 'selected/UI_Test.png'))).width, 206);
        const report = JSON.parse(fs.readFileSync(path.join(work, 'validated-import.json')));
        assert.equal(report.candidates.length, 2);
        delete plan.image_selection;
        fs.writeFileSync(path.join(work, 'resource-plan.json'), JSON.stringify(plan));
        assert.throws(() => importResources(work, path.join(root, 'strict')), /Conflicting exact image/);
    } finally {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert(path.basename(root).startsWith('wiki-graeae-images-'));
        assert(!fs.lstatSync(root).isSymbolicLink());
        fs.rmSync(root, { recursive: true, force: true });
    }
});

function png(width, height, level) {
    const chunk = (name, data) => {
        const type = Buffer.from(name), bytes = Buffer.alloc(data.length + 12);
        bytes.writeUInt32BE(data.length); type.copy(bytes, 4); data.copy(bytes, 8);
        bytes.writeUInt32BE(crc32(Buffer.concat([type, data])), bytes.length - 4); return bytes;
    };
    const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
    header[8] = 8; header[9] = 6;
    return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
        chunk('IDAT', zlib.deflateSync(Buffer.alloc((width * 4 + 1) * height), {level})), chunk('IEND', Buffer.alloc(0))]);
}

test('source directories retain both same-name sprites; import chooses pixels before bytes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-misc-images-'));
    try {
        const work = path.join(root, 'tmp'), source = path.join(root, 'data/zh_hans/misc/items');
        fs.mkdirSync(work, {recursive:true}); fs.mkdirSync(source, {recursive:true});
        fs.mkdirSync(path.join(root, 'src/images/old'), {recursive:true});
        fs.mkdirSync(path.join(root, 'data/common/misc'), {recursive:true});
        const manifest = Buffer.from(JSON.stringify([{category:'misc', id:'achievement-1', name:'UI_Test', available:true}]));
        fs.writeFileSync(path.join(root, 'data/common/misc/assets.json'), manifest);
        fs.writeFileSync(path.join(source, 'achievement-1.json'), JSON.stringify({images:[{name:'UI_Test', kind:'group_icon'}]}));
        fs.writeFileSync(path.join(work, 'misc-images-match-report.json'), JSON.stringify({schema:1,
            manifest_sha256:crypto.createHash('sha256').update(manifest).digest('hex'), selected_names:[{name:'UI_Test', kind:'Sprite'}]}));
        const small = png(52, 64, 0), large = png(206, 248, 9);
        fs.writeFileSync(path.join(root, 'src/images/old/UI_Test.png'), small);
        assert(small.length > large.length, 'fixture must distinguish pixel area from file size');
        for (const [folder, bytes] of [['small.blk_export/CAB-small', small], ['large.blk_export/CAB-large', large]]) {
            const directory = path.join(work, 'misc-images-sprites-7.1/batch-0001', folder);
            fs.mkdirSync(directory, {recursive:true}); fs.writeFileSync(path.join(directory, 'UI_Test.png'), bytes);
        }
        assert.deepEqual([validatePng(large).width, validatePng(large).height], [206, 248]);
        const summary = runImport({root, temporary:work, outputName:'selected', apply:true});
        assert.equal(summary.imported_pngs, 1);
        assert.deepEqual(fs.readFileSync(path.join(root, 'src/images/selected/UI_Test.png')), large);
        assert.deepEqual(fs.readFileSync(path.join(root, 'src/images/old/UI_Test.png')), small);
        const report = JSON.parse(fs.readFileSync(path.join(work, 'misc-images-import-report.json')));
        assert.equal(report.candidates[0].images.length, 2);
        assert.equal(report.images[0].width, 206);
        assert.throws(() => runImport({root, temporary:work, outputName:'selected', apply:true}), /new output folder/);
        assert.throws(() => runImport({root, temporary:work, outputName:'../escape'}), /Invalid output/);
        const corrupt = Buffer.from(large); corrupt[40] ^= 1;
        assert.throws(() => validatePng(corrupt));
    } finally {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert(path.basename(root).startsWith('wiki-misc-images-'));
        assert(!fs.lstatSync(root).isSymbolicLink());
        fs.rmSync(root, {recursive:true, force:true});
    }
});
