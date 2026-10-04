import { find_data_name_by_id } from '~/utils/data';
import { Lang, t } from '~/utils/i18n';
import type {
    SourceTaskCondition,
    SourceTaskConditions,
    TaskBooleanCondition,
    TaskComparison,
    TaskConditionToken,
    TaskNumberCondition,
    TaskState,
    TaskStepReference,
} from '~/types/task';

type ConditionObject = 'activity' | 'avatar' | 'city' | 'event' | 'item' | 'player'
    | 'scene' | 'step' | 'task' | 'task_variable' | 'variable' | 'vehicle' | 'weapon';

// 条件映射表：把各类 QUEST_COND_* 原始条件映射为语义化的数值/布尔条件。
// object_indexes/id_indexes 指明原始 params 中哪些位置是对象 id（用于查名称）；
// value_index 指明数值条件中取值的位置。
type ConditionSchemaBase = {
    family: string,
    object: ConditionObject,
    object_indexes: number[],
    id_indexes: number[],
    description: string,
};

type NumberConditionSchema = ConditionSchemaBase & {
    type: 'number',
    value_index: number,
    comparison: TaskComparison,
};

type BooleanConditionSchema = ConditionSchemaBase & {
    type: 'boolean',
    value_index?: number,
    value: boolean,
};

type ConditionSchema = NumberConditionSchema | BooleanConditionSchema;
type ConditionGroup = TaskConditionToken[];
type ConditionOperator = Extract<TaskConditionToken, string>;

const condition_schemas: Record<string, ConditionSchema> = {};

function add_number_conditions(
    types: string[],
    family: string,
    object: ConditionObject,
    object_indexes: number[],
    id_indexes: number[],
    value_index: number,
    description: string,
    comparison: TaskComparison = 'equal',
) {
    for (const type of types) {
        condition_schemas[type] = {
            type: 'number',
            family,
            object,
            object_indexes,
            id_indexes,
            value_index,
            description,
            comparison,
        };
    }
}

function add_boolean_conditions(
    types: string[],
    family: string,
    object: ConditionObject,
    object_indexes: number[],
    id_indexes: number[],
    description: string,
    value_index?: number,
    value = true,
) {
    for (const type of types) {
        condition_schemas[type] = {
            type: 'boolean',
            family,
            object,
            object_indexes,
            id_indexes,
            description,
            value_index,
            value,
        };
    }
}

// ---- 条件类型注册表 ----

