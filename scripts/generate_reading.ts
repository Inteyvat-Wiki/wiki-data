import fs from 'fs';

import book_list from "~/data/books";
import readable_list from "~/data/readables";
import { gen_book } from "~/book";
import { gen_readable } from "~/readable";
import { Lang } from "~/utils/i18n";

fs.mkdirSync('./data', { recursive: true });
fs.writeFileSync('./data/books.json', JSON.stringify(book_list, null, 4), 'utf-8');
fs.writeFileSync('./data/readables.json', JSON.stringify(Object.keys(readable_list), null, 4), 'utf-8');

for (const lang of ['zh_hans', 'en'] as Lang[]) {
    gen_book(lang, `./data/${lang}/book`);
    gen_readable(lang, `./data/${lang}/readable`);
}
