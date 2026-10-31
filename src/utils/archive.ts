import path from 'node:path';
import type { ArchiveRecord, ArchiveSourceTalk } from 'genshin-db';
import type { Lang } from '~/utils/i18n';
import { create_page } from '~/utils/page';
import { get_source_dialog, get_talk_dialogs } from '~/utils/dialogue';
import { get_task_conditions } from '~/utils/task_condition';
import type { ArchiveCategory, ArchiveExport, ArchiveImage, ArchiveRelation, ArchiveTalk } from '~/types/archive';
import { archive_directories, directory_id, select_directory_records } from '~/utils/archive_directory';
import { ConvertRaw } from '~/utils/convert_raw';
import { image_basename } from '~/utils/images';
import { ArchiveData } from '~/utils/data';
import { PageReferences } from '~/utils/page_reference';
import { apply_page_groups, hall_page_groups } from '~/utils/page_groups';
import { convert_archive_images } from '~/utils/archive_images';

const project = path.resolve(__dirname, '../..');
let output = path.join(project, 'data');
let references = new PageReferences(output);
const assets = new Map<string, { category: string; id: string; name: string; available: boolean }>();

export function set_archive_output(directory: string) { output = path.resolve(directory); references = new PageReferences(output); assets.clear(); }
export function archive_asset_manifest() { return [...assets.values()]; }

export function archive_image(reference: string | undefined, category: ArchiveCategory | 'misc', id: string, kind = 'image'): ArchiveImage | null {
    if (!reference) return null;
    const basename = image_basename(String(reference));
    const relative = `${category}/${id}/${basename}.png`;
    // Only publish URLs backed by real files. Unextracted source references remain explicit.
    const url = ConvertRaw.get_images_url(reference, relative, { output, nullable: true });
    assets.set(`${category}:${id}:${reference}`, { category, id, name: String(reference), available: !!url });
    return { name: String(reference), url, kind };
}

export function archive_external_relation(category: 'character' | 'npc' | 'task' | 'quest_item' | 'book',
    sourceId: number, lang: Lang, role: string): ArchiveRelation | null {
    const page = references.resolve(category, sourceId, lang);
    return page ? { ...page, role } : null;
}


export function convert_archive_talk(source: ArchiveSourceTalk, lang: Lang): ArchiveTalk {
    const { source_dialogue, ...talk } = source;
    if (!source_dialogue) return talk as ArchiveTalk;
    const dialogue = get_talk_dialogs({
        dialogs: source_dialogue.dialogs.map(get_source_dialog),
        initial_dialog: source_dialogue.initial_dialog,
        perform_cfg: source_dialogue.perform_cfg,
        menu_option: source_dialogue.menu_option,
    }, new Map(), new Map(), lang);
    const labels = new Map<string, { title: string; subtitle: string }>();
    for (const { condition, title, subtitle } of source_dialogue.labels) {
        for (const token of get_task_conditions({ logic: 'LOGIC_AND', conditions: [condition] }, new Map(), new Map(), lang)) {
            if (typeof token !== 'string') labels.set(token.id, { title, subtitle });
        }
    }
    const conditions = get_task_conditions(source_dialogue.conditions, new Map(), new Map(), lang);
    return { ...talk, ...dialogue,
        conditions: conditions.map(token => typeof token === 'string' || !labels.has(token.id)
            ? token : { ...token, ...labels.get(token.id) }),
    } as ArchiveTalk;
}

export function get_archive_excluded_ids(category: ArchiveCategory,
    records: readonly Pick<ArchiveRecord, 'id' | 'type' | 'relations' | 'furniture_type'>[]): Set<string> {
    if (category !== 'serenitea') return new Set();
    // HomeWorldNPC's explicit furniture relation identifies character furnishings.
    // Never use translated names, ID ranges or a second read of the raw game tables.
    const character_furniture = new Set(records.filter(record => record.type === 'companion')
        .flatMap(record => record.relations.filter(relation => relation.category === category && relation.role === 'component')
            .map(relation => relation.id)));
    return new Set(records.filter(record => record.type === 'host'
        || record.type === 'furniture' && (character_furniture.has(record.id)
            || ['virtual', 'suite_placeholder'].includes(ConvertRaw.get_furniture_role(record.furniture_type ?? '')))).map(record => record.id));
}

