# 任务气泡导出

`Task.bubbles` 与 `talks`、`narrations` 并列，保存气泡请求及清理事件。`step` 是当前任务导出的步骤序号，`event` 是 start/finish/failed；`source` 保存 Lua 文件、原型路径和指令 PC。

## 可核验的关联方式

1. 通过 actor 的 `Quest{id}` 别名恢复所属任务，并读取对应 ClientConfig 与 OnDataLoaded 捕获变量。
2. 从 `OnSubStart/OnSubFinish/OnSubFailed` 入口追踪同 actor 辅助方法，以及已识别的 CallDelay、AfterMainPageActiveSafeCall、ActionSafeCall、字幕完成回调。
3. 只有原始步骤出现在该任务实际导出的步骤映射中，才导出该事件。
4. CreateSpeechBubbleTask / TriggerNpcSpeechBubble 要求 NPC 与文字 ID 均为确定的正整数，文字必须可解析。动态参数、缺失文本或互相冲突的文本候选会警告并跳过。

正式导出直接读取 `src/lua` 的字节码，不依赖研究缓存中的 JSON 或反编译文本，也不会执行游戏 Lua。

## 事件结构

- `action=create`：调用 CreateSpeechBubbleTask，安排任务气泡。
- `action=trigger`：调用 TriggerNpcSpeechBubble。
- `action=clear_task`：调用 ClearSpeechBubbleTask；包装器完成当前 speechBubbleTask 并清空 actor 引用。
- `action=clear_npc`：调用 StopQuestSpeechBubbleByNpc 或 ClearNpcSpeechBubble。保留 `api` 区分任务气泡与 NPC 清理请求，不将两者视为等价范围。

显示事件携带 `npc_id`、`dialog_id`、单句 `dialog`、`text_sources` 和创建接口的尾部 `parameters`。该句不展开 nextDialogs；相同文字绑定不同 NPC 时也不合并。显示名称查 NPC 参数对应的名称；对话表角色另存于 `dialog_speaker`，避免错用。

`parameters` 保留参数位置，未知值以 unknown/reference 表示。包装器重排了部分参数，但缺少原生实现证据，暂不将它们命名为持续时长、重复间隔或半径。

`conditions` 保留必要 Lua 分支，包括上层 helper/回调注册处的条件；不完整的路径仍为未知布尔条件。`delay` 是识别出的延迟配置之和，不能当成真实墙钟播放时间。`callbacks` 保留注册来源、接口和参数位置；字幕完成关系还保留 `after`，指向同一任务的 narration 记录。

气泡创建不等于立刻显示，清理请求也不证明此前每一句均已显示。不会由步骤完成自动推断所有气泡结束，更不会把多 NPC 气泡当成连续对话。

## 文本来源

先收集明确引用的文字 ID，再检查所有 BinOutput/Talk 命名空间与 DialogExcel。按真实内容识别字段并合并普通/Medium TextMap。同一 ID 有多个来源时，只有可解析的文字一致才采用；缺失 hash 不进行 XOR 修补或相近 ID 猜测。

## 当前范围与核验（2026-10-17）

正式路径分析 29,564 份字节码，得到 542 个生命周期气泡候选事件。按当前任务目录与明确参数、文本筛选后，中英各生成：

| 指标 | 数量 |
|---|---:|
| 检查的任务对象 | 3,078 |
| 含气泡文字的任务 | 58 |
| 气泡文字事件 | 186 |
| 清理事件 | 146 |
| 含任意气泡/清理事件的任务 | 100 |
| 带条件的事件 | 26 |
| 带已知延迟的事件 | 84 |
| 带回调路径的事件 | 99 |

这是当前任务列表下的保守覆盖，不是客户端所有气泡数量。区域 TriggerIn、未知原生回调、移动完成回调、动态 NPC 和无法解析的文本仍未接入。研究计数与正式覆盖不可混用。

核验命令：

```powershell
npm run check:narration
npm run check:bubbles
npm run check:bubbles:export
```

第三项检查全部任务对象并将含气泡事件的对象写入 `.cache/bubble-export-check` 供查看，不发布到正常 data 目录。类型检查和 3,793 个任务 actor 上下文的中英字幕基线比较也已通过，原有字幕结果一致。

示例为中文 `.cache/bubble-export-check/zh_hans/task/items/proof_of_guilt.json`：任务「定罪公文」的原始步骤 201711 映射为页面步骤 13，其中 NPC 12260 显示「好像是神像那边…」，原对话表角色 12139 单独保留。

该任务在页面步骤 13、14、15 的开始入口复用 SneakClear 清理气泡；步骤 13 先清理，再注册新的气泡。测试也验证同一清理 helper 保留三个步骤上下文，不能改写成统一的“步骤完成时清理”。

## 整库写入与展示限制

当前任务列表中有 361 个带点的版本 ID，例如 behind_the_scenes-v1.x；现有 `export_category` 仅允许字母、数字、下划线及短横线，完整 gen_task 写入会因此停止。服务器 ID 校验也有同一限制。这是已有任务命名/校验不一致，本次没有改名或放宽校验。

此外，当前任务对象与旧 data 缓存存在 153 个任务的其他字段差异。本次只生成独立检查样例，未覆盖现有任务 data。正式代码已经接入下次任务对象生成流程；正常整库落盘需要先统一版本 ID 规则。

前端气泡组件和服务器气泡文字参数处理尚未接入。后续展示应按步骤列出独立气泡及触发上下文，并保留清理、条件和回调关系。
