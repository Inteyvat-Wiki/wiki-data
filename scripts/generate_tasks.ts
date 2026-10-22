import path from 'node:path';
import { gen_task } from '../src/task';

const output = path.resolve(process.argv[2] || './data');
for (const lang of ['zh_hans', 'en'] as const) gen_task(lang, path.join(output, lang, 'task'));
console.log(`Task exports written to ${output}`);
