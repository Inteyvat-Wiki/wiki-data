'use strict';
// Run explicitly as root only after linux-build and its tests have succeeded.
// Creates a dedicated service; refuses to replace pre-existing service/site files.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const run = (command, args) => cp.execFileSync(command, args, {stdio: 'inherit'});
function installOnce(source, target) {
    if (fs.existsSync(target)) {
        assert(fs.readFileSync(target).equals(fs.readFileSync(source)), `Existing configuration differs: ${target}`);
        return;
    }
    run('install', ['-m', '644', source, target]);
}
function main(args = process.argv.slice(2)) {
    assert.equal(process.getuid(), 0, 'Run as root');
    assert.equal(args.length, 2, 'Usage: linux-activate.cjs BUILT_WIKI NODE_DISTRIBUTION');
    const [app, node] = args.map(value => fs.realpathSync(value));
    assert(app.startsWith('/srv/inteyvat-wiki/releases/'), 'App must be in the managed releases directory');
    assert(node.startsWith('/srv/inteyvat-wiki/runtime/'), 'Runtime must be in the managed runtime directory');
    assert(fs.statSync(path.join(app, '.output/server/index.mjs')).isFile());
    assert(fs.statSync(path.join(node, 'bin/node')).isFile());
    const exists = cp.spawnSync('getent', ['passwd', 'inteyvat-wiki'], {stdio: 'ignore'}).status === 0;
    if (!exists) run('useradd', ['--system', '--user-group', '--home-dir', '/var/lib/inteyvat-wiki', '--shell', '/usr/sbin/nologin', 'inteyvat-wiki']);
    run('install', ['-d', '-o', 'inteyvat-wiki', '-g', 'inteyvat-wiki', '-m', '750', '/var/lib/inteyvat-wiki']);
    run('install', ['-d', '-o', 'root', '-g', 'root', '-m', '700', '/etc/inteyvat-wiki']);
    const environment = '/etc/inteyvat-wiki/environment';
    if (!fs.existsSync(environment)) fs.writeFileSync(environment, `WIKI_UPLOAD_TOKEN=${crypto.randomBytes(32).toString('hex')}\n`, {flag: 'wx', mode: 0o600});
    const unit = '/etc/systemd/system/inteyvat-wiki.service';
    const site = '/etc/nginx/sites-available/inteyvat-wiki-14780';
    installOnce(path.join(__dirname, 'inteyvat-wiki.service'), unit);
    installOnce(path.join(__dirname, 'inteyvat-wiki.nginx.conf'), site);
    for (const [link, target] of [['/srv/inteyvat-wiki/current', app], ['/srv/inteyvat-wiki/runtime/node', node]]) {
        if (fs.existsSync(link)) {
            assert(fs.lstatSync(link).isSymbolicLink() && fs.realpathSync(link) === target, `Existing active path differs: ${link}`);
        } else fs.symlinkSync(target, link);
    }
    const enabled = '/etc/nginx/sites-enabled/inteyvat-wiki-14780';
    if (fs.existsSync(enabled)) assert(fs.realpathSync(enabled) === site);
    else fs.symlinkSync(site, enabled);
    run('nginx', ['-t']);
    run('systemctl', ['daemon-reload']);
    run('systemctl', ['enable', '--now', 'inteyvat-wiki.service']);
    run('systemctl', ['reload', 'nginx']);
    console.log(JSON.stringify({service: 'inteyvat-wiki',app,node, internal: '127.0.0.1:4780', publicPort: 14780,
        data: '/var/lib/inteyvat-wiki/data', tokenStoredAt: environment}));
}
module.exports = {main};
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
