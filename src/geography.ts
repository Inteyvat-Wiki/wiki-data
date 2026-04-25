import fs from 'fs';

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
        throw new Error(`Unknown geography type: ${type}`);
    })();

    function get_tabs() {
        if (type == 'viewpoint') {
            return [];
        } else if (type == 'dungeon') {
            return (geography_data as any).tabs.map((item: { name: string, description: string }) => ({
                name: item.name,
                description: item.description,
            }));
        }
        throw new Error(`Unknown geography type: ${type}`);
    }

    const res: Geography = {
        name: geography_data.name?? "",
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
                    throw new Error(`Unknown geography type: ${type}`);
                })();

                res.push({
                    id: name,
                    name: geography_data.name?? "",
                    image: ConvertRaw.get_images_url(geography_data.images.filename_image, `geography/${name}/${name}_image`),
                    type: type as any,
                    area: area as any,
                })
            }
        }
    }

    return res;

}

export function gen_geography(lang: Lang, path: string) {

    fs.mkdirSync(`${path}`, { recursive: true });
    for (let type in geography_list) {
        for (let area in geography_list[type]) {
            for (let name of geography_list[type][area]) {
                fs.writeFileSync(`${path}/${name}.json`, JSON.stringify(get_geography(name, lang, type, area), null, 4), 'utf-8');
            }
        }
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(get_geography_list(lang), null, 4), 'utf-8');

}