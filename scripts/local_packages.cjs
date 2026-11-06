'use strict';
// Maintained pre-publication workflow. No publish, links, overrides or manifest rewrites.
// See --help. The registry is read-only, loopback-only and exists only during npm work.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_REGISTRY = 'https://registry.npmjs.org/';
const NAMES = Object.freeze({
    tools: '@inteyvat-wiki/resource-tools', contracts: '@inteyvat-wiki/wiki-contracts',
    provider: '@inteyvat-wiki/genshin-data-scripts', db: '@inteyvat-wiki/genshin-db',
});
const VERSIONS = Object.freeze(Object.fromEntries(Object.values(NAMES).map(name => [name, '0.1.0'])));
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJSON = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const digest = bytes => 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64');
const localSpec = value => /^(?:file:|link:|workspace:|\.{1,2}[\\/]|[A-Za-z]:[\\/])/.test(value);

function assertManifest(metadata, ownPackage = false) {
    assert(!metadata.overrides, `${metadata.name}: overrides are not allowed in this workflow`);
    assert(!metadata.workspaces, `${metadata.name}: workspaces are not isolated npm consumers`);
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
        for (const [name, version] of Object.entries(metadata[field] || {})) {
            assert(!localSpec(version), `${metadata.name}: local dependency ${name}=${version}`);
            if (Object.hasOwn(VERSIONS, name)) assert.equal(version, VERSIONS[name], `${metadata.name}: pin ${name} exactly`);
            assert(!['genshin-db', 'genshindata-scripts'].includes(name), `Unscoped package dependency: ${name}`);
        }
    }
    if (ownPackage) {
        assert.equal(metadata.version, VERSIONS[metadata.name], `Unexpected package/version: ${metadata.name}`);
        for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) {
            assert(!metadata.scripts?.[hook], `${metadata.name}: consumer build hook ${hook}`);
        }
    }
}

function parseOptions(argv) {
    const options = { sources: {}, consumers: [] };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--help') { options.help = true; continue; }
        if (['pack', 'lock', 'install', 'verify'].includes(arg) && !options.mode) { options.mode = arg; continue; }
        assert(['--source', '--config', '--consumer', '--archives'].includes(arg), `Unknown option: ${arg}`);
        const value = argv[++i];
        assert(value && !value.startsWith('--'), `Missing value for ${arg}`);
        if (arg === '--source') {
            const separator = value.indexOf('=');
            const name = value.slice(0, separator);
            assert(separator > 0 && VERSIONS[name] && value.slice(separator + 1), 'Use --source @inteyvat-wiki/package=/path/to/repo');
            options.sources[name] = path.resolve(value.slice(separator + 1));
        } else if (arg === '--consumer') options.consumers.push(path.resolve(value));
        else options[arg.slice(2)] = path.resolve(value);
    }
    return options;
}

function discoverSource(name, root = ROOT) {
    const resolver = createRequire(path.join(root, 'package.json'));
    let entry;
    try { entry = resolver.resolve(`${name}/package.json`); }
    catch { try { entry = resolver.resolve(name); } catch { return undefined; } }
    let directory = path.dirname(entry);
    while (directory !== path.dirname(directory)) {
        const file = path.join(directory, 'package.json');
        if (fs.existsSync(file) && readJSON(file).name === name) return fs.realpathSync(directory);
        directory = path.dirname(directory);
    }
}

function repositories(options = {}, root = ROOT) {
    // Config paths are relative to the JSON file; CLI paths are relative to cwd.
    const configFile = options.config || process.env.INTEYVAT_PACKAGE_CONFIG;
    const config = configFile ? readJSON(path.resolve(configFile)) : {};
    const configured = config.packaging?.repositories || {};
    return Object.keys(VERSIONS).map(name => {
        const directory = options.sources?.[name]
            || (configured[name] && path.resolve(path.dirname(path.resolve(configFile)), configured[name]))
            || discoverSource(name, root);
        assert(directory, `Cannot discover ${name}. Supply --source ${name}=/path/to/repo or --config with packaging.repositories.`);
        const metadata = readJSON(path.join(directory, 'package.json'));
        assert.equal(metadata.name, name, `Wrong repository at ${directory}`);
        assertManifest(metadata, true);
        if ([NAMES.tools, NAMES.contracts].includes(name)) assert(metadata.scripts?.prepack, `${name}: missing maintainer prepack build`);
        return { name, directory: fs.realpathSync(directory), metadata };
    });
}

