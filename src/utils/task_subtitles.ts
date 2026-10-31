import genshindb, { type TaskSubtitleRecord } from 'genshin-db';
import type { Lang } from './i18n';
import type { TaskBubble, TaskNarration } from '../types/task';

const cache = new Map<Lang, Map<number, TaskSubtitleRecord>>();
function records(lang: Lang) {
    if (!cache.has(lang)) {
        const language = lang === 'zh_hans' ? genshindb.Language.ChineseSimplified
            : lang === 'en' ? genshindb.Language.English : undefined;
        if (!language) throw new Error(`Task subtitle language not configured: ${lang}`);
        const values = genshindb.tasksubtitles('names', { resultLanguage: language, queryLanguages: [language],
            matchCategories: true, verboseCategories: true, matchNames: false, matchAltNames: false }) as TaskSubtitleRecord[] | undefined;
        if (!Array.isArray(values) || !values.length) {
            throw new Error('Missing genshin-db task subtitles. Run GenshinData-scripts export:subtitles and genshin-db makeIndex first.');
        }
        cache.set(lang, new Map(values.map(value => [value.id, value])));
    }
    return cache.get(lang)!;
}

export function get_task_subtitles(quest: number, steps: Map<number, number>, lang: Lang): {
    narrations: Record<string, TaskNarration>; bubbles: Record<string, TaskBubble>;
} {
    const source = records(lang).get(quest);
    if (!source) return { narrations: {}, bubbles: {} };
    const key = (value: string) => value.replace(/^([^:]+):(\d+):/, (prefix, event: string, step: string) => {
        const index = steps.get(Number(step));
        return index === undefined ? prefix : `${event}:${index}:`;
    });
    function remap<T extends { step: number; after?: string }>(values: Record<string, T>) {
        return Object.fromEntries(Object.entries(values).flatMap(([id, value]) => {
            const step = steps.get(value.step);
            if (!step) return [];
            return [[key(id), { ...structuredClone(value), step, ...(value.after ? { after: key(value.after) } : {}) }]];
        }));
    }
    return { narrations: remap(source.narrations), bubbles: remap(source.bubbles) };
}
