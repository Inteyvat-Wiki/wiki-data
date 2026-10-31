# 许可与署名检查记录

检查日期：2026-10-31。范围：GenshinData-scripts、genshin-db、wiki-data、wiki、wiki-server；不包含 wiki-map-data。

这是维护检查记录，不是法律意见或“全部合规”的证明。检查了仓库声明、已安装依赖的许可文本和部分分发配置；未完成每一份最终发布产物的依赖溯源、全部历史复制代码溯源或游戏资源再分发授权核验。

## 已确认与已整理

- 项目自己的 `author` 与维护者署名统一为 Inteyvat-Wiki。第三方原作者、许可证版权行和 Git 历史不随维护组织名称改动。
- genshin-db 保留 `Copyright (c) 2020 theBowja` 与完整 MIT 正文，另列 Inteyvat-Wiki 修改部分。wiki-data、wiki、wiki-server 保留已有 MIT 正文。
- 五个仓库分别设置 NOTICES.md，区分项目代码、第三方代码、外部工具、游戏内容与生成数据。
- GenshinData-scripts 已设置分范围 LICENSE：组织有权授权的自行创作贡献为 MIT，上游保留 ISC 声明，Razmoth 移植部分单列 MIT；包元数据指向范围说明，不把整个仓库改标为纯 MIT。
- 进一步溯源确认语音解析器对应 RazTools/Audio 移植前历史代码及 MIT 声明；Wiki 星形图标精确匹配 Goran Spasojevic 的 Glyphs sparkle-bold，完整 MIT 文本随 public/licenses 提供。favicon 的来源按项目方说明记为 AI 生成，不再列作来源不明的游戏提取图。
- genshin-db 已附当前实际安装的运行时依赖 fuzzysort 1.1.4、pako 2.0.4 的许可证副本，并将 LICENSES/ 加入现有 npm `files` 清单。pako 为 `MIT AND Zlib`，不是二选一。
- 元数据缺失不能直接判定没有许可：旧版上游锁文件没有逐包记录许可证；读取实际安装包后，GenshinData-scripts 的 119 个锁文件包路径、genshin-db 的 149 个路径均有许可声明。wiki-data 的 genshin-db 记录为本地链接，需读取目标项目而非将链接记录当成无许可包。
- Wiki 的 tosource 2.0.0-alpha.3 虽未在包信息中设置 `license`，但随附 LICENSE 包含完整的 zlib 风格许可文本。不应仅凭空元数据将它判为无授权。

## 尚待确认或发布前处理

