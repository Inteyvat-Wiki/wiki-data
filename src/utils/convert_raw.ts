
import { Character, Weapon, Material } from 'genshin-db';

import { ElementType, WeaponType, MaterialType } from '~/types/common';

import { images, prefer_image } from './images';

function get_images_url(filename: string | undefined, converted_path: string): string;
function get_images_url(filename: string | undefined, converted_path: string, options: { output: string; nullable: true }): string | null;
function get_images_url(filename: string | undefined, converted_path: string, options?: { output: string; nullable: true }): string | null {
    const result = images.fromName(filename, converted_path, options?.output);
    return result ?? (options?.nullable ? null : '');
}

// Source and Wiki namespaces are independent. Do not infer new mappings.
function mapped_key(map: Record<string, string>, key: string, category: string): string {
    if (!Object.hasOwn(map, key)) throw new Error(`Unmapped ${category}: ${key}`);
    return map[key]!;
}
const condition_keys: Record<string, string> = {
    QUEST_COND_ACTIVITY_OPEN: 'activity_open',
    QUEST_COND_GCG_INVITE_TYPE: 'gcg_invite_type',
    QUEST_COND_GCG_LEVEL_UNLOCKED: 'gcg_level_unlocked',
    QUEST_COND_GCG_NPC_TYPE: 'gcg_npc_type',
    QUEST_COND_HOMEWORLD_NPC_EVENT: 'homeworld_npc_event',
    QUEST_COND_SCENE_POINT_UNLOCK: 'scene_point_unlock',
};

