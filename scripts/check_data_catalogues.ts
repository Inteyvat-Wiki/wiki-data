import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import genshindb from 'genshin-db';
import { ArchiveData, MiscData } from '../src/utils/data';
import { get_archive_export, set_archive_output } from '../src/utils/archive';
import { get_misc_export, set_misc_output } from '../src/misc';
import { archive_directories, directory_entries } from '../src/utils/archive_directory';

assert.throws(() => ArchiveData.get_records('unknown' as any, 'en'), /Unknown archive category/);
assert.throws(() => ArchiveData.get_records('tcg', 'ja'), /language not configured/);
assert.throws(() => MiscData.get_records('ja'), /language not configured/);

const output = path.resolve('tmp/data-catalogue-regression');
for (const lang of ['zh_hans', 'en'] as const) {
    // Reproduce publication context without copying full datasets or writing formal exports.
    for (const category of fs.readdirSync(`data/${lang}`)) {
        const pages = `data/${lang}/${category}/pages.json`;
        if (!fs.existsSync(pages)) continue;
        const target = path.join(output, lang, category, 'pages.json');
        fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(pages, target);
    }
    for (const category of ['serenitea', 'tcg', 'miliastra', 'misc'] as const) {
        const records = category === 'misc' ? MiscData.get_records(lang) : ArchiveData.get_records(category, lang);
        const language = lang === 'en' ? genshindb.Language.English : genshindb.Language.ChineseSimplified;
        const direct = (genshindb[category] as Function)('names', { resultLanguage: language, queryLanguages: [language],
            matchCategories: true, verboseCategories: true, matchNames: false, matchAltNames: false });
        assert.deepEqual(records, direct);
        const source = JSON.stringify(records);
        set_archive_output(output); set_misc_output(output);
        const first = directory_entries(archive_directories[category])[0]!.source_id;
        const probe: any = records.find(record => record.id === first)!;
        probe.__unhandled_field = true;
        probe.source.__unhandled_field = true;
        let result: ReturnType<typeof get_misc_export> | ReturnType<typeof get_archive_export>;
        try {
            result = category === 'misc' ? get_misc_export(lang) : get_archive_export(category, lang);
        } finally {
            delete probe.__unhandled_field;
            delete probe.source.__unhandled_field;
        }
        for (const file of result.files) {
            assert.deepEqual(file.data, JSON.parse(fs.readFileSync(`data/${lang}/${category}/items/${file.id}.json`, 'utf8')));
        }
        assert.deepEqual(result.list, JSON.parse(fs.readFileSync(`data/${lang}/${category}/pages.json`, 'utf8')));
        assert.equal(JSON.stringify(records), source, 'export conversion must not mutate query cache');
        console.log(`${lang}/${category}: ${result.files.length} complete documents and list unchanged; query parity and cache immutability passed.`);
    }
}
