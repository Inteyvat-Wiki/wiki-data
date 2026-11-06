'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const common = require('./sandbox-common.cjs');
const host = require('./sandbox.cjs');
const guest = require('./sandbox-guest.cjs');

const HASH = 'a'.repeat(64), SHA = 'b'.repeat(40);
function fixture() {
    const tool = (url, version) => ({url, version, sha256: HASH});
    return {schema: 1, memoryMB: 4096, tools: {
        node: {...tool('https://nodejs.org/dist/v24.22.2/node-v24.22.2-win-x64.zip', '24.22.2'), root: 'node-v24.22.2-win-x64'},
        git: {...tool('https://github.com/git-for-windows/git/releases/download/v2.53.0.windows.1/MinGit-2.53.0-64-bit.zip', '2.53.0.windows.1'),
            releaseTag: 'v2.53.0.windows.1', assetId: 677312705, assetName: 'MinGit-2.53.0-64-bit.zip', bytes: 4},
        dotnetSdk: tool('https://builds.dotnet.microsoft.com/dotnet/Sdk/8.0.100/dotnet-sdk-8.0.100-win-x64.zip', '8.0.100'),
        dotnetRuntime: tool('https://builds.dotnet.microsoft.com/dotnet/Runtime/10.0.0/dotnet-runtime-10.0.0-win-x64.zip', '10.0.0'),
        animeStudio: {url: 'https://nightly.link/Escartem/AnimeStudio/actions/runs/123/AnimeStudio-net10.zip', sha256: HASH,
            runId: 123, runAttempt: 1, artifactId: 456, commit: SHA},
    }, repositories: Object.fromEntries(['wikiData', 'tools', 'contracts', 'provider', 'db', 'source'].map(name =>
        [name, {url: `https://github.com/example/${name}.git`, commit: SHA}])),
    job: {mode: 'smoke', versions: false, ids: [140001], requireImages: false}};
}
function temporary(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'inteyvat-sandbox-test-'));
    t.after(() => {
        const actual = fs.realpathSync(directory), base = fs.realpathSync(os.tmpdir());
        assert(actual.startsWith(base + path.sep) && path.basename(actual).startsWith('inteyvat-sandbox-test-'));
        fs.rmSync(actual, {recursive: true, force: true}); // Only this test's validated, newly allocated directory.
    });
    return directory;
}
function manifest(t) {
    const directory = temporary(t), file = path.join(directory, 'lock.json');
    common.writeJSON(file, fixture()); return {directory, file};
}
function mockWSB({existing = false, failShare = false, failStart = false} = {}) {
    const calls = []; let ids = existing ? ['11111111-1111-1111-1111-111111111111'] : [];
    const call = async args => {
        calls.push(args);
        const id = args[args.indexOf('--id') + 1];
        if (args[0] === 'list') return {WindowsSandboxEnvironments: ids.map(Id => ({Id}))};
        if (args[0] === 'start') { if (failStart) throw new Error('Uncertain start'); ids.push(id); return {Id: id}; }
        if (args[0] === 'share' && failShare) throw new Error('Sharing failed');
        if (args[0] === 'stop') { assert(ids.includes(id)); ids = ids.filter(value => value !== id); }
        return {};
    };
    return {calls, call};
}

test('explicit fixed lock is accepted, latest/credentials/unknown keys are rejected', () => {
    assert.equal(common.validateLock(fixture()).tools.node.version, '24.22.2');
    const invalid = [
        lock => {lock.tools.node.version = 'latest';},
        lock => {lock.tools.node.sha256 = '0'.repeat(64);},
        lock => {lock.repositories.source.commit = 'main';},
        lock => {lock.repositories.source.url = 'https://user:password@github.com/example/source';},
        lock => {lock.tools.animeStudio.url = 'https://nightly.link/Escartem/AnimeStudio/workflows/build/master/AnimeStudio-net10.zip';},
        lock => {lock.tools.animeStudio.runAttempt = 0;},
        lock => {lock.tools.animeStudio.version = '0.1.0';},
        lock => {lock.upload = {token: 'do-not-forward'};},
        lock => {lock.job.command = 'arbitrary shell command';},
        lock => {lock.tools.git.url += '?token=do-not-forward';},
    ];
    for (const change of invalid) { const lock = fixture(); change(lock); assert.throws(() => common.validateLock(lock)); }
});

