'use strict';
// Explicit opt-in integration against a built Wiki server, isolated to a fresh local directory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn, spawnSync} = require('node:child_process');
const {once} = require('node:events');
const {randomBytes} = require('node:crypto');
const {setTimeout: delay} = require('node:timers/promises');
const {writeUploadFixture} = require('./testing/upload_fixture.cjs');
const {buildManifest, uploadPlan, validateDataset} = require('./upload_data.cjs');

async function main() {
    if (process.argv.length !== 4 || process.argv[2] !== '--server-entry')
        throw new Error('Usage: npm run check:upload:integration -- --server-entry <Wiki/.output/server/index.mjs>');
    const entry = path.resolve(process.argv[3]);
    if (!fs.statSync(entry).isFile()) throw new Error('Built server entry does not exist');
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-upload-integration-'));
    let child, exit;
    try {
        const fixture = writeUploadFixture(path.join(temp, 'export'));
        const base = path.join(temp, 'server-data'); // First publication must work without a legacy data directory.
        const token = randomBytes(32).toString('hex');
        const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
        const port = probe.address().port;
        await new Promise(resolve => probe.close(resolve));
        const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(WIKI_|NITRO_|NUXT_)/i.test(key)));
        child = spawn(process.execPath, [entry], {cwd: path.dirname(entry), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: {
            ...env, NODE_ENV: 'production', NITRO_HOST: '127.0.0.1', NITRO_PORT: String(port),
            WIKI_DATA_ROOT: base, WIKI_UPLOAD_TOKEN: token,
        }});
        // Drain without printing server output, which can contain deployment-specific configuration.
        child.stdout.resume(); child.stderr.resume();
        exit = once(child, 'exit');
        let startError; child.on('error', error => { startError = error; });
        const origin = `http://127.0.0.1:${port}`, url = `${origin}/api/admin/data`;
        const headers = {Authorization: `Bearer ${token}`};
        const get = (route, options = {}) => fetch(`${origin}${route}`, {...options, redirect: 'error', signal: AbortSignal.timeout(5000)});
        let ready = false;
        for (let attempt = 0; attempt < 200; attempt++) {
            if (startError || child.exitCode !== null) throw new Error('Built Wiki server could not start');
            try { if ((await get('/api/admin/data')).status === 401) { ready = true; break; } } catch { /* startup */ }
            await delay(100);
        }
        assert(ready, 'Built server did not become ready');
        assert.equal(fs.existsSync(`${base}.publish`), false, 'Unauthenticated requests must not create a store');
        assert.equal((await (await get('/api/admin/data', {headers})).json()).releaseId, null);
        validateDataset(fixture.root);
        const first = await buildManifest(fixture.root);
        const options = {url, timeoutMs: 30000};
        assert.equal((await uploadPlan(first, options, {WIKI_UPLOAD_TOKEN: token})).releaseId, first.releaseId);
        assert.equal(fs.existsSync(base), false, 'Publishing must not mutate the exporter/legacy directory');
        assert.deepEqual(await (await get('/api/menu')).json(), JSON.parse(fs.readFileSync(path.join(fixture.root, 'common/menu.json'))));
        assert.equal((await get('/api/map/task_dependencies')).status, 200);
        const image = await get('/images/test.png'); assert.equal(image.status, 200);
        assert.deepEqual(Buffer.from(await image.arrayBuffer()), fs.readFileSync(path.join(fixture.root, 'images/test.png')));
        const config = path.join(temp, 'pipeline.json');
        fs.writeFileSync(config, JSON.stringify({version: 1, output: {data: fixture.root}, upload: {url}}));
        const cli = spawnSync(process.execPath, [path.join(__dirname, 'pipeline.cjs'), 'upload', '--apply', '--config', config], {
            cwd: temp, windowsHide: true, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
            env: {...env, WIKI_UPLOAD_TOKEN: token},
        });
        assert.equal(cli.status, 0, 'The configured upload CLI must also publish successfully');
        assert.equal(JSON.parse(cli.stdout).releaseId, first.releaseId, 'Identical publications are safe');
        fs.copyFileSync(path.join(fixture.root, 'images/test.png'), path.join(fixture.root, 'images/next.png'));
        fixture.write('common/menu.json', {character: {icon: '/images/next.png'}, weapon: {icon: '/images/next.png'}, artifact: {icon: '/images/next.png'}});
        const next = await buildManifest(fixture.root);
        assert.notEqual(next.releaseId, first.releaseId);
        await uploadPlan(next, options, {WIKI_UPLOAD_TOKEN: token});
        assert.equal((await (await get('/api/menu')).json()).character.icon, '/images/next.png');
        assert.equal((await get('/images/next.png')).status, 200);
        assert(fs.existsSync(path.join(`${base}.publish`, 'releases', first.releaseId)), 'Old release is retained');
        assert.equal((await (await get('/api/admin/data', {headers})).json()).releaseId, next.releaseId);
        console.log('Built-server upload integration passed: first publication, auth, JSON/images/maps, configured CLI repeat and next release. Synthetic data only.');
    } finally {
        if (child && child.exitCode === null) { child.kill(); await exit; }
        assert.equal(path.dirname(temp), os.tmpdir());
        fs.rmSync(temp, {recursive: true, force: true});
    }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
