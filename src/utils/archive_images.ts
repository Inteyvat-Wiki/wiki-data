import { ConvertRaw } from './convert_raw';

type SourceImage = { name: string; kind?: string; replaces?: string };
type Image = { name: string; kind?: string; url: string | null };

/** Select publication assets here; the UI never interprets source resource keys. */
export function convert_archive_images(category: string, type: string, source: SourceImage[], resolve: (name: string, kind?: string) => Image | null): Image[] {
    const selected = source.map(image => ({ ...image, kind: ConvertRaw.get_archive_image_kind(image.kind) })).filter(image => {
        if (/^\d+$/.test(image.name) || /prefab|config/i.test(image.kind || '')) return false;
        if (category === 'tcg') {
            if (type === 'card') return image.kind === 'card';
            if (type === 'stage') return image.kind === 'opponent';
        }
        if (category === 'serenitea' && type === 'companion') return image.kind === 'portrait';
        if (category === 'serenitea' && type === 'suite') return image.kind !== 'map_icon';
        if (category === 'misc' && type === 'tutorial') return image.kind !== 'icon';
        return true;
    });
    if (category === 'serenitea' && type === 'companion') {
        for (const image of selected) {
            const result = resolve(image.name, image.kind);
            if (result?.url) return [result];
        }
        return [];
    }
    // Resolve replacements first, so an unused thumbnail is never copied or manifested.
    const replacements = new Map(selected.filter(image => image.replaces).map(image => [image.name, resolve(image.name, image.kind)]));
    const replaced = new Set(selected.filter(image => image.replaces && replacements.get(image.name)?.url).map(image => image.replaces));
    const images = selected.flatMap(image => {
        if (replaced.has(image.name)) return [];
        const result = replacements.has(image.name) ? replacements.get(image.name) : resolve(image.name, image.kind);
        return result ? [result] : [];
    });
    return images;
}
