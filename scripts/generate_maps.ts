import path from 'node:path';
import { initialize_genshin } from '../src/utils/genshin';
import { gen_map_catalogue } from '../src/map_catalogue';
import { gen_map_scenes } from '../src/map_scenes';
import { set_output_root } from '../src/utils/output';
import { gen_map_task_dependencies } from '../src/map_task_dependencies';

async function main() {
    const output = path.resolve(process.argv.find((value, index) => index > 1 && !value.startsWith('--')) || process.env.WIKI_DATA_OUTPUT || './data');
    for (const argument of process.argv.slice(2).filter(value => value.startsWith('--'))) {
        if (argument !== '--catalogue-only') throw new Error(`Unknown map export option: ${argument}`);
    }
    await initialize_genshin({ folders: ['maps', 'dungeons', 'tasks'] });
    set_output_root(output);
    gen_map_task_dependencies(output);
    for (const lang of ['zh_hans', 'en'] as const) {
        const directory = path.join(output, lang, 'map');
        gen_map_catalogue(lang, directory);
        if (!process.argv.includes('--catalogue-only')) gen_map_scenes(lang, directory);
    }
    console.log(`Map records exported to ${output}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
