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

export type NpcBirthPoint = {
    scene_id: number,
    id: number,
    position: [number, number, number] | null,
    room_id?: number,
    group_id?: number,
    suite_ids?: number[],
    priority?: number,
    raw_conditions?: Record<string, unknown>[][],
    platform?: { group_id: number, config_id: number },
    source: string,
};

export type Npc = {
    name: string,
    title?: string | null,
    npc_id: number,
    birth_points: NpcBirthPoint[],
    entry_talks: number[],
    talks: Record<string, NpcTalk>,
    diagnostics: { type: string, id: number, dialog?: number }[],
};
