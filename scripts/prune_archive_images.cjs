// Recoverable cleanup of generated publication images only. Source images are untouched.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const categories = ['serenitea', 'tcg', 'miliastra', 'misc'];
const [rootArg, backupArg, flag] = process.argv.slice(2);
assert(rootArg && backupArg, 'Usage: node scripts/prune_archive_images.cjs OUTPUT NEW_BACKUP [--apply]');
const root = path.resolve(rootArg), backup = path.resolve(backupArg);
assert(backup !== root && !backup.startsWith(root + path.sep), 'Backup must be outside generated output');
assert(!fs.existsSync(backup), 'Use a new backup directory');
const wanted = new Set(), moves = [];
function urls(value) {
    if (typeof value === 'string' && /^\/images\/(serenitea|tcg|miliastra|misc)\//.test(value)) {
        const target = path.resolve(root, '.' + value);
        assert(target.startsWith(path.join(root, 'images') + path.sep));
        wanted.add(target);
    } else if (Array.isArray(value)) value.forEach(urls);
    else if (value && typeof value === 'object') Object.values(value).forEach(urls);
}
for (const language of ['zh_hans', 'en']) for (const category of categories) {
    const directory = path.join(root, language, category);
    urls(JSON.parse(fs.readFileSync(path.join(directory, 'pages.json'), 'utf8')));
    for (const entry of fs.readdirSync(path.join(directory, 'items'), { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.json')) urls(JSON.parse(fs.readFileSync(path.join(directory, 'items', entry.name), 'utf8')));
    }
}
function visit(directory, base) {
    if (!fs.existsSync(directory)) return;
    assert(!fs.lstatSync(directory).isSymbolicLink(), 'Refuse symbolic directory');
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.resolve(directory, entry.name);
        assert(file.startsWith(base + path.sep), 'Generated image escaped category root');
        if (entry.isDirectory()) visit(file, base);
        else if (entry.isFile() && entry.name.endsWith('.png') && !wanted.has(file)) moves.push(file);
    }
}
for (const category of categories) {
    const base = path.join(root, 'images', category);
    visit(base, base);
}
for (const file of wanted) assert(fs.existsSync(file), `Published image missing before cleanup: ${file}`);
if (flag === '--apply') {
    fs.mkdirSync(backup);
    for (const file of moves) {
        const target = path.resolve(backup, path.relative(root, file));
        assert(target.startsWith(backup + path.sep), 'Backup target escaped root');
        fs.mkdirSync(path.dirname(target), { recursive: true });
        assert(!fs.existsSync(target));
        fs.renameSync(file, target);
    }
    fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify({ root, files: moves.map(file => path.relative(root, file)) }, null, 2), { flag: 'wx' });
}
console.log(JSON.stringify({ mode: flag === '--apply' ? 'apply' : 'dry-run', root, backup, unused: moves.length,
    categories: Object.fromEntries(categories.map(category => [category, moves.filter(file => file.startsWith(path.join(root, 'images', category) + path.sep)).length])) }));
