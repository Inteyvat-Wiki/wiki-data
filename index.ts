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
import { gen_map } from '~/map';
import { gen_map_task_dependencies } from '~/map_task_dependencies';
import { gen_chapter_group } from "~/chapter_groups";
import { gen_task } from "~/task";
import { gen_npc } from "~/npc";
import { gen_quest_item } from "~/quest_item";
import { get_menu } from '~/menu';
import { gen_serenitea } from '~/serenitea';
import { gen_tcg } from '~/tcg';
import { gen_miliastra } from '~/miliastra';
import { gen_misc } from '~/misc';
import { gen_outfit } from '~/outfit';
import path from 'node:path';
import { initialize_genshin } from '~/utils/genshin';
import { set_output_root, get_output_root } from '~/utils/output';

const languages: Lang[] = ['zh_hans', 'en'];

async function main() {
    await initialize_genshin();
    const output = path.resolve(process.argv[2] || get_output_root());
    set_output_root(output);
    fs.mkdirSync(path.join(output, 'common'), { recursive: true });
    fs.mkdirSync(path.join(output, 'images'), { recursive: true });
    gen_map_task_dependencies(output);

    for (const lang of languages) {
        const directory = (category: string) => path.join(output, lang, category);
        gen_character(lang, directory('character'));
        gen_outfit(lang, directory('outfit'));
        gen_weapon(lang, directory('weapon'));
        gen_artifact(lang, directory('artifact'));
        gen_material(lang, directory('material'));
        gen_living_being(lang, directory('living_being'));
        gen_geography(lang, directory('geography'));
        gen_book(lang, directory('book'));
        gen_readable(lang, directory('readable'));
        gen_map(lang, directory('map'));
        gen_chapter_group(lang, directory('chapter_group'));
        gen_task(lang, directory('task'));
        gen_npc(lang, directory('npc'));
        gen_quest_item(lang, directory('quest_item'));
        gen_serenitea(lang, directory('serenitea'));
        gen_tcg(lang, directory('tcg'));
        gen_miliastra(lang, directory('miliastra'));
        gen_misc(lang, directory('misc'));
    }

    fs.writeFileSync(path.join(output, 'common/menu.json'), JSON.stringify(get_menu(), null, 4), 'utf-8');

    await cp('./assets', output, { recursive: true, force: true });

    console.log(ConvertRaw.get_failed_images_list().join('|'));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
