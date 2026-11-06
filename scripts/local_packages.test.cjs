'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const local = require('./local_packages.cjs');

test('npm pack JSON is read after lifecycle build output', () => {
    const result = [{ filename: 'package.tgz', integrity: 'sha512-example' }];
    assert.deepEqual(local.parsePackOutput('Built bridge.\n[build log]\n' + JSON.stringify(result)), result);
    assert.deepEqual(local.parsePackOutput(JSON.stringify(result)), result);
    assert.throws(() => local.parsePackOutput('No JSON'), /did not return/);
});

test('production manifests reject links, overrides, old names and non-exact owned versions', () => {
    for (const spec of ['file:../repo', 'link:../repo', 'workspace:*', '../repo', 'D:/repo']) {
        assert.throws(() => local.assertManifest({ dependencies: { x: spec } }), /local dependency/);
    }
    assert.throws(() => local.assertManifest({ overrides: {} }), /overrides/);
    assert.throws(() => local.assertManifest({ dependencies: { 'genshin-db': '0.1.0' } }), /Unscoped/);
    assert.throws(() => local.assertManifest({ dependencies: { [local.NAMES.db]: '^0.1.0' } }), /pin/);
    assert.throws(() => local.assertManifest({ name: local.NAMES.tools, version: '0.1.0', scripts: { install: 'build' } }, true), /consumer build/);
    assert.doesNotThrow(() => local.assertManifest({ dependencies: { [local.NAMES.db]: '0.1.0' } }));
    assert.doesNotThrow(() => local.assertManifest({ name: local.NAMES.db, version: '0.1.0', private: true,
        scripts: { prepublishOnly: 'node disabled.cjs' } }, true));
});

test('options require explicit valid source names; never assume sibling repositories', () => {
    const options = local.parseOptions(['pack', '--source', `${local.NAMES.db}=./repo with spaces`, '--consumer', './consumer']);
    assert.equal(options.sources[local.NAMES.db], path.resolve('repo with spaces'));
    assert.throws(() => local.parseOptions(['--source', 'genshin-db=../repo']), /Use --source/);
    assert.throws(() => local.parseOptions(['--consumer']), /Missing/);
    assert.throws(() => local.parseOptions(['--offline']), /Unknown/);
});

test('changed unpublished archives fail before install can touch node_modules', () => {
    const name = local.NAMES.db, metadata = { name, version: '0.1.0' }, integrity = 'sha512-current';
    const lock = { packages: { [`node_modules/${name}`]: { version: '0.1.0', integrity,
        resolved: 'https://registry.npmjs.org/@inteyvat-wiki/genshin-db/-/genshin-db-0.1.0.tgz' } } };
    assert.doesNotThrow(() => local.assertArchiveLock(lock, [{ name, metadata, integrity }]));
    assert.throws(() => local.assertArchiveLock(lock, [{ name, metadata, integrity: 'sha512-changed' }]), /Archive changed/);
});

test('portable locks preserve exact integrity and reject source links', () => {
    const origin = 'http://127.0.0.1:12345/';
    const input = { lockfileVersion: 3, packages: { '': { name: 'consumer' }, 'node_modules/example': {
        version: '1.0.0', resolved: `${origin}example/-/example-1.0.0.tgz`, integrity: 'sha512-fixture',
    } } };
    const output = local.portableLock(input, origin);
    assert.equal(output.packages['node_modules/example'].resolved, 'https://registry.npmjs.org/example/-/example-1.0.0.tgz');
    assert.equal(output.packages['node_modules/example'].integrity, 'sha512-fixture');
    assert(input.packages['node_modules/example'].resolved.startsWith(origin));
    input.packages['node_modules/third-party'] = { resolved: 'https://example.org/unchanged.tgz', integrity: 'sha512-third' };
    assert.deepEqual(local.portableLock(input, origin).packages['node_modules/third-party'], input.packages['node_modules/third-party']);
    input.packages['node_modules/third-party'].resolved = 'http://127.0.0.1:9999/unknown.tgz';
    assert.throws(() => local.portableLock(input, origin), /Nonportable/);
    delete input.packages['node_modules/third-party'];
    input.packages['node_modules/example'].link = true;
    assert.throws(() => local.portableLock(input, origin), /Linked package/);
    delete input.packages['node_modules/example'].link;
    input.packages['../example'] = {};
    assert.throws(() => local.portableLock(input, origin), /External source/);
});

test('workspace plan uses source mapping, not scoped names as sibling folder names', () => {
    const repositories = Object.entries(local.NAMES).map(([key, name]) => ({ name, directory: path.resolve('fixtures', key) }));
    const steps = require('./check_workspace.cjs').buildSteps(repositories, path.resolve('fixtures/site'));
    assert.equal(steps.find(step => step.folder === local.NAMES.db).cwd, path.resolve('fixtures/db'));
    assert.equal(steps.find(step => step.folder === 'inteyvat-wiki').cwd, path.resolve('fixtures/site'));
    assert(steps.at(-1).args.includes(`${local.NAMES.db}=${path.resolve('fixtures/db')}`));
});

test('config source paths are relative to JSON and CLI sources take precedence', () => {
    const work = local.makeWork(), configured = {};
    for (const [key, name] of Object.entries(local.NAMES)) {
        const directory = path.join(work, key);
        fs.mkdirSync(directory);
        local.writeJSON(path.join(directory, 'package.json'), { name, version: '0.1.0', scripts: { prepack: 'node build.cjs' } });
        configured[name] = key;
    }
    const config = path.join(work, 'config.json');
    local.writeJSON(config, { packaging: { repositories: configured } });
    const result = local.repositories({ config }, work);
    assert.equal(result.find(item => item.name === local.NAMES.db).directory, fs.realpathSync(path.join(work, 'db')));
    assert.throws(() => local.repositories({ config, sources: { [local.NAMES.db]: path.join(work, 'tools') } }, work), /Wrong repository/);
});

