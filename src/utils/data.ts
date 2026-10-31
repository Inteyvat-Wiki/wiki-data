import genshindb, { Language, type ArchiveRecord, type MiscRecord } from 'genshin-db';
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

const alias_query_options = (lang: Lang) => ({
    resultLanguage: language_map[lang] as Language,
    matchAliases: true,
});

// wiki-data uses -0, -1, ... for duplicate names while genshin-db exposes
// the same discriminator as the trailing number in its alias.
const normalize_alias_query = (name: string) =>
    name.replace(/-(\d+)$/, '$1').replace(/_/g, '');

const id_query_options = (lang: Lang) => ({
    resultLanguage: language_map[lang] as Language,
    queryLanguages: [language_map[lang] as Language],
    matchNames: false,
    matchIds: true,
    matchAltNames: false,
    matchAliases: false,
    matchCategories: false,
});

const id_name_cache = new Map<string, string | null>();

type ArchiveFolder = 'serenitea' | 'tcg' | 'miliastra';
function read_catalogue<T>(category: string, query: Function | undefined, lang: Lang): T[] {
    if (lang !== 'zh_hans' && lang !== 'en') throw new Error(`Archive language not configured: ${lang}`);
    if (typeof query !== 'function') throw new Error(`Update genshin-db: ${category} query is not available`);
    const records = query('names', {
        resultLanguage: language_map[lang] as Language,
        queryLanguages: [language_map[lang] as Language],
        matchCategories: true, verboseCategories: true,
        matchNames: false, matchAltNames: false, matchAliases: false,
    });
    if (!Array.isArray(records) || !records.length) {
        throw new Error(`Missing genshin-db data: ${category}/${lang}. Run GenshinData-scripts export and genshin-db makeIndex first.`);
    }
    return records;
}

export const ArchiveData = {
    get_records: (category: ArchiveFolder, lang: Lang): ArchiveRecord[] => {
        const queries = { serenitea: genshindb.serenitea, tcg: genshindb.tcg, miliastra: genshindb.miliastra };
        if (!Object.hasOwn(queries, category)) throw new Error(`Unknown archive category: ${category}`);
        return read_catalogue<ArchiveRecord>(category, queries[category], lang);
    },
};

export const MiscData = {
    get_records: (lang: Lang): MiscRecord[] => read_catalogue<MiscRecord>('misc', genshindb.misc, lang),
};

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
    let res = genshindb.hyperlinks('hyperlinks', alias_query_options(lang));
    if (!res) throw new Error(`Hyperlinks not found in genshindb`);
    return res;
}

export const CharacterData = {

    get_character: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = normalize_alias_query(name);
        let res = genshindb.characters(name, alias_query_options(lang));
        if (!res) throw new Error(`Character ${name} not found in genshindb`);
        return res;
    },

    get_talents: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        else name = normalize_alias_query(name);
        let res = genshindb.talents(name, alias_query_options(lang));
        if (!res) throw new Error(`Talents of character ${name} not found in genshindb`);
        return res;
    },

    get_constellations: (name: string, lang: Lang) => {
        if (name.startsWith('aether') || name.startsWith('lumine')) name = 'traveler' + name.slice(name.indexOf('_') + 1);
        else name = normalize_alias_query(name);
        let res = genshindb.constellations(name, alias_query_options(lang));
        if (!res) throw new Error(`Constellations of character ${name} not found in genshindb`);
        return res;
    },

    get_stories: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = normalize_alias_query(name);
        let res = genshindb.stories(name, alias_query_options(lang));
        if (!res) throw new Error(`Stories of character ${name} not found in genshindb`);
        return res;
    },

    get_voiceovers: (name: string, lang: Lang) => {
        if (name.startsWith('aether')) name = 'aether';
        else if (name.startsWith('lumine')) name = 'lumine';
        else name = normalize_alias_query(name);
        let res = genshindb.voiceovers(name, alias_query_options(lang));
        if (!res) throw new Error(`Voiceovers of character ${name} not found in genshindb`);
        return res;
    },
}

