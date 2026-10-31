import type { Lang } from '~/utils/i18n';
import { export_category } from '~/utils/page';
import { get_archive_export, set_archive_output, archive_asset_manifest } from '~/utils/archive';
import { directory_common } from '~/utils/archive_directory';
import path from 'node:path';

export function get_serenitea_export(lang: Lang) { return get_archive_export('serenitea', lang); }

export function gen_serenitea(lang: Lang, directory: string) {
    set_archive_output(path.resolve(directory, '../..'));
    const result = get_serenitea_export(lang);
    export_category(directory, result.list, result.files, { ...directory_common('serenitea'),
        assets: archive_asset_manifest().filter(asset => asset.category === 'serenitea') });
}
