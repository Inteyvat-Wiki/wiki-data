import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { MapRecord } from '@inteyvat-wiki/genshin-db';
import { evaluateMapPredicate, isMapScene } from '@inteyvat-wiki/wiki-contracts/map';
import { reference_choices, reference_predicate } from '../src/utils/map_conditions';
import { build_map_scenes, map_edge_style } from '../src/map_scenes';
import { compose_boundary_pixels, convert_native_boundary, convert_sprite_boundary } from '../src/utils/map_boundary';
import { map_icon_exporter, map_layer_marker_icons } from '../src/utils/map_icons';
import { ConvertRaw } from '../src/utils/convert_raw';
import { add_map_mask_conditions } from '../src/utils/map_mask_conditions';
import { add_map_layer_conditions } from '../src/utils/map_layer_conditions';
import { PNG } from 'pngjs';
test('sprite boundaries preserve native alpha, blend, order and orientation without forwarding source fields', () => {
    const folder=fs.mkdtempSync(path.join(os.tmpdir(),'map-sprite-boundary-')), file=path.join(folder,'native.png');
    const png=new PNG({width:1,height:1});png.data.set([255,80,0,100]);const bytes=PNG.sync.write(png);fs.writeFileSync(file,bytes);
    try {
        const boundary=record('resource','resource-boundary-example',{category:'native-boundary',status:'static-serialized-state',
            shader_profile:'native-sprite-boundary-v1',scene_id:5,limit_region_id:51001,parts:[{
                id:'map-resource-raw',image_file:file,image_sha256:createHash('sha256').update(bytes).digest('hex'),color:[1,1,1,.5],blend:'additive',order:0,
                display_geometry:{space:'world-xz',profile:'client-map-origin-v1',corners:[{x:0,y:8},{x:0,y:0},{x:4,y:0},{x:4,y:8}]},
                source:{file:'raw.bin',bytes:240,sha256:'a'.repeat(64)}}]});
        const result=convert_sprite_boundary(boundary,'enkanomiya',()=>'/images/boundary.png');
        assert.deepEqual(result[0],{id:'resource-boundary-example-part-0',image:'/images/boundary.png',label:'',kind:'boundary',evidence:'native',
            opacity:.5,blend:'additive',zIndex:100000,bounds:[{x:0,y:0},{x:4,y:8}],corners:[{x:4,y:8},{x:4,y:0},{x:0,y:0},{x:0,y:8}]});
        assert.doesNotMatch(JSON.stringify(result),/image_file|raw.bin|limit_region|shader_profile/);
        const changed=structuredClone(boundary);(changed.data.parts as any[])[0].newRawField=true;
        assert.throws(()=>ConvertRaw.get_map_boundary_parts(changed),/Unmapped/);
        (changed.data.parts as any[])[0]= {...(boundary.data.parts as any[])[0],order:1};
        assert.throws(()=>ConvertRaw.get_map_boundary_parts(changed),/order/);
        fs.writeFileSync(file,'changed');assert.throws(()=>convert_sprite_boundary(boundary,'enkanomiya',()=>'/images/boundary.png'),/changed after snapshot/);
    } finally {fs.unlinkSync(file);fs.rmdirSync(folder);}
});
const conditions = { '安眠处': {'安眠处:0':{description:null},'安眠处:1':{description:null,default:true}},
    '真正的安眠处': {'真正的安眠处:0':{description:null},'真正的安眠处:1':{description:null,default:true}},
    '阶段': {'阶段:0':{description:null},'阶段:1':{description:null},'阶段:2':{description:null}} };
test('reference conditions use exact groups, finite ranges and conjunctions', () => {
    const options = reference_choices(conditions), a=options[0]!,b=options[1]!,s=options[2]!;
    const p=reference_predicate('安眠处:1',conditions);
    assert.equal(evaluateMapPredicate(p,{[a.id]:a.options[0]!.id,[b.id]:b.options[1]!.id}),false);
    assert.equal(evaluateMapPredicate(p,{}),'unknown');
    const conjunction=reference_predicate('(?=[\\s\\S]*安眠处:1)(?=[\\s\\S]*阶段:[1-2])',conditions);
    assert.equal(evaluateMapPredicate(conjunction,{[a.id]:a.options[1]!.id,[s.id]:s.options[2]!.id}),true);
    assert.equal(evaluateMapPredicate(conjunction,{[a.id]:a.options[0]!.id}),false);
    assert.throws(()=>reference_predicate('阶段:.*',conditions),/syntax/);
});
function record(kind:string,id:string,data:Record<string,unknown>):MapRecord { return {schema:1,kind:kind as MapRecord['kind'],id,name:'Original <name>',description:'Original description',texts:[],relations:[],data,source:{file:'test',id:'1',hashes:[],fields:[]},diagnostics:[]}; }

