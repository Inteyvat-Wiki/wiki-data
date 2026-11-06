# Linux 部署测试

本入口部署 Wiki 的完整 Nuxt/Nitro 产物（含 server 子模块），不把 server 仓库误当成独立 npm 服务。
内部端口固定为 `127.0.0.1:4780`，Nginx 对外端口为 `14780`。不修改系统已有 Node，也不发布 npm。

## 构建

使用校验过的官方 Node 24 发行包，给 `scripts/deployment/linux-build.cjs` 传入一个不存在的构建目录和 Wiki、contracts、wiki-data 的完整 Git SHA：

```text
node linux-build.cjs /srv/inteyvat-wiki/releases/NEW_RUN WIKI_SHA CONTRACTS_SHA WIKI_DATA_SHA
```

构建器从组织 GitHub 仓库检出固定提交并初始化 server 子模块；contracts 先安装固定开发依赖，再通过现有 `local_packages.cjs` 构建安装包。
临时只读 registry 仅监听回环，不发布包、不继承 npm 凭证、不使用相邻源码链接。部署副本重新记录自建安装包的 integrity，保留第三方锁定版本，再运行 npm ci、检查和正式构建。
不同源码换行符、构建环境会改变安装包摘要，不能通过关闭 integrity 检查来解决。构建目录保存实际锁文件与 `deployment.json`。

## 首次启用

运行时放在 `/srv/inteyvat-wiki/runtime/`，应用放在 `/srv/inteyvat-wiki/releases/`。管理员显式执行：

```text
node linux-activate.cjs /srv/inteyvat-wiki/releases/NEW_RUN/wiki /srv/inteyvat-wiki/runtime/NODE_DISTRIBUTION
```

该入口创建无登录权限的专用服务用户、systemd 单元和独立 Nginx 站点，不覆盖同名但内容不同的配置或既有活动版本。
首次生成的上传密钥仅存在 `/etc/inteyvat-wiki/environment`（root:root，0600），不打印、不加入 Git、不传给构建器。
数据基准为 `/var/lib/inteyvat-wiki/data`；发布状态在其同级 `data.publish`，两者都属于持久化存储。
防火墙是否开放 14780 由部署操作人另行确认；4780 不向公网开放。已有 Nginx 站点不变。

## 通过 SSH 发布

14780 提供未加密的只读站点测试入口，不允许管理接口或写请求。没有正式 TLS 域名之前，不通过该端口发送上传 token。

可以在生成节点用现有上传协议制作数据包：

```text
node scripts/deployment/bundle-export.cjs EXPORT_ROOT NEW_BUNDLE
```

该步骤执行完整栏目和地图验证，并通过现有 `upload_data.cjs` 生成清单、内容和最终尾标；来源在打包期间变化会失败。旁边的 JSON 报告记录预期 releaseId，不包含密钥。
通过 SSH/SCP 传到远程后，由有权读取密钥的管理员执行：

```text
node linux-upload-bundle.cjs BUNDLE EXPECTED_RELEASE_SHA256
```

转发器只访问远程 `127.0.0.1:4780`，先获取当前 releaseId 再提交完整数据包；服务端原有鉴权、流校验、并发检测及原子切换仍全部生效。
连接中断时先查询服务端状态，不依据客户端报错就认定发布失败或覆盖冲突。传输包和服务器已发布版本不是同一个文件集合，不删除唯一副本。

## 范围

现有完整导出作为部署基线，不等于它由本轮沙箱重新生成。沙箱样本、工具下载、全量重建及版本历史的验证范围应分别记录。
本流程不安装 Docker、不新增 GitHub Actions、不将游戏数据上传 GitHub/npm，也不修改其他服务的端口。

回归：`node --test scripts/deployment/linux-deployment.test.cjs`。
