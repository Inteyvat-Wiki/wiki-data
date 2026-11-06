import path from 'node:path';
import { gen_misc } from '../src/misc';
import { get_output_root, set_output_root } from '../src/utils/output';
import { write_image_requests } from '../src/utils/images';

const output = path.resolve(process.argv[2] || get_output_root());
set_output_root(output);
for (const lang of ['zh_hans', 'en'] as const) gen_misc(lang, path.join(output, lang, 'misc'));
console.log(`Misc catalogues exported to ${output}`);
write_image_requests();
