import type { PageDataTrait } from '~/types/common';

export const MISC_TYPES = ['achievement', 'achievement_group', 'namecard', 'profile_picture', 'profile_frame', 'expedition',
    'gallant_path', 'loading_tip', 'tutorial', 'graeae_message'] as const;
export type MiscType = typeof MISC_TYPES[number];

/** All miscellaneous catalogues use the same document shape. */
export interface MiscItem {
    name: string;
    type: MiscType;
    description: string;
    sections: { title?: string; kind?: string; text: string }[];
    tutorial_category?: string;
    message_thread?: { initial: string[]; nodes: { id: string; kind: string; text: string; preview?: string;
        speaker?: string; next: string[]; requires?: string; location?: string; image?: { name: string; kind?: string; url: string | null } }[] };
    loading_situations?: { id: string; action: string; areas?: { id: string; name: string }[]; terrain?: string;
        scene_ids?: string[]; dungeon_type?: string; dungeons?: { id: string; name: string }[];
        image?: { name: string; url: string | null; kind?: string } }[];
    images: { name: string; url: string | null; kind?: string }[];
    relations: { category: string; id: string; name: string; role: string }[];
    source: { table: string; id: string; hashes: string[]; references?: string[] };
    diagnostics?: string[];
}
export interface MiscPage extends PageDataTrait { type: MiscType; description: string; source_id?: string; tutorial_category?: string }
export type MiscExport = { files: { id: string; data: MiscItem }[]; list: MiscPage[] };
