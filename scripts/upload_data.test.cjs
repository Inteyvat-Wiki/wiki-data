'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const contract = require('@inteyvat-wiki/wiki-contracts/upload');
const {endpoint, buildManifest, bundle, uploadPlan, validateDataset, publish} = require('./upload_data.cjs');
const {loadConfig} = require('../config/pipeline.cjs');
const {writeUploadFixture} = require('./testing/upload_fixture.cjs');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-upload-client-'));
    t.after(() => { assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, {recursive: true, force: true}); });
    return writeUploadFixture(root);
}
async function server(t, handler) {
    const instance = http.createServer(handler);
    await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => { instance.close(resolve); instance.closeAllConnections(); }));
    return `http://127.0.0.1:${instance.address().port}/api/admin/data`;
}
function response(res, data, status = 200) { res.writeHead(status, {'content-type': 'application/json'}); res.end(JSON.stringify(data)); }
const token = crypto.randomBytes(32).toString('hex');

test('endpoint accepts HTTPS and loopback only; credentials and redirects cannot become token destinations', () => {
    assert.equal(endpoint('https://example.invalid/api/admin/data').protocol, 'https:');
    for (const value of ['http://example.invalid/api/admin/data', 'https://user:secret@example.invalid/api/admin/data',
        'https://example.invalid/api/admin/data?token=x', 'https://example.invalid/api/admin/data#secret', 'file:///secret', 'https://example.invalid/api/other']) assert.throws(() => endpoint(value));
});
test('config stores only an environment variable name, never a token value', t => {
    const f = fixture(t), file = path.join(f.root, 'settings.json');
    fs.writeFileSync(file, JSON.stringify({version: 1, upload: {url: 'https://example.invalid/api/admin/data', tokenEnv: 'PUBLISH_SECRET'}}));
    const config = loadConfig({file, env: {PUBLISH_SECRET: token}});
    assert.equal(config.upload.tokenEnv, 'PUBLISH_SECRET'); assert(!JSON.stringify(config).includes(token));
    fs.writeFileSync(file, JSON.stringify({version: 1, upload: {token}}));
    assert.throws(() => loadConfig({file, env: {}}), /Unknown upload.token/);
});
test('complete export validates and dry-run hashes files without an HTTP request or token', async t => {
    const f = fixture(t); validateDataset(f.root);
    const result = await publish({output: {data: f.root}, upload: {url: 'https://example.invalid/api/admin/data'}}, false);
    assert.equal(result.mode, 'preview'); assert(result.files > 50); assert.match(result.releaseId, /^[a-f0-9]{64}$/);
});
test('wire representation preserves exact byte order, hashes, lengths and final manifest digest', async t => {
    const f = fixture(t), plan = await buildManifest(f.root), chunks = [];
    for await (const chunk of bundle(plan)) chunks.push(chunk);
    const bytes = Buffer.concat(chunks), magic = Buffer.from(contract.DATA_UPLOAD_MAGIC);
    assert.deepEqual(bytes.subarray(0, magic.length), magic);
    const length = bytes.readUInt32BE(magic.length), manifest = JSON.parse(bytes.subarray(magic.length + 4, magic.length + 4 + length));
    let offset = magic.length + 4 + length;
    for (const file of manifest.files) {
        const content = bytes.subarray(offset, offset + file.size); offset += file.size;
        assert.equal(crypto.createHash('sha256').update(content).digest('hex'), file.sha256);
        assert.deepEqual(content, fs.readFileSync(path.join(f.root, file.path)));
    }
    assert.equal(bytes.length, offset + 32); assert.equal(bytes.subarray(offset).toString('hex'), plan.releaseId);
});
test('changed input, forbidden files, incomplete export and symlinks fail before committing a bundle', async t => {
    const f = fixture(t), plan = await buildManifest(f.root);
    f.write('common/menu.json', {changed: true});
    await assert.rejects(async () => { for await (const ignored of bundle(plan)) void ignored; }, /changed/);
    fs.writeFileSync(path.join(f.root, 'secrets.env'), token);
    await assert.rejects(buildManifest(f.root), /not publishable/); fs.unlinkSync(path.join(f.root, 'secrets.env'));
    fs.unlinkSync(path.join(f.root, 'en/map/scenes.json'));
    await assert.rejects(buildManifest(f.root), /manifest/i);
    fs.symlinkSync(path.join(f.root, 'images'), path.join(f.root, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(buildManifest(f.root), /Symlink/);
});
test('a file edited after it was streamed prevents the final commit trailer', async t => {
    const f = fixture(t), plan = await buildManifest(f.root), chunks = [];
    const secondFileStarts = Buffer.byteLength(contract.DATA_UPLOAD_MAGIC) + 4 + plan.manifestBytes.length + plan.manifest.files[0].size;
    let received = 0, changed = false;
    await assert.rejects(async () => {
        for await (const chunk of bundle(plan)) {
            chunks.push(chunk); received += chunk.length;
            if (!changed && received > secondFileStarts) {
                changed = true; fs.appendFileSync(plan.entries[0].file, ' ');
            }
        }
    }, /changed/);
    assert(changed);
    assert(received <= Buffer.byteLength(contract.DATA_UPLOAD_MAGIC) + 4 + plan.manifestBytes.length + plan.manifest.totalBytes);
});
test('growing files cannot impersonate the completion trailer, even across chunk boundaries', async t => {
    for (const size of [128 * 1024, 128 * 1024 + 8]) {
        const f = fixture(t), lastFile = path.join(f.root, 'zh_hans/weapon/pages.json');
        fs.writeFileSync(lastFile, '[]' + ' '.repeat(size - 2));
        const plan = await buildManifest(f.root);
        assert.equal(plan.entries.at(-1).file, lastFile);
        const payloadEnd = Buffer.byteLength(contract.DATA_UPLOAD_MAGIC) + 4 + plan.manifestBytes.length + plan.manifest.totalBytes;
        const lastFileStart = payloadEnd - size;
        let received = 0, changed = false;
        await assert.rejects(async () => {
            for await (const chunk of bundle(plan)) {
                received += chunk.length;
                if (!changed && received > lastFileStart) {
                    changed = true;
                    fs.appendFileSync(lastFile, Buffer.from(plan.releaseId, 'hex'));
                }
            }
        }, /changed/);
        assert(changed);
        assert(received <= payloadEnd, 'No file suffix may escape as trailer bytes');
    }
});

test('authenticated status + streaming POST use expected release and verify exact receipt', async t => {
    const f = fixture(t), plan = await buildManifest(f.root), methods = [];
    let total = 0;
    const url = await server(t, (req, res) => {
        methods.push(req.method); assert.equal(req.headers.authorization, `Bearer ${token}`);
        if (req.method === 'GET') response(res, {schema: 1, releaseId: null, limits: contract.DEFAULT_UPLOAD_LIMITS});
        else {
            assert.equal(req.headers['x-wiki-base-release'], 'none');
            assert.equal(req.headers['content-type'], contract.DATA_UPLOAD_CONTENT_TYPE);
            req.on('data', chunk => {total += chunk.length;});
            req.on('end', () => response(res, {schema: 1, releaseId: plan.releaseId, fileCount: plan.manifest.files.length, totalBytes: plan.manifest.totalBytes}, 201));
        }
    });
    const result = await uploadPlan(plan, {url, timeoutMs: 5000}, {WIKI_UPLOAD_TOKEN: token});
    assert.equal(result.releaseId, plan.releaseId); assert.deepEqual(methods, ['GET', 'POST']);
    assert.equal(total, Buffer.byteLength(contract.DATA_UPLOAD_MAGIC) + 4 + plan.manifestBytes.length + plan.manifest.totalBytes + 32);
});
test('completed POST disables network idle timeout but retains the absolute deadline', async t => {
    const f = fixture(t), plan = await buildManifest(f.root), deadlines = [];
    const original = http.request;
    t.mock.method(http, 'request', function (...args) {
        const request = original.apply(this, args), setTimeout = request.setTimeout;
        request.setTimeout = function (ms, callback) {
            deadlines.push([args[1].method, ms]);
            return setTimeout.call(this, ms, callback);
        };
        return request;
    });
    let completed = false;
    const url = await server(t, (req, res) => {
        if (req.method === 'GET') response(res, {schema: 1, releaseId: null, limits: contract.DEFAULT_UPLOAD_LIMITS});
        else { req.resume(); req.on('end', () => {completed = true;}); }
    });
    await assert.rejects(uploadPlan(plan, {url, timeoutMs: 400}, {WIKI_UPLOAD_TOKEN: token}), /total timeout/);
    assert(completed, 'The full request arrived before the bounded wait for a receipt');
    assert.deepEqual(deadlines.filter(([method]) => method === 'POST').map(([, ms]) => ms), [400, 0]);
    assert(!deadlines.some(([method, ms]) => method === 'GET' && ms === 0));
});

test('HTTP rejection/redirect is not followed, and response errors never echo secrets', async t => {
    const f = fixture(t), plan = await buildManifest(f.root);
    for (const status of [401, 302, 409]) {
        let calls = 0;
        const url = await server(t, (req, res) => { calls++; res.setHeader('location', 'https://example.invalid/api/admin/data'); response(res, {error: token}, status); });
        await assert.rejects(uploadPlan(plan, {url, timeoutMs: 2000}, {WIKI_UPLOAD_TOKEN: token}), error => error.message.includes(`HTTP ${status}`) && !error.message.includes(token));
        assert.equal(calls, 1);
    }
});
test('server limits prevent POST and changed receipt is not reported as a successful publication', async t => {
    const f = fixture(t), plan = await buildManifest(f.root); let calls = 0;
    const limited = await server(t, (req, res) => {calls++; response(res, {schema: 1, releaseId: null, limits: {...contract.DEFAULT_UPLOAD_LIMITS, maxTotalBytes: 1}});});
    await assert.rejects(uploadPlan(plan, {url: limited, timeoutMs: 3000}, {WIKI_UPLOAD_TOKEN: token}), /limits|incompatible/);
    assert.equal(calls, 1);
    const wrong = await server(t, (req, res) => {
        if (req.method === 'GET') response(res, {schema: 1, releaseId: null, limits: contract.DEFAULT_UPLOAD_LIMITS});
        else {req.resume(); req.on('end', () => response(res, {schema: 1, releaseId: 'a'.repeat(64), fileCount: 1, totalBytes: 1}));}
    });
    await assert.rejects(uploadPlan(plan, {url: wrong, timeoutMs: 3000}, {WIKI_UPLOAD_TOKEN: token}), /exact published/);
});
test('missing token does not contact the server; responses and timeouts are bounded', async t => {
    const f = fixture(t), plan = await buildManifest(f.root); let requests = 0;
    const slow = await server(t, () => {requests++;});
    await assert.rejects(uploadPlan(plan, {url: slow, timeoutMs: 100}, {}), /WIKI_UPLOAD_TOKEN/);
    assert.equal(requests, 0);
    await assert.rejects(uploadPlan(plan, {url: slow, timeoutMs: 100}, {WIKI_UPLOAD_TOKEN: token}), /timeout|timed out/);
    const huge = await server(t, (req, res) => {res.end('x'.repeat(70000));});
    await assert.rejects(uploadPlan(plan, {url: huge, timeoutMs: 1000}, {WIKI_UPLOAD_TOKEN: token}), /exceeded/);
});
