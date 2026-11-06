# 快照数据链路与迁移测试

数据流为 `GenshinData-scripts → genshin-db → wiki-data → Wiki 服务端`。上游维护完整记录缓存与版本依赖；genshin-db 仅保存查询索引；wiki-data 只通过公开查询接口转换展示数据，不读取游戏输入或 genshin-db 私有目录。

## 常规导出

使用 Node.js 22.13 或更新版本，安装 npm 依赖并配置 `wiki-data.config.json`。不再依赖相邻源码目录。`npm run gen` 默认先验证上游输入身份，缓存有效时复用，缺失或输入变化时重新准备；再创建固定快照的查询实例。普通角色、任务等查询调用不变。`gen:tasks`、`gen:archives`、`gen:misc`、`gen:npcs` 也会先初始化。

`npm run pipeline -- init` 创建本地配置模板，拒绝覆盖已有文件。`--config` 优先于 `WIKI_DATA_CONFIG`，否则读取当前工作目录的 `wiki-data.config.json`。配置不存在时只使用默认值及环境变量；显式指定但不存在的配置会报错。未知字段和错误类型也会报错。JSON 相对路径以配置文件目录为基准，环境变量相对路径以启动命令的工作目录为基准。

配置结构（以下路径为示例；文件不应提交）：

```json
{
  "version": 1,
  "source": {
    "root": "../game-data",
    "historyRefs": ["refs/remotes/origin/master", "HEAD"],
    "versions": true
  },
  "resources": {
    "studio": "../tools/AnimeStudio",
    "assetMap": "../inputs/game.map",
    "root": "../inputs/blocks",
    "game": "GI",
    "luaRoot": "../inputs/verified-lua",
    "imageRoots": ["./src/images"],
    "caches": {
      "worldAreas": "../prepared/world-areas.json",
      "mapAreaConfigs": "../prepared/map-area-configs.json"
    }
  },
  "cache": {"root": "../cache/inteyvat"},
  "output": {"data": "../published-data"}
}
```

`source.root` 必须是已提交的游戏数据 Git 仓库。历史版本需要完整的相应历史引用，不用下载日期推断版本。`source.historySeedCache` 可指定已核验历史统计种子；`versionOverrides` 仍由上游按完整提交 SHA 校验。`resources.root` 可选，用于检查图片/Lua 清单的块文件是否位于指定资源目录；移动资源后应重新制作 AnimeStudio `.map`，不猜测旧绝对路径的新位置。`resources.dotnet` 可指定 .NET 主程序，不要求安装 PowerShell。

默认缓存位于系统用户缓存目录的 `Inteyvat-Wiki` 下：`genshin-data` 存上游快照，`genshin-db` 存查询索引，`resources` 存资源提取工作。可以分别配置 `cache.exports`、`cache.indexes`、`cache.resources`。不写入 `node_modules`，不把输出放进原始输入目录。旧缓存、Lua 和图片可以直接配置绝对路径复用；不会自动搬迁或删除旧文件。默认图片查找包含新资源缓存的 `images` 子目录，`imageRoots` 添加已有图片目录，同名仍选较大图。

`query.snapshot` 固定快照并默认关闭准备；`query.prepare:false` 只读打开现有快照；`query.backend:"legacy"` 仅用于旧文件迁移对比。`output.assets` 可覆盖 Wiki 自有静态资源目录，默认相对于 wiki-data 的安装位置，不再依赖命令启动位置。

缓存默认存放在用户缓存目录，不写 node_modules；可设置：

