import fs from 'fs';
import path from 'path';

export const ConvertRaw = {

    get_images_url: (filename: string | undefined, converted_path: string) => {
        if (!converted_path.endsWith('.png')) converted_path += '.png';
        if (filename) {
            try {
                fs.mkdirSync(path.dirname(`./data/images/${converted_path}`), { recursive: true });
                fs.copyFileSync(`./src/images/${filename}.png`, `./data/images/${converted_path}`);
            } catch (err) {
                console.error(`Failed to copy image ${filename}`);
            }
        } else {
            console.warn(`Image ${converted_path} not found`);
        }
        return '/images/' + converted_path;
    },

    get_element: (element: 'ELEMENT_ANEMO' | 'ELEMENT_CRYO' | 'ELEMENT_DENDRO' | 'ELEMENT_ELECTRO' | 'ELEMENT_GEO' | 'ELEMENT_HYDRO' | 'ELEMENT_NONE' | 'ELEMENT_PYRO') => {

        const element_map: Record<string, string> = {
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


    get_weapon_type: (weapon: 'WEAPON_BOW' | 'WEAPON_CATALYST' | 'WEAPON_CLAYMORE' | 'WEAPON_POLE' | 'WEAPON_SWORD_ONE_HAND') => {

        const weapon_map: Record<string, string> = {
            'WEAPON_BOW': 'bow',
            'WEAPON_CATALYST': 'catalyst',
            'WEAPON_CLAYMORE': 'claymore',
            'WEAPON_POLE': 'polearm',
            'WEAPON_SWORD_ONE_HAND': 'sword',
        }

        return weapon_map[weapon] || '';
    }
}
