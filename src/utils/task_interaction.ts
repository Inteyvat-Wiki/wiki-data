import type {
    SourceTaskCondition,
    SourceTaskConditions,
    TaskConditionToken,
    TaskOperation,
} from '~/types/task';
import { InteractionData } from '~/utils/data';

type RawAction = Record<string, any>;

type RawGroupConfig = {
    _grpId: number,
    _index: number,
    _nextGrpId: number,
    _nextGrpIdList: number[],
};

type InteractionGroup = {
    id: number,
    actions: RawAction[],
    config: RawGroupConfig,
};

type ConditionPath = SourceTaskConditions[];

type RawBranch = {
    id: string,
    type: 'random' | 'result',
    option: number,
};

type RawNext = {
    dialog: number,
    conditions: ConditionPath,
    branches: RawBranch[],
    choice?: boolean,
};

type RawOperation = {
    type: 'set' | 'input' | 'give',
    id: string,
    value?: number | boolean,
    conditions: ConditionPath,
    branches: RawBranch[],
};

type ResolveResult = {
    next: RawNext[],
    operations: RawOperation[],
};

export type InteractionDialog = {
    next_dialogs: {
        dialog: number,
        conditions?: TaskConditionToken[],
        branches?: RawBranch[],
        choice?: boolean,
    }[],
    operations?: TaskOperation[],
};

export type InteractionDialogs = {
    operations?: TaskOperation[],
    dialogs: Map<number, InteractionDialog>,
    initial_dialogs: InteractionDialog['next_dialogs'],
};

type RawInteractionDialogs = {
    dialogs: Map<number, ResolveResult>,
    initial: ResolveResult,
};

const quest_state_names: Record<number, string> = {
    0: 'QUEST_STATE_NONE',
    1: 'QUEST_STATE_UNSTARTED',
    2: 'QUEST_STATE_UNFINISHED',
    3: 'QUEST_STATE_FINISHED',
    4: 'QUEST_STATE_FAILED',
};

function is_object(value: unknown): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function get_action_groups(data: any): RawAction[][] {
    const candidates = Object.values(data || {}).filter((value): value is RawAction[][] =>
        Array.isArray(value) && value.some(group =>
            Array.isArray(group) && group.some(action => is_object(action) && typeof action._type === 'string')));

    return candidates.sort((left, right) => right.length - left.length)[0] || [];
}

function get_group_configs(data: any): RawGroupConfig[] {
    const candidates = Object.values(data || {}).filter((value): value is RawGroupConfig[] =>
        Array.isArray(value) && value.some(item =>
            is_object(item) && Number.isInteger(item._grpId) && Number.isInteger(item._index)));

    return candidates.sort((left, right) => right.length - left.length)[0] || [];
}

function get_dialog_id(action: RawAction, dialog_ids: Set<number>): number | undefined {
    return Object.values(action).find(value => Number.isInteger(value) && dialog_ids.has(value));
}

function get_group_dialog_ids(actions: RawAction[], dialog_ids: Set<number>): number[] {
    const dialogs = actions.filter(action => action._type === 'DIALOG')
        .map(action => get_dialog_id(action, dialog_ids))
        .filter((id): id is number => id !== undefined);
    if (dialogs.length > 0) return [...new Set(dialogs)];

    // FROM_BLACK fades out previously displayed text; it is not a new dialogue node.
    return [...new Set(actions.filter(action =>
        (action._type === 'BLACK_SCREEN' || action._type === 'SIMPLE_BLACK_SCREEN')
        && (action.blackScreenType ?? action._blackScreenType) !== 'FROM_BLACK')
        .map(action => get_dialog_id(action, dialog_ids))
        .filter((id): id is number => id !== undefined))];
}

function get_number_arrays(action: RawAction): number[][] {
    return Object.values(action).filter((value): value is number[] =>
        Array.isArray(value) && value.length > 0 && value.every(Number.isInteger));
}

function get_select(action: RawAction, dialog_ids: Set<number>, group_ids: Set<number>) {
    const arrays = get_number_arrays(action);
    const dialogs = arrays.find(values => values.every(value => dialog_ids.has(value)));
    if (!dialogs) return undefined;

    const groups = arrays.find(values =>
        values !== dialogs && values.length === dialogs.length && values.every(value => group_ids.has(value)));
    if (!groups) return undefined;
    return { dialogs, groups };
}

