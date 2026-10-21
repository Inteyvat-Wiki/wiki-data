import { InteractionData } from '~/utils/data';
import { Lang, t } from '~/utils/i18n';
import { get_task_conditions } from '~/utils/task_condition';
import { get_interaction_dialogs } from '~/utils/task_interaction';
import { get_task_operations } from '~/utils/task_item';
import type { InteractionDialog } from '~/utils/task_interaction';
import type { TaskDialog, TaskDialogNext, TaskDialogRole, TaskOperation, TaskStepReference } from '~/types/task';

export type SourceDialog = {
    id: number,
    content: string,
    role: string,
    show_type?: string,
    speaker_name?: string,
    speaker_title?: string,
    speaker_subtitle?: string,
    next_dialogs: number[],
    action_before?: string,
    action_while?: string,
    action_after?: string,
};

type SourceDialogue = {
    perform_cfg?: string,
    initial_dialog?: number,
    menu_option?: boolean,
    dialogs: SourceDialog[],
};

export function get_source_dialog(dialog: any): SourceDialog {
    return {
        id: dialog.id,
        content: dialog.content,
        role: dialog.roleType,
        ...(dialog.showType ? { show_type: dialog.showType } : {}),
        ...(dialog.speakerName ? { speaker_name: dialog.speakerName } : {}),
        ...(dialog.speakerTitle ? { speaker_title: dialog.speakerTitle } : {}),
        ...(dialog.speakerSubtitle ? { speaker_subtitle: dialog.speakerSubtitle } : {}),
        next_dialogs: dialog.nextDialogs,
        ...(dialog.actionBefore ? { action_before: dialog.actionBefore } : {}),
        ...(dialog.actionWhile ? { action_while: dialog.actionWhile } : {}),
        ...(dialog.actionAfter ? { action_after: dialog.actionAfter } : {}),
    };
}

// 源数据 id -> 导出序号（从 1 开始）
export function get_key_map(items: { id: number }[]): Map<number, number> {
    return new Map(items.map((item, index) => [item.id, index + 1]));
}

// 按映射转换 id 列表；映射不到的 id 丢弃（前置/后续任务可能不在导出范围内）
export function map_ids(ids: number[], references: Map<number, number | string>): (number | string)[] {
    return ids.flatMap(id => {
        const reference = references.get(id);
        return reference === undefined ? [] : [reference];
    });
}

const black_screen_roles = [
    'TALK_ROLE_BLACK_SCREEN',
    'TALK_ROLE_NEED_CLICK_BLACK_SCREEN',
    'TALK_ROLE_CONSEQUENT_BLACK_SCREEN',
    'TALK_ROLE_CONSEQUENT_NEED_CLICK_BLACK_SCREEN',
];

// 原始角色类型 -> 语义化角色；无法识别的返回 undefined（表示丢弃该对话）
function get_dialog_role(role: string, show_type?: string, is_choice = false): TaskDialogRole | undefined {
    // 黑屏是独立的显示语义；其余显式选择和分支选择优先于说话人角色。
    if (black_screen_roles.includes(role)) return 'black_screen';
    const is_select = is_choice || show_type === 'TALK_SHOW_FORCE_SELECT';
    if (role === 'TALK_ROLE_NPC' || role === 'TALK_ROLE_MATE_AVATAR') return is_select ? 'select' : 'npc';
    if (role === 'TALK_ROLE_PLAYER' || role === 'TALK_ROLE_NONE') return is_select ? 'select' : 'text';
    return undefined;
}

// 说话人：同伴用通用称呼，玩家用 {NICKNAME} 占位（由前端 process_text 替换）
function get_speaker(dialog: SourceDialog, lang: Lang): string | undefined {
    if (dialog.role === 'TALK_ROLE_MATE_AVATAR') return t('ingame.mate_name', lang);
    if (dialog.role === 'TALK_ROLE_NPC') return dialog.speaker_title || dialog.speaker_name;
    if (dialog.role === 'TALK_ROLE_PLAYER') {
        return dialog.speaker_title || dialog.speaker_name || '#{NICKNAME}';
    }
    return dialog.speaker_title;
}

function get_choice_dialog_ids(
    dialogs: SourceDialog[],
    next_dialogs: Map<number, number[]>,
    interaction_dialogs: Map<number, InteractionDialog>,
): Set<number> {
    const visible_ids = new Set(dialogs
        .filter(dialog => get_dialog_role(dialog.role, dialog.show_type) !== undefined)
        .map(dialog => dialog.id));
    const choice_ids = new Set<number>();

    // 选择关系由父节点的有效分支决定，不能只依据子节点的 showType。
    for (const dialog of dialogs) {
        const interaction = interaction_dialogs.get(dialog.id);
        const next_ids = interaction
            ? interaction.next_dialogs.filter(next => next.choice).map(next => next.dialog)
            : [...new Set(next_dialogs.get(dialog.id) || [])];
        const visible_next_ids = next_ids.filter(id => visible_ids.has(id));
        if (interaction || visible_next_ids.length > 1) {
            visible_next_ids.forEach(id => choice_ids.add(id));
        }
    }
    return choice_ids;
}

