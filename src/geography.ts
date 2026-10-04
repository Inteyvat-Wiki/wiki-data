import { create_page, export_category } from '~/utils/page';

import { GeographyData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang } from "~/utils/i18n";
import { Geography, GeographyPages } from "~/types/geography";
import type { GeographyArea, GeographyType } from "~/types/common";
import geography_list from "~/data/geographies";

const geography_areas: Record<number, GeographyArea> = {
    1: 'mondstadt',
    2: 'liyue',
    3: 'inazuma',
    4: 'sumeru',
    5: 'fontaine',
    6: 'natlan',
    7: 'nod-krai',
};

function get_geography_data(name: string, lang: Lang, type: GeographyType) {
    if (type === 'viewpoint') return GeographyData.get_geography(name, lang);
    if (type === 'dungeon') return GeographyData.get_dungeon(name, lang);
    throw new Error(`Unknown geography type: ${type}`);
}

function get_geography_area(name: string, data: { regionId?: number }): GeographyArea {
    const area = data.regionId === undefined ? undefined : geography_areas[data.regionId];
    if (!area) {
        throw new Error(`Missing or unsupported source region for geography ${name}: ${data.regionId}`);
    }
    return area;
}

export function get_geography(name: string, lang: Lang, type: GeographyType): Geography {
    const geography_data = get_geography_data(name, lang, type);

    const res: Geography = {
        name: geography_data.name?? "",
        description: geography_data.description,
        image: ConvertRaw.get_images_url(geography_data.images.filename_image, `geography/${name}/${name}_image`),
        type,
        area: get_geography_area(name, geography_data),
        tabs: 'tabs' in geography_data ? geography_data.tabs.map(item => ({
            name: item.name,
            description: item.description,
        })) : [],
    }
    return res;
}

export function get_geography_list(lang: Lang): GeographyPages {
    const res: GeographyPages = [];

    for (const type of Object.keys(geography_list) as GeographyType[]) {
        for (const name of geography_list[type]) {
            const geography_data = get_geography_data(name, lang, type);

            res.push(create_page({
                id: name,
                name: geography_data.name?? "",
                icon: ConvertRaw.get_images_url(geography_data.images.filename_image, `geography/${name}/${name}_image`),
                type,
                area: get_geography_area(name, geography_data),
            }));
        }
    }

    return res;

}

export function gen_geography(lang: Lang, path: string) {
    const pages = get_geography_list(lang);
    export_category(path, pages, pages.map(page => {
        const data = get_geography(page.id, lang, page.type);
        return { id: page.id, data };
    }));
}
