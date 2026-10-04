import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'node:module';

import book_list from '~/data/books';
import readable_list from '~/data/readables';
import { BookData, DocumentData } from '~/utils/data';
import type { Book } from '~/types/book';
import type { Readable } from '~/types/readable';
import type { Lang } from '~/utils/i18n';

function read(file: string) {
    return JSON.parse(fs.readFileSync(`./data/${file}.json`, 'utf-8'));
}

function without_images(text: string) {
    return text.replace(/<image name=[^/]+\/>|<img src="[^"]+" class="inline_image" \/>/g, '');
}

function title_id(title: string) {
    const id = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9\s]+/g, '').trim().replace(/\s+/g, '_');
    return id || `title_${Array.from(title).map(char => char.codePointAt(0)!.toString(16)).join('_')}`;
}

assert.equal(new Set(book_list).size, book_list.length);
assert.deepEqual(read('books'), book_list);
assert.deepEqual(read('readables'), Object.keys(readable_list));

let previous_book: ReturnType<typeof BookData.get_book> | undefined;
for (const id of book_list) {
    const raw = BookData.get_book(id, 'en');
    if (previous_book) {
        assert.ok(raw.sortOrder > previous_book.sortOrder
            || (raw.sortOrder === previous_book.sortOrder && raw.codexId >= previous_book.codexId), id);
    }
    previous_book = raw;
}

const require = createRequire(import.meta.url);
const database = path.dirname(require.resolve('genshin-db'));
const document_folder = path.join(database, 'data/English/documents');
const documents = fs.readdirSync(document_folder).map(file =>
    JSON.parse(fs.readFileSync(path.join(document_folder, file), 'utf-8'))
).filter(data => data.name && data.content.length > 0).sort((a, b) => a.id - b.id);
assert.equal(Object.keys(readable_list).length, documents.length);
assert.deepEqual(Object.values(readable_list), documents.map(data => data.alias));

const counts = new Map<string, number>();
const indexes = new Map<string, number>();
for (const data of documents) {
    const id = title_id(data.name);
    counts.set(id, (counts.get(id) || 0) + 1);
}
for (const [index, id] of Object.keys(readable_list).entries()) {
    const base = title_id(documents[index].name);
    const duplicate_index = indexes.get(base) || 0;
    indexes.set(base, duplicate_index + 1);
    assert.equal(id, counts.get(base)! > 1 ? `${base}-${duplicate_index}` : base);
}

for (const lang of ['zh_hans', 'en'] as Lang[]) {
    assert.deepEqual(read(`${lang}/book/list`).map((item: { id: string }) => item.id), book_list);
    assert.deepEqual(read(`${lang}/readable/list`).map((item: { id: string }) => item.id), Object.keys(readable_list));
    for (const id of book_list) {
        const raw = BookData.get_book(id, lang);
        const data = read(`${lang}/book/${id}`) as Book;
        assert.equal(data.length, 1);
        assert.deepEqual(Object.keys(data[0]!).sort(), ['icon', 'info', 'name', 'star', 'type']);
        assert.equal(data[0]!.name, raw.name);
        assert.equal(data[0]!.info[0]!.description, raw.setName);
        assert.equal(data[0]!.info[1]!.description, raw.description);
        assert.equal(without_images(data[0]!.info[2]!.description as string), without_images(raw.content));
    }
    for (const id in readable_list) {
        const raw = DocumentData.get_document(readable_list[id], lang);
        const data = read(`${lang}/readable/${id}`) as Readable;
        assert.deepEqual(Object.keys(data).sort(), ['content', 'name']);
        assert.equal(data.name, raw.name);
        assert.deepEqual(data.content.map(without_images), raw.content.map(without_images));
    }
}

console.log(`Verified ${book_list.length} books and ${documents.length} documents in both languages: aliases, title IDs, order, schemas and content.`);
