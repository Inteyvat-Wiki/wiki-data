// Mechanical migration: preserve source IDs, names, comments, order and disabled rows.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
async function plan() {
    const categories = ['serenitea', 'tcg', 'miliastra', 'misc'], changes = [];
    for (const category of categories) {
        const file = path.resolve('src/data', category + '.js');
        const directory = (await import(pathToFileURL(file))).default;
        const groups = new Map(), occupied = new Set();
        for (const [type, entries] of Object.entries(directory)) for (const [id, source] of Object.entries(entries)) {
            occupied.add(id);
            // Already namespaced IDs must not be renamed on a second run.
            if (id.startsWith(type + '-')) continue;
            const base = id.replace(/-\d+$/, '');
            if (!groups.has(base)) groups.set(base, []);
            groups.get(base).push({ category, type, id, source, base });
        }
        for (const rows of groups.values()) {
            const types = [...new Set(rows.map(row => row.type))];
            if (types.length < 2) continue;
            for (const type of types) {
                const typed = rows.filter(row => row.type === type);
                for (const [index, row] of typed.entries()) {
                    const next = `${type}-${row.base}` + (typed.length > 1 ? `-${index}` : '');
                    assert(!occupied.has(next), `Proposed ID already exists: ${category}/${next}`);
                    occupied.add(next); changes.push({ ...row, next });
                }
            }
        }
    }
    return changes;
}
async function main() {
    const changes = await plan();
    const summary = Object.fromEntries(['serenitea', 'tcg', 'miliastra', 'misc'].map(category =>
        [category, changes.filter(row => row.category === category).length]));
    if (process.argv.includes('--apply')) {
        const aliasFile = path.resolve('src/data/archive_id_aliases.js');
        const aliases = (await import(pathToFileURL(aliasFile))).default;
        for (const category of Object.keys(summary)) {
            const rows = changes.filter(row => row.category === category);
            if (!rows.length) continue;
            const file = path.resolve('src/data', category + '.js');
            const byId = new Map(rows.map(row => [row.id, row]));
            let replaced = 0;
            const text = fs.readFileSync(file, 'utf8').split('\n').map(line => {
                const match = /^(\s*)"([^"]+)":\s*"([^"]+)",(\s*)(.*)$/.exec(line);
                const row = match && byId.get(match[2]);
                if (!row) return line;
                assert.equal(match[3], row.source, 'Catalogue changed while migrating');
                const previous = (aliases[category] ||= {})[row.id];
                assert(!previous || previous === row.source, `Conflicting previous alias: ${row.id}`);
                aliases[category][row.id] = row.source; replaced++;
                return `${match[1]}"${row.next}": "${row.source}",`.padEnd(100) + ' ' + match[5];
            }).join('\n');
            assert.equal(replaced, rows.length, 'Each planned ID must occur exactly once');
            fs.writeFileSync(file, text);
        }
        if (changes.length) fs.writeFileSync(aliasFile,
            '// Previous Wiki IDs -> stable source IDs. Canonical IDs stay in each catalogue.\nexport default '
            + JSON.stringify(aliases, null, 4) + ';\n');
    }
    fs.mkdirSync('tmp', { recursive: true });
    fs.writeFileSync('tmp/structural-id-migration.json', JSON.stringify({ summary, changes }, null, 2));
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'applied' : 'preview', summary,
        samples: changes.slice(0, 4).map(({ category, id, next }) => ({ category, id, next })) }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
