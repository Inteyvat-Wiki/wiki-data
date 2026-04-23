import fs from 'fs';
import path from 'path';

import { Character, Weapon, Material } from 'genshin-db';

import { ElementType, WeaponType, MaterialType } from '~/types/common';

const image_path = (() => {
    const res: Record<string, string> = {};

    const files = fs.readdirSync('./src/images', { recursive: true }) as string[];
    for (let file of files) {
        if (file.endsWith('.png')) {
            const name = path.parse(file).name;
            if (res[name]) {
                if (fs.statSync(`./src/images/${file}`).size > fs.statSync(`./src/images/${res[name]}`).size) {
                    res[name] = file;
                }
            } else {
                res[name] = file;
            }
        }
    }

    return res;
})();

export const ConvertRaw = {

    get_images_url: (filename: string | undefined, converted_path: string) => {
        if (!converted_path.endsWith('.png')) converted_path += '.png';
        if (filename) {
            try {
                fs.mkdirSync(path.dirname(`./data/images/${converted_path}`), { recursive: true });
                fs.copyFileSync(`./src/images/${image_path[filename]}`, `./data/images/${converted_path}`);
            } catch (err) {
                console.error(`Failed to copy image ${filename}`);
            }
        } else {
            console.warn(`Image ${converted_path} not found`);
        }
        return '/images/' + converted_path;
    },

    get_element: (element: Character['elementType']): ElementType | null => {

        const element_map: Record<string, ElementType> = {
            'ELEMENT_ANEMO': 'anemo',
            'ELEMENT_CRYO': 'cryo',
            'ELEMENT_DENDRO': 'dendro',
            'ELEMENT_ELECTRO': 'electro',
            'ELEMENT_GEO': 'geo',
            'ELEMENT_HYDRO': 'hydro',
            'ELEMENT_PYRO': 'pyro',
        }

        return element_map[element];
    },

    get_weapon_type: (weapon: Weapon['weaponType']): WeaponType => {

        const weapon_map: Record<string, WeaponType> = {
            'WEAPON_BOW': 'bow',
            'WEAPON_CATALYST': 'catalyst',
            'WEAPON_CLAYMORE': 'claymore',
            'WEAPON_POLE': 'polearm',
            'WEAPON_SWORD_ONE_HAND': 'sword',
        }

        return weapon_map[weapon];
    },

    is_precent_stat_type: (stat: Character['substatType']) => {
        if ([
            'FIGHT_PROP_ATTACK_PERCENT',
            'FIGHT_PROP_CHARGE_EFFICIENCY',
            'FIGHT_PROP_CRITICAL',
            'FIGHT_PROP_CRITICAL_HURT',
            'FIGHT_PROP_DEFENSE_PERCENT',
            'FIGHT_PROP_ELEC_ADD_HURT',
            // 'FIGHT_PROP_ELEMENT_MASTERY',
            'FIGHT_PROP_FIRE_ADD_HURT',
            'FIGHT_PROP_GRASS_ADD_HURT',
            'FIGHT_PROP_HEAL_ADD',
            'FIGHT_PROP_HP_PERCENT',
            'FIGHT_PROP_ICE_ADD_HURT',
            'FIGHT_PROP_PHYSICAL_ADD_HURT',
            'FIGHT_PROP_ROCK_ADD_HURT',
            'FIGHT_PROP_WATER_ADD_HURT',
            'FIGHT_PROP_WIND_ADD_HURT'
        ].includes(stat)) {
            return true;
        }
        return false;
    },
}
