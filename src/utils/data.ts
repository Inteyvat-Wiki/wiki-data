import genshindb, { Language } from 'genshin-db';
import { Lang } from '~/utils/i18n';

const language_map: Record<Lang, string> = {
    'zh_hans': 'CHS',
    'zh_hant': 'CHT',
    'de': 'DE',
    'en': 'EN',
    'es': 'ES',
    'fr': 'FR',
    'id': 'ID',
    'it': 'IT',
    'ja': 'JP',
    'ko': 'KR',
    'pt': 'PT',
    'ru': 'RU',
    'th': 'TH',
    'tr': 'TR',
    'vi': 'VI',
}

const filename_query_options = (lang: Lang) => ({
    resultLanguage: language_map[lang] as Language,
    queryLanguages: [language_map[lang] as Language],
    matchFilenameOnly: true,
});

const id_query_options = (lang: Lang) => ({
    resultLanguage: language_map[lang] as Language,
    queryLanguages: [language_map[lang] as Language],
    matchNames: false,
    matchFilenames: false,
    matchIds: true,
    matchAltNames: false,
    matchAliases: false,
    matchCategories: false,
});

const id_name_cache = new Map<string, string | null>();

export function find_data_name_by_id(id: number, lang: Lang, folder: string): string | null {
    const cache_key = `${lang}:${folder}:${id}`;
    if (id_name_cache.has(cache_key)) return id_name_cache.get(cache_key)!;

    const query = (genshindb as any)[folder];
    const result = typeof query === 'function' ? query(String(id), id_query_options(lang)) : undefined;
    if (result && typeof result.name === 'string' && result.name) {
        id_name_cache.set(cache_key, result.name);
        return result.name;
    }
    id_name_cache.set(cache_key, null);
    return null;
}

export function get_hyperlinks(lang: Lang) {
    let res = genshindb.hyperlinks('hyperlinks', filename_query_options(lang));
    if (!res) throw new Error(`Hyperlinks not found in genshindb`);
    return res;
}

export const CharacterData = {

    get_character: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        let res = genshindb.characters(name, filename_query_options(lang));
        if (!res) throw new Error(`Character ${name} not found in genshindb`);
        return res;
    },

    get_talents: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        let res = genshindb.talents(name, filename_query_options(lang));
        if (!res) throw new Error(`Talents of character ${name} not found in genshindb`);
        return res;
    },

    get_constellations: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        let res = genshindb.constellations(name, filename_query_options(lang));
        if (!res) throw new Error(`Constellations of character ${name} not found in genshindb`);
        return res;
    },

    get_stories: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        let res = genshindb.stories(name, filename_query_options(lang));
        if (!res) throw new Error(`Stories of character ${name} not found in genshindb`);
        return res;
    },

    get_voiceovers: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        let res = genshindb.voiceovers(name, filename_query_options(lang));
        if (!res) throw new Error(`Voiceovers of character ${name} not found in genshindb`);
        return res;
    },
}

export const WeaponData = {

    get_weapon: (name: string, lang: Lang) => {
        let res = genshindb.weapons(name, filename_query_options(lang));
        if (!res) throw new Error(`Weapon ${name} not found in genshindb`);
        return res;
    },

    get_material: (name: string, lang: Lang) => {
        let res = genshindb.materials(name, filename_query_options(lang));
        if (!res) throw new Error(`Material ${name} not found in genshindb`);
        return res;
    },
}

export const ArtifactData = {

    get_artifact: (name: string, lang: Lang) => {
        let res = genshindb.artifacts(name, filename_query_options(lang));
        if (!res) throw new Error(`Artifact ${name} not found in genshindb`);
        return res;
    },
}

export const MaterialData = {

    get_material: (name: string, lang: Lang) => {
        let res = genshindb.materials(name, filename_query_options(lang));
        if (!res) throw new Error(`Material ${name} not found in genshindb`);
        return res;
    },

    get_food: (name: string, lang: Lang) => {
        let res = genshindb.foods(name, filename_query_options(lang));
        if (!res) throw new Error(`Food ${name} not found in genshindb`);
        return res;
    }
}

export const LivingBeingData = {

    get_enemy: (name: string, lang: Lang) => {
        let res = genshindb.enemies(name, filename_query_options(lang));
        if (!res) throw new Error(`Enemy ${name} not found in genshindb`);
        return res;
    },

    get_animal: (name: string, lang: Lang) => {
        let res = genshindb.animals(name, filename_query_options(lang));
        if (!res) throw new Error(`Animal ${name} not found in genshindb`);
        return res;
    },
}

export const GeographyData = {

    get_geography: (name: string, lang: Lang) => {
        let res = genshindb.geographies(name, filename_query_options(lang));
        if (!res) throw new Error(`Geography ${name} not found in genshindb`);
        return res;
    },

    get_dungeon: (name: string, lang: Lang) => {
        let res = genshindb.dungeons(name, filename_query_options(lang));
        if (!res) throw new Error(`Dungeon ${name} not found in genshindb`);
        return res;
    },
}

export const MapData = {

    get_maplayer: (name: string, lang: Lang) => {
        let res = genshindb.maplayers(name, filename_query_options(lang));
        if (!res) throw new Error(`Map layer ${name} not found in genshindb`);
        return res;
    },
}

export const ChapterData = {

    get_chapter: (name: string, lang: Lang) => {
        let res = genshindb.chapters(name, filename_query_options(lang));
        if (!res) throw new Error(`Chapter ${name} not found in genshindb`);
        return res;
    },
}

export const TaskData = {

    get_task: (name: string, lang: Lang) => {
        let res = genshindb.tasks(name, filename_query_options(lang));
        if (!res) throw new Error(`Task ${name} not found in genshindb`);
        return res;
    },
}
