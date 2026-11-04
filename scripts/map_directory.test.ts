import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import type { MapRecord } from 'genshin-db';
import { map_directory_entries, select_map_directory, selected_map_scenes } from '../src/utils/map_directory';
import { build_map_scenes } from '../src/map_scenes';
import { add_map_mask_groups } from '../src/utils/map_mask_groups';
import type { MapScene } from '@inteyvat-wiki/wiki-contracts/map';
const record = (kind:string, id:string, data:Record<string,unknown>):MapRecord => ({schema:1,kind:kind as MapRecord['kind'],id,name:'Original',description:'',texts:[],relations:[],data,source:{file:'test',id:'1',fields:[],hashes:[]},diagnostics:[]});
const directory = () => ({schema:1,scenes:{chosen:{source:'scene-3',labels:[] as string[],places:['point-3-1'],areas:['world-area-1','world-area-2'],maskGroups:{}}}});
const fixtures = () => {
    const parent = record('world_area','world-area-1',{scene_id:3,area_id:1,area_1_id:1,level:'LEVEL_1'});
    const child = record('world_area','world-area-2',{scene_id:3,area_id:2,area_1_id:1,area_2_id:2,level:'LEVEL_2'});
    child.relations = [{role:'parent_area',category:'maps',id:parent.id}];
    return [record('scene','scene-3',{scene_id:3}), record('resource','base',{category:'base-tile',scene_id:3}),
        record('point','point-3-1',{scene_id:3,position:{x:1,z:2}}), parent, child];
};
test('explicit map directory rejects stale, duplicate, cross-scene and orphaned selections', () => {
    const records = fixtures();
    assert.equal(select_map_directory(records,directory()).size,1);
    const duplicate = directory(); duplicate.scenes.chosen.places.push('point-3-1');
    assert.throws(()=>map_directory_entries(duplicate),/Duplicate/);
    const orphan = directory(); orphan.scenes.chosen.areas=['world-area-2'];
    assert.throws(()=>select_map_directory(records,orphan),/parent/);
    assert.throws(()=>select_map_directory(records.filter(r=>r.id!=='base'),directory()),/no native base/);
    assert.throws(()=>select_map_directory(records.filter(r=>r.id!=='point-3-1'),directory()),/Missing or mismatched/);
    assert.throws(()=>select_map_directory(records.map(r=>r.id==='point-3-1'?{...r,data:{...r.data,scene_id:5}}:r),directory()),/mismatched/);
    assert.throws(()=>map_directory_entries({schema:1,scenes:{bad:{...directory().scenes.chosen,includeAll:true}}}),/Unknown/);
});

test('curated mask membership rejects stale and cross-scene references before conversion', () => {
    const records=fixtures(), value=directory();
    value.scenes.chosen.maskGroups={region:['mask']};
    records.push(record('resource','mask',{scene_id:3,category:'atlas-image'}));
    assert.equal(select_map_directory(records,value).get(3)!.maskGroups.region?.[0],'mask');
    assert.throws(()=>select_map_directory(records.filter(r=>r.id!=='mask'),value),/mask group source/);
    assert.throws(()=>select_map_directory(records.map(r=>r.id==='mask'?{...r,data:{...r.data,scene_id:5}}:r),value),/mask group source/);
    assert.throws(()=>map_directory_entries({...value,scenes:{chosen:{...value.scenes.chosen,maskGroups:{one:['mask'],two:['mask']}}}}),/Duplicate/);
    assert.throws(()=>map_directory_entries({...value,scenes:{chosen:{...value.scenes.chosen,maskGroups:{one:[]}}}}),/Invalid mask group/);
});

test('fixed native boundary selection rejects missing, wrong-kind and cross-scene sources', () => {
    const value=directory(), chosen={...value.scenes.chosen,boundary:'resource-boundary-kept'};
    const configured={...value,scenes:{chosen}}, boundary=record('resource',chosen.boundary,{scene_id:3,category:'native-boundary'});
    const records=[...fixtures(),boundary];
    assert.equal(select_map_directory(records,configured).get(3)!.boundary,chosen.boundary);
    assert.throws(()=>select_map_directory(fixtures(),configured),/fixed map boundary/);
    for(const data of [{scene_id:5,category:'native-boundary'},{scene_id:3,category:'atlas-image'}])
        assert.throws(()=>select_map_directory([...fixtures(),{...boundary,data}],configured),/fixed map boundary/);
    assert.throws(()=>map_directory_entries({...value,scenes:{chosen:{...chosen,boundary:['resource-boundary-kept']}}}),/Invalid fixed map boundary/);
});

test('text-label selection is explicit and separate from icon places', () => {
    const records = fixtures(), value = directory();
    records.push(record('map_place','label-3-1',{scene_id:3,position:{x:1,z:2}}));
    value.scenes.chosen.labels=['label-3-1'];
    assert.deepEqual([...select_map_directory(records,value).get(3)!.labels],['label-3-1']);
    const wrongBucket=directory(); wrongBucket.scenes.chosen.places.push('label-3-1');
    assert.throws(()=>select_map_directory(records,wrongBucket),/Missing or mismatched/);
    const duplicate=structuredClone(value); duplicate.scenes.chosen.places.push('label-3-1');
    assert.throws(()=>select_map_directory(records,duplicate),/Duplicate/);
    assert.throws(()=>select_map_directory(records.filter(record=>record.id!=='label-3-1'),value),/Missing or mismatched/);
    assert.throws(()=>select_map_directory(records.map(record=>record.id==='label-3-1'?{...record,data:{...record.data,scene_id:5}}:record),value),/Missing or mismatched/);
});

