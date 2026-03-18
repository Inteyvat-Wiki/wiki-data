import { WeaponData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang } from "~/utils/i18n";
import { Weapon } from "~/types/weapon";
import weapon_refine_material_list from "~/data/weapon_refine_materials";

const weapon_max_acsension = {
    1: 4,
    2: 4,
    3: 6,
    4: 6,
    5: 6,
}
const weapon_ascension_list: { min: number; max: number; step: number }[] = [
    { min: 1, max: 20, step: 1 },
    { min: 20, max: 40, step: 1 },
    { min: 40, max: 50, step: 1 },
    { min: 50, max: 60, step: 1 },
    { min: 60, max: 70, step: 1 },
    { min: 70, max: 80, step: 1 },
    { min: 80, max: 90, step: 1 },
];

export function get_weapon(name: string, lang: Lang): Weapon {
    const weapon_data = WeaponData.get_weapon(name, lang);

    if (!weapon_data) {
        console.error(`Weapon ${name} not found`);
        return null;
    }

    function get_weapon_stats() {
        const base: Record<number, string>[] = [];
        const sub_stat: Record<number, string>[] = [];

        for (let ascension = 0; ascension <= weapon_max_acsension[weapon_data.rarity]; ascension++) {
            const { min, max, step } = weapon_ascension_list[ascension];
            base[ascension] = {};
            sub_stat[ascension] = {};
            for (let level = min; level <= max; level += step) {
                const stat = weapon_data.stats(level, ascension);
                base[ascension][level] = stat.attack.toString();
                sub_stat[ascension][level] = (stat.specialized
                    * (ConvertRaw.is_precent_stat_type(weapon_data.mainStatType) ? 100 : 1)).toString()
                    + (ConvertRaw.is_precent_stat_type(weapon_data.mainStatType) ? '%' : '')
            }
        }
        return {
            base: base,
            substats_name: weapon_data.mainStatText,
            substats: sub_stat,
        };
    }

    function get_weapon_effect() {
        if (!weapon_data.effectName) {
            return null;
        }

        const values: string[][] = [];

        for (let key of ['r1', 'r2', 'r3', 'r4', 'r5']) {
            if (!weapon_data[key]) {
                continue;
            }
            values.push(weapon_data[key].values);
        }
        
        return {
            name: weapon_data.effectName,
            description: weapon_data.effectTemplateRaw,
            values: values,
        };
    }

    function get_weapon_refine_material() {
        const material_name = weapon_refine_material_list[name];
        if (!material_name) {
            return null;
        }

        const material_data = WeaponData.get_material(material_name, lang);

        return {
            name: material_data.name,
            icon: ConvertRaw.get_images_url(material_data.images.filename_icon, `weapon/${name}/${material_name}_icon`),
            description: material_data.description,
        };
    }

    const res: Weapon = {
        name: weapon_data.name,
        icon: ConvertRaw.get_images_url(weapon_data.images.filename_icon, `weapon/${name}/${name}_icon`),
        awaken_icon: ConvertRaw.get_images_url(weapon_data.images.filename_awakenIcon, `weapon/${name}/${name}_awaken_icon`),
        type: ConvertRaw.get_weapon_type(weapon_data.weaponType),
        star: weapon_data.rarity,
        stats: get_weapon_stats(),
        effect: get_weapon_effect(),
        description: weapon_data.descriptionRaw,
        story: weapon_data.story,
        refine_material: get_weapon_refine_material(),
    }
    return res;
}