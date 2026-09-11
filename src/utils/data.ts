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

export const InteractionData = {

    // perform_cfg 是 interaction 的精确源路径。genshin-db 的 interactions() 会对
    // 全部文件名（约 2.4 万条）做模糊搜索，单次 ~100ms，14 万次调用会拖慢导出数十分钟；
    // 这里直接用文件名精确取值（O(1)），失败再退回按对话 id 查找。
    find_interaction: (name: string) =>
        get_interaction_data(name) || null,

    find_interaction_by_dialog_ids: (ids: number[]) => {
        for (const id of ids) {
            const cached = interaction_by_id_cache.get(id);
            if (cached !== undefined) {
                if (cached) return cached;
                continue;
            }
            const result = genshindb.interactions(String(id), {
                matchFilenameOnly: false,
                matchFilenames: false,
                matchIds: true,
                matchNames: false,
                matchAltNames: false,
                matchAliases: false,
                matchCategories: false,
            }) || null;
            interaction_by_id_cache.set(id, result);
            if (result) return result;
        }
        return null;
    },

    get_interaction: (name: string) => {
        const res = InteractionData.find_interaction(name);
        if (!res) throw new Error(`InterAction ${name} not found in genshindb`);
        return res;
    },
}

// 通过 genshin-db 内部的 getdata 模块按文件名精确读取，绕过其模糊搜索
let interaction_getdata: any;

// 同一 interaction 会被多个对话引用（不同对话 id 子集），按名缓存避免重复解析
const interaction_cache = new Map<string, any>();
const interaction_by_id_cache = new Map<number, any | null>();

function get_interaction_getdata() {
    if (interaction_getdata === undefined) {
        try {
            interaction_getdata = require('genshin-db/src/getdata.js');
        } catch {
            interaction_getdata = null;
        }
    }
    return interaction_getdata;
}

function get_interaction_data(name: string): any {
    if (interaction_cache.has(name)) return interaction_cache.get(name);
    const getdata = get_interaction_getdata();
    // 内部模块不可用时退回 genshin-db 公开接口（慢但可用）
    const result = getdata
        ? getdata.getData('English', 'interactions', name)
        : genshindb.interactions(name, { matchFilenameOnly: true });
    interaction_cache.set(name, result);
    return result;
}
