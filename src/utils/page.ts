import fs from 'node:fs';
import path from 'node:path';
import type { PageDataTrait } from '@inteyvat-wiki/wiki-contracts/common';
import { isWikiId } from '@inteyvat-wiki/wiki-contracts/ids';

export type PageEntry = Pick<PageDataTrait, 'id' | 'show' | 'items' | 'related_items'> & {
    type?: string;
};

export function anonymous_group_id(id: string): string {
    return `${id.replace(/-\d+$/, '')}-group`;
}

export function grouped_entries(
    groups: { id: string; items: string[]; type?: string; grouped: boolean }[],
): PageEntry[] {
    const entries: PageEntry[] = [];
    for (const group of groups) {
        if (group.items.length === 0) throw new Error(`Empty group: ${group.id}`);
        entries.push({
            id: group.id,
            type: group.type,
            show: true,
            items: [...group.items],
            related_items: [],
        });
        if (group.grouped) {
            for (const id of group.items) {
                if (id === group.id) continue; // A maintained item ID may also be the canonical page ID.
                entries.push({
                    id,
                    type: group.type,
                    show: false,
                    items: [id],
                    related_items: group.items.filter(item => item !== id),
                });
            }
        }
    }
    const ids = entries.map(entry => entry.id);
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate page IDs');
    return entries;
}

export function typed_entries(source: Record<string, (string | string[])[]>): PageEntry[] {
    return grouped_entries(Object.entries(source).flatMap(([type, values]) =>
        values.map(value => {
            const items = typeof value === 'string' ? [value] : value;
            return {
                id: typeof value === 'string' ? value : anonymous_group_id(items.at(-1)!),
                type,
                items,
                grouped: Array.isArray(value),
            };
        })));
}

export function named_entries<T extends string | number>(source: Record<string, T | Record<string, T>>): PageEntry[] {
    return grouped_entries(Object.entries(source).map(([id, value]) => ({
        id,
        items: typeof value === 'object' ? Object.keys(value) : [id],
        grouped: typeof value === 'object',
    })));
}

type PageMetadata = Pick<PageDataTrait, 'id' | 'name'> & Partial<Omit<PageDataTrait, 'id' | 'name'>>;
type EntryFields = 'show' | 'items' | 'related_items';
type Normalized<T, K extends 'icon' | 'star'> = K extends keyof T
    ? Exclude<T[K], undefined> | (undefined extends T[K] ? null : never) : PageDataTrait[K];
type WithDefault<T, K extends PropertyKey, D> = K extends keyof T
    ? T[K] | ({} extends Pick<T, K> ? D : never) : D;
export type CreatedPage<T, E extends PageEntry | undefined = undefined> =
    T extends unknown ? Omit<T, 'icon' | 'star' | EntryFields> & {
        icon: Normalized<T, 'icon'>;
        star: Normalized<T, 'star'>;
    } & (E extends undefined ? {
        show: WithDefault<T, 'show', boolean>;
        items: WithDefault<T, 'items', string[]>;
        related_items: WithDefault<T, 'related_items', string[]>;
    } : Pick<PageDataTrait, EntryFields>) : never;

// Entry fields replace metadata; icon/star normalize only nullish values.
// Without an entry, explicit undefined metadata still overrides a spread default.
// A key absent from T is not necessarily absent at runtime (structural typing).
export function create_page<T extends PageMetadata>(metadata: T): CreatedPage<T>;
export function create_page<T extends PageMetadata, E extends PageEntry | undefined>(
    metadata: T,
    entry: E,
): CreatedPage<T, E>;
export function create_page(metadata: PageMetadata, entry?: PageEntry) {
    return {
        show: true,
        items: [metadata.id],
        related_items: [],
        ...metadata,
        icon: metadata.icon ?? null,
        star: metadata.star ?? null,
        ...(entry ? {
            show: entry.show,
            items: [...entry.items],
            related_items: [...entry.related_items],
        } : {}),
    };
}

// Low-level writer: category binding belongs at the caller's contract boundary.
export function export_category(
    directory: string,
    pages: readonly PageDataTrait[],
    objects: readonly { id: string; data: object }[],
    common: Record<string, unknown> = {},
): void {
    for (const name of Object.keys(common)) {
        if (!/^[a-z][a-z_]*$/.test(name) || name === 'ids') throw new Error(`Invalid common export name: ${name}`);
    }
    const ids = objects.map(object => object.id);
    const available = new Set(ids);
    if (available.size !== ids.length) throw new Error(`Duplicate data IDs: ${directory}`);
    for (const object of objects) {
        if (!object.data || typeof object.data !== 'object' || Array.isArray(object.data)) {
            throw new Error(`Expected one data object: ${object.id}`);
        }
    }
    if (new Set(pages.map(page => page.id)).size !== pages.length) {
        throw new Error(`Duplicate page IDs: ${directory}`);
    }
    for (const id of [...ids, ...pages.map(page => page.id)]) {
        if (!isWikiId(id)) throw new Error(`Invalid ID: ${id}`);
    }
    for (const page of pages) {
        for (const id of [...page.items, ...page.related_items]) {
            if (!available.has(id)) throw new Error(`Missing data ${id} for page ${page.id}`);
        }
    }
    const items_directory = path.join(directory, 'items');
    const index_directory = path.resolve(directory, '../..', 'common', path.basename(directory));
    fs.mkdirSync(items_directory, { recursive: true });
    fs.mkdirSync(index_directory, { recursive: true });
    const write = (file: string, data: unknown) =>
        fs.writeFileSync(file, JSON.stringify(data, null, 4), 'utf-8');
    for (const object of objects) write(path.join(items_directory, `${object.id}.json`), object.data);
    write(path.join(directory, 'pages.json'), pages);
    write(path.join(index_directory, 'ids.json'), ids);
    for (const [name, data] of Object.entries(common)) write(path.join(index_directory, `${name}.json`), data);
    for (const file of fs.readdirSync(items_directory, { withFileTypes: true })) {
        if (file.isFile() && file.name.endsWith('.json') && !available.has(file.name.slice(0, -5))) {
            fs.unlinkSync(path.join(items_directory, file.name));
        }
    }
}