function get_source_condition(condition: any): SourceTaskCondition {
    const type = String(condition?._type || '');
    const params = Array.isArray(condition?._param) ? condition._param : [];
    const step_id = /^QUEST_COND_.*STATE/.test(type) ? Number(params[0]) : NaN;
    const state = Number(params[1]);

    return {
        type,
        params,
        ...(Number.isFinite(step_id) ? { step_id } : {}),
        ...(Number.isFinite(step_id) && quest_state_names[state]
            ? { state: quest_state_names[state] }
            : {}),
    };
}

function get_jump_conditions(action: RawAction): {
    index: number,
    conditions: SourceTaskConditions,
}[] {
    const rules = Object.values(action).find((value): value is any[] =>
        Array.isArray(value) && value.some(rule =>
            is_object(rule) && Array.isArray(rule._jumpCond) && Number.isInteger(rule._jumpIndex)));
    if (!rules) return [];

    return rules.map(rule => ({
        index: rule._jumpIndex,
        conditions: {
            logic: rule._condComb || 'LOGIC_AND',
            conditions: rule._jumpCond.map(get_source_condition),
        },
    }));
}

function get_operations(actions: RawAction[], conditions: ConditionPath = []): RawOperation[] {
    const operations: RawOperation[] = [];
    for (const action of actions) {
        if (action._type === 'UI_TRIGGER' && action._contextName === 'GivenDialog') {
            operations.push({ type: 'give', id: String(action._param || ''), conditions, branches: [] });
            continue;
        }
        if (action._type === 'SET_QUEST_VAR'
            && Number.isInteger(action._subQuestId)
            && Number.isInteger(action._index)) {
            operations.push({
                type: 'set',
                id: JSON.stringify(['task_variable', [String(action._subQuestId), String(action._index)]]),
                value: Number(action._value) || 0,
                conditions,
                branches: [],
            });
            continue;
        }
        if (action._type === 'UI_TRIGGER'
            && action._contextName === 'ActiveQuestCheck'
            && String(action._param || '')) {
            operations.push({
                type: 'input',
                id: JSON.stringify(['quest_check', [String(action._param)]]),
                conditions,
                branches: [],
            });
        }
    }
    return operations;
}

function combine_conditions(
    path: ConditionPath,
    convert: (conditions: SourceTaskConditions) => TaskConditionToken[],
): TaskConditionToken[] {
    const groups = path.map(convert).filter(group => group.length > 0);
    return groups.flatMap((group, index) => index === 0 ? group : [...group, 'and' as const]);
}

