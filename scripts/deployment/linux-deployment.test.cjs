'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {writeUploadFixture} = require('../testing/upload_fixture.cjs');
const {main: bundleExport} = require('./bundle-export.cjs');

test('deployment bundle uses the existing framed protocol and refuses overwrites', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-deploy-bundle-'));
    try {
        const fixture = writeUploadFixture(path.join(root, 'export'));
        const output = path.join(root, 'data.bundle');
        await bundleExport([fixture.root, output]);
        const bytes = fs.readFileSync(output), magic = Buffer.from('INTEYVAT-WIKI-DATA/1\n');
        assert(bytes.subarray(0, magic.length).equals(magic));
        const manifestLength = bytes.readUInt32BE(magic.length);
        const manifestBytes = bytes.subarray(magic.length + 4, magic.length + 4 + manifestLength);
        const manifest = JSON.parse(manifestBytes);
        const digest = createHash('sha256').update(manifestBytes).digest();
        assert(bytes.subarray(-32).equals(digest));
        assert.equal(bytes.length, magic.length + 4 + manifestLength + manifest.totalBytes + 32);
        assert.equal(JSON.parse(fs.readFileSync(output + '.json')).releaseId, digest.toString('hex'));
        await assert.rejects(bundleExport([fixture.root, output]), /must be new/);
    } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('service binds loopback and public nginx never forwards bearer credentials or writes', () => {
    const unit = fs.readFileSync(path.join(__dirname, 'inteyvat-wiki.service'), 'utf8');
    const site = fs.readFileSync(path.join(__dirname, 'inteyvat-wiki.nginx.conf'), 'utf8');
    assert.match(unit, /NITRO_HOST=127\.0\.0\.1/);
    assert.match(unit, /NITRO_PORT=4780/);
    assert.match(unit, /ReadWritePaths=\/var\/lib\/inteyvat-wiki/);
    assert.match(unit, /User=inteyvat-wiki/);
    assert.match(site, /listen 14780;/);
    assert.match(site, /location \^~ \/api\/admin\s*\{\s*return 404;/);
    assert.match(site, /limit_except GET HEAD \{ deny all; \}/);
    assert.match(site, /proxy_set_header Authorization "";/);
});

test('deployment helpers can be imported without connecting, installing or activating', () => {
    for (const file of ['linux-build.cjs', 'linux-activate.cjs', 'linux-upload-bundle.cjs'])
        assert.equal(typeof require('./' + file).main, 'function');
});
