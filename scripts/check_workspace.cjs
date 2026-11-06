'use strict';

// Maintainer checks only: no source-data extraction, formal exports, or dependency repair.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const local = require('./local_packages.cjs');
const root = path.resolve(__dirname, '..');
function buildSteps(repositories, wiki) {
    const { NAMES } = local;
    const locations = Object.fromEntries(repositories.map(item => [item.name, item.directory]));
    locations['wiki-data'] = root;
    locations['inteyvat-wiki'] = wiki;
    const packageArgs = repositories.flatMap(item => ['--source', `${item.name}=${item.directory}`]);
    return [
        [NAMES.contracts, 'test'], [NAMES.contracts, 'test:types'],
        [NAMES.tools, 'build:helper'], [NAMES.tools, 'test'],
        [NAMES.provider, 'test:unit'], [NAMES.db, 'test:unit'],
        ['wiki-data', 'check'], ['inteyvat-wiki', 'check'], ['wiki-data', 'check:packages'],
    ].map(([folder, script]) => ({ folder, script, cwd: locations[folder], args: script === 'check:packages' ? packageArgs : [] }));
}

function label(step) {
    return `${step.folder}: npm run ${step.script}`;
}

function preflight(plan) {
    if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node.js 24 or newer for maintainer checks.');
    const npm = process.env.npm_execpath;
    if (!npm || !path.isAbsolute(npm) || !fs.existsSync(npm)) {
        throw new Error('npm_execpath is missing or invalid. Start this runner with npm run check:workspace.');
    }
    const manifests = new Map();
    for (const step of plan) {
        let manifest = manifests.get(step.cwd);
        if (!manifest) {
            const file = path.join(step.cwd, 'package.json');
            if (!fs.existsSync(file)) throw new Error(`Missing configured checkout: ${file}. Supply --source or --wiki.`);
            manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
            manifests.set(step.cwd, manifest);
            const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
            if (Object.keys(dependencies).length && !fs.existsSync(path.join(step.cwd, 'node_modules'))) {
                throw new Error(`Dependencies are missing in ${step.cwd}. Run npm ci in dependency order; this runner never installs workspace dependencies.`);
            }
        }
        if (typeof manifest.scripts?.[step.script] !== 'string' || !manifest.scripts[step.script].trim()) {
            throw new Error(`Missing script "${step.script}" in ${step.cwd}/package.json. Check out the coordinated changes; no fallback to source-data tests is allowed.`);
        }
    }
    const server = path.join(plan.find(step => step.folder === 'inteyvat-wiki').cwd, 'server/utils/page.ts');
    if (!fs.existsSync(server)) throw new Error(`Wiki server submodule is missing: ${server}. Initialize Wiki submodules recursively before running checks.`);
    return npm;
}

function main() {
    const args = process.argv.slice(2);
    if (args.includes('--help')) {
        console.log('Usage: npm run check:workspace -- [--skip-packages] [--config FILE] [--source NAME=PATH ...] [--wiki PATH]');
        console.log('Requires Node.js 24+, .NET 8 SDK, Git, installed repository dependencies, and Wiki server submodules.');
        console.log('Uses the packages:local packaging.repositories config (including inteyvat-wiki for Wiki), or explicit paths/npm discovery.');
        console.log('Config paths are relative to the config file; no sibling paths are assumed.');
        console.log('Default: build packages, run synthetic/type checks, then isolated real-tarball integration.');
        console.log('--skip-packages skips only the last integration check, not the builds required by unit tests.');
        console.log('No live source tests or formal-export checks are selected. No workspace dependencies are installed.');
        return;
    }
    let wiki;
    const packageArgs = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--skip-packages') continue;
        if (args[i] === '--wiki') {
            if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing --wiki path');
            wiki = path.resolve(args[++i]);
        } else packageArgs.push(args[i]);
    }
    const options = local.parseOptions(packageArgs);
    if (options.mode || options.archives || options.consumers.length) throw new Error('Use --source/--config for workspace source checkouts');
    const configFile = options.config || process.env.INTEYVAT_PACKAGE_CONFIG;
    const configuredWiki = configFile && local.readJSON(path.resolve(configFile)).packaging?.repositories?.['inteyvat-wiki'];
    wiki ||= configuredWiki && path.resolve(path.dirname(path.resolve(configFile)), configuredWiki);
    wiki ||= local.discoverSource('inteyvat-wiki');
    if (!wiki) throw new Error('Cannot discover Wiki. Supply --wiki PATH or packaging.repositories["inteyvat-wiki"].');
    if (local.readJSON(path.join(wiki, 'package.json')).name !== 'inteyvat-wiki') throw new Error(`Wrong Wiki repository: ${wiki}`);
    const steps = buildSteps(local.repositories(options), wiki);
    const plan = args.includes('--skip-packages') ? steps.slice(0, -1) : steps;
    console.log('[SCOPE] Synthetic fixtures, types, and package builds; live source tests and formal-export checks are NOT RUN.');
    if (plan.length !== steps.length) console.log(`[SKIP] ${label(steps.at(-1))} (--skip-packages)`);
    let npm;
    try {
        npm = preflight(plan);
    } catch (error) {
        console.error(`[FAIL] Preflight: ${error.message}`);
        for (const step of plan) console.log(`[NOT RUN] ${label(step)}`);
        process.exitCode = 1;
        return;
    }
    for (const [index, step] of plan.entries()) {
        console.log(`\n[RUN ${index + 1}/${plan.length}] ${label(step)}`);
        const started = Date.now();
        const result = spawnSync(process.execPath, [npm, 'run', step.script, ...(step.args.length ? ['--', ...step.args] : [])], {
            cwd: step.cwd, env: process.env, stdio: 'inherit', shell: false, windowsHide: true,
        });
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        if (result.error || result.signal || result.status !== 0) {
            const reason = result.error?.message || (result.signal ? `signal ${result.signal}` : `exit ${result.status}`);
            console.error(`[FAIL] ${label(step)} (${reason}; ${elapsed}s)`);
            for (const remaining of plan.slice(index + 1)) console.log(`[NOT RUN] ${label(remaining)}`);
            console.error(`[STOP] ${index}/${plan.length} selected checks passed. Fix the failing step and rerun.`);
            process.exitCode = Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
            return;
        }
        console.log(`[PASS] ${label(step)} (${elapsed}s)`);
    }
    console.log(`\n[PASS] ${plan.length}/${plan.length} selected workspace checks passed. Live source tests and formal-export checks were NOT RUN.`);
}

module.exports = { buildSteps, preflight };
if (require.main === module) try {
    main();
} catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exitCode = 1;
}
