import { create_page, export_category } from '~/utils/page';

import { ChapterData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, ta, te } from "~/utils/i18n";
import { get_task_id_map } from "~/task";
import chapter_group_index from "~/data/chapters";
import type {
    ChapterGroup,
    ChapterGroupIndex,
    ChapterGroupPages,
    ChapterGroupType,
} from "~/types/chapter_group";

type ChapterGroupEntry = {
    id: string,
    type: ChapterGroupType,
    chapters: string[],
};

const index = chapter_group_index as ChapterGroupIndex;
const entries: ChapterGroupEntry[] = Object.entries(index).flatMap(([type, groups]) =>
    Object.entries(groups).map(([id, chapters]) => ({
        id,
        type: type as ChapterGroupType,
        chapters,
    })));
// 主线任务（魔神任务）的章节组直接用第一个章节的名字作为组名
const archon_group_ids = new Set(Object.keys(index.archon_quests));

// 从章节名中提取带分隔符前缀/后缀的组名部分，如「第一章 · 迫近的客星」→「迫近的客星」
function trim_chapter_group_name(name: string): string {
    return name
        .replace(/^[\s:：\-–—·・.。]+|[\s:：\-–—·・.。]+$/g, '')
        .trim();
}

function match_chapter_group_name(text: string | undefined, lang: Lang): string | undefined {
    if (!text) return undefined;

    // 不同语言的章节名格式不同，逐个正则尝试，取第一个能匹配出组名的结果
    for (const pattern of ta('ingame.chapter_group_name_regex', lang)) {
        const match = text.match(new RegExp(pattern, 'i'));
        const name = match?.[1] && trim_chapter_group_name(match[1]);
        if (name) return name;
    }
    return undefined;
}

function get_group_name(id: string, chapters: ReturnType<typeof ChapterData.get_chapter>[], lang: Lang): string {
    if (archon_group_ids.has(id)) return chapters[0]?.name ?? id;

    // 优先使用翻译表里的显式译名，其次从章节的 numberName/name 中提取
    const translated_name = te(`ingame.chapter_name.${id}`, lang);
    if (translated_name) return translated_name;

    for (const chapter of chapters) {
        const name = match_chapter_group_name(chapter.numberName, lang);
        if (name) return name;
    }
    for (const chapter of chapters) {
        const name = match_chapter_group_name(chapter.name, lang);
        if (name) return name;
    }
    return chapters[0]?.name ?? id;
}

function get_chapter_group(entry: ChapterGroupEntry, lang: Lang): ChapterGroup {
    const chapters = entry.chapters.map(id => ChapterData.get_chapter(id, lang));
    const task_ids = get_task_id_map();

    return {
        id: entry.id,
        type: entry.type,
        name: get_group_name(entry.id, chapters, lang),
        chapters: chapters.map((chapter, chapter_index) => {
            const id = entry.chapters[chapter_index]!;
            return {
                id,
                name: chapter.name,
                icon: ConvertRaw.get_images_url(
                    chapter.images?.filename_icon,
                    `chapter_group/${entry.id}/${id}_icon`,
                ),
                // 章节内的任务按原始 taskId 映射为任务文件名，映射不到的丢弃
                tasks: chapter.taskIds.flatMap(task_id => {
                    const task = task_ids.get(task_id);
                    return task ? [task] : [];
                }),
            };
        }),
    };
}

function group_page(group: ChapterGroup) {
    return create_page({
        id: group.id,
        name: group.name,
        icon: group.chapters[0]?.icon ?? null,
        type: group.type,
        chapter_count: group.chapters.length,
        task_count: group.chapters.reduce((count, chapter) => count + chapter.tasks.length, 0),
    });
}

export function get_chapter_groups(lang: Lang): ChapterGroupPages {
    return entries.map(entry => group_page(get_chapter_group(entry, lang)));
}

export function gen_chapter_group(lang: Lang, path: string) {
    const objects = entries.map(entry => ({ id: entry.id, data: get_chapter_group(entry, lang) }));
    export_category(path, objects.map(object => group_page(object.data)), objects);
}
