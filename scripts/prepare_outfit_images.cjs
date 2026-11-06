'use strict';
// Names are provided by the outfit export; game-resource interpretation stays upstream.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { readAssetMap, selectImageEntries, extractResources, importResourceImages } = require('@inteyvat-wiki/resource-tools');
const {loadConfig} = require('../config/pipeline.cjs');

function main(args) {
    const config = loadConfig();
    const options = { studio: config.resources.studio, map: config.resources.assetMap, manifest: path.join(config.output.data, 'common/outfit/assets.json') };
    const flags = { '--work': 'work', '--map': 'map', '--studio': 'studio', '--manifest': 'manifest', '--output': 'output' };
    let extract = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--extract') { extract = true; continue; }
        assert(Object.hasOwn(flags, args[i]) && args[i + 1] && !args[i + 1].startsWith('--'), `Unknown/incomplete option: ${args[i]}`);
        options[flags[args[i]]] = args[++i];
    }
    assert(options.work && options.map && options.studio, 'Specify --work NEW_DIRECTORY and configure resources.studio/resources.assetMap [--extract --output NEW_IMAGE_DIRECTORY]');
    assert(!extract || options.output, '--extract requires --output');
    const work = path.resolve(options.work), manifest = path.resolve(options.manifest);
    assert(!fs.existsSync(work), 'Use a new work directory');
    const assets = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    assert(Array.isArray(assets) && assets.length, 'Export the outfit image manifest first');
    assert(assets.every(asset => typeof asset.name === 'string' && typeof asset.id === 'string' && ['icon','card','splash'].includes(asset.kind)));
    const names = [...new Set(assets.map(asset => asset.name))];
    fs.mkdirSync(work, {recursive:true});
    const mapped = readAssetMap({studio:options.studio,map:options.map,output:path.join(work,'asset-map.json'),names,dotnet:config.resources.dotnet});
    const entries = names.flatMap(name => selectImageEntries(mapped.entries.filter(entry => entry.Name === name)));
    const found = names.filter(name => entries.some(entry => entry.Name === name));
    const missing = names.filter(name => !found.includes(name));
    const plan = {entries,inputs:[manifest,path.resolve(options.map)],selection:'largest'};
    const planFile = path.join(work,'image-plan.json');
    fs.writeFileSync(planFile,JSON.stringify(plan,null,2),{flag:'wx'});
    const report = {requested:names.length,matched:found.length,missing,extracted:false,imported:0,output:options.output};
    if (extract && entries.length) {
        const extracted = path.join(work,'extracted');
        extractResources({...plan,inputs:[...plan.inputs,planFile],studio:options.studio,game:'GI',output:extracted,timeoutMs:120000});
        const imported = importResourceImages({directories:[extracted],wanted:found,selection:'largest',apply:true,
            output:path.resolve(options.output),reportFile:path.join(work,'import-report.json'),inputs:[manifest,planFile]});
        report.extracted = true; report.imported = imported.imported;
    }
    fs.writeFileSync(path.join(work,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});
    console.log(JSON.stringify({...report,work},null,2));
    if (missing.length) process.exitCode = 2;
}

if (require.main === module) {
    try { main(process.argv.slice(2)); } catch (error) { console.error(error); process.exitCode = 1; }
}
