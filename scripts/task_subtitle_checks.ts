import assert from 'node:assert/strict';
import fs from 'node:fs';
import genshindb from 'genshin-db';
import { get_task_subtitles } from '../src/utils/task_subtitles';

export function check_task_subtitles(kind: 'narration' | 'bubble') {
    const read = fs.readFileSync;
    fs.readFileSync = ((file: any, ...args: any[]) => {
        const name = String(file).replaceAll('\\', '/');
        assert(!/(?:\/ExcelBinOutput\/|\/BinOutput\/|\/TextMap\/|\/src\/lua\/|\.luac$|GenshinData-scripts\/config\.json)/i.test(name),
            `Wiki task export attempted to read source input: ${name}`);
        return (read as any)(file, ...args);
    }) as typeof fs.readFileSync;
    try {
        for (const lang of ['zh_hans', 'en'] as const) {
            const language = lang === 'en' ? genshindb.Language.English : genshindb.Language.ChineseSimplified;
            const record = genshindb.tasksubtitles('2017', { resultLanguage: language, queryLanguages: [language],
                matchIds: true, matchNames: false, matchAltNames: false })!;
            assert(record);
            const before = JSON.stringify(record);
            const value = get_task_subtitles(2017, new Map([[201711, 11], [201713, 13], [201715, 15]]), lang);
            const bubble = Object.values(value.bubbles).find(bubble => bubble.dialog_id === 20179902)!;
            assert(bubble?.dialog);
            assert.equal(bubble.step, 11);
            assert.equal(bubble.npc_id, 12260);
            assert.equal(bubble.dialog_speaker?.id, '12139');
            assert.equal(bubble.dialog.content, lang === 'zh_hans' ? '好像是神像那边…' : record.bubbles[Object.keys(record.bubbles)
                .find(key => record.bubbles[key]!.dialog_id === 20179902)!]!.dialog!.content);
            assert.deepEqual(bubble.parameters, [5, true, 2, 3, true]);
            assert.deepEqual(Object.values(value.bubbles).filter(bubble => bubble.action === 'clear_task').map(bubble => bubble.step).sort((a, b) => a - b), [11, 13, 15]);
            assert.deepEqual(get_task_subtitles(2017, new Map(), lang), { narrations: {}, bubbles: {} });
            assert.equal(JSON.stringify(record), before, 'step remapping must not mutate genshin-db');
            const narrations = get_task_subtitles(76202, new Map([[7620210, 10]]), lang).narrations;
            assert(Object.values(narrations).length);
            assert(Object.values(narrations).every(narration => narration.step === 10));
            if (lang === 'zh_hans') assert(Object.values(narrations).some(narration => Object.values(narration.dialogs)
                .some(dialog => dialog.content === '…茶还是温的呢。嗯，真美味。')));
            for (const [id, narration] of Object.entries(narrations)) assert(id.startsWith(`${narration.event}:10:`));
        }
        console.log(`Task ${kind} query, raw-step remapping, text and lifecycle checks passed without raw inputs.`);
    } finally { fs.readFileSync = read; }
}
