import { WeaponData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang } from '~/utils/i18n';
import { Weapons } from './types/weapons';
import weapon_list from "~/data/weapons";

export function get_weapon_list(lang: Lang): Weapons {
    const res: Weapons = [];

    for (let name of weapon_list) {
        const weapon_data = WeaponData.get_weapon(name, lang);
        if (weapon_data) {
            res.push({
                id: name,
                name: weapon_data.name,
                icon: ConvertRaw.get_images_url(weapon_data.images.filename_icon, `weapon/${name}/${name}_icon`),
                type: ConvertRaw.get_weapon_type(weapon_data.weaponType) as any,
                star: weapon_data.rarity,
            });
        }
    }

    return res;
}