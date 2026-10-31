import { grouped_entries } from '~/utils/page';
import type { PageDataTrait } from '~/types/common';
import hall_groups from '~/data/miliastra_hall_groups';

type GroupItem = { type: string; name: string; description: string;
    relations: { category: string; id: string; role: string }[];
    images: { name: string; kind?: string }[] };
type GroupPage = PageDataTrait & { description: string; source_id?: string };
type PageGroup = { items: string[]; mode: 'stages' | 'variants'; name?: string };

export function apply_page_groups<T extends GroupItem, P extends GroupPage>(result: { files: { id: string; data: T }[]; list: P[] }, groups: PageGroup[]) {
    const items = new Map(result.files.map(file => [file.id, file.data]));
    const members = new Map<string, { entry: ReturnType<typeof grouped_entries>[number]; group: PageGroup }>();
    for (const group of groups) {
        for (const id of group.items) {
            if (!items.has(id) || members.has(id)) throw new Error(`Missing or repeated page-group member: ${id}`);
        }
        const entries = grouped_entries([{ id: group.items[0]!, items: group.items, grouped: true }]);
        for (const entry of entries) members.set(entry.id, { entry, group });
    }
    return { files: result.files, list: result.list.map(page => {
        const member = members.get(page.id);
        if (!member) return page;
        const { group, entry } = member;
        const values = group.items.map(id => items.get(id)!);
        return { ...page, name: group.name || values[0]!.name,
            description: values.map(item => group.mode === 'variants' ? `${item.name}\n${item.description}` : item.description)
                .join(group.mode === 'variants' ? '\n\n' : '\n'),
            show: page.show && entry.show, items: entry.items, related_items: entry.related_items,
            group: { id: group.items[0]!, mode: group.mode },
        };
    }) };
}

export function hall_page_groups<T extends GroupItem, P extends GroupPage>(result: { files: { id: string; data: T }[]; list: P[] }, source?: { id: string; images: { name: string; kind?: string }[] }[]): PageGroup[] {
    const sources = new Map(result.list.map(page => [page.source_id, page.id]));
    const items = new Map(result.files.map(file => [file.id, file.data]));
    return (hall_groups as readonly (readonly string[])[]).flatMap(pair => {
        const ids = pair.map(source => sources.get(source));
        if (!ids.every((id): id is string => !!id && items.has(id))) return [];
        const values = ids.map(id => items.get(id)!);
        const images = source ? pair.map(id => source.find(record => record.id === id)!.images) : values.map(item => item.images);
        const theme = images[0]!.find(image => image.kind === 'theme')?.name;
        if (!theme || images[1]!.find(image => image.kind === 'theme')?.name !== `${theme}_Public`) {
            throw new Error(`Miliastra hall pair assets changed: ${pair.join('/')}`);
        }
        const titles = values.map(item => item.name.split(/[·:]/)[0]!.trim());
        const name = titles[0] && titles.every(title => title === titles[0]) ? titles[0] : values[0]!.name;
        return [{ items: ids, mode: 'variants' as const, name }];
    });
}

export function achievement_page_groups<T extends GroupItem>(files: { id: string; data: T }[]): PageGroup[] {
    const items = new Map(files.filter(file => file.data.type === 'achievement').map(file => [file.id, file.data]));
    const link = (id: string, role: string) => items.get(id)?.relations.filter(value => value.category === 'misc' && value.role === role) || [];
    for (const [id] of items) {
        if (link(id, 'previous_stage').length > 1 || link(id, 'next_stage').length > 1) throw new Error(`Branched achievement: ${id}`);
        for (const [role, reverse] of [['previous_stage', 'next_stage'], ['next_stage', 'previous_stage']]) {
            for (const relation of link(id, role)) if (!items.has(relation.id) || !link(relation.id, reverse).some(value => value.id === id)) {
                throw new Error(`Unclosed achievement: ${id}`);
            }
        }
    }
    const visited = new Set<string>(), groups: PageGroup[] = [];
    for (const [id] of items) {
        if (link(id, 'previous_stage').length) continue;
        const chain: string[] = []; let current: string | undefined = id;
        while (current) {
            if (visited.has(current)) throw new Error(`Cyclic achievement: ${current}`);
            chain.push(current); visited.add(current); current = link(current, 'next_stage')[0]?.id;
        }
        if (chain.length > 1) groups.push({ items: chain, mode: 'stages' });
    }
    if (visited.size !== items.size) throw new Error('Cyclic achievement stages');
    return groups;
}
