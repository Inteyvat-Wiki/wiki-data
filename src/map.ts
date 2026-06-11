import fs from 'fs';
import path from "path";

import { MapData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { Mapback, Maplayer, Maps, MapList, MapConditions } from "~/types/map";
import mapback_data from "~/map-data/mapback";
import maplayer_data from "~/map-data/maplayer";
import mapcover_data from "~/map-data/mapcover";
import map_condition_data from "~/map-data/conditions";

const index_info = (() => {
    let min_floor = 0, max_floor = 0, max_images_len = 0;
    for (let region in maplayer_data) {
        for (let layer of maplayer_data[region].layers) {
            if (layer.floor > max_floor) max_floor = layer.floor;
            if (layer.floor < min_floor) min_floor = layer.floor;
            if (layer.images.length > max_images_len) max_images_len = layer.images.length;
        }
    }
    for (let group_key in mapcover_data) {
        if (mapcover_data[group_key].images.length > max_images_len) max_images_len = mapcover_data[group_key].images.length;
    }
    return { min_floor, max_floor, max_images_len, back_index: 0, mask_index: (max_floor - min_floor + 1) * max_images_len + 1 };
})();
function get_z_index(floor: number, image_index: number): number {
    return (floor - index_info.min_floor) * index_info.max_images_len + image_index;
}

let maplayer_name_map: Record<number, string> = {};
function get_maplayer_key(id: number): string {
    if (!maplayer_name_map[id]) {
        maplayer_name_map[id] = `layer_${Object.keys(maplayer_name_map).length + 1}`;
    }
    return maplayer_name_map[id];
}

function get_mapbacks(lang: Lang): Record<string, Mapback> {
    const res: Record<string, Mapback> = {};

    for (let region in mapback_data) {
        let images: Mapback['images'] = [];
        let min_x = Infinity, max_x = -Infinity, min_y = Infinity, max_y = -Infinity;

        for (let block of mapback_data[region].blocks) {
            images.push({
                name: null,
                image: ConvertRaw.get_images_path(block.image, `map/mapback/${region}/${path.basename(block.image)}`),
                coordinate: block.coordinate,
                z_index: index_info.back_index,
                shown_condition: block.shown_condition,
            });
            min_x = Math.min(min_x, block.coordinate[0].x, block.coordinate[1].x);
            max_x = Math.max(max_x, block.coordinate[0].x, block.coordinate[1].x);
            min_y = Math.min(min_y, block.coordinate[0].y, block.coordinate[1].y);
            max_y = Math.max(max_y, block.coordinate[0].y, block.coordinate[1].y);
        }
        for (let mask of mapback_data[region].masks || []) {
            images.push({
                name: null,
                image: ConvertRaw.get_images_path(mask.image, `map/mapback/${region}/${path.basename(mask.image)}`),
                coordinate: mask.coordinate,
                z_index: index_info.mask_index,
                shown_condition: mask.shown_condition,
            });
            min_x = Math.min(min_x, mask.coordinate[0].x, mask.coordinate[1].x);
            max_x = Math.max(max_x, mask.coordinate[0].x, mask.coordinate[1].x);
            min_y = Math.min(min_y, mask.coordinate[0].y, mask.coordinate[1].y);
            max_y = Math.max(max_y, mask.coordinate[0].y, mask.coordinate[1].y);
        }

        res[region] = {
            coordinate: isFinite(min_x) ? [{ x: min_x, y: min_y }, { x: max_x, y: max_y }] : undefined,
            images,
        };
    }

    let total = 0;
    for (let group_key in mapcover_data) {
        let index = 0;
        for (let image of mapcover_data[group_key].images) {
            ++index;
            res[mapcover_data[group_key].region].images.push({
                name: null,
                image: ConvertRaw.get_images_path(image.image, `map/mapback/${mapcover_data[group_key].region}/cover_${++total}`),
                coordinate: image.coordinate,
                z_index: get_z_index(0, index),
                shown_condition: image.shown_condition,
            });
        }
    }

    return res;
}

export function get_maplayers(lang: Lang): Record<string, Maplayer> {
    const res: Record<string, Maplayer> = {};

    let new_id = 0;
    for (let id in maplayer_data) {
        const rawdata = MapData.get_maplayer(id, lang);
        const en_rawdata = MapData.get_maplayer(id, 'en' as Lang);
        ++new_id;
        const key = get_maplayer_key(maplayer_data[id].id);
        res[key] = {
            name: null,
            region: maplayer_data[id].region,
            layers: [],
        };
        for (let layer of maplayer_data[id].layers) {
            const layer_name_id = en_rawdata.layers.find(item => item.id === layer.id)!.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") ?? null;

            let images: Maplayer['layers'][0]['images'] = [];
            let index = 0;
            for (let image of layer.images) {
                ++index;
                images.push({
                    image: ConvertRaw.get_images_path(image.image, `map/maplayer/${key}/${layer_name_id}_${index}`),
                    coordinate: image.coordinate,
                    z_index: get_z_index(layer.floor, index),
                    shown_condition: image.shown_condition,
                });
            }
            res[key].layers.push({
                name: rawdata.layers.find(item => item.id === layer.id)!.name_new || rawdata.layers.find(item => item.id === layer.id)!.name,
                name_old: rawdata.layers.find(item => item.id === layer.id)!.name_new ? rawdata.layers.find(item => item.id === layer.id)!.name : null,
                floor: layer.floor,
                images,
            });
        }
    }

    return res;
}

export function get_map_list(lang: Lang): MapList {
    const res: MapList = {};

    for (let region in mapback_data) {
        res[region] = {};
    }

    for (let id in maplayer_data) {
        const rawdata = MapData.get_maplayer(id, lang);

        let min_x = Infinity, max_x = -Infinity, min_y = Infinity, max_y = -Infinity;
        let layers: MapList[string][string]['layers'] = [];
        for (let layer of maplayer_data[id].layers) {
            layers.push({
                name: rawdata.layers.find(item => item.id === layer.id)!.name_new || rawdata.layers.find(item => item.id === layer.id)!.name,
                name_old: rawdata.layers.find(item => item.id === layer.id)!.name_new ? rawdata.layers.find(item => item.id === layer.id)!.name : null,
                floor: layer.floor,
            });
            for (let image of layer.images) {
                min_x = Math.min(min_x, Math.min(image.coordinate[0].x, image.coordinate[1].x));
                max_x = Math.max(max_x, Math.max(image.coordinate[0].x, image.coordinate[1].x));
                min_y = Math.min(min_y, Math.min(image.coordinate[0].y, image.coordinate[1].y));
                max_y = Math.max(max_y, Math.max(image.coordinate[0].y, image.coordinate[1].y));
            }
        }
        res[maplayer_data[id].region][get_maplayer_key(maplayer_data[id].id)] = {
            coordinate: { x: (min_x + max_x) / 2, y: (min_y + max_y) / 2 },
            layers: layers,
        };
    }

    return res;
}

export function get_map_conditions(lang: Lang): MapConditions {
    return map_condition_data as MapConditions;
}

export function get_maps(): Maps {
    const res: Maps = {};

    for (let region in mapback_data) {
        res[region] = [];
    }

    for (let id in maplayer_data) {
        res[maplayer_data[id].region].push(get_maplayer_key(maplayer_data[id].id));
    }

    return res;
}

export function gen_map(lang: Lang, path: string) {

    fs.mkdirSync(`${path}`, { recursive: true });
    const mapbacks = get_mapbacks(lang);
    const maplayers = get_maplayers(lang);
    for (let region in mapbacks) {
        fs.writeFileSync(`${path}/${region}.json`, JSON.stringify(mapbacks[region], null, 4), 'utf-8');
    }
    for (let name in maplayers) {
        fs.writeFileSync(`${path}/${name}.json`, JSON.stringify(maplayers[name], null, 4), 'utf-8');
    }
    fs.writeFileSync(`${path}/map_conditions.json`, JSON.stringify(get_map_conditions(lang), null, 4), 'utf-8');
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(get_map_list(lang), null, 4), 'utf-8');

}