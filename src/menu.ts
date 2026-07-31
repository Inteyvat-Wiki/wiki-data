import character_list from "~/data/characters";
import weapon_list from "~/data/weapons";
import artifact_list from "~/data/artifacts";
import { get_character } from "~/character";
import { get_weapon } from "~/weapon";
import { get_artifact } from "~/artifact";
import { Menu } from "~/types/menu";

export function get_menu(): Menu {
    return {
        character: {
            icon: get_character(character_list.at(-1), 'zh_hans').icon,
        },
        weapon: {
            icon: get_weapon(weapon_list.at(-1), 'zh_hans').icon,
        },
        artifact: {
            icon: get_artifact(artifact_list.at(-1), 'zh_hans').icon,
        }
    };
}
