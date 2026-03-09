import fs from 'fs';
import { cp } from 'fs/promises';

import { lang_list } from "~/utils/i18n";
import character_list from "~/data/characters.json";
import { get_character } from "~/character";
import { get_character_list } from '~/character_list';

function main() {

    fs.mkdirSync('./data', { recursive: true });
    fs.mkdirSync('./data/images', { recursive: true });
    fs.writeFileSync('./data/characters.json', JSON.stringify(character_list, null, 4), 'utf-8');

    for (let lang of lang_list) {
        fs.mkdirSync(`./data/${lang}/character`, { recursive: true });

        for (let character_name of character_list) {
            fs.writeFileSync(`./data/${lang}/character/${character_name}.json`, JSON.stringify(get_character(character_name, lang), null, 4), 'utf-8');
        }

        fs.writeFileSync(`./data/${lang}/character/list.json`, JSON.stringify(get_character_list(lang), null, 4), 'utf-8');
    }

    cp('./assets', './data', { recursive: true, force: true });
}

main();