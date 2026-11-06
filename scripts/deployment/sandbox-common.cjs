'use strict';
// The deployment lock is an explicit input, not a latest-version resolver or command runner.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const NODE_VERSION = '24.22.2';
const PACKAGES = Object.freeze({
    tools: '@inteyvat-wiki/resource-tools', contracts: '@inteyvat-wiki/wiki-contracts',
    provider: '@inteyvat-wiki/genshin-data-scripts', db: '@inteyvat-wiki/genshin-db',
});
const GUEST = Object.freeze({ input: 'C:\\InteyvatInput', output: 'C:\\InteyvatOutput', work: 'C:\\InteyvatSandbox' });
const GUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function object(value, keys, label) {
    assert(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
    for (const key of Object.keys(value)) assert(keys.includes(key), `Unknown ${label}.${key}`);
}
function relative(value, label = 'path') {
    assert(typeof value === 'string' && value && !/[\\:\x00-\x1f<>"|?*]/.test(value), `Invalid ${label}`);
    assert(!value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..'
        && !/[. ]$/.test(part) && !/^(?:CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(?:\.|$)/i.test(part)), `Invalid ${label}`);
    return value;
}
function httpsURL(value) {
    const url = new URL(value);
    assert(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash, 'Expected credential-free HTTPS URL without query/fragment');
    return url;
}
function artifact(value, name) {
    object(value, ['version', 'url', 'sha256', 'sha512', 'root', 'runId', 'runAttempt', 'commit', 'artifactId'], `tools.${name}`);
    if (name !== 'animeStudio') assert(typeof value.version === 'string' && /^\d+\.\d+\.\d+(?:[-.][A-Za-z0-9.-]+)?$/.test(value.version), `${name}: exact version required`);
    else assert(value.version === undefined, 'AnimeStudio nightly identity is run/commit/artifact, not an invented semantic version');
    const url = httpsURL(value.url);
    if (name.startsWith('dotnet')) {
        assert(Boolean(value.sha256) !== Boolean(value.sha512), '.NET requires one pinned SHA-256 or official SHA-512');
        if (value.sha512) assert(/^[a-f0-9]{128}$/.test(value.sha512) && !/^0+$/.test(value.sha512), 'Invalid official .NET SHA-512');
        else assert(SHA256.test(value.sha256) && !/^0+$/.test(value.sha256), 'Invalid .NET SHA-256');
    } else assert(value.sha512 === undefined && SHA256.test(value.sha256) && !/^0+$/.test(value.sha256), `${name}: SHA-256 required`);
    assert(url.pathname.endsWith('.zip'), `${name}: use a pinned ZIP artifact`);
    if (value.root !== undefined && value.root !== '') relative(value.root, `${name}.root`);
    if (name === 'node') {
        assert.equal(value.version, NODE_VERSION, 'Deployment Node must match the server');
        assert.equal(value.url, `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`);
        assert.equal(value.root, `node-v${NODE_VERSION}-win-x64`);
    } else if (name === 'git') {
        assert.equal(url.hostname, 'github.com');
        assert(url.pathname.startsWith('/git-for-windows/git/releases/download/v'), 'Use a fixed Git-for-Windows release (MinGit ZIP)');
    } else if (name.startsWith('dotnet')) {
        assert(['builds.dotnet.microsoft.com', 'download.visualstudio.microsoft.com', 'ci.dot.net'].includes(url.hostname), 'Use a fixed official .NET ZIP');
        assert(!/latest/i.test(value.url), 'Do not use a floating .NET channel');
    } else if (name === 'animeStudio') {
        assert(SHA.test(value.commit) && !/^0+$/.test(value.commit), 'AnimeStudio commit required');
        for (const key of ['runId', 'runAttempt', 'artifactId']) assert(Number.isSafeInteger(value[key]) && value[key] > 0, `AnimeStudio ${key} required`);
        assert.equal(url.hostname, 'nightly.link');
        assert(new RegExp(`^/Escartem/AnimeStudio/actions/runs/${value.runId}/[^/]+\\.zip$`).test(url.pathname), 'AnimeStudio URL must pin the Actions run, not a workflow branch');
    }
}
function repository(value, name) {
    object(value, ['url', 'commit', 'history'], `repositories.${name}`);
    const url = httpsURL(value.url);
    assert.equal(url.hostname, 'github.com', 'Only public GitHub HTTPS repositories are supported');
    assert(/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(url.pathname), 'Invalid repository URL');
    assert(SHA.test(value.commit) && !/^0+$/.test(value.commit), `${name}: full commit SHA required`);
    if (name !== 'source') assert(value.history === undefined, 'Only the source repository has history endpoints');
    if (value.history !== undefined) assert(Array.isArray(value.history) && value.history.length > 0
        && value.history.every(hash => SHA.test(hash) && !/^0+$/.test(hash)), 'History endpoints must be full SHAs');
}
function validateLock(lock) {
    object(lock, ['schema', 'tools', 'repositories', 'job', 'resources', 'memoryMB'], 'lock');
    assert.equal(lock.schema, 1);
    object(lock.tools, ['node', 'git', 'dotnetSdk', 'dotnetRuntime', 'animeStudio'], 'tools');
    for (const key of ['node', 'git', 'dotnetSdk', 'dotnetRuntime', 'animeStudio']) artifact(lock.tools[key], key);
    object(lock.repositories, ['wikiData', 'tools', 'contracts', 'provider', 'db', 'source'], 'repositories');
    for (const key of ['wikiData', 'tools', 'contracts', 'provider', 'db', 'source']) repository(lock.repositories[key], key);
    object(lock.job, ['mode', 'versions', 'target', 'ids', 'requireImages'], 'job');
    assert(['smoke', 'pipeline'].includes(lock.job.mode), 'job.mode must be smoke or pipeline');
    assert(typeof lock.job.versions === 'boolean', 'Explicit job.versions required');
    if (lock.job.versions) assert(lock.repositories.source.history?.length, 'Version inference requires explicit history SHAs');
    if (lock.job.mode === 'smoke') {
        assert(lock.job.target === undefined, 'Smoke mode uses the maintained windglider converter');
        assert(Array.isArray(lock.job.ids) && lock.job.ids.length > 0 && lock.job.ids.length <= 5
            && lock.job.ids.every(id => Number.isSafeInteger(id) && id > 0) && new Set(lock.job.ids).size === lock.job.ids.length, 'Choose 1..5 unique real windglider source IDs');
    } else {
        assert(['all', 'characters', 'weapons', 'outfits', 'npcs', 'tasks', 'archives', 'misc', 'maps'].includes(lock.job.target), 'Invalid pipeline target');
        assert(lock.job.ids === undefined, 'Pipeline uses maintained export catalogues');
    }
    assert(typeof lock.job.requireImages === 'boolean', 'Explicit job.requireImages required');
    if (lock.memoryMB !== undefined) assert(Number.isSafeInteger(lock.memoryMB) && lock.memoryMB >= 2048 && lock.memoryMB <= 131072, 'Invalid memoryMB');
    if (lock.resources !== undefined) {
        object(lock.resources, ['game', 'files', 'images', 'lua'], 'resources');
        assert(lock.resources.game === 'GI', 'This deployment currently tests GI');
        assert(Array.isArray(lock.resources.files) && lock.resources.files.length > 0, 'Resource file manifest required');
        const names = new Set();
        for (const file of lock.resources.files) {
            object(file, ['path', 'url', 'input', 'sha256', 'bytes'], 'resource file');
            relative(file.path);
            assert(!names.has(file.path.toLowerCase()), 'Duplicate resource filename'); names.add(file.path.toLowerCase());
            assert(SHA256.test(file.sha256) && !/^0+$/.test(file.sha256), 'Resource SHA-256 required');
            assert(Number.isSafeInteger(file.bytes) && file.bytes > 0, 'Resource byte length required');
            assert(Boolean(file.url) !== Boolean(file.input), 'Choose url or local input, not both');
            if (file.url) httpsURL(file.url);
            else assert(typeof file.input === 'string' && file.input && !/[\x00-\x1f]/.test(file.input), 'Invalid local input');
        }
        for (const kind of ['images', 'lua']) {
            const entries = lock.resources[kind] || [];
            assert(Array.isArray(entries), `Invalid resources.${kind}`);
            for (const entry of entries) {
                object(entry, ['Source', 'Offset', 'PathID', 'Name', 'Type', 'Container'], 'asset entry');
                relative(entry.Source);
                assert(lock.resources.files.some(file => file.path === entry.Source), 'Asset source must match a declared file');
                assert(typeof entry.Name === 'string' && entry.Name && !/[\\/\x00-\x1f]/.test(entry.Name), 'Invalid asset name');
                assert(typeof entry.PathID === 'string' && /^-?\d+$/.test(entry.PathID), 'PathID must be a decimal string');
                assert(Number.isSafeInteger(entry.Offset) && entry.Offset >= 0, 'Explicit nonnegative Offset required');
                assert((kind === 'images' ? ['Sprite', 'Texture2D'] : ['TextAsset', 'MiHoYoBinData']).includes(entry.Type), 'Invalid asset type');
                if (entry.Container !== undefined) assert(typeof entry.Container === 'string', 'Invalid Container');
            }
        }
    }
    if (lock.job.requireImages) assert(lock.resources?.images?.length, 'Image validation requires real resource entries');
    return lock;
}
function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function writeJSON(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'}); }
function hashFile(file, algorithm = 'sha256') {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(algorithm); const input = fs.createReadStream(file);
        input.on('data', chunk => hash.update(chunk)); input.on('error', reject);
        input.on('end', () => resolve(hash.digest('hex')));
    });
}
function noLinks(file) {
    for (let current = path.resolve(file); ; current = path.dirname(current)) {
        if (fs.existsSync(current)) assert(!fs.lstatSync(current).isSymbolicLink(), `Symlink/junction forbidden: ${current}`);
        if (current === path.dirname(current)) break;
    }
}
async function verifyFile(file, expected) {
    noLinks(file);
    const stat = fs.statSync(file);
    assert(stat.isFile(), 'Expected regular file');
    if (expected.bytes !== undefined) assert.equal(stat.size, expected.bytes, 'File length mismatch');
    const algorithm = expected.sha512 ? 'sha512' : 'sha256';
    assert.equal(await hashFile(file, algorithm), expected[algorithm], `File ${algorithm === 'sha512' ? 'SHA-512' : 'SHA-256'} mismatch`);
}
function configuration(memoryMB = 8192) {
    return `<Configuration><Networking>Enable</Networking><VGpu>Disable</VGpu><ClipboardRedirection>Disable</ClipboardRedirection><AudioInput>Disable</AudioInput><VideoInput>Disable</VideoInput><PrinterRedirection>Disable</PrinterRedirection><MemoryInMB>${memoryMB}</MemoryInMB></Configuration>`;
}
module.exports = {NODE_VERSION, PACKAGES, GUEST, GUID, relative, httpsURL, validateLock, readJSON, writeJSON, hashFile, verifyFile, noLinks, configuration};