export const ConvertRaw = {
    get_furniture_role: (key: string): string => mapped_key({
        '': 'entry', NPC: 'character', Paimon: 'character', VirtualFurnitrue: 'virtual', FurnitureSuite: 'suite_placeholder',
        BlockDependent: 'entry', Apartment: 'entry', FarmField: 'entry', TeleportPoint: 'entry', Fishpond: 'entry',
        Fish: 'entry', LavaFish: 'entry', CustomBaseFurnitrue: 'entry', CustomNodeFurnitrue: 'entry', GroupFurnitrue: 'entry',
        CoopPictureFrame: 'entry', ChangeBgmFurniture: 'entry', ServerGadget: 'entry', Fishtank: 'entry', LavaFishpond: 'entry',
    }, key, 'furniture role'),
    get_tutorial_category: (key: string): string => mapped_key({
        CODEX_ELEMENT: 'element', CODEX_ENEMY: 'enemy', CODEX_SYSTEM: 'system', CODEX_ADVENTURE: 'adventure',
        TUTORIAL_ACTIVITY: 'activity', TUTORIAL_OTHER: 'other',
    }, key, 'tutorial category'),
    get_message_kind: (key: string): string => mapped_key({
        TEXT: 'text', CONTROL: 'control', OPTION: 'option', IMAGE: 'image', LOCATION: 'location', HESPERIDES_MAP: 'map',
    }, key, 'Graeae message kind'),
    get_loading_dungeon_type: (key: string): string => mapped_key({
        DUNGEON_CHAR_MASTER: 'character_master', DUNGEON_LEY_LINE_CHALLENGE: 'ley_line_challenge',
        DUNGEON_TPS_MERCENARIES: 'tps_mercenaries', DUNGEON_TPS_SHOOTING_RANGE: 'tps_shooting_range',
    }, key, 'loading dungeon type'),
    get_loading_action: (key: string): string => mapped_key({
        SITUATION_TYPE_COMMON_TRANSPORT: 'transport', SITUATION_TYPE_ENTER_QUEST_DUNGEON: 'quest_dungeon',
        SITUATION_TYPE_ENTER_DAILY_DUNGEON: 'daily_dungeon', SITUATION_TYPE_ENTER_TOWER: 'tower',
        SITUATION_TYPE_ENTER_ROOM: 'room', SITUATION_TYPE_LOGIN: 'login', SITUATION_TYPE_LOGOUT: 'logout',
        SITUATION_TYPE_REVIVE: 'revive', SITUATION_TYPE_ENTER_HOMEWORLD: 'homeworld', SITUATION_TYPE_ENTER_ISLAND: 'island',
        SITUATION_TYPE_ENTER_GCG_NORMAL: 'gcg_normal', SITUATION_TYPE_ENTER_GCG_CATPUB: 'gcg_catpub',
        SITUATION_TYPE_ENTER_GCG_PVE: 'gcg_pve', SITUATION_TYPE_ENTER_GCG_AI: 'gcg_ai', SITUATION_TYPE_ENTER_GCG_PVP: 'gcg_pvp',
        SITUATION_TYPE_ENTER_GCG_FESTIVAL: 'gcg_festival', SITUATION_TYPE_ENTER_CERTAIN_DUNGEON: 'certain_dungeon',
        SITUATION_TYPE_ENTER_GCG_ABC: 'gcg_abc', SITUATION_TYPE_ENTER_BYD_HALL: 'miliastra_hall',
        SITUATION_TYPE_ENTER_SPECIFIED_ROOM: 'specified_room',
    }, key, 'loading action'),
    get_loading_terrain: (key: string): string => mapped_key({
        LOADING_AREA_CITY: 'city', LOADING_AREA_OUTDOOR: 'outdoor',
    }, key, 'loading terrain'),

    get_archive_type: (category: string, type: string): string => {
        const types: Record<string, Record<string, string>> = {
            serenitea: { realm: 'realm', furniture: 'furniture', suite: 'suite', companion: 'companion' },
            tcg: { card: 'card', card_back: 'card_back', card_table: 'card_table', player: 'player', stage: 'stage' },
            miliastra: { costume: 'costume', suit: 'suit', catalog: 'catalog', hall: 'hall' },
            misc: { achievement: 'achievement', achievement_group: 'achievement_group', expedition: 'expedition',
                gallant_path: 'gallant_path', loading_tip: 'loading_tip', namecard: 'namecard',
                profile_frame: 'profile_frame', profile_picture: 'profile_picture', tutorial: 'tutorial', graeae_message: 'graeae_message' },
        };
        if (!Object.hasOwn(types, category)) throw new Error(`Unmapped archive category: ${category}`);
        return mapped_key(types[category]!, type, `${category} type`);
    },

    get_archive_relation_category: (category: string): string => mapped_key({
        character: 'character', enemy: 'enemy', loading_situation: 'loading_situation', material: 'material',
        miliastra: 'miliastra', misc: 'misc', npc: 'npc', outfit: 'outfit', region: 'region',
        serenitea: 'serenitea', task: 'task', tcg: 'tcg',
    }, category, 'relation category'),

    get_archive_relation_role: (role: string): string => mapped_key({
        achievement: 'achievement', catalog: 'catalog', character: 'character', component: 'component',
        costume: 'costume', dialogue: 'dialogue', dialogue_participant: 'dialogue_participant',
        group: 'group', lore: 'lore', monster: 'monster', next_stage: 'next_stage', npc: 'npc',
        opponent: 'opponent', opponent_card: 'opponent_card', player: 'player', player_card: 'player_card',
        previous_stage: 'previous_stage', quest: 'quest', region: 'region', stage: 'stage', suit: 'suit',
        suite: 'suite', unlock_avatar: 'unlock_avatar', unlock_costume: 'unlock_costume',
        unlock_material: 'unlock_material', unlock_quest: 'unlock_quest',
    }, role, 'relation role'),

    get_archive_section_kind: (kind?: string): string | undefined => {
        if (kind === undefined) return undefined;
        // The suffix is a source record ID, not a new kind. Only this known family is supported.
        if (/^biography:[1-9]\d*$/.test(kind)) return `biography:${kind.slice('biography:'.length)}`;
        return mapped_key({
            classification: 'classification', preferred_characters: 'preferred_characters', source: 'source', unlock: 'unlock',
            story: 'story', body_type: 'body_type', category: 'category', color: 'color', quality: 'quality', slot: 'slot', variant: 'variant',
            Mobile: 'Mobile', PC: 'PC', PS: 'PS', acquisition: 'acquisition', alternate_title: 'alternate_title', subtitle: 'subtitle',
        }, kind, 'section kind');
    },

    get_card_type: (id: string): string => {
        const types: Record<string, string> = {
            GCG_CARD_CHARACTER: 'character', GCG_CARD_MODIFY: 'equipment',
            GCG_CARD_EVENT: 'event', GCG_CARD_ASSIST: 'support',
        };
        return mapped_key(types, id, 'card type');
    },

    get_card_tag: (id: string): string => {
        const tags: Record<string, string> = {
            GCG_TAG_ALLY: 'ally',
            GCG_TAG_ARKHE_OUSIA: 'arkhe_ousia',
            GCG_TAG_ARKHE_PNEUMA: 'arkhe_pneuma',
            GCG_TAG_ARTIFACT: 'artifact',
            GCG_TAG_CAMP_EREMITE: 'camp_eremite',
            GCG_TAG_CAMP_FATUI: 'camp_fatui',
            GCG_TAG_CAMP_HILICHURL: 'camp_hilichurl',
            GCG_TAG_CAMP_MONSTER: 'camp_monster',
            GCG_TAG_CAMP_SACREAD: 'camp_sacread',
            GCG_TAG_CARD_BLESSING: 'card_blessing',
            GCG_TAG_ELEMENT_ANEMO: 'element_anemo',
            GCG_TAG_ELEMENT_CRYO: 'element_cryo',
            GCG_TAG_ELEMENT_DENDRO: 'element_dendro',
            GCG_TAG_ELEMENT_ELECTRO: 'element_electro',
            GCG_TAG_ELEMENT_GEO: 'element_geo',
            GCG_TAG_ELEMENT_HYDRO: 'element_hydro',
            GCG_TAG_ELEMENT_PYRO: 'element_pyro',
            GCG_TAG_FOOD: 'food',
            GCG_TAG_HEXENZIRKEL: 'hexenzirkel',
            GCG_TAG_ITEM: 'item',
            GCG_TAG_LEGEND: 'legend',
            GCG_TAG_NATION_COSMIC_CALAMITY: 'nation_cosmic_calamity',
            GCG_TAG_NATION_FONTAINE: 'nation_fontaine',
            GCG_TAG_NATION_INAZUMA: 'nation_inazuma',
            GCG_TAG_NATION_LIYUE: 'nation_liyue',
            GCG_TAG_NATION_MONDSTADT: 'nation_mondstadt',
            GCG_TAG_NATION_NATLAN: 'nation_natlan',
            GCG_TAG_NATION_NODKRAI: 'nation_nodkrai',
            GCG_TAG_NATION_SIMULANKA: 'nation_simulanka',
            GCG_TAG_NATION_SUMERU: 'nation_sumeru',
            GCG_TAG_NON_DISCOVERABLE: 'non_discoverable',
            GCG_TAG_NOT_HENSHIN: 'not_henshin',
            GCG_TAG_PLACE: 'place',
            GCG_TAG_RESONANCE: 'resonance',
            GCG_TAG_SLOWLY: 'slowly',
            GCG_TAG_SUB_HURT: 'sub_hurt',
            GCG_TAG_TALENT: 'talent',
            GCG_TAG_VEHICLE: 'vehicle',
            GCG_TAG_WEAPON: 'weapon',
            GCG_TAG_WEAPON_BOW: 'weapon_bow',
            GCG_TAG_WEAPON_CATALYST: 'weapon_catalyst',
            GCG_TAG_WEAPON_CLAYMORE: 'weapon_claymore',
            GCG_TAG_WEAPON_NONE: 'weapon_none',
            GCG_TAG_WEAPON_POLE: 'weapon_pole',
            GCG_TAG_WEAPON_SWORD: 'weapon_sword',
        };
        return mapped_key(tags, id, 'card tag');
    },

    get_archive_image_kind: (kind?: string): string | undefined => {
        if (kind === undefined) return undefined;
        if (kind.startsWith('card_face:')) {
            const match = /^card_face:([^:]+):(\d+)$/.exec(kind);
            if (!match) throw new Error(`Invalid card face key: ${kind}`);
            return `card_face:${mapped_key({
                GCG_CARD_FACE_GOLD: 'gold', GCG_CARD_FACE_PLATINUM: 'platinum',
            }, match[1]!, 'card face')}:${match[2]}`;
        }
        // Same spelling is intentional, not a pass-through rule for future keys.
        return mapped_key({
            'battle_table:tablePrefabName': 'battle_table:tablePrefabName',
            'battle_table:tablePrefabNameMobile': 'battle_table:tablePrefabNameMobile',
            card: 'card',
            'card_back:historyStaticImageHash': 'card_back:historyStaticImageHash',
            'card_back:prefabName': 'card_back:prefabName',
            'card_back:staticImageHash': 'card_back:staticImageHash',
            'card_table:stagePrefabPath': 'card_table:stagePrefabPath',
            'card_table:staticImageHash': 'card_table:staticImageHash',
            'card_view:cardPrefabName': 'card_view:cardPrefabName',
            'card_view:cardPrefabNameSpecialB': 'card_view:cardPrefabNameSpecialB',
            'card_view:cardStaticImageHash': 'card_view:cardStaticImageHash',
            'card_view:goldenSkinSpinePrefabList': 'card_view:goldenSkinSpinePrefabList',
            'card_view:goldenSkinSpinePrefabListSpecialA': 'card_view:goldenSkinSpinePrefabListSpecialA',
            'card_view:historyImageHash': 'card_view:historyImageHash',
            'card_view:historySmallImageHash': 'card_view:historySmallImageHash',
            'card_view:skinEffectJsonConfig': 'card_view:skinEffectJsonConfig',
            'card_view:skinEffectJsonConfigSpecialB': 'card_view:skinEffectJsonConfigSpecialB',
            costume_icon: 'costume_icon',
            'dice_table:tablePrefabName': 'dice_table:tablePrefabName',
            'dice_table:tablePrefabNameMobile': 'dice_table:tablePrefabNameMobile',
            effect: 'effect', hash_icon: 'hash_icon', icon: 'icon', landscape: 'landscape',
            map_icon: 'map_icon', material_icon: 'material_icon', opponent: 'opponent',
            player: 'player', 'player:imageNameHash': 'player:imageNameHash',
            portrait: 'portrait', preview: 'preview', resource: 'resource', resource_icon: 'resource_icon',
            side_portrait: 'side_portrait', stage_loading: 'stage_loading', theme: 'theme',
            Mobile: 'Mobile', PC: 'PC', PS: 'PS', background: 'background', banner: 'banner',
            group_icon: 'group_icon', illustration: 'illustration', loading_background: 'loading_background', monster_icon: 'monster_icon',
        }, kind, 'archive image kind');
    },

    // Keep condition identities consistent in both tokens and dialogue flows.
    convert_dialogue_keys: <T>(value: T): T => {
        function convert(value: unknown, key = ''): unknown {
            if (Array.isArray(value)) return value.map(item => convert(item));
            if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, convert(v, k)]));
            if (typeof value !== 'string') return value;
            if (key === 'subtitle' && value.startsWith('QUEST_COND_')) return mapped_key(condition_keys, value, 'condition');
            if (key === 'id' && value.startsWith('["QUEST_COND_')) {
                const identity = JSON.parse(value);
                identity[0] = `condition:${mapped_key(condition_keys, identity[0], 'condition')}`;
                return JSON.stringify(identity);
            }
            return value;
        }
        return convert(value) as T;
    },

    get_images_url,
    prefer_image,

    get_failed_images_list: () => {
        return [...images.failures];
    },

    get_images_path: (filepath: string | null, converted_path: string) => {
        return images.fromPath(filepath, converted_path) || '';
    },

    process_inline_images: (text: string, converted_path: string) => {
        let regex = /<image name=([^\/]+)\/>/g;
        return text.replace(regex, (match, p1) => {
            const filename = p1.trim();
            const url = ConvertRaw.get_images_url(filename, converted_path);
            return url ? `<img src="${url}" class="inline_image" />` : '';
        });
    },

    get_element: (element: Character['elementType']): ElementType | null => {

        const element_map: Record<string, ElementType> = {
            'ELEMENT_ANEMO': 'anemo',
            'ELEMENT_CRYO': 'cryo',
            'ELEMENT_DENDRO': 'dendro',
            'ELEMENT_ELECTRO': 'electro',
            'ELEMENT_GEO': 'geo',
            'ELEMENT_HYDRO': 'hydro',
            'ELEMENT_PYRO': 'pyro',
        }

        return element_map[element];
    },

    get_weapon_type: (weapon: Weapon['weaponType']): WeaponType => {

        const weapon_map: Record<string, WeaponType> = {
            'WEAPON_BOW': 'bow',
            'WEAPON_CATALYST': 'catalyst',
            'WEAPON_CLAYMORE': 'claymore',
            'WEAPON_POLE': 'polearm',
            'WEAPON_SWORD_ONE_HAND': 'sword',
        }

        return weapon_map[weapon];
    },

    is_precent_stat_type: (stat: Character['substatType']) => {
        if ([
            'FIGHT_PROP_ATTACK_PERCENT',
            'FIGHT_PROP_CHARGE_EFFICIENCY',
            'FIGHT_PROP_CRITICAL',
            'FIGHT_PROP_CRITICAL_HURT',
            'FIGHT_PROP_DEFENSE_PERCENT',
            'FIGHT_PROP_ELEC_ADD_HURT',
            // 'FIGHT_PROP_ELEMENT_MASTERY',
            'FIGHT_PROP_FIRE_ADD_HURT',
            'FIGHT_PROP_GRASS_ADD_HURT',
            'FIGHT_PROP_HEAL_ADD',
            'FIGHT_PROP_HP_PERCENT',
            'FIGHT_PROP_ICE_ADD_HURT',
            'FIGHT_PROP_PHYSICAL_ADD_HURT',
            'FIGHT_PROP_ROCK_ADD_HURT',
            'FIGHT_PROP_WATER_ADD_HURT',
            'FIGHT_PROP_WIND_ADD_HURT'
        ].includes(stat)) {
            return true;
        }
        return false;
    },
}
