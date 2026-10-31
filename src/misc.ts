import path from 'node:path';
import type { MiscRecord } from 'genshin-db';
import type { Lang } from '~/utils/i18n';
import { MiscData } from '~/utils/data';
import { create_page, export_category } from '~/utils/page';
import { archive_asset_manifest, archive_image, set_archive_output } from '~/utils/archive';
import { MISC_TYPES, type MiscExport, type MiscItem } from '~/types/misc';
import { PageReferences } from '~/utils/page_reference';
import { ConvertRaw } from '~/utils/convert_raw';
import { apply_page_groups, achievement_page_groups } from '~/utils/page_groups';
import { archive_directories, directory_id, select_directory_records, directory_common, type ExportDirectory } from '~/utils/archive_directory';
import { convert_archive_images } from '~/utils/archive_images';

const project = path.resolve(__dirname, '..');
let output = path.join(project, 'data');
let page_references = new PageReferences(output);

export function set_misc_output(directory: string) {
    output = path.resolve(directory);
    page_references = new PageReferences(output);
    set_archive_output(output);
}
export function misc_asset_manifest() { return archive_asset_manifest().filter(asset => asset.category === 'misc'); }

function is_published(category: string, id: string, lang: Lang) {
    return page_references.has(category, id, lang);
}

export function convert_misc_records(records: MiscRecord[], lang: Lang, directory: ExportDirectory = archive_directories.misc): MiscExport {
    const ids = new Set(records.map(record => record.id));
    if (ids.size !== records.length) throw new Error('Duplicate genshin-db misc IDs');
    for (const record of records) {
        if (!/^[a-z][a-z_]*-\d+$/.test(record.id) || !MISC_TYPES.includes(record.type)) {
            throw new Error(`Invalid genshin-db misc identity: ${record.id}/${record.type}`);
        }
    }
    const selected = select_directory_records(records, directory);
    const selected_ids = new Map(selected.map(entry => [entry.source_id, entry.id]));
    const pages = new Map(selected.map(({id, record}) => [id, record.show]));
    const source_ids = new Map(selected.map(({id, source_id}) => [id, source_id]));
    const files = selected.map(({id, record}) => {
        const { id: source_id, order, show, version, ...source } = structuredClone(record);
        const type = ConvertRaw.get_archive_type('misc', source.type) as MiscItem['type'];
        const diagnostics = [...(source.diagnostics || [])];
        const references = [...(source.source.references || [])];
        const relations = source.relations.flatMap(relation => {
            const category = ConvertRaw.get_archive_relation_category(relation.category);
            const role = ConvertRaw.get_archive_relation_role(relation.role);
            if (relation.category === 'misc') {
                if (!ids.has(relation.id)) throw new Error(`Dangling misc relation: ${id} -> ${relation.id}`);
                const target = selected_ids.get(relation.id);
                if (target) return [{ category, id: target, name: relation.name, role }];
                references.push(`misc:${relation.id}:${relation.role}`);
                return [];
            }
            const source_id = relation.source_id;
            if (relation.category === 'miliastra' && relation.role === 'lore' && !directory_id('miliastra', relation.id)) {
                references.push(`miliastra:${relation.id}:lore`);
                return [];
            }
            if (['serenitea', 'tcg', 'miliastra'].includes(relation.category)
                && directory_id(relation.category, relation.id) && is_published(relation.category, directory_id(relation.category, relation.id)!, lang)) {
                return [{ category, id: directory_id(relation.category, relation.id)!, name: relation.name, role }];
            }
            const target = source_id === undefined || source_id <= 0 ? null : page_references.resolve(relation.category, source_id, lang);
            if (target) return [{ category, id: target.id, name: relation.name, role }];
            // Keep unresolved provenance without publishing a guessed or dangling Wiki URL.
            const reference = `${relation.category}:${source_id ?? relation.id}:${relation.role}`;
            if (!references.includes(reference)) references.push(reference);
            diagnostics.push(`unresolved_wiki_relation:${reference}`);
            // A source category/group name remains useful original text even without a
            // page. Render it as a non-link rather than losing it or inventing a URL.
            if (relation.name && (Number(source_id) > 0 || relation.category === 'achievementgroup' && source_id === 0)) {
                return [{ category: 'source', id: `${relation.category}-${source_id ?? relation.id}`,
                    name: relation.name, role }];
            }
            return [];
        });
        const images = convert_archive_images('misc', source.type, source.images, (name, kind) => archive_image(name, 'misc', id, kind));
        const data: MiscItem = { name: source.name, type, description: source.description,
            ...(source.tutorial_category ? { tutorial_category: ConvertRaw.get_tutorial_category(source.tutorial_category) } : {}),
            ...(source.message_thread ? { message_thread: { initial: [...source.message_thread.initial], nodes: source.message_thread.nodes.map(node => {
                const image = node.image && images.find(image => image.name === node.image!.name && image.kind === ConvertRaw.get_archive_image_kind(node.image!.kind));
                if (node.image && !image) throw new Error(`Missing Graeae image reference: ${id}/${node.id}`);
                const { image: source_image, ...content } = node;
                return { ...content, kind: ConvertRaw.get_message_kind(node.kind), ...(image ? { image: { ...image } } : {}) };
            }) } } : {}),
            ...(source.loading_situations ? { loading_situations: source.loading_situations.map(value => {
                const action = ConvertRaw.get_loading_action(value.action);
                const image = value.image && images.find(image => image.name === value.image!.name
                    && image.kind === ConvertRaw.get_archive_image_kind(value.image!.kind));
                if (value.image && !image) throw new Error(`Missing loading situation image reference: ${id}/${value.id}`);
                return { id: value.id, action,
                    ...(image ? { image: { ...image } } : {}),
                    ...(action === 'transport' ? {
                        areas: value.areas.map(area => ({ id: area.id, name: area.name })),
                        ...(value.terrain ? { terrain: ConvertRaw.get_loading_terrain(value.terrain) } : {}),
                    } : {}),
                    ...(action === 'certain_dungeon' ? {
                        ...(value.dungeon_type ? { dungeon_type: ConvertRaw.get_loading_dungeon_type(value.dungeon_type) } : {}),
                        ...(value.dungeons ? { dungeons: value.dungeons.map(dungeon => ({ id: dungeon.id, name: dungeon.name })) } : {}),
                    } : {}),
                    ...(action === 'specified_room' && value.scene_ids ? { scene_ids: [...value.scene_ids] } : {}),
                };
            }) } : {}),
            sections: source.sections.map(section => ({ ...(section.title !== undefined ? { title: section.title } : {}),
                ...(section.kind !== undefined ? { kind: ConvertRaw.get_archive_section_kind(section.kind) } : {}), text: section.text })), images, relations,
            source: { table: source.source.table, id: source.source.id, hashes: source.source.hashes,
                ...(source.source.references ? { references: source.source.references } : {}), ...(references.length ? { references } : {}) },
            ...(diagnostics.length ? { diagnostics: [...new Set(diagnostics)] } : {}),
        };
        return { id, data };
    });
    const result = { files, list: files.map(({ id, data }) => ({
        ...create_page({ id, name: data.name, icon: data.type === 'graeae_message' ? null : data.images.find(image => image.url)?.url || null }),
        show: pages.get(id) !== false, type: data.type, description: data.description, source_id:source_ids.get(id)!,
        ...(data.tutorial_category ? { tutorial_category: data.tutorial_category } : {}),
    })) };
    return apply_page_groups(result, achievement_page_groups(files));
}

export function get_misc_export(lang: Lang): MiscExport {
    return convert_misc_records(MiscData.get_records(lang), lang);
}

export function gen_misc(lang: Lang, directory: string) {
    set_misc_output(path.resolve(directory, '../..'));
    const result = get_misc_export(lang);
    export_category(directory, result.list, result.files, { ...directory_common('misc'), assets: misc_asset_manifest() });
}
