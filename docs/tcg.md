# 七圣召唤首版真实导出

实现文件：`src/tcg.ts`。入口为 `get_tcg_export(lang)` / `gen_tcg(lang, directory)`，后者沿用 `export_category`。当前支持 `zh_hans`、`en`；统一生成及页面接口见 [archives.md](archives.md)。

源数据筛选、关系与对白提取由 GenshinData-scripts 完成，经 genshin-db 的 `tcg` 接口查询；本仓库仅负责页面转换、图片匹配和站内链接。更新步骤见 [数据分层](data_pipeline.md)。

关卡列表采用与牌手一致的紧凑双列布局，窄屏单列；只以 `opponent` 图片引用作为标题小头像，
不使用 `stage_loading` 加载图或对话参与者头像替代。列表头像为 32px，详情标题为 50px，
无图或加载失败时收起；关卡不恢复独立大图卡片。当前 1,411 个关卡中有 1,401 个具备可用对手头像。

牌手头像也只从明确以 `player` 角色关联的关卡 `opponent` 图片取得，统一由
GenshinData-scripts 提取。不再读取邀约角色图标、每周来客图标或邀约图片哈希。
同一牌手各关卡给出唯一资源名时才使用；无候选保持无图，多候选记录诊断而不任意选择。
`dialogue_participant` 关系不参与头像映射，来源关卡保留在 `source.references` 中。

## 内容与稳定 ID

卡牌的 `card_type: { id, name }` 直接读取 GCGCard/GCGChar.cardType，名称关联 ManualTextMap 的 `UI_GCG_CARD_TYPE_*`；`tags: { id, name, hidden? }[]` 保留 tagList（排除 NONE），名称和隐藏标记来自 GCGTag。两者经 genshin-db 传入条目及 pages，不在 wiki-data 推断分类。

卡牌列表支持类型单选、标签多选（AND，同时满足全部所选标签），并与关键词组合；网址以 `card_type` 和重复的 `tags` 参数保留筛选。类型切换或标签修改重置分页。隐藏标签保留在导出中但不进入展示/筛选；详情信息表展示卡牌类型和可见标签，不带逐项复制按钮。四类当前为角色牌 147、装备牌 269、事件牌 125、支援牌 88。

标签采用两级 Cascader 多选，父组仅展开，不可选中或全选子项；返回值仍为叶标签 ID，兼容原网址。界面按元素、武器类型、所属、卡牌属性、其他特性分组，分组由源枚举语义确定，是展示分组而非游戏数字筛选枚举的映射；未来未识别标签归入其他特性。组内依 GCGTag 源表位置（`tags[].order`）排序，详情也沿用该顺序，中英文一致。不修改原始 tagList 顺序。

中英文各 2,340 个对象，ID 集合及对话图键一致。名称不参与 ID，不为同名条目普遍追加人为名称。

| 类型 | 数量 | ID / 来源 |
| --- | ---: | --- |
| `card` | 629 | `card-{GCGDeckCard.id}`；只使用 `storyTitleTextMapHash` / `storyDescTextMapHash` 作为故事 |
| `card_back` | 40 | `card_back-{itemId}`；`GCGDeckBack` |
| `card_table` | 7 | `card_table-{itemId}`；`GCGDeckField` |
| `player` | 253 | `player-{Npc.id}`；包含对局 NPC 和明确关联的剧情对白参与者 |
| `stage` | 1,411 | `stage-{GCGGameReward.levelId}`；名称及关卡原始叙述 |

牌背、牌桌的默认记录省略了 protobuf 默认 `id`，因此统一使用真实存在的 `itemId` 定位，不编造默认 ID。629 张卡上的 1,258 个 `GCGCardFace` 变体作为 `images.kind=card_face:{cardFaceType}:{faceId}` 和内部引用保存，**不是 1,258 篇新增故事**。保留基础牌面、影幻/璀璨对应材料图标、卡牌 prefab、Spine、皮肤配置和资源哈希；不展开皮肤的通用说明。

`GCGCard.desc` 属于效果，不纳入故事。技能组、卡牌效果、规则表、状态、召唤物、关键词效果、奖励及平衡数值均不展开。关卡 `levelDecTextMapHash` 原句完整保留；其中原本内嵌的提示、特殊规则文字和数字不删改，也不单独当作规则条目。

## 253 名角色的构成

以下按顺序做并集，每行只统计此前没有出现过的 NPC：

| 来源 | 原始记录 / 不重复 NPC | 本行净增 |
| --- | --- | ---: |
| `GCGWorldLevel` | 113 条 / 108 人 | 108 |
| `GCGCharacterLevel` 邀约 | 108 条 / 108 人 | 108 |
| `GCGWeekLevel` | 115 条 / 115 人 | 20 |
| `GCGSceneConstNpc` | 5 条 / 5 人 | 5 |
| `GCGBossLevel.catId` | 39 条 / 5 只猫 | 5 |
| `GcgOtherLevel.talkId` 的显式对白 NPC | 12 条关卡映射 / 7 人 | 7 |
| `QuestDialogue/GCG` 命名空间补充入口 | 108 人，均已包含 | 0 |

