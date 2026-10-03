import fs from 'fs';

import { QuestItemData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { QuestItem, QuestItems } from "~/types/quest_item";
import quest_item_list from "~/data/quest_items";

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

    const res: QuestItem = [{
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
            ...(content.length > 0 ? [{
                title: null,
                description: content,
                type: 'text-list' as const,
            }] : []),
        ],
    }];

    return res;
}

export function get_quest_item_list(lang: Lang): QuestItems {
    const res: QuestItems = [];

    for (let group_id in quest_item_list) {
        const id = typeof quest_item_list[group_id] === 'string' ? group_id : Object.keys(quest_item_list[group_id]).at(-1)!;
        const name = typeof quest_item_list[group_id] === 'string' ? quest_item_list[group_id] : quest_item_list[group_id][id];

        const quest_item_data = QuestItemData.get_quest_item(name, lang);

        if (quest_item_data) {
            res.push({
                id: group_id,
                name: quest_item_data.name,
                icon: ConvertRaw.get_images_url(quest_item_data.images.filename_icon, `quest_item/${id}/${id}_icon`),
                star: quest_item_data.rarity || null,
                count: typeof quest_item_list[group_id] === 'string' ? 1 : Object.keys(quest_item_list[group_id]).length,
            });
        }
    }

    return res;
}

export function get_quest_item_ids(): Record<string, string[]> {
    let res: Record<string, string[]> = {};
    for (let group_id in quest_item_list) {
        if (typeof quest_item_list[group_id] === 'string') {
            res[group_id] = [group_id];
        } else {
            res[group_id] = [];
            for (let id in quest_item_list[group_id]) {
                res[group_id].push(id);
                res[id] = [id];
            }
        }
    }
    return res;
}

export function gen_quest_item(lang: Lang, path: string) {

    fs.mkdirSync(`${path}`, { recursive: true });
    for (let group_id in quest_item_list) {
        if (typeof quest_item_list[group_id] === 'string') {
            fs.writeFileSync(`${path}/${group_id}.json`, JSON.stringify(get_quest_item(group_id, quest_item_list[group_id], lang), null, 4), 'utf-8');
        } else {
            for (let id in quest_item_list[group_id]) {
                fs.writeFileSync(`${path}/${id}.json`, JSON.stringify(get_quest_item(id, quest_item_list[group_id][id], lang), null, 4), 'utf-8');
            }
        }
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(get_quest_item_list(lang), null, 4), 'utf-8');

}
