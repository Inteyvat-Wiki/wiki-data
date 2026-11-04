// Snapshot initialization and conversion may read blobs, never legacy/raw records.
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const legacy = path.resolve(path.dirname(require.resolve('genshin-db')), 'data').toLowerCase() + path.sep;
const raw = process.env.GENSHIN_DATA_SOURCE && path.resolve(process.env.GENSHIN_DATA_SOURCE).toLowerCase() + path.sep;
const manualMaps = [path.resolve(__dirname, '../src/map-data'), path.resolve(__dirname, '../../Inteyvat-Wiki-map-data')]
    .map(root => root.toLowerCase() + path.sep);
function check(file) {
    if (typeof file === 'number') return;
    const name = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file)).toLowerCase();
    if (name.startsWith(legacy) || raw && name.startsWith(raw) || manualMaps.some(root => name.startsWith(root))) throw new Error(`Migration boundary violation: ${name}`);
}
for (const method of ['readFileSync', 'openSync', 'createReadStream']) {
    const original = fs[method];
    fs[method] = function(file, ...args) { check(file); return original.call(this, file, ...args); };
}
for (const method of ['readFile', 'open']) {
    const original = fs.promises[method];
    fs.promises[method] = function(file, ...args) { check(file); return original.call(this, file, ...args); };
}
