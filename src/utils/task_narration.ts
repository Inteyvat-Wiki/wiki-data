import type { Lang } from './i18n';
import type { TaskNarration } from '../types/task';
import { get_task_subtitles } from './task_subtitles';

export function get_task_narrations(quest: number, steps: Map<number, number>, lang: Lang): Record<string, TaskNarration> {
    return get_task_subtitles(quest, steps, lang).narrations;
}
