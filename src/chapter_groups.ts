import fs from 'fs';

import { ChapterData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, ta, te } from "~/utils/i18n";
import { ChapterGroup, ChapterGroups } from "~/types/chapter_group";
import chapter_groups_data from "~/data/chapters";

function get_chapter_group_ids(data: any): Record<string, string[]> {
    const res: Record<string, string[]> = {};

    function dfs(obj: any) {
        for (let key in obj) {
            if (Array.isArray(obj[key])) {
                res[key] = obj[key];
            } else {
                dfs(obj[key]);
            }
        }
    }

    dfs(data);
    return res;
}

function get_archon_quest_group_ids(data: any): Set<string> {
    return new Set(Object.keys(data.archon_quests ?? {}));
}

const archon_quest_group_ids = get_archon_quest_group_ids(chapter_groups_data);

function trim_chapter_group_name(name: string): string {
    return name
        .replace(/^[\s:：\-–—·・.。]+|[\s:：\-–—·・.。]+$/g, '')
        .trim();
}

function match_chapter_group_name(text: string | undefined, lang: Lang): string | undefined {
    if (!text) return undefined;

    for (let regex of ta('ingame.chapter_group_name_regex', lang)) {
        const match = text.match(new RegExp(regex, 'i'));
        if (match?.[1]) {
            const name = trim_chapter_group_name(match[1]);
            if (name) return name;
        }
    }

    return undefined;
}

function get_chapter_group_name(id: string, chapters: ReturnType<typeof ChapterData.get_chapter>[], lang: Lang): string {
    if (archon_quest_group_ids.has(id)) return chapters[0]?.name ?? id;

    const ingame_name = te(`ingame.chapter_name.${id}`, lang);
    if (ingame_name) return ingame_name;

    for (let chapter of chapters) {
        const name = match_chapter_group_name(chapter.numberName, lang);
        if (name) return name;
    }
    for (let chapter of chapters) {
        const name = match_chapter_group_name(chapter.name, lang);
        if (name) return name;
    }

    return chapters[0]?.name ?? id;
}

export function get_chapter_group(id: string, lang: Lang): ChapterGroup {
    const chapter_ids = get_chapter_group_ids(chapter_groups_data)[id];
    if (!chapter_ids) throw new Error(`Chapter group ${id} not found`);

    const raw_chapters = chapter_ids.map(chapter_id => ChapterData.get_chapter(chapter_id, lang));
    return {
        id,
        name: get_chapter_group_name(id, raw_chapters, lang),
        chapters: raw_chapters.map((chapter, index) => ({
            id: chapter_ids[index],
            name: chapter.name,
            icon: ConvertRaw.get_images_url(chapter.images?.filename_icon, `chapter_group/${id}/${chapter_ids[index]}_icon`),
            task_ids: chapter.taskIds,
        })),
    };
}

export function get_chapter_group_list(lang: Lang): ChapterGroups {
    const res: ChapterGroups = [];

    for (let id in get_chapter_group_ids(chapter_groups_data)) {
        const { id: _id, ...group } = get_chapter_group(id, lang);
        res.push(group);
    }

    return res;
}

export function gen_chapter_group(lang: Lang, path: string) {

    fs.mkdirSync(`${path}`, { recursive: true });
    for (let id in get_chapter_group_ids(chapter_groups_data)) {
        fs.writeFileSync(`${path}/${id}.json`, JSON.stringify(get_chapter_group(id, lang), null, 4), 'utf-8');
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(get_chapter_group_list(lang), null, 4), 'utf-8');

}
