import path from 'node:path';
import { gen_outfit } from '../src/outfit';
import { initialize_genshin } from '../src/utils/genshin';
import { get_output_root, set_output_root } from '../src/utils/output';
import { ConvertRaw } from '../src/utils/convert_raw';

async function main() {
    const output = path.resolve(process.argv[2] || get_output_root());
    await initialize_genshin({ folders: ['outfits', 'weaponskins', 'windgliders', 'characters'] });
    set_output_root(output);
    for (const lang of ['zh_hans', 'en'] as const) gen_outfit(lang, path.join(output, lang, 'outfit'));
    console.log(`Outfits exported to ${output}`);
    const missing = ConvertRaw.get_failed_images_list();
    if (missing.length) console.warn(`Missing outfit images: ${missing.join('|')}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
