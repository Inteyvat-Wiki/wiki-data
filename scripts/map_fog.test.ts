import test from 'node:test';
import assert from 'node:assert/strict';
import { fog_midpoint_contour, fog_union_contours, rasterize_fog_contour } from '../src/utils/map_fog_contour';
import type { MultiPolygon } from 'polygon-clipping';
test('midpoint contour interpolates native texel centres and reads red, not alpha', () => {
    const image = { width: 4, height: 4, data: Uint8Array.from(Array.from({ length: 16 }, (_, i) => [[0, 64, 192, 255][i % 4]!, 255, 255, 0]).flat()) };
    const rect = { left: 0, bottom: 0, right: 4, top: 4 };
    const contour = fog_midpoint_contour(image, rect, 1);
    assert.equal(contour.length, 1);
    const middle = contour[0]![0]!.find(([z, x]) => x === 2.5 && z > 1);
    assert(middle);
    assert.equal(middle[0], 4 - (1.5 + (127.5 - 64) / (192 - 64)));
    image.data.forEach((_, i) => { if (i % 4 === 3) image.data[i] = 255; });
    assert.deepEqual(fog_midpoint_contour(image, rect, 1), contour);
});
test('fourfold enlargement preserves a grayscale ramp midpoint in world coordinates', () => {
    const image = { width: 4, height: 4, data: Uint8Array.from(Array.from({ length: 16 }, (_, i) => [[0, 64, 192, 255][i % 4]!, 0, 0, 255]).flat()) };
    const rect = { left: 10, bottom: 20, right: 18, top: 28 };
    const native = fog_midpoint_contour(image, rect, 1), enlarged = fog_midpoint_contour(image, rect);
    assert.equal(enlarged.length, native.length);
    assert(enlarged[0]![0]!.length > native[0]![0]!.length);
    const expected = 18 - (1.5 + (127.5 - 64) / (192 - 64)) * 2;
    const edge = enlarged[0]![0]!.filter(([z, x]) => z > 11 && x > 21 && x < 27);
    assert(edge.length > 4);
    for (const [z] of edge) assert(Math.abs(z - expected) < 1e-12);
    assert.throws(() => fog_midpoint_contour(image, rect, 0), /enlargement factor/);
});
const box = (left: number, bottom: number, right: number, top: number): MultiPolygon =>
    [[[[left, bottom], [right, bottom], [right, top], [left, top], [left, bottom]]]];
test('union removes outlines inside overlapping areas and preserves clear/opaque sides', () => {
    const shape = fog_union_contours([box(1, 1, 5, 7), box(3, 1, 7, 7)]);
    const result = rasterize_fog_contour(shape, { left: 0, bottom: 0, right: 8, top: 8 }, 32, .5);
    assert.equal(shape.length, 1);
    for (const col of [11, 12, 19, 20]) { // Both former internal edges, away from the union's outer edge.
        assert.equal(result.open[16 * 32 + col], 1);
        assert.equal(result.line[16 * 32 + col], 0);
    }
    assert.equal(result.open[0], 0);
    assert.equal(result.line[16 * 32 + 3], 1);
    assert.equal(result.line[16 * 32 + 4], 1); // Centred on the contour, not offset to one side.
});
test('holes remain fogged and receive their own midpoint outline', () => {
    const shape = box(0, 0, 8, 8);
    shape[0]!.push(box(3, 3, 5, 5)[0]![0]!);
    const result = rasterize_fog_contour(fog_union_contours([shape]), { left: 0, bottom: 0, right: 8, top: 8 }, 32, .5);
    assert.equal(result.open[16 * 32 + 16], 0);
    assert.equal(result.open[16 * 32 + 8], 1);
    assert.equal(result.line[16 * 32 + 11], 1);
});
test('independent tiles have the same fill and line as a single image at their seams', () => {
    const shape: MultiPolygon = [[[[1, 1], [7, 2], [6, 7], [2, 6], [1, 1]]]];
    const whole = rasterize_fog_contour(shape, { left: 0, bottom: 0, right: 8, top: 8 }, 32, .5);
    for (const left of [0, 4]) for (const bottom of [0, 4]) {
        const tile = rasterize_fog_contour(shape, { left, bottom, right: left + 4, top: bottom + 4 }, 16, .5);
        const offsetRow = (4 - bottom) * 4, offsetCol = (4 - left) * 4;
        for (const kind of ['open', 'line'] as const) for (let row = 0; row < 16; row++) for (let col = 0; col < 16; col++)
            assert(Math.abs(tile[kind][row * 16 + col]! - whole[kind][(row + offsetRow) * 32 + col + offsetCol]!) < 1e-6);
    }
});
test('empty masks expose no area and no contour', () => {
    const image = { width: 2, height: 2, data: new Uint8Array(16) };
    const shape = fog_midpoint_contour(image, { left: 0, bottom: 0, right: 8, top: 8 });
    assert.deepEqual(fog_union_contours([shape]), []);
    const result = rasterize_fog_contour(shape, { left: 0, bottom: 0, right: 8, top: 8 }, 8, 1);
    assert(result.open.every(v => v === 0));
    assert(result.line.every(v => v === 0));
});
