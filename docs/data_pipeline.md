# 数据提取与页面生成的分层

所有本轮涉及的数据均遵循：

```text
原始游戏数据、Lua 输入
  → GenshinData-scripts 原始提取
  → genshin-db 数据与索引、查询接口
  → wiki-data 页面转换、图片匹配与导出
```

## 上游提取和索引

wiki-data 的四类新栏目沿用现有职责分层：`Data` 负责 genshin-db 查询，`ConvertRaw`
负责显式键映射和通用图片接口，各转换器显式组装 Wiki 字段，不展开透传整个上游记录。
分类结构也由 Wiki 自己声明，避免直接把上游类型当作下游契约。

`gen_serenitea`、`gen_tcg`、`gen_miliastra`、`gen_misc` 与其他栏目一样调用
`export_category`；通用导出器通过可选的第四参数统一写入公共辅助文件。
它们自行配置目标图片目录，直接调用也会生成 `ids`、`source_ids`、`id_aliases`、
`assets`，不再依赖专用 CLI 补写。这不改变现有详情、列表或兼容 URL。

可运行 `npm run check:data-catalogues`、`npm run check:category-export` 验证完整结果、
上游额外字段隔离和直接生成入口。验证输出仅写入临时目录。

在 GenshinData-scripts 中运行：

```text
npm run export:archives
npm run export:subtitles
npm run test:archives
npm run test:subtitles
```

源表/TextMap/BinOutput 的位置由该仓库 `config.json` 的 `GenshinData_folder` 决定。
Lua 输入取 `GENSHIN_LUA_PATH`、`Lua_folder` 或默认 `.cache/lua`，不再取 wiki-data
的 `src/lua`；不提交游戏输入。显式字幕导出在输入缺失/为空时报错，普通全量导出在
Lua 目录缺失时提示并保留已有字幕数据，不以空结果静默覆盖。Lua 仅静态解析。

在 genshin-db 中运行：

```text
npm run makeIndex -- --folders serenitea tcg miliastra tasksubtitles --languages ChineseSimplified English
```

新增查询入口为 `serenitea`、`tcg`、`miliastra`、`tasksubtitles`，均接入常规索引、
类型声明及标准文件夹打包流程。例如：

```js
genshindb.serenitea('companion-9002', {
    resultLanguage: 'ChineseSimplified', queryLanguages: ['ChineseSimplified'],
    matchIds: true, matchNames: false, matchAltNames: false,
});
genshindb.tasksubtitles('2017', { matchIds: true, matchNames: false });
```

三类栏目保留稳定源 ID、源顺序、真实文本、资源名、原始外部关系和原始对白。
资源/外部关系不包含 Wiki 地址。任务字幕按原始主任务 ID 查询，`step` 及事件键中的
步骤字段是原始子任务 ID，不是网站步骤号。每个对象使用标准 TextMap 版本跟踪。

## wiki-data 的职责

```text
npm run gen:archives
npm run gen:tasks
npm run check:archives
npm run check:narration
npm run check:bubbles
npm run check:bubbles:export
```

`src/utils/archive.ts` 查询 genshin-db，使用已有对话转换引擎解析展示条件和路径，
匹配已提取的 PNG、解析实际存在的站内链接，并保留来源与诊断。
`src/utils/task_subtitles.ts` 查询字幕数据，仅将原始子任务 ID 映射为本任务步骤号，
同时转换事件键和 `after` 引用；不识别 Lua、源表或 TextMap 字段。

源表锚点、原文覆盖、分类/布局和 Lua 静态解析测试已迁到 GenshinData-scripts。
本层测试通过查询核验记录、图片、站内链接和展示图，并对直读游戏/Lua 输入设置失败断言。
源数据未生成或未建索引时明确报错，不回退直读源目录。转换不得改写 genshin-db 缓存对象。

四类栏目的跨栏目关系统一通过 `src/utils/page_reference.ts` 按源数值 ID 对照维护目录，
再核验当前输出目录、当前语言的目标页面；禁止按同名页面猜测关联。
未发布的目标不生成链接，保留原始来源引用。NPC 映射遵循 NPC 导出的维护别名和自动补全规则。
类型、关系分类、关系角色、文本段类型及图片类型由 `ConvertRaw` 显式映射；
当前同名键也必须登记，未知键报错，原始文本与来源引用不参与改名。
`npm run check:archive-references` 验证 NPC 源 ID 闭合，
`npm run check:archive-enums` 验证已知映射和未知键失败行为。

页面分组使用统一的 `grouped_entries` 和 `items / related_items / show`，
`group: { id, mode }` 标明规范入口与展示方式。大厅主题配对维护在
`src/data/miliastra_hall_groups.js`；成就阶段只沿明确、双向闭合的前后阶段关系组合。
分组只改变 `pages.json`，原条目文件、源 ID、历史别名及条目接口不合并或覆盖。
Wiki 使用公共 `get_page_data` 加载成员后组合显示，服务端不再特判大厅或成就。
因此条目接口返回单条数据，合并页面由页面目录驱动；旧网页地址仍展示完整分组。
`npm run check:page-groups` 检查分组闭合、循环、子集与原记录不可变性。

## 2026-10-23 迁移验证

迁移前后的中英栏目条目、页面顺序与任务 JSON 按语义逐项比较一致。
每语言三类栏目分别为 2755、2340、3524 条；任务为 3078 条。
气泡文字仍覆盖每语言 78 个任务、236 条文字，另保留 146 条清理事件。
原 Lua 输入未删除；迁移使用提取仓库忽略目录中的副本，生成数据和缓存不加入提交。
