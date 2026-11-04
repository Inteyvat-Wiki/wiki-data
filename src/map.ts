import type { Lang } from './utils/i18n';
import { gen_map_catalogue } from './map_catalogue';
import { gen_map_scenes } from './map_scenes';

/** The full export and the standalone map export use the same native pipeline. */
export function gen_map(lang: Lang, directory: string) {
    if (lang !== 'zh_hans' && lang !== 'en') throw new Error(`Unsupported map scene language: ${lang}`);
    gen_map_catalogue(lang, directory);
    gen_map_scenes(lang, directory);
}
