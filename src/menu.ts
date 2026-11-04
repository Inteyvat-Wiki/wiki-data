import character_list from "~/data/characters";
import weapon_list from "~/data/weapons";
import artifact_list from "~/data/artifacts";
import { get_character } from "~/character";
import { get_weapon } from "~/weapon";
import { get_artifact } from "~/artifact";
import { Menu } from "@inteyvat-wiki/wiki-contracts/menu";

function last_entry(entries: readonly string[], category: string): string {
    const entry = entries.at(-1);
    if (entry === undefined) throw new Error(`Empty menu catalogue: ${category}`);
    return entry;
}

export function get_menu(): Menu {
    return {
        character: {
            icon: get_character(last_entry(character_list, 'character'), 'zh_hans').icon,
        },
        weapon: {
            icon: get_weapon(last_entry(weapon_list, 'weapon'), 'zh_hans').icon,
        },
        artifact: {
            icon: get_artifact(last_entry(artifact_list, 'artifact'), 'zh_hans').icon,
        }
    };
}
