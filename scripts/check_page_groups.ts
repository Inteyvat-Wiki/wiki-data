import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grouped_entries } from '../src/utils/page';
import { apply_page_groups, achievement_page_groups, hall_page_groups } from '../src/utils/page_groups';

assert.deepEqual(grouped_entries([{ id: 'a', items: ['a', 'b'], grouped: true }]).map(page => [page.id, page.show]), [['a', true], ['b', false]]);
assert.equal(grouped_entries([{ id: 'book_group', items: ['a', 'b'], grouped: true }]).length, 3, 'existing external group IDs stay supported');
const item = (id: string, relations: { category: string; id: string; role: string }[] = []) => ({ id,
    data: { type: 'achievement', name: id, description: id, images: [], relations } });
const edge = (id: string, role: string) => ({ category: 'misc', id, role });
const chain = [item('a', [edge('b', 'next_stage')]), item('b', [edge('a', 'previous_stage')])];
assert.deepEqual(achievement_page_groups(chain), [{ items: ['a', 'b'], mode: 'stages' }]);
assert.throws(() => achievement_page_groups([chain[0]!]), /Unclosed/);
assert.throws(() => achievement_page_groups([item('a', [edge('b', 'next_stage'), edge('c', 'next_stage')])]), /Branched/);
assert.throws(() => achievement_page_groups([
    item('a', [edge('b', 'next_stage'), edge('b', 'previous_stage')]),
    item('b', [edge('a', 'next_stage'), edge('a', 'previous_stage')]),
]), /Cyclic/);
const halls = { files: [
    { ...item('private'), data: { ...item('private').data, type: 'hall', images: [{ name: 'UI_Beyd_HallThemeImg_Test', kind: 'theme' }] } },
    { ...item('public'), data: { ...item('public').data, type: 'hall', images: [{ name: 'UI_Beyd_HallThemeImg_Test_Public', kind: 'theme' }] } },
], list: [
    { id: 'private', source_id: 'hall-11', description: '', name: '', icon: null, star: null, show: true, items: ['private'], related_items: [] },
    { id: 'public', source_id: 'hall-1011', description: '', name: '', icon: null, star: null, show: true, items: ['public'], related_items: [] },
] };
const groups = hall_page_groups(halls);
assert.equal(groups.length, 1);
assert.equal(hall_page_groups({ ...halls, list: halls.list.slice(0, 1) }).length, 0, 'subsets stay independent');
const broken = structuredClone(halls); broken.files[1]!.data.images = [];
assert.throws(() => hall_page_groups(broken), /pair assets changed/);
assert.throws(() => apply_page_groups(halls, [...groups, ...groups]), /repeated/);
const before = JSON.stringify(halls);
assert.equal(apply_page_groups(halls, groups).files, halls.files, 'grouping must not rewrite raw item objects');
assert.equal(JSON.stringify(halls), before);
for (const lang of ['zh_hans', 'en']) for (const category of ['miliastra', 'misc']) {
    const pages = JSON.parse(fs.readFileSync(`data/${lang}/${category}/pages.json`, 'utf8'));
    const ids = new Set(pages.map((page: any) => page.id));
    const roots = pages.filter((page: any) => page.group && page.show);
    assert.equal(roots.length, category === 'miliastra' ? 9 : 148);
    for (const page of pages.filter((page: any) => page.group)) {
        const root = pages.find((value: any) => value.id === page.group.id);
        assert(root && root.show && root.items.includes(page.id));
        assert([...page.items, ...page.related_items].every(id => ids.has(id)));
    }
}
console.log('Exported page groups: legacy grouping, closure, cycles, branches, subsets, assets, bilingual roots and immutable item records passed.');
