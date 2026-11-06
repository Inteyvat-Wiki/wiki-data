import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { ImageStore } from '../src/utils/images';

test('configured image directories share largest-image selection without a source import step', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-image-sources-'));
    t.after(() => { assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); });
    const first = path.join(root, 'old'), second = path.join(root, 'cache/batch'), output = path.join(root, 'output');
    for (const [directory, width] of [[first, 8], [second, 32]] as const) {
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, 'UI_Test.png'), PNG.sync.write(new PNG({ width, height: 8 })));
    }
    const store = new ImageStore([first, path.join(root, 'not-extracted-yet'), path.dirname(second)], output);
    assert.equal(store.fromName('folder/UI_Test.png', 'items/test'), '/images/items/test.png');
    assert.equal(PNG.sync.read(fs.readFileSync(path.join(output, 'images/items/test.png'))).width, 32);
    assert.equal(store.fromName('UI_Missing', 'items/missing'), null);
    assert.deepEqual([...store.requests], ['UI_Test', 'UI_Missing']);
    assert(fs.existsSync(path.join(second, 'UI_Test.png')), 'source remains in its extraction cache');
});