export function get_archive_export(category: ArchiveCategory, lang: Lang): ArchiveExport {
    const records = ArchiveData.get_records(category, lang);
    const excluded = get_archive_excluded_ids(category, records);
    const selected = select_directory_records(records, archive_directories[category]);
    for (const entry of selected) if (excluded.has(entry.source_id)) throw new Error(`Excluded source remains in export directory: ${entry.id}`);
    const selected_ids = new Map(selected.map(entry => [entry.source_id, entry.id]));
    const files = selected.map(({ id, record }) => {
        // genshin-db caches query results. Never attach Wiki URLs or mutate its source records.
        const { id: source_id, order, show, version, ...data } = structuredClone(record);
        const type = ConvertRaw.get_archive_type(category, data.type);
        if (data.card_type) data.card_type.id = ConvertRaw.get_card_type(data.card_type.id);
        if (data.tags) data.tags = data.tags.map(tag => ({ ...tag, id: ConvertRaw.get_card_tag(tag.id) }));
        if (category === 'serenitea' && data.type === 'furniture' && !Array.isArray(data.classifications)) {
            throw new Error(`Missing source classifications: ${id}. Regenerate serenitea in GenshinData-scripts and rebuild genshin-db indices.`);
        }
        if (category === 'miliastra' && data.type === 'costume' && !Array.isArray(data.classifications)) {
            throw new Error(`Missing source classifications: ${id}. Regenerate miliastra in GenshinData-scripts and rebuild genshin-db indices.`);
        }
        if (category === 'tcg' && data.type === 'card' && (!data.card_type?.name || !Array.isArray(data.tags))) {
            throw new Error(`Missing source card metadata: ${id}. Regenerate tcg in GenshinData-scripts and rebuild genshin-db indices.`);
        }
        const relations = data.relations.flatMap(relation => {
            const category_key = ConvertRaw.get_archive_relation_category(relation.category);
            const role = ConvertRaw.get_archive_relation_role(relation.role);
            // Realm component lists stay upstream, not on Wiki detail pages.
            if (category === 'serenitea' && data.type === 'realm' && relation.role === 'component') return [];
            // Stage deck composition stays in genshin-db, not in Wiki reference pages.
            if (category === 'tcg' && data.type === 'stage' && relation.category === 'tcg'
                && ['player_card', 'opponent_card'].includes(relation.role)) return [];
            if (relation.category === category && excluded.has(relation.id)) {
                const reference = `${category}:${relation.id}:${relation.role}`;
                if (!(data.source.references ||= []).includes(reference)) data.source.references.push(reference);
                return [];
            }
            if (Object.hasOwn(archive_directories, relation.category)) {
                const target = relation.category === category ? selected_ids.get(relation.id) : directory_id(relation.category, relation.id);
                if (target) return [{ category:category_key, id:target, name:relation.name, role,
                    ...(relation.count !== undefined ? {count:relation.count} : {}) }];
                (data.source.references ||= []).push(`${relation.category}:${relation.id}:${relation.role}`);
                return [];
            }
            if (relation.source_id === undefined) return [{ category: category_key, id: relation.id, name: relation.name, role,
                ...(relation.count !== undefined ? { count: relation.count } : {}) }];
            const resolved = archive_external_relation(relation.category as 'character' | 'npc' | 'task', relation.source_id, lang, role);
            if (!resolved) {
                const reference = `${relation.category}:${relation.source_id}:${relation.role}`;
                if (!(data.source.references ||= []).includes(reference)) data.source.references.push(reference);
            }
            return resolved ? [resolved] : [];
        });
        return { id, data: {
            name: data.name, type, description: data.description,
            sections: data.sections.map(section => ({ ...(section.title !== undefined ? { title: section.title } : {}),
                ...(section.kind !== undefined ? { kind: ConvertRaw.get_archive_section_kind(section.kind) } : {}), text: section.text })),
            ...(data.diagnostics ? { diagnostics: data.diagnostics } : {}),
            ...(data.classifications ? { classifications: data.classifications.map(value => ({
                id: value.id, group_id: value.group_id, group_name: value.group_name, name: value.name,
            })) } : {}),
            ...(data.card_type ? { card_type: { id: data.card_type.id, name: data.card_type.name } } : {}),
            ...(data.tags ? { tags: data.tags.map(tag => ({ id: tag.id, name: tag.name,
                ...(tag.order !== undefined ? { order: tag.order } : {}), ...(tag.hidden !== undefined ? { hidden: tag.hidden } : {}),
            })) } : {}),
            entry_talks: data.entry_talks,
            relations,
            images: convert_archive_images(category, data.type, data.images, (name, kind) => archive_image(name, category, id, kind)),
            talks: Object.fromEntries(Object.entries(data.talks).map(([key, talk]) => [key, ConvertRaw.convert_dialogue_keys(convert_archive_talk(talk, lang))])),
            source: { table: data.source.table, id: data.source.id, hashes: data.source.hashes,
                ...(data.source.references ? { references: data.source.references } : {}) },
        } };
    });
    const show = new Map(selected.map(({id, record}) => [id, record.show]));
    const source_ids = new Map(selected.map(({id, source_id}) => [id, source_id]));
    const result = { files, list: files.map(({ id, data }) => ({
        ...create_page({ id, name: data.name, icon: data.images.find(image => image.url && (category !== 'tcg' || data.type !== 'stage' || image.kind === 'opponent'))?.url || null }),
        type: data.type, description: data.description, show: show.get(id) !== false, source_id:source_ids.get(id)!,
        ...(data.classifications ? { classifications: structuredClone(data.classifications) } : {}),
        ...(data.card_type ? { card_type: structuredClone(data.card_type), tags: structuredClone(data.tags) } : {}),
    })) };
    return category === 'miliastra' ? apply_page_groups(result, hall_page_groups(result, records)) : result;
}
