'use strict';
// Test real tarballs, not workspace symlinks. Never reads or writes production data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const npm = process.env.npm_execpath;
assert(npm && fs.existsSync(npm), 'Run through npm run check:packages');
fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
const work = fs.mkdtempSync(path.join(root, 'tmp', 'package-integration-'));
const archives = path.join(work, 'archives'), consumer = path.join(work, 'consumer');
fs.mkdirSync(archives); fs.mkdirSync(consumer);
const repositories = [
    { name: '@inteyvat-wiki/resource-tools', directory: path.resolve(root, '../Inteyvat-Wiki-resource-tools') },
    { name: '@inteyvat-wiki/wiki-contracts', directory: path.resolve(root, '../Inteyvat-Wiki-contracts') },
    { name: 'genshindata-scripts', directory: path.resolve(root, '../GenshinData-scripts') },
    { name: 'genshin-db', directory: path.resolve(root, '../genshin-db') },
];
function command(args, cwd = consumer, env = {}) {
    const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', windowsHide: true,
        env: { ...process.env, NODE_PATH: '', ...env }, maxBuffer: 16 * 1024 * 1024 });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
    return result.stdout;
}
const packages = repositories.map(repository => {
    if (repository.name === '@inteyvat-wiki/resource-tools') command([npm, 'run', 'build:helper'], repository.directory);
    if (repository.name === '@inteyvat-wiki/wiki-contracts') command([npm, 'run', 'build'], repository.directory);
    const [packed] = JSON.parse(command([npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', archives], repository.directory));
    const names = packed.files.map(file => file.path);
    assert(names.some(file => /^LICENSE(?:\.|$)/.test(file)), `${repository.name}: missing license`);
    assert(names.some(file => file.toLowerCase() === 'readme.md'), `${repository.name}: missing README`);
    const ownBridge = repository.name === '@inteyvat-wiki/resource-tools' ? 'dist/bridge/ResourceTools.Bridge.dll' : null;
    const forbidden = names.filter(file => file !== ownBridge && (/((^|\/)(?:node_modules|\.git|\.cache|tmp|data|ExcelBinOutput|BinOutput|TextMap)(\/|$))/i.test(file)
        || /\.(?:exe|dll|blk|luac|png|map|tgz|ps1)$/i.test(file)));
    assert.deepEqual(forbidden, [], `${repository.name}: package contains inputs/build outputs`);
    if (ownBridge) {
        assert(names.includes(ownBridge), 'Missing compiled project-owned bridge');
        assert(names.includes('dist/bridge/build-info.json'), 'Missing bridge provenance');
    }
    if (repository.name === 'genshindata-scripts') {
        for (const file of fs.readdirSync(path.join(repository.directory, 'resources'))
            .filter(file => file.endsWith('.js') && !file.endsWith('.test.js'))) {
            assert(names.includes(`resources/${file}`), `Missing runtime resource module: ${file}`);
        }
        assert(!names.includes('config.json'), 'Local source paths must not be packaged');
    }
    return { name: repository.name, filename: path.join(archives, packed.filename), files: names.length, bytes: packed.unpackedSize };
});
// Development packages still use sibling file: dependencies. Override ONLY those
// known links with the actual tarballs; never satisfy them through workspace links.
const dependencies = Object.fromEntries(packages.map(item => [item.name, `file:${item.filename.replaceAll('\\', '/')}`]));
const overrides = Object.fromEntries(['@inteyvat-wiki/resource-tools', 'genshindata-scripts'].map(name => [name, `$${name}`]));
fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'isolated-package-consumer', version: '0.0.0', private: true, dependencies, overrides }));
command([npm, 'install', process.argv.includes('--offline') ? '--offline' : '--prefer-offline',
    '--ignore-scripts', '--no-audit', '--no-fund'], consumer, {PATH:''});
