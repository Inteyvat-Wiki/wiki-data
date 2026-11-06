# 一次性 Windows Sandbox 导出部署

这套入口验证 **全新环境 → 固定工具与源码 → 内部 npm 包源码打包安装 → 真实源数据查询 → Wiki 对象导出与图片提取**。
它不发布 npm、不上传网站、不携带上传令牌，不自动更新任何 `latest`。
沙箱退出不会删除本轮独立输出；原始资源、工具、Git 检出、安装依赖、缓存留在沙箱内部，随沙箱销毁。

## 当前范围与先决条件

- 宿主为支持 `wsb start/list/exec/share/stop --raw` 的 Windows，已经启用 Windows Sandbox。宿主只需 Node，不要求 PowerShell 7、Git 或 .NET。
- 来宾用系统 Windows PowerShell 5.1 下载并校验固定 Node `24.22.2`，后续由 Node 调度。PowerShell 仅负责最小引导和检查路径后解压 ZIP。
- 内部包复用 `scripts/local_packages.cjs`：`npm pack` 执行维护者构建；临时、只读、回环地址的包源安装未发布的组织包。不会创建 `file:` 依赖或修改上游源码依赖声明。
- .NET SDK 用于构建项目 bridge，.NET runtime 用于 AnimeStudio CLI。二者独立固定 ZIP、版本和校验和；允许以 `sha512` 使用 .NET 官方元数据的 SHA-512，或使用已验证的 `sha256`，但不能同时填写。例如 SDK 8 的 bridge 与 runtime 10 的 AnimeStudio 可并存。不是 GUI/WindowsDesktop runtime。
- 代码仓库必须公开且指定完整 commit。正式历史模式必须能获取全部指定历史端点；没有历史时失败，不自行退化。
- 当前支持 `smoke`（1–5 个真实风之翼条目）及调用既有 pipeline 的指定栏目导出。完整地图、字幕等仍需相应输入准备；本入口尚未编排完整游戏分块下载或所有资源缓存的准备。

## 两类测试不要混淆

`job.mode: "smoke"` 使用维护目录中的真实风之翼 ID，经 GenshinData-scripts → genshin-db → 原有 `convert_outfit_records` 与 `export_category` 导出中英对象。它没有替代数据、临时手搓展示字段或直接读取游戏表的下游逻辑。

`job.versions: false` 只用于明确声明的无历史部署冒烟测试，报告保留这一事实。源数据检出仍固定 SHA；不等于完成正式版本信息导出。`true` 时必须列出完整历史端点 SHA，按指定顺序使用；获取它们时不加 `--depth`，并检查不是浅仓库。当前不导入本地历史 bundle；上游缺失的历史应另行恢复和验证后再启用历史模式，不能把不完整的 `main` 冒充完整历史。

`job.requireImages: true` 要求真实资源文件及精确对象定位，执行 AnimeStudio 提取，并要求每个样本至少有一张真正提取的图片；最后校验输出 PNG。这不代表覆盖该对象所有可选图片。

所有运行结果都写 `productionReady: false`。样本仅可由独立发布步骤明确合并到经过验证的完整导出副本，保留旧基线、样本及合并后的清单；不能把样本目录直接当作完整发布。

## 输入锁定清单

清单放在工作区外或已忽略的本地目录，不在 Git 放入游戏资源、凭证或输入缓存。下例占位符必须替换，否则验证失败。工具 SHA-256 从可信发布校验和/经过人工核对的固定产物取得；不得把自动下载到的任意字节自行当成受信校验和。

