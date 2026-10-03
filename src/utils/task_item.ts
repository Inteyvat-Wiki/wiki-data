import { QuestItemData } from '~/utils/data';
import { ConvertRaw } from '~/utils/convert_raw';
import type { Lang } from '~/utils/i18n';
import type { TaskItemOperation, TaskOperation } from '~/types/task';
import quest_item_index from '~/data/quest_items';

const item_pages = new Map<number, string>();
for (const [key, value] of Object.entries(quest_item_index as Record<string, string | Record<string, string>>)) {
    const entries = typeof value === 'string' ? [[key, value]] : Object.entries(value);
    for (const [page, alias] of entries) {
        const match = /^QuestItem (\d+)$/.exec(alias);
        if (match) item_pages.set(Number(match[1]), page);
    }
}

type ItemInfo = { name?: string, icon?: string, page?: string };
const item_cache = new Map<Lang, Map<number, ItemInfo>>();

function get_item_info(id: number, lang: Lang): ItemInfo {
    let cache = item_cache.get(lang);
    if (!cache) item_cache.set(lang, cache = new Map());
    const cached = cache.get(id);
    if (cached) return cached;
    const data = QuestItemData.find_quest_item(id, lang);
    const page = item_pages.get(id);
    const info: ItemInfo = {
        ...(data?.name ? { name: data.name } : {}),
        ...(page ? { page } : {}),
        ...(data?.images?.filename_icon ? {
            icon: ConvertRaw.get_images_url(data.images.filename_icon, `quest_item/${page || id}/${page || id}_icon`),
        } : {}),
    };
    cache.set(id, info);
    return info;
}

export function get_task_item_operation(operation: TaskItemOperation, lang: Lang): TaskItemOperation {
    return {
        ...operation,
        items: operation.items.map(item => ({ ...item, ...get_item_info(item.id, lang) })),
        ...(operation.choices?.length ? {
            choices: operation.choices.map(item => ({ ...item, ...get_item_info(item.id, lang) })),
        } : {}),
    };
}

export function get_task_operations(operations: TaskOperation[] = [], lang: Lang): TaskOperation[] {
    return operations.map(operation => operation.type === 'item' ? get_task_item_operation(operation, lang) : operation);
}