| 项目 / 位置 | 证据与现状 | 后续处理 |
| --- | --- | --- |
| GenshinData-scripts 根目录 | ISC 声明追溯到 5037aa46（2022-12-11）；已附组织贡献的 MIT、ISC 标准条款参考副本与许可范围说明 | 原作者发布的完整许可、原版权声明及文件范围仍待核实；参考副本不是从作者取得的原文件 |
| GenshinData-scripts `voice/audio.js` | 已找到 RazTools/Audio 的移植前提交 56da8d49（2024-01-22）及 Copyright 2023 Razmoth 的 MIT；已附全文 | 来源与许可证据已补；原作者当时实际参考的精确提交仍未记录，不把历史参考提交冒充精确来源 |
| Wiki `app/assets/icons/sparkle.svg` | 已精确比对 Glyphs sparkle-bold 路径，原作者 Goran Spasojevic，MIT | 已补 ASSETS.md、源码署名注释和 public/licenses 中的原始完整许可；图形未改动，原始下载渠道未知不影响已找到的图形对应证据 |
| Wiki `public/favicon.svg` | 项目方确认内嵌花朵 PNG 由 AI 生成，已记录首次引入提交 | 已纠正来源分类；生成服务、生成记录、输入素材及服务条款尚未提供，不承诺独占版权或自动适用代码 MIT |
| genshin-db npm `files` | 仍包含 `src/min/data.min.json`；顶层包名仍为社区同名包，专用发布配置还使用 `@genshin-db/tcg` | npm 架构改造时制定代码白名单并使用自己的名称；不要直接执行遗留发布入口。本轮没有发布、执行打包生命周期或改变数据分发设计 |
| GenshinData-scripts 现有仓库内容 | 已跟踪 stats/data、stats/dist 及 voice/*.txt，其中包含游戏数值、打包代码及资源路径清单 | 根据实际来源分别分类；工具许可不自动覆盖这些内容。完整 ISC 来源确认后也需检查 stats 单独分发产物的声明；未删除或改写历史内容 |
| Wiki 浏览器包、服务端部署包、工具 bundle | 仓库内的 NOTICES.md 不等于声明会自动进入实际产物 | 发布时检查最终产物与实际包含的依赖，保留所需许可/版权/NOTICE，并让接收者能获得声明；本轮不声称已经完成前端全部产物声明收集 |
| 外部 AnimeStudio 及 .NET 引用 | 已读取本机安装根部 MIT 文件并保留原文，含 Radu、Perfare、Razmoth、Escartem 的原始版权行 | 安装包具体构建提交与其他 DLL 许可仍需核对；根部 MIT 不等于全部依赖统一授权，本轮未分发外部 DLL |

## 需要特别区分的依赖许可

详细历史与许可证副本校验记录见 [GenshinData-scripts 的溯源说明](https://github.com/Inteyvat-Wiki/GenshinData-scripts/blob/main/docs/license-provenance.md)；随附图片来源见 [Wiki 的 ASSETS.md](https://github.com/Inteyvat-Wiki/wiki/blob/main/ASSETS.md)。

以下来自当前锁文件或已安装包，不代表它们全部进入浏览器或部署包。

- Wiki 的 lightningcss 1.32.0 及其平台包声明 MPL-2.0。若分发该组件的代码或二进制，需要核对相应许可和源码获取说明；仅作为构建工具使用，不能据此认定其输出 CSS 必然改为 MPL。未安装的平台包不能当成已经实际分发。
- Wiki 的 node-forge 1.4.0 声明 `(BSD-3-Clause OR GPL-2.0)`，其随附 LICENSE 明确允许选择 BSD；不能因为表达式中出现 GPL 就认定整个项目必须使用 GPL。
- caniuse-lite 在三个有构建依赖的项目中声明 CC-BY-4.0；如果分发该数据库，核对署名、许可链接和修改说明。仅用于构建与实际随包分发应分别判断。
- argparse 2.0.1 声明 Python-2.0 并随附 LICENSE；Apache-2.0 依赖还应检查实际包是否含必须保留的 NOTICE。不能用项目根目录 MIT 文件替代所有依赖的许可文本。
- 安装依赖时由 npm 保留各包文件，与将其压缩进单一 JS、复制进部署包或公开浏览器代码，是不同的分发方式，应分别检查。

## 维护规范

1. 项目自己的署名使用 Inteyvat-Wiki；不得删除第三方署名、冒充第三方原创作者，或重写已有 Git 作者信息来达到“统一署名”。
2. `author` 是包的署名元数据，不等于所有包含代码的唯一权利人。LICENSE、第三方声明和 Git 贡献记录各有用途，不能互相替代。
3. 复制或改编第三方组件时，记录来源 URL、准确版本或提交、涉及路径、修改情况及许可证；需要全文时保存原文，而不只是放一个网页链接。
4. `AND` 表示同时遵守；`OR` 表示选择可适用的一种。先读具体条款，不仅做字符串关键词筛选。
5. 根目录的 MIT/ISC 只覆盖适用的代码。游戏文本、图片、Lua、语音、社区撰写内容、资源索引和生成数据应按实际权利来源处理；“仅供研究”“非官方”免责声明不能代替授权。
6. 开源代码依赖不要求为了署名给每个源文件机械加头；但复制来的文件已有声明不得删除。是否新增逐文件 SPDX 标记，待上游适用范围明确后再决定，不能将有疑问的文件批量标成 MIT/ISC。
7. 每次发布都基于锁定版本和实际产物更新第三方清单。运行安装、构建、pack、publish 前检查生命周期脚本；本轮只做静态分发配置检查，未执行这些遗留发布命令。

## 参考

- [GitHub：仓库许可](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [npm：package.json 的 license、files、private 等字段](https://docs.npmjs.com/files/package.json/)
- [SPDX：许可证表达式](https://spdx.github.io/spdx-spec/v2.3.1/SPDX-license-expressions/)
- [Mozilla：MPL 2.0 FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)
- [Creative Commons：CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
