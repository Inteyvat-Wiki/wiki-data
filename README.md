# Inteyvat-Wiki data

为 Inteyvat-Wiki 筛选、转换并导出展示数据，由 Inteyvat-Wiki 组织维护。项目代码采用 [MIT 许可](LICENSE)，保留原作者署名及 Git 贡献记录。

数据查询依赖由 Inteyvat-Wiki 维护的 genshin-db 衍生项目，提取链路源自 theBowja 的 genshin-db 与 GenshinData-scripts。各项目的代码许可、原作者署名与第三方内容权利应分别保留。游戏文本、图片及生成数据中的游戏内容不因本工具的 MIT 许可而获得再授权，详见 [NOTICES.md](NOTICES.md)。本项目为非官方社区项目。

## 图片提取参考

新缓存链路、初始化参数与整体迁移测试见 [快照数据说明](docs/data-provider.md)。

日常运行 `npm run check` 检查类型及合成数据回归；跨仓库验证使用 `npm run check:workspace`，说明见 [工程检查](docs/engineering-checks.md)。`npm run check:packages` 对四个真实打包产物执行隔离安装、提取与查询，首次需要获取 npm 依赖，缓存齐备后可追加 `-- --offline`。

`npm run check:exports -- <导出目录>` 只读核验普通内容的双语索引、文件、页面成员和兼容链接；地图继续用 `check:maps:export`。局部导出可显式指定 `--categories outfit,character`，不会被误报为完整导出。已移除指向不存在脚本的 reading 和旧导出迁移命令；现有 `check:migration` 仍保留用于实际数据迁移对比。

许可维护与待核实项见 [许可检查记录](docs/license-review.md)。

Images Regex: `(UI_AvatarIcon_*)|(UI_Gacha_AvatarImg_*)|(Skill_*)|(UI_Talent_*)|(UI_EquipIcon_*)|(UI_RelicIcon_*)|(UI_ItemIcon_*)|(UI_MonsterIcon_*)|(UI_AnimalIcon_*)|(UI_Codex_Scenery_*)|(UI_DungeonPic_*)|(DungeonPic_*)|(UI_Map_*)|(UI_BigWorld_*)|(UI_ChapterIcon_*)|(UI_GcgIcon_*)`

## 装扮

`src/data/outfits.js` 分别维护角色衣装、武器幻化、风之翼的 Wiki ID 与源 ID；占位条目保留为注释。原始解析、故事关联和资源名由 GenshinData-scripts 提供，wiki-data 只通过 genshin-db 查询并转换为 `outfit` 公共类型。

手动分组与任务道具相同：将单个数字值改为 `{成员WikiID: 源ID, ...}` 嵌套对象，外层键作为列表入口，成员顺序即展示顺序。组内各条数据与图片保持独立，原成员链接仍可访问；列表只显示分组入口，搜索包含组内各成员的名称和描述。

1. 配置快照说明中的源目录及缓存路径，运行 `npm run gen:outfits` 导出中英文文本与 `data/common/outfit/assets.json` 图片清单。
2. 如需补图，运行 `node scripts/prepare_outfit_images.cjs --work <新的工作目录> --map <AnimeStudio资源索引> --extract --output <src/images下的新目录>`。工具使用清单精确提取，同名图片按最大分辨率选取；索引缺图会列出并返回非零状态。
3. 再次运行 `npm run gen:outfits`，通过通用图片流程写入图片并生成有效链接。资源不存在时保留空值，不生成占位链接。
4. 运行 `npm run check:outfits`、`npm run check:outfits:export`；可追加 `-- --require-icons` 要求全部图标存在。同步到 Wiki 后运行 `npm run check:outfits:api -- <本地服务地址>` 验证中英文接口与图片。

`data`、临时提取目录和资源输入不应加入 Git。默认衣装通常没有故事，不将描述补成故事。
