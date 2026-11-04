import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import type { MapCoordinate, MapOverlay } from '@inteyvat-wiki/wiki-contracts/map';
import { checked_map_image, type MapPixelImage } from './map_boundary';
import { get_output_root } from './output';
import { FOG_DETAIL_SCALE, fog_midpoint_contour, fog_union_contours, rasterize_fog_contour, type FogRect } from './map_fog_contour';

type Rect = FogRect;
type Color = [number, number, number];
const memo = new Map<string, MapOverlay[]>();
const finite = (value: unknown): number => { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid native fog number'); return value; };
const vector = (value: unknown, size: number): number[] => {
    if (!Array.isArray(value) || value.length !== size) throw new Error('Invalid native fog vector'); return value.map(finite);
};
const color = (value: unknown): Color => vector(value, 4).slice(0, 3) as Color;
function rectangle(value: any): Rect {
    if (value?.space !== 'world-xz' || value.corners?.length !== 4) throw new Error('Missing native fog projection');
    const points = value.corners.map((p: any) => ({ x: finite(p.x), y: finite(p.y) })) as MapCoordinate[];
    const left = points[1]!.y, right = points[0]!.y, bottom = points[0]!.x, top = points[2]!.x;
    if (!(left < right && bottom < top) || points[1]!.x !== bottom || points[2]!.y !== left || points[3]!.x !== top || points[3]!.y !== right)
        throw new Error('Unsupported rotated native fog rectangle');
    return { left, bottom, right, top };
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));
export function render_outside_fog(data: Record<string, any>, sceneId: string): MapOverlay[] {
    if (data.shader_profile !== 'open-area-stencil-fog-7.1-v1' || data.preview !== 'all-areas-open-time-zero') throw new Error('Unmapped outside fog shader');
    if (!Array.isArray(data.groups) || !data.groups.length) throw new Error('Missing native fog groups');
    const key = createHash('sha256').update(JSON.stringify([get_output_root(), sceneId, data])).digest('hex');
    const previous = memo.get(key); if (previous) return previous;
    const pngs = new Map<string, MapPixelImage>();
    const load = (source: any) => {
        if (!pngs.has(source?.sha256)) pngs.set(source.sha256, PNG.sync.read(checked_map_image(source)));
        return pngs.get(source.sha256)!;
    };
    // This is an explicit Wiki style: the 50% vector contour, with no animated
    // warp, native clip offset, or sampled outline fade. Keep native cyan.
    const contour = fog_union_contours(data.groups.map((group: any) =>
        fog_midpoint_contour(load(group.mask.mask), rectangle(group.mask.geometry))));
    const edgeColor = color(data.groups[0].outline.edge_color);
    if (data.groups.some((group: any) => color(group.outline.edge_color).some((c, i) => c !== edgeColor[i])))
        throw new Error('Unmapped fog contour colors');
    const rect = rectangle(data.fog.geometry);
    const inside = (r: Rect, x: number, z: number) => x >= r.bottom && x <= r.top && z >= r.left && z <= r.right;
    const output: MapOverlay[] = [], tileSize = 4096, basePixels = 512, lineWidth = 16;
    const root = path.resolve(get_output_root(), 'images', 'map', 'scenes', sceneId);
    if (!root.startsWith(path.resolve(get_output_root(), 'images') + path.sep)) throw new Error('Invalid fog output path');
    fs.mkdirSync(root, { recursive: true });
    for (let tx = Math.floor(rect.bottom / tileSize); tx < Math.ceil(rect.top / tileSize); tx++) for (let tz = Math.floor(rect.left / tileSize); tz < Math.ceil(rect.right / tileSize); tz++) {
        const bottom = tx * tileSize, top = bottom + tileSize, left = tz * tileSize, right = left + tileSize;
        // Enlarge the final edge tiles too: a larger source alone would still
        // become blurry if the outline were baked back down to 512 pixels.
        // Uniform black/clear tiles need no extra decoded image memory.
        const padding = lineWidth / 2 + tileSize / basePixels;
        const hasEdge = contour.some(polygon => polygon.some(ring => ring.some((point, i) => {
            if (!i) return false;
            const previous = ring[i - 1]!;
            return Math.max(point[0], previous[0]) >= left - padding && Math.min(point[0], previous[0]) <= right + padding
                && Math.max(point[1], previous[1]) >= bottom - padding && Math.min(point[1], previous[1]) <= top + padding;
        })));
        const pixels = basePixels * (hasEdge ? FOG_DETAIL_SCALE : 1), step = tileSize / pixels;
        // Line width is presentation only; it does not move the contour/fog cut.
        const coverage = rasterize_fog_contour(contour, { bottom, top, left, right }, pixels, lineWidth);
        const png = new PNG({ width: pixels, height: pixels }); let visible = false;
        for (let row = 0; row < pixels; row++) for (let col = 0; col < pixels; col++) {
            const x = top - (row + .5) * step, z = right - (col + .5) * step;
            if (!inside(rect, x, z)) continue;
            const pixel = row * pixels + col, fogAlpha = 1 - clamp(coverage.open[pixel]!), lineAlpha = coverage.line[pixel]!;
            const alpha = lineAlpha + fogAlpha * (1 - lineAlpha);
            if (!alpha) continue;
            // Pure black outside the contour; retain the cyan antialiased line.
            const rgb = edgeColor.map(c => c * lineAlpha / alpha);
            const index = pixel * 4;
            rgb.forEach((v, i) => { png.data[index + i] = Math.round(clamp(v) * 255); }); png.data[index + 3] = Math.round(alpha * 255); visible = true;
        }
        if (!visible) continue;
        const id = `outside-fog-${tx}-${tz}`, file = path.join(root, `${id}.png`);
        fs.writeFileSync(file, PNG.sync.write(png));
        output.push({ id, image: `/images/map/scenes/${sceneId}/${id}.png`, label: '', kind: 'boundary', evidence: 'native', zIndex: 90000, opacity: 1,
            bounds: [{ x: bottom, y: left }, { x: top, y: right }],
            corners: [{ x: top, y: right }, { x: top, y: left }, { x: bottom, y: left }, { x: bottom, y: right }] });
    }
    memo.set(key, output); return output;
}
