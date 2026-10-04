import { create_page, export_category, grouped_entries } from '~/utils/page';
import type { Book as RawBook } from 'genshin-db';

import { BookData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { Book, BookPages } from "~/types/book";
import book_list from "~/data/books";

export function get_book(name: string, lang: Lang): Book {
    const book_data = BookData.get_book(name, lang);

    const res: Book = {
        name: book_data.name,
        icon: ConvertRaw.get_images_url(book_data.images.filename_icon, `book/${name}/${name}_icon`),
        star: null,
        type: null,
        info: [
            {
                title: t('book.collection', lang),
                description: book_data.setName,
                type: 'description',
            },
            {
                title: t('book.description', lang),
                description: book_data.description,
                type: 'description',
            },
            {
                title: null,
                description: ConvertRaw.process_inline_images(book_data.content, `book/${name}/${name}_content`),
                type: 'text',
            },
        ],
    };

    return res;
}

type BookGroup = { id: string; setId: number; name: string; items: string[] };
type BookSource = { filename: string; data: Pick<RawBook, 'setId' | 'setName' | 'sortOrder' | 'codexId'> };

export function get_book_groups(books: BookSource[] = book_list.map((filename: string) => ({
    filename, data: BookData.get_book(filename, 'en'),
}))): BookGroup[] {
    const ordered_books = [...books].sort((a, b) =>
        (a.data.sortOrder ?? Infinity) - (b.data.sortOrder ?? Infinity) || a.data.codexId - b.data.codexId);
    const collections = new Map<number, Omit<BookGroup, 'id'>>();
    const item_ids = new Set<string>();
    for (const { filename, data } of ordered_books) {
        if (data.setId === undefined || !data.setName) throw new Error(`Missing book collection: ${filename}`);
        if (item_ids.has(filename)) throw new Error(`Duplicate book data ID: ${filename}`);
        item_ids.add(filename);
        let group = collections.get(data.setId);
        if (!group) {
            group = { setId: data.setId, name: data.setName, items: [] };
            collections.set(data.setId, group);
        }
        if (group.name !== data.setName) throw new Error(`Inconsistent collection name: ${data.setId}`);
        group.items.push(filename);
    }

    function title_id(title: string): string {
        const id = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            .replace(/[^a-z0-9\s]+/g, '').trim().replace(/\s+/g, '_');
        return id || `title_${Array.from(title).map(char => char.codePointAt(0)!.toString(16)).join('_')}`;
    }

    const counts = new Map<string, number>();
    const indexes = new Map<string, number>();
    for (const group of collections.values()) {
        const id = title_id(group.name);
        counts.set(id, (counts.get(id) || 0) + 1);
    }
    const groups: BookGroup[] = [];
    const page_ids = new Set(item_ids);
    for (const group of collections.values()) {
        const base = title_id(group.name);
        const index = indexes.get(base) || 0;
        indexes.set(base, index + 1);
        let id = counts.get(base)! > 1 ? `${base}-${index}` : base;
        // A collection and its source volumes occupy the same page ID namespace.
        if (page_ids.has(id)) id = `${id}-group`;
        const candidate = id;
        let suffix = 0;
        while (page_ids.has(id)) id = `${candidate}-${suffix++}`;
        page_ids.add(id);
        groups.push({ id, ...group });
    }
    return groups;
}

const page_entries = grouped_entries(get_book_groups().map(({ id, items }) => ({
    id, items, grouped: true,
})));

export function get_book_list(lang: Lang): BookPages {
    return page_entries.map(entry => {
        const id = entry.items.at(-1)!;
        const book_data = BookData.get_book(id, lang);
        return create_page({
            id: entry.id,
            name: entry.show ? book_data.setName : book_data.name,
            icon: ConvertRaw.get_images_url(book_data.images.filename_icon, `book/${id}/${id}_icon`),
            set: book_data.setName,
        }, entry);
    });
}

export function gen_book(lang: Lang, path: string) {
    export_category(path, get_book_list(lang), book_list.map((id: string) => ({
        id, data: get_book(id, lang),
    })));
}
