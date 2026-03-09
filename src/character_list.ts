import { CharacterData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang } from '~/utils/i18n';
import { Characters } from './types/characters';
import character_list from "~/data/characters";

export function get_character_list(lang: Lang): Characters {
    const res: Characters = [];

    for (let name of character_list) {
        const character_data = CharacterData.get_character(name, lang);
        if (character_data) {
            res.push({
                id: name,
                name: character_data.name,
                icon: ConvertRaw.get_images_url(character_data.images.filename_icon, `character/${name}/${name}_icon`),
                element: ConvertRaw.get_element(character_data.elementType) || name.slice(name.lastIndexOf('_') + 1) as any,
                weapon: ConvertRaw.get_weapon_type(character_data.weaponType) as any,
                star: character_data.rarity,
            });
        }
    }

    return res;
}