export function get_talk_dialogs(
    talk: SourceDialogue,
    references: Map<number, TaskStepReference>,
    own_references: Map<number, TaskStepReference>,
    lang: Lang,
): { dialogs: Record<string, TaskDialog>, initial_dialogs?: TaskDialogNext[], operations?: TaskOperation[] } {
    const dialogs = talk.dialogs;
    const interaction = talk.perform_cfg
        ? get_interaction_dialogs(
            () => InteractionData.find_interaction(talk.perform_cfg!)
                || InteractionData.find_interaction_by_dialog_ids(dialogs.map(dialog => dialog.id)),
            dialogs.map(dialog => dialog.id),
            conditions => get_task_conditions(conditions, references, own_references, lang),
            talk.perform_cfg,
        )
        : { dialogs: new Map<number, InteractionDialog>(), initial_dialogs: [] };
    const interaction_dialogs = interaction.dialogs;
    const effective_next_dialogs = new Map(dialogs.map(dialog => [
        dialog.id,
        interaction_dialogs.get(dialog.id)?.next_dialogs.map(next => next.dialog) || dialog.next_dialogs,
    ]));

    // 丢弃角色类型无法识别的对话，再统一重编号
    const visible_dialogs = dialogs.filter(dialog => get_dialog_role(dialog.role, dialog.show_type) !== undefined);
    const choice_ids = get_choice_dialog_ids(dialogs, effective_next_dialogs, interaction_dialogs);
    if (talk.menu_option && talk.initial_dialog !== undefined) choice_ids.add(talk.initial_dialog);
    const keys = get_key_map(visible_dialogs);

    function map_next(next: InteractionDialog['next_dialogs'][number]): TaskDialogNext | undefined {
        const key = keys.get(next.dialog);
        if (key === undefined) return undefined;
        return {
            dialog: key,
            ...(next.conditions ? { conditions: next.conditions } : {}),
            ...(next.branches ? { branches: next.branches } : {}),
        };
    }

    const result = Object.fromEntries(visible_dialogs.map((dialog, index) => {
        const role = get_dialog_role(dialog.role, dialog.show_type, choice_ids.has(dialog.id))!;
        const speaker = get_speaker(dialog, lang);
        const interaction = interaction_dialogs.get(dialog.id);
        const next_dialogs = interaction
            ? interaction.next_dialogs.flatMap(next => map_next(next) || [])
            : map_ids(dialog.next_dialogs, keys).map(next => ({ dialog: next as number }));
        const actions = get_dialog_actions(dialog);
        return [String(index + 1), {
            content: dialog.content,
            role,
            ...(speaker ? { speaker } : {}),
            ...(dialog.speaker_subtitle ? { speaker_subtitle: dialog.speaker_subtitle } : {}),
            ...(actions.length ? { actions } : {}),
            next_dialogs,
            ...(interaction?.operations ? { operations: get_task_operations(interaction.operations, lang) } : {}),
        }];
    }));
    const initial_dialogs = interaction.initial_dialogs.flatMap(next => map_next(next) || []);
    if (!initial_dialogs.length && talk.initial_dialog !== undefined) {
        const dialog = keys.get(talk.initial_dialog);
        if (dialog !== undefined) initial_dialogs.push({ dialog });
    }
    return {
        dialogs: result,
        ...('operations' in interaction && interaction.operations?.length ? { operations: get_task_operations(interaction.operations, lang) } : {}),
        ...(initial_dialogs.length > 0 ? { initial_dialogs } : {}),
    };
}

function get_dialog_actions(dialog: SourceDialog): NonNullable<TaskDialog['actions']> {
    const result: NonNullable<TaskDialog['actions']> = [];
    for (const [timing, source] of [
        ['before', dialog.action_before], ['while', dialog.action_while], ['after', dialog.action_after],
    ] as const) {
        if (!source) continue;
        const data = InteractionData.find_interaction(source);
        const types = new Set<string>();
        function visit(value: any) {
            if (Array.isArray(value)) { value.forEach(visit); return; }
            if (!value || typeof value !== 'object') return;
            const type = value._type || value.type;
            if (type === 'SHOP_EXCHANGE') types.add('shop');
            if (type === 'LUA_ACTION') types.add('script');
            if (type === 'UI_TRIGGER') types.add('interaction');
            Object.values(value).forEach(visit);
        }
        visit(data);
        if (!data) types.add('unknown');
        for (const type of types) result.push({ type, timing, source });
    }
    return result;
}