const forbiddenRoots = repositories.map(repository => repository.directory.replaceAll('\\', '/').toLowerCase() + '/');
const typeImports = [];
for (const item of packages) {
    const directory = path.join(consumer, 'node_modules', ...item.name.split('/'));
    assert(!fs.lstatSync(directory).isSymbolicLink(), 'Smoke test must install files, not a workspace link');
    const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
    assert.equal(metadata.name, item.name);
    for (const [name, version] of Object.entries(metadata.dependencies || {})) {
        if (/^(?:file:|link:|workspace:)/.test(version)) {
            assert(['genshindata-scripts', 'genshin-db'].includes(item.name) && metadata.private === true && Object.hasOwn(overrides, name),
                `Unmapped local dependency: ${item.name}/${name}`);
        }
    }
    const entryPoints = Object.keys(metadata.exports || { '.': metadata.main })
        .filter(key => key !== './package.json' && !key.includes('*'))
        .map(key => key === '.' ? item.name : item.name + key.slice(1));
    for (const name of entryPoints) typeImports.push(`import * as Package${typeImports.length} from ${JSON.stringify(name)};\nexport { Package${typeImports.length} };`);
    const script = `const assert=require('node:assert/strict');const fs=require('node:fs');
        const original=fs.readFileSync;fs.readFileSync=function(file,...args){
            const normalized=String(file).replaceAll('\\\\','/').toLowerCase();
            assert(!${JSON.stringify(forbiddenRoots)}.some(root=>normalized.startsWith(root)),'Read workspace source: '+file);
            return original.call(this,file,...args);
        };
        assert(Object.keys(require(${JSON.stringify(item.name)})).length>0);
        Promise.all(${JSON.stringify(entryPoints)}.map(async entry=>{
            const api=require(entry),module=await import(entry);
            for(const name of Object.keys(api))assert(name in module || name in (module.default||{}),'Missing ESM export: '+entry+'/'+name);
        })).catch(error=>{console.error(error);process.exitCode=1});`;
    command(['-e', script]);
    if (metadata.bin) for (const bin of Object.values(typeof metadata.bin === 'string' ? { cli: metadata.bin } : metadata.bin)) {
        command([path.join(directory, bin), '--help']);
    }
    if (item.name === '@inteyvat-wiki/resource-tools') {
        assert(!metadata.scripts.install && !metadata.scripts.postinstall && !metadata.scripts.prepare, 'Consumers must not compile during install');
        // Exercise the actual packed DLL, with PATH empty and no SDK/build commands.
        command(['-e', `const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
            const root=${JSON.stringify(directory)}, studio=path.resolve('bridge-studio');
            fs.mkdirSync(path.join(studio,'bin'),{recursive:true});
            fs.writeFileSync(path.join(studio,'bin/AnimeStudio.CLI.runtimeconfig.json'),JSON.stringify({runtimeOptions:{tfm:'net8.0',framework:{name:'Microsoft.NETCore.App',version:'8.0.0'},rollForward:'LatestMajor'}}));
            const bridge=require(path.join(root,'lib/bridge.cjs')); const host=bridge.dotnetHost();
            process.env.PATH=''; process.env.DOTNET_ROOT=''; process.env.DOTNET_ROOT_X64='';
            const result=bridge.runBridge({mode:'probe',studio},{dotnet:host});
            assert.equal(JSON.parse(result.result).bridge,1);`]);
    }
}
// The contracts package must also be usable in a browser, without Node shims.
require('esbuild').buildSync({ stdin: { contents: "export * from '@inteyvat-wiki/wiki-contracts';", resolveDir: consumer },
    bundle: true, platform: 'browser', format: 'esm', write: false, logLevel: 'silent' });
for (const extension of ['cts', 'mts']) fs.writeFileSync(path.join(consumer, `contracts.${extension}`), typeImports.join('\n'));
fs.writeFileSync(path.join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    noEmit: true, strict: true, target: 'ES2022', module: 'Node16', moduleResolution: 'Node16',
    typeRoots: [path.join(root, 'node_modules/@types')], types: ['node'],
}, files: ['contracts.cts', 'contracts.mts'] }));
command([require.resolve('typescript/bin/tsc'), '--project', path.join(consumer, 'tsconfig.json')]);
fs.copyFileSync(path.join(__dirname, 'package_snapshot_smoke.cjs'), path.join(consumer, 'snapshot-smoke.cjs'));
command(['snapshot-smoke.cjs'], consumer, { GENSHIN_PACKAGE_FORBIDDEN_ROOTS: JSON.stringify(forbiddenRoots),
    GENSHIN_DATA_RUNTIME_CONFIG: '{}', GENSHIN_DATA_CACHE: '', GENSHIN_DB_CACHE: '' });
const report = { work, packages, commonJS: true, esm: true, browserContracts: true, declarations: true, cliHelp: true,
    isolatedInstall: true, localDependencyOverrides: Object.keys(overrides), packedBridgeWithoutPath: true, packedSnapshotAndQuery: true };
fs.writeFileSync(path.join(work, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
