import fs from 'fs';

import { MaterialData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { Material, Materials } from "~/types/material";
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

        const res: Material = [];

        if (food_data.foodtype == 'NORMAL') {
            for (let key of ['suspicious', 'normal', 'delicious'] as const) {
                if (!food_data || !food_data[key]) continue;
                res.push({
                    name: food_data.name,
                    icon: ConvertRaw.get_images_url(food_data.images.filename_icon, `material/${name}/${name}_icon`),
                    star: food_data.rarity,
                    type: type as Material[0]['type'],
                    info: [
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
                        }
                    ],
                });
            }
        } else {
            res.push({
                name: food_data.name,
                icon: ConvertRaw.get_images_url(food_data.images.filename_icon, `material/${name}/${name}_icon`),
                star: food_data.rarity,
                type: type as Material[0]['type'],
                info: [
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
                    }
                ],
            });
        }

        return res;
    } else {
        const material_data = MaterialData.get_material(name, lang);

        if (!material_data) {
            console.error(`Material not found: ${name}`);
            return null;
        }

        const res: Material = [{
            name: material_data.name,
            icon: ConvertRaw.get_images_url(material_data.images.filename_icon, `material/${name}/${name}_icon`),
            star: material_data.rarity!,
            type: type as Material[0]['type'],
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
        }];

        return res;
    }
}

export function get_material_list(lang: Lang): Materials {
    const res: Materials = [];

    for (let type in material_list) {
        for (let nameraw of material_list[type]) {
            const name = typeof nameraw === 'string' ? nameraw : nameraw[nameraw.length - 1];

            if (type == 'food') {
                const food_data = MaterialData.get_food(name, lang);
                if (food_data) {
                    res.push({
                        id: name,
                        name: food_data.name,
                        icon: ConvertRaw.get_images_url(food_data.images.filename_icon, `material/${name}/${name}_icon`),
                        type: type as any,
                        star: food_data.rarity,
                        count: 1,
                    });
                }
            } else {
                const material_data = MaterialData.get_material(name, lang);
                if (material_data) {
                    res.push({
                        id: name,
                        name: material_data.name,
                        icon: ConvertRaw.get_images_url(material_data.images.filename_icon, `material/${name}/${name}_icon`),
                        type: type as any,
                        star: material_data.rarity!,
                        count: typeof nameraw === 'string' ? 1 : nameraw.length,
                    });
                }
            }
        }
    }

    return res;
}

export function gen_material(lang: Lang, path: string) {

    fs.mkdirSync(`${path}`, { recursive: true });
    for (let type in material_list) {
        for (let nameraw of material_list[type]) {
            if (typeof nameraw == "string") {
                fs.writeFileSync(`${path}/${nameraw}.json`, JSON.stringify(get_material(nameraw, lang, type), null, 4), 'utf-8');
            } else {
                for (let name of nameraw) {
                    fs.writeFileSync(`${path}/${name}.json`, JSON.stringify(get_material(name, lang, type), null, 4), 'utf-8');
                }
            }
        }
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(get_material_list(lang), null, 4), 'utf-8');

}
