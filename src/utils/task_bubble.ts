import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lang } from './i18n';
import type { TaskBubble, TaskConditionToken } from '../types/task';
import { get_task_lua_placements } from './task_lua';
import { get_dialog, text_map } from './task_narration';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = process.env.GENSHIN_DATA_PATH || path.resolve(project, '../genshin data');
type Candidate = { raw: any, file: string };
let dialogs: Map<number, Candidate[]> | undefined;
let names: Map<number, number> | undefined;
const reported = new Set<string>();

function warn(message: string) {
    if (!reported.has(message)) { reported.add(message); console.warn(`bubble: ${message}`); }
}

function json(file: string): any { return JSON.parse(fs.readFileSync(path.join(source, file), 'utf8')); }

function* tables(value: any): Generator<any> {
    if (value && typeof value === 'object') {
        if (!Array.isArray(value)) yield value;
        for (const child of Object.values(value)) yield* tables(child);
    }
}

function* files(folder: string): Generator<string> {
    if (!fs.existsSync(folder)) return;
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) yield* files(file);
        else if (file.endsWith('.json')) yield file;
    }
}

function get_dialogs(): Map<number, Candidate[]> {
    if (dialogs) return dialogs;
    dialogs = new Map();
    const wanted = new Set<number>();
    for (const entries of get_task_lua_placements('speech_bubble').values()) {
        for (const { call } of entries) {
            if (/^(CreateSpeechBubbleTask|TriggerNpcSpeechBubble)$/.test(call.method)
                && Number.isInteger(call.args[1]) && call.args[1] > 0) wanted.add(call.args[1]);
        }
    }
    const add = (id: number, raw: any, file: string) => {
        if (!wanted.has(id)) return;
        const entries = dialogs!.get(id) || [];
        entries.push({ raw, file });
        dialogs!.set(id, entries);
    };
    for (const file of files(path.join(source, 'BinOutput/Talk'))) {
        for (const raw of tables(JSON.parse(fs.readFileSync(file, 'utf8')))) {
            if (Number.isInteger(raw.id) && Object.values(raw).some((value: any) => value?.type?.startsWith('TALK_ROLE_')))
                add(raw.id, raw, path.relative(source, file).replaceAll('\\', '/'));
        }
    }
    const excel_file = 'ExcelBinOutput/DialogExcelConfigData.json';
    const excel: any[] = json(excel_file);
    // Calibrate the obfuscated ID field against an explicit, independently inspected dialog ID.
    const sample = excel.find(row => Object.values(row).includes(20179902));
    const keys = sample && Object.keys(sample).filter(key => sample[key] === 20179902);
    if (keys?.length === 1) for (const raw of excel) add(raw[keys[0]], raw, excel_file);
    else warn('cannot identify DialogExcel ID field; only BinOutput text is used');
    return dialogs;
}

function resolve_dialog(id: number, npc: number, lang: Lang) {
    const converted = (get_dialogs().get(id) || []).flatMap(candidate => {
        // A missing Excel hash is not repaired by XOR or approximate numeric matching.
        if (candidate.raw.talkContentTextMapHash && !text_map(lang)[String(candidate.raw.talkContentTextMapHash)]) return [];
        const dialog = get_dialog(candidate.raw, lang);
        return dialog ? [{ ...candidate, dialog }] : [];
    });
    if (!converted.length) { warn(`dialog ${id}: no ${lang} text`); return; }
    if (new Set(converted.map(candidate => candidate.dialog.content)).size !== 1) {
        warn(`dialog ${id}: conflicting ${lang} content sources; skipped`); return;
    }
    const chosen = converted[0];
    if (!names) names = new Map((json('ExcelBinOutput/NpcExcelConfigData.json') as any[]).map(row => [row.id, row.nameTextMapHash]));
    const name = text_map(lang)[String(names.get(npc))];
    const role = Object.values(chosen.raw).find((value: any) => value?.type?.startsWith('TALK_ROLE_')) as any;
    const { speaker: _source_speaker, ...dialog } = chosen.dialog;
    return {
        // The bubble's NPC argument controls its attachment, independently of the dialog role.
        dialog: { ...dialog, role: 'npc' as const, ...(name ? { speaker: name } : {}) },
        ...(role ? { dialog_speaker: { type: role.type, ...(role.id != null ? { id: String(role.id) } : {}) } } : {}),
        text_sources: [...new Set(converted.map(candidate => candidate.file))],
    };
}

export function get_task_bubbles(quest: number, steps: Map<number, number>, lang: Lang): Record<string, TaskBubble> {
    const result: Record<string, TaskBubble> = {};
    for (const { call, step: raw_step, event } of get_task_lua_placements('speech_bubble').get(quest) || []) {
        const step = steps.get(raw_step);
        if (!step) { warn(`Quest ${quest}: step ${raw_step} not exported`); continue; }
        const create = call.method === 'CreateSpeechBubbleTask', trigger = call.method === 'TriggerNpcSpeechBubble';
        const clear_task = call.method === 'ClearSpeechBubbleTask';
        const npc = call.args[0], id = call.args[1];
        if (!clear_task && (!Number.isInteger(npc) || npc <= 0)) { warn(`${call.id}: unresolved NPC; skipped`); continue; }
        if ((create || trigger) && (!Number.isInteger(id) || id <= 0)) { warn(`${call.id}: unresolved dialog; skipped`); continue; }
        const text = create || trigger ? resolve_dialog(id, npc, lang) : undefined;
        if ((create || trigger) && !text) continue;
        const conditions: TaskConditionToken[] = [];
        for (const guard of new Map(call.guards.map(guard => [guard.id, guard])).values()) {
            conditions.push({ type: 'boolean', id: guard.id, title: 'Lua', subtitle: guard.description, value: guard.value });
            if (conditions.length > 1) conditions.push('and');
        }
        const bubble: TaskBubble = {
            type: 'speech_bubble', step, event, source: call.id, api: call.method,
            action: create ? 'create' : trigger ? 'trigger' : clear_task ? 'clear_task' : 'clear_npc',
            ...(!clear_task ? { npc_id: npc } : {}),
            ...(text ? { dialog_id: id, ...text } : {}),
            ...(create ? { parameters: call.args.slice(2).map(value =>
                value === null || ['number', 'boolean', 'string'].includes(typeof value) ? value
                    : value?.reference ? { reference: value.reference } : { unknown: true }) } : {}),
            conditions,
            ...(call.delay ? { delay: call.delay } : {}),
            ...(call.after ? { after: `${event}:${step}:${call.after}` } : {}),
            ...(call.callbacks?.length ? { callbacks: call.callbacks } : {}),
        };
        const base = `${event}:${step}:${call.id}`;
        let key = base, index = 2;
        while (result[key] && JSON.stringify(result[key]) !== JSON.stringify(bubble)) key = `${base}:variant:${index++}`;
        result[key] = bubble;
    }
    return result;
}
