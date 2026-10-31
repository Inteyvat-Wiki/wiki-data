import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import genshindb from 'genshin-db';
import { get_archive_export, get_archive_excluded_ids, set_archive_output } from '../src/utils/archive';
import type { ArchiveCategory } from '../src/types/archive';
import { archive_directories, directory_entries } from '../src/utils/archive_directory';

export function check_archive_category(category: ArchiveCategory, expected: number, expected_source = expected) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), `archive-query-${category}-`));
    set_archive_output(directory);
    const read = fs.readFileSync;
    // Prove that Wiki generation is independent of game input and extraction configuration.
    fs.readFileSync = ((file: any, ...args: any[]) => {
        const name = String(file).replaceAll('\\', '/');
        assert(!/(?:\/ExcelBinOutput\/|\/BinOutput\/|\/TextMap\/|GenshinData-scripts\/config\.json)/i.test(name),
            `Wiki generation attempted to read raw game input: ${name}`);
        return (read as any)(file, ...args);
    }) as typeof fs.readFileSync;
    try {
        for (const language of [genshindb.Language.ChineseSimplified, genshindb.Language.English]) {
            const query = genshindb[category];
            const records = query('names', { resultLanguage: language, queryLanguages: [language], matchCategories: true,
                verboseCategories: true })!;
            assert(Array.isArray(records));
            assert.equal(records.length, expected_source);
            const before = JSON.stringify(records);
            const source_records = new Map(records.map(record => [record.id, record]));
            const result = get_archive_export(category, language === genshindb.Language.English ? 'en' : 'zh_hans');
            assert.equal(result.files.length, expected);
            assert.equal(result.list.length, expected);
            const ids = new Set(result.files.map(file => file.id));
            assert.equal(ids.size, expected);
            const excluded = get_archive_excluded_ids(category, records);
            const entries = directory_entries(archive_directories[category]);
            const source_ids = new Map(entries.map(entry => [entry.id, entry.source_id]));
            assert.deepEqual([...ids].sort(), entries.map(entry => entry.id).sort());
            assert(entries.every(entry => source_records.has(entry.source_id) && !excluded.has(entry.source_id)));
            if (category === 'serenitea') {
                assert.equal(excluded.size, 170);
                assert(!result.files.some(file => file.data.type === 'host'));
                assert.equal(result.files.filter(file => file.data.type === 'furniture').length, 2324);
                assert.equal(result.files.filter(file => file.data.type === 'companion').length, 121);
            }
            for (const { id, data } of result.files) {
                assert.equal(data.name, query(source_ids.get(id)!, { resultLanguage: language, queryLanguages: [language],
                    matchIds: true, matchNames: false, matchAltNames: false })!.name);
                assert.deepEqual(data.classifications, source_records.get(source_ids.get(id)!)!.classifications);
                assert.deepEqual(result.list.find(page => page.id === id)!.classifications, data.classifications);
                for (const relation of data.relations) {
                    if (relation.category === category) assert(ids.has(relation.id));
                    assert(!('source_id' in relation), 'source references must be resolved before publishing Wiki links');
                }
                assert(!('layout' in data), 'unused furnishing layout stays upstream');
                for (const image of data.images) if (image.url) assert(fs.existsSync(path.join(directory, image.url)));
                for (const entry of data.entry_talks) assert(data.talks[entry]);
                for (const talk of Object.values(data.talks)) {
                    assert(!('source_dialogue' in talk));
                    for (const key of talk.next_talks) assert(data.talks[key]);
                    for (const next of talk.initial_dialogs || []) assert(talk.dialogs[next.dialog]);
                    for (const dialog of Object.values(talk.dialogs)) {
                        for (const next of dialog.next_dialogs) assert(talk.dialogs[next.dialog]);
                    }
                }
            }
            if (category === 'serenitea') {
                const furniture = result.files.filter(file => file.data.type === 'furniture');
                assert.equal(furniture.filter(file => file.data.classifications?.length).length, 2319);
                assert.equal(furniture.filter(file => !file.data.classifications?.length).length, 5);
                const types = new Set(furniture.flatMap(file => file.data.classifications!.map(value => value.id)));
                assert.equal(types.size, 73);
                assert.equal(furniture.filter(file => file.data.classifications!.length > 1).length, 79);
            }
            assert.equal(JSON.stringify(records), before, 'Wiki conversion must not mutate genshin-db records');
            console.log(`${language}/${category}: ${expected_source} source records -> ${expected} Wiki records; links, images and dialogue graphs passed without raw inputs.`);
        }
    } finally {
        fs.readFileSync = read;
        assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
        assert(path.basename(directory).startsWith(`archive-query-${category}-`));
        assert(!fs.lstatSync(directory).isSymbolicLink());
        fs.rmSync(directory, { recursive: true, force: true });
    }
}
