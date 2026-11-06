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

test('deployment missing-image exception is explicit, reported and limited to exact absent PNG paths', async t => {
    const {missingImagePaths} = require('./verify-public.cjs');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-missing-image-test-'));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const fixture = writeUploadFixture(path.join(root, 'export'));
    const image = 'images/not-present.png', source = 'common/asset-probe.json';
    fixture.write(source, {image: '/' + image});
    const output = path.join(root, 'data.bundle');
    await assert.rejects(bundleExport([fixture.root, output]), /Missing or invalid dataset image/);
    await assert.rejects(bundleExport([fixture.root, output, '--typo']), /Usage/);
    await bundleExport([fixture.root, output, '--allow-missing-images']);
    const report = JSON.parse(fs.readFileSync(output + '.json'));
    assert.equal(report.missingImageCount, 1);
    assert.deepEqual(report.missingImages, [{source, image}]);
    assert.deepEqual(missingImagePaths(report, fs.realpathSync(fixture.root)), [image]);
    assert.throws(() => missingImagePaths({...report, allowMissingImages: false}, fixture.root));
    assert.throws(() => missingImagePaths({...report, missingImages: [{source, image: 'images/../outside.png'}]}, fixture.root));
    assert.throws(() => missingImagePaths({...report, missingImageCount: 2}, fixture.root));
    fs.writeFileSync(path.join(fixture.root, image), 'now present');
    assert.throws(() => missingImagePaths(report, fixture.root), /now exists/);
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

test('remote uploader requires an explicit valid missing-image acknowledgement', () => {
    const {missingImageCount} = require('./linux-upload-bundle.cjs');
    assert.equal(missingImageCount('0'), 0);
    assert.equal(missingImageCount('20'), 20);
    for (const value of [undefined, '', '-1', '1.5', ['20'], '9007199254740992', 'secret'])
        assert.throws(() => missingImageCount(value), /did not confirm/);
});

test('public map catalogue expectation excludes non-text records without reordering localized entries', () => {
    const {visibleMapItems} = require('./verify-public.cjs');
    const items = [{label: '', description: ''}, {label: 'Name', description: ''},
        {label: '', description: 'Description'}, {label: '', description: '', texts: [{text: 'Hidden auxiliary text'}]}];
    assert.deepEqual(visibleMapItems(items), items.slice(1, 3));
    assert.equal(items.length, 4);
});

test('public image checks distinguish omitted icons from invalid nonempty references', () => {
    const {exampleIcon} = require('./verify-public.cjs');
    for (const value of ['', null, undefined]) assert.equal(exampleIcon(value), null);
    assert.equal(exampleIcon('/images/test.png'), '/images/test.png');
    for (const value of [0, {}, '/images/../outside.png', 'https://example.invalid/image.png', '/images/test.svg'])
        assert.throws(() => exampleIcon(value), /Invalid example image path/);
});

test('exhaustive detail check covers both locales and does not accept missing or malformed details', async t => {
    const {requests, verify} = require('./verify-details.cjs');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-detail-check-'));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const fixture = writeUploadFixture(root);
    for (const category of ['tcg', 'quest_item', 'task']) fixture.write(`common/${category}/ids.json`, ['fixture']);
    const jobs = requests(root);
    assert.equal(jobs.length, 6);
    assert(jobs.some(job => job.route === '/api/archive/tcg/fixture?lang=en'));
    assert(jobs.some(job => job.route === '/api/quest-item/fixture?lang=zh_hans'));
    const report = await verify(new URL('http://127.0.0.1/'), jobs, async url => {
        if (url.pathname.includes('/quest-item/')) return new Response('{}', {status: 404});
        const name = url.pathname.includes('/task/') ? null : 'Fixture';
        return new Response(JSON.stringify({name}), {headers: {'content-type': 'application/json'}});
    });
    assert.equal(report.checked, 6); assert.equal(report.failed, 2);
    assert.equal(report.categories.task.failed, 0);
    const bad = await verify(new URL('http://127.0.0.1/'), jobs.slice(0, 1), async () =>
        new Response('{}', {headers: {'content-type': 'application/json'}}));
    assert.equal(bad.failed, 1);
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
