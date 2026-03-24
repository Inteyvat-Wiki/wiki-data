import { GeographyData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { Geography, Geographies } from "~/types/geography";
import geography_list from "~/data/geographies";

export function get_geography(name: string, lang: Lang, type: string, area: string): Geography | null {
    const geography_data = (() => {
        if (type == 'viewpoint') {
            return GeographyData.get_geography(name, lang);
        } else if (type == 'dungeon') {
            return GeographyData.get_dungeon(name, lang);
        }
        return null;
    })();

    if (!geography_data) {
        console.error(`Geography ${name} not found`);
        return null;
    }

    function get_tabs() {
        if (type == 'viewpoint') {
            return [];
        } else if (type == 'dungeon') {
            return (geography_data as any).tabs.map((item) => ({
                name: item.name,
                description: item.description,
            }));
        }
    }

    const res: Geography = {
        name: geography_data.name,
        description: geography_data.description,
        image: ConvertRaw.get_images_url(geography_data.images.filename_image, `geography/${name}/${name}_image`),
        type: type as any,
        area: area as any,
        tabs: get_tabs()
    }
    return res;
}

export function get_geography_list(lang: Lang): Geographies {
    const res: Geographies = [];

    for (let type in geography_list) {
        for (let area in geography_list[type]) {
            for (let name of geography_list[type][area]) {
                const geography_data = (() => {
                    if (type == 'viewpoint') {
                        return GeographyData.get_geography(name, lang);
                    } else if (type == 'dungeon') {
                        return GeographyData.get_dungeon(name, lang);
                    }
                    return null;
                })();

                res.push({
                    id: name,
                    name: geography_data.name,
                    image: ConvertRaw.get_images_url(geography_data.images.filename_image, `geography/${name}/${name}_image`),
                    type: type as any,
                    area: area as any,
                })
            }
        }
    }

    return res;

}