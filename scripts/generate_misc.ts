import path from 'node:path';
import { gen_misc } from '../src/misc';

const output = path.resolve(process.argv[2] || './data');
for (const lang of ['zh_hans', 'en'] as const) gen_misc(lang, path.join(output, lang, 'misc'));
console.log(`Misc catalogues exported to ${output}`);