export const WeaponData = {

    get_weapon: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.weapons(name, alias_query_options(lang));
        if (!res) throw new Error(`Weapon ${name} not found in genshindb`);
        return res;
    },

    get_material: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.materials(name, alias_query_options(lang));
        if (!res) throw new Error(`Material ${name} not found in genshindb`);
        return res;
    },
}

export const ArtifactData = {

    get_artifact: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.artifacts(name, alias_query_options(lang));
        if (!res) throw new Error(`Artifact ${name} not found in genshindb`);
        return res;
    },
}

export const MaterialData = {

    get_material: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.materials(name, alias_query_options(lang));
        if (!res) throw new Error(`Material ${name} not found in genshindb`);
        return res;
    },

    get_food: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.foods(name, alias_query_options(lang));
        if (!res) throw new Error(`Food ${name} not found in genshindb`);
        return res;
    }
}

export const LivingBeingData = {

    get_enemy: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.enemies(name, alias_query_options(lang));
        if (!res) throw new Error(`Enemy ${name} not found in genshindb`);
        return res;
    },

    get_animal: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.animals(name, alias_query_options(lang));
        if (!res) throw new Error(`Animal ${name} not found in genshindb`);
        return res;
    },
}

export const GeographyData = {

    get_geography: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.geographies(name, alias_query_options(lang));
        if (!res) throw new Error(`Geography ${name} not found in genshindb`);
        return res;
    },

    get_dungeon: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.dungeons(name, alias_query_options(lang));
        if (!res) throw new Error(`Dungeon ${name} not found in genshindb`);
        return res;
    },
}

export const MapData = {

    get_maplayer: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.maplayers(name, alias_query_options(lang));
        if (!res) throw new Error(`Map layer ${name} not found in genshindb`);
        return res;
    },
}

export const BookData = {
    get_book: (name: string, lang: Lang) => {
        const res = genshindb.books(name, {
            ...alias_query_options(lang),
            matchNames: false,
            matchAltNames: false,
        });
        if (!res || !res.alias.includes(name)) throw new Error(`Book ${name} not found in genshindb`);
        return res;
    },
}

export const DocumentData = {
    get_document: (name: string, lang: Lang) => {
        const res = genshindb.documents(name, {
            ...alias_query_options(lang),
            matchNames: false,
            matchAltNames: false,
        });
        if (!res || res.alias !== name) throw new Error(`Document ${name} not found in genshindb`);
        return res;
    },
}

export const ChapterData = {

    get_chapter: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.chapters(name, alias_query_options(lang));
        if (!res) throw new Error(`Chapter ${name} not found in genshindb`);
        return res;
    },
}

export const TaskData = {

    get_task: (name: string, lang: Lang) => {
        let res = genshindb.tasks(name, alias_query_options(lang));
        if (!res) throw new Error(`Task ${name} not found in genshindb`);
        return res;
    },
}

export const QuestItemData = {
    find_quest_item: (id: number, lang: Lang) => {
        const item = genshindb.questitems(String(id), id_query_options(lang));
        return item?.id === id ? item : undefined;
    },
    
    get_quest_item: (name: string, lang: Lang) => {
        name = normalize_alias_query(name);
        let res = genshindb.questitems(name, alias_query_options(lang));
        if (!res) throw new Error(`Quest item ${name} not found in genshindb`);
        return res;
    }
}

export const NpcData = {

    get_npcs: (lang: Lang) => genshindb.npcs('names', {
        ...alias_query_options(lang), matchCategories: true, verboseCategories: true,
    }) || [],

    get_npc: (name: string, lang: Lang) => {
        const result = genshindb.npcs(name, alias_query_options(lang));
        if (!result) throw new Error(`NPC ${name} not found in genshindb`);
        return result;
    },
}

export const InteractionData = {

    get_giving: (id: number): { items: { id: number, count: number }[], choices?: { id: number }[], count?: number, remove: boolean } | undefined => {
        const manifest = require('genshin-db/src/data/interactions.json');
        return manifest.givings?.[id];
    },

    // perform_cfg 是 interaction 的源路径，直接读取原始资源；找不到时再按对话 id 查找。
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
    const result = getdata ? getdata.getData('English', 'interactions', name) : null;
    interaction_cache.set(name, result);
    return result;
}
