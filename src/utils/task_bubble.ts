import type { Lang } from './i18n';
import type { TaskBubble } from '../types/task';
import { get_task_subtitles } from './task_subtitles';

export function get_task_bubbles(quest: number, steps: Map<number, number>, lang: Lang): Record<string, TaskBubble> {
    return get_task_subtitles(quest, steps, lang).bubbles;
}
