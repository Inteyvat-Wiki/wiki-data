import fs from 'fs';

import { BookData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { Book, Books } from "~/types/book";
import book_list from "~/data/books";

export function get_book(name: string, lang: Lang): Book {
    const book_data = BookData.get_book(name, lang);

    const res: Book = [{
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
    }];

    return res;
}

export function get_book_list(lang: Lang): Books {
    const res: Books = [];

    for (let name of book_list) {
        const book_data = BookData.get_book(name, lang);
        res.push({
            id: name,
            name: book_data.name,
            icon: ConvertRaw.get_images_url(book_data.images.filename_icon, `book/${name}/${name}_icon`),
            set: book_data.setName,
        });
    }

    return res;
}

export function gen_book(lang: Lang, path: string) {
    fs.mkdirSync(path, { recursive: true });
    for (let name of book_list) {
        fs.writeFileSync(`${path}/${name}.json`, JSON.stringify(get_book(name, lang), null, 4), 'utf-8');
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(get_book_list(lang), null, 4), 'utf-8');
}
