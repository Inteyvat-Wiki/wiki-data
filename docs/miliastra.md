# 千星奇域第一版导出

入口为 `get_miliastra_export(lang)` / `gen_miliastra(lang, directory)`，复用统一的
`types/archive.ts`、`utils/archive.ts` 以及 `export_category`。原始提取在
GenshinData-scripts 的 `extract/archives/miliastra.js`；本层查询 genshin-db，支持
`zh_hans`、`en`。统一生成及页面接口见 [archives.md](archives.md)。

## 源数据范围

| type | 源表 | 每语言条目数 | 稳定 ID |
| --- | --- | ---: | --- |
| costume | BeyondCostumeExcelConfigData | 2,757 | costume-costumeId |
| suit | BeyondCostumeSuitExcelConfigData | 324 | suit-suitId |
| catalog | BeyondCostumeDrawingExcelConfigData | 411 | catalog-FHIDKAKGMFN |
| lore（Wiki 不导出） | LoadingTipsExcelConfigData | 12 | lore-id |
| hall | BeyondHallExcelConfigData | 20 | hall-OANKFNDIFGE |

源记录中英各 3,524 条；Wiki 当前各导出 3,512 个页面，不再重复收录加载提示。
Wiki ID 由 src/data/miliastra.js 维护，原始名称不变。
缺译不丢记录、不回退为另一语言，保留空字符串和 `missing_text` 诊断。

上游仍保留 `stageID === '91'` 且 ID 为 1928–1939 的 12 条记录作为源资料，
但 Wiki 目录已注释停用整个 lore 分组，不显示“设定”分类，统一在杂项加载提示中展示。
杂项也不再发布指向这组奇域重复页面的关系。明确排除 1940–1948
的九条操作提示。未读取无名初始搭配表、表情、动作、传送、教程、音乐音效、动画、
其他创作素材或大厅设施表。`BydMaterialExcelConfigData` 只用于按 `itemUse.useOp` /
`useParam[0]` 找到已有服装、套装、形录的图标；不会导出材料独立页面、成本或奖励。

## 混淆字段与校验

| 表/字段 | 含义 | 独立锚点 |
| --- | --- | --- |
| Costume.MPFOEFGJKAE | 服装图标资源哈希 | costumeId 260002 → `14425841620430768778` |
| Suit.iconHash | 套装图标资源哈希 | suitId 265001 → `2417760002026327459` |
| Suit.OLKBFAJMKNF | 额外图片资源引用（不猜具体展示语义） | suitId 265044 → `10709550370493609764` |
| Drawing.FHIDKAKGMFN / BABILFMJJME | 形录 ID / 目标服装或套装 ID 数组 | 270001 → `[260001]` |
| Hall.OANKFNDIFGE | 大厅主题 ID | 1 对应 `BeyondHallArchive_1` |
| Hall.NOBNAHLBFEG | 名称哈希 | 1 → 1209932345，即「童话剧场·魔女诗篇」 |
| Hall.HOCAJGPPDII | 描述哈希 | 1 → 3795565332 |
| Hall.MFPAIDPNDCG | 主题档案标识 | 每行必须等于 `BeyondHallArchive_${id}` |
| Hall.KEFEGFKMPAP / HPJNFBOHCKD | 主题图 / 预览图 | 1 → `UI_Beyd_HallThemeImg_Mnjc` / `UI_Beyd_HallThemePic_Mnjc` |
| Costume/Suit.JKOKOGCFAKF | 适用体型枚举数组 | costumeId 260001 → `[BODY_GIRL]`；260002 → `[BODY_BOY]` |
| Costume/Suit.AAFJPEDPGJE | 色系枚举数组 | 260001 → `[White]` |
| Costume/Suit/Drawing.NGHBBIBFLBC | 品阶枚举 | 260001 → `Green`；不把它当作衣物颜色 |
| Costume.NIHIONHKJFH[].NIGAGANHPHI | 部位配置分组 | 260001 → `[{NIGAGANHPHI:[UpperCloth]},{}]` |
| UISlotEntry.LOPKMKDOKMM | 可读大类的源枚举 | UpperCloth → `Costume`；Hairstyle → `Appearance` |
| ColorTag.AAFJPEDPGJE / GLOCLKABHBC | 色系枚举 / 名称哈希 | White → 4150001616，即「白」 |
| Costume.CMEFDJHHIAI | 部件变体配置组的根 ID | 504601 → 504401，根自身也指向 504401 |
| Costume.NMJEHOJJBGC | 部件源关联 ID | 1501401 → 501401 |
| Suit.BONBCELOAFJ | 套装变体配置组的根 ID | 265046 → 265044，根自身也指向 265044 |
| Suit.AENKJPHOPNO | 套装源关联 ID | 1265014 → 265014 |

