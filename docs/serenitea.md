# 尘歌壶真实数据导出

入口为 `get_serenitea_export(lang)` 和 `gen_serenitea(lang, directory)`。后者沿用
`export_category`；统一生成、页面及接口说明见 [archives.md](archives.md)。

## 页面与源表

Wiki 中英各 2632 页，使用相同的稳定 ID，不依赖本地化名称或给同名内容另造标题：

| type | 数量 | ID | 原始来源 |
| --- | ---: | --- | --- |
| `realm` | 8 | `realm-{id}` | `HomeworldModuleExcelConfigData` |
| `furniture` | 2392 | `furniture-{id}` | `HomeWorldFurnitureExcelConfigData`，排除角色摆设 |
| `suite` | 111 | `suite-{suiteID}` | `FurnitureSuiteExcelConfigData` |
| `companion` | 121 | `companion-{npcID}` | `HomeWorldNPCExcelConfigData`，含派蒙 |

genshin-db 保留上游的 2755 条源记录；Wiki 不再发布 2 个壶灵页面及 121 条角色摆设。
角色摆设通过 `companion` 的原始 `component` 关系确定，不按名称、ID 区间或本地化分类猜测。
独立 `companion` 页面和对白完整保留，不再链接被排除的摆设；原关系记入 `source.references`。
生成器同步更新页面清单、公共 ID 索引并清理旧条目 JSON，旧详情接口返回 404。

不读种子、音乐、图纸、制作或奖励数值。动物和宅邸使用摆设表中的壶内专属说明；
说明仅在 `description` 展示一次，不再复制到 section；原句中的数字及原始文本标记不清洗、不删改。
分类来自 `HomeWorldFurnitureType`
的两级实际名称，不把程序枚举当作本地化分类。没有源分类的记录保留并附诊断。

`classifications` 为结构化分类路径数组，每项保留分类表的 `typeID`（`id`）、
`typeCategoryID`（`group_id`）、大类名称 `group_name` 和小类名称 `name`，ID 均为字符串。
该字段从 GenshinData-scripts 提取，经 genshin-db 原样传递到详情与列表；不拆解分类说明文字。
当前 2392 条摆设中，2331 条有分类、61 条源分类为空；79 条有多重归属。
共涉及 13 个源大类 ID、73 个小类 ID，大类显示名称去重后为 12 种；同名不代表相同源 ID。

前端“摆设”标签内提供“大类 → 小类”联动菜单，含“全部”和“未分类”。
重名菜单项补充源 ID 以区分；同一摆设可出现在多个对应分类中，但单次结果不会重复。
筛选与检索、分页组合使用，网址保存 `type`、`group`、`subcategory`、`search`、`page`；
更换大类会清空小类，更换分类或检索会回到第一页。其他栏目不显示这两级菜单。

## 套装与关联

111 个套装读取 `BinOutput/HomeworldFurnitureSuit/{jsonName}.json`，使用
`HHDPMDCFCPK` 中的 `furnitureID/position/rotation`，共 1575 个放置实例。
源序列化省略的坐标轴或整个原点位置还原为零；不做坐标变换、不将重复摆设合并丢失。
`component` 关系按数量合并，摆设反向关联套装；原始实例始终保留在 `layout`。

偏好来自 `favoriteNpcExcelIdVec` 及 `HomeWorldEvent` 的实际角色/套装关联。
赠礼评价正文为对应 `talkID` 的结构化对白。角色页面仅由公共工具解析到已存在页面后
才加 `character` 关系；领域内部关系只指向实际导出的条目。
套装 31、32 的源分类为空、中文名称与正文相同，仍以不同源 ID 保留；
其中六条事件没有 `talkID`，用 `event_without_talk` 诊断，不编造评价。

## 对话范围

角色表的直接话题和事件表的直接评价共有 594 个唯一 Talk、7388 个 Dialog。
另加入同一角色 `QuestDialogue/HomeWorld/` 命名空间中的真实话题及显式后继闭包，
包括问候、菜单、重复话题和历史条件反馈。活动目录不是排除依据：万叶的
`6904720/6904716/6904712` 正文实际位于 `Talk/Activity`，仍是壶内菜单的明确后继。
不复制对应通用任务的完整步骤或正文，不纳入无壶内来源关系的活动/测试内容。

新旧话题保留为不同的源 Talk，但 `QUEST_COND_HOMEWORLD_NPC_NEW_TALK` 的前两个参数
（NPC、话题）共同标识一个布尔状态，第三个参数 `0/1` 是期望值，不能放入状态 ID 形成
两个独立开关。原始参数中的空占位不参与状态标识。新旧话题由同一个状态互斥筛选。
源数据仍保留两套记录；壶内角色页面只按条件浏览，保留选项/气泡模式与复制功能。
角色列表和详情均不展示图片或缺图占位，不影响摆设、套装等资料的图片展示。

阿圆、阿嘟的原始 gadget 对话仍可在上游查询和溯源，但不纳入 Wiki 的发布范围。
本层不读取原始游戏目录、不执行 Lua 或商店等游戏副作用。

## 缺译与图片

`HomeWorldNPC` 中 120 位角色的旧名称/说明哈希未命中当前 TextMap；
以相同 `furnitureID` 指向的实际摆设名称、说明或明确 `avatarID` 的名称保留记录，
同时记录原始未命中哈希。英文本身缺译时保留空值及诊断，不借中文填充；
例如 `furniture-373810` 至 `furniture-373821` 的英文名称为空，但页面没有删除。

图片全部调用公共 `archive_image`：保留实际资源名，只为 `src/images` 中已有成品
产生 URL。没有提取成品不等于游戏缺图。当前每种语言包含 2784 个图片引用，
本轮 AnimeStudio 7.1 按源名补提取后，其中 2772 个引用有本地成品可用（2686 个不同资源名）；
剩余 12 个花材摆设图标未命中当前索引，URL 仍为 null。

## 验证

源名称、源表范围、字段锚点与布局的校验已迁到 GenshinData-scripts：
运行 `npm run test:archives`。下面的 wiki-data 检查只通过 genshin-db 查询，
核验页面、实际图片、关系与对话转换，并禁止直读游戏源目录。

在本仓库运行：

```sh
node_modules/.bin/tsx scripts/check_serenitea.ts
node_modules/.bin/tsx scripts/check_archive_dialogues.ts
node_modules/.bin/tsc --noEmit --ignoreDeprecations 6.0
```

Wiki 查询检查仅在系统临时目录隔离公共图片复制，不调用正式导出。
验证页面数量和双语 ID/对白集合一致、源名称/原句、套装每个坐标/旋转/组件数量、
实际关联目标、全部 594 个直接 Talk、普通/历史菜单后继、所有图内引用和入口可达性。
Wiki 检查区分上游 2755 条与发布 2632 条，验证壶灵/角色摆设均被排除，
独立角色仍为 121 条，内部关系和套装点位不引用被移除页面，且转换不改写上游缓存。
脚本输出唯一 Talk/Dialog 数及套装重复展示计数，不把重复引用算作新增对白。
