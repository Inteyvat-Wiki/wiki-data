import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ImageStore } from '../src/utils/images';
import { ConvertRaw } from '../src/utils/convert_raw';

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-common-images-'));
// Header fixtures test selection, not full PNG decoding (validated by import tools).
function png(file: string, width: number, height: number, bytes: number) {
    const data = Buffer.alloc(bytes);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(data); data.write('IHDR', 12);
    data.writeUInt32BE(width, 16); data.writeUInt32BE(height, 20);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data);
}
const source = path.join(work, 'source'), output = path.join(work, 'output');
png(path.join(source, 'small/Icon.png'), 32, 32, 512);
png(path.join(source, 'large/Icon.png'), 64, 64, 64);
png(path.join(source, 'other.png'), 48, 48, 64);
fs.writeFileSync(path.join(source, 'broken.png'), 'not a png');
const store = new ImageStore(source, output);
assert.equal(store.fromName('UI/folder/Icon.png', 'sample/icon'), '/images/sample/icon.png');
assert.deepEqual(fs.readFileSync(path.join(output, 'images/sample/icon.png')), fs.readFileSync(path.join(source, 'large/Icon.png')));
assert.equal(store.fromName('Icon', 'sample/icon'), '/images/sample/icon.png');
assert.equal(store.fromName('other', 'sample/icon'), '/images/sample/icon_1.png');
assert.equal(store.fromName('other', 'sample/icon'), '/images/sample/icon_1.png');
assert.equal(store.fromName('other', 'sample/icon', path.join(work, 'second')), '/images/sample/icon.png');
fs.unlinkSync(path.join(output, 'images/sample/icon.png'));
assert.equal(store.fromName('Icon', 'sample/icon'), '/images/sample/icon.png');
assert(fs.existsSync(path.join(output, 'images/sample/icon.png')));
assert.equal(store.fromName('missing', 'sample/missing'), null);
assert.equal(store.fromName('broken', 'sample/broken'), null);
assert.equal(store.fromPath(path.join(work, 'missing.png'), 'sample/failed'), null);
assert(!fs.existsSync(path.join(output, 'images/sample/failed.png')));
assert.throws(() => store.fromName('Icon', '../../escape'), /Invalid image output/);
assert(store.failures.has('missing'));
assert.equal(ConvertRaw.get_images_url('missing-common-image-fixture', 'fixture/missing'), '');
assert.equal(ConvertRaw.get_images_url('missing-common-image-fixture', 'fixture/missing', { output, nullable: true }), null);
assert(ConvertRaw.get_failed_images_list().includes('missing-common-image-fixture'));
assert(!ConvertRaw.process_inline_images('<image name=missing-common-image-fixture/>', 'fixture/inline').includes('<img'));
console.log('Shared image index, pixel-area selection, stable paths, output isolation, regeneration, missing/copy failures and legacy wrappers passed.');
console.log(`Fixture directory retained for inspection: ${work}`);