function makeWork() {
    const parent = path.join(ROOT, 'tmp');
    fs.mkdirSync(parent, { recursive: true });
    return fs.mkdtempSync(path.join(parent, 'package-integration-'));
}

function npmCLI() {
    const candidates = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')];
    const cli = candidates.find(file => file && /npm-cli\.js$/.test(file) && fs.existsSync(file));
    assert(cli, 'Run through npm run packages:local or npm run check:packages');
    return cli;
}

function run(args, cwd, env = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, args, { cwd, windowsHide: true, env: { ...process.env, NODE_PATH: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '', stderr = '';
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`${args.join(' ')} (exit ${code})\n${stdout}\n${stderr}`)));
    });
}

function npmEnvironment(work, cache = 'npm-cache') {
    // Do not inherit registry credentials or write to the maintainer's global cache.
    const env = Object.fromEntries(Object.keys(process.env).filter(key => /^npm_config_/i.test(key)).map(key => [key, '']));
    for (const name of ['user.npmrc', 'global.npmrc']) {
        const file = path.join(work, name);
        if (!fs.existsSync(file)) fs.writeFileSync(file, '');
    }
    return { ...env, npm_config_userconfig: path.join(work, 'user.npmrc'), npm_config_globalconfig: path.join(work, 'global.npmrc'),
        npm_config_cache: path.join(work, cache), npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false' };
}

function validateFiles(repository, packed) {
    const names = packed.files.map(file => file.path);
    assert(names.some(file => /^LICENSE(?:\.|$)/.test(file)), `${repository.name}: missing license`);
    assert(names.some(file => file.toLowerCase() === 'readme.md'), `${repository.name}: missing README`);
    const bridge = repository.name === NAMES.tools ? 'dist/bridge/ResourceTools.Bridge.dll' : null;
    const forbidden = names.filter(file => file !== bridge && (/((^|\/)(?:node_modules|\.git|\.cache|tmp|data|ExcelBinOutput|BinOutput|TextMap)(\/|$))/i.test(file)
        || /\.(?:exe|dll|blk|luac|png|map|tgz|ps1)$/i.test(file)));
    assert.deepEqual(forbidden, [], `${repository.name}: raw data or foreign build outputs in tarball`);
    if (bridge) {
        assert(names.includes(bridge), 'Missing prebuilt project-owned bridge');
        assert(names.includes('dist/bridge/build-info.json'), 'Missing bridge provenance');
    }
    if (repository.name === NAMES.contracts) {
        for (const file of ['dist/cjs/index.js', 'dist/esm/index.js', 'dist/cjs/index.d.ts', 'dist/esm/index.d.ts']) assert(names.includes(file), `Missing prebuilt ${file}`);
    }
    if (repository.name === NAMES.provider) {
        for (const file of fs.readdirSync(path.join(repository.directory, 'resources')).filter(file => file.endsWith('.js') && !file.endsWith('.test.js'))) {
            assert(names.includes(`resources/${file}`), `Missing resource runtime: ${file}`);
        }
        assert(!names.includes('config.json'), 'Do not ship maintainer source paths');
    }
}

async function packPackages(repos, work) {
    const archives = path.join(work, 'archives');
    fs.mkdirSync(archives);
    const packages = [];
    for (const repository of repos) {
        console.error(`Packing ${repository.name} (including prepack build)...`);
        const output = await run([npmCLI(), 'pack', '--json', '--pack-destination', archives], repository.directory, npmEnvironment(work));
        // npm may include prepack stdout before its --json result (npm 11+).
        const [packed] = parsePackOutput(output);
        assert.equal(packed.name, repository.name);
        assert.equal(packed.version, VERSIONS[repository.name]);
        validateFiles(repository, packed);
        const filename = path.join(archives, packed.filename);
        assert.equal(digest(fs.readFileSync(filename)), packed.integrity);
        packages.push({ ...repository, filename, integrity: packed.integrity, shasum: packed.shasum, files: packed.files.length, bytes: packed.unpackedSize });
    }
    writeJSON(path.join(archives, 'packages.json'), packages.map(item => ({ ...item, filename: path.basename(item.filename) })));
    return packages;
}

function parsePackOutput(output) {
    const starts = [...output.matchAll(/(?:^|\n)(?=\[)/g)].map(match => match.index + (output[match.index] === '\n' ? 1 : 0));
    for (const start of starts.reverse()) {
        try {
            const value = JSON.parse(output.slice(start));
            if (Array.isArray(value) && value.length === 1 && value[0].filename && value[0].integrity) return value;
        } catch { /* A lifecycle script's stdout is not npm's final JSON. */ }
    }
    throw new Error(`npm pack did not return its tarball JSON:\n${output}`);
}

function loadArchives(directory) {
    const packages = readJSON(path.join(directory, 'packages.json'));
    assert.deepEqual(packages.map(item => item.name).sort(), Object.keys(VERSIONS).sort());
    return packages.map(item => {
        assert.equal(path.basename(item.filename), item.filename, 'Tarball must be within archives directory');
        const filename = path.join(directory, item.filename);
        assertManifest(item.metadata, true);
        assert.equal(item.metadata.name, item.name);
        assert.equal(digest(fs.readFileSync(filename)), item.integrity, `Changed archive: ${item.name}`);
        return { ...item, filename };
    });
}

function tarballPath(item) { return `${item.name}/-/${item.name.split('/').pop()}-${item.metadata.version}.tgz`; }

async function startRegistry(packages, { proxy = true } = {}) {
    const requests = [];
    let url;
    const server = http.createServer((req, res) => {
        if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Read-only registry'); return; }
        if (!req.url.startsWith('/') || req.url.startsWith('//')) { res.writeHead(400); res.end(); return; }
        let route;
        try { route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1); }
        catch { res.writeHead(400); res.end(); return; }
        const item = packages.find(item => route === item.name || route === tarballPath(item));
        requests.push({ method: req.method, path: route, local: !!item });
        if (item && route === tarballPath(item)) {
            res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': fs.statSync(item.filename).size });
            if (req.method === 'HEAD') res.end(); else fs.createReadStream(item.filename).pipe(res);
        } else if (item) {
            const metadata = { ...item.metadata, dist: { tarball: url + tarballPath(item), integrity: item.integrity, shasum: item.shasum } };
            const body = JSON.stringify({ name: item.name, 'dist-tags': { latest: metadata.version }, versions: { [metadata.version]: metadata } });
            res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
            res.end(req.method === 'HEAD' ? undefined : body);
        } else if (!proxy || route.startsWith('@inteyvat-wiki/')) {
            res.writeHead(404); res.end('Not present in the local package set');
        } else {
            // Fixed upstream only. Never forward authorization/cookies, redirects or mutations.
            const upstream = https.request({ hostname: 'registry.npmjs.org', path: new URL(req.url, 'http://localhost').pathname + new URL(req.url, 'http://localhost').search,
                method: req.method, headers: { accept: req.headers.accept || '*/*' }, timeout: 60000 }, response => {
                res.writeHead(response.statusCode, { 'content-type': response.headers['content-type'] || 'application/octet-stream' });
                response.pipe(res);
            });
            upstream.on('timeout', () => upstream.destroy(new Error('Upstream registry timed out')));
            upstream.on('error', error => { if (!res.headersSent) res.writeHead(502); res.end(error.message); });
            req.on('aborted', () => upstream.destroy());
            upstream.end();
        }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    url = `http://127.0.0.1:${server.address().port}/`;
    return { url, requests, close: () => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeIdleConnections(); }) };
}

function portableLock(lock, registryURL) {
    assert.equal(lock.lockfileVersion, 3, 'Expected npm lockfile v3');
    const result = structuredClone(lock);
    for (const [key, entry] of Object.entries(result.packages)) {
        assert(!key || key.startsWith('node_modules/'), `External source entry in lock: ${key}`);
        assert(!entry.link, `Linked package in lock: ${key}`);
        assertManifest(entry);
        if (entry.resolved) {
            if (entry.resolved.startsWith(registryURL)) entry.resolved = PUBLIC_REGISTRY + entry.resolved.slice(registryURL.length);
            assert(!localSpec(entry.resolved) && !/https?:\/\/(?:localhost|127\.|\[::1\])/.test(entry.resolved), `Nonportable resolution: ${entry.resolved}`);
        }
    }
    return result;
}

function assertInstalled(consumer) {
    const lock = readJSON(path.join(consumer, 'package-lock.json'));
    for (const key of Object.keys(lock.packages).filter(key => key.startsWith('node_modules/'))) {
        const directory = path.join(consumer, key);
        if (fs.existsSync(directory)) assert(!fs.lstatSync(directory).isSymbolicLink(), `Linked package: ${directory}`);
    }
    for (const name of Object.keys(VERSIONS)) {
        const directory = path.join(consumer, 'node_modules', ...name.split('/'));
        if (fs.existsSync(directory)) assertManifest(readJSON(path.join(directory, 'package.json')), true);
    }
}

function lockedLocalName(key) {
    return Object.keys(VERSIONS).find(name => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`));
}

function assertArchiveLock(lock, packages) {
    for (const [key, entry] of Object.entries(lock.packages)) {
        const name = lockedLocalName(key);
        if (!name) continue;
        const item = packages.find(item => item.name === name);
        assert(item, `Missing archive for ${name}`);
        assert.equal(entry.version, item.metadata.version, `Lock version mismatch for ${name}`);
        assert.equal(entry.integrity, item.integrity, `Archive changed for ${name}; run packages:local -- lock before install`);
        assert.equal(entry.resolved, PUBLIC_REGISTRY + tarballPath(item), `Noncanonical lock URL for ${name}`);
    }
}

async function npmInstall(consumer, registry, work, { ci = false, lockOnly = false, cache = 'install-cache', noPath = false } = {}) {
    assertManifest(readJSON(path.join(consumer, 'package.json')));
    // Explicit flags defeat inherited npm settings. No lifecycle builds in consumers.
    return run([npmCLI(), ci ? 'ci' : 'install', ...(lockOnly ? ['--package-lock-only'] : []), '--lockfile-version=3', '--ignore-scripts', '--no-audit', '--no-fund',
        '--registry', registry.url, `--@inteyvat-wiki:registry=${registry.url}`, '--replace-registry-host=npmjs', '--fetch-retries=0'], consumer,
    { ...npmEnvironment(work, cache), ...(noPath ? { PATH: '', Path: '' } : {}) });
}

async function generateLock(consumer, registry, work) {
    const before = fs.readFileSync(path.join(consumer, 'package.json'));
    const stage = fs.mkdtempSync(path.join(work, 'lock-'));
    fs.copyFileSync(path.join(consumer, 'package.json'), path.join(stage, 'package.json'));
    const oldLock = path.join(consumer, 'package-lock.json');
    if (fs.existsSync(oldLock)) {
        const seed = readJSON(oldLock);
        // Retain third-party pins. Local 0.1.0 archives may have changed before publication,
        // so force npm to obtain their current metadata/integrity instead of reusing stale locks.
        seed.packages = Object.fromEntries(Object.entries(seed.packages).filter(([key, value]) =>
            (!key || key.startsWith('node_modules/')) && !value.link && !lockedLocalName(key)));
        writeJSON(path.join(stage, 'package-lock.json'), seed);
    }
    await npmInstall(stage, registry, work, { lockOnly: true });
    const lock = portableLock(readJSON(path.join(stage, 'package-lock.json')), registry.url);
    assert.deepEqual(fs.readFileSync(path.join(consumer, 'package.json')), before, 'Manifest changed during lock resolution; retry after concurrent edit');
    writeJSON(oldLock, lock);
    return lock;
}

const HELP = `Pre-publication npm workflow (never publishes):
  npm run packages:local -- pack [--source NAME=PATH ...] [--config FILE]
  npm run packages:local -- lock --consumer PATH [--consumer PATH ...] --archives PATH
  npm run packages:local -- install --consumer PATH --archives PATH
  npm run packages:local -- verify --consumer PATH [--consumer PATH ...] --archives PATH
  npm run check:packages -- [--source NAME=PATH ...] [--config FILE | --archives PATH]

Sources: explicit --source, then JSON packaging.repositories keyed by scoped npm name,
then installed npm package discovery. Config paths are relative to the config file.
INTEYVAT_PACKAGE_CONFIG may select that JSON file. No sibling/machine paths are assumed.
pack runs real prepack hooks: maintainers need the .NET SDK and contracts build tools.
install uses npm ci, disables consumer lifecycle builds and leaves package.json unchanged.
lock updates only selected package-lock.json files, preserving third-party pins where possible.
verify runs cold-cache npm ci on isolated copies of the selected manifests and locks.
Without --consumer, lock/install target this wiki-data checkout. Existing node_modules is
replaced by npm ci; do not run install in a checkout with unsaved changes inside node_modules.
Archives and logs remain in tmp/package-integration-*/ for inspection and reuse.
These 0.1.0 packages are NOT published: use this helper until publication. Locks use
registry.npmjs.org URLs plus real tarball integrity. Any later separately authorized publication
must use these EXACT archives, or regenerate locks when archives change. This tool never
publishes and supports private:true/publication-disabled packages. No credentials or npmrc edits.
Standard dependencies require network access; this is not an offline registry mirror.`;

async function main(argv = process.argv.slice(2)) {
    const options = parseOptions(argv);
    if (options.help) { console.log(HELP); return; }
    assert(options.mode, 'Choose pack, lock, install or verify; see --help');
    const work = makeWork();
    const packages = options.archives ? loadArchives(options.archives) : await packPackages(repositories(options), work);
    if (options.mode === 'pack') { console.log(JSON.stringify({ work, archives: path.dirname(packages[0].filename) }, null, 2)); return; }
    const registry = await startRegistry(packages);
    try {
        for (const consumer of options.consumers.length ? options.consumers : [ROOT]) {
            if (options.mode === 'lock') await generateLock(consumer, registry, work);
            else {
                const lock = readJSON(path.join(consumer, 'package-lock.json'));
                assert.deepEqual(portableLock(lock, registry.url), lock, 'Lock must already contain portable URLs');
                assertArchiveLock(lock, packages); // Fail before npm ci touches existing node_modules.
                let target = consumer;
                if (options.mode === 'verify') {
                    target = fs.mkdtempSync(path.join(work, 'verify-'));
                    for (const file of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(consumer, file), path.join(target, file));
                }
                await npmInstall(target, registry, work, { ci: true, cache: options.mode === 'verify' ? path.basename(target) + '-cache' : 'install-cache' });
                assertInstalled(target);
                assert.deepEqual(readJSON(path.join(target, 'package-lock.json')), lock, 'npm ci changed the portable lock');
            }
            console.error(`${options.mode}: ${consumer}`);
        }
        writeJSON(path.join(work, 'registry-requests.json'), registry.requests);
        console.log(JSON.stringify({ work, mode: options.mode, consumers: options.consumers.length ? options.consumers : [ROOT] }, null, 2));
    } finally { await registry.close(); }
}

module.exports = { ROOT, NAMES, VERSIONS, PUBLIC_REGISTRY, readJSON, writeJSON, digest, assertManifest, parseOptions, repositories, discoverSource,
    makeWork, npmCLI, npmEnvironment, run, packPackages, parsePackOutput, loadArchives, startRegistry, portableLock, assertInstalled, assertArchiveLock, npmInstall, generateLock, HELP, main };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
