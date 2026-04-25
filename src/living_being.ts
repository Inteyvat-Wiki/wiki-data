import fs from 'fs';

import { LivingBeingData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { LivingBeing, LivingBeings } from "~/types/living_being";
import living_being_list from "~/data/living_beings";

export function get_living_being(name: string, lang: Lang, type: string): LivingBeing | null {
    const living_being_data = (() => {
        if (type.startsWith("enemy")) {
            return LivingBeingData.get_enemy(name, lang);
        } else if (type.startsWith("animal")) {
            return LivingBeingData.get_animal(name, lang);
        }
        throw new Error(`Unknown living-being type: ${type}`);
    })();

    const res: LivingBeing = [{
        name: living_being_data.name,
        icon: ConvertRaw.get_images_url(living_being_data.images.filename_icon, `living_being/${name}/${name}_icon`),
        type: living_being_data.categoryText,
        info: (living_being_data as any).investigation ? [{
            title: t('living-being.description', lang),
            description: (living_being_data as any).investigation.description,
        }] : [],
        description_full: living_being_data.description,
    }];

    return res;
}

export function get_living_being_list(lang: Lang): LivingBeings {
    const res: LivingBeings = [];

    for (let type in living_being_list) {
        for (let nameraw of living_being_list[type]) {
            const name = typeof nameraw === 'string' ? nameraw : nameraw[nameraw.length - 1];

            if (type.startsWith('enemy')) {
                const enemy_data = LivingBeingData.get_enemy(name, lang);
                if (enemy_data) {
                    res.push({
                        id: name,
                        name: enemy_data.name,
                        icon: ConvertRaw.get_images_url(enemy_data.images.filename_icon, `living_being/${name}/${name}_icon`),
                        type: type as any,
                        count: typeof nameraw === 'string' ? 1 : nameraw.length,
                    });
                }
            } else if (type.startsWith('animal')) {
                const living_being_data = LivingBeingData.get_animal(name, lang);
                if (living_being_data) {
                    res.push({
                        id: name,
                        name: living_being_data.name,
                        icon: ConvertRaw.get_images_url(living_being_data.images.filename_icon, `living_being/${name}/${name}_icon`),
                        type: type as any,
                        count: typeof nameraw === 'string' ? 1 : nameraw.length,
                    });
                }
            }
        }
    }

    return res;
}

export function gen_living_being(lang: Lang, path: string) {

    fs.mkdirSync(`${path}`, { recursive: true });
    for (let type in living_being_list) {
        for (let nameraw of living_being_list[type]) {
            if (typeof nameraw == "string") {
                fs.writeFileSync(`${path}/${nameraw}.json`, JSON.stringify(get_living_being(nameraw, lang, type), null, 4), 'utf-8');
            } else {
                for (let name of nameraw) {
                    fs.writeFileSync(`${path}/${name}.json`, JSON.stringify(get_living_being(name, lang, type), null, 4), 'utf-8');
                }
            }
        }
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(get_living_being_list(lang), null, 4), 'utf-8');

}