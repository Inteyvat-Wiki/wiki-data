import { create_page, export_category, named_entries } from '~/utils/page';

import { QuestItemData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { QuestItem, QuestItemPages } from "~/types/quest_item";
import quest_item_list from "~/data/quest_items";
import { get_quest_item_tasks } from "~/task";

export function get_quest_item(id: string, name: string, lang: Lang): QuestItem | null {
    const quest_item_data = QuestItemData.get_quest_item(name, lang);

    if (!quest_item_data) {
        return null;
    }

    const raw_content = quest_item_data.content as string[] | string | undefined;
    const content = (Array.isArray(raw_content) ? raw_content : raw_content ? [raw_content] : [])
        .filter((text: string) => text !== '')
        .map((text: string, index: number) => ConvertRaw.process_inline_images(
            text,
            `quest_item/${id}/${id}_content_${index}`
        ));

    const related_tasks = get_quest_item_tasks(quest_item_data.id, lang);
    const res: QuestItem = {
        name: quest_item_data.name,
        icon: ConvertRaw.get_images_url(quest_item_data.images.filename_icon, `quest_item/${id}/${id}_icon`),
        star: quest_item_data.rarity || null,
        type: null,
        info: [
            {
                title: t('quest_item.description', lang),
                description: quest_item_data.description,
                type: 'description' as const,
            },
            ...(related_tasks.length > 0 ? [{
                title: t('quest_item.related_tasks', lang),
                description: related_tasks.map(id => `[[iw:task/${id}]]`).join('\n'),
                type: 'normal' as const,
            }] : []),
            ...(content.length > 0 ? [{
                title: null,
                description: content,
                type: 'text-list' as const,
            }] : []),
        ],
    };

    return res;
}

const source_index: Record<string, string | Record<string, string>> = quest_item_list;
const page_entries = named_entries(source_index);
const source_names: Record<string, string> = Object.fromEntries(Object.entries(source_index).flatMap(([id, value]) =>
    typeof value === 'string' ? [[id, value]] : Object.entries(value)));

export function get_quest_item_list(lang: Lang): QuestItemPages {
    return page_entries.map(entry => {
        const id = entry.items.at(-1)!;
        const data = QuestItemData.get_quest_item(source_names[id], lang);
        if (!data) throw new Error(`Quest item not found: ${id}`);
        return create_page({
            id: entry.id,
            name: data.name,
            icon: ConvertRaw.get_images_url(data.images.filename_icon, `quest_item/${id}/${id}_icon`),
            star: data.rarity || null,
        }, entry);
    });
}

export function gen_quest_item(lang: Lang, path: string) {
    export_category(path, get_quest_item_list(lang), Object.entries(source_names).map(([id, name]) => {
        const data = get_quest_item(id, name, lang);
        if (!data) throw new Error(`Quest item not found: ${id}`);
        return { id, data };
    }));
}