test('mask group centers average image centers while conditions and previews stay independent', () => {
    const scene: MapScene={schema:1,id:'chosen',label:'Scene',bounds:[{x:0,y:0},{x:100,y:100}],markers:[],regions:[],layers:[],states:[],issues:[],
        overlays:['a','b','c'].map((id,index)=>({id,image:`/images/${id}.png`,label:'',kind:'cover',evidence:'native',zIndex:1,
            bounds:[{x:index*20,y:0},{x:index*20+10,y:10}]})),
        maskConditions:[{id:'first',label:'First',overlayIds:['a','b'],previewKey:'preview-first',rules:[],issues:[]},
            {id:'second',label:'Second',overlayIds:['c'],previewKey:'preview-second',rules:[],issues:[]}]};
    const previous=JSON.stringify(scene);
    add_map_mask_groups(scene,{region:['a','b','c']},'en');
    assert.deepEqual(scene.maskGroups,[{id:'region',label:'Mask group 1',position:{x:25,y:5},overlayIds:['a','b','c'],conditionIds:['first','second']}]);
    const {maskGroups,...rest}=scene; assert.deepEqual(rest,JSON.parse(previous));
    assert.throws(()=>add_map_mask_groups(scene,{region:['a','b']},'en'),/explicit directory grouping/);
    assert.throws(()=>add_map_mask_groups(scene,{region:['a','b','c','missing']},'en'),/Missing, non-mask/);
    assert.throws(()=>add_map_mask_groups(scene,{region:['a','b','c'],duplicate:['a']},'en'),/duplicate/);
    // Overlapping source controllers may share a spatial group; split pieces retain their full condition references.
    add_map_mask_groups(scene,{one:['a'],two:['b','c']},'zh_hans');
    assert.deepEqual(scene.maskGroups?.map(group=>group.conditionIds),[['first'],['first','second']]);
});
test('unlisted additions stay out of display and declared entries must survive conversion', () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(),'map-directory-')), file=path.join(folder,'base.png');
    const png = new PNG({width:1,height:1}); png.data.fill(255); const bytes=PNG.sync.write(png); fs.writeFileSync(file,bytes);
    try {
        const records = fixtures(), base=records.find(r=>r.id==='base')!;
        Object.assign(base.data,{image_file:file,image_sha256:createHash('sha256').update(bytes).digest('hex'),display_geometry:{space:'world-xz',corners:[{x:0,y:0},{x:0,y:10},{x:10,y:10},{x:10,y:0}]}});
        records.push(record('point','point-3-2',{scene_id:3,position:{x:1e8,z:1e8},visibility:'OnUnlocked'}),
            record('world_area','world-area-3',{scene_id:3,area_id:3,area_1_id:3,level:'LEVEL_1'}),
            record('resource','base-other',{...base.data,scene_id:5}),record('scene','scene-5',{scene_id:5}));
        const label=record('map_place','label-3-1',{scene_id:3,position:{x:3,z:4}});
        label.relations=[{role:'name_rule',category:'maps',id:'name-rule-1'}];
        records.push(label,record('map_place','label-3-unlisted',{scene_id:3,position:{x:1e8,z:1e8}}),
            record('name_rule','name-rule-1',{action:'Close'}));
        const value=directory(); value.scenes.chosen.labels=[label.id];
        const selection=select_map_directory(records,value), before=JSON.stringify(records);
        const scenes=selected_map_scenes(build_map_scenes(records,'en',()=>'/images/base.png',new Map(),selection),selection);
        assert.deepEqual(scenes.map(s=>s.id),['chosen']);
        assert.deepEqual(scenes[0]!.markers.map(m=>m.id),['point-3-1','label-3-1']);
        const text=scenes[0]!.markers[1]!;
        assert.equal(text.kind,'label'); assert.equal(text.label,'Original');
        assert.equal(text.icon,undefined); assert.equal(text.condition,undefined);
        assert.equal(text.labelVariants,undefined); assert.equal(text.labelMinZoom,-2);
        assert.deepEqual(text.position,{x:3,y:4});
        const missingLabel=structuredClone(scenes); missingLabel[0]!.markers.pop();
        assert.throws(()=>selected_map_scenes(missingLabel,selection),/not exported/);
        assert.deepEqual(scenes[0]!.areas!.map(a=>a.id),['world-area-1','world-area-2']);
        assert.deepEqual(scenes[0]!.states,[]); assert.equal(JSON.stringify(records),before);
        records.find(r=>r.id==='point-3-1')!.data.map_display={status:'excluded',reason:'explicit-mark-invisible'};
        assert.throws(()=>selected_map_scenes(build_map_scenes(records,'en',()=>'/images/base.png',new Map(),selection),selection),/not exported/);
        const empty={schema:1,scenes:{}};
        assert.deepEqual(selected_map_scenes(build_map_scenes(records,'en',()=>'/images/base.png',new Map(),select_map_directory(records,empty)),select_map_directory(records,empty)),[]);
    } finally {fs.unlinkSync(file);fs.rmdirSync(folder);}
});
