import fs from 'fs';
import { cp } from 'fs/promises';

import { lang_list } from "~/utils/i18n";
import { ConvertRaw } from "~/utils/convert_raw";

import character_list from "~/data/characters";
import weapon_list from "~/data/weapons";
import artifact_list from "~/data/artifacts";
import material_list from "~/data/materials";
import living_being_list from "~/data/living_beings";
import geography_list from "~/data/geographies";

import { gen_character } from "~/character";
import { gen_weapon } from "~/weapon";
import { gen_artifact } from "~/artifact";
import { gen_material } from "~/material";
import { gen_living_being } from "~/living_being";
import { gen_geography } from "~/geography";
import { gen_map, get_maps } from '~/map';
import { get_menu } from '~/menu';

function main() {

    fs.mkdirSync('./data', { recursive: true });
    fs.mkdirSync('./data/images', { recursive: true });
    fs.writeFileSync('./data/characters.json', JSON.stringify(character_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/weapons.json', JSON.stringify(weapon_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/artifacts.json', JSON.stringify(artifact_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/materials.json', JSON.stringify(material_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/living_beings.json', JSON.stringify(living_being_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/geographies.json', JSON.stringify(geography_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/maps.json', JSON.stringify(get_maps(), null, 4), 'utf-8');

    for (let lang of lang_list) {

        gen_character(lang, `./data/${lang}/character`);
        gen_weapon(lang, `./data/${lang}/weapon`);
        gen_artifact(lang, `./data/${lang}/artifact`);
        gen_material(lang, `./data/${lang}/material`);
        gen_living_being(lang, `./data/${lang}/living_being`);
        gen_geography(lang, `./data/${lang}/geography`);
        gen_map(lang, `./data/${lang}/map`);
    }

    fs.writeFileSync('./data/menu.json', JSON.stringify(get_menu(), null, 4), 'utf-8');

    cp('./assets', './data', { recursive: true, force: true });

    console.log(ConvertRaw.get_failed_images_list().join('|'));
}

main();