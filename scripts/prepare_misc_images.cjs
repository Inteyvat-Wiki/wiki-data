'use strict';
// Wiki manifest adapter only. Map reading and all extraction belong to resource-tools.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {imageName, selectImageEntries, assetMapXml, readAssetMap} = require('@inteyvat-wiki/resource-tools');
const ROOT = path.resolve(__dirname, '..');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag:'wx'});
function prepareMiscImages({root = ROOT, workDirectory, studio = 'C:/Apps/AnimeStudio',
    map = 'C:/Apps/AnimeStudio/Maps/genshin_7.1.map', dotnet, readMap = readAssetMap} = {}) {
    assert(workDirectory, 'A new work directory is required');
    const work = path.resolve(workDirectory), manifestPath = path.join(root, 'data/common/misc/assets.json');
    if (!fs.existsSync(manifestPath)) return {status:'awaiting_manifest',manifest:manifestPath,extraction_started:false};
    const manifestBytes = fs.readFileSync(manifestPath), manifestHash = sha256(manifestBytes);
    const manifest = JSON.parse(manifestBytes.toString('utf8').replace(/^\uFEFF/,''));
    assert(Array.isArray(manifest), 'misc manifest must be an array');
    const requests = new Map(), diagnostics = [];
    for (const asset of manifest) {
        assert(asset.category === 'misc' && typeof asset.id === 'string' && /^[a-z0-9_-]+$/.test(asset.id)
            && typeof asset.available === 'boolean', 'Invalid misc manifest entry (category/id/available)');
        const parsed = imageName(asset.name);
        if (parsed.reason) { diagnostics.push({id:asset.id,reference:asset.name,reason:parsed.reason}); continue; }
        if (!requests.has(parsed.name)) requests.set(parsed.name, []);
        requests.get(parsed.name).push({id:asset.id,reference:asset.name});
    }
    const reportPath = path.join(work, 'misc-images-match-report.json'), planPath = path.join(work, 'misc-images-extract-plan.json');
    const mapOutput = path.join(work, 'misc-images-map.json');
    for (const file of [reportPath,planPath,mapOutput]) assert(!fs.existsSync(file), 'Preparation output already exists; use a new work directory');
    let cursor = work;
    while (true) {
        if (fs.existsSync(cursor)) assert(!fs.lstatSync(cursor).isSymbolicLink(), 'Symlink work directory refused');
        const parent = path.dirname(cursor); if (parent === cursor) break; cursor = parent;
    }
    fs.mkdirSync(work, {recursive:true});
    const mapped = requests.size ? readMap({studio,map,output:mapOutput,names:[...requests.keys()],dotnet}) : {entries:[]};
    const wanted = new Map([...requests.keys()].map(name=>[name,[]]));
    for (const entry of mapped.entries) if (wanted.has(entry.Name)) wanted.get(entry.Name).push(entry);
    const buckets = {Sprite:[],Texture2D:[]}, selected = [], sources = new Map();
    for (const name of [...wanted.keys()].sort()) {
        const entries = selectImageEntries(wanted.get(name));
        if (!entries.length) { diagnostics.push({name,reason:'no_exact_Texture2D_or_Sprite',references:requests.get(name)}); continue; }
        const kind = entries[0].Type;
        assert(kind === 'Sprite' || kind === 'Texture2D', 'Unexpected map entry type');
        selected.push({name,kind,entries:entries.length}); buckets[kind].push({name,entries});
        for (const entry of entries) if (!sources.has(entry.Source)) {
            const info = fs.statSync(entry.Source); assert(info.isFile(), 'Selected source missing');
            sources.set(entry.Source, info.size);
        }
    }
    for (const directory of new Set([...sources.keys()].map(file=>path.dirname(file))))
        assert(!fs.readdirSync(directory).some(name=>/\.split/i.test(name)), `Refuse CLI plan: source folder contains split pieces: ${directory}`);
    const packageRoot = path.dirname(require.resolve('@inteyvat-wiki/resource-tools'));
    const cli = path.resolve(packageRoot, require('@inteyvat-wiki/resource-tools/package.json').bin['resource-tools']);
    const commands = [];
    for (const kind of ['Sprite','Texture2D']) {
        const groups = buckets[kind]; let cursor = 0, batch = 0;
        while (cursor < groups.length) {
            const batchEntries = []; let patternLength = 0, names = 0; batch++;
            while (cursor < groups.length) {
                const group = groups[cursor], length = group.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').length;
                if (names && patternLength + length + 1 > 6000) break;
                batchEntries.push(...group.entries); patternLength += length + 1; names++; cursor++;
            }
            const label = `${kind.toLowerCase()}-${String(batch).padStart(4,'0')}`;
            const xml = path.join(work,`misc-images-selected-${label}.xml`), request = xml + '.json';
            // Keep historical folder names for the existing importer.
            const destination = path.join(work, kind === 'Sprite' ? 'misc-images-sprites-7.1' : 'misc-images-textures-7.1', `batch-${String(batch).padStart(4,'0')}`);
            assert(!fs.existsSync(destination), 'Extraction folder already exists');
            fs.writeFileSync(xml, assetMapXml(batchEntries), {flag:'wx'});
            writeJson(request, {entries:batchEntries,inputs:[manifestPath,path.resolve(map)],selection:'largest'});
            fs.mkdirSync(path.dirname(destination), {recursive:true});
            commands.push({kind,selected_xml:xml,output:destination,executable:process.execPath,
                arguments:[cli,'extract-images','--plan',request,'--output',destination,'--studio',studio,'--game','GI'],
                names,map_entries:batchEntries.length});
        }
    }
    assert.equal(sha256(fs.readFileSync(manifestPath)),manifestHash,'Manifest changed during preparation; discard partial output');
    const summary = {status:'prepared_only',missing_references:manifest.length,requested_unique_names:requests.size,
        selected_unique_names:selected.length,selected_map_entries:commands.reduce((n,c)=>n+c.map_entries,0),
        source_files:sources.size,source_bytes:[...sources.values()].reduce((a,b)=>a+b,0),cli_batches:commands.length,extraction_started:false};
    writeJson(planPath, {schema:1,manifest_sha256:manifestHash,commands,auto_execute:false});
    writeJson(reportPath, {schema:1,manifest:manifestPath,manifest_sha256:manifestHash,map:path.resolve(map),
        map_sha256:mapped.sha256,summary,selected_names:selected,diagnostics});
    return summary;
}
function selfTest() {
    for (const name of ['12345678901234567890','folder/123.png','0x1234','abcdef0123456789'])
        assert.equal(imageName(name).reason,'numeric_or_hash_not_resolved');
    assert.equal(imageName('folder\\UI_Exact.png').name,'UI_Exact');
    assert(imageName('UI_Exact?.png').reason);
    assert.deepEqual(selectImageEntries([{Type:28},{Type:213}]),[{Type:213}]);
    console.log('misc preparation self-test: passed (no map or manifest loaded)');
}
module.exports = {prepareMiscImages,selfTest};
if (require.main === module) {
    try {
        const args = process.argv.slice(2), options = {};
        const keys = {'--work':'workDirectory','--studio':'studio','--map':'map','--dotnet':'dotnet'};
        let self = false, check = false;
        for (let i=0;i<args.length;i++) {
            if (args[i] === '--self-test') {self=true;continue;}
            if (args[i] === '--check-cli') {check=true;continue;}
            assert(keys[args[i]] && args[i+1] && !args[i+1].startsWith('--'), `Unknown/incomplete option: ${args[i]}`);
            options[keys[args[i]]] = args[++i];
        }
        if (self) selfTest();
        else if (check) {
            const result = spawnSync(path.join(options.studio || 'C:/Apps/AnimeStudio','AnimeStudio.CLI.exe'),['--help'],{stdio:'inherit',windowsHide:true,shell:false,timeout:30000});
            if (result.error) throw result.error; assert.equal(result.status,0,'AnimeStudio CLI help failed');
        } else console.log(JSON.stringify(prepareMiscImages(options),null,2));
    } catch (error) {console.error(error.message);process.exitCode=1;}
}
