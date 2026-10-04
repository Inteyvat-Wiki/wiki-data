import { create_page, export_category } from '~/utils/page';

import { DocumentData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang } from "~/utils/i18n";
import { Readable, ReadablePages } from "~/types/readable";
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

export function get_readable_list(lang: Lang): ReadablePages {
    const res: ReadablePages = [];

    for (let id in readable_list) {
        const document_data = DocumentData.get_document(readable_list[id], lang);
        res.push(create_page({ id, name: document_data.name }));
    }

    return res;
}

export function gen_readable(lang: Lang, path: string) {
    export_category(path, get_readable_list(lang), Object.entries(readable_list as Record<string, string>).map(([id, name]) => ({
        id, data: get_readable(id, name, lang),
    })));
}
