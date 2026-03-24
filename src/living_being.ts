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
        return null;
    })();

    if (!living_being_data) {
        console.error(`Living-being not found: ${name}`);
        return null;
    }

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