| 环境变量 | 用途 |
| --- | --- |
| `GENSHIN_DATA_SOURCE` | 覆盖 `source.root` |
| `WIKI_DATA_CACHE` | 完整记录缓存，也接受 `GENSHIN_DATA_CACHE` |
| `WIKI_DATA_INDEX_CACHE` | 查询索引缓存，也接受 `GENSHIN_DB_CACHE` |
| `GENSHIN_HISTORY_REFS` | 覆盖 `source.historyRefs`，按先后顺序、逗号分隔 |
| `GENSHIN_HISTORY_SEED` | 经上游校验后复用的历史统计缓存目录 |
| `GENSHIN_LUA_PATH` | 上游字幕所需 Lua 输入目录 |
| `WIKI_DATA_OUTPUT` | 默认导出目录；完整导出也接受第一个命令行参数 |
| `WIKI_DATA_SNAPSHOT` | 固定已有快照 ID，不自动更新 |
| `WIKI_DATA_PREPARE=0` | 只打开已有快照，不验证或重新提取输入 |
| `WIKI_DATA_BACKEND=legacy` | 显式使用旧本地数据，仅供迁移核对 |
| `WIKI_CACHE_ROOT` | 覆盖统一缓存根目录 |
| `WIKI_IMAGE_ROOTS` | 追加已有图片目录，按系统路径分隔符分隔（Windows `;`，其他系统 `:`） |
| `ANIMESTUDIO_PATH` / `ANIMESTUDIO_MAP` | 覆盖 AnimeStudio 目录 / 资源索引文件 |
| `GENSHIN_RESOURCE_ROOT` / `DOTNET_HOST_PATH` | 覆盖资源块根目录 / .NET 主程序 |

环境变量高于配置字段；未设置的字段使用配置值或默认值。旧的九种资源缓存环境变量仍被转换为 `resources.caches` 后传入上游，不再让各导出器自行寻找相邻源码目录。

## 资源准备与导出

`npm run pipeline -- doctor` 只检查路径与包是否可用，不触发解析或提取；完整的文件哈希和快照完整性由 `export` 的上游准备阶段检查。

`npm run pipeline -- export all` 导出全部栏目；也可选择 `characters`、`weapons`、`outfits`、`npcs`、`tasks`、`archives`、`misc`、`maps`。原有 `gen:*` 命令同样读取统一配置。所有图片请求写到本次导出的 `common/image-requests.json`，局部导出只包含本次栏目请求。

`npm run pipeline -- images` 预览图片需求，不启动 AnimeStudio；加 `--apply` 才读取资源索引并提取精确同名的所有首选候选。图片保留来源报告，提取目录直接成为通用图片读取入口，不再需要导入到 `src/images`。完成后再次导出相应栏目，生成有效图片链接。缺失名称会列出并返回状态 2；不会冒充完整提取。

`npm run pipeline -- lua --plan FILE` 预览已有精确 Lua 提取清单；加 `--apply` 才提取到 `cache.resources/lua`，不会改动显式配置的已有 `luaRoot` 输入目录。清单包含资源工具的 `entries`（精确 Source、Offset、字符串 PathID 等），提取器校验 Lua 字节签名。此命令不声称能从全部资源中自动发现所有任务 Lua；完整覆盖仍需经过上游核验，已有可靠 Lua 输入可直接引用。默认 `luaRoot` 指向该缓存根目录；若配置了旧输入，应在验证新提取覆盖率后再明确切换。

`npm run pipeline -- resources --kind KIND --plan FILE --apply` 通过 `genshin-db.resources` 调用 GenshinData-scripts 的公开资源准备接口，不直接导入其私有源码文件。省略 `--apply` 只预览。计划中省略 `output`，程序分配新工作目录；计划的文件路径按计划文件位置解析，Prefab 路径仍是 Unity 资源标识。

支持的主要顺序：

