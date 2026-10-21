import type { PageDataTrait } from '~/types/common';
import type { TaskTalk } from '~/types/task';

export interface NpcPage extends PageDataTrait {
    talk_count: number;
}

export type NpcPages = NpcPage[];

export type NpcTalk = TaskTalk & {
    source_id: number,
    title: string,
    task: string | null,
    quest_id?: number,
    active_mode: string,
    source: string,
};

export type Npc = {
    name: string,
    npc_id: number,
    entry_talks: number[],
    talks: Record<string, NpcTalk>,
    diagnostics: { type: string, id: number, dialog?: number }[],
};