test('layer state writes join exact image layers and share task controls with floor renaming', () => {
    const floor = record('floor','floor-3460401',{ alternate_name:'Warm cave', name_condition:{type:'MAP_FLOOR_NAME_CHANGE_QUEST',parameters:[7502012]} });
    const layer = record('layer','layer-3460404',{});
    const source = record('resource','image',{}); source.relations=[{role:'layer',category:'maps',id:layer.id}];
    const event = record('quest_event','quest-event-7502016-finish-0',{action:'QUEST_EXEC_SET_MAP_LAYER_UNLOCK_STATE',quest_id:7502016,phase:'finish',
        layer_state_change:{profile:'map-layer-unlock-v1',unlocked:true,execution_order:0}});
    event.relations=[{role:'target',category:'maps',id:layer.id}];
    const base = () => ({schema:1 as const,id:'teyvat',label:'Teyvat',bounds:[{x:0,y:0},{x:1,y:1}] as [{x:number;y:number},{x:number;y:number}],
        overlays:[{id:'image',image:'/images/map/test.png',label:'',bounds:[{x:0,y:0},{x:1,y:1}] as [{x:number;y:number},{x:number;y:number}],kind:'layer' as const,layerId:floor.id,zIndex:0,evidence:'native' as const}],
        layers:[{id:floor.id,label:floor.name,groupId:'group',order:0}],markers:[],regions:[],states:[],issues:[]});
    const refs = new Map([[7502016,{task:'ripe_for_trouble',step:14,title:'Task',subtitle:'Step'}],[7502012,{task:'ripe_for_trouble',step:21,title:'Task',subtitle:'Talk'}]]);
    const scene: import('@inteyvat-wiki/wiki-contracts/map').MapScene = base();
    add_map_layer_conditions(scene,[floor,layer,event],new Map([['image',source]]),'en',refs);
    assert(isMapScene(scene));
    assert.equal(scene.maskConditions![0]!.replay!.initialVisible,null);
    assert.equal(scene.maskConditions![0]!.rules[0]!.write!.visible,true);
    assert.equal(evaluateMapPredicate(scene.overlays[0]!.condition,{}),'unknown');
    const name = scene.states.find(choice=>choice.taskCondition)!;
    assert.equal(name.taskCondition!.step,21); assert.equal(name.taskCondition!.task,'ripe_for_trouble');
    assert.equal(evaluateMapPredicate(scene.layers[0]!.labelVariants![0]!.condition,{[name.id]:'fulfilled'}),true);
    const unbound: import('@inteyvat-wiki/wiki-contracts/map').MapScene=base();
    add_map_layer_conditions(unbound,[floor,layer,event],new Map([['image',source]]),'en',new Map());
    assert.equal(unbound.maskConditions![0]!.replay,undefined);
    assert.equal(unbound.maskConditions![0]!.rules[0]!.write,undefined);
    assert.equal(unbound.layers[0]!.labelVariants,undefined);
    assert(!unbound.states.some(choice=>choice.taskCondition));
    const drift=structuredClone(event); (drift.data.layer_state_change as Record<string,unknown>).unexpected=true;
    assert.throws(()=>add_map_layer_conditions(base(),[floor,layer,drift],new Map([['image',source]]),'en',refs),/layer state write/);
});

test('scene export removes comparison previews and unbound name switches, retaining mapped task conditions', () => {
    const floor = record('floor', 'floor-3460401', { scene_id:3, group_id:34604, number:1,
        alternate_name:'Warm cave', name_condition:{type:'MAP_FLOOR_NAME_CHANGE_QUEST',parameters:[7502012]} });
    const unchanged = record('floor', 'floor-3460402', { ...floor.data, alternate_name:floor.name });
    const sources = [floor, unchanged,
        record('limit_region', 'limit-region-3-1', { scene_id:3, polygons:[{points:[{x:0,z:0},{x:10,z:0},{x:0,z:10}]}] }),
        record('resource', 'native-boundary-3-1', { scene_id:3, category:'native-boundary' })];
    const before = JSON.stringify(sources);
    const unbound = build_map_scenes(sources, 'en')[0]!;
    assert.deepEqual(unbound.states, []);
    assert.deepEqual(unbound.overlays, []);
    assert.deepEqual(unbound.regions, []);
    assert(unbound.layers.every(layer => !layer.labelVariants));
    const refs = new Map([[7502012, {task:'ripe_for_trouble',step:21,title:'Task',subtitle:'Talk'}]]);
    const bound = build_map_scenes(sources, 'en', undefined, refs)[0]!;
    assert.equal(bound.states.length, 1);
    assert.equal(bound.states[0]!.taskCondition!.task, 'ripe_for_trouble');
    assert.equal(bound.layers[0]!.labelVariants![0]!.label, 'Warm cave');
    assert.equal(bound.layers[1]!.labelVariants, undefined);
    assert.equal(JSON.stringify(sources), before);
});

test('scene titles use unique source tags, retain routes and never expose developer comments', () => {
    const point = record('point', 'point-5-1', { scene_id:5, position:{x:1,z:2} });
    const tag = record('map_tag', 'map-tag-7', { scene_ids:[5] });
    const metadata = record('scene', 'scene-5', { scene_id:5 }); metadata.name = '正式';
    for (const [lang, name] of [['zh_hans', '来源标题'], ['en', 'Source title']] as const) {
        tag.name = name;
        const scene = build_map_scenes([point, tag, metadata], lang)[0]!;
        assert.equal(scene.id, 'enkanomiya'); assert.equal(scene.label, name);
    }
    const unnamed = build_map_scenes([point, metadata], 'zh_hans')[0]!;
    assert.equal(unnamed.label, '未命名场景 5');
    const otherTag = { ...tag, id:'map-tag-other', name:'Another title' };
    assert.equal(build_map_scenes([point, tag, otherTag, metadata], 'en')[0]!.label, 'Unnamed scene 5');
    const countries = ['Mondstadt', 'Liyue'].map((name, id) => ({ ...record('map_tag', `map-tag-${id}`, {scene_ids:[3]}), name }));
    const world = record('point', 'point-3-1', {scene_id:3,position:{x:1,z:2}});
    assert.equal(build_map_scenes([world, ...countries], 'en')[0]!.label, 'Teyvat');
});

test('explicit world-map exclusions retain records but cannot affect markers or map bounds', () => {
    const excluded = record('point','point-3-1',{ scene_id:3,position:{x:1e8,z:1e8},map_display:{status:'excluded',reason:'explicit-mark-invisible'} });
    const empty = record('point','point-3-2',{ scene_id:3,position:{x:1,z:2},map_display:{status:'unresolved',reason:'visibility-unresolved'} });
    empty.name=''; empty.description='';
    const conditional = record('point','point-3-3',{ scene_id:3,position:{x:3,z:4},visibility:'OnUnlocked',map_display:{status:'conditional',reason:'point-on-unlocked'} });
    const source=[excluded,empty,conditional], before=JSON.stringify(source);
    const scene=build_map_scenes(source,'en')[0]!;
    assert.deepEqual(scene.markers.map(x=>x.id),['point-3-2','point-3-3']);
    assert.equal(evaluateMapPredicate(scene.markers[1]?.condition,{}),true);
    assert(scene.bounds.every(p=>Math.abs(p.x)<1e8 && Math.abs(p.y)<1e8));
    assert.equal(JSON.stringify(source),before);
    const emptyScene=build_map_scenes([excluded],'en')[0]!;
    assert.deepEqual(emptyScene.markers,[]);
    assert.deepEqual(emptyScene.bounds,[{x:-512,y:-512},{x:512,y:512}]);
    assert.throws(()=>ConvertRaw.get_map_point_display({status:'excluded',reason:'visibility-unresolved'}),/Inconsistent/);
    assert.throws(()=>ConvertRaw.get_map_point_display({status:'excluded',reason:'new-source-reason'}),/Unmapped/);
    assert.throws(()=>ConvertRaw.get_map_point_display({status:'excluded',reason:'point-never',unexpected:true}),/Unmapped/);
});
test('place unlock progress does not limit Wiki markers or create controls; area polygons are not playable borders',()=>{
    const output=build_map_scenes([record('point','point-3-1',{scene_id:3,point_id:1,position:{x:10,y:4,z:20},visibility:'OnUnlocked'}),
        record('world_area','world-area-1',{scene_id:3,area_id:1,area_1_id:1,level:'LEVEL_1',polygons:[{points:[{x:0,z:0},{x:100,z:0},{x:100,z:100}]}]})],'en');
    const scene=output[0]!;assert(isMapScene(scene));assert.deepEqual(scene.markers[0]?.position,{x:10,y:20});
    for (const saved of [{}, {'unlocked-point-3-1':'yes'}, {'unlocked-point-3-1':'no'}])
        assert.equal(evaluateMapPredicate(scene.markers[0]?.condition,saved),true);
    assert.deepEqual(scene.states,[]);
    assert.equal(scene.regions.length,0);assert.equal(scene.areas?.[0]?.level,1);assert.equal(scene.markers[0]?.label,'Original <name>');
    assert.deepEqual(build_map_scenes([record('point','point-3-1',{scene_id:3,position:{x:Infinity,z:2}})],'en'),[]);
});

test('areas retain hierarchy, disconnected footprints and absent heights without guessing coordinates',()=>{
    const parent=record('world_area','world-area-1300',{scene_id:3,area_id:1300,area_1_id:3,level:'LEVEL_1'});
    const points=[{x:1,z:2},{x:4,y:123,z:2},{x:1,z:5}];
    const child=record('world_area','world-area-1402',{scene_id:3,area_id:1402,area_1_id:3,area_2_id:402,level:'LEVEL_2',polygons:[
        {file:'source.json',minimum:{x:1,z:2},maximum:{x:4,y:190,z:5},points},
        {minimum:{y:180},maximum:{y:217},points:points.map(p=>({...p,x:p.x+100}))}]});
    child.relations=[{role:'parent_area',category:'maps',id:parent.id}];
    const source=[child,parent], before=JSON.stringify(source), scene=build_map_scenes(source,'en')[0]!;
    assert.deepEqual(scene.areas?.map(a=>a.id),[child.id,parent.id]);
    assert.deepEqual(scene.areas?.[1]?.polygons,[]);
    const area=scene.areas![0]!;
    assert.equal(area.parentId,'world-area-1300');assert.equal(area.label,'Original <name>');
    assert.deepEqual(area.polygons,[{points:[{x:1,y:2},{x:4,y:2},{x:1,y:5}],maximumHeight:190},
        {points:[{x:101,y:2},{x:104,y:2},{x:101,y:5}],minimumHeight:180,maximumHeight:217}]);
    assert.equal(JSON.stringify(source),before);
    assert.throws(()=>build_map_scenes([child],'en'),/parent/);
    assert.throws(()=>build_map_scenes([{...parent,data:{...parent.data,level:'LEVEL_3'}}],'en'),/level/);
    assert.throws(()=>build_map_scenes([{...parent,data:{...parent.data,newField:true}}],'en'),/Unmapped/);
    const malformed={...parent,data:{...parent.data,polygons:[{points:[{x:0,z:0},{x:1},{x:0,z:1}]}]}};
    assert.throws(()=>build_map_scenes([malformed],'en'),/X\/Z/);
    assert.throws(()=>build_map_scenes([child,{...parent,data:{...parent.data,scene_id:5}}],'en'),/parent/);
});
test('missing point coordinates are not invented and raw objects never become display fields',()=>{
    assert.deepEqual(build_map_scenes([record('viewpoint','viewpoint-1',{scene_id:3,world_area_id:1})],'en'),[]);
    const scene=build_map_scenes([record('npc_instance','npc-instance-3-1',{scene_id:3,position:{x:1,z:2},conditions:{raw_key:'private'}})],'en')[0]!;
    assert.equal(scene.markers[0]?.kind,'npc');assert(!JSON.stringify(scene).includes('raw_key'));
});

test('client region provenance is checked and removed before reaching the Wiki', () => {
    const source = { kind: 'client-world-area', resource_key: '10662376625415199788', block: '24230448.blk', offset: 0,
        path_id: '59168', sha256: 'a'.repeat(64), decoder: 'gi-world-area-cn-7.1-v1' };
    const polygon = { file: 'Data/_BinOutput/Scene/WorldArea/scene3_worldArea.MiHoYoBinData', source,
        minimum: { y: -1000 }, maximum: { y: 1000 }, points: [{x:1,z:2},{x:4,z:2},{x:1,z:5}] };
    const area = record('world_area', 'world-area-60700', { area_id:60700, scene_id:3, level:'LEVEL_1', area_1_id:51, polygons:[polygon] });
    const scene = build_map_scenes([area], 'en')[0]!;
    assert.deepEqual(scene.areas![0]!.polygons, [{ points:[{x:1,y:2},{x:4,y:2},{x:1,y:5}], minimumHeight:-1000, maximumHeight:1000 }]);
    assert(!JSON.stringify(scene).includes('resource_key'));
    assert(!JSON.stringify(scene).includes('MiHoYoBinData'));
    polygon.source = { ...source, unexpected:true } as typeof source;
    assert.throws(() => build_map_scenes([area], 'en'), /Unmapped/);
    polygon.source = { ...source, kind:'unknown' };
    assert.throws(() => build_map_scenes([area], 'en'), /source kind/);
});
test('soft-edge display factors reproduce the verified separable shader including k below one',()=>{
    const clamp=(x:number)=>Math.min(1,Math.max(0,x));
    for(const strength of [0,0.5,1,3.9984996,909.09]) {
        const style=map_edge_style(0.409,strength);
        for(const u of [0,0.02,0.25,0.5,0.9,1]) for(const v of [0,0.3,0.5,1]) {
            const css=style.opacity*clamp(Math.min(u,1-u)/style.edgeFade.horizontal)*clamp(Math.min(v,1-v)/style.edgeFade.vertical);
            const shader=0.409*clamp(strength*(1-Math.abs(2*u-1)))*clamp(strength*(1-Math.abs(2*v-1)));
            assert(Math.abs(css-shader)<1e-10);
        }
    }
    assert.throws(()=>map_edge_style(1,-1),/Invalid/);
});

test('layer extents retain exact circles and floor joins without becoming playable borders',()=>{
    const data=build_map_scenes([
        record('layer','layer-21',{floor_id:20}),record('floor','floor-20',{group_id:2,number:-1}),
        record('layer_region','layer-region-2-21-0',{scene_id:3,layer_id:21,footprints:[{kind:'circle',center:{x:100,z:200},radius:7,height:{minimum:10,maximum:30}}]}),
    ],'en');
    assert.equal(data[0]?.regions[0]?.kind,'layer-extent');assert.equal(data[0]?.regions[0]?.layerId,'floor-20');
    assert.deepEqual(data[0]?.regions[0]?.rings,[]);assert.deepEqual(data[0]?.regions[0]?.circles,[{center:{x:100,y:200},radius:7}]);
    assert(isMapScene(data[0]));
});

test('explicit always/never point visibility remains distinct from missing runtime state',()=>{
    const scene=build_map_scenes(['Always','Never','OnUnlocked',undefined].map((visibility,index)=>record('point',`point-3-${index}`,{scene_id:3,position:{x:index,z:2},visibility})),'en')[0]!;
    assert.deepEqual(scene.markers.map(marker=>evaluateMapPredicate(marker.condition,{})),[true,false,true,'unknown']);
});

test('native image conversion checks image identity, corner orientation and numeric hierarchy',()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'map-scene-image-')), file=path.join(directory,'image.png'), bytes=Buffer.from('fixture image identity');
    fs.writeFileSync(file,bytes);
    try {
        const common={category:'atlas-image',scene_id:3,floor_id:20,image_file:file,image_sha256:createHash('sha256').update(bytes).digest('hex'),
            display_geometry:{space:'world-xz',corners:[{x:0,y:10},{x:0,y:20},{x:30,y:20},{x:30,y:10}]},component_color:[1,1,1,0.4],
            material:{shaderStatus:'verified-shader-bytes',softEdge:{enabled:true,strength:0.5}}};
        const a=record('resource','resource-a',{...common,asset_name:'a',render_order:{scope:'root',hierarchy:[0,10]},area_variants:[{area_id:49,index:0}]});
        const b=record('resource','resource-b',{...common,asset_name:'b',render_order:{scope:'root',hierarchy:[0,2]},area_variants:[{area_id:49,index:1}]});
        a.relations=[{role:'variant_controller',category:'maps',id:'controller-49'}];b.relations=[...a.relations];
        const source=[a,b,record('floor','floor-20',{group_id:2,number:-1})];
        const scene=build_map_scenes(source,'en',(_source,target)=>`/images/${target}.png`)[0]!;
        assert.deepEqual(scene.overlays[0]?.corners,[{x:30,y:10},{x:30,y:20},{x:0,y:20},{x:0,y:10}]);
        assert.equal(scene.overlays[0]?.opacity,0.1);assert(scene.overlays[0]!.zIndex>scene.overlays[1]!.zIndex);
        assert.equal(evaluateMapPredicate(scene.overlays[0]?.condition,{}),'unknown');
        const controller=scene.states.find(state=>state.id==='preview-mask-controller-49')!;
        assert.equal(controller.default,'hidden');assert.equal(controller.evidence,'preview');
        assert.deepEqual(scene.overlays.map(overlay=>evaluateMapPredicate(overlay.condition,{[controller.id]:'index-0'})),[true,false]);
        assert.deepEqual(scene.overlays.map(overlay=>evaluateMapPredicate(overlay.condition,{[controller.id]:'index-1'})),[false,true]);
        assert.deepEqual(scene.overlays.map(overlay=>evaluateMapPredicate(overlay.condition,{[controller.id]:'hidden'})),[false,false]);
        a.relations.push({role:'variant_controller',category:'maps',id:'controller-50'});
        b.data.area_variants=[{area_id:49,index:1},{area_id:50,index:1}];
        const ambiguous=build_map_scenes(source,'en',(_source,target)=>`/images/${target}.png`)[0]!;
        assert(ambiguous.states.every(state=>state.options.every(option=>!option.id.startsWith('index-'))));
        fs.writeFileSync(file,'modified');assert.throws(()=>build_map_scenes(source,'en',()=>'/images/x.png'),/changed after snapshot/);
    } finally { fs.unlinkSync(file);fs.rmdirSync(directory); }
});

test('mask conditions retain exact selector and quest action evidence without inferring visibility',()=>{
    const scene=build_map_scenes([record('point','point-3-1',{scene_id:3,position:{x:1,z:2}})],'en')[0]!;
    scene.overlays=[{id:'mask-image',image:'/images/x.png',label:'',bounds:[{x:0,y:0},{x:10,y:10}],kind:'cover',zIndex:1,evidence:'native'}];
    const area=record('map_area','map-area-30',{area_id:30,scene_id:3,state:'MistOpen'});area.name='Area <&>';
    const tag=record('level_tag','level-tag-8',{tag_id:8,map_areas:[{area_id:30,index:3}]});tag.name='Tag';
    const omitted=record('level_tag','level-tag-9',{tag_id:9,map_areas:[{area_id:30}]});
    const image=record('resource','mask-image',{area_variants:[{area_id:30,index:3}]});
    image.relations=[{role:'variant_controller',category:'maps',id:'controller'},{role:'map_area',category:'maps',id:area.id},
        {role:'level_tag',category:'maps',id:tag.id},{role:'level_tag_context',category:'maps',id:omitted.id}];
    const event=record('quest_event','quest-event-123-finish-1',{quest_id:123,phase:'finish',action:'QUEST_EXEC_CHANGE_MAP_AREA_STATE',state:'1'});
    event.relations=[{role:'target',category:'maps',id:area.id}];
    const before=JSON.stringify([area,tag,omitted,image,event]);
    add_map_mask_conditions(scene,[area,tag,omitted,image,event],new Map([[image.id,image]]),'en',new Map([[123,{task:'maintained-task',step:2,title:'Task <name>',subtitle:'Original step'}]]));
    assert(isMapScene(scene));const group=scene.maskConditions![0]!;
    const rule=group.rules.find(rule=>rule.id===event.id)!;
    assert.equal(rule.recordId,'state-change-123-finish-1');
    assert.deepEqual(rule.when,[{id:'map-task-step-123',type:'step',task:'maintained-task',step:2,state:'finished',title:'Task &lt;name&gt;',subtitle:'Original step'}]);
    assert.match(rule.effect,/state value 1/);assert(!rule.effect.includes('visible'));
    assert(group.issues.some(issue=>issue.includes('zero is not assumed')));
    assert.equal(group.rules.filter(rule=>rule.kind==='selector').length,2);
    assert.deepEqual(group.rules.filter(rule=>rule.kind==='selector').map(rule=>rule.previewOption),['index-3','index-3']);
    assert.equal(rule.previewOption,undefined); // A quest action's state value is not an image index.
    assert.equal(evaluateMapPredicate(scene.overlays[0]!.condition,{'map-task-step-123':'finished'}),'unknown');
    assert.equal(evaluateMapPredicate(scene.overlays[0]!.condition,{[group.previewKey]:'index-3'}),true);
    assert.equal(before,JSON.stringify([area,tag,omitted,image,event]));
    const invalid=structuredClone(scene);(invalid.maskConditions![0]!.rules[0]!.when as any[]).push('and');assert(!isMapScene(invalid));
    const extra=structuredClone(scene);(extra.maskConditions![0]!.rules[0]!.when[0] as any).rawType='internal';assert(!isMapScene(extra));
    const missing=structuredClone(scene);missing.maskConditions![0]!.overlayIds=['not-an-image'];assert(!isMapScene(missing));
});

test('ordinary masks export ordered writes with converted task identities and no redundant index control', () => {
    const area=record('map_area','map-area-44',{area_id:44,state_model:{profile:'map-area-bool-v1',initial_open:false,initial_source:'constructor-default',mode:'direct'}});
    const image=record('resource','mask-image',{area_variants:[{area_id:44,index:0}]});
    image.relations=[{role:'variant_controller',category:'maps',id:'controller'},{role:'map_area',category:'maps',id:area.id}];
    const event=record('quest_event','quest-event-123-finish-7',{quest_id:123,phase:'finish',action:'QUEST_EXEC_CHANGE_MAP_AREA_STATE',state:'1',
        area_state_change:{profile:'map-area-bool-v1',open:true,execution_order:7}});
    event.relations=[{role:'target',category:'maps',id:area.id}];
    const make=()=>{
        const scene=build_map_scenes([record('point','point-3-1',{scene_id:3,position:{x:1,z:2}})],'en')[0]!;
        scene.overlays=[{id:image.id,image:'/images/x.png',label:'',bounds:[{x:0,y:0},{x:10,y:10}],kind:'cover',zIndex:1,evidence:'native'}];return scene;
    };
    const scene=make();add_map_mask_conditions(scene,[area,image,event],new Map([[image.id,image]]),'en',
        new Map([[123,{task:'converted-task',step:40,title:'Original & title',subtitle:''}]]));
    assert(isMapScene(scene));const group=scene.maskConditions![0]!;
    assert.deepEqual(group.replay,{initialVisible:false,visibleOption:'index-0',evidence:'inferred'});
    assert.deepEqual(group.rules[0]!.write,{visible:true,order:7});
    assert.equal((group.rules[0]!.when[0] as any).step,40);
    assert(!group.rules.some(rule=>rule.kind==='selector'));
    assert(!/initial_open|execution_order|area_state_change|map-area-bool/.test(JSON.stringify(scene)));
    const bad=structuredClone(scene);(bad.maskConditions![0]!.rules[0]!.write as any).rawField=true;assert(!isMapScene(bad));
    const unavailable=make();add_map_mask_conditions(unavailable,[area,image,event],new Map([[image.id,image]]),'en');
    assert(isMapScene(unavailable));assert.equal(unavailable.maskConditions![0]!.replay,undefined);
    assert(unavailable.maskConditions![0]!.rules.some(rule=>rule.previewOption==='index-0'));
    assert(unavailable.maskConditions![0]!.rules.every(rule=>!rule.write));
    const special=make();const tagged=structuredClone(area);(tagged.data.state_model as any).mode='level-tag';
    add_map_mask_conditions(special,[tagged,image,event],new Map([[image.id,image]]),'en');assert.equal(special.maskConditions![0]!.replay,undefined);
    const changed=structuredClone(area);(changed.data.state_model as any).unexpected=1;
    assert.throws(()=>add_map_mask_conditions(make(),[changed,image,event],new Map([[image.id,image]]),'en'),/Invalid map state model/);
});

test('Fontaine level-state transitions write every sibling mask with converted task steps', () => {
    const profile='level-tag-groups-7.1-v1', task='fontaine_research_institute_stagnating_in_the_rubble';
    const records:MapRecord[]=[], images:MapRecord[]=[];
    for(const [index,tag] of [108,109,110].entries()) {
        const id=51+index;
        const area=record('map_area',`map-area-${id}`,{area_id:id,state:'MistOpen',
            state_model:{profile:'map-area-bool-v1',initial_open:true,initial_source:'configured',mode:'level-tag'},
            level_tag_state:{profile,series_id:45,group_index:0,members:[108,109,110],visible_tags:[tag],initial_visible:index===0,
                image_index:0,image_binding:'sole-native-group',source_sha256:'a'.repeat(64)}});
        const image=record('resource',`image-${id}`,{area_variants:[{area_id:id,index:0}]});
        image.relations=[{role:'map_area',category:'maps',id:area.id},{role:'level_tag_context',category:'maps',id:`level-tag-${tag}`},
            {role:'variant_controller',category:'maps',id:`controller-${id}`}];
        records.push(area,image,record('level_tag',`level-tag-${tag}`,{tag_id:tag,map_areas:[{area_id:id}]}));images.push(image);
    }
    for(const [step,tag] of [[7405349,109],[7405369,110]]) {
        const event=record('quest_event',`quest-event-${step}-finish-4`,{quest_id:step,phase:'finish',action:'QUEST_EXEC_CHANGE_SCENE_LEVEL_TAG',
            level_tag_change:{profile,series_id:45,group_index:0,tag_id:tag,execution_order:4}});
        event.relations=[{role:'target',category:'maps',id:`level-tag-${tag}`}];records.push(event);
    }
    const make=()=>{const scene=build_map_scenes([record('point','point-3-1',{scene_id:3,position:{x:1,z:2}})],'en')[0]!;
        scene.overlays=images.map(image=>({id:image.id,image:'/images/x.png',label:'',bounds:[{x:0,y:0},{x:10,y:10}],kind:'cover',zIndex:1,evidence:'native'}));return scene;};
    const refs=new Map([[7405349,{task,step:40,title:'Original title',subtitle:''}],[7405369,{task,step:59,title:'Original title',subtitle:''}]]);
    const scene=make();add_map_mask_conditions(scene,records,new Map(images.map(image=>[image.id,image])),'en',refs);
    assert(isMapScene(scene));
    assert.deepEqual(scene.maskConditions!.map(group=>group.replay!.initialVisible),[true,false,false]);
    assert.deepEqual(scene.maskConditions!.map(group=>group.rules.filter(rule=>rule.write).map(rule=>rule.write!.visible)),[[false,false],[true,false],[false,true]]);
    for(const group of scene.maskConditions!) {
        assert(!group.rules.some(rule=>rule.previewOption));
        assert.deepEqual(group.rules.filter(rule=>rule.write).map(rule=>(rule.when[0] as any).step),[40,59]);
    }
    assert(!/series_id|visible_tags|level_tag_change|level-tag-groups-7.1/.test(JSON.stringify(scene)));
    refs.delete(7405369); const missing=make();add_map_mask_conditions(missing,records,new Map(images.map(image=>[image.id,image])),'en',refs);
    assert(missing.maskConditions!.every(group=>!group.replay && group.rules.every(rule=>!rule.write)));
});

