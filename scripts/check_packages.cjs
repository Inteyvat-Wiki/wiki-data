'use strict';
// Real npm transitive resolution, followed by a cold-cache npm ci from portable locks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const local = require('./local_packages.cjs');
const { ROOT: root, NAMES, VERSIONS, readJSON, writeJSON, run } = local;

async function main() {
    const options = local.parseOptions(process.argv.slice(2));
    if (options.help) { console.log(local.HELP); return; }
    assert(!options.mode && !options.consumers.length, 'check:packages always uses fresh isolated consumers');
    const work = local.makeWork();
    const packages = options.archives ? local.loadArchives(options.archives) : await local.packPackages(local.repositories(options), work);
    const consumer = path.join(work, 'consumer'), first = path.join(work, 'resolution'), browser = path.join(work, 'browser');
    for (const directory of [consumer, first, browser]) fs.mkdirSync(directory);
    // Only these two roots are requested. GDS and tools MUST arrive transitively.
    const manifest = { name: 'isolated-package-consumer', version: '0.0.0', private: true,
        dependencies: { [NAMES.db]: VERSIONS[NAMES.db], [NAMES.contracts]: VERSIONS[NAMES.contracts] } };
    writeJSON(path.join(first, 'package.json'), manifest);
    const registry = await local.startRegistry(packages);
    try {
        await local.npmInstall(first, registry, work, { noPath: true, cache: 'resolution-cache' });
        const lock = local.portableLock(readJSON(path.join(first, 'package-lock.json')), registry.url);
        for (const item of packages) {
            assert.equal(lock.packages[`node_modules/${item.name}`].integrity, item.integrity);
            assert(registry.requests.some(request => request.path === item.name), `No registry metadata resolution for ${item.name}`);
        }
        writeJSON(path.join(consumer, 'package.json'), manifest);
        writeJSON(path.join(consumer, 'package-lock.json'), lock);
        registry.requests.length = 0;
        // Empty second cache + a new directory prove this is not warmed-cache luck.
        await local.npmInstall(consumer, registry, work, { ci: true, noPath: true, cache: 'cold-ci-cache' });
        for (const item of packages) assert(registry.requests.some(request => request.local && request.path.startsWith(`${item.name}/-/`)), `npm ci did not fetch ${item.name}`);
        local.assertInstalled(consumer);
        assert.deepEqual(readJSON(path.join(consumer, 'package.json')), manifest);
        assert.deepEqual(readJSON(path.join(consumer, 'package-lock.json')), lock, 'npm ci changed the portable lock');
        writeJSON(path.join(browser, 'package.json'), { name: 'contracts-only-consumer', version: '0.0.0', private: true,
            dependencies: { [NAMES.contracts]: VERSIONS[NAMES.contracts] } });
        await local.npmInstall(browser, registry, work, { noPath: true, cache: 'browser-cache' });
        const browserLock = readJSON(path.join(browser, 'package-lock.json'));
        assert.deepEqual(Object.keys(browserLock.packages).sort(), ['', `node_modules/${NAMES.contracts}`]);
        local.assertInstalled(browser);
        writeJSON(path.join(work, 'registry-requests.json'), registry.requests);
    } finally { await registry.close(); }

    const forbiddenRoots = packages.map(item => item.directory.replaceAll('\\', '/').toLowerCase() + '/');
    const guard = path.join(consumer, 'package-runtime-guard.cjs');
    fs.copyFileSync(path.join(__dirname, 'package_runtime_guard.cjs'), guard);
    const runtimeEnv = { GENSHIN_PACKAGE_CONSUMER_ROOT: consumer, NODE_OPTIONS: `--require ${JSON.stringify(guard)}` };
    const runtime = (args, env = {}) => run(args, consumer, { ...runtimeEnv, ...env });
    const typeImports = [], runtimeOnlyExports = [];
    for (const item of packages) {
        const directory = path.join(consumer, 'node_modules', ...item.name.split('/'));
        const metadata = readJSON(path.join(directory, 'package.json'));
        assert.equal(metadata.name, item.name);
        local.assertManifest(metadata, true);
        const entryPoints = Object.keys(metadata.exports || { '.': metadata.main })
            .filter(key => key !== './package.json' && !key.includes('*'))
            .map(key => key === '.' ? item.name : item.name + key.slice(1));
        for (const name of entryPoints) {
            const key = name === item.name ? '.' : '.' + name.slice(item.name.length);
            const target = metadata.exports?.[key];
            const declaresTypes = value => typeof value === 'string' ? /\.d\.(?:ts|mts|cts)$/.test(value)
                : !!value && Object.values(value).some(declaresTypes);
            if ((key === '.' && metadata.types) || declaresTypes(target)) {
                typeImports.push(`import * as Package${typeImports.length} from ${JSON.stringify(name)};\nexport { Package${typeImports.length} };`);
            } else runtimeOnlyExports.push(name); // Explicit JS-only fixture helpers still get CJS/ESM runtime checks.
        }
        await runtime(['-e', `const assert=require('node:assert/strict');const fs=require('node:fs');
            const original=fs.readFileSync;fs.readFileSync=function(file,...args){
                const normalized=String(file).replaceAll('\\\\','/').toLowerCase();
                assert(!${JSON.stringify(forbiddenRoots)}.some(root=>normalized.startsWith(root)),'Read workspace source: '+file);
                return original.call(this,file,...args);
            };
            assert(Object.keys(require(${JSON.stringify(item.name)})).length>0);
            Promise.all(${JSON.stringify(entryPoints)}.map(async entry=>{
                const api=require(entry),module=await import(entry);
                for(const name of Object.keys(api))assert(name in module || name in (module.default||{}),'Missing ESM export: '+entry+'/'+name);
            })).catch(error=>{console.error(error);process.exitCode=1});`]);
        if (metadata.bin) for (const bin of Object.values(typeof metadata.bin === 'string' ? { cli: metadata.bin } : metadata.bin)) {
            await runtime([path.join(directory, bin), '--help']);
        }
        if (item.name === NAMES.tools) {
            // Execute the packed DLL using only a runtime host, never SDK/build commands.
            await runtime(['-e', `const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
                const root=${JSON.stringify(directory)}, studio=path.resolve('bridge-studio');
                fs.mkdirSync(path.join(studio,'bin'),{recursive:true});
                fs.writeFileSync(path.join(studio,'bin/AnimeStudio.CLI.runtimeconfig.json'),JSON.stringify({runtimeOptions:{tfm:'net8.0',framework:{name:'Microsoft.NETCore.App',version:'8.0.0'},rollForward:'LatestMajor'}}));
                const bridge=require(path.join(root,'lib/bridge.cjs')); const host=bridge.dotnetHost();
                process.env.PATH=''; process.env.DOTNET_ROOT=''; process.env.DOTNET_ROOT_X64='';
                const result=bridge.runBridge({mode:'probe',studio},{dotnet:host});
                assert.equal(JSON.parse(result.result).bridge,1);`]);
        }
    }
    require('esbuild').buildSync({ stdin: { contents: `export * from '${NAMES.contracts}';`, resolveDir: browser },
        bundle: true, platform: 'browser', format: 'esm', write: false, logLevel: 'silent' });
    for (const extension of ['cts', 'mts']) fs.writeFileSync(path.join(consumer, `contracts.${extension}`), typeImports.join('\n'));
    writeJSON(path.join(consumer, 'tsconfig.json'), { compilerOptions: {
        noEmit: true, strict: true, target: 'ES2022', module: 'Node16', moduleResolution: 'Node16',
        typeRoots: [path.join(root, 'node_modules/@types')], types: ['node'],
    }, files: ['contracts.cts', 'contracts.mts'] });
    await run([require.resolve('typescript/bin/tsc'), '--project', path.join(consumer, 'tsconfig.json')], consumer);
    fs.copyFileSync(path.join(__dirname, 'package_snapshot_smoke.cjs'), path.join(consumer, 'snapshot-smoke.cjs'));
    await runtime(['snapshot-smoke.cjs'], { GENSHIN_PACKAGE_FORBIDDEN_ROOTS: JSON.stringify(forbiddenRoots),
        GENSHIN_DATA_RUNTIME_CONFIG: '{}', GENSHIN_DATA_CONFIG: '', GENSHIN_DATA_SOURCE: '', GENSHIN_DATA_CACHE: '', GENSHIN_DB_CACHE: '' });
    const report = { work, archives: path.dirname(packages[0].filename), packages: packages.map(({ name, files, bytes, integrity }) => ({ name, files, bytes, integrity })),
        commonJS: true, esm: true, browserContractsOnly: true, declarations: true, runtimeOnlyExports, cliHelp: true,
        transitiveRegistryResolution: true, coldCachePortableLockCi: true, isolatedInstall: true, noAncestorModuleFallback: true,
        localDependencyOverrides: [], consumerBuildHooks: false, packedBridgeWithoutPath: true, packedSnapshotAndQuery: true };
    writeJSON(path.join(work, 'report.json'), report);
    console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
