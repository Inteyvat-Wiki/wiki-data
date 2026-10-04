import { create_page, export_category, typed_entries } from '~/utils/page';

import { LivingBeingData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { LivingBeing, LivingBeingPages } from "~/types/living_being";
import living_being_list from "~/data/living_beings";

export function get_living_being(name: string, lang: Lang, type: string): LivingBeing | null {
    const living_being_data = (() => {
        if (type.startsWith("enemy")) {
            return LivingBeingData.get_enemy(name, lang);
        } else if (type.startsWith("animal")) {
            return LivingBeingData.get_animal(name, lang);
        }
        throw new Error(`Unknown living-being type: ${type}`);
    })();

    const res: LivingBeing = {
        name: living_being_data.name,
        icon: ConvertRaw.get_images_url(living_being_data.images.filename_icon, `living_being/${name}/${name}_icon`),
        star: null,
        type: type as LivingBeing['type'],
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
        if (!data) throw new Error(`Living being not found: ${id}`);
        return create_page({
            id: entry.id, name: data.name, icon: data.icon, star: data.star, type: data.type,
        }, entry);
    });
}

export function gen_living_being(lang: Lang, path: string) {
    export_category(path, get_living_being_list(lang), object_entries.map(entry => {
        const data = get_living_being(entry.id, lang, entry.type!);
        if (!data) throw new Error(`Living being not found: ${entry.id}`);
        return { id: entry.id, data };
    }));
}
