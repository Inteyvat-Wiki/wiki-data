# 任务气泡字幕导出规则 v1

气泡写入 `Task.bubbles`，与对话 `talks`、旁白字幕 `narrations` 并列。每条记录表示脚本中的显示或清理请求，不保证游戏运行时一定播放。正式导出静态读取 `src/lua` 字节码，不执行游戏 Lua。

## 六条基本规则

1. **归属明确**：由 actor 的 `Quest{id}` 确定任务，从 `OnSubStart/OnSubFinish/OnSubFailed` 追踪辅助方法与白名单回调；原始子任务必须能映射到该任务实际导出的步骤。参数可来自明确匹配的客户端配置、纯常量共享配置或无条件初始化的模块变量；运行时可改写的全局变量保留未知。
2. **接口明确**：仅采用下表五个接口。显示记录必须同时具有确定的正安全整数 NPC ID、文字 ID，以及可解析且无歧义的文本；否则警告并跳过。
3. **一条一句**：按明确文字 ID 查询全部 `BinOutput/Talk` 命名空间和 DialogExcel，通过普通及 Medium TextMap 取文。同 ID 的可解析来源必须内容一致；中文参考内容冲突时，其他语言也不得绕过。不修补缺失 hash，不猜相近 ID，不展开 `nextDialogs`。
4. **说话者准确**：气泡挂载对象与显示名称取接口的 NPC 参数；对话表原角色仅作为 `dialog_speaker` 证据保留。原角色为空的记录可通过已核验的正文 hash 字段识别，不因此丢弃文字。不同 NPC 使用同一句文字时分别导出。
5. **上下文保留**：保留条件、回调、延迟及显式清理请求。仅累计已知非负有限延迟；任一环节未知则用 `delay_unknown: true`，不输出不完整的延迟总数。不由步骤结束推断清理，不由文件顺序推断连续播放。
6. **标识稳定**：以“生命周期入口 + 导出步骤 + 源调用位置”为基础键；同一位置的不同参数、条件或回调路径分别保留，完全相同路径去重。多路径后缀使用语义摘要，不依赖遍历次序或翻译文字。

## 接口与清理范围

| Lua 接口 | `action` | `scope` | 必需业务字段 |
|---|---|---|---|
| `CreateSpeechBubbleTask` | `create` | `quest` | NPC、单句文字；保留其余位置参数 |
| `TriggerNpcSpeechBubble` | `trigger` | `npc` | NPC、单句文字 |
| `ClearSpeechBubbleTask` | `clear_task` | `quest` | 无 |
| `StopQuestSpeechBubbleByNpc` | `clear_npc` | `quest` | NPC |
| `ClearNpcSpeechBubble` | `clear_npc` | `npc` | NPC |

`quest` 表示包装器限定当前任务；`npc` 表示按 NPC 发出请求、接口未显式限定任务，不据此断言底层引擎的全局影响范围。清理记录不携带文字。创建接口的尾部 `parameters` 只保留位置和值，未知值用 `{ "unknown": true }` 或 `{ "reference": "…" }` 表示，暂不猜测时长、半径等含义。

## 字段约定

| 字段 | 规则 |
|---|---|
| `type` | 固定 `speech_bubble` |
| `step` / `event` | 导出步骤序号；`start`、`finish` 或 `failed` |
| `source` / `api` | `文件.luac:原型路径:指令位置`；原接口名 |
| `action` / `scope` | 按接口表确定，均为必填 |
| `conditions` | Lua 条件的后缀表达式；无条件为 `[]`，未能解释的判断保留布尔证据 |
| `npc_id` | 显示、按 NPC 清理时必填 |
| `dialog_id` / `dialog` / `text_sources` | 仅显示事件必填；`dialog.next_dialogs` 固定 `[]` |
| `dialog_speaker` | 可选；可解析来源的原角色一致时保留 |
| `delay` / `delay_unknown` | 已知累计延迟大于零时输出 `delay`；未知时仅输出 `delay_unknown`；均非实际播放时刻 |
| `callbacks` | 可选；保留注册位置、接口、参数序号及回调种类；参数序号从 0 开始，不含 `self` |
| `after` / `after_source` | 可选；`after` 必须指向已导出的本任务 narration；无法关联时仅保留原始 `after_source`，不得视为有效关联 |

单路径记录键为 `event:step:source`；多路径为 `event:step:source:path:摘要`。同一 helper 被多个步骤调用时，必须保留每个步骤的入口上下文。

## 允许展开的回调

以下为实际参数位置，从 **1** 开始、不含 `self`。白名单只展开对应完成/安全/延迟回调，不因方法名称含有 `Narrator` 就展开。

| 接口 | 回调参数位置 |
|---|---:|
| `CallDelay` | 2 |
| `AfterMainPageActiveSafeCall`、`ActionSafeCall` | 1 |
| `QuestNarratorTask`、`NarratorOnlyTask`、`NarratorOnlyTaskLegacy`、`NarratorOnlyTaskByData`、`NarratorOnlyTaskByDataSpecifyingResumeReminder`、`NarratorTaskByData` | 2 |
| `NpcNarratorOnlyTaskByData` | 3 |
| `NarratorTask`、`NarratorTaskLegacy`、`WarningNarratorTask` | 4 |

`NarratorOnlyTaskByDataWithPriority` 没有完成回调参数；`NarratorOnlyTaskByData` 的销毁回调不作为字幕播放完成。区域触发、移动完成、未知原生回调及动态 NPC 暂不纳入。

## 验收与边界

运行 `npm run check:bubbles`、`npm run check:bubbles:export` 和 `npm run check:narration`。检查接口范围、步骤归属、单句文字、清理字段、回调位置、未知延迟、稳定标识和已有旁白回归。

2026-10-22 续查核验：29,564 份字节码、542 个生命周期气泡候选，其中显示候选 366 条；中英各检查 3,078 个任务对象，78 个任务含 236 条显示事件（64.5%），另有 146 条清理事件，合计覆盖 102 个任务。此为当前任务目录下的保守覆盖，详见 [覆盖率与缺口](research/task_bubbles_coverage_2026-10-22.md)。

## 正式导出与前端

运行 `npm run gen:tasks` 生成中英文正式任务数据；追加输出目录参数可同步至站点，例如 `npm run gen:tasks -- ../Inteyvat-Wiki/data`。版本 ID 可含内部点号（如 `quest-v1.x`），空点段及路径字符仍被拒绝，服务端按相同规则校验并检查 ID 索引。

站点的气泡和悬浮字幕共用 `TaskTalk` / `TalkDialogs`，仅将特殊标记改为「气泡字幕」。开始事件列在步骤开始区，完成/失败事件列在对应结束区；沿用悬浮字幕的条件、步骤结果及前置字幕过滤，支持单句与整任务复制。清理事件仅留在数据中，不作为文字卡片显示。未知延迟单独标记，服务端按普通对话处理正文与说话者名称。

2026-10-22 已生成两套正式输出（数据仓库及站点目录），中英各 236 条显示、146 条清理，覆盖 78 个有文字任务；站点类型检查、条件回归、正式构建与实际接口检查通过。独立研究样例仍位于 `.cache/bubble-export-check`。历史调查见 [10 月 17 日记录](research/task_bubbles_2026-10-17.md)，规范化证据见 [10 月 22 日记录](research/task_bubbles_2026-10-22.md)，覆盖率见 [续查记录](research/task_bubbles_coverage_2026-10-22.md)。
