import fs from 'fs';
import { cp } from 'fs/promises';

import { lang_list } from "~/utils/i18n";
import character_list from "~/data/characters";
import weapon_list from "~/data/weapons";
import { get_character } from "~/character";
import { get_character_list } from '~/character_list';
import { get_weapon } from "~/weapon";
import { get_weapon_list } from '~/weapon_list';

function main() {

    fs.mkdirSync('./data', { recursive: true });
    fs.mkdirSync('./data/images', { recursive: true });
    fs.writeFileSync('./data/characters.json', JSON.stringify(character_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/weapons.json', JSON.stringify(weapon_list, null, 4), 'utf-8');

    for (let lang of lang_list) {

        fs.mkdirSync(`./data/${lang}/character`, { recursive: true });
        for (let character_name of character_list) {
            fs.writeFileSync(`./data/${lang}/character/${character_name}.json`, JSON.stringify(get_character(character_name, lang), null, 4), 'utf-8');
        }
        fs.writeFileSync(`./data/${lang}/character/list.json`, JSON.stringify(get_character_list(lang), null, 4), 'utf-8');

        fs.mkdirSync(`./data/${lang}/weapon`, { recursive: true });
        for (let weapon_name of weapon_list) {
            fs.writeFileSync(`./data/${lang}/weapon/${weapon_name}.json`, JSON.stringify(get_weapon(weapon_name, lang), null, 4), 'utf-8');
        }
        fs.writeFileSync(`./data/${lang}/weapon/list.json`, JSON.stringify(get_weapon_list(lang), null, 4), 'utf-8');
    }

    cp('./assets', './data', { recursive: true, force: true });
}

main();