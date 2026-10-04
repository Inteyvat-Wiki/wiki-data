import fs from 'node:fs';
import path from 'node:path';
import type { PageDataTrait } from '~/types/common';

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

export function named_entries(source: Record<string, string | Record<string, string>>): PageEntry[] {
    return grouped_entries(Object.entries(source).map(([id, value]) => ({
        id,
        items: typeof value === 'string' ? [id] : Object.keys(value),
        grouped: typeof value !== 'string',
    })));
}

export function create_page<T extends { id: string; name: string; icon?: string | null; star?: PageDataTrait['star'] }>(
    metadata: T,
    entry?: PageEntry,
): T & PageDataTrait {
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

export function export_category<T, P extends PageDataTrait>(
    directory: string,
    pages: P[],
    objects: { id: string; data: T }[],
): void {
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
        if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Invalid ID: ${id}`);
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
    for (const file of fs.readdirSync(items_directory, { withFileTypes: true })) {
        if (file.isFile() && file.name.endsWith('.json') && !available.has(file.name.slice(0, -5))) {
            fs.unlinkSync(path.join(items_directory, file.name));
        }
    }
}