```json
{
  "schema": 1,
  "memoryMB": 8192,
  "tools": {
    "node": {
      "version": "24.22.2",
      "url": "https://nodejs.org/dist/v24.22.2/node-v24.22.2-win-x64.zip",
      "sha256": "REPLACE_WITH_TRUSTED_SHA256",
      "root": "node-v24.22.2-win-x64"
    },
    "git": {
      "version": "REPLACE_WITH_EXACT_GIT_VERSION",
      "url": "https://github.com/git-for-windows/git/releases/download/REPLACE_WITH_TAG/REPLACE_WITH_MIN_GIT_ZIP",
      "sha256": "REPLACE_WITH_TRUSTED_SHA256",
      "releaseTag": "REPLACE_WITH_TAG_MATCHING_VERSION",
      "assetId": 123456,
      "assetName": "REPLACE_WITH_MIN_GIT_ZIP_NAME",
      "bytes": 123
    },
    "dotnetSdk": {
      "version": "REPLACE_WITH_EXACT_SDK_VERSION",
      "url": "https://builds.dotnet.microsoft.com/REPLACE_WITH_FIXED_SDK_ZIP",
      "sha512": "REPLACE_WITH_OFFICIAL_128_HEX_SHA512"
    },
    "dotnetRuntime": {
      "version": "REPLACE_WITH_EXACT_RUNTIME_VERSION",
      "url": "https://builds.dotnet.microsoft.com/REPLACE_WITH_FIXED_RUNTIME_ZIP",
      "sha512": "REPLACE_WITH_OFFICIAL_128_HEX_SHA512"
    },
    "animeStudio": {
      "url": "https://nightly.link/Escartem/AnimeStudio/actions/runs/123456/AnimeStudio-net10.zip",
      "runId": 123456,
      "runAttempt": 1,
      "artifactId": 789012,
      "commit": "REPLACE_WITH_FULL_UPSTREAM_SHA",
      "sha256": "REPLACE_WITH_VERIFIED_ARTIFACT_SHA256"
    }
  },
  "repositories": {
    "wikiData": {"url": "https://github.com/Inteyvat-Wiki/wiki-data.git", "commit": "REPLACE_WITH_FULL_SHA_INCLUDING_DEPLOYMENT_SCRIPTS"},
    "tools": {"url": "https://github.com/Inteyvat-Wiki/resource-tools.git", "commit": "REPLACE_WITH_FULL_SHA"},
    "contracts": {"url": "https://github.com/Inteyvat-Wiki/wiki-contracts.git", "commit": "REPLACE_WITH_FULL_SHA"},
    "provider": {"url": "https://github.com/Inteyvat-Wiki/GenshinData-scripts.git", "commit": "REPLACE_WITH_FULL_SHA"},
    "db": {"url": "https://github.com/Inteyvat-Wiki/genshin-db.git", "commit": "REPLACE_WITH_FULL_SHA"},
    "source": {"url": "https://github.com/DimbreathBot/AnimeGameData.git", "commit": "bd35e243fa436f141f015cf221a6e19d0c34b7ca"}
  },
  "job": {"mode": "smoke", "ids": [140001], "versions": false, "requireImages": true},
  "resources": {
    "game": "GI",
    "files": [{
      "path": "blocks/sample.blk",
      "input": "REPLACE_WITH_EXPLICIT_LOCAL_RESOURCE_FILE",
      "bytes": 123,
      "sha256": "REPLACE_WITH_RESOURCE_SHA256"
    }],
    "images": [{
      "Source": "blocks/sample.blk",
      "Offset": 0,
      "PathID": "REPLACE_WITH_EXACT_DECIMAL_PATH_ID",
      "Type": "Texture2D",
      "Name": "REPLACE_WITH_ACTUAL_RESOURCE_NAME"
    }]
  }
}
```

说明：

- Node 必须为与远程一致的 `24.22.2`。Git 使用固定 Git-for-Windows MinGit ZIP；`version` 与 `git --version` 一致。也可使用 `https://api.github.com/repos/git-for-windows/git/releases/assets/数字ID`，客户端发送 `Accept: application/octet-stream`，仍验证原固定 ZIP 哈希，不能改用 `latest`。无论哪个入口，来宾都会先读取固定 Release tag 元数据，核对 asset ID、name、bytes、uploaded 状态、digest、API URL 和下载 URL；不能仅凭能下载就接受另一资源。工具 ZIP 若有顶层目录，用 `root` 指明相对路径（例如 Node）；.NET ZIP 直接展开到同一工具目录。
- AnimeStudio nightly 没有虚构的语义版本字段。固定 Actions run、attempt、commit、artifact ID、ZIP SHA-256；来宾还查询 GitHub 元数据验证结论成功、未过期及身份一致。工作流分支 URL 不被接受。历史构建过期/网络不可用时明确失败，不自动换新版。
- 启动器不自动解析或生成清单中的版本/哈希，也不自动安装、启用宿主 Windows 功能。
- `resources.files[].input` 是相对锁定清单目录或绝对本机文件路径。只复制显式列出的普通文件，复制前后验长度及 SHA-256；只读映射本轮副本，不映射原目录。本地样本总量上限 512 MiB。若使用公开固定下载，改为 `url`，不与 `input` 同时填写；来宾下载并校验，不支持在 URL 放凭证或查询参数。
- `images`/`lua` 的定位使用资源工具公共 `AssetEntry`：Source（相对已声明文件）、Offset、字符串 PathID、类型、实际名称及可选 Container。必须来自已验证的资源索引，不凭文件名猜测，不直接复用包含宿主绝对路径的 `.map`。
- `job.mode: "pipeline"` 时使用 `target` 替代 `ids`；目标为现有 pipeline 支持的 `characters`、`weapons`、`outfits` 等。这不会自动补齐缺失的上游输入。
- 通过对象/API/图片检查仅证明本轮部署范围通过，不能证明所有解析器、图片、Lua 和历史兼容。

## 宿主命令

在 wiki-data 仓库执行，路径示例应换成本轮自己的目录：