源 ID 唯一性、文本哈希字段、形录目标数组和大厅图片字段均校验。
64 位数使用共享工具保留的原始数字字符串；一旦收到不安全的 Number 就报错，绝不把
已舍入的值转成字符串继续使用。保留全部本域图片资源引用，包括无法解析为本地图片的哈希。

## 文本、关系和图片

当前缺图排查：原有装扮 854/2757、套装 310/324、形录 411/411、大厅 20/20 有列表图片。
所有 1917 个缺图条目都只有数字资源哈希，没有已解析的资源名，并非前端图片请求报错。
已有名称可通过 BydMaterial.itemUse 定位；未覆盖到的服装不能按相似名称或变体直接借图。
本轮在上游增加“相同主图哈希 → 唯一 material_icon 名称”的桥接，补全 14 个套装，
保留原哈希；不使用额外资源哈希或形录目标图来冒充主图。剩余 1903 个装扮哈希待溯源。

列表将装扮统一为两列紧凑图文条目，有图显示 80×96 缩略图、无图直接排文字，
避免缺图条目与大图卡片混排；套装预览 120×144，形录保留最大 120px 的图片网格，
大厅使用 150–190px 横向预览。其他栏目不变。

名称和描述直接使用主 TextMap 与 Medium 合并后的原始文本。套装介绍与故事本来就在
`descriptionTextMapHash` 对应全文中，因此完整保存在 `description`，不拆句、不截取、
不清洗数字、格式标记或字面量 `\n`。例如 `suit-265348`（冰柠盐饮）的中英原始描述
分别为 476 / 1,579 字符，包含第 503 号世界的故事。

套装成员只按反向 `Costume.suitId` 归属建立双向关系，当前有 1,997 对归属。
`Suit.FKLBIDGKEJK` 是预设搭配，不作为完整成员。例如 `suit-265001` 的五件成员为
500101、500102、500103、500105、500112，而不是预设的 262529 等部件。
形录使用 `BABILFMJJME` 逐项解析到真实服装/套装 ID，并建立反向关联，共 422 对。
这两类基础关系每语言有 4,838 条有向关系；找不到的目标只保留诊断，不造路径。

所有 `relations.role` 使用跨语言稳定 key，由前端统一翻译：套装到部件为 `component`，
部件到所属套装为 `suit`，形录到目标装扮为 `costume`，装扮到形录为 `catalog`。
同类变体关联按目标类型使用 `costume` / `suit`；变体上下文放在 `kind: variant` 的
section，不引入额外 role key。中英关系的 category、id、role 完全相同。

## 可读分类与变体

新增的 section 内容均使用真实 TextMap 原文，不把混淆字段或原始枚举直接当展示名称：

- `category`：由部位表的 `Costume` / `Appearance` 闭合到 UIEntry 1 / 2 的原文「装扮」/「妆容」。
- `slot`：按 `slotType` 闭合到 UISlotEntry 的原文，上装、下装、鞋、发型、肤色等不自行翻译。
  套装使用 UISlotEntry 1 的原文「套装」。保留每个源部位组边界，多组不解释为同时穿戴。
  `All` 只展示原文「全部」，不自造「全身服」等新分类；没有可读标签的 `None` 不展示。
- `body_type`：`BODY_GIRL` / `BODY_BOY` 分别闭合到 ManualTextMap 的
  `UI_BEYOND_GH_PREVIEW_GIRL_TAB` / `UI_BEYOND_GH_PREVIEW_BOY_TAB`，即「女性」/「男性」。
  229 个通用部件保留两条原文，不推断身高、比例或额外体型。
- `color`：逐个保留 ColorTag 的原文名称与源顺序，可多色，不以品阶色代替衣物颜色。
- `quality`：通过明确的 `UI_BEYOND_COSTUME_GREEN/BLUE/PURPLE/ORANGE` 原文显示
  「精良 / 优异 / 卓越 / 传说」。没有源值时不推断「基础」。

部件、套装各有自己的体型/颜色/部位 section；形录只使用自身存在的品阶字段，
不把目标服装的分类冒充形录自身字段。分类文本哈希追加至内部 `source.hashes`。

四种显式 ID 指针共闭合 686 对变体：CMEFDJHHIAI 139 对、NMJEHOJJBGC 461 对、
BONBCELOAFJ 18 对、AENKJPHOPNO 68 对。逐对验证目标存在、体型一致、配置组根自指；
部件另外验证其所属套装指针与目标所属套装一致。全部通过，双向增加 1,372 条有向关系。
双方的变体 section 只保留对方原始名称，链接仍用真实稳定 ID，不给同名试用条目改名。
当前每语言总计 6,210 条有向关系、17,237 个 section（分类 15,865 个、变体 1,372 个）。