test('Git proxy is optional and accepts only explicit RFC1918 IPv4 endpoints', () => {
    assert.equal(common.validateLock(fixture()).network, undefined);
    const empty = fixture(); empty.network = {}; common.validateLock(empty);
    for (const gitProxy of ['http://10.0.0.1:1', 'http://10.255.255.254:65535', 'http://172.16.0.1:80',
        'http://172.31.112.1:49187', 'http://192.168.0.1:8080', 'http://192.168.255.254:3128']) {
        const lock = fixture(); lock.network = {gitProxy};
        assert.equal(common.gitProxyURL(gitProxy), gitProxy);
        assert.equal(common.validateLock(lock).network.gitProxy, gitProxy);
    }
});

test('Git proxy rejects credentials, paths, query, fragments and invalid hosts or ports', () => {
    for (const gitProxy of [null, true, 8080, {}, '',
        'http://user:password@172.31.112.1:49187', 'http://user@172.31.112.1:49187',
        'http://:password@172.31.112.1:49187', 'http://@172.31.112.1:49187',
        'http://172.31.112.1:49187/', 'http://172.31.112.1:49187/path', 'http://172.31.112.1:49187/..',
        'http://172.31.112.1:49187?token=hidden', 'http://172.31.112.1:49187?',
        'http://172.31.112.1:49187#fragment', 'http://172.31.112.1:49187#',
        'https://172.31.112.1:49187', 'socks5://172.31.112.1:49187',
        'http://0.0.0.0:49187', 'http://127.0.0.1:49187', 'http://127.1.2.3:49187',
        'http://8.8.8.8:49187', 'http://169.254.1.1:49187', 'http://100.64.0.1:49187',
        'http://172.15.255.255:49187', 'http://172.32.0.1:49187', 'http://192.169.0.1:49187',
        'http://localhost:49187', 'http://relay.example:49187', 'http://[::1]:49187',
        'http://[::ffff:172.31.112.1]:49187', 'http://10.256.0.1:49187', 'http://10.1:49187',
        'http://010.0.0.1:49187', 'http://0x0a000001:49187', 'http://167772161:49187',
        'http://172.31.112.1', 'http://172.31.112.1:', 'http://172.31.112.1:0',
        'http://172.31.112.1:65536', 'http://172.31.112.1:-1', 'http://172.31.112.1:abc',
        'http://172.31.112.1:49187.0', 'http://172.31.112.1:049187',
        ' http://172.31.112.1:49187', 'http://172.31.112.1:49187\n', 'http://172.31.112.1:49187\t']) {
        const lock = fixture(); lock.network = {gitProxy};
        assert.throws(() => common.validateLock(lock), /network\.gitProxy/, JSON.stringify(gitProxy));
    }
    for (const network of [null, [], 'http://172.31.112.1:49187', {httpProxy: 'http://172.31.112.1:49187'},
        {gitProxy: 'http://172.31.112.1:49187', npmProxy: 'http://172.31.112.1:49187'}]) {
        const lock = fixture(); lock.network = network;
        assert.throws(() => common.validateLock(lock), /network/);
    }
});

