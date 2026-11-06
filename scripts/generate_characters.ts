import path from 'node:path';
import { gen_character } from '../src/character';
import { initialize_genshin } from '../src/utils/genshin';
import { get_output_root, set_output_root } from '../src/utils/output';
import { ConvertRaw } from '../src/utils/convert_raw';
import { write_image_requests } from '../src/utils/images';

async function main() {
    const output = path.resolve(process.argv[2] || get_output_root());
    await initialize_genshin({ folders: ['characters', 'talents', 'constellations', 'stories', 'voiceovers', 'hyperlinks'] });
    set_output_root(output);
    for (const lang of ['zh_hans', 'en'] as const) {
        gen_character(lang, path.join(output, lang, 'character'));
    }
    console.log(`Characters exported to ${output}`);
    const missing_images = ConvertRaw.get_failed_images_list();
    if (missing_images.length) console.warn(`Missing character images: ${missing_images.join('|')}`);
    write_image_requests();
}

main().catch(error => { console.error(error); process.exitCode = 1; });
