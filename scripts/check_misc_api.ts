import assert from 'node:assert/strict';
import { MISC_TYPES, type MiscItem, type MiscPage } from '../src/types/misc';
import { directory_id } from '../src/utils/archive_directory';

async function main() {
    const base = process.argv[2] || 'http://127.0.0.1:4010';
    const expected = { achievement: 1854, achievement_group: 73, namecard: 293, profile_picture: 187, profile_frame: 12,
        expedition: 48, gallant_path: 13, loading_tip: 995, tutorial: 2213, graeae_message: 24 };
    let identities: string[] | undefined;
    for (const lang of ['zh_hans', 'en']) {
        const response = await fetch(`${base}/api/misc?lang=${lang}`);
        assert.equal(response.status, 200, `${lang}: misc list`);
        const pages = await response.json() as MiscPage[];
        for (const page of pages.filter(page => page.type === 'achievement')) {
            assert(!/\{param\d+\}/.test(page.description), `${lang}/${page.id}: unresolved achievement description`);
        }
        for (const [id, target] of [[80197, 30], [80198, 150], [80199, 300]]) {
            const page = pages.find(page => page.id === directory_id('misc', `achievement-${id}`))!;
            const detail = await fetch(`${base}/api/misc/${page.id}?lang=${lang}`).then(response => response.json()) as MiscItem;
            assert(page.description.includes(String(target)));
            // List summaries combine all stages; each source item keeps its own stage.
            assert(page.description.includes(detail.description));
        }
        assert.equal(pages.length, Object.values(expected).reduce((sum, value) => sum + value, 0));
        const ids = pages.map(page => page.id).sort();
        assert.equal(new Set(ids).size, ids.length);
        if (identities) assert.deepEqual(ids, identities);
        identities = ids;
        for (const type of MISC_TYPES) {
            const list = pages.filter(page => page.type === type);
            assert.equal(list.length, expected[type]);
            const sample = list.find(page => page.show && page.name) || list[0];
            const detail = await fetch(`${base}/api/misc/${sample.id}?lang=${lang}`);
            assert.equal(detail.status, 200, `${lang}/${sample.id}`);
            const item = await detail.json() as MiscItem;
            assert.equal(item.type, type);
            assert.equal(typeof item.source.id, 'string');
            assert(Array.isArray(item.sections) && Array.isArray(item.images));
            assert(!('talks' in item) && !('layout' in item));
            for (const text of [item.name, item.description, ...item.sections.flatMap(section => [section.title || '', section.text])]) {
                assert(!/<\/?color\b/i.test(text), `${sample.id}: unprocessed game colour tag`);
                assert(!text.includes('\\n'), `${sample.id}: literal source newline`);
                assert(!/<(?:script|img|iframe|svg)\b/i.test(text), `${sample.id}: raw active source HTML`);
            }
            for (const image of item.images) {
                assert.equal(typeof image.name, 'string');
                if (!image.url) continue;
                assert(image.url.startsWith('/images/misc/'));
                assert.equal((await fetch(base + image.url, { method: 'HEAD' })).status, 200, image.url);
            }
            console.log(`${lang}/${type}: shared item, text, metadata and real image URLs passed`);
        }
        const unnamed = pages.find(page => page.type === 'tutorial' && !page.name && page.show);
        const categories = new Set(['element', 'enemy', 'system', 'adventure', 'activity', 'other']);
        for (const page of pages.filter(page => page.type === 'tutorial')) assert(categories.has(page.tutorial_category!));
        let messages = 0, replies = 0, attachments = 0;
        for (const page of pages.filter(page => page.type === 'graeae_message')) {
            const response = await fetch(`${base}/api/misc/${page.id}?lang=${lang}`);
            assert.equal(response.status, 200);
            const item = await response.json() as MiscItem;
            assert(item.message_thread?.initial.length);
            for (const node of item.message_thread!.nodes) {
                if (node.kind === 'option') replies++;
                else if (node.kind !== 'control') messages++;
                for (const text of [node.text, node.speaker || '', node.location || '']) {
                    assert(!/<\/?color\b|<(?:script|img|iframe|svg)\b/i.test(text));
                    assert(!text.includes('\\n'));
                }
                if (node.image) {
                    attachments++;
                    assert(node.image.url);
                    assert.equal((await fetch(base + node.image.url, { method: 'HEAD' })).status, 200);
                }
            }
        }
        assert.deepEqual([messages, replies, attachments], [260, 45, 2]);
        assert(unnamed, `${lang}: original titleless tutorial must be accessible`);
        const tutorial = await fetch(`${base}/api/misc/${unnamed.id}?lang=${lang}`).then(response => response.json()) as MiscItem;
        assert.equal(tutorial.name, '', 'a UI placeholder must not overwrite the original source title');
        assert(tutorial.sections.some(section => section.text) || tutorial.images.length > 0);
        assert.equal((await fetch(`${base}/api/misc/not-a-misc-id?lang=${lang}`)).status, 404);
        assert.equal((await fetch(`${base}/api/misc/tutorial-999999999?lang=${lang}`)).status, 404);
        assert.equal((await fetch(`${base}/api/misc/mail_template-1001?lang=${lang}`)).status, 404);
        const zero = await fetch(`${base}/api/misc/${directory_id('misc', 'achievement_group-0')}?lang=${lang}`).then(response => response.json()) as MiscItem;
        assert.equal(zero.source.id, '0');
        assert(zero.relations.length > 0);
        const membership = new Set<string>();
        for (const page of pages.filter(page => page.type === 'achievement_group')) {
            const group = await fetch(`${base}/api/misc/${page.id}?lang=${lang}`).then(response => response.json()) as MiscItem;
            for (const relation of group.relations.filter(relation => relation.role === 'achievement')) {
                assert(!membership.has(relation.id));
                membership.add(relation.id);
            }
        }
        assert.equal(membership.size, 1854);
    }
    console.log('Misc production API integration passed for both languages and all ten types, including all Graeae threads.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