test('all repository Git commands use only the explicit per-command proxy, with defaults unchanged', async t => {
    const directory = temporary(t), git = 'test-only-git.exe';
    const repo = {...fixture().repositories.source, history: ['c'.repeat(40), 'd'.repeat(40)]};
    let number = 0;
    for (const network of [undefined, {}, {gitProxy: 'http://172.31.112.1:49187'}]) for (const history of [false, true]) {
        const destination = path.join(directory, String(++number)), calls = [];
        const retry = Boolean(network?.gitProxy && history);
        const run = async (...args) => {
            calls.push(args);
            if (retry && args[0] === 'source-fetch')
                throw Object.assign(new Error('simulated connection reset'), {exitCode: 128, outputTail: 'Recv failure: Connection was reset'});
            return args[0] === 'source-identity' ? repo.commit + '\n' : 'false\n';
        };
        await guest.fetchRepository(run, git, 'source', repo, destination, history, network);
        const commands = [
            ['init', ['init', '--quiet']], ['remote', ['remote', 'add', 'origin', repo.url]],
            ['fetch', guest.sourceFetchArgs(repo, history)],
            ...(retry ? [['fetch-retry-2', guest.sourceFetchArgs(repo, history)]] : []),
            ['checkout', ['checkout', '--detach', repo.commit]], ['identity', ['rev-parse', 'HEAD']],
            ...(history ? [['history', ['rev-parse', '--is-shallow-repository']],
                ...repo.history.map(hash => ['history-endpoint', ['cat-file', '-e', hash + '^{commit}']])] : []),
        ];
        const proxyArgs = network?.gitProxy ? ['-c', 'http.proxy=' + network.gitProxy] : [];
        assert.deepEqual(calls, commands.map(([step, args]) => [`source-${step}`, git,
            ['-c', 'core.autocrlf=false', '-c', 'core.longpaths=true', ...proxyArgs, '-C', destination, ...args], common.GUEST.work]));
        assert.deepEqual(fs.readdirSync(destination), [], 'Mock Git commands must not write persistent config');
    }
    const rejected = path.join(directory, 'rejected');
    await assert.rejects(guest.fetchRepository(() => assert.fail('Invalid proxy must not invoke Git'), git, 'source', repo,
        rejected, false, {gitProxy: 'http://127.0.0.1:49187'}), /network\.gitProxy/);
    assert(!fs.existsSync(rejected));
});

test('history inference never silently becomes a shallow no-version export', () => {
    const lock = fixture(); lock.job.versions = true;
    assert.throws(() => common.validateLock(lock), /history SHAs/);
    lock.repositories.source.history = ['origin/master'];
    assert.throws(() => common.validateLock(lock), /full SHAs/);
    lock.repositories.source.history = [SHA]; common.validateLock(lock);
    assert(!guest.sourceFetchArgs(lock.repositories.source, true).includes('--depth=1'));
    assert(guest.sourceFetchArgs(lock.repositories.source, false).includes('--depth=1'));
});

test('official .NET SHA-512 is accepted without deriving trust from a fresh download', async t => {
    const lock = fixture(); delete lock.tools.dotnetSdk.sha256;
    lock.tools.dotnetSdk.sha512 = 'a'.repeat(128); common.validateLock(lock);
    lock.tools.dotnetSdk.sha256 = HASH; assert.throws(() => common.validateLock(lock), /one pinned/);
    const directory = temporary(t), bytes = Buffer.from('official-checksum-fixture'), file = path.join(directory, 'dotnet.zip');
    const spec = {url: 'https://example.com/dotnet.zip', sha512: createHash('sha512').update(bytes).digest('hex')};
    await guest.download(spec, file, async () => new Response(bytes));
    assert.deepEqual(fs.readFileSync(file), bytes);
});

test('sample IDs and image requirements are explicit', () => {
    for (const ids of [[], [140001, 140001], [0], Array.from({length: 6}, (_, i) => i + 1)]) {
        const lock = fixture(); lock.job.ids = ids; assert.throws(() => common.validateLock(lock));
    }
    const lock = fixture(); lock.job.requireImages = true;
    assert.throws(() => common.validateLock(lock), /real resource entries/);
});

test('Git download can use its exact numeric official release asset, never latest or arbitrary API', async () => {
    const lock = fixture(); lock.tools.git.url = 'https://api.github.com/repos/git-for-windows/git/releases/assets/677312705';
    common.validateLock(lock);
    let observed;
    const response = await guest.publicFetch(lock.tools.git.url, {}, async (_url, options) => {observed = options; return new Response('zip');});
    assert.equal(observed.headers.accept, 'application/octet-stream'); await response.body.cancel();
    lock.tools.git.url = 'https://api.github.com/repos/other/repo/releases/assets/1'; assert.throws(() => common.validateLock(lock));
});

