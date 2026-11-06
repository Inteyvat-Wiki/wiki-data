'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {Readable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {createRequire} = require('node:module');
const {GUEST, PACKAGES, validateLock, readJSON, writeJSON, verifyFile, hashFile, httpsURL, relative} = require('./sandbox-common.cjs');

async function publicFetch(url, options = {}, fetcher = fetch) {
    // No credentials, caller headers, environment proxy tokens, or HTTP downgrade.
    let current = url;
    for (let hop = 0; hop <= 5; hop++) {
        const parsed = new URL(current);
        assert(parsed.protocol === 'https:' && !parsed.username && !parsed.password, 'Download requires HTTPS');
        const response = await fetcher(current, {redirect: 'manual', headers: {'user-agent': 'Inteyvat-Wiki-sandbox-deployment'}, signal: AbortSignal.timeout(options.timeoutMs || 600000)});
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const next = response.headers.get('location'); await response.body?.cancel();
            assert(next, 'Redirect without location'); current = new URL(next, current).href; continue;
        }
        assert(response.ok, `Public download failed (HTTP ${response.status})`);
        return response;
    }
    throw new Error('Too many download redirects');
}
async function download(spec, file, fetcher = fetch) {
    httpsURL(spec.url);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    assert(!fs.existsSync(file) && !fs.existsSync(file + '.partial'), 'Download destination already exists');
    const response = await publicFetch(spec.url, {}, fetcher);
    assert(response.body, 'Download has no body');
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(file + '.partial', {flags: 'wx'}));
    await verifyFile(file + '.partial', spec);
    fs.renameSync(file + '.partial', file);
}
async function apiJSON(url) {
    const response = await publicFetch(url, {timeoutMs: 60000});
    const body = await response.text(); assert(body.length < 8 * 1024 * 1024, 'Metadata response too large');
    return JSON.parse(body);
}
function verifyAnimeMetadata(spec, run, artifact) {
    assert.equal(run.id, spec.runId); assert.equal(run.head_sha, spec.commit);
    assert.equal(run.run_attempt, spec.runAttempt); assert.equal(run.conclusion, 'success');
    assert.equal(artifact.id, spec.artifactId); assert.equal(artifact.expired, false);
    assert.equal(artifact.workflow_run?.id, spec.runId); assert.equal(artifact.workflow_run?.head_sha, spec.commit);
    assert.equal(decodeURIComponent(new URL(spec.url).pathname.split('/').pop()), artifact.name + '.zip');
    if (artifact.digest) assert.equal(artifact.digest, 'sha256:' + spec.sha256, 'Actions artifact digest changed');
}
function runner(logRoot, baseEnvironment) {
    let sequence = 0;
    return (name, file, args, cwd, env = {}) => new Promise((resolve, reject) => {
        const log = path.join(logRoot, `${String(++sequence).padStart(2, '0')}-${name}.log`);
        const fd = fs.openSync(log, 'wx');
        const child = spawn(file, args, {cwd, windowsHide: true, env: {...baseEnvironment, ...env}, stdio: ['ignore', 'pipe', 'pipe']});
        let tail = '';
        const collect = chunk => { fs.writeSync(fd, chunk); tail = (tail + chunk).slice(-32768); };
        child.stdout.on('data', collect); child.stderr.on('data', collect);
        child.once('error', reject);
        child.once('close', code => { fs.closeSync(fd); code === 0 ? resolve(tail) : reject(new Error(`${name} failed (${code}); see ${path.basename(log)}`)); });
    });
}
function sourceFetchArgs(repo, withHistory) {
    return ['fetch', '--no-tags', ...(withHistory ? [] : ['--depth=1']), 'origin', ...new Set([repo.commit, ...(withHistory ? repo.history || [] : [])])];
}
async function fetchRepository(run, git, name, repo, destination, history = false) {
    fs.mkdirSync(destination);
    const command = (step, args) => run(`${name}-${step}`, git, ['-c', 'core.autocrlf=false', '-c', 'core.longpaths=true', '-C', destination, ...args], GUEST.work);
    await command('init', ['init', '--quiet']);
    await command('remote', ['remote', 'add', 'origin', repo.url]);
    await command('fetch', sourceFetchArgs(repo, history));
    await command('checkout', ['checkout', '--detach', repo.commit]);
    assert.equal((await command('identity', ['rev-parse', 'HEAD'])).trim(), repo.commit);
    if (history) {
        assert.equal((await command('history', ['rev-parse', '--is-shallow-repository'])).trim(), 'false', 'Version inference cannot use shallow history');
        for (const hash of repo.history) await command('history-endpoint', ['cat-file', '-e', hash + '^{commit}']);
    }
}
async function listOutputs(root) {
    const files = [];
    for (const entry of fs.readdirSync(root, {recursive: true, withFileTypes: true})) {
        assert(!entry.isSymbolicLink(), 'Output symlinks forbidden');
        if (entry.isFile()) {
            const file = path.join(entry.parentPath, entry.name);
            files.push({path: path.relative(root, file).split(path.sep).join('/'), bytes: fs.statSync(file).size, sha256: await hashFile(file)});
        }
    }
    return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
async function main() {
    assert.equal(process.platform, 'win32', 'Guest deployment requires Windows');
    const runInfo = readJSON(path.join(GUEST.input, 'run.json'));
    assert.equal(process.env.INTEYVAT_SANDBOX_RUN, runInfo.id, 'Launch only through bootstrap-sandbox.ps1 in a new sandbox');
    const lock = validateLock(readJSON(path.join(GUEST.input, 'lock.json')));
    assert.equal(await hashFile(path.join(GUEST.input, 'lock.json')), runInfo.lockSha256);
    assert.equal(process.versions.node, lock.tools.node.version);
    const result = {schema: 1, id: runInfo.id, lockSha256: runInfo.lockSha256, status: 'failed',
        mode: lock.job.mode, versions: lock.job.versions, productionReady: false, startedAt: new Date().toISOString()};
    let phase = 'tools';
    try {
        const tools = path.join(GUEST.work, 'tools'), downloads = path.join(GUEST.work, 'downloads');
        const logs = path.join(GUEST.output, 'logs'), provenance = path.join(GUEST.output, 'provenance');
        fs.mkdirSync(logs, {recursive: true}); fs.mkdirSync(provenance);
        // The caller's credentials/config are not transported into the sandbox. Also defeat ambient guest config.
        const env = {...process.env, NODE_PATH: '', GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1',
            GIT_CONFIG_GLOBAL: 'NUL', DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1',
            DOTNET_MULTILEVEL_LOOKUP: '0', DOTNET_CLI_HOME: path.join(GUEST.work, 'dotnet-home'), NUGET_PACKAGES: path.join(GUEST.work, 'nuget'),
            npm_execpath: path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')};
        const run = runner(logs, env);
        const powershell = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
        const expand = (file, dest, merge = false) => run('unzip', powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
            '-File', path.join(GUEST.input, 'bootstrap-sandbox.ps1'), '-Mode', 'Expand', '-Archive', file, '-Destination', dest, ...(merge ? ['-Merge'] : [])], GUEST.work);
        const anime = lock.tools.animeStudio;
        const animeRun = await apiJSON(`https://api.github.com/repos/Escartem/AnimeStudio/actions/runs/${anime.runId}`);
        const animeArtifact = await apiJSON(`https://api.github.com/repos/Escartem/AnimeStudio/actions/artifacts/${anime.artifactId}`);
        verifyAnimeMetadata(anime, animeRun, animeArtifact);
        writeJSON(path.join(provenance, 'anime-studio.json'), {commit: anime.commit, runId: anime.runId, runAttempt: anime.runAttempt,
            artifactId: anime.artifactId, name: animeArtifact.name, sha256: anime.sha256});
        for (const key of ['git', 'dotnetSdk', 'dotnetRuntime', 'animeStudio']) {
            const file = path.join(downloads, key + '.zip'); await download(lock.tools[key], file);
            await expand(file, path.join(tools, key.startsWith('dotnet') ? 'dotnet' : key), key === 'dotnetRuntime');
        }
        const git = path.join(tools, 'git', lock.tools.git.root || '', 'cmd/git.exe');
        const dotnet = path.join(tools, 'dotnet/dotnet.exe');
        const studio = path.join(tools, 'animeStudio', anime.root || '');
        assert(fs.existsSync(path.join(studio, 'AnimeStudio.CLI.exe')) && fs.existsSync(path.join(studio, 'bin/AnimeStudio.CLI.runtimeconfig.json')), 'Unexpected AnimeStudio layout');
        const cli = readJSON(path.join(studio, 'bin/AnimeStudio.CLI.runtimeconfig.json'));
        const frameworks = cli.runtimeOptions.frameworks || [cli.runtimeOptions.framework];
        assert(frameworks.every(item => item?.name === 'Microsoft.NETCore.App' && item.version.split('.')[0] === lock.tools.dotnetRuntime.version.split('.')[0]), 'AnimeStudio runtime does not match the pinned .NET runtime');
        env.PATH = [path.dirname(process.execPath), path.dirname(git), path.dirname(dotnet), 'C:\\Windows\\System32', 'C:\\Windows'].join(';');
        delete env.Path;
        env.DOTNET_ROOT = path.dirname(dotnet); env.DOTNET_ROOT_X64 = path.dirname(dotnet); env.DOTNET_HOST_PATH = dotnet;
        assert((await run('git-version', git, ['--version'], GUEST.work)).includes('git version ' + lock.tools.git.version));
        assert((await run('dotnet-sdk', dotnet, ['--list-sdks'], GUEST.work)).split(/\r?\n/).some(line => line.startsWith(lock.tools.dotnetSdk.version + ' ')));
        assert((await run('dotnet-runtime', dotnet, ['--list-runtimes'], GUEST.work)).includes('Microsoft.NETCore.App ' + lock.tools.dotnetRuntime.version + ' '));
        Object.assign(process.env, env); // pack helper inherits this deliberately constrained guest toolchain.
        phase = 'repositories';
        const repos = {}, reposRoot = path.join(GUEST.work, 'repos'); fs.mkdirSync(reposRoot);
        for (const [name, repo] of Object.entries(lock.repositories)) {
            repos[name] = path.join(reposRoot, name);
            await fetchRepository(run, git, name, repo, repos[name], name === 'source' && lock.job.versions);
        }
        phase = 'packages';
        const local = require(path.join(repos.wikiData, 'scripts/local_packages.cjs'));
        assert.deepEqual(local.NAMES, PACKAGES, 'The locked package workflow has a different package contract');
        const work = path.join(GUEST.work, 'packages'); fs.mkdirSync(work);
        await run('contracts-dependencies', process.execPath, [env.npm_execpath, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/'],
            repos.contracts, local.npmEnvironment(work));
        const sources = Object.fromEntries(Object.entries(PACKAGES).map(([key, name]) => [name, repos[key]]));
        const packages = await local.packPackages(local.repositories({sources}, repos.wikiData), work);
        writeJSON(path.join(provenance, 'packages.json'), packages.map(item => ({name: item.name, version: item.metadata.version, integrity: item.integrity, shasum: item.shasum})));
        const registry = await local.startRegistry(packages);
        try {
            // Fresh unpublished tarballs legitimately change integrity. Only the disposable consumer lock is rewritten.
            await local.generateLock(repos.wikiData, registry, work);
            local.assertArchiveLock(readJSON(path.join(repos.wikiData, 'package-lock.json')), packages);
            await local.npmInstall(repos.wikiData, registry, work, {ci: true}); local.assertInstalled(repos.wikiData);
        } finally { await registry.close(); }
        fs.copyFileSync(path.join(repos.wikiData, 'package-lock.json'), path.join(provenance, 'package-lock.json'));
        await run('types', process.execPath, [env.npm_execpath, 'run', 'check:types'], repos.wikiData);
        await run('deployment-types', process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'scripts/deployment/sandbox-types.tsconfig.json'], repos.wikiData);
        phase = 'resources';
        const resolver = createRequire(path.join(repos.wikiData, 'package.json'));
        const api = resolver('@inteyvat-wiki/resource-tools');
        const resourceRoot = path.join(GUEST.work, 'resources'), cache = path.join(GUEST.work, 'cache');
        fs.mkdirSync(resourceRoot); fs.mkdirSync(cache);
        for (const file of lock.resources?.files || []) {
            const target = path.join(resourceRoot, relative(file.path)); fs.mkdirSync(path.dirname(target), {recursive: true});
            if (file.input) {
                assert.equal(file.input, 'resources/' + file.path, 'Host did not stage this input');
                const source = path.join(GUEST.input, relative(file.input)); await verifyFile(source, file);
                fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL); await verifyFile(target, file);
            } else await download(file, target);
        }
        for (const kind of ['images', 'lua']) if (lock.resources?.[kind]?.length) {
            const entries = lock.resources[kind].map(entry => ({...entry, Source: path.join(resourceRoot, entry.Source)}));
            const output = path.join(cache, 'resources', kind, 'extracted');
            const options = {entries, studio, dotnet, game: lock.resources.game, output, inputs: [path.join(GUEST.input, 'lock.json')], timeoutMs: 600000};
            const report = kind === 'images' ? api.extractResources({...options, selection: 'largest'}) : api.extractLuaResources(options);
            writeJSON(path.join(provenance, `extraction-${kind}.json`), report);
        }
        const data = path.join(GUEST.output, 'data');
        const config = {version: 1, source: {root: repos.source, historyRefs: lock.repositories.source.history || [lock.repositories.source.commit], versions: lock.job.versions},
            resources: {studio, dotnet, root: resourceRoot, game: 'GI', luaRoot: path.join(cache, 'resources/lua/extracted'), imageRoots: [path.join(cache, 'resources/images')]},
            cache: {root: cache}, output: {data}};
        const configFile = path.join(GUEST.work, 'wiki-data.config.json'); writeJSON(configFile, config);
        const configEnv = {WIKI_DATA_CONFIG: configFile};
        phase = 'export';
        if (lock.job.mode === 'smoke') {
            await run('real-sample', process.execPath, ['--import', 'tsx', 'scripts/deployment/sandbox-smoke.ts', path.join(GUEST.input, 'lock.json'), path.join(provenance, 'sample.json')], repos.wikiData, configEnv);
        } else {
            await run('pipeline', process.execPath, ['scripts/pipeline.cjs', 'export', lock.job.target, '--config', configFile], repos.wikiData, configEnv);
        }
        const outputs = await listOutputs(data);
        assert(outputs.some(file => /\/items\/.*\.json$/.test(file.path)), 'No real exported items');
        if (lock.job.requireImages) assert(outputs.some(file => file.path.startsWith('images/') && file.path.endsWith('.png')), 'No exported image');
        for (const file of outputs.filter(file => file.path.endsWith('.png'))) api.validatePng(fs.readFileSync(path.join(data, file.path)));
        writeJSON(path.join(provenance, 'outputs.json'), outputs);
        writeJSON(path.join(provenance, 'lock.json'), lock);
        writeJSON(path.join(provenance, 'bootstrap.json'), runInfo);
        Object.assign(result, {status: 'passed', files: outputs.length, images: outputs.filter(file => file.path.endsWith('.png')).length,
            sourceCommit: lock.repositories.source.commit, note: 'Deployment test only. No upload or production validation; preserve provenance when merging a sample into a complete dataset.'});
    } catch (error) {
        Object.assign(result, {phase, error: error.message}); process.exitCode = 1; console.error(error.stack);
    } finally {
        result.finishedAt = new Date().toISOString(); writeJSON(path.join(GUEST.output, 'result.json'), result);
    }
}
module.exports = {publicFetch, download, verifyAnimeMetadata, sourceFetchArgs, listOutputs, main};
if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });
