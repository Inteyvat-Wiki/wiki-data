import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Language, MapRecord } from '@inteyvat-wiki/genshin-db';
import { isMapScene, isMapSceneIndex, type MapScene, type MapSceneIndex, type MapCoordinate, type MapOverlay, type MapPredicate } from '@inteyvat-wiki/wiki-contracts/map';
import genshindb from './utils/genshin';
import { images } from './utils/images';
import { checked_map_image, convert_native_boundary, convert_sprite_boundary } from './utils/map_boundary';
import { render_outside_fog } from './utils/map_fog';
import { map_icon_exporter, map_layer_marker_icons } from './utils/map_icons';
import { ConvertRaw } from './utils/convert_raw';
import { t } from './utils/i18n';
import { map_area } from './utils/map_areas';
import { add_map_mask_conditions } from './utils/map_mask_conditions';
import { add_map_mask_groups } from './utils/map_mask_groups';
import { add_map_layer_conditions } from './utils/map_layer_conditions';
import { get_task_step_references } from './task';
import type { TaskStepReference } from './types/task';
import mapDirectory from '~/data/maps';
import { map_directory_entries, select_map_directory, selected_map_scenes, type MapSelection } from './utils/map_directory';

type Locale = 'zh_hans' | 'en';
type Bounds = [MapCoordinate, MapCoordinate];
const directory = map_directory_entries(mapDirectory);
function sourceObject(value: unknown): Record<string, any> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected map source object'); return value as Record<string, any>; }
function projection(value: unknown): MapCoordinate | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const point = value as Record<string, unknown>;
    return typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.z === 'number' && Number.isFinite(point.z) ? { x: point.x, y: point.z } : undefined;
}
function extend(current: Bounds | undefined, points: MapCoordinate[]): Bounds | undefined {
    const all = [...(current || []), ...points]; if (!all.length) return undefined;
    return [{ x: Math.min(...all.map(p => p.x)), y: Math.min(...all.map(p => p.y)) }, { x: Math.max(...all.map(p => p.x)), y: Math.max(...all.map(p => p.y)) }];
}
export function map_edge_style(opacity: number, strength: number) {
    if (!Number.isFinite(strength) || strength < 0) throw new Error('Invalid verified soft-edge strength');
    // For k <= 1 neither axis reaches the clamp: the product is k² times two triangles.
    return { opacity: opacity * Math.min(1, strength * strength), edgeFade: { horizontal: strength <= 1 ? 0.5 : 1 / (2 * strength), vertical: strength <= 1 ? 0.5 : 1 / (2 * strength) } };
}
export function build_map_scenes(records: MapRecord[], lang: Locale,
    copyImage: (source: string, target: string) => string | null = (source, target) => images.fromPath(source, target),
    stepReferences: ReadonlyMap<number, TaskStepReference> = new Map(), selection?: MapSelection): MapScene[] {
    const zh = lang === 'zh_hans', byId = new Map(records.map(record => [record.id, record]));
    const unnamed = (kind: 'scene' | 'floor' | 'layer_extent' | 'layer_group', id: string | number) => t(`map.unnamed.${kind}`, lang).replace('{id}', String(id));
    const exportIcon = map_icon_exporter(records, copyImage);
    const layerMarkerIcons = map_layer_marker_icons(records, exportIcon);
    const sceneNames = new Map<number, Set<string>>();
    for (const record of records.filter(record => record.kind === 'map_tag')) for (const id of (record.data.scene_ids as number[] || [])) {
        if (!record.name) continue; const names = sceneNames.get(id) || new Set<string>(); names.add(record.name); sceneNames.set(id, names);
    }
    const scenes = new Map<number, MapScene>(), extents = new Map<number, Bounds>();
    const overlaySources = new Map<string, MapRecord>();
    const scene = (id: number): MapScene => {
        if (!Number.isSafeInteger(id)) throw new Error('Invalid source scene identifier');
        if (!scenes.has(id)) {
            const entry = (selection || directory).get(id);
            const names = sceneNames.get(id), uniqueName = names?.size === 1 ? [...names][0] : undefined;
            scenes.set(id, { schema: 1, id: entry?.id || `scene-${id}`, label: uniqueName || entry?.title?.[lang] || unnamed('scene', id),
                bounds: [{ x: -512, y: -512 }, { x: 512, y: 512 }], overlays: [], markers: [], regions: [], areas: [], layers: [], states: [], issues: [] });
        }
        return scenes.get(id)!;
    };
    const addExtent = (id: number, points: MapCoordinate[]) => { const result = extend(extents.get(id), points); if (result) extents.set(id, result); };
    // Base-tile positions and PNG identities are supplied by the upstream client
    // parser. Legacy composed images, hand-drawn masks and placements are not inputs.
    const backdropExtents = new Map<number, Bounds>();
    for (const record of records.filter(record => record.kind === 'resource' && record.data.category === 'base-tile')) {
        const data = sourceObject(record.data), display = data.display_geometry;
        if (selection && !selection.has(data.scene_id)) continue;
        if (!Number.isSafeInteger(data.scene_id) || !display || display.space !== 'world-xz'
            || !Array.isArray(display.corners) || display.corners.length !== 4
            || display.corners.some((point: any) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new Error(`Invalid native base-tile geometry: ${record.id}`);
        checked_map_image({ file: data.image_file, sha256: data.image_sha256 });
        const map = scene(data.scene_id), image = copyImage(data.image_file, `map/scenes/${map.id}/${record.id}`);
        if (!image) throw new Error(`Native base tile could not be copied: ${record.id}`);
        const corners = [3,2,1,0].map(index => ({ x: display.corners[index].x, y: display.corners[index].y })) as [MapCoordinate,MapCoordinate,MapCoordinate,MapCoordinate];
        const bounds = extend(undefined, corners)!;
        map.overlays.push({ id: record.id, image, label: '', kind: 'base', corners, bounds, zIndex: 0, opacity: 1, evidence: 'native' });
        backdropExtents.set(data.scene_id, extend(backdropExtents.get(data.scene_id), bounds)!);
        addExtent(data.scene_id, bounds);
    }
    const atlasRecords = records.filter(record => record.kind === 'resource' && record.data.category === 'atlas-image' && (!selection || selection.has(record.data.scene_id as number)));
    const hierarchy = (record: MapRecord): number[] | undefined => {
        const order = record.data.render_order as {scope?:unknown;hierarchy?:unknown} | undefined;
        if (!order) return undefined;
        if (typeof order.scope !== 'string' || !Array.isArray(order.hierarchy) || !order.hierarchy.every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error(`Invalid image hierarchy: ${record.id}`);
        return order.hierarchy as number[];
    };
    const orderRanks = new Map<string, number>();
    const scopes = new Map<string, MapRecord[]>();
    for (const record of atlasRecords) if (hierarchy(record)) {
        const scope = String((record.data.render_order as any).scope), items = scopes.get(scope) || []; items.push(record); scopes.set(scope,items);
    }
    for (const items of scopes.values()) {
        items.sort((a,b)=>{const x=hierarchy(a)!,y=hierarchy(b)!;for(let i=0;i<Math.min(x.length,y.length);i++) if(x[i]!==y[i]) return x[i]!-y[i]!;return x.length-y.length;});
        items.forEach((item,index)=>orderRanks.set(item.id,index));
    }
    const atlasKeys = (record: MapRecord) => `${record.data.scene_id}/${record.data.asset_name}/${record.data.floor_id || 'cover'}`;
    const renderedAtlas = new Set<string>();
    for (const record of atlasRecords) {
        const data = sourceObject(record.data), display = data.display_geometry;
        if (typeof data.scene_id !== 'number') continue;
        if (!display || display.space !== 'world-xz') { scene(data.scene_id).issues.push(zh?'部分原生图像的坐标投影尚未校准，未绘制这些图像。':'Some native image projections are uncalibrated; those images are not drawn.'); continue; }
        if (!data.image_file) { scene(data.scene_id).issues.push(zh?'部分原生图像只有资源引用，尚无已校验的图片文件。':'Some native images have resource references but no verified image file.'); continue; }
        if (!Array.isArray(display.corners) || display.corners.length !== 4 || display.corners.some((point: any) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new Error(`Invalid native image corners: ${record.id}`);
        const map = scene(data.scene_id), assetKey = atlasKeys(record);
        const variants = atlasRecords.filter(candidate => atlasKeys(candidate) === assetKey);
        const identities = new Set(variants.map(candidate => JSON.stringify([candidate.data.display_geometry, candidate.data.component_color, candidate.data.material])));
        if (identities.size > 1) { map.issues.push(`${zh ? '同一图像存在尚未区分的原生布局，未绘制' : 'Multiple native layouts share this image and remain unresolved; not drawn'}: ${data.asset_name}`); continue; }
        if (renderedAtlas.has(assetKey)) continue;
        if (typeof data.image_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(data.image_sha256)) throw new Error(`Missing native image identity: ${record.id}`);
        if (createHash('sha256').update(fs.readFileSync(String(data.image_file))).digest('hex') !== data.image_sha256) throw new Error(`Native map image changed after snapshot preparation: ${record.id}`);
        const url = copyImage(String(data.image_file), `map/scenes/${map.id}/${record.id}`);
        if (!url) { map.issues.push(`${zh ? '原生图像缺失' : 'Missing native image'}: ${record.id}`); continue; }
        const corners = [3,2,1,0].map(index => ({ x: Number(display.corners[index].x), y: Number(display.corners[index].y) })) as [MapCoordinate,MapCoordinate,MapCoordinate,MapCoordinate];
        const bounds = extend(undefined, corners)!;
        const layerId = data.floor_id ? `floor-${data.floor_id}` : undefined;
        const condition: MapPredicate = {op:'unknown',reason:zh?'完整显示条件尚未还原':'The complete visibility condition is unconfirmed'};
        const alpha = Array.isArray(data.component_color) ? Number(data.component_color[3]) : 1;
        if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) throw new Error('Invalid native component opacity');
        if (Array.isArray(data.component_color) && data.component_color.slice(0,3).some(value=>value!==1)) map.issues.push(zh?'部分原生图像使用额外颜色乘算，当前仅应用原图与不透明度。':'Some native images use additional color multiplication; only the original image and opacity are currently applied.');
        const material = data.material, edge = material?.softEdge;
        const edgeStyle = material?.shaderStatus === 'verified-shader-bytes' && edge?.enabled ? map_edge_style(alpha, edge.strength) : undefined;
        if (edge?.enabled && !edgeStyle) map.issues.push(zh ? '部分原生图像的边缘着色器尚未验证，未假设柔边公式相同。' : 'Some native edge shaders are unverified; their fade formula is not assumed.');
        if (material?.smoothMaskEnabled) map.issues.push(zh ? '部分原生图像的全局裁剪仍未还原。' : 'Global clipping is not yet reconstructed for some native images.');
        const order=orderRanks.get(record.id);
        // Different prefab roots have no verified global order. Only their native
        // child order is applied within fixed Wiki presentation bands.
        const anchor=layerId?10000:1000;
        const output: MapOverlay = { id: record.id, image: url, label: '', bounds, corners, kind: layerId ? 'layer' : 'cover',
            zIndex: anchor+(order ?? 0), evidence:'native', conditionEvidence:'unresolved', opacity:edgeStyle?.opacity ?? alpha,
            ...(layerId?{layerId}:{}), ...(condition?{condition}:{}), ...(edgeStyle?{edgeFade:edgeStyle.edgeFade}:{}) };
        map.overlays.push(output);
        overlaySources.set(`${map.id}/${output.id}`,record);
        renderedAtlas.add(assetKey);
        if (layerId && !map.layers.some(layer => layer.id === layerId)) {
            const floor = byId.get(layerId);
            if (floor) map.layers.push({ id:layerId,label:floor.name || layerId,groupId:`layer-group-${floor.data.group_id}`,order:typeof floor.data.number === 'number'?floor.data.number:0 });
        }
        addExtent(data.scene_id, bounds);
        if (backdropExtents.has(data.scene_id)) backdropExtents.set(data.scene_id, extend(backdropExtents.get(data.scene_id), bounds)!);
    }
    for (const record of records) {
        const data = sourceObject(record.data);
        if (selection && typeof data.scene_id === 'number') {
            const entry = selection.get(data.scene_id);
            if (!entry) continue;
            if (record.kind === 'world_area' && !entry.areas.has(record.id)) continue;
            if (['point', 'viewpoint', 'npc_instance'].includes(record.kind) && !entry.places.has(record.id)) continue;
            if (record.kind === 'map_place' && !entry.labels.has(record.id)) continue;
        }
        if (record.kind === 'resource' && data.category === 'outside-fog') {
            const map = scene(data.scene_id);
            map.overlays.push(...render_outside_fog(data, map.id));
            map.issues.push(zh ? '外围遮挡沿原生区域灰度遮罩的 0.5 等值线合并裁切，使用纯黑背景和青绿色描边；这是全部区域已开放的静态展示样式，未模拟原生云雾、边缘扰动、开放过程及动画。'
                : 'Outer fog follows the union of native masks’ 0.5 contours with a pure black background and cyan-green outline; this static all-areas-open style does not simulate native clouds, edge distortion, unlocking or animation.');
        } else if (record.kind === 'resource' && data.category === 'native-boundary') {
            if ((selection || directory).get(data.scene_id)?.boundary !== record.id) continue;
            const map = scene(data.scene_id);
            if (data.parts !== undefined) map.overlays.push(...convert_sprite_boundary(record, map.id, copyImage));
            else {
                const boundary = convert_native_boundary(record, map.id, copyImage);
                map.overlays.push(boundary.overlay); map.regions.push(boundary.region);
            }
        } else if (record.kind === 'floor') {
            if (typeof data.scene_id !== 'number') continue;
            const map=scene(data.scene_id);
            if (!map.layers.some(layer=>layer.id===record.id)) map.layers.push({id:record.id,label:record.name || unnamed('floor', data.floor_id),groupId:`layer-group-${data.group_id}`,order:typeof data.number==='number'?data.number:0});
        } else if (record.kind === 'layer_region') {
            if (typeof data.scene_id !== 'number' || !Array.isArray(data.footprints)) continue;
            const map = scene(data.scene_id), sourceLayer = byId.get(`layer-${data.layer_id}`), floor = sourceLayer && byId.get(`floor-${sourceLayer.data.floor_id}`);
            if (record.diagnostics.some(code=>code.startsWith('layer_region_shape_projection_unresolved:'))) map.issues.push(zh?'部分楼层选择空间的形状尚未还原，当前只显示已验证的部分。':'Some layer-selection volume shapes remain unresolved; only verified shapes are displayed.');
            const layerId = floor?.id;
            if (floor && !map.layers.some(layer => layer.id === floor.id)) map.layers.push({ id:floor.id,label:floor.name || floor.id,groupId:`layer-group-${floor.data.group_id}`,order:typeof floor.data.number === 'number'?floor.data.number:0 });
            for (const [index, footprint] of data.footprints.entries()) {
                const rings: MapCoordinate[][] = [], circles: Array<{center:MapCoordinate;radius:number}> = [];
                if (footprint.kind === 'polygon') {
                    const ring = (footprint.points || []).map(projection);
                    if (ring.length < 3 || ring.some((point: unknown) => !point)) throw new Error(`Invalid native layer outline: ${record.id}`);
                    rings.push(ring as MapCoordinate[]);
                } else if (footprint.kind === 'circle') {
                    const center = projection(footprint.center);
                    if (!center || !Number.isFinite(footprint.radius) || footprint.radius <= 0) throw new Error(`Invalid native layer circle: ${record.id}`);
                    circles.push({center,radius:footprint.radius});
                } else throw new Error(`Unmapped layer footprint: ${footprint.kind}`);
                const height = footprint.height;
                if (!height || !Number.isFinite(height.minimum) || !Number.isFinite(height.maximum)) throw new Error(`Invalid layer height range: ${record.id}`);
                map.regions.push({id:`${record.id}-${index}`,label:floor?.name || unnamed('layer_extent', data.layer_id),
                    description: '',
                    kind:'layer-extent',evidence:'native',rings,...(circles.length?{circles}:{}),...(layerId?{layerId}:{})});
                addExtent(data.scene_id,[...rings.flat(),...circles.flatMap(circle=>[{x:circle.center.x-circle.radius,y:circle.center.y-circle.radius},{x:circle.center.x+circle.radius,y:circle.center.y+circle.radius}])]);
            }
        } else if (record.kind === 'world_area') {
            const area = map_area(record, byId);
            scene(data.scene_id as number).areas!.push(area);
            addExtent(data.scene_id as number, area.polygons.flatMap(polygon => polygon.points));
        } else if (record.kind === 'point' || record.kind === ('viewpoint' as any) || record.kind === ('npc_instance' as any) || record.kind === ('map_place' as any)) {
            const position = projection(data.position); if (!position || typeof data.scene_id !== 'number') continue;
            const map = scene(data.scene_id), isViewpoint = record.kind === ('viewpoint' as any), isNpc = record.kind === ('npc_instance' as any), isPlace = record.kind === ('map_place' as any);
            // Retain the scene and full research records, even if every marker is excluded.
            // Filter before bounds/layer/state accumulation as well as marker creation.
            if (record.kind === 'point' && ConvertRaw.get_map_point_metadata(data).display?.exclude) continue;
            const visibility = ConvertRaw.get_map_point_visibility(data.visibility);
            let condition: MapPredicate | undefined;
            // Curated text labels show their original name without a player-state preview.
            // Unresolved name-rule evidence remains in the catalogue.
            if (isPlace) condition = undefined;
            else if (visibility === 'never' || visibility === 'hidden' || data.invisible === true) condition = { op: 'constant', value: false };
            // Wiki shows selected places independently of player unlock progress.
            // Preserve source visibility in the catalogue, without exporting an unlock control.
            else if (visibility === 'always' || visibility === 'when_unlocked') condition = { op: 'constant', value: true };
            else condition = { op: 'unknown', reason: zh ? '源配置未给出完整显示条件' : 'The complete visibility condition is unspecified' };
            const layerId = data.floor_id ? `floor-${data.floor_id}` : undefined;
            const pointKind = ConvertRaw.get_map_point_marker_kind(data.point_class);
            const iconRecord = byId.get(record.relations.find(relation => relation.role === 'map_icon' && relation.category === 'maps')?.id || '');
            const minZoom = ConvertRaw.get_map_icon_min_zoom(iconRecord?.data.layer);
            const marker: MapScene['markers'][number] = { id: record.id, recordId: record.id, label: record.name,
                description: record.description,
                position, kind: isViewpoint ? 'viewpoint' : isNpc ? 'npc' : isPlace ? 'label' : pointKind || 'point',
                ...(minZoom !== undefined ? { minZoom } : {}),
                ...(isPlace && record.name ? { labelMinZoom: -2 } : {}), ...(layerId ? { layerId } : {}), ...(condition ? { condition } : {}) };
            const icon = exportIcon(record);
            if (icon) marker.icon = icon;
            map.markers.push(marker);
            if (layerId && !map.layers.some(layer => layer.id === layerId)) {
                const floor = byId.get(layerId);
                if (floor) map.layers.push({ id: layerId, label: floor.name || layerId, groupId: `layer-group-${floor.data.group_id}`, order: typeof floor.data.number === 'number' ? floor.data.number : 0 });
            }
            addExtent(data.scene_id, [position]);
        }
    }
    for (const [id, map] of scenes) {
        add_map_mask_conditions(map,records,new Map(map.overlays.flatMap(overlay=>{
            const source=overlaySources.get(`${map.id}/${overlay.id}`);return source?[[overlay.id,source] as const]:[];
        })),lang,stepReferences);
        for (const layer of map.layers) {
            const group = byId.get(layer.groupId);
            layer.groupLabel = group?.name || unnamed('layer_group', group?.data.group_id as number ?? layer.groupId);
        }
        add_map_layer_conditions(map, records, new Map(map.overlays.flatMap(overlay => {
            const source = overlaySources.get(`${map.id}/${overlay.id}`); return source ? [[overlay.id, source] as const] : [];
        })), lang, stepReferences);
        const selected = selection?.get(id);
        if (selected) add_map_mask_groups(map, selected.maskGroups, lang);
        const bounds = backdropExtents.get(id) || extents.get(id); if (bounds) {
            const padding = 64;
            map.bounds = [{ x: bounds[0].x - padding, y: bounds[0].y - padding }, { x: bounds[1].x + padding, y: bounds[1].y + padding }];
        }
        if (!map.overlays.some(overlay => overlay.kind === 'base')) map.issues.push(zh ? '此场景尚未提供底图，按游戏坐标展示地点与范围。' : 'No background is available; points and regions use game coordinates.');
        map.issues = [...new Set(map.issues)];
        if (layerMarkerIcons && map.markers.some(marker => marker.layerId)) map.layerMarkerIcons = layerMarkerIcons;
        const key = map.id; if (!isMapScene(map)) throw new Error(`Invalid converted map scene: ${key}`);
    }
    return [...scenes.values()];
}

export function get_map_scenes(lang: Locale): MapScene[] {
    const language = (lang === 'zh_hans' ? 'ChineseSimplified' : 'English') as Language;
    const records = genshindb.maps('names', { resultLanguage: language, queryLanguages: [language], matchCategories: true, verboseCategories: true, matchNames: false, matchAliases: false, matchAltNames: false });
    if (!Array.isArray(records) || !records.length) throw new Error('Map source snapshot is missing');
    if (!(records as MapRecord[]).some(record => record.kind === 'resource' && record.data.category === 'base-tile')) {
        throw new Error('Native map base tiles are missing. Prepare the client base-map resource cache before exporting scenes; manual map data is not supported.');
    }
    // The evidence catalogue stays complete. Only scenes with successfully
    // converted native base tiles enter the display index and scene documents;
    // points, area polygons, covers and floor images alone do not qualify.
    const selection = select_map_directory(records as MapRecord[], mapDirectory);
    const scenes = selected_map_scenes(build_map_scenes(records as MapRecord[], lang, undefined, get_task_step_references(lang, { omitHiddenText:true }), selection), selection);
    for (const scene of scenes) if (scene.markers.some(marker => marker.layerId) && !scene.layerMarkerIcons)
        throw new Error(`Native layer marker icons are missing for ${scene.id}. Prepare the updated map icon resource cache.`);
    return scenes;
}
export function gen_map_scenes(lang: Locale, directory: string): MapSceneIndex {
    const scenes = get_map_scenes(lang);
    const index: MapSceneIndex = { schema: 1, scenes: scenes.map(scene => ({ id: scene.id, label: scene.label,
        counts: { overlays: scene.overlays.length, markers: scene.markers.length, regions: scene.regions.length, areas: scene.areas!.length, layers: scene.layers.length } })) };
    if (!isMapSceneIndex(index)) throw new Error('Invalid map scene index');
    fs.mkdirSync(path.join(directory, 'scenes'), { recursive: true });
    for (const scene of scenes) fs.writeFileSync(path.join(directory, 'scenes', `${scene.id}.json`), JSON.stringify(scene), 'utf8');
    fs.writeFileSync(path.join(directory, 'scenes.json'), JSON.stringify(index), 'utf8');
    return index;
}
