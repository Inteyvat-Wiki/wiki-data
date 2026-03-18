import { MaterialData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang } from '~/utils/i18n';
import { Materials } from '~/types/materials';
import material_list from "~/data/materials";

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
                        star: material_data.rarity,
                        count: typeof nameraw === 'string' ? 1 : nameraw.length,
                    });
                }
            }
        }
    }

    return res;
}