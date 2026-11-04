'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {prepareMiscImages} = require('./prepare_misc_images.cjs');
function fixture(t, names) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(),'wiki-image-preparation-'));
    t.after(()=>{
        assert.equal(path.dirname(root),os.tmpdir()); assert(path.basename(root).startsWith('wiki-image-preparation-'));
        fs.rmSync(root,{recursive:true,force:true});
    });
    const manifest = path.join(root,'data/common/misc/assets.json');
    fs.mkdirSync(path.dirname(manifest),{recursive:true});
    fs.writeFileSync(manifest,JSON.stringify(names.map((name,i)=>({name,id:`item-${i}`,category:'misc',available:true}))));
    const source = path.join(root,'block.blk'); fs.writeFileSync(source,'synthetic block');
    return {root,manifest,source,workDirectory:path.join(root,'work'),map:path.join(root,'synthetic.map')};
}
test('Node preparation keeps Sprite priority, all candidates, reports and explicit commands without extraction', t=>{
    const setup=fixture(t,['UI_A','UI_B','UI_Missing','1234']);
    const entry=(Name,Type,PathID)=>({Name,Type,PathID,Source:setup.source,Offset:Number(PathID),Container:'container'});
    let reads=0;
    const summary=prepareMiscImages({...setup,readMap(options){
        reads++; assert.deepEqual(options.names,['UI_A','UI_B','UI_Missing']);
        return {sha256:'fixture',entries:[entry('UI_A','Sprite','1'),entry('UI_A','Sprite','2'),entry('UI_A','Texture2D','3'),entry('UI_B','Texture2D','4')]};
    }});
    assert.equal(reads,1); assert.equal(summary.selected_unique_names,2); assert.equal(summary.selected_map_entries,3);
    assert.equal(summary.cli_batches,2); assert.equal(summary.extraction_started,false);
    const report=JSON.parse(fs.readFileSync(path.join(setup.workDirectory,'misc-images-match-report.json')));
    assert.deepEqual(report.selected_names,[{name:'UI_A',kind:'Sprite',entries:2},{name:'UI_B',kind:'Texture2D',entries:1}]);
    assert.equal(report.diagnostics.length,2);
    const plan=JSON.parse(fs.readFileSync(path.join(setup.workDirectory,'misc-images-extract-plan.json')));
    assert.equal(plan.auto_execute,false);
    for(const command of plan.commands) {
        assert.equal(command.executable,process.execPath); assert(command.arguments.includes('extract-images'));
        assert(!command.arguments.some(x=>/pwsh|powershell|\.ps1$/i.test(x))); assert(!fs.existsSync(command.output));
        const request=JSON.parse(fs.readFileSync(command.selected_xml+'.json'));
        assert.equal(request.selection,'largest'); assert.equal(request.entries.length,command.map_entries);
        assert(request.entries.every(e=>typeof e.PathID==='string'));
    }
    assert.throws(()=>prepareMiscImages({...setup,readMap(){throw new Error('must not load');}}),/already exists/);
});
test('unresolved-only manifests never load AnimeStudio and empty arrays retain their shape', t=>{
    const setup=fixture(t,['1234','0x1234']);
    const summary=prepareMiscImages({...setup,readMap(){throw new Error('must not load');}});
    assert.equal(summary.cli_batches,0);
    const plan=JSON.parse(fs.readFileSync(path.join(setup.workDirectory,'misc-images-extract-plan.json')));
    assert.deepEqual(plan.commands,[]);
});
test('split inputs are refused and changed manifests cannot produce accepted plans', t=>{
    const setup=fixture(t,['UI_A']);
    const readMap=()=>({entries:[{Name:'UI_A',Type:'Sprite',PathID:'1',Source:setup.source,Offset:1}]});
    fs.writeFileSync(setup.source+'.split0','fixture');
    assert.throws(()=>prepareMiscImages({...setup,readMap}),/split pieces/);
    fs.unlinkSync(setup.source+'.split0');
    assert.throws(()=>prepareMiscImages({...setup,readMap(){fs.appendFileSync(setup.manifest,' ');return readMap();}}),/Manifest changed/);
    assert(!fs.existsSync(path.join(setup.workDirectory,'misc-images-extract-plan.json')));
});
