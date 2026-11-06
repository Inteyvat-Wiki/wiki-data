'use strict';
// Preloaded in package smoke processes AND their Node children. The consumer lives
// under wiki-data/tmp, so explicitly prohibit fallback to ancestor node_modules.
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const fs = require('node:fs');
const consumer = process.env.GENSHIN_PACKAGE_CONSUMER_ROOT;
assert(consumer && path.isAbsolute(consumer), 'Run through check:packages');
const inside = file => {
    const relative = path.relative(consumer, String(file));
    return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
};
const resolve = Module._resolveFilename;
Module._resolveFilename = function (...args) {
    const filename = resolve.apply(this, args);
    assert(Module.isBuiltin(filename) || inside(filename), `Package consumer resolved outside its installation: ${filename}`);
    return filename;
};
for (const method of ['readFileSync', 'openSync']) {
    const original = fs[method];
    fs[method] = function (file, ...args) {
        if (typeof file === 'string' || file instanceof URL) {
            const filename = file instanceof URL ? require('node:url').fileURLToPath(file) : file;
            assert(inside(path.resolve(filename)), `Package consumer read outside its fixture: ${filename}`);
        }
        return original.call(this, file, ...args);
    };
}