test('loopback registry serves exact tarballs and cannot publish or proxy missing org packages', async () => {
    const work = local.makeWork(), filename = path.join(work, 'fixture.tgz');
    fs.writeFileSync(filename, 'tarball fixture');
    const metadata = { name: local.NAMES.db, version: '0.1.0', dependencies: { [local.NAMES.provider]: '0.1.0' } };
    const integrity = local.digest(fs.readFileSync(filename));
    const registry = await local.startRegistry([{ name: metadata.name, metadata, filename, integrity }], { proxy: false });
    try {
        assert.match(registry.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
        const response = await fetch(registry.url + encodeURIComponent(metadata.name));
        assert.equal(response.status, 200);
        const packument = await response.json(), version = packument.versions['0.1.0'];
        assert.deepEqual(version.dependencies, metadata.dependencies);
        assert.equal(version.dist.integrity, integrity);
        assert.equal(await (await fetch(version.dist.tarball)).text(), 'tarball fixture');
        assert.equal((await fetch(registry.url + encodeURIComponent(metadata.name), { method: 'PUT', body: '{}' })).status, 405);
        assert.equal((await fetch(registry.url + '@inteyvat-wiki%2fmissing')).status, 404);
        assert.equal((await fetch(registry.url + 'missing')).status, 404);
        assert.equal((await fetch(version.dist.tarball, { method: 'HEAD' })).status, 200);
    } finally { await registry.close(); }
});

test('repacking an unpublished version refreshes lock integrity and cold-cache npm ci', { timeout: 60000 }, async () => {
    const work = local.makeWork(), source = path.join(work, 'source'), consumer = path.join(work, 'consumer'), archives = path.join(work, 'archives');
    for (const directory of [source, consumer, archives]) fs.mkdirSync(directory);
    const metadata = { name: local.NAMES.db, version: '0.1.0', private: true, main: 'index.cjs', files: ['index.cjs'] };
    local.writeJSON(path.join(source, 'package.json'), metadata);
    const manifest = { name: 'lock-refresh-test', version: '0.0.0', private: true, dependencies: { [metadata.name]: '0.1.0' } };
    local.writeJSON(path.join(consumer, 'package.json'), manifest);
    const pack = async revision => {
        fs.writeFileSync(path.join(source, 'index.cjs'), `module.exports = ${JSON.stringify(revision)};\n`);
        const [packed] = local.parsePackOutput(await local.run([local.npmCLI(), 'pack', '--ignore-scripts', '--json', '--pack-destination', archives], source, local.npmEnvironment(work)));
        return { name: metadata.name, metadata, filename: path.join(archives, packed.filename), integrity: packed.integrity, shasum: packed.shasum };
    };
    const item = await pack('first');
    const registry = await local.startRegistry([item], { proxy: false });
    try {
        const firstLock = await local.generateLock(consumer, registry, work);
        assert.equal(firstLock.packages[`node_modules/${metadata.name}`].integrity, item.integrity);
        // Existing GDS/db checkouts may still have npm v2 locks from the unscoped era.
        local.writeJSON(path.join(consumer, 'package-lock.json'), { ...firstLock, lockfileVersion: 2,
            dependencies: { 'genshin-db': { version: 'file:../old-db' } } });
        Object.assign(item, await pack('second'));
        const secondLock = await local.generateLock(consumer, registry, work);
        assert.equal(secondLock.lockfileVersion, 3);
        assert(!secondLock.dependencies, 'Legacy v2 dependency records must not survive');
        assert.notEqual(firstLock.packages[`node_modules/${metadata.name}`].integrity, item.integrity);
        local.assertArchiveLock(secondLock, [item]);
        assert(!JSON.stringify(secondLock).includes(registry.url));
        await local.npmInstall(consumer, registry, work, { ci: true, noPath: true, cache: 'fresh-ci-cache' });
        local.assertInstalled(consumer);
        assert.equal(require(path.join(consumer, 'node_modules', metadata.name, 'index.cjs')), 'second');
        assert.deepEqual(local.readJSON(path.join(consumer, 'package.json')), manifest);
        assert.deepEqual(local.readJSON(path.join(consumer, 'package-lock.json')), secondLock);
    } finally { await registry.close(); }
});

test('runtime guard blocks ancestor-module fallback and external fixture reads', async () => {
    const work = local.makeWork(), consumer = path.join(work, 'consumer');
    fs.mkdirSync(consumer);
    fs.writeFileSync(path.join(consumer, 'own.cjs'), 'module.exports = 42;\n');
    const guard = path.join(consumer, 'guard.cjs');
    fs.copyFileSync(path.join(__dirname, 'package_runtime_guard.cjs'), guard);
    await local.run(['--require', guard, '-e', `const assert = require('node:assert/strict');
        assert.equal(require('./own.cjs'), 42);
        assert.throws(() => require('typescript'), /outside its installation/);
        assert.throws(() => require('node:fs').readFileSync(${JSON.stringify(path.join(__dirname, 'local_packages.cjs'))}), /outside its fixture/);`],
    consumer, { GENSHIN_PACKAGE_CONSUMER_ROOT: consumer });
});
