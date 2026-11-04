'use strict';

// Maintainer checks only: no source-data extraction, formal exports, or dependency repair.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const steps = [
    ['Inteyvat-Wiki-contracts', 'test'], // Also builds the contracts package.
    ['Inteyvat-Wiki-contracts', 'test:types'],
    ['Inteyvat-Wiki-resource-tools', 'build:helper'], // Tests require a current compiled bridge.
    ['Inteyvat-Wiki-resource-tools', 'test'],
    ['GenshinData-scripts', 'test:unit'],
    ['genshin-db', 'test:unit'],
    ['Inteyvat-Wiki-data', 'check'],
    ['Inteyvat-Wiki', 'check'],
    ['Inteyvat-Wiki-data', 'check:packages'],
].map(([folder, script]) => ({
    folder, script, cwd: folder === 'Inteyvat-Wiki-data' ? root : path.resolve(root, '..', folder),
}));

function label(step) {
    return `${step.folder}: npm run ${step.script}`;
}

function preflight(plan) {
    if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node.js 24 or newer (CI uses Node.js 24).');
    const npm = process.env.npm_execpath;
    if (!npm || !path.isAbsolute(npm) || !fs.existsSync(npm)) {
        throw new Error('npm_execpath is missing or invalid. Start this runner with npm run check:workspace.');
    }
    const manifests = new Map();
    for (const step of plan) {
        let manifest = manifests.get(step.cwd);
        if (!manifest) {
            const file = path.join(step.cwd, 'package.json');
            if (!fs.existsSync(file)) throw new Error(`Missing sibling checkout: ${file}. See docs/engineering-checks.md.`);
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
    const server = path.resolve(root, '../Inteyvat-Wiki/server/utils/page.ts');
    if (!fs.existsSync(server)) throw new Error(`Wiki server submodule is missing: ${server}. Initialize Wiki submodules recursively before running checks.`);
    return npm;
}

function main() {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--help', '--skip-packages'].includes(arg))) {
        throw new Error('Usage: npm run check:workspace -- [--skip-packages | --help]');
    }
    if (args.includes('--help')) {
        console.log('Usage: npm run check:workspace -- [--skip-packages]');
        console.log('Requires Node.js 24+, .NET 8 SDK, Git, installed sibling dependencies, and Wiki server submodules.');
        console.log('Default: build packages, run synthetic/type checks, then isolated real-tarball integration.');
        console.log('--skip-packages skips only the last integration check, not the builds required by unit tests.');
        console.log('No live source tests or formal-export checks are selected. No workspace dependencies are installed.');
        return;
    }
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
        const result = spawnSync(process.execPath, [npm, 'run', step.script], {
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

try {
    main();
} catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exitCode = 1;
}
