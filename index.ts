import fs from 'fs';
import { cp } from 'fs/promises';

import { Lang } from "~/utils/i18n";
import { ConvertRaw } from "~/utils/convert_raw";
import { gen_character } from "~/character";
import { gen_weapon } from "~/weapon";
import { gen_artifact } from "~/artifact";
import { gen_material } from "~/material";
import { gen_living_being } from "~/living_being";
import { gen_geography } from "~/geography";
import { gen_book } from "~/book";
import { gen_readable } from "~/readable";
import { gen_map, get_maps } from '~/map';
import { gen_chapter_group } from "~/chapter_groups";
import { gen_task } from "~/task";
import { gen_npc } from "~/npc";
import { gen_quest_item } from "~/quest_item";
import { get_menu } from '~/menu';

const languages: Lang[] = ['zh_hans', 'en'];

function main() {
    fs.mkdirSync('./data/common', { recursive: true });
    fs.mkdirSync('./data/images', { recursive: true });
    fs.writeFileSync('./data/common/maps.json', JSON.stringify(get_maps(), null, 4), 'utf-8');

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
        gen_npc(lang, `./data/${lang}/npc`);
        gen_quest_item(lang, `./data/${lang}/quest_item`);
    }

    fs.writeFileSync('./data/common/menu.json', JSON.stringify(get_menu(), null, 4), 'utf-8');

    cp('./assets', './data', { recursive: true, force: true });

    console.log(ConvertRaw.get_failed_images_list().join('|'));
}

main();
