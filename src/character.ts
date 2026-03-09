import { CharacterData, get_hyperlinks } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { Character } from "~/types/character";

const character_ascension_list: { min: number; max: number; step: number }[] = [
    { min: 1, max: 20, step: 1 },
    { min: 20, max: 40, step: 1 },
    { min: 40, max: 50, step: 1 },
    { min: 50, max: 60, step: 1 },
    { min: 60, max: 70, step: 1 },
    { min: 70, max: 80, step: 1 },
    { min: 80, max: 90, step: 1 },
    { min: 90, max: 100, step: 5 },
];

export function get_character(name: string, lang: Lang): Character | null {
    const character_data = CharacterData.get_character(name, lang);
    const talents_data = CharacterData.get_talents(name, lang);
    const constellations_data = CharacterData.get_constellations(name, lang);
    const hyperlinks_data = get_hyperlinks(lang);
    const stories_data = CharacterData.get_stories(name, lang);
    const voiceovers_data = CharacterData.get_voiceovers(name, lang);

    if (!character_data) {
        return null;
    }

    function get_character_stats() {
        const hp: Record<number, string>[] = [];
        const atk: Record<number, string>[] = [];
        const def: Record<number, string>[] = [];
        const sub_stat: {
            name: string,
            value: string[],
        } = {
            name: character_data.substatText,
            value: [],
        };

        const initial_sub_stat = character_data.stats(1, 0).specialized;
        for (let ascension = 0; ascension < character_ascension_list.length; ascension++) {
            const { min, max, step } = character_ascension_list[ascension];
            hp[ascension] = {};
            atk[ascension] = {};
            def[ascension] = {};
            for (let level = min; level <= max; level += step) {
                const stat = character_data.stats(level, ascension);
                hp[ascension][level] = stat.hp.toString();
                atk[ascension][level] = stat.attack.toString();
                def[ascension][level] = stat.defense.toString();
            }
            sub_stat.value.push(((
                character_data.stats(max, ascension).specialized - initial_sub_stat)
                    * (ConvertRaw.is_precent_stat_type(character_data.substatType) ? 100 : 1)).toString()
                    + (ConvertRaw.is_precent_stat_type(character_data.substatType) ? '%' : '')
            );
        }
        return {
            hp: hp,
            atk: atk,
            def: def,
            substats: [sub_stat]
        };
    }

    function get_character_skills() {
        const res: Character["skills"] = [];

        let index = 0;
        for (let skill_key of ['combat1', 'combat2', 'combatsp', 'combatju', 'combat3']) {
            const skill = talents_data[skill_key];
            if (!skill) {
                continue;
            }

            res.push({
                id: skill.id,
                title: skill.name,
                icon: ConvertRaw.get_images_url(talents_data.images[`filename_${skill_key}`], `character/${name}/${name}_skill_${++index}`),
                description: skill.descriptionRaw,
                details: skill.attributes?.labels || null,
                params: skill.attributes?.parameters || null,
            });
        }
        return res;
    }

    function get_character_talents() {
        const res: Character["talents"] = [];

        let index = 0;
        for (let talent_key of ['passive1', 'passive2', 'passive3', 'passive4']) {
            const talent = talents_data[talent_key];
            if (!talent) {
                continue;
            }

            res.push({
                id: talent.id,
                title: talent.name,
                icon: ConvertRaw.get_images_url(talents_data.images[`filename_${talent_key}`], `character/${name}/${name}_talent_${++index}`),
                description: talent.descriptionRaw,
                unlock_ascension: talent.unlock_ascension,
            })
        }
        return res;
    }

    function get_character_constellations() {
        const res: Character["constellations"] = [];

        for (let constellation_key of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
            const constellation = constellations_data[constellation_key];
            res.push({
                id: constellation.id,
                title: constellation.name,
                icon: ConvertRaw.get_images_url(constellations_data.images[`filename_${constellation_key}`], `character/${name}/${name}_constellation_${constellation_key.slice(1)}`),
                description: constellation.descriptionRaw,
            });
        }

        return res;
    }

    function get_character_link_descriptions() {
        const res: Character["link_description"] = [];

        const linked_id = {};
        for (let key in talents_data) {
            if (talents_data[key].descriptionRaw != undefined) {
                const regex = /{LINK#N([0-9]+)}[^{}]+{\/LINK}/g;
                let match;
                while ((match = regex.exec(talents_data[key].descriptionRaw)) !== null) {
                    linked_id[match[1]] = true;
                }
            }
        }

        for (let hyperlink of hyperlinks_data.hyperlinks) {
            if (linked_id[hyperlink.id]) {
                res.push({
                    id: hyperlink.id,
                    title: hyperlink.title,
                    description: hyperlink.descriptionRaw,
                });
            }
        }
        return res;
    }

    function get_character_stories() {
        const res: Character["stories"] = [];

        for (let story of stories_data.stories) {
            res.push({
                title: story.title,
                content: story.descriptionRaw,
                tips: story.tips,
            });
        }

        return res;
    }

    function get_character_voiceovers() {
        const res: Character["voiceovers"] = [];

        for (let voiceover of voiceovers_data.friendLines) {
            res.push({
                title: voiceover.title,
                type: 'dialog',
                content: voiceover.description,
                tips: voiceover.hasUnlockConditions ? voiceover.unlockConditions.map(condition => condition.unlockText) : [],
            });
        }
        for (let voiceover of voiceovers_data.actionLines) {
            res.push({
                title: voiceover.title,
                type: 'action',
                content: voiceover.description,
                tips: voiceover.hasUnlockConditions ? voiceover.unlockConditions.map(condition => condition.unlockText) : [],
            });
        }

        return res;
    }

    const res: Character = {
        name: character_data.name,
        icon: ConvertRaw.get_images_url(character_data.images.filename_icon, `character/${name}/${name}_icon`),
        splash: ConvertRaw.get_images_url(character_data.images.filename_gachaSplash, `character/${name}/${name}_splash`),
        element: ConvertRaw.get_element(character_data.elementType) || name.slice(name.lastIndexOf('_') + 1) as any,
        weapon: ConvertRaw.get_weapon_type(character_data.weaponType) as any,
        star: character_data.rarity,
        info: [
            {
                title: t("character.constellation", lang),
                description: character_data.constellation,
            },
            {
                title: t("character.description", lang),
                description: character_data.description,
            }
        ],
        stats: get_character_stats(),
        skills: get_character_skills(),
        talents: get_character_talents(),
        constellations: get_character_constellations(),
        link_description: get_character_link_descriptions(),
        stories: get_character_stories(),
        voiceovers: get_character_voiceovers(),
        images: [],
    }
    return res;
}