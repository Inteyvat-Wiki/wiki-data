import { ArtifactData } from "~/utils/data";
import { ConvertRaw } from "~/utils/convert_raw";
import { Lang } from '~/utils/i18n';
import { Artifacts } from '~/types/artifacts';
import artifact_list from "~/data/artifacts";

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