import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LuaInspector, lua_bubble_methods, read_lua, type LuaCall, type LuaPrototype } from './lua';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lua_path = path.join(project, 'src/lua');
export type LuaTaskPlacement = { step: number, event: 'start' | 'finish' | 'failed', call: LuaCall };
let placements: Record<'narration' | 'speech_bubble', Map<number, LuaTaskPlacement[]>> | undefined;

function files(folder: string): string[] {
    if (!fs.existsSync(folder)) return [];
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(folder, entry.name);
        return entry.isDirectory() ? files(file) : [file];
    }).sort();
}

function has_bubbles(root: LuaPrototype): boolean {
    return root.constants.some(value => lua_bubble_methods.has(value)) || root.children.some(has_bubbles);
}

export function get_task_lua_placements(mode: 'narration' | 'speech_bubble'): Map<number, LuaTaskPlacement[]> {
    if (placements) return placements[mode];
    placements = { narration: new Map(), speech_bubble: new Map() };
    const chunks = files(lua_path).filter(file => /\.(luac|lua|bytes|bin)$/i.test(file)).flatMap(file => {
        try { return [{ file, root: read_lua(file) }]; }
        catch (error) { console.warn(`task Lua: ${file}: ${String(error)}`); return []; }
    });
    const configs = new Map<number, Record<string, any>>(), ambiguous = new Set<number>();
    for (const { file, root } of chunks) {
        if (!root.constants.includes('MainID')) continue;
        try {
            const data = new LuaInspector(path.relative(lua_path, file), root, configs).load();
            if (!Number.isInteger(data.MainID)) continue;
            if (configs.has(data.MainID)) ambiguous.add(data.MainID);
            else configs.set(data.MainID, data);
        } catch (error) { console.warn(`task Lua: ${file}: ${String(error)}`); }
    }
    for (const id of ambiguous) { configs.delete(id); console.warn(`task Lua: ambiguous config for Quest ${id}`); }
    for (const { file, root } of chunks) {
        const inspector = new LuaInspector(path.relative(lua_path, file), root, configs);
        try { inspector.load(); }
        catch (error) { console.warn(`task Lua: ${file}: ${String(error)}`); continue; }
        if (!inspector.owner) continue;
        const bubble = has_bubbles(root);
        for (const method of Object.keys(inspector.actor)) {
            const match = method.match(/^OnSub(Start|Finish|Failed)(\d+)$/);
            if (!match) continue;
            for (const kind of ['narration', 'speech_bubble'] as const) {
                if (kind === 'speech_bubble' && !bubble) continue;
                let calls: LuaCall[];
                try { calls = inspector.inspect(method, kind); }
                catch (error) { console.warn(`task Lua: ${file}:${method}:${kind}: ${String(error)}`); continue; }
                const entries = placements[kind].get(inspector.owner) || [];
                for (const call of calls) {
                    if (kind === 'narration' && !/^(QuestNarratorTask|NarratorOnlyTask(?:ByData(?:SpecifyingResumeReminder|WithPriority)?|Legacy)?|NpcNarratorOnlyTaskByData|NarratorTask(?:ByData|Legacy)?|WarningNarratorTask|ShowReminder|SayReminder)$/.test(call.method)) continue;
                    // Keep different paths/guards to one bubble site; they are alternatives.
                    const duplicate = entries.some(entry => entry.step === Number(match[2])
                        && entry.event === match[1].toLowerCase() && entry.call.id === call.id
                        && (kind === 'narration' || JSON.stringify([entry.call.guards, entry.call.callbacks, entry.call.delay, entry.call.after,
                            entry.call.args.map(value => value && typeof value === 'object' ? value.reference || '?' : value)])
                            === JSON.stringify([call.guards, call.callbacks, call.delay, call.after,
                                call.args.map(value => value && typeof value === 'object' ? value.reference || '?' : value)])));
                    if (!duplicate) entries.push({ step: Number(match[2]), event: match[1].toLowerCase() as LuaTaskPlacement['event'], call });
                }
                placements[kind].set(inspector.owner, entries);
            }
        }
    }
    console.log(`task Lua: ${chunks.length} chunks, ${[...placements.narration.values()].reduce((n, entries) => n + entries.length, 0)} narration calls, ${[...placements.speech_bubble.values()].reduce((n, entries) => n + entries.length, 0)} bubble events`);
    return placements[mode];
}