add_number_conditions(['QUEST_COND_QUEST_GLOBAL_VAR_EQUAL'], 'global_variable', 'variable', [0], [0], 1, 'global_variable');
add_number_conditions(['QUEST_COND_QUEST_GLOBAL_VAR_NOT_EQUAL'], 'global_variable', 'variable', [0], [0], 1, 'global_variable', 'not_equal');
add_number_conditions(['QUEST_COND_QUEST_GLOBAL_VAR_GREATER'], 'global_variable', 'variable', [0], [0], 1, 'global_variable', 'greater');
add_number_conditions(['QUEST_COND_QUEST_GLOBAL_VAR_LESS'], 'global_variable', 'variable', [0], [0], 1, 'global_variable', 'less');
add_number_conditions(['QUEST_COND_QUEST_VAR_EQUAL'], 'task_variable', 'task_variable', [2, 0], [2, 0], 1, 'task_variable');
add_number_conditions(['QUEST_COND_QUEST_VAR_NOT_EQUAL'], 'task_variable', 'task_variable', [2, 0], [2, 0], 1, 'task_variable', 'not_equal');
add_number_conditions(['QUEST_COND_QUEST_VAR_GREATER'], 'task_variable', 'task_variable', [2, 0], [2, 0], 1, 'task_variable', 'greater');
add_number_conditions(['QUEST_COND_QUEST_VAR_LESS'], 'task_variable', 'task_variable', [2, 0], [2, 0], 1, 'task_variable', 'less');
add_number_conditions(['QUEST_COND_DAILY_TASK_VAR_EQ'], 'daily_task_variable', 'task_variable', [0, 1], [0, 1], 2, 'task_variable');
add_number_conditions(['QUEST_COND_DAILY_TASK_VAR_GT'], 'daily_task_variable', 'task_variable', [0, 1], [0, 1], 2, 'task_variable', 'greater');
add_number_conditions(['QUEST_COND_DAILY_TASK_VAR_LT'], 'daily_task_variable', 'task_variable', [0, 1], [0, 1], 2, 'task_variable', 'less');
add_number_conditions(['QUEST_COND_STORY_GLOBAL_VALUE'], 'story_variable', 'variable', [0, 1, 3], [0, 1, 3], 2, 'story_variable');
add_number_conditions(['QUEST_COND_ITEM_NUM_EQUAL'], 'item_count', 'item', [0], [0], 1, 'item_count');
add_number_conditions(['QUEST_COND_ITEM_NUM_GREATER'], 'item_count', 'item', [0], [0], 1, 'item_count', 'greater');
add_number_conditions(['QUEST_COND_ITEM_NUM_LESS', 'QUEST_COND_ITEM_NUM_LESS_THAN'], 'item_count', 'item', [0], [0], 1, 'item_count', 'less');
add_number_conditions(['QUEST_COND_PACK_HAVE_ITEM'], 'item_count', 'item', [0], [0], 1, 'item_count', 'greater_equal');
add_number_conditions(['QUEST_COND_AVATAR_FETTER_EQ'], 'avatar_fetter', 'avatar', [0], [0], 1, 'friendship');
add_number_conditions(['QUEST_COND_AVATAR_FETTER_EQUAL_GREATER'], 'avatar_fetter', 'avatar', [0], [0], 1, 'friendship', 'greater_equal');
add_number_conditions(['QUEST_COND_AVATAR_FETTER_GT'], 'avatar_fetter', 'avatar', [0], [0], 1, 'friendship', 'greater');
add_number_conditions(['QUEST_COND_AVATAR_FETTER_LT'], 'avatar_fetter', 'avatar', [0], [0], 1, 'friendship', 'less');
add_number_conditions(['QUEST_COND_QUEST_CHECK_RESULT', 'QUEST_COND_QUEST_CHECK_VALUE'], 'quest_check', 'event', [0], [0], 1, 'quest_check');
add_number_conditions(['QUEST_COND_QUEST_CHECK_NOT_VALUE'], 'quest_check', 'event', [0], [0], 1, 'quest_check', 'not_equal');
add_number_conditions(['QUEST_COND_ACTIVITY_CLIENT_COND'], 'activity_condition', 'activity', [0, 1], [0, 1], 2, 'activity_value');
add_number_conditions(['QUEST_COND_CITY_LEVEL_EQUAL_GREATER'], 'city_level', 'city', [0], [0], 1, 'city_level', 'greater_equal');
add_number_conditions(['QUEST_COND_PLAYER_LEVEL_EQUAL_GREATER'], 'player_level', 'player', [], [], 0, 'player_level', 'greater_equal');
add_number_conditions(['QUEST_COND_SCENE_LEVEL_TAG_EQ'], 'scene_level', 'scene', [], [], 0, 'scene_level');
add_number_conditions(['QUEST_COND_WEAPON_IS_ARKHE_OUSIA_OR_PNEUMA'], 'weapon_arkhe', 'weapon', [0], [0], 1, 'weapon_arkhe');

