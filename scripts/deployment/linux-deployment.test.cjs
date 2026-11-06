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
    assert.match(unit, /UV_THREADPOOL_SIZE=32/);
    assert.match(unit, /ReadWritePaths=\/var\/lib\/inteyvat-wiki/);
    assert.match(unit, /User=inteyvat-wiki/);
    assert.match(site, /listen 14780;/);
    assert.match(site, /location \^~ \/api\/admin\s*\{\s*return 404;/);
    assert.match(site, /limit_except GET HEAD \{ deny all; \}/);
    assert.match(site, /proxy_set_header Authorization "";/);
});

test('deployment helpers can be imported without connecting, installing or activating', () => {
    for (const file of ['linux-build.cjs', 'linux-activate.cjs', 'linux-upload-bundle.cjs', 'verify-public.cjs'])
        assert.equal(typeof require('./' + file).main, 'function');
});

test('remote uploader reports fixed validation messages without echoing arbitrary response content', () => {
    const {publicError} = require('./linux-upload-bundle.cjs');
    assert.equal(publicError(JSON.stringify({message: 'Missing or invalid dataset image'})), ' (Missing or invalid dataset image)');
    assert.equal(publicError(JSON.stringify({message: 'secret-token-or-path'})), '');
    assert.equal(publicError(JSON.stringify({message: 'File checksum mismatch', data: 'secret-token-or-path'})), ' (File checksum mismatch)');
    assert.equal(publicError('not JSON'), '');
});

test('test-only sample adapter preserves verified bytes, rejects failed/tampered runs and leaves other categories empty', t => {
    // Synthetic unit fixture ONLY: never used for the real deployment run.
    const {main: sampleRelease} = require('./sample-release.cjs');
    const {PNG} = require('pngjs');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-sample-adapter-test-'));
    t.after(() => fs.rmSync(root, {recursive: true}));
    const run = path.join(root, 'run'), data = path.join(run, 'output/data'), id = 'unit-test-only';
    const write = (relative, value) => {
        const file = path.join(run, relative); fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, Buffer.isBuffer(value) ? value : JSON.stringify(value));
    };
    const icon = `/images/outfit/${id}/icon.png`;
    const item = {name: 'Synthetic unit fixture', type: 'glider', description: '', story: null, sources: [],
        character: null, weapon_type: null, is_default: false, icon, images: [{kind: 'icon', url: icon}]};
    write('input/lock.json', {});
    const lockSha256 = createHash('sha256').update(fs.readFileSync(path.join(run, 'input/lock.json'))).digest('hex');
    write('host-state.json', {id, lockSha256});
    write('exec-response.json', {ExitCode: 0});
    const result = {schema: 1, id, lockSha256, mode: 'smoke', productionReady: false, status: 'failed', versions: false};
    write('output/result.json', result);
    assert.throws(() => sampleRelease([run, path.join(root, 'failed'), '--test-only']), /passed real/);
    assert.throws(() => sampleRelease([run, path.join(root, 'implicit')]), /test-only/);
    result.status = 'passed'; write('output/result.json', result);
    write('exec-response.json', {ExitCode: 1});
    assert.throws(() => sampleRelease([run, path.join(root, 'launcher-failed'), '--test-only']), /successful guest launcher/);
    write('exec-response.json', {ExitCode: 0});
    write('output/data/common/image-requests.json', {schema: 1, names: ['fixture-image']});
    write('output/data/common/outfit/assets.json', [{id, name: 'fixture-image', kind: 'icon'}]);
    write('output/data/common/outfit/ids.json', [id]);
    for (const lang of ['en', 'zh_hans']) {
        write(`output/data/${lang}/outfit/items/${id}.json`, item);
        write(`output/data/${lang}/outfit/pages.json`, [{id, name: item.name, icon, star: null, type: 'glider', description: '',
            character: null, weapon_type: null, is_default: false, show: true, items: [id], related_items: []}]);
    }
    write(`output/data${icon}`, PNG.sync.write(new PNG({width: 1, height: 1})));
    const files = require('../upload_data.cjs').inventory(data);
    const outputs = files.map(file => ({path: file.path, bytes: file.stat.size,
        sha256: createHash('sha256').update(fs.readFileSync(file.file)).digest('hex')}));
    write('output/provenance/outputs.json', outputs);
    const destination = path.join(root, 'test-export');
    const report = sampleRelease([run, destination, '--test-only']);
    assert.equal(report.productionReady, false);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(destination, 'common/character/ids.json'))), []);
    for (const file of files) assert(fs.readFileSync(file.file).equals(fs.readFileSync(path.join(destination, file.path))));
    assert.throws(() => sampleRelease([run, destination, '--test-only']), /must be new/);
    fs.appendFileSync(path.join(data, 'common/outfit/ids.json'), ' ');
    assert.throws(() => sampleRelease([run, path.join(root, 'tampered'), '--test-only']));
    assert(!fs.existsSync(path.join(root, 'tampered')));
});
