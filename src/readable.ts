import fs from 'fs';

import { DocumentData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang } from "~/utils/i18n";
import { Readable, Readables } from "~/types/readable";
import readable_list from "~/data/readables";

export function get_readable(id: string, name: string, lang: Lang): Readable {
    const document_data = DocumentData.get_document(name, lang);

    const res: Readable = {
        name: document_data.name,
        content: document_data.content.map((text, index) => ConvertRaw.process_inline_images(
            text,
            `readable/${id}/${id}_content_${index}`
        )),
    };

    return res;
}

export function get_readable_list(lang: Lang): Readables {
    const res: Readables = [];

    for (let id in readable_list) {
        const document_data = DocumentData.get_document(readable_list[id], lang);
        res.push({ id, name: document_data.name });
    }

    return res;
}

export function gen_readable(lang: Lang, path: string) {
    fs.mkdirSync(path, { recursive: true });
    for (let id in readable_list) {
        fs.writeFileSync(`${path}/${id}.json`, JSON.stringify(get_readable(id, readable_list[id], lang), null, 4), 'utf-8');
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(get_readable_list(lang), null, 4), 'utf-8');
}