1. `worldAreas`、`mapAreaConfigs`、`mapIcons` 可分别准备；共同的源目录、AnimeStudio 和资源索引由统一配置注入。
2. `mapBase` 自动使用已有上游场景发现流程；`mapFog` 需要计划中的明确 `sceneIds`，底图缓存从已登记结果取得。
3. `mapAtlas` 使用已登记 MapArea 缓存，默认带图片。低层 `maps` / `mapEntries` 仍支持明确的研究计划，不从对象顺序猜布局。
4. `miliastra`、`profileFrames` 需要计划的 `index` 和 `mapFile`（已核验资源索引二进制及图片映射 JSON），不是取第一个同名资源。`tcgPortraits`、`graeaeImages` 也可准备精确图片计划。
5. `levelTags` 需要 `rawReportFile` 指向已核验的原始提取报告；不自动选择未知资源。

成功准备后，适用的缓存路径原子登记到 `cache.resources/prepared.json`；以后导出自动传递对应路径。该文件按源目录及资源索引位置区分，不存游戏语义。显式配置的 `resources.caches` 和环境变量优先于自动登记；如要以后跟随新结果，应移除对应旧覆盖项。支持键：`miliastra`、`profileFrames`、`maps`、`mapIcons`、`worldAreas`、`mapAreaConfigs`、`mapBase`、`mapFog`、`levelTags`。

源数据、Lua 或资源输入发生变化时，导出快照的身份检查会决定复用或重建；资源提取仍是明确执行的准备步骤，不会在 npm 安装、模块导入或普通查询时运行 AnimeStudio。输入版本不受支持、来源失效或必需缓存缺失时停止，不能用旧缓存静默替代。普通图片目录由维护者选择匹配当前资源版本的输入；更换资源版本时需重新提取并检查缺图。

本地 Wiki 设置 `WIKI_DATA_ROOT` 为相同 `output.data` 后直接读取生成 JSON 和图片，无需把文件再复制到另一仓库。生产站点使用独立的数据目录，并通过以下上传流程发布。

## 上传与发布

上传是明确的管理操作，不随 `export` 或 npm 安装自动执行。默认 `npm run upload` 只执行已有普通内容检查、地图检查和文件清单/哈希准备；加 `-- --apply` 才访问服务端并发布。也可运行 `npm run pipeline -- upload --apply --config FILE`。

```json
{
  "version": 1,
  "output": {"data": "./data"},
  "upload": {
    "url": "https://wiki.example/api/admin/data",
    "tokenEnv": "WIKI_UPLOAD_TOKEN",
    "timeoutMs": 1800000
  }
}
```

