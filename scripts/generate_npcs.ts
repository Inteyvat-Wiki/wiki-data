import { gen_npc } from '../src/npc';
import type { Lang } from '../src/utils/i18n';

for (const lang of ['zh_hans', 'en'] as Lang[]) {
    gen_npc(lang, `./data/${lang}/npc`);
}
