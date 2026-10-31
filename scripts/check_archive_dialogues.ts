import assert from 'node:assert/strict';
import genshindb from 'genshin-db';
import { convert_archive_talk } from '../src/utils/archive';
import { get_task_conditions } from '../src/utils/task_condition';

for (const lang of ['zh_hans', 'en'] as const) {
    const convert = (params: string[]) => get_task_conditions({ logic: 'LOGIC_AND', conditions: [
        { type: 'QUEST_COND_HOMEWORLD_NPC_NEW_TALK', params },
    ] }, new Map(), new Map(), lang)[0]!;
    const old_topic = convert(['9002', '6900207', '0', '', '']);
    const new_topic = convert(['9002', '6900207', '1']);
    assert(typeof old_topic !== 'string' && old_topic.type === 'boolean'
        && typeof new_topic !== 'string' && new_topic.type === 'boolean');
    assert.equal(old_topic.id, new_topic.id, 'new/old variants must share one state');
    assert.equal(old_topic.type, 'boolean');
    assert.equal(old_topic.value, false);
    assert.equal(new_topic.value, true);
    const other_topic = convert(['9002', '6900208', '1']);
    assert(typeof other_topic !== 'string');
    assert.notEqual(new_topic.id, other_topic.id, 'different topics must remain independent');

    const language = lang === 'en' ? genshindb.Language.English : genshindb.Language.ChineseSimplified;
    const source = genshindb.serenitea('companion-9002', { resultLanguage: language, queryLanguages: [language],
        matchIds: true, matchNames: false, matchAltNames: false })!;
    assert(source);
    const talks = new Map(Object.values(source.talks).map(talk => [talk.source_id, convert_archive_talk(talk, lang)]));
    const ordinary = talks.get(6900202)!, highlighted = talks.get(6900207)!;
    const ordinary_state = ordinary.conditions.find(token => typeof token !== 'string')!;
    const highlighted_state = highlighted.conditions.find(token => typeof token !== 'string')!;
    assert(typeof ordinary_state !== 'string' && ordinary_state.type === 'boolean'
        && typeof highlighted_state !== 'string' && highlighted_state.type === 'boolean');
    assert.equal(ordinary_state.id, highlighted_state.id);
    assert.equal(ordinary_state.value, false);
    assert.equal(highlighted_state.value, true);
    assert.equal(ordinary.title, ordinary.dialogs[1]!.content, 'source menu prompt must survive');
    assert.notEqual(ordinary.title, ordinary.dialogs[ordinary.initial_dialogs![0]!.dialog]!.content,
        'menu prompt and interaction entry are different source concepts');
    const fork = Object.values(ordinary.dialogs).find(dialog => dialog.next_dialogs.length === 2)!;
    assert(fork);
    assert(fork.next_dialogs.every(next => ordinary.dialogs[next.dialog]!.role === 'select'));
    const original = Object.values(source.talks).find(talk => talk.source_id === 6900202)!;
    assert.equal(Object.keys(ordinary.dialogs).length, original.source_dialogue!.dialogs.length);
}

let checked = 0;
const records = genshindb.serenitea('names', { resultLanguage: genshindb.Language.ChineseSimplified, matchCategories: true, verboseCategories: true })!;
assert(Array.isArray(records));
for (const record of records) for (const talk of Object.values(record.talks)) {
    for (const condition of talk.source_dialogue?.conditions.conditions || []) {
        if (condition.type !== 'QUEST_COND_HOMEWORLD_NPC_NEW_TALK') continue;
        assert(['0', '1'].includes(String(condition.params[2])), `Unexpected topic state: ${talk.source_id}`);
        const result = get_task_conditions({ logic: 'LOGIC_AND', conditions: [
            { type: condition.type, params: condition.params },
        ] }, new Map(), new Map(), 'zh_hans')[0]!;
        assert(typeof result !== 'string' && result.type === 'boolean');
        assert.equal(result.id, JSON.stringify(['homeworld_new_talk', condition.params.slice(0, 2)]));
        assert.equal(result.value, condition.params[2] === '1');
        checked++;
    }
}
console.log(`${checked} source topic conditions checked; bilingual menu prompts, mutually exclusive states and dialogue choices passed.`);