`WIKI_UPLOAD_URL` 可以覆盖 `upload.url`。`tokenEnv` 指定客户端读取令牌的环境变量名，默认 `WIKI_UPLOAD_TOKEN`；配置文件不接受令牌内容。Wiki 服务端始终通过私有环境变量 `WIKI_UPLOAD_TOKEN` 读取令牌。使用密码学随机的 32 字节令牌，并编码为 64 位小写十六进制；两端设置同一值。可在自己的终端运行 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` 生成，随后通过部署平台的秘密变量设置。不要提交到仓库或粘贴进公开日志。轮换时更新两端环境并重启相应进程。

客户端强制校验 HTTPS 证书；仅 `localhost`、`127.0.0.1`、`[::1]` 可用 HTTP 本机测试。不跟随重定向，不在 URL 放令牌，不接受账号密码、查询参数或片段。服务端使用专用 Bearer 令牌而非浏览器 Cookie，未配置有效令牌时接口关闭。该入口具备整站发布权限，建议放在管理网络/VPN或反向代理 IP 白名单后，由代理终止 HTTPS；不要把它当作公众文件上传接口。

流程为：读取带鉴权的 `GET /api/admin/data` 状态和限额 → `POST /api/admin/data` 流式上传 → 核验服务端返回的版本哈希、文件数、总字节数。POST 携带获取状态时的版本号，其他发布已先完成时拒绝覆盖。断线或收据不匹配时，客户端不会宣称成功；应先查询状态再决定重试。

传输格式由 `@inteyvat-wiki/wiki-contracts/upload` 维护：版本标记、4 字节清单长度、UTF-8 JSON 清单、逐文件原始字节及 32 字节清单 SHA-256 尾标。它是专用流式格式，不是 ZIP/TAR，不支持压缩、符号链接或任意落盘路径。清单包含每个文件的安全相对路径、长度和 SHA-256；仅发送 `common`、`en`、`zh_hans` 内的 JSON 和 `images` 内的 PNG。其他文件、链接、越界路径、大小写重复路径、缺少必需索引、坏哈希、截断或尾随数据均应被拒绝。

客户端在校验后扫描并逐文件哈希，在传输中再次核对，并在发送尾标前确认源目录未改变。因此应上传已完成的导出目录，不要同时生成到同一目录。单文件和整体内存分开控制：图片流式发送，不将整套数据读入内存。默认上限为 250000 个文件、单文件 256 MiB、数据 20 GiB、清单 64 MiB；服务端可降低限额。若请求超过服务端或代理限制会失败，不会自动跳过文件或改为部分覆盖。

本版仅支持完整发布：中英文、全部内容分类、地图索引都需存在。不上传上游缓存、Lua、资源块、AnimeStudio、源码或凭据。上传不是源数据重新生成，也不能补齐原导出已经缺失的内容；完整的语义/图像核验仍由导出回归负责。

本地回归使用合成数据：`npm run check` 包含客户端上传测试；Wiki 的 `npm run test:upload` 检查服务端鉴权、流式接收和发布失败保护。Wiki 构建后，可在 wiki-data 运行 `npm run check:upload:integration -- --server-entry <Wiki/.output/server/index.mjs>` 验证真实构建服务与客户端的接口兼容性。此命令仅启动临时本机服务，使用随机测试令牌和独立临时目录，不访问正式数据或远程站点。

服务端把新版本放在独立的发布存储中，校验通过后原子切换当前版本指针。旧版本保留，失败的临时上传只清理自身目录。首次上传后，站点读取受管理版本，而非继续读取原始 `WIKI_DATA_ROOT` 下正在编辑的文件；后续改动需再次上传发布。发布存储不会写进 wiki-data 导出目录。旧版本的保留/恢复及代理请求大小、超时配置见 Wiki/server 的部署说明；本命令不负责删除历史版本。

快照不完整或损坏会报错，不会静默补读旧数据。单独运行依赖数据的检查脚本时，应使用对应 npm 命令，或先加载 `node --import tsx --import ./scripts/data_bootstrap.mts`。

## 整体对比

设置好 `WIKI_DATA_CACHE`、`WIKI_DATA_INDEX_CACHE` 后执行 `npm run check:migration`。如需禁止对原始仓库的读取，也设置 `GENSHIN_DATA_SOURCE`。

该命令在 `tmp/migration-*` 下分别运行旧文件模式和新快照模式的中英文、全部 17 类导出，包含菜单、地图、公共索引及图片。两次导出是独立进程；新模式禁止读取旧正文目录和指定的游戏输入目录，不触发重新提取。逐文件比较文件集合、JSON 深度内容（含版本、图片引用和数组顺序）及其他文件字节；报告和日志留在同一临时目录。任何导出失败或差异均返回失败，不自动接受差异。

不会覆盖正式 `data`，不会上传服务端。源图片缺失若旧、新一致，仍属于既有资源缺口，不因迁移测试通过而视为图片完整。原有数值提取异常也应另行修复，不能用新旧一致证明数值正确。

修复后重测可设置 `WIKI_DATA_MIGRATION_BASELINE`，只读复用已完成的隔离旧链路导出；仅在原始输入、维护目录和转换逻辑均未变化时使用。报告记录所用基准目录以及新快照 ID。默认仍重新执行两条链路。

`npm run check:types` 以 strict 检查源码，范围明确排除了缓存、导出数据与临时文件，避免把大型生成目录当作源代码检查。`npm run check:contracts` 独立检查生成器类型反例、映射、页面构造及档案/杂项转换，不需要原始数据或快照。

2026-10-31 的全量迁移对比：中英各 17 类，77,878 个文件（含 26,624 张图片），文件集合、JSON 内容和图片字节差异为 0。使用的完整快照为 `ab2768b2cfedab7ae050bb12f20978a7b8238329d06893e0d72876d79b80fac7`，历史统计 81 个快照，覆盖 1.x–7.1。原始报告保留于本地 `tmp/migration-12DbHA/report.json`，不提交生成数据。

首次比较曾发现 13 个差异：索引误用本地化文件排序，改变了少量同名章节和武器的首条/末条匹配。现已统一为旧索引的代码单元排序，并在 genshin-db 增加同名名称、别名及分类顺序回归；未加入任何针对这些 ID 的下游特判。

随后通过 wiki-data 的真实自动初始化生成所需分类快照 `5db5cd1b84a3ee48dd5e8f2fa7044f88bb15c1e8b4540f6eac2c6247d0ef1af4`，其 85,045 个缓存文件与上述完整快照对应文件的哈希全部一致。再次初始化复用了同一快照，未重新提取；本机实测约 16.3 秒（包括输入身份及缓存完整性校验，并非纯查询耗时）。

## 仓库依赖与共享包

| 仓库 / 包 | 职责 | 直接使用方 |
| --- | --- | --- |
| resource-tools / `@inteyvat-wiki/resource-tools` | 显式调用本机 AnimeStudio，读取资源索引、提取图片/Lua/二进制内容/Unity 原始对象，验证与记录来源；不解释游戏语义 | GenshinData-scripts；wiki-data 的图片导入及图片选择 |
| GenshinData-scripts / `@inteyvat-wiki/genshin-data-scripts` | 游戏表与 Lua 的语义解析、版本历史、完整记录快照；少量源数据特判 | genshin-db |
| genshin-db / `@inteyvat-wiki/genshin-db` | 固定快照的查询索引和公开查询接口 | wiki-data |
| wiki-contracts / `@inteyvat-wiki/wiki-contracts` | 已转换的导出文档、页面响应、对话及轻量校验；不包含原始枚举或数据 | wiki-data、Wiki（含 server 子模块） |
| wiki-data | 人工维护导出目录、手动枚举映射、文本转义及展示数据转换 | Wiki 读取共享导出目录或专用管理接口发布的完整版本 |

包依赖已改为四个组织包的精确版本，不再使用 `file:../仓库`。维护者打包公共定义与资源工具时分别构建 TypeScript 产物和自有 .NET 桥接程序；普通消费方安装已打包文件，不需要源码仓库或 .NET SDK。Wiki 的 server 仍由主仓库统一安装依赖，并非单独 npm 应用。

四个包均有发布文件白名单，不包含游戏资源、生成数据、缓存、AnimeStudio 二进制文件或安装时提取动作。本轮只准备发布结构和本地验证，没有发布 npm 版本。首次发布前用 `packages:local` 打包并通过仅监听本机的临时只读注册服务安装；不修改依赖为本地链接、不改写清单、不手动拷贝数据。正式发布后可正常使用 npm 注册服务。GDS/db 的发布保护和许可检查仍需单独处理。

`resource-tools` 只负责提取字节；Lua 的静态解析、字幕语义仍由 GenshinData-scripts 负责。Wiki 的类别、ID、图片用途、命名和原始键映射仍由 wiki-data 维护，不能因工具通用化而下放到前端。共享包不从上游自动生成可接受的类别。

`wiki-map-data` 不纳入新 npm 依赖链，也不作为后续维护入口；现有手工地图资料、输出和站点地图协议保留，此次不删除。

共享定义包现已整理为 `src/*.ts` 单一源码，通过 `npm run build` 生成 `dist/esm`、`dist/cjs` 及对应类型声明。两种模块格式不再手工同步。wiki-data 与 Wiki 共移除 25 个纯转发文件，83 个使用方文件改为直接引用公开子路径；任务中间类型、档案扩展和角色/武器语义别名保留。对照旧独立安装包的 63 项运行时导出和 560 次校验调用，结果一致。

该结构调整通过公共包测试、Node16/Bundler 类型检查、wiki-data 类型检查、Wiki 类型检查、全部杂项/档案页面回归及正式构建。独立 tarball 验证报告为 `tmp/package-integration-1VXhSH/report.json`；只改变代码组织和引用，不改导出数据或上传状态。

### 类型边界重构

普通内容统一使用公共包 `registry`：由栏目选择 `ExportDocument<C>`、`ContentPage<C>`、`DisplayResponse<C>`。三类档案生成函数保留具体类别，ConvertRaw 的手动映射保留字面量并对照封闭公共枚举；未知源键仍报错。页面构造按实际覆盖与缺省规则计算返回类型，不再用 `T & PageDataTrait` 假装所有输入字段原样保留。genshin-db 的目录查询接受真实 QueryFunction，语言显式映射为其 Language 枚举。

Wiki 的通用读取和前端查询也以栏目为参数，不能自行指定无关返回类型。JSON 读入先为 unknown，服务端在一个明确的可信导出边界检查容器、基础页面和已收紧的类别/加载情境字段；这不是整篇文档的完整运行时校验。历史交互解析中的 any、嵌套源对象的完整字段白名单以及全量文档深层校验，仍是后续独立工作，不用断言或放宽类型掩盖。

2026-11-01 验证：公共包运行测试 13 项及 Node16/Bundler 类型反例通过；生成器无数据依赖的边界测试 10 项和源码 strict 检查通过。`check:category-export` 已扩展为中英四类的全部正文和列表对照：28,256 份文档、8 份列表与正式数据相同，同时核对公共索引和资源清单。全部生成只写临时目录。本轮复用了已有非地图快照，并显式选择其已包含的栏目，不更新正在另行开发的地图缓存。独立安装报告为 `tmp/package-integration-7P1hn0/report.json`。

Wiki 前端、server、shared、内容类型反例、杂项/档案回归及正式构建均通过。第一次构建在复制图片时遇到系统 I/O 错误，确认源文件与磁盘正常后重试成功；未发布。并行地图开发期间短暂出现的新增分类与语言范围编译错误已同步给对应会话，并在修正后通过生成器严格检查。

### 独立包验证

在 wiki-data 执行 `npm run check:packages`，会先编译项目自有资源辅助程序，再将两个新仓库打为真正的 tarball，在 `tmp/package-integration-*` 创建独立消费者，离线安装后检查所有公共入口的 CJS/ESM、类型声明、CLI 帮助和浏览器打包，并清空 PATH 验证包内辅助程序能直接运行。不会通过工作区符号链接代替安装，也不会提取游戏或改写正式数据。结果记录于该目录的 `report.json`。

2026-11-01 接入共享包后再次进行全量对比，77,878 个文件（含 26,624 张图片）仍为零差异；本地报告为 `tmp/migration-FWDgaO/report.json`。

同日两个包的最终独立安装验证通过，报告为 `tmp/package-integration-t4P7Kp/report.json`。此前使用独立安装的资源包重新提取头像框 `UI_AvatarFrameIcon_000`，305×305 PNG 的 SHA-256 与既有验证结果一致；提取记录位于 `tmp/package-integration-27ndkf/live-image/extraction-report.json`。共享类型、Wiki 完整构建、现有图片导入兼容测试均通过。临时报告和游戏资源不进入版本控制或 npm 包。

Lua 原始字节提取已补充真实正例验证：`000567bc`（Persistent `35323818.blk`，PathID `7067`）提取出 1,396 字节，与旧研究缓存 SHA-256 一致。两条同块 Lua 批量提取、非 Lua 拒绝及错误 Offset 拒绝均通过；尚未完成全量生产输入迁移，因此未替换现有 `GENSHIN_LUA_PATH`。资源包 README 记录了验证范围及图片 XML 的 Offset 限制。

资源调用现已移除 PowerShell 依赖：使用项目自有、随 npm 包分发的轻量 .NET 辅助程序，复用 AnimeStudio 所需的运行时，不捆绑 AnimeStudio DLL。旧图片准备入口改为 `node scripts/prepare_misc_images.cjs --work NEW_DIR`；通过资源包按名称筛选索引，不再直接加载 DLL。清空 PATH 的实机检查已通过：正式清单生成 20 批计划、未执行提取；真实非 Lua 样本正确拒绝且未产生 `.luac`。记录分别在 `tmp/node-image-preparation-EusGdF` 与 `tmp/no-pwsh-rLfQ6R`。

移除 PowerShell 后的最终独立安装报告为 `tmp/package-integration-SzKpNR/report.json`：正常 npm 安装未禁用生命周期脚本，安装与包内辅助程序测试均在空 PATH 下通过；随后同一安装包完成真实索引读取和头像框提取，PNG 哈希与原结果相同，记录在该目录的 `live-map.json` 和 `live-image/extraction-report.json`。资源包 21 项测试、图片准备与兼容导入 5 项测试、wiki-data 类型和通用图片检查均通过。

### 图片、Lua 与地图资源的后续流程

完整说明维护在 resource-tools 的 `docs/pipeline.md`（同级源码目录 `../Inteyvat-Wiki-resource-tools/docs/pipeline.md`），包含提取计划、来源、验证、缓存失效和各仓库边界。

资源包新增 `extract-raw`，明确区分二进制内容 `payload` 与 Unity 对象 `serialized`。地图配置、预制体组件和材质可保存原始字节、CAB 与外部引用表；没有内嵌字段定义时明确标记不可用，不将原始字节冒充已解析记录。后续地图的字段解析和特判放在 GenshinData-scripts，经 genshin-db 查询后再由 wiki-data 转换。

本轮真实提取了 14,077 字节的 ConfigMapArea 内容以及地图材质、MonoMapArea、MultilayerMapUIConfig 样本；记录位于本地 `tmp/resource-flow-GPYTON`。并未替换 `src/map-data` 的手工地图数据，也未改动前端、正式图片或 Lua 输入。自动地图依赖解析与显示条件还需继续完成，不能因为提取成功就将地图解析标记为完成。

补齐原始资源入口后的独立安装报告为 `tmp/package-integration-VMcNGQ/report.json`：CJS/ESM、类型声明、CLI 和包内 bridge 均通过。同一实际安装包在空 PATH 下完成两条 Lua、ConfigMapArea 内容及 305×305 头像框 PNG 的提取；分别保留于该目录的 `live-lua`、`live-config`、`live-image`，Lua 与 PNG 哈希和已验证结果一致。资源工具 26 项测试、图片兼容 5 项测试及 wiki-data 类型检查通过。上述样本和报告均不提交、不打包。

随后资源工具新增对象清单 `inspectResourceFiles` 和已知 PPtr 定位 `createResourceIndex`。指定地图块读出 1,257 个序列化文件、7,262 个对象，找到名称索引缺失的 RectTransform。原始对象提取改为读取对象表，不依赖组件类解码；补充序列化版本、字节序和平台信息。它仍不解析游戏字段、不自动追踪整条地图依赖链。

该轮独立安装报告为 `tmp/package-integration-Zd30iJ/report.json`；包在空 PATH 下完成清单生成、108 字节 RectTransform 提取、沿真实引用定位并提取 75 字节 GameObject，以及错误 Offset 拒绝验证，记录在该目录的 `live-inventory`、`live-transform`、`live-gameobject` 和 `wrong-offset`。资源工具 31 项测试、图片兼容 5 项测试及类型检查通过；此前三份地图原始对象和 Lua 样本字节未变。正式数据和前端未改动。
