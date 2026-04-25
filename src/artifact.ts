import fs from 'fs';

import { ArtifactData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang, t } from "~/utils/i18n";
import { Artifact, Artifacts } from "~/types/artifact";
import artifact_list from "~/data/artifacts";

export function get_artifact(name: string, lang: Lang): Artifact {
    const artifact_data = ArtifactData.get_artifact(name, lang);

    function get_artifact_item(type: 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet') {
        if (!artifact_data[type]) {
            return null;
        }

        return {
            name: artifact_data[type].name,
            icon: ConvertRaw.get_images_url(artifact_data.images[`filename_${type}`], `artifact/${name}/${type}`),
            description: artifact_data[type].description,
            story: artifact_data[type].story,
        }
    }

    const res: Artifact = {
        name: artifact_data.name,
        icon: ConvertRaw.get_images_url(
            artifact_data.images.filename_flower || artifact_data.images.filename_circlet, `artifact/${name}/${name}_icon`
        ),
        stars: artifact_data.rarityList,
        effect: {
            "1-piece": artifact_data.effect1Pc ?? null,
            "2-piece": artifact_data.effect2Pc ?? null,
            "3-piece": null,
            "4-piece": artifact_data.effect4Pc ?? null,
            "5-piece": null,
        },
        flower: get_artifact_item("flower"),
        plume: get_artifact_item("plume"),
        sands: get_artifact_item("sands"),
        goblet: get_artifact_item("goblet"),
        circlet: get_artifact_item("circlet"),
    }
    return res;
}

export function get_artifact_list(lang: Lang): Artifacts {
    const res: Artifacts = [];

    for (let name of artifact_list) {
        const artifact_data = ArtifactData.get_artifact(name, lang);
        if (artifact_data) {
            res.push({
                id: name,
                name: artifact_data.name,
                icon: ConvertRaw.get_images_url(
                    artifact_data.images.filename_flower || artifact_data.images.filename_circlet, `artifact/${name}/${name}_icon`
                ),
                stars: artifact_data.rarityList,
            });
        }
    }

    return res;
}

export function gen_artifact(lang: Lang, path: string) {

    fs.mkdirSync(`${path}`, { recursive: true });
    for (let artifact_name of artifact_list) {
        fs.writeFileSync(`${path}/${artifact_name}.json`, JSON.stringify(get_artifact(artifact_name, lang), null, 4), 'utf-8');
    }
    fs.writeFileSync(`${path}/list.json`, JSON.stringify(get_artifact_list(lang), null, 4), 'utf-8');

}