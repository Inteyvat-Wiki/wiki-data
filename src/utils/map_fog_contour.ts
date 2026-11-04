import { contours } from 'd3-contour';
import polygonClipping, { type MultiPolygon, type Pair } from 'polygon-clipping';
import type { MapPixelImage } from './map_boundary';

export type FogRect = { left: number; bottom: number; right: number; top: number };
export const FOG_DETAIL_SCALE = 4;

/** Wiki presentation: enlarge the mask before tracing its unwarped 50% level.
 * Points are [world Z, world X]; PNG columns/rows run opposite to both axes.
 * Bilinear enlargement preserves texel-centre alignment and floating-point
 * grayscale values; no 8-bit rounding, extra blur or animated noise is applied.
 */
export function fog_midpoint_contour(mask: MapPixelImage, rect: FogRect, scale = FOG_DETAIL_SCALE): MultiPolygon {
    if (!Number.isSafeInteger(mask.width) || mask.width < 1 || !Number.isSafeInteger(mask.height) || mask.height < 1
        || mask.data.length !== mask.width * mask.height * 4) throw new Error('Invalid fog contour image');
    if (!Object.values(rect).every(Number.isFinite) || rect.left >= rect.right || rect.bottom >= rect.top) throw new Error('Invalid fog contour rectangle');
    if (!Number.isSafeInteger(scale) || scale < 1 || scale > 8) throw new Error('Invalid fog enlargement factor');
    const width = mask.width * scale, height = mask.height * scale, values = new Array<number>(width * height);
    const columns = Array.from({ length: width }, (_, col) => {
        const x = (col + .5) / scale - .5, left = Math.floor(x);
        return { left: Math.max(0, Math.min(mask.width - 1, left)), right: Math.max(0, Math.min(mask.width - 1, left + 1)), fraction: x - left };
    });
    for (let row = 0; row < height; row++) {
        const y = (row + .5) / scale - .5, top = Math.floor(y), fraction = y - top;
        const first = Math.max(0, Math.min(mask.height - 1, top)) * mask.width * 4;
        const last = Math.max(0, Math.min(mask.height - 1, top + 1)) * mask.width * 4;
        for (let col = 0; col < width; col++) {
            const x = columns[col]!;
            const a = mask.data[first + x.left * 4]! * (1 - x.fraction) + mask.data[first + x.right * 4]! * x.fraction;
            const b = mask.data[last + x.left * 4]! * (1 - x.fraction) + mask.data[last + x.right * 4]! * x.fraction;
            values[row * width + col] = (a * (1 - fraction) + b * fraction) / 255;
        }
    }
    return contours().size([width, height]).smooth(true).contour(values, .5).coordinates.map(polygon =>
        polygon.map(ring => ring.map(([col, row]): Pair => [
            rect.right - col! / width * (rect.right - rect.left),
            rect.top - row! / height * (rect.top - rect.bottom),
        ])));
}

/** Union before stroking: overlapping open areas must not leave internal lines. */
export function fog_union_contours(parts: MultiPolygon[]): MultiPolygon {
    const present = parts.filter(part => part.length);
    return present.length ? polygonClipping.union(present[0]!, ...present.slice(1)) : [];
}

/** Rasterize the already traced vector geometry, not the source mask shader.
 * The fill and centred, round-joined line share exactly the same contour.
 * All coordinates stay global until rasterization, including at tile seams.
 */
export function rasterize_fog_contour(contour: MultiPolygon, tile: FogRect, pixels: number, lineWidth: number) {
    if (!Number.isSafeInteger(pixels) || pixels < 1 || !Number.isFinite(lineWidth) || lineWidth < 0) throw new Error('Invalid fog contour style');
    const step = (tile.right - tile.left) / pixels;
    if (!(step > 0) || Math.abs(tile.top - tile.bottom - pixels * step) > 1e-6) throw new Error('Fog tile must be square');
    const open = new Float32Array(pixels * pixels), line = new Float32Array(pixels * pixels);
    // Integrate horizontal coverage exactly, with four subrows for antialiasing.
    const samples = 4, crossings: number[][] = Array.from({ length: pixels * samples }, () => []);
    const radius = lineWidth / step / 2, reach = radius + .5;
    for (const polygon of contour) for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
        const first = ring[i - 1]!, last = ring[i]!;
        const ax = (tile.right - first[0]) / step, ay = (tile.top - first[1]) / step;
        const bx = (tile.right - last[0]) / step, by = (tile.top - last[1]) / step;
        const dx = bx - ax, dy = by - ay, length2 = dx * dx + dy * dy;
        if (!length2) continue;
        if (dy) {
            const start = Math.max(0, Math.ceil(Math.min(ay, by) * samples - .5));
            const end = Math.min(pixels * samples, Math.ceil(Math.max(ay, by) * samples - .5));
            for (let subrow = start; subrow < end; subrow++) {
                const y = (subrow + .5) / samples;
                crossings[subrow]!.push(ax + (y - ay) / dy * dx);
            }
        }
        if (!lineWidth) continue;
        const left = Math.max(0, Math.floor(Math.min(ax, bx) - reach)), right = Math.min(pixels - 1, Math.ceil(Math.max(ax, bx) + reach));
        const top = Math.max(0, Math.floor(Math.min(ay, by) - reach)), bottom = Math.min(pixels - 1, Math.ceil(Math.max(ay, by) + reach));
        for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) {
            const px = col + .5 - ax, py = row + .5 - ay;
            const along = Math.max(0, Math.min(1, (px * dx + py * dy) / length2));
            const distance = Math.hypot(px - along * dx, py - along * dy);
            const index = row * pixels + col;
            line[index] = Math.max(line[index]!, Math.max(0, Math.min(1, reach - distance)));
        }
    }
    crossings.forEach((xs, subrow) => {
        xs.sort((a, b) => a - b);
        if (xs.length % 2) throw new Error('Open fog contour during rasterization');
        const offset = Math.floor(subrow / samples) * pixels;
        for (let i = 0; i < xs.length; i += 2) {
            const left = Math.max(0, xs[i]!), right = Math.min(pixels, xs[i + 1]!);
            for (let col = Math.floor(left); col < Math.ceil(right); col++)
                open[offset + col]! += Math.max(0, Math.min(col + 1, right) - Math.max(col, left)) / samples;
        }
    });
    return { open, line };
}
