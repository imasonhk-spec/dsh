# dsh-raganything-kb 0.4.1-sharedkb

分支：8.6 多用户网关线（sharedkb），基线 = `0.4.0-sharedkb`。

运行时文件逐字节取自 2026-10-13 的 8.6 宿主活副本
（`/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb`）。

## 与基线的差异（仅三处，其余成员逐字节不变）

| 成员 | 变更 |
| --- | --- |
| `lib/client.js` | +80 B（536043 -> 536123）。① **「同步文件夹」置顶分组**：新增 `PIN_SYNC = "同步文件夹"` 与 `TOP_ORDER = [PIN_SYNC, ...PIN_ORDER]`，桌面客户端同步进来的目录排在个人库最前，文件夹图标沿用 pin 高亮；刻意**不放进 `PIN_ORDER`** —— `PIN_ORDER` 经 `isPinnedPrefix()` 喂给 `isPersonalFolder()`，进去就会被当成只读镜像而排除出个人库树。② **「AI 模型」弹窗下线 ASR 分类卡**：删掉 39 行 JSX 与 `kb.modelAsr` / `kb.modelAsrDesc` 中英文案，留 `kbAsrRm86-stamp-20261011-094954` 标记。③ **OFV 查看器挂载竞态修复**（`ofvMountRace-20261010`）：按字节身份（`content.data` 的 `byteLength`）而非 `content` 包装对象判断是否需要重挂；每个宿主一条串行挂载链 + `seq` 令牌，避免父级因元数据版本帧重建 `content` 期间并发发起第二次 `ofvMount`（要等 11 MB 的 `/viewer/ofv.bundle.js`）导致 `<div>` 双挂。④ CSS 增量 |
| `sidecar/server.py` | +558 B（538498 -> 539056）。① `TEXT_EXTS` 纳入 `.html` / `.htm`（网页另存文件可直接文本入库）；② 系统提示新增第 6 条身份硬规则（被问「你是什么模型 / 你是谁」时固定自我介绍）；③ `_silent_dup` 的孪生探测由「遍历全部 PROCESSED 文档逐一比对文件名」改为 **`lightrag.utils.compute_mdhash_id(text, prefix="doc-")` 按内容 hash 直取 twin**，并补上 `silentdup2 twin-by-content` / `twin-probe failed` 日志 |
| `package.json` | 版本 `0.4.0` -> `0.4.1` |

## 附带修正

- **`README.md`**：GitHub 上的 `README.md` 当时是**另一条线**（`dsh-raganything-kb` 原始插件线，
  讲「本地托管 / 远程共享」两种部署模式）的 README，与本仓库（sharedkb 线、多用户网关）定位不符。
  本版恢复为 sharedkb 线 README（即 0.4.0 便携包内随附的那一份），并补 `0.4.1` / `0.4.0` / `0.3.17`
  三行版本记录。

## 不变项（显式断言）

- `lib/index.js` sha256 `09d9e3ca…a6811e`（55389 B）与 0.4.0 逐字节相同。
- `cordis.patch.yml`、`kb/config.json.template`、`sidecar/request_generation.py`、
  `sidecar/shared_query.py`、`sidecar/viewer/`（187 项）逐字节相同。
- 便携包的安装骨架（`install.sh` 除 `PKG_VERSION`、`uninstall.sh`、`verify.sh`、`extras/`、`tools/`）
  逐字节继承 0.4.0。

## 为什么要出这一版

0.4.0 截止于 2026-10-07。此后 8.6 上又落了四类只存在于活副本的改动：
① 客户端「同步文件夹」置顶分组（桌面客户端同步目录的展示口径）；
② 「AI 模型」弹窗下线 ASR 分类（该分类在本线无可用模型）；
③ OFV 查看器挂载竞态修复（父级重渲染期间的二次挂载）；
④ sidecar 侧的 `.html/.htm` 入库、身份硬规则与 `silentdup2` 孪生探测改走内容 hash。
任何 `pnpm install` / 重装 / 回滚都会把这些修复整体抹掉 —— 本版把它们固化进发行件。

## 验证

- 包内 `lib/client.js`、`lib/index.js`、`sidecar/server.py` 与 8.6 宿主活副本逐字节一致。
- `payload/sidecar/viewer/` 187 项与 live 逐字节一致（哈希字典相等断言）。
- 便携包连打两次 md5 相同（确定性）；`plugin/*.tgz` 与发行 tgz 逐字节相同。

## 部署注意

换用本包需同步改 12 份 profile 的依赖（宿主 + 11 用户 home）并重算 pnpm-lock integrity，
否则重装仍会按旧 tgz 还原。宿主重启 `systemctl restart raganything-sidecar`（独立服务）；
用户实例用 `POST :3200N/models/restart` 或整服务重启 `dsh-web`。