合计 `108 + 108 + 20 + 5 + 5 + 7 = 253`。最后 7 人的 NPC ID 是 `20845, 4294, 4292, 4437, 30330, 1044, 1049`；这是剧情对白参与者，不宣称他们全部是经协会认证的牌手或该关卡的对手。其关卡关联角色标记为 `dialogue_participant`。

113 条世界牌手小传记录全部保留，其中 109 条有正文，覆盖 108 名 NPC。四条原始空记录 ID 为 `22, 36, 32, 26`；中英文均保留空小传/标题并产生 8 条 `missing_text` 诊断，不以中文替代英文，也不因此丢掉条目。

## 对话和真实去重口径

邀约 NPC Group、普通/困难胜负 Talk、世界挑战、`GcgOtherLevel` 及 `QuestDialogue/GCG` 入口复用共享 `archive_dialogue`。按已确认入口闭合后继；共享读取带出的其他 NPC 根入口会在本领域裁剪。不依据 `Talk/Activity` 文件夹名称剔除明确关联的历史对白，不执行 Lua。

每语言实际统计：

- 2,408 个不重复源 Talk，包含 2,609 个不重复、实际导出的源 **Dialog ID**。校验从共享字段检测得到的原始 `dialogId` 取并集，并逐 Talk 对照实际输出数量；不是把页面副本、本地重编号或文字去重当作 Dialog 数量。
- 其中 1,909 个 Dialog 已存在于当前正式 NPC 导出。剩余 700 个只是“不在当前 NPC 导出”，可能仍与已有任务重叠，**不宣称是全站新增 700 条**。此前已有的 1,359 Dialog 也不能重复记为新增。本轮统计范围还包括邀约胜负与剧情关卡，所以不以 1,359 当作全部历史重叠的上限。
- 108 名邀约角色关联内容中，源 Dialog 并集为 1,835；它也是上述 2,609 的子集，不额外相加。
- 对局另有 1,248 个由 `GCGTalk` 实际引用的 `GCGTalkDetail`，共 **1,588 个唯一 `(talkDetailId, slot)` 台词槽位**。它们不是 Dialog 表中的新增 Dialog。因多个关卡共用内容，关卡页面副本合计出现 2,529 个槽位，不将副本数量当作新增对白。

`GCGTalk` 按具名事件字段关联 Detail，逐槽位配对 `talkContent`、`talkCharacterId`、`talkVoiceId` 和表情；每个实际槽位保留说话人，顺序连接，不拼成无说话人的段落。奥兹、婕德、利露帕尔、阿乔、咔库库使用带图标校验的显式 NPC 身份桥接，名称读取真实本地化哈希；芬尼克/小玫瑰共用头像时优先采用该局对手身份。当前没有 `unresolved_gcg_speaker`，未来遇到未知演员仅保留内部 reference 与诊断，不用 `GCGTalkDetailIcon/...` 冒充人名。

`source.hashes` 仅保存 TextMap 数字哈希；牌面 ID、任务映射、Talk 关系、演员桥接及槽位 provenance 放 `source.references`。64 位资源哈希由共享读取工具无损读取并保留在图片资源引用中。

## 资源及已知缺口

- 本轮 AnimeStudio 7.1 按源名补提取后，每语言有 3,589 个实际本地 PNG 支撑的图片引用，覆盖 2,162 个不同资源名；这不是不同原画内容的数量。只有 `src/images` 中确有 PNG 才产生 URL；其他资源引用保留 `url:null`。Spine 拼图纹理不当作完整牌面导入，尚未提取不代表游戏资源缺失。
- 测试游戏 `11/12` 及 Detail `1/2/3/4` 的 `(test)` 原文明确隔离，不作为真实关卡/对白导出；校验禁止它们混入真实对局。另对将来带测试名的关卡设置 `test_stage` 诊断和隐藏列表标记。
- 非测试 Detail `5010501`—`5010504` 没有 `GCGTalk` 引用，不猜测关卡归属，不制造入口。
- 正式生成、服务端及前端已接入共用资料模块；图片进一步提取、动态牌面播放仍未覆盖，详见 [archives.md](archives.md)。

## 验证

在 wiki-data 项目根目录运行：

```text
node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json scripts/check_tcg.ts --write
node node_modules/typescript/bin/tsc --noEmit --pretty false
```

前者读取真实源数据，中英文分别校验计数、原句、全部牌面、全部胜负 Talk、关卡关系、对话图闭包、逐槽位演员、TextMap 哈希纯度、跨语言稳定 ID/图键及每个真实图片 URL，并在独立系统临时目录验证 `gen_tcg` 的实际 JSON 输出。结束后删除该检查自己创建的临时目录，不写入或覆盖正式 `data`。

真实导出检查、全仓 TypeScript 检查及共用跨领域回归均通过。验证统计与源记录口径保持分离，不把页面重复引用算成新增对白。