test('mask captions never use developer notes, resource filenames or internal quest text', () => {
    const area=record('map_area','map-area-30',{area_id:30,scene_id:3}); area.name='DEVELOPER_AREA_NOTE';
    area.texts=[{role:'developer_name',text:area.name},{role:'configuration_name',text:'CONFIGURATION_ONLY',hash:'12'}]; area.source.hashes=['12'];
    const tag=record('level_tag','level-tag-8',{tag_id:8,map_areas:[{area_id:30,index:1}]}); tag.name='DEVELOPER_TAG_NOTE';
    tag.texts=[{role:'developer_name',text:tag.name,hash:'13'}]; tag.source.hashes=['13'];
    const omitted=record('level_tag','level-tag-9',{tag_id:9,map_areas:[{area_id:30}]}); omitted.name='DEVELOPER_MISSING_INDEX_NOTE';
    const image=record('resource','mask-image',{area_variants:[{area_id:30,index:1}]}); image.name='INTERNAL_RESOURCE_FILENAME';
    image.relations=[{role:'map_area',category:'maps',id:area.id},{role:'level_tag',category:'maps',id:tag.id},{role:'level_tag_context',category:'maps',id:omitted.id}];
    const event=record('quest_event','quest-event-123-finish-1',{quest_id:123,phase:'finish',action:'QUEST_EXEC_CHANGE_MAP_AREA_STATE',state:'1'});
    event.name='DEVELOPER_EVENT_NOTE'; event.relations=[{role:'target',category:'maps',id:area.id}];
    const changeTag=record('quest_event','quest-event-124-fail-0',{quest_id:124,phase:'fail',action:'QUEST_EXEC_CHANGE_SCENE_LEVEL_TAG'});
    changeTag.name='UNVERIFIED_STEP_NOTE'; changeTag.relations=[{role:'target',category:'maps',id:tag.id}];
    const records=[area,tag,omitted,image,event,changeTag], before=JSON.stringify(records);
    const makeScene=() => {
        const scene=build_map_scenes([record('point','point-3-1',{scene_id:3,position:{x:1,z:2}})],'en')[0]!;
        scene.overlays=['mask-image','unassociated'].map(id=>({id,image:'/images/x.png',label:'',bounds:[{x:0,y:0},{x:10,y:10}],kind:'cover',zIndex:1,evidence:'native'}));
        return scene;
    };
    const orphan={...image,id:'unassociated',relations:[]};
    for (const lang of ['zh_hans','en'] as const) {
        const scene=makeScene();
        add_map_mask_conditions(scene,records,new Map([[image.id,image],[orphan.id,orphan]]),lang,
            new Map([[123,{task:'kept-task',step:7,title:'Public task <title>',subtitle:'(test) INTERNAL_STEP $HIDDEN'}]]));
        const output=JSON.stringify({groups:scene.maskConditions,states:scene.states});
        assert(!/DEVELOPER_|INTERNAL_|CONFIGURATION_ONLY|UNVERIFIED_/.test(output));
        const group=scene.maskConditions![0]!;
        assert.equal(group.label,lang==='en'?'Map area 30 (placeholder)':'地图区域 30（占位名称）');
        const step=group.rules.find(rule=>rule.id===event.id)!.when[0] as any;
        assert.equal(step.title,'Public task &lt;title&gt;'); assert.equal(step.subtitle,''); assert.equal(step.task,'kept-task'); assert.equal(step.step,7);
        const unlinked=group.rules.find(rule=>rule.id===changeTag.id)!.when[0] as any;
        assert.equal(unlinked.subtitle,''); assert.equal(unlinked.step,124);
        assert(scene.maskConditions![1]!.label.includes('2')); assert(isMapScene(scene));
    }
    assert.equal(JSON.stringify(records),before);
    area.texts.push({role:'name',text:'Original & <area>',hash:'14'}); area.source.hashes.push('14');
    const named=makeScene(); add_map_mask_conditions(named,records,new Map([[image.id,image]]),'en');
    assert.equal(named.maskConditions![0]!.label,'Original & <area>');
});

test('native base tiles preserve upstream geometry, reject changed PNGs and never load manual placements',()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'map-base-tile-')), file=path.join(directory,'image.png');
    const png=new PNG({width:2,height:2});png.data.fill(255);const bytes=PNG.sync.write(png);fs.writeFileSync(file,bytes);
    const originalRead=fs.readFileSync;
    try {
        (fs as any).readFileSync=(name:any,...args:any[])=>{
            assert(!String(name).replaceAll('\\','/').includes('/map-data/'),'Manual map input read');
            assert(!String(name).includes('Inteyvat-Wiki-map-data'),'Old map project read');
            return (originalRead as any)(name,...args);
        };
        const tile=record('resource','base-tile-3-1',{category:'base-tile',scene_id:3,image_file:file,
            image_sha256:createHash('sha256').update(bytes).digest('hex'),
            display_geometry:{space:'world-xz',corners:[{x:0,y:10},{x:0,y:20},{x:30,y:20},{x:30,y:10}]}});
        const scene=build_map_scenes([tile],'en',()=>'/images/tile.png')[0]!;
        assert.equal(scene.overlays.length,1);assert.equal(scene.overlays[0]!.kind,'base');
        assert.equal(scene.overlays[0]!.evidence,'native');assert.equal(scene.overlays[0]!.condition,undefined);
        assert.deepEqual(scene.overlays[0]!.corners,[{x:30,y:10},{x:30,y:20},{x:0,y:20},{x:0,y:10}]);
        assert.deepEqual(scene.bounds,[{x:-64,y:-54},{x:94,y:84}]);
        assert(!JSON.stringify(scene).includes(file));assert.deepEqual(scene.states,[]);
        assert.deepEqual(build_map_scenes([],'en'),[]);
        const unresolved=record('resource','unknown-cover',{category:'atlas-image',scene_id:3,image_file:file,asset_name:'unknown'});
        const missing=build_map_scenes([unresolved],'en')[0]!;assert.deepEqual(missing.overlays,[]);
        assert(missing.issues.some(issue=>issue.includes('not drawn')));
        fs.writeFileSync(file,'modified');assert.throws(()=>build_map_scenes([tile],'en',()=>'/images/tile.png'),/changed after snapshot/);
    } finally { (fs as any).readFileSync=originalRead;fs.unlinkSync(file);fs.rmdirSync(directory); }
});

test('native boundary opacity comes from red, not texture alpha, and includes the noise texture',()=>{
    const mask={width:2,height:1,data:Buffer.from([128,64,32,0,0,64,32,255])},noise={width:1,height:1,data:Buffer.from([32,0,0,255])};
    assert.deepEqual([...compose_boundary_pixels(mask,noise,[1,1,1,.5],[280,280],[0,0])],[160,64,32,64,32,64,32,0]);
});

