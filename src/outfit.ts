import path from 'node:path';
import type { ContentExport } from '@inteyvat-wiki/wiki-contracts/registry';
import type { OutfitItem, OutfitImage, OutfitCharacter } from '@inteyvat-wiki/wiki-contracts/outfit';
import { isWikiId } from '@inteyvat-wiki/wiki-contracts/ids';
import type { Lang } from './utils/i18n';
import { OutfitData, type OutfitSourceRecord } from './utils/data';
import { ConvertRaw } from './utils/convert_raw';
import { create_page, export_category, named_entries, type PageEntry } from './utils/page';
import { PageReferences } from './utils/page_reference';
import outfit_directory from '~/data/outfits';
import type { OutfitDirectory } from '~/data/data';

export type { OutfitDirectory } from '~/data/data';
export type OutfitAsset = { id: string; name: string; kind: OutfitImage['kind'] };
type ConversionOptions = {
    output: string;
    character: (source_id: number) => OutfitCharacter | null;
    image?: (name: string, relative: string) => string | null;
};

/** Image names come only from the public upstream records; no game tables here. */
export function outfit_image_requests(record: OutfitSourceRecord): Array<{ name: string; kind: OutfitImage['kind'] }> {
    const candidates: Array<{ name: string | undefined; kind: OutfitImage['kind'] }> = [];
    if (record.folder === 'outfits') {
        const source = record.data;
        candidates.push({ name: source.images.filename_icon || source.images.filename_iconCircle, kind: 'icon' });
        if (!source.isDefault) {
            candidates.push({ name: source.images.filename_splash, kind: 'splash' });
            candidates.push({ name: source.images.filename_card, kind: 'card' });
        }
    } else if (record.folder === 'weaponskins') {
        candidates.push({ name: record.data.images.filename_icon, kind: 'icon' });
    } else {
        candidates.push({ name: record.data.images.filename_icon, kind: 'icon' });
        candidates.push({ name: record.data.images.filename_gacha, kind: 'splash' });
    }
    const names = new Set<string>();
    return candidates.flatMap(({name, kind}) => {
        if (!name || names.has(name)) return [];
        names.add(name); return [{ name, kind }];
    });
}

export function convert_outfit_records(records: OutfitSourceRecord[], directory: OutfitDirectory,
    options: ConversionOptions): ContentExport<'outfit'> & { assets: OutfitAsset[] } {
    const indexes = new Map<string, OutfitSourceRecord>();
    for (const record of records) {
        const type = ConvertRaw.get_outfit_type(record.folder);
        const key = `${type}:${record.data.id}`;
        if (indexes.has(key)) throw new Error(`Duplicate outfit source: ${key}`);
        indexes.set(key, record);
    }
    const files: ContentExport<'outfit'>['files'] = [], assets: OutfitAsset[] = [];
    const pages: PageEntry[] = [];
    const used_ids = new Set<string>(), used_sources = new Set<string>();
    const image = options.image || ((name, relative) => ConvertRaw.get_images_url(name, relative, { output: options.output, nullable: true }));
    for (const [key, entries] of Object.entries(directory)) {
        if (!['character', 'weapon', 'glider'].includes(key)) throw new Error(`Unknown outfit directory: ${key}`);
        for (const [id, value] of Object.entries(entries)) {
            if (!isWikiId(id)) throw new Error(`Invalid outfit page ID: ${id}`);
            if (typeof value !== 'number' && (!value || Array.isArray(value) || typeof value !== 'object')) {
                throw new Error(`Invalid outfit directory entry: ${id}`);
            }
        }
        pages.push(...named_entries(entries));
        const selected = Object.entries(entries).flatMap(([id, value]) =>
            typeof value === 'number' ? [[id, value] as const] : Object.entries(value));
        for (const [id, source_id] of selected) {
            if (!isWikiId(id) || used_ids.has(id)) throw new Error(`Invalid/duplicate outfit Wiki ID: ${id}`);
            if (!Number.isSafeInteger(source_id) || source_id <= 0) throw new Error(`Invalid outfit source ID: ${id}`);
            const source_key = `${key}:${source_id}`, record = indexes.get(source_key);
            if (!record || used_sources.has(source_key)) throw new Error(`Missing/duplicate selected outfit: ${id}/${source_key}`);
            used_ids.add(id); used_sources.add(source_key);
            const source = record.data, images: OutfitImage[] = [];
            for (const request of outfit_image_requests(record)) {
                assets.push({ id, ...request });
                const url = image(request.name, `outfit/${id}/${request.kind}`);
                if (url) images.push({ kind: request.kind, url });
            }
            const character = record.folder === 'outfits'
                ? options.character(record.data.characterId) || { id: null, name: record.data.characterName } : null;
            const story = record.folder === 'weaponskins' ? null : record.data.story || null;
            const data: OutfitItem = {
                name: source.name, type: ConvertRaw.get_outfit_type(record.folder),
                description: source.descriptionRaw, story, sources: [...(source.source || [])], character,
                weapon_type: record.folder === 'weaponskins' ? ConvertRaw.get_outfit_weapon_type(record.data.weaponType) : null,
                is_default: record.folder === 'outfits' && record.data.isDefault,
                icon: images.find(value => value.kind === 'icon')?.url || images[0]?.url || null, images,
            };
            files.push({ id, data });
        }
    }
    if (new Set(pages.map(page => page.id)).size !== pages.length) throw new Error('Duplicate outfit page IDs');
    const items = new Map(files.map(file => [file.id, file.data]));
    const list = pages.map(entry => {
        const data = items.get(entry.items[0]!)!;
        const description = entry.items.length === 1 ? data.description
            : entry.items.map((id, index) => {
                const item = items.get(id)!;
                return index === 0 ? item.description : `${item.name}\n${item.description}`;
            }).join('\n\n');
        return create_page({ id: entry.id, name: data.name, icon: data.icon, type: data.type, description,
            character: data.character, weapon_type: data.weapon_type, is_default: data.is_default }, entry);
    });
    return { files, list, assets };
}

export function gen_outfit(lang: Lang, directory: string) {
    const output = path.resolve(directory, '../..');
    const references = new PageReferences(output);
    const result = convert_outfit_records(OutfitData.get_records(lang), outfit_directory, {
        output, character: id => {
            const page = references.resolve('character', id, lang);
            return page ? { id: page.id, name: page.name } : null;
        },
    });
    export_category(directory, result.list, result.files, { assets: result.assets });
}
