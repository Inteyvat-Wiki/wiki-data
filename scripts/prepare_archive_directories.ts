import fs from 'node:fs';
import path from 'node:path';
import { ArchiveData, MiscData } from '../src/utils/data';
import {get_archive_excluded_ids} from '../src/utils/archive';
import {archive_directories, directory_entries, type DirectoryCategory} from '../src/utils/archive_directory';

const plan_file = path.resolve('tmp/archive-directories-plan.json');
if (process.argv[2] === '--patch') {
    const category = process.argv[3], type = process.argv[4], offset = Number(process.argv[5] || 0);
    const plan = JSON.parse(fs.readFileSync(plan_file, 'utf8'));
    const rows = plan[category].filter((row: any) => row.type === type).slice(offset, offset + 400);
    const marker = `        // #endregion ${type}`;
    console.log(`*** Begin Patch\n*** Update File: D:/Inteyvat-Wiki-data/src/data/${category}.js\n@@\n-${marker}\n${rows.map((row: any) => '+' + row.line).join('\n')}\n+${marker}\n*** End Patch`);
} else {
    const plan: Record<string, any[]> = {};
    for (const category of Object.keys(archive_directories) as DirectoryCategory[]) {
        const get = (lang: 'zh_hans' | 'en') => category === 'misc' ? MiscData.get_records(lang) : ArchiveData.get_records(category, lang);
        const chinese = new Map(get('zh_hans').map(row => [row.id, row.name]));
        const all = get('en');
        const excluded = category === 'misc' ? new Set() : get_archive_excluded_ids(category, all);
        const catalogue = fs.readFileSync('src/data/' + category + '.js', 'utf8');
        const disabled = new Set(catalogue.split('\n').filter(line => line.trimStart().startsWith('//')).flatMap(line => [...line.matchAll(/"([^"]+)"/g)][1]?.[1] || []));
        const records = all.filter((row: any) => !excluded.has(row.id) && !disabled.has(row.id));
        const existing = new Map(directory_entries(archive_directories[category]).map(entry => [entry.source_id, entry.id]));
        const name_base = (row: any): string => row.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/<[^>]*>|\{[^}]*\}/g, '')
            .replace(/['’]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 110).replace(/_+$/g, '') || row.id.replaceAll('-', '_');
        const name_types = new Map<string, Set<string>>();
        for (const row of records) {
            const name = name_base(row);
            if (!name_types.has(name)) name_types.set(name, new Set());
            name_types.get(name)!.add(row.type);
        }
        const base = (row: any): string => name_types.get(name_base(row))!.size > 1 ? `${row.type}-${name_base(row)}` : name_base(row);
        const counts = new Map<string, number>();
        for (const row of records) counts.set(base(row), (counts.get(base(row)) || 0) + 1);
        const used = new Set(existing.values()), ordinals = new Map<string, number>();
        plan[category] = records.map((row: any) => {
            const name = base(row); let id = existing.get(row.id);
            if (!id) {
                const index = ordinals.get(name) || 0; ordinals.set(name, index + 1);
                id = counts.get(name)! > 1 ? `${name}-${index}` : name;
                let suffix = index; while (used.has(id)) id = `${name}-${++suffix}`;
            }
            used.add(id);
            const comment = String(chinese.get(row.id) || row.name).replace(/[\r\n\u2028\u2029]/g, ' ');
            return {type:row.type, id, source_id:row.id, line:`        ${JSON.stringify(id)}: ${JSON.stringify(row.id)},`.padEnd(100) + ` // ${comment}`};
        }).filter((row: any) => !existing.has(row.source_id));
    }
    fs.mkdirSync(path.dirname(plan_file), {recursive:true});
    fs.writeFileSync(plan_file, JSON.stringify(plan));
    console.log(JSON.stringify(Object.fromEntries(Object.entries(plan).map(([category, rows]) => [category,
        Object.fromEntries(Object.entries(Object.groupBy(rows, row => row.type)).map(([type, rows]) => [type, rows!.length]))]))));
}
