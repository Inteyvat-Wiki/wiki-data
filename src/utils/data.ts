import genshindb, { Language } from 'genshin-db';
import { Lang } from '~/utils/i18n';

const language_map: Record<Lang, string> = {
    'zh_cn': 'CHS',
    'en': 'EN',
}

export function get_hyperlinks(lang: Lang) {
    let res = genshindb.hyperlinks('hyperlinks', { resultLanguage: language_map[lang] as Language, matchAliases: true });
    if (!res) throw new Error(`Hyperlinks not found in genshindb`);
    return res;
}

export const CharacterData = {

    get_character: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = name.replace(/_/g, '');
        let res = genshindb.characters(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Character ${name} not found in genshindb`);
        return res;
    },

    get_talents: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        else name = name.replace(/_/g, '');
        let res = genshindb.talents(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Talents of character ${name} not found in genshindb`);
        return res;
    },

    get_constellations: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        else name = name.replace(/_/g, '');
        let res = genshindb.constellations(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Constellations of character ${name} not found in genshindb`);
        return res;
    },

    get_stories: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = name.replace(/_/g, '');
        let res = genshindb.stories(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Stories of character ${name} not found in genshindb`);
        return res;
    },

    get_voiceovers: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = name.replace(/_/g, '');
        let res = genshindb.voiceovers(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Voiceovers of character ${name} not found in genshindb`);
        return res;
    },
}

export const WeaponData = {

    get_weapon: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.weapons(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Weapon ${name} not found in genshindb`);
        return res;
    },

    get_material: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.materials(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Material ${name} not found in genshindb`);
        return res;
    },
}

export const ArtifactData = {

    get_artifact: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.artifacts(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Artifact ${name} not found in genshindb`);
        return res;
    },
}

export const MaterialData = {

    get_material: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.materials(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Material ${name} not found in genshindb`);
        return res;
    },

    get_food: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.foods(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Food ${name} not found in genshindb`);
        return res;
    }
}

export const LivingBeingData = {

    get_enemy: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.enemies(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Enemy ${name} not found in genshindb`);
        return res;
    },

    get_animal: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.animals(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Animal ${name} not found in genshindb`);
        return res;
    },
}

export const GeographyData = {

    get_geography: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.geographies(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Geography ${name} not found in genshindb`);
        return res;
    },

    get_dungeon: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.dungeons(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Dungeon ${name} not found in genshindb`);
        return res;
    },
}

export const MapData = {

    get_maplayer: (name: string, lang: Lang) => {
        name = name.replace(/_/g, '');
        let res = genshindb.maplayers(name, { resultLanguage: language_map[lang] as Language, matchAliases: true });
        if (!res) throw new Error(`Map layer ${name} not found in genshindb`);
        return res;
    },
}