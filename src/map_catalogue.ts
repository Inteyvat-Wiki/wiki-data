import fs from 'node:fs';
import path from 'node:path';
import type { MapRecord, Language } from 'genshin-db';
import genshindb from './utils/genshin';
import type { Lang } from './utils/i18n';
import { convert_map_catalogue } from './utils/map_catalogue';
import { GeographyData } from './utils/data';
import geography_list from '~/data/geographies';
import { map_dungeon_pages } from './utils/map_dungeon_links';

export function get_map_catalogue(lang: Lang) {
    if (lang !== 'zh_hans' && lang !== 'en') throw new Error(`Unsupported map catalogue language: ${lang}`);
    const language = (lang === 'zh_hans' ? 'ChineseSimplified' : 'English') as Language;
    const records = genshindb.maps('names', { resultLanguage: language, queryLanguages: [language],
        matchCategories: true, verboseCategories: true, matchNames: false, matchAliases: false, matchAltNames: false });
    if (!Array.isArray(records) || !records.length) throw new Error('Map catalogue is absent from the prepared snapshot');
    const dungeonPages = map_dungeon_pages(geography_list.dungeon.map((id: string) => ({ id, record: GeographyData.get_dungeon(id, lang) })));
    return convert_map_catalogue(records as MapRecord[], lang, dungeonPages);
}

export function gen_map_catalogue(lang: Lang, directory: string) {
    const catalogue = get_map_catalogue(lang); // Validate everything before writing this document.
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'catalogue.json'), JSON.stringify(catalogue, null, 2), 'utf8');
}
