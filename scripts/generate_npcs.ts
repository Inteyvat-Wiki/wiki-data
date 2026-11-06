import { gen_npc } from '../src/npc';
import type { Lang } from '../src/utils/i18n';
import path from 'node:path';
import { set_output_root, get_output_root } from '../src/utils/output';
import { write_image_requests } from '../src/utils/images';

const output = path.resolve(process.argv[2] || get_output_root());
set_output_root(output);

for (const lang of ['zh_hans', 'en'] as Lang[]) {
    gen_npc(lang, path.join(output, lang, 'npc'));
}
write_image_requests();
