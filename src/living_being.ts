import { LivingBeingData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { LivingBeing } from "~/types/living_being";

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