add_boolean_conditions(['QUEST_COND_PACK_HAVE_ANY_ITEM'], 'has_any_item', 'item', [0], [0], 'has_item', 1);
add_boolean_conditions(['QUEST_COND_PACK_HAVE_ITEM_WITH_ID'], 'has_item', 'item', [0], [0], 'has_item', 1);
add_boolean_conditions(['QUEST_COND_PLAYER_CHOOSE_MALE'], 'male_player', 'player', [], [], 'male_player', 0);
add_boolean_conditions(['QUEST_COND_IS_DAYTIME'], 'daytime', 'scene', [], [], 'daytime', 0);
add_boolean_conditions(['QUEST_COND_DAILY_TASK_REWARD_CAN_GET'], 'daily_reward_available', 'player', [], [], 'daily_reward_available', 0);
add_boolean_conditions(['QUEST_COND_DAILY_TASK_REWARD_RECEIVED'], 'daily_reward_received', 'player', [], [], 'daily_reward_received', 0);
add_boolean_conditions(['QUEST_COND_TMPVALUE_HIT_NICKNAME'], 'nickname_match', 'event', [0], [0], 'nickname_match', 1);
add_boolean_conditions(['QUEST_COND_PLAYER_CURRENT_AVATAR', 'QUEST_COND_CURRENT_AVATAR'], 'current_avatar', 'avatar', [0], [0], 'current_avatar');
add_boolean_conditions(['QUEST_COND_PLAYER_CURRENT_NOT_AVATAR'], 'current_avatar', 'avatar', [0], [0], 'current_avatar', undefined, false);
add_boolean_conditions(['QUEST_COND_PLAYER_TEAM_CONTAINS_AVATAR'], 'team_avatar', 'avatar', [0], [0], 'team_contains_avatar');
add_boolean_conditions(['QUEST_COND_PLAYER_TEAM_NOT_CONTAINS_AVATAR'], 'team_avatar', 'avatar', [1], [1], 'team_contains_avatar', undefined, false);
add_boolean_conditions(['QUEST_COND_PLAYER_HAVE_AVATAR'], 'has_avatar', 'avatar', [1], [1], 'has_avatar');
add_boolean_conditions(['QUEST_COND_QUEST_NOT_RECEIVE'], 'quest_received', 'task', [0], [0], 'quest_received', undefined, false);
add_boolean_conditions(['QUEST_COND_DAILY_TASK_IN_PROGRESS'], 'daily_task_progress', 'task', [0], [0], 'task_in_progress');
add_boolean_conditions(['QUEST_COND_ITEM_GIVING_ACTIVED'], 'item_giving_active', 'step', [0], [0], 'item_giving_active');
add_boolean_conditions(['QUEST_COND_ITEM_GIVING_FINISHED'], 'item_giving_finished', 'step', [0], [0], 'item_giving_finished');
add_boolean_conditions(['QUEST_COND_IN_VEHICLE'], 'vehicle', 'vehicle', [0], [0], 'in_vehicle');
add_boolean_conditions(['QUEST_COND_IN_VEHICLE_BY_FEATURETAG'], 'vehicle_feature', 'vehicle', [0], [0], 'in_vehicle');
add_boolean_conditions(['QUEST_COND_PRESENT_AT_SPECIFIC_SCENE'], 'specific_scene', 'scene', [0], [0], 'present_at_scene');
add_boolean_conditions(['QUEST_COND_SCENE_AREA_UNLOCKED'], 'scene_area', 'scene', [0, 1], [0, 1], 'scene_area_unlocked');
add_boolean_conditions(['QUEST_COND_NOT_HAVE_BLOSSOM_TALK'], 'blossom_talk', 'event', [], [], 'has_blossom_talk', undefined, false);
add_boolean_conditions(['QUEST_COND_HIT_KEYWORD_EASTER_EGG'], 'keyword_event', 'event', [0, 1, 2], [0, 1, 2], 'keyword_event');
add_boolean_conditions(['QUEST_COND_GCG_WORLD_CHALLENGE_RESULT'], 'gcg_result', 'event', [0, 1], [0, 1], 'gcg_result');
add_boolean_conditions(['QUEST_COND_STORYBOARD_RUNNING'], 'storyboard_running', 'event', [0], [0], 'storyboard_running');
add_boolean_conditions(['QUEST_COND_LUA_NOTIFY'], 'lua_notify', 'event', [0], [0], 'lua_notify');

// 未注册的条件类型按布尔条件兜底处理，保留原始 type 名作为标题
function get_condition_schema(condition: SourceTaskCondition): ConditionSchema {
    return condition_schemas[condition.type] || {
        type: 'boolean',
        family: condition.type,
        object: 'event',
        object_indexes: condition.params.map((_, index) => index),
        id_indexes: condition.params.map((_, index) => index),
        description: condition.type,
        value: true,
    };
}

// 用对象 id 查名称生成标题；查不到的退回原始值
function get_condition_title(
    schema: ConditionSchema,
    params: SourceTaskCondition['params'],
    references: Map<number, TaskStepReference>,
    lang: Lang,
) {
    const values = schema.object_indexes
        .map(index => String(params[index] ?? ''))
        .filter(Boolean);
    const ids = values
        .flatMap(value => value.split(','))
        .map(Number)
        .filter(Number.isFinite);
    const find_names = (folder: string) => ids
        .map(id => find_data_name_by_id(id, lang, folder) || String(id));

    if (schema.object === 'avatar') return find_names('characters').join(' / ') || t('task_condition.character', lang);
    if (schema.object === 'item') return find_names('materials').join(' / ') || t('task_condition.item', lang);
    if (schema.object === 'weapon') return find_names('weapons').join(' / ') || t('task_condition.weapon', lang);
    if (schema.object === 'task') return find_names('tasks').join(' / ') || t('task_condition.task', lang);
    if (schema.object === 'task_variable') {
        const task_id = ids[0];
        const task_name = task_id === undefined ? null : find_data_name_by_id(task_id, lang, 'tasks');
        return [task_name || values[0], values[1]].filter(Boolean).join(' / ');
    }
    if (schema.object === 'step') {
        const reference = ids[0] === undefined ? undefined : references.get(ids[0]);
        return reference
            ? [reference.title, reference.subtitle].filter(Boolean).join(' / ')
            : values.join(' / ');
    }
    return values.join(' / ') || t(`task_condition.${schema.object}`, lang);
}