test('fixed red boundary explicitly converts native geometry and UV without condition controls or source labels',()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'map-red-boundary-')),file=path.join(directory,'rim.png');
    const png=new PNG({width:2,height:2});png.data.fill(255);const bytes=PNG.sync.write(png);fs.writeFileSync(file,bytes);
    const boundary=record('resource','resource-boundary-test',{category:'native-boundary',scene_id:3,status:'static-serialized-state',
        mask:{shader_profile:'open-area-red-channel-v1',blend:'normal',image_file:'upstream-mask',image_sha256:'mask-hash',
            noise_image_file:'upstream-noise',noise_image_sha256:'noise-hash',component_color:[1,1,1,.2],noise_scale:[280,280],noise_offset:[0,0],
            display_geometry:{space:'world-xz',corners:[{x:0,y:10},{x:0,y:0},{x:10,y:0},{x:10,y:10}]}},
        rim:{coordinate_space:'world-xz',uv_origin:'bottom-left',blend:'additive',texture_filter:'bilinear',texture_wrap:'clamp',
            vertices:[{x:0,y:0},{x:10,y:0},{x:0,y:10}],triangles:[[0,1,2]],uv:[[0,0],[1,0],[0,1]],color:[1,.5,.5],opacity:.28,
            image_file:file,image_sha256:createHash('sha256').update(bytes).digest('hex')}});
    const original=JSON.stringify(boundary);
    try {
        const result=convert_native_boundary(boundary,'teyvat',(_source,target)=>`/images/${target}.png`,(_mask,_noise,color,scale,offset,target)=>{
            assert.deepEqual(color,[1,1,1,.2]);assert.deepEqual(scale,[280,280]);assert.deepEqual(offset,[0,0]);return `/images/${target}.png`;
        });
        assert.deepEqual(result.overlay.corners,[{x:10,y:10},{x:10,y:0},{x:0,y:0},{x:0,y:10}]);
        assert.deepEqual(result.region.mesh!.uv,[[0,1],[1,1],[0,0]]);
        assert.equal(result.overlay.condition,undefined);assert.equal(result.region.condition,undefined);
        assert.equal(result.overlay.label,'');assert.equal(result.region.label,'');
        assert(!/upstream-|shader_profile|image_file/.test(JSON.stringify(result)));
        assert.equal(JSON.stringify(boundary),original);
        const drift=structuredClone(boundary);(drift.data.rim as any).uv_origin='unknown';
        assert.throws(()=>convert_native_boundary(drift,'teyvat',()=>null),/Unsupported/);
        fs.writeFileSync(file,'changed');assert.throws(()=>convert_native_boundary(boundary,'teyvat',()=>null),/changed after snapshot/);
    } finally {fs.unlinkSync(file);fs.rmdirSync(directory);}
});

test('place icons use exact relations, share one verified PNG, and reject changed image inputs', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'map-place-icon-')), file = path.join(directory, 'icon.png');
    const png = new PNG({ width: 2, height: 2 }); png.data.fill(255);
    const bytes = PNG.sync.write(png); fs.writeFileSync(file, bytes);
    try {
        const icon = record('map_icon', 'map-icon-building', { icon: 'UPSTREAM_IMAGE_KEY', image_file: file,
            image_sha256: createHash('sha256').update(bytes).digest('hex'), image_width: 2, image_height: 2 });
        const point = record('point', 'point-3-201', { scene_id: 3, point_class: 'building', position: { x: 12, y: 5, z: 34 }, icon: 'UPSTREAM_IMAGE_KEY' });
        point.relations = [{ role: 'map_icon', category: 'maps', id: icon.id }];
        point.name = 'Alchemy & <original>'; point.description = 'Original description\nSecond line';
        const second = { ...point, id: 'point-3-202' };
        let copies = 0;
        const copy = (_source: string, target: string) => { copies++; return `/images/${target}.png`; };
        const map = build_map_scenes([point, second, icon], 'en', copy)[0]!;
        assert.equal(copies, 1); assert.equal(map.markers[0]!.icon, map.markers[1]!.icon);
        assert.equal(map.markers[0]!.label, point.name); assert.equal(map.markers[0]!.description, point.description);
        assert(!JSON.stringify(map).includes('UPSTREAM_IMAGE_KEY')); assert(!JSON.stringify(map).includes(file));
        assert.equal(map_icon_exporter([icon], copy)({ ...point, relations: [] }), undefined);
        assert.throws(() => map_icon_exporter([], copy)(point), /Missing map icon record/);
        assert.throws(() => map_icon_exporter([icon], copy)({ ...point, relations: [...point.relations, ...point.relations] }), /Ambiguous/);
        const badges = ['normal', 'active'].map(state => ({ ...icon, id: `badge-${state}`, data: { ...icon.data, badge_state: state } }));
        const layered = { ...point, data: { ...point.data, floor_id: 10 } };
        const floor = record('floor', 'floor-10', { scene_id: 3, group_id: 1, number: 1 });
        const withBadges = build_map_scenes([layered, second, floor, icon, ...badges], 'en', copy)[0]!;
        assert(isMapScene(withBadges)); assert(withBadges.layerMarkerIcons?.normal); assert(withBadges.layerMarkerIcons?.active);
        assert(!JSON.stringify(withBadges).includes('badge_state')); assert(!JSON.stringify(withBadges).includes('UPSTREAM_IMAGE_KEY'));
        const invalidBadge = structuredClone(withBadges); invalidBadge.layerMarkerIcons!.active = 'UI_RAW_SPRITE'; assert(!isMapScene(invalidBadge));
        assert.throws(() => map_layer_marker_icons([badges[0]!], map_icon_exporter(badges, copy)), /Incomplete/);
        assert.throws(() => map_layer_marker_icons([...badges, badges[0]!], map_icon_exporter(badges, copy)), /Ambiguous/);
        assert.throws(() => map_layer_marker_icons([{ ...badges[0]!, data: { ...badges[0]!.data, badge_state: 'unexpected' } }], map_icon_exporter(badges, copy)), /Unmapped/);
        fs.writeFileSync(file, PNG.sync.write(new PNG({ width: 1, height: 1 })));
        assert.throws(() => map_icon_exporter([icon], copy)(point), /changed after snapshot/);
    } finally { fs.unlinkSync(file); fs.rmdirSync(directory); }
});