变体的具体模式没有一律标成「染色」「升炼」或「试用」。例如 68 个套装源指针中只有
54 个能由 BydMaterial 的 `BYD_MATERIAL_USE_GAIN_TRIAL_COSTUME_SUIT` 直接佐证；
部件/套装配置组中的配色确有差异，但混淆指针本身不足以证明所有具体玩法语义。
因此只确认源指针变体关联，686 个非自指记录各有 `unresolved_variant_semantics` 诊断。
没有使用同名、编号前缀、相邻编号或描述相似度推断其他颜色/男女变体组。

图标额外通过 BydMaterial 的实际目标 ID 桥接（例如材料 280093 的目标是服装 552005，
两者不能混为主键）。形录可保留其目标的真实图标名。仅调用 `archive_image`；本地存在
的 PNG 才复制并返回 URL，未提取的资源只保留原引用和 `url: null`。

## 验证与已知限制

在仓库目录运行：

```text
npx tsx --tsconfig tsconfig.json scripts/check_miliastra.ts
npx tsc --noEmit --project tsconfig.json
```

回归脚本只在内存检查真实中英结果，可能的成品 PNG 复制定向至独立临时目录；
不会调用正式生成入口或写正式 JSON。核对逐条完整名称/描述、稳定 ID、来源、64 位哈希、
全部套装/形录关系、原文分类、四类变体指针、跨语言稳定 role、明确排除的操作提示、
材料桥、实际图片 URL 与分类/缺译诊断。

本次源数据中，两种语言各有 14 个肤色部件描述为空：264101–264112、264125、264126。
这些部件仍导出名称、源 ID、资源引用和空描述诊断。其余当前正文都有对应文本。
主图现由 GenshinData-scripts 解析原生资源索引：完整 64 位键 → subasset → block/offset →
唯一 Sprite（不存在 Sprite 才选 Texture2D）。不以截断的 32 位 Container 或服饰编号猜文件名。
2,563 个不同主图资源键全部唯一命中；源数字哈希仍保留，另导出真实图片名和定位证据。
缓存绑定原始表格、资源索引及 AnimeStudio map 的 SHA-256，输入变化须重新准备；工具说明见
GenshinData-scripts 的 `resources/README.md`。

2026-10-28 使用 AnimeStudio 按精确资源清单重新提取并完整校验 2,563 张 PNG，独立保存于
`src/images/miliastra-fullkey-7.1-20261028`，不覆盖旧图。导入入口为
`scripts/import_miliastra_resource_images.cjs`；它只处理上游图片提取结果，不解析原始游戏表格。
中英文各 2,757 条服饰、324 条套装、411 条形录、20 条大厅均已有至少一张可用图片，
此前缺失的 1,903 条服饰主图已全部补齐。数字哈希本身的 URL 仍为 null，使用对应的可读图片引用展示。

每语言当前诊断分开统计，共 914 条，不把新增分类诊断误计成空正文：

- 14 条 `missing_text`：上述肤色部件空正文。
- 28 条 `absent_classification`：这 14 个部件各缺色系、品阶源字段，不补造值。
- 176 条 `unresolved_classification:NIHIONHKJFH:1:None`：第二部位组的 `None` 没有可读 UI 标签；保留已知部位，不猜该标记语义。
- 10 条 `unresolved_classification:LOPKMKDOKMM:All`：`All` 有「全部」标签但未配置大类，不把它擅自归为装扮或妆容。
- 686 条 `unresolved_variant_semantics`：关联目标已闭合，精确变体玩法语义尚未全部确认。

当前没有缺失变体目标、变体体型/套装闭合失败、无效分类字段或分类文本缺译。

装扮列表的双层筛选使用上游导出的 `classifications`，不解析描述文本：
`BeyondCostumeExcelConfigData` 部件 → `BeyondCostumeUISlotEntryExcelConfigData` →
`BeyondCostumeUIEntryExcelConfigData`，保留源数值 ID 与中英文名称。
2,180 项归入装扮、567 项归入妆容；10 项 `All` 无明确父类，保留空分类并显示为未分类。
194 项有多个部件分类（其中 87 项同时关联挂饰1、挂饰2），均支持多路径命中，不强制互斥。
页面沿用摆设的两层下拉筛选及 URL 状态；体型、色系和品阶仍作为详情信息保留。

可选的奇域枢景球、书籍故事跨类页面关联尚未加入；没有复制其他页面原文，也没有伪造关系。
统一生成、服务端及前端入口见 [archives.md](archives.md)。
