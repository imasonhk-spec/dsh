# dsh-raganything-sharekb

DeepSeek Harness (DSH) 的「AI 知识库」插件 —— 一个包 = **宿主插件 + DSH 内嵌前端面板 + Python sidecar**。

装好之后，DSH 侧边栏会多出一个「知识库」入口：上传资料 → 自动解析入库 → 检索问答，
还能把问答产物导出成 Office 文档。

> **本仓库是 sharedkb 线**（共享知识库线）：面向**多用户网关**部署（192.168.8.6:3082），
> 在多用户隔离之上叠加共享知识库（`/shared/*`、共享回收箱）与「产物只落盘不入库」。
> 原始插件线（单机 / 纯插件，版本止于 0.3.10）在 [`dsh-raganything-kb`](https://github.com/imasonhk-spec/dsh-raganything-kb)。
>
> 本仓库由该仓库的 4 条 sharedkb 分支（`feature/shared-kb` + 3 条 `release/*-sharedkb`）
> **合并收敛为单一主线**而来 —— 合并依据、旁支核对结论与谱系图见
> [`docs/LINEAGE-sharedkb.md`](docs/LINEAGE-sharedkb.md)。
>
> **分支纪律：单一主线，不再按版本开 `release/*` 分支。**

---

## 组成

| 位置 | 文件 | 职责 |
| --- | --- | --- |
| 宿主插件 | `src/lib/index.js` | 向 DSH 注册 6 个 `rag_*` 工具；托管 sidecar 进程（健康检查优先 adopt，缺服务才 spawn） |
| 前端面板 | `src/lib/client.js` | 侧边栏入口 + 全屏知识库 UI：目录树 / 检索 / 问答 / 历史 / 上传 / AI 模型 / 索引管理 / 日志 / 导出 / **对话产物栏**。面板内所有文档计数统一走 `kbDocs` 口径（排除只读 `DSH产物/` 镜像与 `知识库产物/` 产物），状态栏与「索引」弹窗数字一致 |
| sidecar | `src/sidecar/server.py` | LightRAG 检索与入库、MinerU 解析（PDF / Office / 图片）、本地 bge-m3 GGUF 向量、四路去重、工作区同步、失败台账 |
| 配置模板 | `src/kb/config.json.template` | 零配置安装时的 sidecar 配置基线 |
| 插件声明 | `src/cordis.patch.yml` | DSH 插件元数据 |
| 安装骨架 | `packaging/` | 幂等安装器 / 验证器 / 卸载器 + systemd · nginx · env 模板 + 配置适配脚本 |
| 打包工具 | `build/` | 从 live 插件目录快照出「可移植包」；把补丁函数级移植到**已分叉**的部署 |

## 主要能力

- **多模态入库**：PDF / Office / 图片经 MinerU 解析后入 LightRAG
- **本地向量**：bge-m3 GGUF（1024 维），运行时自举 `llama-cpp-python` + 模型自动下载（走 hf-mirror）
- **四路重复检测**：同名 / 同 SHA-256 同名 / 同 SHA-256 跨名 / 图片 pHash，策略可配
- **失败台账**：错误分类 + 重试收割 + 额度熔断（额度不足时不再无限重试）
- **产物导出**：问答结果导出 docx / xlsx / pptx
- **多用户隔离**：localStorage 按账号加命名空间（`dsh_mu_user`）；sidecar 基址跟随网关 basePath；每个账户自启自己的 sidecar
- **「对话产物」栏**：会话产物按会话分组展示在对话框右侧，可折叠，每项一个 `@文件` 按钮把产物作为引用注入当前对话

## 分支与打补丁须知（重要）

同一份代码已在多套部署上**分叉**，各自带着对方没有的特性：

| 分支 | 特征 |
| --- | --- |
| 基准 | 纯插件代码 |
| 多用户网关分支 | 基准 + 多用户隔离（`MU_NS` 命名空间、网关 basePath） |
| 单机分支 | 基准 + 面板崩溃防护（`normaliseModelsSnap`） |
| 多用户网关线 `0.3.x-sharedkb`（8.6 线上） | 多用户网关分支 + 共享知识库（`/shared/*`、回收箱）+ **产物「只落盘不入库」**（doc_id 前缀 `art-`），因此 `/documents/{art-*}/content` 需要单独分支处理（0.3.12 修复）。**本仓库即此线，已收敛为单一主线**（0.3.10-sharedkb → 0.3.13-sharedkb） |
| `src/`（`0.4.0-sharedkb.1`） | 产物走「真实入库」模型（`file_path` 带 `DSH产物/`、`知识库产物/` 前缀），与上面这条线**不可互相整文件覆盖** |

**给已分叉的部署打补丁，不要整文件覆盖** —— 用函数级锚点替换，并且每处都断言命中次数
（见 `build/kb_artifact_rail_patch.py`、`build/apply_norm_fix.py`）。整文件覆盖会把对方独有的
功能静默冲掉。

## 版本

| 版本 | 内容 |
| --- | --- |
| **0.3.17-sharedkb** | 多用户网关线（8.6）发布件。回灌 2026-09-22 以来 client 侧热修（`server.py` 本版未动，与 0.3.16 逐字节相同）：① `kbIcons071`——DSH 0.1.7-alpha.2 图标导出尺寸后缀（`IconX14/16`）-> 字重后缀（`IconXRegular`）适配，缺了即 React #130 整条知识库 UI 消失；② KB 面板 x DSH 导航栏联动（`closeKbPanel` / `softCloseKb` / `activePanelId` 监视 / 捕获阶段导航点击兜底）；③ 侧栏跟随（`--dsh-kb-left`）；④ `lib/index.js` 工具 schema 修复——属性级 `required: true` 移到顶层 `required` 数组（严格 OpenAI/Gemini 端点旧 schema 一律 400）。见 [`releases/0.3.17-sharedkb/CHECKSUMS.md`](releases/0.3.17-sharedkb/CHECKSUMS.md) |
| **0.3.16-sharedkb** | 多用户网关线（8.6）发布件。回灌 2026-09-21 server 侧热修（`server.py` 相对 0.3.15 真实改动 **+192/-24 行**）：① 产物正文抽取 `_artifact_text_of()`（docx/xlsx/pptx 用 python-docx/openpyxl/python-pptx 解析，替代旧「office 二进制返回空正文」）；② 跨实例解析 `_global_upload_dir()` + `_original_file_of()` 第三级回退（子账号实例去宿主 `uploads/` 找原始文件）；③ 新增 `ingest_file`（`POST /ingest_file` + `/tasks` op 分支 + `_copy_file_artifact()`），把外部已生成的 office 文件登记为「仅文件」产物。★ 线上 `server.py` 是 **CRLF 泄漏版**（8465 CRLF / 0 裸 LF），本版归一为 LF 后打包。`lib/client.js` 与 0.3.15 逐字节相同。见 [`releases/0.3.16-sharedkb/CHECKSUMS.md`](releases/0.3.16-sharedkb/CHECKSUMS.md) |
| **0.3.15-sharedkb** | 多用户网关线（8.6）发布件。回灌 2026-09-19/20 全部线上热修（`server.py` +839/-26 行）：重试解析状态转正（`_silent_dup` 自愈 / `_find_doc_ids_by_display` 双侧 vroot 归一 / 孪生一起入队）、共享库覆盖保目录树与落点、回收箱滚动/全部还原/全部删除、对话产物跨会话账本、产物语义化命名（`semantic_title`）、`/index/reingest` 入队化；`client.js` 同步回收箱滚动与语义化命名触发。`server.py`/`client.js` 直接取 8.6 宿主活副本（12 份 md5 已一致，无需再合成）。见 [`releases/0.3.15-sharedkb/CHECKSUMS.md`](releases/0.3.15-sharedkb/CHECKSUMS.md) |
| **0.3.14-sharedkb** | 多用户网关线（8.6）发布件。回灌 2026-09-17/18 全部热修：`server.py` 合成为 host-aware 单一权威版（含 `_shared_is_local()` 宿主守卫的 shared-scope forward 块 + Phase-4 dup 自愈 / session 产物账本 / 重试回收），`lib/client.js` 更新为全量热修版并移除失配的 `client.js.map`。见 [`releases/0.3.14-sharedkb/CHECKSUMS.md`](releases/0.3.14-sharedkb/CHECKSUMS.md) |
| **0.3.13-sharedkb** | 多用户网关线（8.6）发布件。修复「@ 共享文件 / 文件夹 限定范围问答返回没有检索到」：① `_in_scope` 对 chunk 与 scope 两端对称剥虚拟根（全部文档/ 与 共享/）；② `_route_scope_query` host-aware——宿主本地检索、用户实例把命中共享文件夹的作用域转发宿主 sidecar（17321）并合并回答，单文件不转发自环。见 [`docs/RELEASE-0.3.13-sharedkb.md`](docs/RELEASE-0.3.13-sharedkb.md) |
| **0.3.12-sharedkb** | 多用户网关线（8.6）发布件。「对话产物 → 打开原始文件」修复：`/documents/{art-<id>}/content` 由恒 404 改为 200（office 型返回空正文 + `file_path`，交前端 OFV 渲染）；顺带清掉 0.3.11 包内误带的 `.bak`。见 [`docs/RELEASE-0.3.12-sharedkb.md`](docs/RELEASE-0.3.12-sharedkb.md) |
| **0.3.10-sharedkb** | sharedkb 线首个发行件（8.6:3082 live 快照）。共享知识库 + 多用户隔离 + `art-` 产物「只落盘不入库」；`server.py` 共享回收箱仅管理员可操作，`client.js` 重复上传扩展为 5 选项。见 [`docs/RELEASE-0.3.10-sharedkb.md`](docs/RELEASE-0.3.10-sharedkb.md) |
| **0.3.10** | ABCD 加固 + 多用户本地模型 SSL 彻底修复：`server.py` 本地端点自适应（选本地模型不再报 `CERTIFICATE_VERIFY_FAILED`）、`/models/restart` 端口竞态修复；`client.js` 退化答案检测 + `degraded` 透传（不再把退化回答写成「知识库产物」）；10 份 `config.json` 归一化到 `127.0.0.1:11434/v1`；问答模型切 `qwen3.6:35b-chat` |
| 0.3.9 | 「索引」弹窗计数口径修复：`extDist` 遍历 `kbDocs` 而非全部 `docs`，弹窗数字与侧栏状态栏、目录树三者一致（此前状态栏 9、弹窗 455） |
| 0.3.8 | 状态栏计数对齐目录树（`kbDocs.length`）；「对话产物」栏只列生成文件（跳过对话 `.md`）；`server.py` 增加 OFV `/viewer/*` 静态挂载 |
| 0.3.7 | 「对话产物」栏；产物文件夹从知识库树下线；全局检索恒定排除产物；面板崩溃防护；打包缺陷修复（`uninstall.sh` 的 CRLF、误打进包里的 `__pycache__`） |
| 0.3.6 | 多用户数据隔离；「删除后重传仍报重复」修复（A–G 七处）；`install.sh --no-pnpm` 解析器修复 |
| 0.3.5 | 基线 |

发布说明见 [`releases/0.3.17-sharedkb/CHECKSUMS.md`](releases/0.3.17-sharedkb/CHECKSUMS.md)（sharedkb 线最新）、
[`docs/RELEASE-0.3.17-sharedkb.md`](docs/RELEASE-0.3.17-sharedkb.md)、
[`docs/RELEASE-0.3.16-sharedkb.md`](docs/RELEASE-0.3.16-sharedkb.md)、
[`docs/RELEASE-0.3.13-sharedkb.md`](docs/RELEASE-0.3.13-sharedkb.md)、
[`docs/RELEASE-0.3.12-sharedkb.md`](docs/RELEASE-0.3.12-sharedkb.md)、
[`docs/RELEASE-0.3.10-sharedkb.md`](docs/RELEASE-0.3.10-sharedkb.md)（sharedkb 线首个发行件）；
原始插件线：[`docs/RELEASE-0.3.10.md`](docs/RELEASE-0.3.10.md)（历史：[0.3.9](docs/RELEASE-0.3.9.md) · [0.3.8](docs/RELEASE-0.3.8.md) · [0.3.7](docs/RELEASE-0.3.7.md)）、
[`docs/RELEASE-shared-kb.md`](docs/RELEASE-shared-kb.md)。

## 安装（可移植包）

可移植包由 `packaging/`（安装器 + 载荷 + 校验清单）与 `src/`（插件源码）组装，`plugin/` 内为 `dsh plugin add` 用的插件包（由 [`build/pack_kb.py`](build/pack_kb.py) 确定性打包）：

```bash
tar xzf dsh-raganything-kb-0.3.17-sharedkb-portable.tar.gz
cd dsh-raganything-kb-0.3.17-sharedkb-portable
SUDO_PW='<sudo 密码>' ./install.sh --profile web   # 以 DSH 属主用户运行，不要用 root
./verify.sh --profile web --deep                   # --deep 会真的提交一次查询验证整条链路
```

安装器是**幂等**的：**升级直接重跑 `install.sh`，不要先卸载**（卸载会删插件目录）。
每一步都会留 `.bak-*` 备份，旧版本也会存一份到 `~/.dsh/raganything/backup-portable-<时间戳>/`。

> **多用户宿主注意**：`install.sh --no-systemd` 停旧 sidecar 时只会停**本实例自己**的进程
> （pkill 锚定本实例 venv 路径 + 本实例 `$RAG_HOME/sidecar.pid`）。0.3.12 之前是无锚点的
> `pkill -f "python.*server.py"`，在 8.6 这类多用户宿主上会连带杀掉宿主 sidecar 和其他用户的
> 懒加载实例 —— 详见 [发布说明](docs/RELEASE-0.3.12-sharedkb.md)。

发布件同时归档在 `releases/` 下：`0.3.17-sharedkb/`、`0.3.16-sharedkb/`、`0.3.15-sharedkb/`、`0.3.14-sharedkb/`、`0.3.13-sharedkb/`、`0.3.12-sharedkb/`、`0.3.10-sharedkb/`
（各含 `.tgz` / `-portable.tar.gz` / `CHECKSUMS.md`）。

---

内部项目，未附许可证。
