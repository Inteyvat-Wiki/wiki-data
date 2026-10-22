// The supported surface is explicit: names containing "Bubble"/"Narrator" are not sufficient evidence.
export type BubbleRule = {
    action: 'create' | 'trigger' | 'clear_task' | 'clear_npc',
    scope: 'quest' | 'npc',
    npc: boolean,
    text: boolean,
};

const bubble_rules: Record<string, BubbleRule> = {
    CreateSpeechBubbleTask: { action: 'create', scope: 'quest', npc: true, text: true },
    TriggerNpcSpeechBubble: { action: 'trigger', scope: 'npc', npc: true, text: true },
    ClearSpeechBubbleTask: { action: 'clear_task', scope: 'quest', npc: false, text: false },
    StopQuestSpeechBubbleByNpc: { action: 'clear_npc', scope: 'quest', npc: true, text: false },
    ClearNpcSpeechBubble: { action: 'clear_npc', scope: 'npc', npc: true, text: false },
};

export const lua_bubble_methods = new Set(Object.keys(bubble_rules));
export function get_bubble_rule(method: string): BubbleRule | undefined {
    return Object.hasOwn(bubble_rules, method) ? bubble_rules[method] : undefined;
}

export type LuaCallbackRule = {
    argument: number,
    kind: 'delay' | 'safe_call' | 'narration_finish',
};

// Zero-based actual arguments, excluding self. Verified against the Lua wrappers.
const callbacks: Record<string, LuaCallbackRule> = {
    CallDelay: { argument: 1, kind: 'delay' },
    AfterMainPageActiveSafeCall: { argument: 0, kind: 'safe_call' },
    ActionSafeCall: { argument: 0, kind: 'safe_call' },
    QuestNarratorTask: { argument: 1, kind: 'narration_finish' },
    NarratorOnlyTask: { argument: 1, kind: 'narration_finish' },
    NarratorOnlyTaskLegacy: { argument: 1, kind: 'narration_finish' },
    NarratorOnlyTaskByData: { argument: 1, kind: 'narration_finish' },
    NarratorOnlyTaskByDataSpecifyingResumeReminder: { argument: 1, kind: 'narration_finish' },
    NarratorTaskByData: { argument: 1, kind: 'narration_finish' },
    NpcNarratorOnlyTaskByData: { argument: 2, kind: 'narration_finish' },
    NarratorTask: { argument: 3, kind: 'narration_finish' },
    NarratorTaskLegacy: { argument: 3, kind: 'narration_finish' },
    WarningNarratorTask: { argument: 3, kind: 'narration_finish' },
};

export function get_lua_callback_rule(method: string, mode: 'narration' | 'speech_bubble'): LuaCallbackRule | undefined {
    if (method === 'ActionSafeCall' && mode !== 'speech_bubble') return;
    return Object.hasOwn(callbacks, method) ? callbacks[method] : undefined;
}

export function is_lua_delay(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function bubble_delay_fields(call: { delay: number, delay_unknown?: true }): { delay?: number, delay_unknown?: true } {
    if (call.delay_unknown || !is_lua_delay(call.delay)) return { delay_unknown: true };
    return call.delay ? { delay: call.delay } : {};
}

export type BubbleParameter = number | boolean | string | null | { reference: string } | { unknown: true };
export function bubble_parameter(value: any): BubbleParameter {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    return typeof value?.reference === 'string' ? { reference: value.reference } : { unknown: true };
}

// Only context/arguments affect path identity; translated text and source traversal order do not.
export function bubble_call_identity(call: {
    method: string, args: any[], guards: { id: string, value: boolean }[],
    delay: number, delay_unknown?: true, after?: string, callbacks?: unknown[],
}): string {
    const guards = [...new Map(call.guards.map(guard => [`${guard.id}:${guard.value}`, { id: guard.id, value: guard.value }])).values()]
        .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : Number(left.value) - Number(right.value));
    return JSON.stringify([call.method, call.args.map(bubble_parameter), guards, call.delay,
        call.delay_unknown || false, call.after || null, call.callbacks || []]);
}

export function has_conflicting_bubble_text(candidates: { content: string }[]): boolean {
    return new Set(candidates.map(candidate => candidate.content)).size > 1;
}
