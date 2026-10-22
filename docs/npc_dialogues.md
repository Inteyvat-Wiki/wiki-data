# 常驻 NPC 对话初版

## 数据链路

`NpcFreeTalkIndex → NpcGroup → TalkExcel → Talk/Npc 或 Talk/Quest → InterAction`

- 以索引中的 NPC 和 `isDaily`、非隐藏配置作为候选；不按名字或编号范围推测关联。
- NpcGroup 中的显式 talk ID 建立起点，再沿 TalkExcel 的 `nextTalks` 补齐话题和跨任务正文。
- Npc、Quest 正文分别索引，使用正文内部 talk ID 与明确的 `initDialog` 关联。入口不按乘法推导。
- 常驻 NPC 没有任务步骤；任务进度只作为对话条件或关联任务链接。
- 不同条件版本保留在同一 NPC 的 talks 中。菜单按 `nextTalks` 顺序保留全部符合条件的话题，不使用任务的同入口优先级去重。
- NPC 名称取自 NpcExcel 的文本引用；称号（`title`）通过 ManualTextMap 中明确的 `NPC_TITLE_{id}` 键查询文本引用，可表示职业、身份或所属。沿用清洗和 `process_text`，不固定 TextMap 哈希。没有称号时不展示该项。
- 出生点读取 `BinOutput/Scene/SceneNpcBorn` 与 `SceneNpcBornNoGroup`，按记录中的 `_configId` 关联 NPC ID。genshin-db 导出 `birthPoints`，Wiki 与接口导出 `birth_points`；不把出生点填入对话的触发点。
- InterAction 有覆盖时使用其后继，否则保留原始后继；句内条件、变量、物品操作复用任务处理。

## 出生场景与坐标

`birth_points` 保留源记录顺序，不合并同坐标的不同实例，也不选取某个点作为唯一固定位置。每条记录包含：

- `scene_id`、`id`：场景 ID、出生实例 ID；实例 ID 需要结合场景和来源识别，不是 NPC ID。
- `position`：场景中的 `[x, y, z]` 原始坐标，不转换成地图坐标；缺少绝对坐标时为 `null`。
- `source`：原始 JSON 路径。
- `room_id`、`group_id`、`suite_ids`、`priority`：源记录存在时保留。
- `raw_conditions`：原始出现条件的嵌套数组，保留未知条件，不参与现有对话条件求值。它属于原始数据，内部字段不作为稳定接口解析。
- `platform`：平台的 `group_id` 与 `config_id` 引用；尚未解算平台变换和相对偏移。

找不到出生记录时列表为空。当前 1,838 名 NPC 中，1,595 名具有直接坐标，另 5 名仅有平台关联，238 名在这两类配置中没有记录；183 名具有多条出生记录。静态出生记录不代表当前状态下必然出现，也不等于 NPC 移动后的实时位置。此次只导出数据，暂不接入前端地图。

## 分类与键名

- genshin-db 独立分类 `npcs`，支持名称、`NPC 1567` 形式的别名、ID 查询。同名 NPC 应用别名或 ID 定位。
- Wiki 数据独立分类 `npc`：`common/npc/ids.json`、`{lang}/npc/pages.json`、`{lang}/npc/items/{id}.json`。
- `src/data/npcs.js` 单独维护 Wiki 键与查询别名。未配置的 NPC 使用 `npc_{id}` 稳定键；人工配置的顺序保留。
- 页面位于 `/travel-log/npc/{id}`，列表入口属于旅行日志。中英文共用一套页面 ID；缺少英文名称时回退中文名称。

## 生成与验证

在 GenshinData-scripts 正常提取流程中已接入 `npcs`。仅生成当前前端使用的两种语言：

```powershell
node -e 'const {exportData}=require("./extract/global");exportData("npcs",require("./extract/extractNpc"),false,false,["CHS","EN"]);'
```

在 genshin-db 更新索引：

```powershell
npm run makeIndex -- --folders npcs --languages CHS EN
```

在 Inteyvat-Wiki-data 生成与检查：

```powershell
npm run gen:npcs
npm run check:npcs
```

生成后，将 `data/common/npc` 和 `data/{zh_hans,en}/npc` 同步到前端对应目录。此次已完成本地同步。完整 `npm run gen` 也已接入 NPC 分类。

前端流程检查可用 wiki-data 的 tsx 运行 `Inteyvat-Wiki/scripts/check_npc_flow.ts`（工作目录为前端项目），另执行 `npm run typecheck`、`npm run build`。

## 当前覆盖与边界

当前数据版本中，中英文各导出 1,838 名 NPC、10,801 段对话、36,837 句文本。导出记录内有 296 条缺少明确入口正文、4 条缺少有效 Talk 配置，保留在 `diagnostics`，不补造跳转。没有有效入口的候选 NPC 暂不生成页面，因此此数量不代表游戏全部常驻 NPC 的完整覆盖。

前端可调整条件、切换入口版本、选择话题及句内分支，支持三种对话显示方式和复制。未设置的条件不自动判为成立，条件面板沿用现有默认值。

商店、UI 交互和 Lua 行为保留来源并显示提示，不执行游戏脚本；原始 `finishExec` 保存在 genshin-db，尚未模拟其游戏状态变化。尚未恢复场景出现/日程规则、所有 Lua 副作用，以及缺失正文引用。`isDaily` 只是候选筛选，不能据此宣称每段对话始终可见。

共享代码位于提取层 `extract/dialogue.js`、Wiki 层 `src/utils/dialogue.ts`、服务端 `utils/dialogue.ts`。前端任务与 NPC 均使用 `task_flow.ts` 处理句内分支和跨 Talk 后继，选择界面复用 `TalkFlowSelector.vue`。`npc_flow.ts` 仅确定本轮 NPC 入口并限定沿显式后继继续，不创建任务步骤；对话终止后不会自动切入其他独立入口。后继选择已展示入口句时，不再在正文中重复展示同一句的单选控件。
