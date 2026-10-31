import assert from 'node:assert/strict';
import fs from 'node:fs';
import genshindb from 'genshin-db';
import { archive_directories, directory_entries, directory_id, directory_aliases, valid_directory_id, select_directory_records, type DirectoryCategory } from '../src/utils/archive_directory';
import { get_archive_excluded_ids } from '../src/utils/archive';
import { convert_misc_records } from '../src/misc';

const records = [{id:'card-1', type:'card'}, {id:'card-2', type:'card'}];
assert.deepEqual(select_directory_records(records, {card:{only_second:'card-2'}}).map(entry => entry.record.id), ['card-2']);
assert.throws(() => directory_entries({card:{'../escape':'card-1'}}), /Invalid directory ID/);
assert.throws(() => directory_entries({card:{same:'card-1'}, player:{same:'player-1'}}), /Duplicate/);
assert.throws(() => directory_entries({card:{first:'card-1', second:'card-1'}}), /Duplicate/);
assert.throws(() => select_directory_records(records, {card:{missing:'card-3'}}), /Missing/);
assert.throws(() => select_directory_records([{id:'card-1',type:'player'}], {card:{wrong:'card-1'}}), /mismatched/);
for (const id of ['card-ganyu', 'player-ganyu', 'card_back-fontaine', 'costume-maverick_meowster_magenta-0']) assert(valid_directory_id(id), id);
for (const id of ['card--ganyu', '-ganyu', 'card-ganyu-', 'card/../ganyu', 'card-ganyu.extra']) assert(!valid_directory_id(id), id);
assert.equal(directory_id('tcg', 'card-1101'), 'card-ganyu');
assert.equal(directory_id('tcg', 'player-9510'), 'player-ganyu');
const sample: any = {id:'achievement-1', type:'achievement', order:0, show:true, name:'One', description:'Original',
    sections:[], images:[], relations:[{category:'misc',id:'achievement-2',name:'Two',role:'next_stage'}],
    source:{table:'Test',id:'1',hashes:[]}};
const second = {...structuredClone(sample), id:'achievement-2', source:{table:'Test',id:'2',hashes:[]}, relations:[]};
const before = JSON.stringify([sample, second]);
const subset = convert_misc_records([sample,second], 'en', {achievement:{one:'achievement-1'}});
assert.deepEqual(subset.list.map(page => page.id), ['one']);
assert.deepEqual(subset.files[0].data.relations, []);
assert(subset.files[0].data.source.references!.includes('misc:achievement-2:next_stage'));
assert.equal(JSON.stringify([sample,second]), before);

const ids = new Map(Object.entries(archive_directories).map(([category,directory]) => [category,new Set(directory_entries(directory).map(entry => entry.id))]));
for (const category of Object.keys(archive_directories) as DirectoryCategory[]) {
    const entries = directory_entries(archive_directories[category]);
    const query = genshindb[category] as Function;
    const source = query('names',{resultLanguage:'English',queryLanguages:['English'],matchCategories:true,verboseCategories:true,matchNames:false,matchAltNames:false});
    if (category === 'misc') {
        for (const id of [1721,1930,2034,2174,2187,2258,2300,2301,2302,2303,2328,2440,2441,2442,2448,2449,2450,2451,2565,2579,2580,2827,2829]) {
            assert(source.some((record: any) => record.id === `tutorial-${id}`), 'test tutorial must remain upstream');
            assert.equal(directory_id('misc', `tutorial-${id}`), undefined, 'explicit test tutorial must not be exported');
        }
        for (const id of [1022,1330,2575,2773,2855,2856]) assert(directory_id('misc', `tutorial-${id}`), 'shared formal tutorials and quest materials must stay');
    }
    const excluded = category === 'misc' ? new Set() : get_archive_excluded_ids(category,source);
    assert(entries.every(entry => source.some((record:any) => record.id === entry.source_id) && !excluded.has(entry.source_id)));
    const aliases = JSON.parse(fs.readFileSync(`data/common/${category}/source_ids.json`,'utf8'));
    assert.deepEqual(aliases,Object.fromEntries(entries.map(entry=>[entry.source_id,entry.id])));
    const wiki_aliases = directory_aliases(category);
    assert.deepEqual(JSON.parse(fs.readFileSync(`data/common/${category}/id_aliases.json`, 'utf8')), wiki_aliases);
    for (const [old, canonical] of Object.entries(wiki_aliases)) {
        assert(!ids.get(category)!.has(old), 'an alias must not shadow a canonical ID');
        assert(ids.get(category)!.has(canonical), 'aliases must resolve directly to current IDs');
    }
    for (const lang of ['zh_hans','en']) {
        const pages = JSON.parse(fs.readFileSync(`data/${lang}/${category}/pages.json`,'utf8'));
        assert.deepEqual(pages.map((page:any)=>page.id),entries.map(entry=>entry.id));
        assert.deepEqual(pages.map((page:any)=>page.source_id),entries.map(entry=>entry.source_id));
        const files = fs.readdirSync(`data/${lang}/${category}/items`).filter(file=>file.endsWith('.json')).map(file=>file.slice(0,-5));
        assert.deepEqual(files.sort(), [...ids.get(category)!].sort(), 'stale numeric-name JSON must be pruned');
        for (const entry of entries) {
            const item = JSON.parse(fs.readFileSync(`data/${lang}/${category}/items/${entry.id}.json`,'utf8'));
            assert.equal(item.type,entry.type);
            assert.equal(item.source.id,entry.source_id.slice(entry.type.length+1));
            for (const relation of item.relations) if (ids.has(relation.category)) assert(ids.get(relation.category)!.has(relation.id), `${category}/${entry.id}: dangling ${relation.category}/${relation.id}`);
            assert(!('layout' in item), 'unused furnishing layout must not be published');
            for (const image of item.images) if (image.url) assert(image.url.startsWith(`/images/${category}/${entry.id}/`));
        }
    }
    console.log(`${category}: ${entries.length} maintained IDs, bilingual files, source anchors, image paths and relation mappings passed.`);
}
assert.equal(directory_id('misc','achievement_group-0'),'wonders_of_the_world');
console.log('Explicit directory subset selection, malformed/duplicate IDs, missing source errors and source immutability passed.');
