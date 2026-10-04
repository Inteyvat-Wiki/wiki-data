import fs from 'fs';
import { cp } from 'fs/promises';

import { Lang } from "~/utils/i18n";
import { ConvertRaw } from "~/utils/convert_raw";

import character_list from "~/data/characters";
import weapon_list from "~/data/weapons";
import artifact_list from "~/data/artifacts";
import material_list from "~/data/materials";
import living_being_list from "~/data/living_beings";
import geography_list from "~/data/geographies";
import book_list from "~/data/books";
import readable_list from "~/data/readables";

import { gen_character } from "~/character";
import { gen_weapon } from "~/weapon";
import { gen_artifact } from "~/artifact";
import { gen_material } from "~/material";
import { gen_living_being } from "~/living_being";
import { gen_geography } from "~/geography";
import { gen_book } from "~/book";
import { gen_readable } from "~/readable";
import { gen_map, get_maps } from '~/map';
import { gen_chapter_group, get_chapter_group_ids } from "~/chapter_groups";
import { gen_task, get_task_ids } from "~/task";
import { gen_quest_item, get_quest_item_ids } from "~/quest_item";
import { get_menu } from '~/menu';

const languages: Lang[] = ['zh_hans', 'en'];

function main() {
    fs.mkdirSync('./data', { recursive: true });
    fs.mkdirSync('./data/images', { recursive: true });
    fs.writeFileSync('./data/characters.json', JSON.stringify(character_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/weapons.json', JSON.stringify(weapon_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/artifacts.json', JSON.stringify(artifact_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/materials.json', JSON.stringify(material_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/living_beings.json', JSON.stringify(living_being_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/geographies.json', JSON.stringify(geography_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/books.json', JSON.stringify(book_list, null, 4), 'utf-8');
    fs.writeFileSync('./data/readables.json', JSON.stringify(Object.keys(readable_list), null, 4), 'utf-8');
    fs.writeFileSync('./data/maps.json', JSON.stringify(get_maps(), null, 4), 'utf-8');

    fs.writeFileSync('./data/chapter_groups.json', JSON.stringify(get_chapter_group_ids(), null, 4), 'utf-8');
    fs.writeFileSync('./data/tasks.json', JSON.stringify(get_task_ids(), null, 4), 'utf-8');
    fs.writeFileSync('./data/quest_items.json', JSON.stringify(get_quest_item_ids(), null, 4), 'utf-8');

    for (const lang of languages) {
        gen_character(lang, `./data/${lang}/character`);
        gen_weapon(lang, `./data/${lang}/weapon`);
        gen_artifact(lang, `./data/${lang}/artifact`);
        gen_material(lang, `./data/${lang}/material`);
        gen_living_being(lang, `./data/${lang}/living_being`);
        gen_geography(lang, `./data/${lang}/geography`);
        gen_book(lang, `./data/${lang}/book`);
        gen_readable(lang, `./data/${lang}/readable`);
        gen_map(lang, `./data/${lang}/map`);
        gen_chapter_group(lang, `./data/${lang}/chapter_group`);
        gen_task(lang, `./data/${lang}/task`);
        gen_quest_item(lang, `./data/${lang}/quest_item`);
    }

    fs.writeFileSync('./data/menu.json', JSON.stringify(get_menu(), null, 4), 'utf-8');

    cp('./assets', './data', { recursive: true, force: true });

    console.log(ConvertRaw.get_failed_images_list().join('|'));
}

main();
