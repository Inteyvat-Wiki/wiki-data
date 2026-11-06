'use strict';
// Explicit Linux deployment build; no npm publication and no production activation.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

function run(command, args, cwd) {
    const result = cp.spawnSync(command, args, {cwd, stdio: 'inherit', env: {...process.env, NODE_PATH: ''}});
    assert.equal(result.status, 0, `${command} failed (${result.status})`);
}
function checkout(repo, sha, target) {
    assert(/^[0-9a-f]{40}$/.test(sha), 'A full commit SHA is required');
    assert(!fs.existsSync(target), `Destination exists: ${target}`);
    run('git', ['clone', '--no-checkout', `https://github.com/Inteyvat-Wiki/${repo}.git`, target]);
    run('git', ['checkout', '--detach', sha], target);
    return target;
}
async function main(args = process.argv.slice(2)) {
    assert.equal(args.length, 4, 'Usage: linux-build.cjs NEW_DIRECTORY WIKI_SHA CONTRACTS_SHA WIKI_DATA_SHA');
    const [directory, wikiSHA, contractsSHA, dataSHA] = args;
    const root = path.resolve(directory);
    assert(!fs.existsSync(root), 'Build directory must be new');
    fs.mkdirSync(root, {recursive: true});
    const wiki = checkout('wiki', wikiSHA, path.join(root, 'wiki'));
    run('git', ['submodule', 'update', '--init', '--recursive'], wiki);
    const contracts = checkout('wiki-contracts', contractsSHA, path.join(root, 'contracts'));
    const data = checkout('wiki-data', dataSHA, path.join(root, 'wiki-data'));
    const npm = path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
    assert(fs.existsSync(npm), 'Use the official Node Linux distribution, including npm');
    process.env.npm_execpath = npm;
    const packages = require(path.join(data, 'scripts/local_packages.cjs'));
    const work = path.join(root, 'package-work');
    fs.mkdirSync(work);
    // All npm configuration and caches belong to this build, not the operator.
    const env = packages.npmEnvironment(work);
    await packages.run([npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/'], contracts, env);
    const metadata = packages.readJSON(path.join(contracts, 'package.json'));
    packages.assertManifest(metadata, true);
    const archives = await packages.packPackages([{name: metadata.name, directory: contracts, metadata}], work);
    const registry = await packages.startRegistry(archives);
    try {
        // Unpublished packages are rebuilt from pinned source. Retain third-party pins,
        // but record the actual archive integrity in this deployment's local lock.
        await packages.generateLock(wiki, registry, work);
        await packages.npmInstall(wiki, registry, work, {ci: true});
        packages.assertInstalled(wiki);
    } finally { await registry.close(); }
    run(process.execPath, [npm, 'run', 'check'], wiki);
    run(process.execPath, [npm, 'run', 'build'], wiki);
    const serverSHA = cp.execFileSync('git', ['rev-parse', 'HEAD'], {cwd: path.join(wiki, 'server'), encoding: 'utf8'}).trim();
    const record = {schema: 1, wikiSHA, contractsSHA, dataSHA, serverSHA, node: process.version,
        createdAt: new Date().toISOString(), contractsIntegrity: archives[0].integrity,
        lockSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(wiki, 'package-lock.json'))).digest('hex')};
    fs.writeFileSync(path.join(root, 'deployment.json'), JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify({built: wiki, ...record}));
}
module.exports = {main};
if (require.main === module) main().catch(error => {console.error(error); process.exitCode = 1;});
