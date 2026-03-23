import { MaterialData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { Material } from "~/types/material";
import material_list from "~/data/materials";

const show_full_description: string[] = (() => {
    let res: string[] = [];

    for (let type in material_list) {
        for (let nameraw of material_list[type]) {
            if (typeof nameraw == "string") {
                const material_data = MaterialData.get_material(nameraw, 'zh_cn');
                if (material_data && material_data.fullDescription && !res.includes(type)) {
                    res.push(type);
                }
            } else {
                for (let name of nameraw) {
                    const material_data = MaterialData.get_material(name, 'zh_cn');
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
            for (let key of ['suspicious', 'normal', 'delicious']) {
                if (!food_data[key]) continue;
                res.push({
                    name: food_data.name,
                    icon: ConvertRaw.get_images_url(food_data.images.filename_icon, `material/${name}/${name}_icon`),
                    star: food_data.rarity,
                    type: food_data.filterText,
                    info: [
                        {
                            title: t(`material.description`, lang),
                            description: food_data[key].description,
                        },
                    ],
                    effect: food_data[key].effect,
                    description_full: null,
                });
            }
        } else {
            res.push({
                name: food_data.name,
                icon: ConvertRaw.get_images_url(food_data.images.filename_icon, `material/${name}/${name}_icon`),
                star: food_data.rarity,
                type: food_data.filterText,
                info: [
                    {
                        title: t(`material.base_food`, lang),
                        description: food_data.baseDishName,
                    },
                    {
                        title: t(`material.belong_character`, lang),
                        description: food_data.characterName,
                    },
                    {
                        title: t(`material.description`, lang),
                        description: food_data.description,
                    }
                ],
                effect: food_data.effect,
                description_full: null,
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
            star: material_data.rarity,
            type: material_data.typeText,
            info: [
                {
                    title: t('material.description', lang),
                    description: material_data.description,
                }
            ],
            effect: null,
            description_full: show_full_description.includes(type) && !material_data.fullDescription ? material_data.description : material_data.fullDescription,
        }];

        return res;
    }
}