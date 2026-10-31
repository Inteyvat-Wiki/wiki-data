import serenitea from '~/data/serenitea';
import tcg from '~/data/tcg';
import miliastra from '~/data/miliastra';
import misc from '~/data/misc';
import old_ids from '~/data/archive_id_aliases';

export const archive_directories = { serenitea, tcg, miliastra, misc };
export type DirectoryCategory = keyof typeof archive_directories;
export type ExportDirectory = Record<string, Record<string, string>>;
export const valid_directory_id = (id: string) => /^(?:[a-z][a-z0-9]*(?:_[a-z0-9]+)*-)?[a-z0-9]+(?:_[a-z0-9]+)*(?:-\d+)?$/.test(id);

export function directory_entries(directory: ExportDirectory) {
    const ids = new Set<string>(), sources = new Set<string>();
    return Object.entries(directory).flatMap(([type, entries]) => Object.entries(entries).map(([id, source_id]) => {
        if (!valid_directory_id(id)) throw new Error(`Invalid directory ID: ${id}`);
        if (!new RegExp(`^${type}-\\d+$`).test(source_id)) throw new Error(`Invalid directory source: ${type}/${source_id}`);
        if (ids.has(id) || sources.has(source_id)) throw new Error(`Duplicate directory identity: ${id}/${source_id}`);
        ids.add(id); sources.add(source_id);
        return {id, source_id, type};
    }));
}

const indexes = new Map<string, Map<string, string>>();
export function directory_id(category: string, source_id: string): string | undefined {
    if (!Object.hasOwn(archive_directories, category)) return undefined;
    if (!indexes.has(category)) indexes.set(category, new Map(directory_entries(archive_directories[category as DirectoryCategory]).map(entry => [entry.source_id, entry.id])));
    return indexes.get(category)!.get(source_id);
}

export function select_directory_records<T extends {id: string; type: string}>(records: T[], directory: ExportDirectory) {
    const sources = new Map(records.map(record => [record.id, record]));
    if (sources.size !== records.length) throw new Error('Duplicate source IDs');
    return directory_entries(directory).map(entry => {
        const record = sources.get(entry.source_id);
        if (!record || record.type !== entry.type) throw new Error(`Missing or mismatched directory source: ${entry.id}/${entry.source_id}`);
        return {...entry, record};
    });
}

export function directory_common(category: DirectoryCategory) {
    return {
        source_ids: Object.fromEntries(directory_entries(archive_directories[category]).map(entry => [entry.source_id, entry.id])),
        id_aliases: directory_aliases(category),
    };
}

export function directory_aliases(category: DirectoryCategory): Record<string, string> {
    const entries = directory_entries(archive_directories[category]);
    const ids = new Set(entries.map(entry => entry.id));
    const sources = new Map(entries.map(entry => [entry.source_id, entry.id]));
    return Object.fromEntries(Object.entries((old_ids as Record<string, Record<string, string>>)[category] || {}).map(([old, source]) => {
        const canonical = sources.get(source);
        if (!valid_directory_id(old) || !canonical || ids.has(old)) throw new Error(`Invalid or shadowed directory alias: ${category}/${old}`);
        return [old, canonical];
    }));
}
