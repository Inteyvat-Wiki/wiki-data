import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isMapCatalogue, isMapScene, isMapSceneIndex } from '@inteyvat-wiki/wiki-contracts/map';
import { readPngHeader } from '@inteyvat-wiki/resource-tools';

const root = path.resolve(process.argv[2] || process.env.WIKI_DATA_OUTPUT || 'data');
const read = (name: string): unknown => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const checkedImages = new Set<string>();
function image(reference: string) {
    assert(reference.startsWith('/images/'), 'Image must use the exported image directory');
    const file = path.resolve(root, reference.slice(1));
    assert(file.startsWith(path.join(root, 'images') + path.sep), 'Image escaped its output directory');
    if (!checkedImages.has(file)) { readPngHeader(file); checkedImages.add(file); }
}
const sceneIds: string[][] = [];
for (const language of ['zh_hans', 'en']) {
    const catalogue = read(`${language}/map/catalogue.json`), index = read(`${language}/map/scenes.json`);
    assert(isMapCatalogue(catalogue), 'Invalid map catalogue'); assert(isMapSceneIndex(index), 'Invalid map scene index');
    const ids = new Set(catalogue.items.map(item => item.id));
    for (const item of catalogue.items) {
        assert.deepEqual(item.details, [], `${item.id}: auxiliary details survived export`);
        assert.deepEqual(item.issues, [], `${item.id}: diagnostic prose survived export`);
        assert(item.texts.every(text => text.label === ''), `${item.id}: generated text labels survived export`);
    }
    for (const item of catalogue.items) if (item.icon) image(item.icon);
    for (const item of catalogue.items) for (const relation of item.relations) if (relation.target.category === 'map') assert(ids.has(relation.target.id), 'Broken catalogue link');
    const counts = { records: ids.size, scenes: index.scenes.length, overlays: 0, markers: 0, regions: 0, areas: 0, areaPolygons: 0, layers: 0, nativeImages: 0, meshes: 0 };
    for (const entry of index.scenes) {
        const scene = read(`${language}/map/scenes/${entry.id}.json`);
        assert(isMapScene(scene) && scene.id === entry.id, `Invalid scene ${entry.id}`);
        assert(scene.overlays.some(overlay => overlay.kind === 'base' && overlay.evidence === 'native'), `${entry.id}: scene has no native base map`);
        assert(Array.isArray(scene.maskGroups), `${entry.id}: missing explicit mask groups`);
        assert.equal(scene.label, entry.label, `${entry.id}: stale scene title`);
        if (scene.markers.some(marker => marker.layerId)) assert(scene.layerMarkerIcons, `${entry.id}: missing layer marker badges`);
        if (scene.layerMarkerIcons) { image(scene.layerMarkerIcons.normal); image(scene.layerMarkerIcons.active); }
        for (const key of ['overlays', 'markers', 'regions', 'layers'] as const) { assert.equal(scene[key].length, entry.counts[key], `${entry.id}: stale index count`); counts[key] += scene[key].length; }
        assert.equal(scene.areas?.length ?? 0, entry.counts.areas ?? 0, `${entry.id}: stale area count`);
        counts.areas += scene.areas?.length ?? 0;
        for (const area of scene.areas || []) {
            assert(ids.has(area.recordId), `${entry.id}: missing area record ${area.recordId}`);
            counts.areaPolygons += area.polygons.length;
        }
        for (const overlay of scene.overlays) {
            assert.equal(overlay.evidence, 'native', `${entry.id}: non-native image survived export`);
            image(overlay.image); counts.nativeImages++;
        }
        for (const choice of scene.states) assert.notEqual(choice.evidence, 'manual-reference', `${entry.id}: manual state survived export`);
        for (const group of scene.maskConditions || []) for (const rule of group.rules) {
            if(rule.recordId) assert(ids.has(rule.recordId), `${entry.id}: missing mask evidence ${rule.recordId}`);
        }
        for (const marker of scene.markers) {
            if (marker.recordId) assert(ids.has(marker.recordId), `${entry.id}: missing marker record ${marker.recordId}`);
            if (marker.icon) image(marker.icon);
        }
        for (const region of scene.regions) if (region.mesh) { image(region.mesh.texture); counts.meshes++; }
    }
    sceneIds.push(index.scenes.map(scene => scene.id).sort());
    console.log(JSON.stringify({ language, ...counts }));
}
assert.deepEqual(sceneIds[0], sceneIds[1], 'Language exports disagree on scene identities');
console.log(`Verified ${checkedImages.size} distinct PNG references, scene counts, conditions, layers and record links.`);
