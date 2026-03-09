import genshindb, { Language } from 'genshin-db';
import { Lang } from '~/utils/i18n';

const language_map: Record<Lang, string> = {
    'zh_cn': 'CHS',
    'en': 'EN',
}

export function get_character_list() {
    return genshindb.characters('names', {matchCategories: true});
}

export function get_hyperlinks(lang: Lang) {
    return genshindb.hyperlinks('hyperlinks', {resultLanguage: language_map[lang] as Language});
}

export const CharacterData = {

    get_character: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = name.replace(/_/g, '');
        return genshindb.characters(name, {resultLanguage: language_map[lang] as Language});
    },

    get_talents: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        else name = name.replace(/_/g, '');
        return genshindb.talents(name, {resultLanguage: language_map[lang] as Language});
    },

    get_constellations: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        else name = name.replace(/_/g, '');
        return genshindb.constellations(name, {resultLanguage: language_map[lang] as Language});
    },

    get_stories: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = name.replace(/_/g, '');
        return genshindb.stories(name, {resultLanguage: language_map[lang] as Language});
    },

    get_voiceovers: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = name.replace(/_/g, '');
        return genshindb.voiceovers(name, {resultLanguage: language_map[lang] as Language});
    },
}

export const WeaponData = {

    get_weapon: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.weapons(name, {resultLanguage: language_map[lang] as Language});
    },
}