test('public connection retry is bounded and reports causes without signed URL data', async () => {
    let attempts = 0;
    const fail = async () => {attempts++; const error = new Error('https://private.invalid/?token=hidden'); error.cause = {code: 'UND_ERR_CONNECT_TIMEOUT'}; throw error;};
    await assert.rejects(guest.publicFetch('https://example.com/pinned.zip', {retryDelayMs: 0}, fail), error => {
        assert(error.message.includes('UND_ERR_CONNECT_TIMEOUT')); assert(!error.message.includes('hidden')); return true;
    });
    assert.equal(attempts, 3);
});

test('Git fetch retries only transient network failures with identical fixed arguments', async () => {
    const args = guest.sourceFetchArgs(fixture().repositories.source, false), calls = [], delays = [];
    const error = Object.assign(new Error('fetch failed'), {exitCode: 128, outputTail: 'fatal: Recv failure: Connection was reset'});
    const options = {sleep: async value => {delays.push(value);}, log: () => {}};
    const result = await guest.fetchWithRetry(async (name, received) => {
        calls.push({name, args: [...received]});
        if (calls.length < 3) {received.push('not-reused'); throw error;}
        return 'fixed commit fetched';
    }, args, options);
    assert.equal(result, 'fixed commit fetched');
    assert.deepEqual(calls.map(call => call.args), [args, args, args]);
    assert.deepEqual(calls.map(call => call.name), ['fetch', 'fetch-retry-2', 'fetch-retry-3']);
    assert.deepEqual(delays, [2000, 4000]);
    let failedAttempts = 0;
    await assert.rejects(guest.fetchWithRetry(async () => {failedAttempts++; throw error;}, args, options));
    assert.equal(failedAttempts, 3);
});

test('Git fetch never retries certificate/authentication/commit/hash errors or command timeout', async () => {
    for (const text of ['SSL certificate problem', 'Authentication failed', 'not our ref abc', 'couldn\'t find remote ref abc',
        'repository not found', 'hash mismatch', 'Unrecognized permanent error']) {
        let attempts = 0;
        const error = Object.assign(new Error('failed'), {exitCode: 128, outputTail: text});
        await assert.rejects(guest.fetchWithRetry(async () => {attempts++; throw error;}, ['fetch'], {sleep: async () => {}, log: () => {}}));
        assert.equal(attempts, 1);
    }
    assert(!guest.transientGitFailure({exitCode: 128, outputTail: 'Connection timed out', timedOut: true}));
    assert(!guest.transientGitFailure({exitCode: 1, outputTail: 'Connection timed out'}));
});

test('fixed Git release metadata must match tag, asset ID, ZIP name, length, digest and API route', () => {
    const spec = fixture().tools.git;
    const release = {tag_name: spec.releaseTag, assets: [{id: spec.assetId, name: spec.assetName, size: spec.bytes,
        state: 'uploaded', digest: 'sha256:' + spec.sha256, url: `https://api.github.com/repos/git-for-windows/git/releases/assets/${spec.assetId}`,
        browser_download_url: spec.url}]};
    guest.verifyGitMetadata(spec, release);
    for (const [key, value] of [['id', 1], ['name', 'other.zip'], ['size', 1], ['digest', 'sha256:' + 'f'.repeat(64)], ['state', 'new'], ['url', 'https://example.com/file']]) {
        const changed = structuredClone(release); changed.assets[0][key] = value;
        assert.throws(() => guest.verifyGitMetadata(spec, changed));
    }
    assert.throws(() => guest.verifyGitMetadata(spec, {...release, tag_name: 'latest'}));
    assert.throws(() => guest.verifyGitMetadata(spec, {...release, assets: [...release.assets, ...release.assets]}));
    const lock = fixture(); lock.tools.git.url = 'https://api.github.com/repos/git-for-windows/git/releases/assets/1';
    assert.throws(() => common.validateLock(lock), /identity mismatch/);
});

