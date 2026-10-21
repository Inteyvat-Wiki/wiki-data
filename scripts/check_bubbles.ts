import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LuaInspector, lua_opcodes, read_lua, type LuaPrototype } from '../src/utils/lua';
import { get_task_bubbles } from '../src/utils/task_bubble';
import { get_task_narrations } from '../src/utils/task_narration';

function word(op: string, a = 0, b = 0, c = 0) {
    return (lua_opcodes.indexOf(op) | a << 6 | c << 14 | b << 23) >>> 0;
}
const event: LuaPrototype = {
    path: '0_0', params: 1, stack: 8, upvalues: [], children: [],
    constants: ['CreateSpeechBubbleTask', 123, 456],
    code: [word('SELF', 1, 0, 256), word('LOADK', 3, 0, 1), word('LOADK', 4, 0, 2),
        word('CALL', 1, 4, 1), word('RETURN', 0, 1)],
};
const root: LuaPrototype = {
    path: '0', params: 0, stack: 8, upvalues: [[0, 0]], children: [event],
    constants: ['defaultAlias', 'Quest42', 'OnSubFailed4201'],
    code: [word('NEWTABLE'), word('LOADK', 1, 0, 1), word('SETTABLE', 0, 256, 1),
        word('CLOSURE', 1), word('SETTABLE', 0, 258, 1), word('RETURN', 0, 2)],
};
const inspector = new LuaInspector('bubble-fixture', root, new Map());
inspector.load();
assert.deepEqual(inspector.inspect('OnSubFailed4201'), []);
assert.deepEqual(inspector.inspect('OnSubFailed4201', 'speech_bubble').map(call => [call.method, call.args]),
    [['CreateSpeechBubbleTask', [123, 456]]]);
// One branch returns; only the other branch may register the bubble.
event.code = [word('TEST', 0, 0, 0), word('JMP', 0, 256, 1), word('RETURN', 0, 1), ...event.code];
assert.equal(inspector.inspect('OnSubFailed4201', 'speech_bubble')[0].guards.length, 1);
event.code = [word('RETURN', 0, 1), ...event.code];
assert.deepEqual(inspector.inspect('OnSubFailed4201', 'speech_bubble'), []);

// Unknown native closure arguments are not assumed to execute.
event.code = [word('SELF', 1, 0, 259), word('CLOSURE', 3), word('CALL', 1, 3, 1), word('RETURN', 0, 1)];
event.constants[3] = 'UnknownNativeCallback';
event.children = [{ ...event, path: '0_0_0', children: [], constants: ['TriggerNpcSpeechBubble', 123, 456],
    code: [word('SELF', 1, 0, 256), word('LOADK', 3, 0, 1), word('LOADK', 4, 0, 2),
        word('CALL', 1, 4, 1), word('RETURN', 0, 1)] }];
assert.deepEqual(inspector.inspect('OnSubFailed4201', 'speech_bubble'), []);
event.constants[3] = 'ActionSafeCall';
const safe = inspector.inspect('OnSubFailed4201', 'speech_bubble');
assert.equal(safe.length, 1);
assert.equal(safe[0].callbacks?.[0].method, 'ActionSafeCall');
event.constants = ['ClearSpeechBubbleTask'];
event.children = [];
event.code = [word('SELF', 1, 0, 256), word('CALL', 1, 2, 1), word('RETURN', 0, 1)];
assert.deepEqual(inspector.inspect('OnSubFailed4201', 'speech_bubble').map(call => [call.method, call.args]),
    [['ClearSpeechBubbleTask', []]]);

const lua = path.resolve('src/lua');
if (fs.existsSync(path.join(lua, '14798.luac'))) {
    const data = get_task_bubbles(2017, new Map([[201711, 11]]), 'zh_hans');
    const bubble = Object.values(data).find(item => item.dialog_id === 20179902);
    assert.ok(bubble, 'real task bubble must resolve');
    assert.equal(bubble.step, 11);
    assert.equal(bubble.event, 'start');
    assert.equal(bubble.action, 'create');
    assert.equal(bubble.npc_id, 12260);
    assert.equal(bubble.dialog?.content, '好像是神像那边…');
    assert.equal(bubble.dialog_speaker?.id, '12139');
    assert.deepEqual(bubble.parameters, [5, true, 2, 3, true]);
    assert.deepEqual(bubble.dialog?.next_dialogs, [], 'one bubble must not expand the next-dialog chain');
    const english = Object.values(get_task_bubbles(2017, new Map([[201711, 11]]), 'en')).find(item => item.dialog_id === 20179902);
    assert.ok(english?.dialog?.content && english.dialog.content !== bubble.dialog.content);
    assert.deepEqual(get_task_bubbles(2017, new Map(), 'zh_hans'), {}, 'unexported steps must not be guessed');
    const lifecycle = Object.values(get_task_bubbles(2017, new Map([[201711, 11], [201713, 13], [201715, 15]]), 'zh_hans'));
    // SneakClear is shared by three START entries, not a presumed step-finish cleanup.
    const clears = lifecycle.filter(item => item.action === 'clear_task');
    assert.deepEqual(clears.map(item => item.step).sort((a, b) => a - b), [11, 13, 15]);
    assert.ok(clears.every(item => item.event === 'start' && item.source.endsWith(':0_15:17')));

    // Existing narration extraction remains independent of bubble indexing.
    const narration = get_task_narrations(76202, new Map([[7620210, 10]]), 'zh_hans');
    assert.ok(Object.values(narration).some(item => Object.values(item.dialogs).some(dialog => dialog.content === '…茶还是温的呢。嗯，真美味。')));
}
console.log('Bubble checks passed');
