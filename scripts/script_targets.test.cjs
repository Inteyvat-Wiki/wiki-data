const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('declared script entry points exist before commands are offered to maintainers', () => {
    const root = path.resolve(__dirname, '..');
    const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    for (const [name, command] of Object.entries(metadata.scripts)) {
        for (const match of command.matchAll(/(?:^|\s)(?:\.\/)?(scripts\/[\w/_.-]+\.(?:[cm]?js|[cm]?ts))(?=\s|$)/g)) {
            assert(fs.statSync(path.join(root, match[1]), { throwIfNoEntry: false })?.isFile(), `${name}: missing ${match[1]}`);
        }
    }
});