function get_value_condition(
    condition: SourceTaskCondition,
    references: Map<number, TaskStepReference>,
    lang: Lang,
): TaskNumberCondition | TaskBooleanCondition {
    const schema = get_condition_schema(condition);
    const base = {
        // id 用于前端按条件分组：同族 + 相同对象 id 视为同一条件的多个取值
        id: JSON.stringify([schema.family, schema.id_indexes.map(index => String(condition.params[index] ?? ''))]),
        title: get_condition_title(schema, condition.params, references, lang),
        subtitle: schema.description.startsWith('QUEST_')
            ? schema.description
            : t(`task_condition.${schema.description}`, lang),
    };

    if (schema.type === 'number') return {
        ...base,
        type: 'number',
        value: Number(condition.params[schema.value_index]) || 0,
        comparison: schema.comparison,
    };
    return {
        ...base,
        type: 'boolean',
        value: schema.value_index === undefined
            ? schema.value
            : Boolean(Number(condition.params[schema.value_index])),
    };
}

function get_task_state(state: string): TaskState {
    if (state === 'QUEST_STATE_UNFINISHED') return 'ongoing';
    if (state === 'QUEST_STATE_FINISHED') return 'finished';
    if (state === 'QUEST_STATE_FAILED') return 'failed';
    return 'unstarted';
}

// ---- 条件组表达式：后缀表达式（与前端 evaluate_task_conditions 一致）----

function join_conditions(groups: ConditionGroup[], operator: ConditionOperator): ConditionGroup {
    const [first, ...rest] = groups;
    if (!first) return [];
    return [...first, ...rest.flatMap(group => [...group, operator])];
}

function combine_conditions(left: ConditionGroup, right: ConditionGroup, operator: ConditionOperator): ConditionGroup {
    return [...left, ...right, operator];
}

function join_stacked_conditions(groups: ConditionGroup[], operator: ConditionOperator): ConditionGroup {
    return [
        ...groups.flat(),
        ...groups.slice(1).map(() => operator),
    ];
}

// 原始 logic（LOGIC_*）语义与后缀表达式不同，需要按组合方式重新拼接
function build_expression(logic: string, groups: ConditionGroup[]): TaskConditionToken[] {
    if (groups.length === 0) return [];
    if (groups.length === 1) {
        return logic === 'LOGIC_NOT' ? [...groups[0]!, 'not'] : groups[0]!;
    }

    const first = groups[0]!;
    const second = groups[1]!;
    const rest = groups.slice(2);
    if (logic === 'LOGIC_OR') return join_conditions(groups, 'or');
    if (logic === 'LOGIC_A_OR_ETCAND') {
        return combine_conditions(first, join_conditions([second, ...rest], 'and'), 'or');
    }
    if (logic === 'LOGIC_A_AND_ETCOR') {
        return combine_conditions(first, join_conditions([second, ...rest], 'or'), 'and');
    }

    const first_pair = combine_conditions(first, second, logic === 'LOGIC_A_OR_B_OR_ETCAND' ? 'or' : 'and');
    if (rest.length === 0) return first_pair;
    if (logic === 'LOGIC_A_AND_B_AND_ETCOR') {
        return combine_conditions(first_pair, join_stacked_conditions(rest, 'or'), 'and');
    }
    if (logic === 'LOGIC_A_AND_B_OR_ETCAND' || logic === 'LOGIC_A_OR_B_OR_ETCAND') {
        return combine_conditions(first_pair, join_stacked_conditions(rest, 'and'), 'or');
    }
    return join_conditions(groups, 'and');
}

export function get_task_conditions(
    source: SourceTaskConditions,
    references: Map<number, TaskStepReference>,
    own_references: Map<number, TaskStepReference>,
    lang: Lang,
): TaskConditionToken[] {
    const groups: ConditionGroup[] = [];

    for (const condition of source.conditions) {
        if (condition.step_id === undefined) {
            // 非步骤条件：跳过步骤状态类（无法语义化），其余转数值/布尔条件
            if (/^QUEST_COND_.*STATE/.test(condition.type)) continue;
            groups.push([get_value_condition(condition, references, lang)]);
            continue;
        }

        // 步骤条件：优先解析为本任务内部步骤，其次外部任务步骤
        const own_reference = own_references.get(condition.step_id);
        const reference = own_reference || references.get(condition.step_id);
        if (!reference) {
            // 未导出的步骤保留原始状态数字，交给通用数值条件控件处理。
            groups.push([{
                id: JSON.stringify(['step_state', String(condition.step_id)]),
                title: String(condition.step_id),
                subtitle: condition.type,
                type: 'number',
                value: Number(condition.params[1]) || 0,
                comparison: condition.type.includes('NOT_EQUAL') ? 'not_equal' : 'equal',
            }]);
            continue;
        }

        const task = own_reference ? null : reference.task;
        const operand = {
            id: JSON.stringify(['step', task, reference.step]),
            title: reference.title,
            subtitle: reference.subtitle,
            type: 'step' as const,
            task,
            step: reference.step,
            ...(condition.state ? { state: get_task_state(condition.state) } : {}),
        };
        groups.push(condition.type.includes('NOT_EQUAL') ? [operand, 'not'] : [operand]);
    }

    return build_expression(source.logic, groups);
}