```text
node scripts/deployment/sandbox.cjs plan --lock D:/DeploymentInputs/sample-lock.json
node scripts/deployment/sandbox.cjs list
node scripts/deployment/sandbox.cjs start --lock D:/DeploymentInputs/sample-lock.json --runs D:/DeploymentRuns
node scripts/deployment/sandbox.cjs exec --run D:/DeploymentRuns/sandbox-本轮后缀
node scripts/deployment/sandbox.cjs stop --run D:/DeploymentRuns/sandbox-本轮后缀
```

`plan` 只校验配置，既不启动沙箱也不下载。`start` 返回本轮完整目录和自己创建的 GUID，立即建立两处共享，不执行来宾任务；`exec` 才运行。日志位于 `output/logs/`，最终报告为 `output/result.json`。不要只把 `wsb exec` 成功返回当作导出成功。`share --run ...` 只能重新共享该运行的固定输入/输出，不能用它随意共享宿主路径。

启动前发现任何已有沙箱即拒绝，不接管用户实例。停止仅接受本工具在宿主侧记录为成功创建、当前仍存在的那个 ID。启动结果或实例 JSON 不可识别时拒绝推断归属；不会调用“停止全部”。若启动中断导致归属不确定，人工检查 `start-response.json`、`host-state.json` 与 `wsb list --raw` 后再处理。

`exec` 每轮只执行一次；失败不在同一环境重试，诊断后创建新轮次。宿主退出不会自动停止沙箱，因此终止任务时仍需显式 `stop`。没有自动递归清理功能，不会删除旧轮次。

## 输出与权限边界

```text
sandbox-本轮/
  host-state.json          # 不映射给来宾；只有宿主能修改实例归属
  start-response.json
  exec-response.json
  input/                   # 只读共享 C:\InteyvatInput
    lock.json
    run.json               # 本轮身份与 bootstrap 哈希
    bootstrap-sandbox.ps1
    sandbox-common.cjs
    sandbox-guest.cjs
    resources/...          # 如有：显式、已校验的真实样本副本
  output/                  # 可写共享 C:\InteyvatOutput
    logs/
    result.json
    data/                  # 真实样本/指定栏目导出
    provenance/            # 输入身份、包 integrity、导出哈希及样本范围
```

下载的 ZIP、检出仓库、npm 包和 NuGet 缓存都在来宾 `C:\InteyvatSandbox`，不回写宿主正式数据或依赖缓存。关闭剪贴板、音视频输入和打印机重定向；启用网络以获取公开输入。**网络隔离不等于安全网闸**：来宾可访问网络，映射输出也属于不可信输入。主发布者应在外部复核导出完整性和类型，并通过既有授权通道上传；不要从输出目录自动执行脚本。

沙箱不会取得生产上传密钥。最终上传可以由宿主/主代理通过 SSH 隧道执行。输出的第三方工具元数据与包清单是来源记录，不是重新分发第三方工具或游戏资源的授权。

## 自测与尚待实测

```text
node --test scripts/deployment/sandbox.test.cjs
node node_modules/typescript/bin/tsc -p scripts/deployment/sandbox-types.tsconfig.json
```

单元测试只用模拟 wsb、模拟 HTTPS 下载和临时 ZIP，不创建真实沙箱、不下载游戏资源。
Windows 上附加使用系统 PowerShell 5.1 的实际安全解压测试。真实运行必须另行记录固定输入、宿主 Windows build、启动/停止 ID 与结果，不能以单测通过代替部署完成。

CLI 语义依据 [Windows Sandbox CLI 文档](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-cli)。若新版 wsb 的非空列表 JSON 字段变化，脚本会拒绝识别，须核对实际输出后更新兼容字段，不能退回猜测用户实例。

真实环境首轮已验证启动、两处目录共享、System 身份运行、Node 下载校验和自己的实例停止。曾遇到 `github.com:443` 连接超时；公开 Release asset API 是同一产物的可选入口，不改变来源身份。下载连接及临时服务错误最多尝试三次，日志不打印带签名的跳转 URL。nightly.link 的 HEAD 请求可能返回 404，不能据此断言产物失效；应以 GET 响应和最终内容校验判断。

Git fetch 对明确的连接重置、超时、DNS/临时 HTTP 服务错误最多执行三次，间隔 2/4 秒，保持完全相同的 origin 和固定 SHA，不禁用 TLS、不改源、不回退宿主缓存。证书、认证、找不到提交和内容完整性错误立即失败。每条外部命令最长 20 分钟，超时只终止该命令自己的进程树；命令超时不继续重试。非交互 fetch 日志可能在完成前为空；诊断接收量应只读打开 `.git/objects/pack` 的临时文件测量长度，Windows 目录列表对未关闭文件可能暂时显示 0。
