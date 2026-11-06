#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {loadConfig, configEnvironment} = require('../config/pipeline.cjs');
const {randomUUID} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const help = `Wiki data pipeline (no extraction during npm install)
  node scripts/pipeline.cjs config [--config FILE]
  node scripts/pipeline.cjs init [--config NEW_FILE]
  node scripts/pipeline.cjs doctor [--config FILE]
  node scripts/pipeline.cjs export [all|characters|weapons|outfits|npcs|tasks|archives|misc|maps] [--config FILE]
  node scripts/pipeline.cjs images [--manifest FILE] [--apply] [--config FILE]
  node scripts/pipeline.cjs lua --plan FILE [--apply] [--config FILE]
  node scripts/pipeline.cjs resources --kind KIND --plan FILE [--apply] [--config FILE]
  node scripts/pipeline.cjs upload [--apply] [--config FILE]
JSON config: --config > WIKI_DATA_CONFIG > ./wiki-data.config.json.
Existing environment overrides remain supported. Paths in JSON are config-relative.
images/lua/resources/upload are previews unless --apply is present. npm packages are never published.
`;
function parse(args) {
    const [command = 'help', ...rest] = args, options = {command};
    for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '--apply') { options.apply = true; continue; }
        if (['--config', '--manifest', '--plan', '--kind'].includes(rest[i])) {
            const flag = rest[i];
            if (!rest[i + 1] || rest[i + 1].startsWith('--')) throw new Error(`Missing value: ${flag}`);
            options[flag.slice(2)] = rest[++i]; continue;
        }
        if (command === 'export' && !options.target && !rest[i].startsWith('--')) { options.target = rest[i]; continue; }
        throw new Error(`Unknown argument: ${rest[i]}`);
    }
    const allowed = {init: ['config'], config: ['config'], doctor: ['config'], export: ['config', 'target'], upload: ['config', 'apply'], images: ['config', 'manifest', 'apply'],
        lua: ['config', 'plan', 'apply'], resources: ['config', 'kind', 'plan', 'apply'], help: [], '--help': [], '-h': []};
    if (!allowed[command]) throw new Error(`Unknown command: ${command}`);
    for (const key of Object.keys(options)) if (key !== 'command' && !allowed[command].includes(key)) throw new Error(`Invalid ${command} option: ${key}`);
    return options;
}
function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function newRun(directory, prefix) {
    fs.mkdirSync(directory, {recursive: true});
    return fs.mkdtempSync(path.join(directory, prefix));
}
function save(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'}); }
function required(value, key) {
    if (!value) throw new Error(`Configure ${key} in wiki-data.config.json`);
    return value;
}
function checkSourceBoundary(entries, directory) {
    if (!directory) return;
    const base = fs.realpathSync(directory);
    for (const entry of entries) {
        const relative = path.relative(base, fs.realpathSync(entry.Source));
        if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative))
            throw new Error(`Asset-map source outside resources.root: ${entry.Source}; regenerate the asset map after moving resources`);
    }
}
function doctor(config) {
    const checks = [];
    const check = (name, value, kind, requiredPath = true) => {
        let ok = !requiredPath && !value;
        if (value) try { const info = fs.statSync(value); ok = kind === 'file' ? info.isFile() : info.isDirectory(); } catch { ok = false; }
        checks.push({name, path: value, ok});
    };
    if (config.query.prepare && config.query.backend === 'snapshot') check('source.root', config.source.root, 'directory');
    else check('snapshot cache', config.cache.exports, 'directory');
    for (const name of ['@inteyvat-wiki/genshin-db', '@inteyvat-wiki/resource-tools', '@inteyvat-wiki/wiki-contracts']) {
        try { checks.push({name, path: require.resolve(name), ok: true}); }
        catch { checks.push({name, ok: false}); }
    }
    check('resources.studio', config.resources.studio, 'directory', false);
    if (config.resources.studio) {
        check('AnimeStudio CLI', path.join(config.resources.studio, 'AnimeStudio.CLI.exe'), 'file');
        check('AnimeStudio runtime', path.join(config.resources.studio, 'bin/AnimeStudio.CLI.runtimeconfig.json'), 'file');
    }
    check('resources.assetMap', config.resources.assetMap, 'file', false);
    check('resources.root', config.resources.root, 'directory', false);
    check('resources.dotnet', config.resources.dotnet, 'file', false);
    for (const [key, file] of Object.entries(config.resources.caches)) check(`resources.caches.${key}`, file, 'file');
    return {ok: checks.every(check => check.ok), checks, imageRoots: config.resources.imageRoots,
        luaRoot: config.resources.luaRoot, caches: config.cache, output: config.output.data,
        note: 'Read-only path/package checks; use export to validate source identity and cache contents.'};
}
function exportData(config, target = 'all') {
    const entries = {all: 'index.ts', characters: 'scripts/generate_characters.ts', weapons: 'scripts/generate_weapons.ts',
        outfits: 'scripts/generate_outfits.ts', npcs: 'scripts/generate_npcs.ts', tasks: 'scripts/generate_tasks.ts',
        archives: 'scripts/generate_archives.ts', misc: 'scripts/generate_misc.ts', maps: 'scripts/generate_maps.ts'};
    if (!Object.hasOwn(entries, target)) throw new Error(`Unknown export target: ${target}`);
    const bootstrap = ['npcs', 'tasks', 'archives', 'misc'].includes(target) ? ['--import', './scripts/data_bootstrap.mts'] : [];
    const result = spawnSync(process.execPath, ['--import', 'tsx', ...bootstrap, entries[target], config.output.data], {
        cwd: root, stdio: 'inherit', windowsHide: true,
        // Preserve original cwd for environment-relative paths through the resolved settings.
        env: {...process.env, ...configEnvironment(config)},
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Export failed (${result.status ?? result.signal})`);
    return {exported: target, output: config.output.data};
}
function images(config, options, api = require('@inteyvat-wiki/resource-tools')) {
    const manifestFile = path.resolve(options.manifest || path.join(config.output.data, 'common/image-requests.json'));
    const manifest = json(manifestFile);
    if (manifest.schema !== 1 || !Array.isArray(manifest.names) || manifest.names.some(name => typeof name !== 'string'))
        throw new Error('Invalid image request manifest; run export first');
    const names = [...new Set(manifest.names)].sort();
    const invalid = names.filter(name => api.imageName(name).name !== name || api.imageName(name).reason);
    if (invalid.length) throw new Error(`Unresolved image names in manifest: ${invalid.join(', ')}`);
    if (!names.length) return {requested: 0, extracted: false};
    if (!options.apply) return {requested: names.length, manifest: manifestFile, extracted: false,
        studio: config.resources.studio, assetMap: config.resources.assetMap, destination: config.cache.resources,
        note: 'Use --apply to read AnimeStudio asset map and extract exact-name images.'};
    const studio = required(config.resources.studio, 'resources.studio'), map = required(config.resources.assetMap, 'resources.assetMap');
    const work = newRun(path.join(config.cache.resources, 'images'), 'images-');
    const mapped = api.readAssetMap({studio, map, output: path.join(work, 'asset-map.json'), names, dotnet: config.resources.dotnet});
    const byName = new Map(names.map(name => [name, []]));
    for (const entry of mapped.entries) byName.get(entry.Name)?.push(entry);
    const entries = names.flatMap(name => api.selectImageEntries(byName.get(name)));
    checkSourceBoundary(entries, config.resources.root);
    const found = new Set(entries.map(entry => entry.Name)), missing = names.filter(name => !found.has(name));
    const plan = {entries, selection: 'largest', inputs: [manifestFile, map, path.join(work, 'asset-map.json')]};
    const planFile = path.join(work, 'image-plan.json'); save(planFile, plan);
    const extracted = path.join(work, 'extracted');
    if (entries.length) api.extractResources({...plan, inputs: [...plan.inputs, planFile], studio, game: config.resources.game,
        output: extracted, dotnet: config.resources.dotnet});
    const result = {work, requested: names.length, matched: found.size, missing, extracted: entries.length > 0,
        imageRoot: path.join(config.cache.resources, 'images')};
    save(path.join(work, 'report.json'), result);
    return result;
}
function lua(config, options, api = require('@inteyvat-wiki/resource-tools')) {
    const file = path.resolve(required(options.plan, '--plan')), plan = json(file);
    if (!Array.isArray(plan.entries) || !plan.entries.length) throw new Error('Lua plan requires exact asset-map entries');
    const destination = path.join(config.cache.resources, 'lua');
    if (!options.apply) return {planned: plan.entries.length, extracted: false, destination, exportInput: config.resources.luaRoot};
    checkSourceBoundary(plan.entries, config.resources.root);
    const studio = required(config.resources.studio, 'resources.studio');
    const work = newRun(destination, 'lua-');
    // Tool-level extraction validates signatures, exact offsets, paths and provenance.
    const report = api.extractLuaResources({entries: plan.entries, inputs: [file], studio, game: config.resources.game,
        dotnet: config.resources.dotnet, output: path.join(work, 'extracted')});
    return {work, output: report.output, status: report.status, resources: report.resources?.length,
        exportInput: config.resources.luaRoot, note: 'Verify full Lua coverage before selecting a new export input; explicit luaRoot is not modified.'};
}
function resources(config, options, api = require('@inteyvat-wiki/genshin-db').resources) {
    const kind = required(options.kind, '--kind');
    if (!api.supportedKinds.includes(kind)) throw new Error(`Unsupported resource kind: ${kind}; supported: ${api.supportedKinds.join(', ')}`);
    const planFile = path.resolve(required(options.plan, '--plan')), plan = json(planFile);
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('Resource plan must be an object');
    const base = path.dirname(planFile);
    // These are public preparer option names, never game field names or IDs.
    const pathOptions = ['index', 'mapFile', 'cacheFile', 'rawReportFile', 'indexReportFile', 'artIndexReportFile', 'sourceRoot', 'source', 'data', 'studio', 'dotnet',
        'map', 'assetMap', 'sceneTableFile', 'entryCacheFile', 'baseCacheFile', 'prefabCacheFile', 'outlineCacheFile', 'mapAreaConfigs', 'catalogue'];
    for (const name of pathOptions) if (plan[name] !== undefined) {
        if (typeof plan[name] !== 'string' || !plan[name]) throw new Error(`Invalid plan.${name}`);
        plan[name] = path.resolve(base, plan[name]);
    }
    for (const name of ['sources', 'prefabPaths']) if (plan[name] !== undefined) {
        if (!Array.isArray(plan[name]) || plan[name].some(value => typeof value !== 'string')) throw new Error(`Invalid plan.${name}`);
        // Prefab paths are Unity resource identifiers, not filesystem paths.
        if (name === 'sources') plan[name] = plan[name].map(value => path.resolve(base, value));
    }
    const preparedOptions = {sourceRoot: config.source.root, studio: config.resources.studio, map: config.resources.assetMap,
        game: config.resources.game, dotnet: config.resources.dotnet,
        ...(kind === 'mapAtlas' ? {assetMap: config.resources.assetMap, mapAreaConfigs: config.resources.caches.mapAreaConfigs, extractImages: true} : {}),
        ...(kind === 'mapFog' ? {baseCacheFile: config.resources.caches.mapBase} : {}), ...plan};
    preparedOptions.sourceRoot = plan.sourceRoot || plan.source || plan.data || config.source.root;
    if (!options.apply) return {kind, planned: true, extracted: false, options: preparedOptions, destination: config.cache.resources};
    if (plan.output !== undefined || plan.destination !== undefined) throw new Error('Omit plan.output/destination; the pipeline allocates a new resource-cache directory');
    const work = newRun(config.cache.resources, `${kind}-`);
    const fileOutput = ['miliastra', 'profileFrames', 'tcgPortraits', 'graeaeImages', 'levelTags', 'mapEffects'].includes(kind);
    preparedOptions.output = path.join(work, fileOutput ? 'cache.json' : 'output');
    save(path.join(work, 'request.json'), {kind, planFile, options: preparedOptions});
    const result = api.prepare(kind, preparedOptions);
    const cacheKey = {miliastra: 'miliastra', profileFrames: 'profileFrames', worldAreas: 'worldAreas', mapAreaConfigs: 'mapAreaConfigs',
        mapIcons: 'mapIcons', mapAtlas: 'maps', maps: 'maps', mapBase: 'mapBase', mapFog: 'mapFog', mapEffects: 'mapEffects', mapLimitOutlines: 'mapLimitOutlines', levelTags: 'levelTags'}[kind];
    if (cacheKey) {
        if (!result.cachePath || !fs.statSync(result.cachePath).isFile()) throw new Error('Resource preparer did not produce its cache');
        const bindings = path.join(config.cache.resources, 'prepared.json');
        const lock = path.join(config.cache.resources, 'prepared.lock');
        try { fs.mkdirSync(lock); }
        catch (error) {
            if (error.code === 'EEXIST') throw new Error(`Resource registration is busy: ${lock}. Prepared cache retained at ${result.cachePath}`);
            throw error;
        }
        try {
            const previous = fs.existsSync(bindings) ? json(bindings) : {};
            const caches = previous.sourceRoot === config.source.root && previous.assetMap === config.resources.assetMap ? previous.caches : {};
            const temporary = bindings + '.' + randomUUID() + '.tmp';
            save(temporary, {schema: 1, sourceRoot: config.source.root, assetMap: config.resources.assetMap, caches: {...caches, [cacheKey]: result.cachePath}});
            fs.renameSync(temporary, bindings);
        } finally { fs.rmdirSync(lock); }
    }
    const details = result.result && typeof result.result === 'object' ? result.result : {};
    const summary = {kind, work, cachePath: result.cachePath, registered: Boolean(cacheKey),
        diagnostics: Array.isArray(details.diagnostics) ? details.diagnostics.length : details.diagnostics,
        missingRoots: Array.isArray(details.missingRootNames) ? details.missingRootNames.length : undefined};
    save(path.join(work, 'result.json'), summary);
    return summary;
}
async function main(args = process.argv.slice(2)) {
    const options = parse(args);
    if (['help', '--help', '-h'].includes(options.command)) { console.log(help); return; }
    if (options.command === 'init') {
        const file = path.resolve(options.config || process.env.WIKI_DATA_CONFIG || 'wiki-data.config.json');
        fs.copyFileSync(path.join(root, 'wiki-data.config.example.json'), file, fs.constants.COPYFILE_EXCL);
        console.log(`Created ${file}; set external input paths before exporting.`); return;
    }
    const config = loadConfig({file: options.config});
    let result;
    if (options.command === 'config') result = config;
    else if (options.command === 'doctor') { result = doctor(config); if (!result.ok) process.exitCode = 1; }
    else if (options.command === 'export') result = exportData(config, options.target);
    else if (options.command === 'images') { result = images(config, options); if (result.missing?.length) process.exitCode = 2; }
    else if (options.command === 'lua') result = lua(config, options);
    else if (options.command === 'resources') result = resources(config, options);
    else if (options.command === 'upload') result = await require('./upload_data.cjs').publish(config, options.apply);
    console.log(JSON.stringify(result, null, 2));
}
module.exports = {parse, doctor, exportData, images, lua, resources, checkSourceBoundary};
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
