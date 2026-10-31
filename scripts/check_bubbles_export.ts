import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { get_task_export, get_task_id_map } from '../src/task';
import type { Task } from '../src/types/task';

const read = fs.readFileSync;
fs.readFileSync = ((file: any, ...args: any[]) => {
    const name = String(file).replaceAll('\\', '/');
    assert(!/(?:\/ExcelBinOutput\/|\/BinOutput\/|\/TextMap\/|\/src\/lua\/|\.luac$|GenshinData-scripts\/config\.json)/i.test(name),
        `Task export attempted to bypass genshin-db: ${name}`);
    return (read as any)(file, ...args);
}) as typeof fs.readFileSync;

const output = path.resolve('.cache/bubble-export-check');
const summaries: any[] = [];
for (const lang of ['zh_hans', 'en'] as const) {
    const directory = path.join(output, lang, 'task');
    const { files } = get_task_export(lang);
    fs.mkdirSync(path.join(directory, 'items'), { recursive: true });
    const rejected_ids = files.map(file => file.id).filter(id => !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(id));
    let with_text = 0, with_events = 0, text_events = 0, cleanup = 0, conditions = 0, delayed = 0, callbacks = 0;
    let other_changes = 0;
    for (const { id, task } of files) {
        const file = `${id}.json`;
        const bubbles = Object.values(task.bubbles || {});
        if (bubbles.length) with_events++;
        if (bubbles.some(bubble => bubble.dialog)) with_text++;
        if (bubbles.length) {
            // Inspection samples only; production ID validation is reported separately.
            assert.ok(/^[a-zA-Z0-9_.-]+$/.test(id) && !id.includes('..'));
            fs.writeFileSync(path.join(directory, 'items', file), JSON.stringify(task, null, 2));
        }
        for (const bubble of bubbles) {
            assert.ok(task.steps[String(bubble.step)], `${file}: bubble step does not exist`);
            assert.ok(['start', 'finish', 'failed'].includes(bubble.event));
            assert.ok(bubble.source.includes('.luac:'));
            assert.ok(bubble.api, `${file}: source API must survive database querying`);
            assert.ok(['quest', 'npc'].includes(bubble.scope));
            assert.equal(Boolean(bubble.dialog), bubble.action === 'create' || bubble.action === 'trigger');
            assert.equal(typeof bubble.npc_id === 'number', bubble.action !== 'clear_task');
            assert.ok(!bubble.delay_unknown || bubble.delay === undefined, 'unknown delay must not be exported as a numeric total');
            if (bubble.dialog) {
                text_events++;
                assert.ok(bubble.npc_id! > 0 && bubble.dialog_id! > 0 && bubble.dialog.content);
                assert.deepEqual(bubble.dialog.next_dialogs, []);
            } else { cleanup++; assert.ok(bubble.action.startsWith('clear')); }
            if (bubble.conditions.length) conditions++;
            if (bubble.delay) delayed++;
            if (bubble.callbacks?.length) callbacks++;
            if (bubble.after) assert.ok(task.narrations[bubble.after], `${file}: dangling narration completion reference`);
        }
        const existing = path.resolve('data', lang, 'task/items', file);
        if (fs.existsSync(existing)) {
            const old: Task = JSON.parse(fs.readFileSync(existing, 'utf8'));
            const { bubbles: _new, ...rest } = task;
            const { bubbles: _old, ...old_rest } = old;
            if (JSON.stringify(rest) !== JSON.stringify(old_rest)) other_changes++;
        }
    }
    const id = get_task_id_map().get(2017)!;
    const task: Task = JSON.parse(fs.readFileSync(path.join(directory, 'items', `${id}.json`), 'utf8'));
    assert.ok(Object.values(task.bubbles || {}).some(bubble => bubble.dialog_id === 20179902));
    const english_file = path.join(output, 'zh_hans/task/items', `${id}.json`);
    if (lang === 'en') {
        const chinese: Task = JSON.parse(fs.readFileSync(english_file, 'utf8'));
        assert.deepEqual(Object.keys(task.bubbles || {}), Object.keys(chinese.bubbles || {}), 'sample event identity must be language-independent');
    }
    summaries.push({ lang, tasks: files.length, tasksWithEvents: with_events, tasksWithText: with_text,
        textEvents: text_events, cleanupEvents: cleanup, conditionedEvents: conditions, delayedEvents: delayed,
        callbackEvents: callbacks, existingTasksWithOtherChanges: other_changes, example2017: id });
    summaries.at(-1).productionIdValidationFailures = rejected_ids;
}
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summaries, null, 2));
console.log(JSON.stringify(summaries, null, 2));
fs.readFileSync = read;
