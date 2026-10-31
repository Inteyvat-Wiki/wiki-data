import path from 'node:path';
import { gen_serenitea } from '../src/serenitea';
import { gen_tcg } from '../src/tcg';
import { gen_miliastra } from '../src/miliastra';

const output = path.resolve(process.argv[2] || './data');
const generators = { serenitea: gen_serenitea, tcg: gen_tcg, miliastra: gen_miliastra };
const categories = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(generators);
for (const category of categories) {
    if (!Object.hasOwn(generators, category)) throw new Error(`Unknown archive category: ${category}`);
    for (const lang of ['zh_hans', 'en'] as const) {
        generators[category as keyof typeof generators](lang, path.join(output, lang, category));
    }
    console.log(`${category} exported to ${output}`);
}
