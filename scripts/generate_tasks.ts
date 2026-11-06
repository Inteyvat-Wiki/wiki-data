import path from 'node:path';
import { gen_task } from '../src/task';
import { set_output_root, get_output_root } from '../src/utils/output';
import { write_image_requests } from '../src/utils/images';

const output = path.resolve(process.argv[2] || get_output_root());
set_output_root(output);
for (const lang of ['zh_hans', 'en'] as const) gen_task(lang, path.join(output, lang, 'task'));
console.log(`Task exports written to ${output}`);
write_image_requests();