test('Windows traversal, reserved device names, ADS and absolute paths fail', () => {
    for (const file of ['../outside', '/absolute', 'D:/path', 'a\\b', 'a//b', 'a/./b', 'NUL.txt', 'com1', 'x:stream', 'a.', 'a /b', 'a?b', 'a\0b'])
        assert.throws(() => common.relative(file), /Invalid/);
    assert.equal(common.relative('blocks/example.blk'), 'blocks/example.blk');
});

test('argument parser has no arbitrary command, sandbox ID, extra share or upload flag', () => {
    assert.equal(host.parse(['list']).command, 'list');
    for (const args of [['stop', '--id', SHA], ['exec', '--run', '.', '--command', 'anything'], ['share', '--run', '.', '--path', 'D:/'], ['start'], ['upload']])
        assert.throws(() => host.parse(args));
});

test('machine-readable list is fail closed on unknown response or ambiguous identity', () => {
    assert.throws(() => host.environments({sessions: []}), /Unexpected/);
    assert.throws(() => host.environmentId({Name: 'anything'}), /identity/);
    assert.throws(() => host.environmentId({Id: '11111111-1111-1111-1111-111111111111', SandboxId: '22222222-2222-2222-2222-222222222222'}), /identity/);
});

test('existing user sandbox is never adopted or stopped', async t => {
    const {file, directory} = manifest(t), fake = mockWSB({existing: true});
    await assert.rejects(host.start(file, directory, fake.call), /user sandbox/);
    assert.deepEqual(fake.calls.map(args => args[0]), ['list']);
});

test('new sandbox shares only fresh read-only input and writable output; own stop only', async t => {
    const {file, directory} = manifest(t), fake = mockWSB();
    const state = await host.start(file, directory, fake.call);
    assert(state.created); assert(common.GUID.test(state.id));
    const shares = fake.calls.filter(args => args[0] === 'share');
    assert.equal(shares.length, 2);
    assert(!shares[0].includes('--allow-write')); assert(shares[1].includes('--allow-write'));
    assert(shares[0].includes(path.join(state.directory, 'input')));
    assert(shares[1].includes(path.join(state.directory, 'output')));
    assert(!shares.some(args => args.includes(directory)));
    assert(!fs.existsSync(path.join(state.directory, 'output/host-state.json')));
    await host.stop(state.directory, fake.call);
    assert.deepEqual(fake.calls.at(-1), ['stop', '--id', state.id]);
    await assert.rejects(host.stop(state.directory, fake.call), /active sandbox/);
});

test('ambiguous failed start never issues stop; failed sharing only stops the created ID', async t => {
    const {file, directory} = manifest(t), failed = mockWSB({failStart: true});
    await assert.rejects(host.start(file, directory, failed.call), /Uncertain/);
    assert(!failed.calls.some(args => args[0] === 'stop'));
    const shared = mockWSB({failShare: true});
    await assert.rejects(host.start(file, directory, shared.call), /Sharing failed/);
    const created = shared.calls.find(args => args[0] === 'start');
    assert.deepEqual(shared.calls.at(-1), ['stop', '--id', created[created.indexOf('--id') + 1]]);
});

test('guest cannot forge host ownership via output files', async t => {
    const {file, directory} = manifest(t), fake = mockWSB();
    const state = await host.start(file, directory, fake.call);
    common.writeJSON(path.join(state.directory, 'output/host-state.json'), {...state, id: '11111111-1111-1111-1111-111111111111'});
    assert.equal(host.loadState(state.directory).id, state.id);
    await host.stop(state.directory, fake.call);
});

test('prepared but uncreated run cannot stop a sandbox', async t => {
    const {file, directory} = manifest(t);
    const state = await host.prepareRun(file, directory);
    assert.throws(() => host.loadState(state.directory), /active sandbox/);
});

