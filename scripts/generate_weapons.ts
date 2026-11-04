import path from 'node:path';
import { gen_weapon } from '../src/weapon';
import { initialize_genshin } from '../src/utils/genshin';
import { get_output_root, set_output_root } from '../src/utils/output';
import { ConvertRaw } from '../src/utils/convert_raw';

async function main() {
    const output = path.resolve(process.argv[2] || get_output_root());
    await initialize_genshin({ folders: ['weapons', 'materials'] });
    set_output_root(output);
    for (const lang of ['zh_hans', 'en'] as const) {
        gen_weapon(lang, path.join(output, lang, 'weapon'));
    }
    console.log(`Weapons exported to ${output}`);
    const missing_images = ConvertRaw.get_failed_images_list();
    if (missing_images.length) console.warn(`Missing weapon images: ${missing_images.join('|')}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