function unique_next(items: RawNext[]): RawNext[] {
    const seen = new Set<string>();
    return items.filter(item => {
        const key = JSON.stringify([item.dialog, item.conditions, item.branches, item.choice]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

const raw_interaction_cache = new WeakMap<object, Map<string, RawInteractionDialogs>>();
const named_raw_interaction_cache = new Map<string, RawInteractionDialogs>();

function get_raw_interaction_dialogs(
    data: any,
    source_dialog_ids: number[],
    cache_name?: string,
): RawInteractionDialogs {
    const cache_key = source_dialog_ids.join(',');
    const named_cache_key = cache_name ? `${cache_name}\0${cache_key}` : '';
    const named_cached = named_cache_key ? named_raw_interaction_cache.get(named_cache_key) : undefined;
    if (named_cached) return named_cached;
    const cache = is_object(data) ? raw_interaction_cache.get(data) : undefined;
    const cached = cache?.get(cache_key);
    if (cached) return cached;

    const action_groups = get_action_groups(data);
    const configs = get_group_configs(data);
    if (action_groups.length === 0 || configs.length === 0) {
        const empty = { dialogs: new Map<number, ResolveResult>(), initial: { next: [], operations: [] } };
        if (named_cache_key) named_raw_interaction_cache.set(named_cache_key, empty);
        return empty;
    }

    const dialog_ids = new Set(source_dialog_ids);
    const group_ids = new Set(configs.map(config => config._grpId));
    const groups = new Map<number, InteractionGroup>();
    for (const config of configs) {
        groups.set(config._grpId, {
            id: config._grpId,
            actions: action_groups[config._index] || [],
            config,
        });
    }

    const dialog_groups = new Map<number, InteractionGroup>();
    const selects = new Map<number, { dialogs: number[], groups: number[] }>();
    for (const group of groups.values()) {
        for (const dialog_id of get_group_dialog_ids(group.actions, dialog_ids)) {
            dialog_groups.set(dialog_id, group);
        }
        for (const action of group.actions) {
            if (action._type === 'DIALOG_SELECT') {
                const select = get_select(action, dialog_ids, group_ids);
                if (select) selects.set(group.id, select);
            }
        }
    }

    const resolve_cache = new Map<number, ResolveResult>();
    const resolving = new Set<number>();

    function prepend_conditions(result: ResolveResult, conditions: ConditionPath): ResolveResult {
        if (conditions.length === 0) return result;
        return {
            next: result.next.map(item => ({
                ...item,
                conditions: [...conditions, ...item.conditions],
            })),
            operations: result.operations.map(operation => ({
                ...operation,
                conditions: [...conditions, ...operation.conditions],
            })),
        };
    }

    function prepend_branch(result: ResolveResult, branch: RawBranch): ResolveResult {
        return {
            next: result.next.map(item => ({
                ...item,
                branches: [branch, ...item.branches],
            })),
            operations: result.operations.map(operation => ({
                ...operation,
                branches: [branch, ...operation.branches],
            })),
        };
    }

    function resolve_list(group: InteractionGroup, type: RawBranch['type']): ResolveResult {
        const result: ResolveResult = { next: [], operations: [] };
        group.config._nextGrpIdList.forEach((target, option) => {
            if (!target) return;
            const resolved = prepend_branch(resolve(target), {
                id: `${type}:${group.id}`,
                type,
                option,
            });
            result.next.push(...resolved.next);
            result.operations.push(...resolved.operations);
        });
        result.next = unique_next(result.next);
        return result;
    }

    function resolve_routes(group: InteractionGroup, operations: RawOperation[]): ResolveResult {
        const select = selects.get(group.id);
        if (select) return {
            next: select.dialogs.map(dialog => ({ dialog, conditions: [], branches: [], choice: true })),
            operations,
        };

        const jump = group.actions.find(action => action._type === 'CONDITION_JUMP_GROUP');
        if (jump) {
            const result: ResolveResult = { next: [], operations };
            for (const route of get_jump_conditions(jump)) {
                const target = group.config._nextGrpIdList?.[route.index];
                if (!target) continue;
                const resolved = prepend_conditions(resolve(target), [route.conditions]);
                result.next.push(...resolved.next);
                result.operations.push(...resolved.operations);
            }
            const fallback = resolve(group.config._nextGrpId);
            result.next.push(...fallback.next);
            result.operations.push(...fallback.operations);
            result.next = unique_next(result.next);
            return result;
        }

        if (group.actions.some(action => action._type === 'RANDOM_JUMP_GROUP')) {
            const result = resolve_list(group, 'random');
            return { next: result.next, operations: [...operations, ...result.operations] };
        }

        if (group.config._nextGrpIdList?.some(Boolean)) {
            const result = resolve_list(group, 'result');
            return { next: result.next, operations: [...operations, ...result.operations] };
        }

        const resolved = resolve(group.config._nextGrpId);
        return {
            next: resolved.next,
            operations: [...operations, ...resolved.operations],
        };
    }

    function resolve(group_id: number): ResolveResult {
        if (!group_id || resolving.has(group_id)) return { next: [], operations: [] };
        const cached = resolve_cache.get(group_id);
        if (cached) return cached;
        const group = groups.get(group_id);
        if (!group) return { next: [], operations: [] };

        resolving.add(group_id);
        const dialogs = get_group_dialog_ids(group.actions, dialog_ids);
        if (dialogs.length > 0) {
            const result = {
                next: dialogs.map(dialog => ({ dialog, conditions: [], branches: [] })),
                operations: [],
            };
            resolve_cache.set(group_id, result);
            resolving.delete(group_id);
            return result;
        }

        const result = resolve_routes(group, get_operations(group.actions));
        resolve_cache.set(group_id, result);
        resolving.delete(group_id);
        return result;
    }

    function resolve_after(group: InteractionGroup): ResolveResult {
        return resolve_routes(group, []);
    }

    const raw = new Map<number, ResolveResult>();
    for (const [dialog_id, group] of dialog_groups) {
        const result = resolve_after(group);
        raw.set(dialog_id, {
            next: [...result.next],
            operations: [...get_operations(group.actions), ...result.operations],
        });
    }
    for (const [group_id, select] of selects) {
        select.dialogs.forEach((dialog_id, index) => {
            const target = select.groups[index];
            if (!target) return;
            raw.set(dialog_id, resolve(target));
        });
    }

    const initial_group = configs.find(config => config._index === 0);
    const result = {
        dialogs: raw,
        initial: initial_group ? resolve(initial_group._grpId) : { next: [], operations: [] },
    };
    if (is_object(data)) {
        const next_cache = cache || new Map<string, RawInteractionDialogs>();
        next_cache.set(cache_key, result);
        raw_interaction_cache.set(data, next_cache);
    }
    if (named_cache_key) named_raw_interaction_cache.set(named_cache_key, result);
    return result;
}

export function get_interaction_dialogs(
    load_data: any | (() => any),
    source_dialog_ids: number[],
    convert: (conditions: SourceTaskConditions) => TaskConditionToken[],
    cache_name?: string,
): InteractionDialogs {
    const cache_key = source_dialog_ids.join(',');
    const named_cache_key = cache_name ? `${cache_name}\0${cache_key}` : '';
    const cached = named_cache_key ? named_raw_interaction_cache.get(named_cache_key) : undefined;
    const source = cached ? null : typeof load_data === 'function' ? load_data() : load_data;
    const data = normalize_interaction(source);
    const raw = cached || get_raw_interaction_dialogs(data, source_dialog_ids, cache_name);

    function get_next_dialogs(items: RawNext[]): InteractionDialog['next_dialogs'] {
        return items.map(item => {
            const conditions = combine_conditions(item.conditions, convert);
            return {
                dialog: item.dialog,
                ...(conditions.length > 0 ? { conditions } : {}),
                ...(item.branches.length > 0 ? { branches: item.branches } : {}),
                ...(item.choice ? { choice: true } : {}),
            };
        });
    }

    function convert_operations(raw_operations: RawOperation[]): TaskOperation[] {
        return raw_operations.map(operation => {
            const conditions = combine_conditions(operation.conditions, convert);
            const common = {
                ...(conditions.length > 0 ? { conditions } : {}),
                ...(operation.branches.length > 0 ? { branches: operation.branches } : {}),
            };
            if (operation.type === 'give') {
                const giving_id = Number(operation.id);
                const giving = giving_id > 0 ? InteractionData.get_giving(giving_id) : undefined;
                return { type: 'item', action: 'give', items: [],
                    ...(giving_id > 0 ? { giving_id } : {}), ...giving, ...common };
            }
            if (operation.type === 'set') return {
                type: 'variable', action: 'set',
                id: operation.id,
                value: operation.value ?? 0,
                ...(conditions.length > 0 ? { conditions } : {}),
                ...(operation.branches.length > 0 ? { branches: operation.branches } : {}),
            };
            return {
                type: 'variable', action: 'input',
                id: operation.id,
                ...(conditions.length > 0 ? { conditions } : {}),
                ...(operation.branches.length > 0 ? { branches: operation.branches } : {}),
            };
        });
    }

    const dialogs = new Map([...raw.dialogs].map(([dialog_id, result]) => {
        const next_dialogs = get_next_dialogs(result.next);
        const operations = convert_operations(result.operations);

        return [dialog_id, {
            next_dialogs,
            ...(operations.length > 0 ? { operations } : {}),
        }];
    }));
    return {
        dialogs,
        initial_dialogs: get_next_dialogs(raw.initial.next),
        ...(raw.initial.operations.length ? { operations: convert_operations(raw.initial.operations) } : {}),
    };
}

function normalize_interaction(data: any): any {
    if (Array.isArray(data)) return data.map(normalize_interaction);
    if (!is_object(data)) return data;
    const result = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, normalize_interaction(value)]));
    for (const key of ['type', 'param', 'contextName', 'subQuestId', 'index', 'value',
        'grpId', 'nextGrpId', 'nextGrpIdList', 'jumpCond', 'jumpIndex', 'condComb']) {
        if (result[key] !== undefined && result[`_${key}`] === undefined) result[`_${key}`] = result[key];
    }
    if (result._grpId !== undefined) result._index ??= 0;
    return result;
}
