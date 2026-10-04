import { create_page, export_category, typed_entries } from '~/utils/page';
import type { Animal, Enemy } from 'genshin-db';

import { LivingBeingData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { LivingBeing, LivingBeingPages } from "~/types/living_being";
import living_being_list from "~/data/living_beings";

const living_being_types: Record<Animal['categoryType'] | Enemy['categoryType'], LivingBeing['type']> = {
    CODEX_SUBTYPE_ELEMENTAL: 'enemy_elemental',
    CODEX_SUBTYPE_HILICHURL: 'enemy_hilichurl',
    CODEX_SUBTYPE_ABYSS: 'enemy_abyss',
    CODEX_SUBTYPE_FATUI: 'enemy_fatui',
    CODEX_SUBTYPE_AUTOMATRON: 'enemy_automaton',
    CODEX_SUBTYPE_HUMAN: 'enemy_human',
    CODEX_SUBTYPE_BEAST: 'enemy_others',
    CODEX_SUBTYPE_BOSS: 'enemy_boss',
    SUBTYPE_AVIARY: 'animal_bird',
    SUBTYPE_ANIMAL: 'animal_beast',
    SUBTYPE_FISH: 'animal_fish',
    SUBTYPE_CRITTER: 'animal_others',
};

export function get_living_being(name: string, lang: Lang, kind: string): LivingBeing {
    const living_being_data = (() => {
        if (kind === 'enemy') {
            return LivingBeingData.get_enemy(name, lang);
        } else if (kind === 'animal') {
            return LivingBeingData.get_animal(name, lang);
        }
        throw new Error(`Unknown living-being kind: ${kind}`);
    })();

    const type = living_being_types[living_being_data.categoryType];
    if (!type) {
        throw new Error(`Missing or unsupported source category for living being ${name}: ${living_being_data.categoryType}`);
    }

    const res: LivingBeing = {
        name: living_being_data.name,
        icon: ConvertRaw.get_images_url(living_being_data.images.filename_icon, `living_being/${name}/${name}_icon`),
        star: null,
        type,
        info: [
            {
                title: t('living-being.type', lang),
                description: living_being_data.categoryText,
                type: 'description' as const,
            },
            ...(
                'investigation' in living_being_data && living_being_data.investigation
                    ? [{
                        title: t('living-being.description', lang),
                        description: living_being_data.investigation.description,
                        type: 'description' as const,
                    }]
                    : []
            ),
            {
                title: null,
                description: living_being_data.description,
                type: 'text' as const,
            },
        ],
    };

    return res;
}

const page_entries = typed_entries(living_being_list);
const object_entries = page_entries.filter(entry => entry.items.length === 1 && entry.id === entry.items[0]);

export function get_living_being_list(lang: Lang): LivingBeingPages {
    return page_entries.map(entry => {
        const id = entry.items.at(-1)!;
        const data = get_living_being(id, lang, entry.type!);
        return create_page({
            id: entry.id, name: data.name, icon: data.icon, star: data.star, type: data.type,
        }, entry);
    });
}

export function gen_living_being(lang: Lang, path: string) {
    export_category(path, get_living_being_list(lang), object_entries.map(entry => {
        const data = get_living_being(entry.id, lang, entry.type!);
        return { id: entry.id, data };
    }));
}
