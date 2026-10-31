# 四类栏目的导出目录

与 `src/data/tasks.js` 等现有栏目一致，Wiki ID 和导出范围由代码目录维护，而非直接
把 genshin-db 的源记录 ID 当作网站 ID。日常生成不会自动添加目录以外的记录。

| 栏目 | 目录 | 当前条目数 |
| --- | --- | ---: |
| 尘歌壶 | src/data/serenitea.js | 2611 |
| 七圣召唤 | src/data/tcg.js | 2340 |
| 千星奇域 | src/data/miliastra.js | 3512 |
| 杂项 | src/data/misc.js | 5711 |

目录按 type 分组，每组用 region 注释标记，条目为 `英文 Wiki ID: genshin-db 源记录 ID`，
末尾附中文名称注释。例如：

```js
"achievement_group": {
    "wonders_of_the_world": "achievement_group-0", // 天地万象
    "mortal_travails_series_i": "achievement_group-1", // 尘世巡游·第一辑
},
```

英文 ID 的名称部分使用小写下划线。跨类型结构性重名以双方的类型前缀区分，例如
`card-ganyu` / `player-ganyu`、`costume-fluffy_tanuki_yellow_green` / `suit-fluffy_tanuki_yellow_green`。
只改跨类型冲突组，不给所有无冲突条目强加前缀；同一类型内确实重名时仍用 `-0`、`-1` 区分。
无可用英文名称时采用
`类型_源数字` 作定位 ID，不伪造原始名称。目录初始化后，翻译变化不会自动改名；
维护者可以直接编辑键。值必须对应同一类型的真实 genshin-db 记录；重复键身份、
重复源记录、缺失源记录或错误类型均会阻止导出。未列入目录的新增源记录不会悄悄发布。

初始化目录纳入已有栏目范围的全部条目，保留此前明确排除的壶灵、角色摆设、客户端
邮件模板和跨界教程等范围限制；隐藏/缺文条目仍按上游 show 状态处理。
目前另以行注释停用 54 个明确测试条目（21 个摆设、1 个头像、32 个教程），
保留原键、源 ID 和名称，附“不导出：测试条目”说明。正常玩法中的试探、试行挑战、
常规/压力测试等不按 test 子串误删。补录计划也会跳过已注释的源记录，避免重新加入。

目录顺序决定页面顺序，键决定 pages、items 文件名、图片路径、关系及布局的 Wiki ID。
原始表名、数字 source.id、文本哈希不变。四栏目间关系统一按目录值映射，不用译名
猜链接；未导出的目标不发布悬空链接，保留来源引用。列表 source_id 保留完整源记录
ID，供原始 ID 检索。common/<栏目>/source_ids.json 保存旧源 ID 到 Wiki ID 的映射；
详情接口接受旧源 ID 兼容链接，但导出文件和新链接均采用目录 ID。

结构性 ID 迁移另外在 `src/data/archive_id_aliases.js` 维护旧 Wiki ID 到稳定源 ID 的关系，
导出为 `common/<栏目>/id_aliases.json`，由目录转换成当前 ID；旧的 `ganyu-0`、`ganyu-1`
等地址仍可读取，不会继续出现在新列表和关系链接中。别名不得遮蔽正式 ID 或指向未导出的条目。
`node scripts/prefix_archive_ids.cjs` 可预览仍未处理的跨类型冲突，加 `--apply` 才机械修改目录；
重复运行不会继续添加前缀。补录计划同样按类型命名空间区分新增同名条目。

删除目录中的条目即停止导出；按通常生成方式清理旧的 items JSON，源数据与旧图片
输入不会删除。此前数字命名的生成文件已由同一规则清理，可以从上游与目录重生成。

```text
npm run gen:archives -- ./data
npm run gen:misc -- ./data
npm run gen:archives -- D:/Inteyvat-Wiki/data
npm run gen:misc -- D:/Inteyvat-Wiki/data
npm run check:archive-directories
```

需要补录新的源记录时，可以运行 `npx tsx scripts/prepare_archive_directories.ts` 生成
tmp 下的待补录计划。已有目录 ID 保持不变；检查新条目后再加入目录。该准备步骤只
查询 genshin-db，不读取游戏原始输入，也不是日常导出的自动步骤。
