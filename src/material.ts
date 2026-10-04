import { create_page, export_category, typed_entries } from '~/utils/page';

import { MaterialData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { Material, MaterialPages } from "~/types/material";
import material_list from "~/data/materials";

const show_full_description: string[] = (() => {
    let res: string[] = [];

    for (let type in material_list) {
        if (type == 'food') continue;
        for (let nameraw of material_list[type]) {
            if (typeof nameraw == "string") {
                const material_data = MaterialData.get_material(nameraw, 'zh_hans');
                if (material_data && material_data.fullDescription && !res.includes(type)) {
                    res.push(type);
                }
            } else {
                for (let name of nameraw) {
                    const material_data = MaterialData.get_material(name, 'zh_hans');
                    if (material_data && material_data.fullDescription && !res.includes(type)) {
                        res.push(type);
                    }
                }
            }
        }
    }

    return res;
})();

export function get_material(name: string, lang: Lang, type: string): Material | null {
    if (type == 'food') {
        const food_data = MaterialData.get_food(name, lang);

        if (!food_data) {
            console.error(`Food not found: ${name}`);
            return null;
        }

        const res: Material = {
            name: food_data.name,
            icon: ConvertRaw.get_images_url(food_data.images.filename_icon, `material/${name}/${name}_icon`),
            star: food_data.rarity,
            type: type as Material['type'],
            info: [],
        };

        if (food_data.foodtype == 'NORMAL') {
            for (let key of ['suspicious', 'normal', 'delicious'] as const) {
                if (!food_data || !food_data[key]) continue;
                res.info.push(
                    {
                        title: t(`material.type`, lang),
                        description: food_data.filterText,
                        type: 'description' as const,
                    },
                    {
                        title: t(`material.description`, lang),
                        description: food_data[key].description,
                        type: 'description' as const,
                    },
                    {
                        title: null,
                        description: food_data[key].effect,
                        type: 'normal' as const,
                    },
                );
            }
        } else {
            res.info.push(
                {
                    title: t(`material.type`, lang),
                    description: food_data.filterText,
                    type: 'description' as const,
                },
                {
                    title: t(`material.base_food`, lang),
                    description: food_data.baseDishName!,
                    type: 'description' as const,
                },
                {
                    title: t(`material.belong_character`, lang),
                    description: food_data.characterName!,
                    type: 'description' as const,
                },
                {
                    title: t(`material.description`, lang),
                    description: food_data.description,
                    type: 'description' as const,
                },
                {
                    title: null,
                    description: food_data.effect,
                    type: 'normal' as const,
                },
            );
        }

        return res;
    } else {
        const material_data = MaterialData.get_material(name, lang);

        if (!material_data) {
            console.error(`Material not found: ${name}`);
            return null;
        }

        const res: Material = {
            name: material_data.name,
            icon: ConvertRaw.get_images_url(material_data.images.filename_icon, `material/${name}/${name}_icon`),
            star: material_data.rarity || null,
            type: type as Material['type'],
            info: [
                {
                    title: t(`material.type`, lang),
                    description: material_data.typeText,
                    type: 'description' as const,
                },
                {
                    title: t('material.description', lang),
                    description: material_data.description,
                    type: 'description' as const,
                },
                ...(show_full_description.includes(type) ? [{
                    title: null,
                    description: !material_data.fullDescription ? material_data.description : material_data.fullDescription,
                    type: 'text' as const,
                }] : []),
            ],
        };

        return res;
    }
}

const page_entries = typed_entries(material_list);
const object_entries = page_entries.filter(entry => entry.items.length === 1 && entry.id === entry.items[0]);

export function get_material_list(lang: Lang): MaterialPages {
    return page_entries.map(entry => {
        const id = entry.items.at(-1)!;
        const data = get_material(id, lang, entry.type!);
        if (!data) throw new Error(`Material not found: ${id}`);
        return create_page({
            id: entry.id, name: data.name, icon: data.icon, star: data.star, type: data.type,
        }, entry);
    });
}

export function gen_material(lang: Lang, path: string) {
    export_category(path, get_material_list(lang), object_entries.map(entry => {
        const data = get_material(entry.id, lang, entry.type!);
        if (!data) throw new Error(`Material not found: ${entry.id}`);
        return { id: entry.id, data };
    }));
}
