import fs from 'node:fs';
import path from 'node:path';
import { CharacterData, MaterialData, NpcData } from '~/utils/data';
import { typed_entries } from '~/utils/page';
import type { Lang } from '~/utils/i18n';
import character_list from '~/data/characters';
import material_list from '~/data/materials';
import npc_list from '~/data/npcs';
import task_list from '~/data/tasks';
import quest_item_list from '~/data/quest_items';
import book_list from '~/data/books';

const source_pages = new Map<string, Map<number, string[]>>();

/** Mirror the maintained export directories, never match translated names. */
export function source_page_ids(category: string): Map<number, string[]> {
    if (source_pages.has(category)) return source_pages.get(category)!;
    const result = new Map<number, string[]>();
    const add = (source_id: number, id: string) => {
        if (!Number.isSafeInteger(source_id) || source_id <= 0) return;
        const ids = result.get(source_id) || [];
        if (!ids.includes(id)) result.set(source_id, [...ids, id]);
    };
    const walk = (value: unknown) => {
        if (!value || typeof value !== 'object') return;
        for (const [id, alias] of Object.entries(value)) {
            if (typeof alias === 'string') {
                const source_id = alias.match(/^(?:Quest|QuestItem|Book)\s+(\d+)$/)?.[1];
                if (source_id) add(Number(source_id), id);
            } else walk(alias);
        }
    };
    if (category === 'task') walk(task_list);
    else if (category === 'quest_item') walk(quest_item_list);
    else if (category === 'book') walk(book_list);
    else if (category === 'npc') {
        for (const [id, alias] of Object.entries(npc_list as Record<string, string>)) add(NpcData.get_npc(alias, 'zh_hans').id, id);
        for (const npc of NpcData.get_npcs('zh_hans')) if (!result.has(npc.id)) add(npc.id, `npc_${npc.id}`);
    } else if (category === 'character') {
        for (const id of character_list) add(CharacterData.get_character(id, 'zh_hans').id, id);
    } else if (category === 'material') {
        for (const entry of typed_entries(material_list)) {
            if (entry.items.length !== 1 || entry.id !== entry.items[0] || entry.type === 'food') continue;
            const record = MaterialData.get_material(entry.id, 'zh_hans');
            if (record) add(record.id, entry.id);
        }
    }
    source_pages.set(category, result);
    return result;
}

/** Publication context belongs to the output being generated, not another data tree. */
export class PageReferences {
    private pages = new Map<string, Map<string, { id: string; name: string }>>();
    constructor(private output: string) {}

    private index(category: string, lang: Lang) {
        if (!/^[a-z][a-z_]*$/.test(category)) return new Map<string, { id: string; name: string }>();
        const key = `${lang}:${category}`;
        if (!this.pages.has(key)) {
            const file = path.join(this.output, lang, category, 'pages.json');
            const pages: { id: string; name: string }[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
            this.pages.set(key, new Map(pages.map(page => [page.id, page])));
        }
        return this.pages.get(key)!;
    }

    has(category: string, id: string, lang: Lang) { return this.index(category, lang).has(id); }

    resolve(category: string, source_id: number, lang: Lang) {
        const pages = this.index(category, lang);
        for (const id of source_page_ids(category).get(source_id) || []) {
            const page = pages.get(id);
            if (page) return { category, id, name: page.name };
        }
        return null;
    }
}
