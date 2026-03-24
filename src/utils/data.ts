import genshindb, { Language } from 'genshin-db';
import { Lang } from '~/utils/i18n';

const language_map: Record<Lang, string> = {
    'zh_cn': 'CHS',
    'en': 'EN',
}

export function get_hyperlinks(lang: Lang) {
    return genshindb.hyperlinks('hyperlinks', {resultLanguage: language_map[lang] as Language, matchAliases: true});
}

export const CharacterData = {

    get_character: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = name.replace(/_/g, '');
        return genshindb.characters(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },

    get_talents: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        else name = name.replace(/_/g, '');
        return genshindb.talents(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },

    get_constellations: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        else name = name.replace(/_/g, '');
        return genshindb.constellations(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },

    get_stories: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = name.replace(/_/g, '');
        return genshindb.stories(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },

    get_voiceovers: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = name.replace(/_/g, '');
        return genshindb.voiceovers(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },
}

export const WeaponData = {

    get_weapon: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.weapons(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },

    get_material: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.materials(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },
}

export const ArtifactData = {

    get_artifact: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.artifacts(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },
}

export const MaterialData = {

    get_material: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.materials(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },

    get_food: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.foods(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    }
}

export const LivingBeingData = {

    get_enemy: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.enemies(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },

    get_animal: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.animals(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },
}

export const GeographyData = {

    get_geography: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.geographies(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },

    get_dungeon: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        return genshindb.dungeons(name, {resultLanguage: language_map[lang] as Language, matchAliases: true});
    },
}