# 常驻 NPC 对话初版

## 数据链路

`NpcFreeTalkIndex → NpcGroup → TalkExcel → Talk/Npc 或 Talk/Quest → InterAction`

- 以索引中的 NPC 和 `isDaily`、非隐藏配置作为候选；不按名字或编号范围推测关联。
- NpcGroup 中的显式 talk ID 建立起点，再沿 TalkExcel 的 `nextTalks` 补齐话题和跨任务正文。
- Npc、Quest 正文分别索引，使用正文内部 talk ID 与明确的 `initDialog` 关联。入口不按乘法推导。
- 常驻 NPC 没有任务步骤；任务进度只作为对话条件或关联任务链接。
- 不同条件版本保留在同一 NPC 的 talks 中。菜单按 `nextTalks` 顺序保留全部符合条件的话题，不使用任务的同入口优先级去重。
- InterAction 有覆盖时使用其后继，否则保留原始后继；句内条件、变量、物品操作复用任务处理。

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

共享代码位于提取层 `extract/dialogue.js`、Wiki 层 `src/utils/dialogue.ts`、服务端 `utils/dialogue.ts`。前端句内流程仍复用 `task_flow.ts`，NPC 的入口和菜单由 `npc_flow.ts` 单独处理，不创建任务步骤。