test('local real inputs are explicitly copied and hash-verified, never shared by parent path', async t => {
    const {file, directory} = manifest(t), source = path.join(directory, 'sample.blk'), bytes = Buffer.from('test-only-input');
    fs.writeFileSync(source, bytes);
    const lock = fixture(); lock.resources = {game: 'GI', files: [{path: 'blocks/sample.blk', input: 'sample.blk', bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex')}], images: []};
    fs.writeFileSync(file, JSON.stringify(lock));
    const state = await host.prepareRun(file, directory);
    const copy = path.join(state.directory, 'input/resources/blocks/sample.blk');
    assert.deepEqual(fs.readFileSync(copy), bytes);
    assert.equal(common.readJSON(path.join(state.directory, 'input/lock.json')).resources.files[0].input, 'resources/blocks/sample.blk');
    lock.resources.files[0].sha256 = HASH; fs.writeFileSync(file, JSON.stringify(lock));
    await assert.rejects(host.prepareRun(file, directory), /SHA-256 mismatch/);
});

test('asset entries must refer to declared files without guessing paths', () => {
    const lock = fixture(); lock.resources = {game: 'GI', files: [{path: 'sample.blk', input: 'sample.blk', bytes: 4, sha256: HASH}],
        images: [{Name: 'UI_Flycloak', Type: 'Texture2D', PathID: '123', Offset: 0, Source: 'sample.blk'}]};
    lock.job.requireImages = true; common.validateLock(lock);
    lock.resources.images[0].Source = 'missing.blk'; assert.throws(() => common.validateLock(lock), /declared file/);
});

test('nightly metadata matches exact run attempt, commit, artifact and archive digest', () => {
    const spec = fixture().tools.animeStudio;
    const run = {id: 123, run_attempt: 1, head_sha: SHA, conclusion: 'success'};
    const artifact = {id: 456, expired: false, name: 'AnimeStudio-net10', workflow_run: {id: 123, head_sha: SHA}, digest: 'sha256:' + HASH};
    guest.verifyAnimeMetadata(spec, run, artifact);
    assert.throws(() => guest.verifyAnimeMetadata(spec, {...run, run_attempt: 2}, artifact));
    assert.throws(() => guest.verifyAnimeMetadata(spec, run, {...artifact, expired: true}));
    assert.throws(() => guest.verifyAnimeMetadata(spec, run, {...artifact, digest: 'sha256:' + 'c'.repeat(64)}));
});

test('downloads require matching hash and do not promote partial/corrupt files', async t => {
    const directory = temporary(t), bytes = Buffer.from('download fixture');
    const spec = {url: 'https://example.com/fixed.zip', sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
    const fetcher = async () => new Response(bytes);
    const target = path.join(directory, 'artifact.zip'); await guest.download(spec, target, fetcher);
    assert.deepEqual(fs.readFileSync(target), bytes);
    const bad = path.join(directory, 'bad.zip');
    await assert.rejects(guest.download({...spec, sha256: HASH}, bad, fetcher), /SHA-256 mismatch/);
    assert(!fs.existsSync(bad)); assert(fs.existsSync(bad + '.partial'));
    await assert.rejects(guest.download(spec, target, fetcher), /already exists/);
});

test('redirects cannot downgrade to HTTP and have a fixed limit', async () => {
    const downgrade = async () => new Response(null, {status: 302, headers: {location: 'http://example.com/file'}});
    await assert.rejects(guest.publicFetch('https://example.com/file', {}, downgrade), /requires HTTPS/);
    let calls = 0;
    const loop = async () => { calls++; return new Response(null, {status: 302, headers: {location: 'https://example.com/file'}}); };
    await assert.rejects(guest.publicFetch('https://example.com/file', {}, loop), /Too many/); assert.equal(calls, 6);
});

test('output inventories contain stable hashes and relative names', async t => {
    const directory = temporary(t); fs.mkdirSync(path.join(directory, 'en/items'), {recursive: true});
    fs.writeFileSync(path.join(directory, 'en/items/a.json'), '{}');
    const files = await guest.listOutputs(directory);
    assert.equal(files.length, 1); assert.equal(files[0].path, 'en/items/a.json'); assert.equal(files[0].bytes, 2);
});

test('extraction creates only parents so the resource-tools nonrecursive new-directory contract works', t => {
    const directory = temporary(t), cache = path.join(directory, 'new-cache');
    for (const kind of ['images', 'lua']) {
        const output = guest.extractionOutput(cache, kind);
        assert(fs.statSync(path.dirname(output)).isDirectory());
        assert(!fs.existsSync(output), 'Caller must not pre-create the extraction leaf');
        fs.mkdirSync(output); // The exact nonrecursive operation used by resource-tools.newDirectory.
        assert.throws(() => guest.extractionOutput(cache, kind), /already exists/);
    }
    assert.throws(() => guest.extractionOutput(cache, '../escape'), /Unknown/);
});

test('execution requires matching guest report and rejects replay', async t => {
    const {file, directory} = manifest(t), fake = mockWSB();
    const state = await host.start(file, directory, fake.call);
    const call = async args => {
        if (args[0] === 'exec') {
            assert(args.includes('System'));
            common.writeJSON(path.join(state.directory, 'output/result.json'), {id: state.id, lockSha256: state.lockSha256, status: 'passed'});
        }
        return fake.call(args);
    };
    assert.equal((await host.execute(state.directory, call)).status, 'passed');
    await assert.rejects(host.execute(state.directory, call), /One execution/);
    await host.stop(state.directory, fake.call);
});

test('bootstrap/guest never publish or upload and disables host clipboard redirection', () => {
    const xml = common.configuration();
    assert(xml.includes('<ClipboardRedirection>Disable</ClipboardRedirection>'));
    for (const name of ['sandbox-guest.cjs', 'bootstrap-sandbox.ps1']) {
        const source = fs.readFileSync(path.join(__dirname, name), 'utf8');
        assert(!source.includes('npm publish')); assert(!source.includes('WIKI_UPLOAD_TOKEN'));
    }
});

test('Windows PowerShell 5.1 ZIP extraction rejects traversal before any entry is written', {skip: process.platform !== 'win32'}, t => {
    const directory = temporary(t);
    const quote = value => "'" + value.replaceAll("'", "''") + "'";
    const code = `$ErrorActionPreference = 'Stop'
$workRoot = ${quote(directory)}
$tokens = $null; $errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(${quote(path.join(__dirname, 'bootstrap-sandbox.ps1'))}, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Parse failed' }
$definition = $ast.Find({param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Expand-CheckedZip'}, $true)
Invoke-Expression $definition.Extent.Text
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function New-TestZip([string]$Name, [string[]]$Entries) {
    $zip = [IO.Compression.ZipFile]::Open((Join-Path $workRoot $Name), [IO.Compression.ZipArchiveMode]::Create)
    try { foreach ($name in $Entries) { $entry = $zip.CreateEntry($name); $stream = $entry.Open(); try { $stream.WriteByte(65) } finally { $stream.Dispose() } } }
    finally { $zip.Dispose() }
}
New-TestZip 'safe.zip' @('nested/ok.txt')
Expand-CheckedZip (Join-Path $workRoot 'safe.zip') (Join-Path $workRoot 'safe') $false
if ((Get-Content -LiteralPath (Join-Path $workRoot 'safe/nested/ok.txt') -Raw) -ne 'A') { throw 'Safe ZIP failed' }
$badEntries = @('../outside.txt', 'nested/../../outside.txt', 'C:/outside.txt', 'NUL.txt', 'ok.txt:stream', 'bad./file.txt')
$number = 0
foreach ($entry in $badEntries) {
    $number++; $zipName = "bad$number.zip"; $target = Join-Path $workRoot "bad$number"
    New-TestZip $zipName @('first.txt', $entry)
    $rejected = $false
    try { Expand-CheckedZip (Join-Path $workRoot $zipName) $target $false } catch { $rejected = $true }
    if (-not $rejected -or (Test-Path -LiteralPath $target)) { throw 'Unsafe ZIP wrote output' }
}
Write-Output 'Safe ZIP and rejection tests passed'
`;
    const output = execFileSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', code],
        {encoding: 'utf8', windowsHide: true, timeout: 30000});
    assert(output.includes('Safe ZIP and rejection tests passed'));
});
