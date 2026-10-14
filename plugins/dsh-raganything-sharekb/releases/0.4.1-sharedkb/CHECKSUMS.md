# CHECKSUMS — dsh-raganything-kb 0.4.1-sharedkb

分支：8.6 多用户网关线（sharedkb）。基线：`0.4.0-sharedkb`。

## 发布件

| 文件 | md5 | sha256 | size (B) |
| --- | --- | --- | --- |
| `dsh-raganything-kb-0.4.1-sharedkb-portable.tar.gz` | `5a474434b27dd04ffce7196b6035042f` | `ecdff9bf0f2678dc58e655eb9415866b5e59c916320b46a4de454d0042e8310e` | 10914061 |
| `dsh-raganything-kb-0.4.1-sharedkb.tgz` | `2beeca8f510095b6a7f45f734756d14a` | `5b1d0942c71d01e292c0d77b3b65d293f10e3626544a18126309826af1c18d81` | 5443009 |

便携包内 `plugin/dsh-raganything-kb-0.4.1.tgz` 与上表发行 tgz **逐字节相同**
（`2beeca8f510095b6a7f45f734756d14a`）。

## 构建口径

- **基线**：`releases/0.4.0-sharedkb/` 的便携包（donor），仅做成员级替换；
  发行 tgz 以 live 插件目录为载荷重新确定性打包。
- **确定性**：GNU_FORMAT tar + 固定 mtime/uid/gid/uname/gname/mode + 成员按名排序 +
  gzip `filename=""` `compresslevel=9` `mtime=0`；发行 tgz 与便携包**各连打两次 md5 相同**。
  便携包 `portable_build` 冻结为 `2026-10-13T16:00:00+0800`。
- **打包器**：`build/_build_kb041.py`（发行 tgz）/ `tools/_build_kb041_portable.py`（便携包）。
- **载荷来源**：8.6 宿主活副本
  `/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb/`（2026-10-13 抓取；
  三个 js/py 均 LF-clean，无 CRLF 泄漏）。载荷为 **raw 字节**，不做注释级脱敏
  （便携包一贯口径：运行时文件与线上逐字节一致）。

| 载荷 | 线上活副本 sha256 | 0.4.0 基线 sha256 |
| --- | --- | --- |
| `lib/client.js` | `ddd3f653285959173aa45e9e5b6ccb79ab4b50d8831d2126598b4c1ac3945e24`（536123 B） | `20cc0972d3b32c6096e50de48f3a0a62bfb1fb5a81e480f813e7bf5c6d57d867`（536043 B） |
| `lib/index.js` | `09d9e3cade6b3ac34049b0fa50607291de10ab34eb4ece478301f1af49a6811e`（55389 B）**未变** | 同左 |
| `sidecar/server.py` | `439912c30756caf34251af4dc1b5f28a2e8f1f7777148764bebee2fc83497847`（539056 B） | `df8c4a3804b3394331baea50b42c793df6afbc7f38a30c7e4e509a2ea1ea8ae2`（538498 B） |
| `sidecar/request_generation.py` | `83e7219538d3706398fca7ce8f543369bce9282cea62abeee8fd39bc75dab544` **未变** | 同左 |
| `sidecar/shared_query.py` | `a096bf28b379a5fd1f0a71c6b5e600d5db06bee4f956dd7e989c5bbb23bb4b5c` **未变** | 同左 |
| `cordis.patch.yml` | `9a46a30b37ff436484174ce5665f10a9400c64be15350a2f9ec07658618bad4a` **未变** | 同左 |
| `package.json` | 版本 `0.4.0` -> `0.4.1`（内容基线与 0.4.0 相同） | — |

## 与基线的差异（全部）

| 成员 | 变更 |
| --- | --- |
| `package/lib/client.js` | +80 B。① **「同步文件夹」置顶分组**：新增 `PIN_SYNC = "同步文件夹"` 与 `TOP_ORDER = [PIN_SYNC, ...PIN_ORDER]`，桌面客户端同步进来的目录排在个人库最前，文件夹图标沿用 pin 高亮；刻意**不放进 `PIN_ORDER`** —— `PIN_ORDER` 经 `isPinnedPrefix()` 喂给 `isPersonalFolder()`，进去就会被当成只读镜像而排除出个人库树。② **「AI 模型」弹窗下线 ASR 分类卡**：删掉 39 行 JSX 与 `kb.modelAsr` / `kb.modelAsrDesc` 中英文案，留 `kbAsrRm86-stamp-20261011-094954` 标记。③ **OFV 查看器挂载竞态修复**（`ofvMountRace-20261010`）：按字节身份（`content.data` 的 `byteLength`）而非 `content` 包装对象判断是否需要重挂；每个宿主一条串行挂载链 + `seq` 令牌，避免父级因元数据版本帧重建 `content` 期间并发发起第二次 `ofvMount`（要等 11 MB 的 `/viewer/ofv.bundle.js`）导致 `<div>` 双挂。④ CSS 增量 |
| `package/sidecar/server.py` | +558 B。① `TEXT_EXTS` 纳入 `.html` / `.htm`（网页另存文件可直接文本入库）；② 系统提示新增第 6 条身份硬规则（被问「你是什么模型 / 你是谁」时固定自我介绍）；③ `_silent_dup` 的孪生探测由「遍历全部 PROCESSED 文档逐一比对文件名」改为 **`lightrag.utils.compute_mdhash_id(text, prefix="doc-")` 按内容 hash 直取 twin**，并补上 `silentdup2 twin-by-content` / `twin-probe failed` 日志 |
| `package/package.json` | 版本 `0.4.0` -> `0.4.1` |
| `package/RELEASE-NOTES.md` | 替换为 0.4.1 说明 |
| `README.md`（仓库根） | 修正：GitHub 上的 `README.md` 当时是**另一条线**（`dsh-raganything-kb` 原始插件线）的 README，与本仓库定位不符；本版恢复为 sharedkb 线 README 并补 0.4.1 / 0.4.0 / 0.3.17 版本行 |

其余成员（`lib/index.js`、`cordis.patch.yml`、`kb/config.json.template`、
`sidecar/request_generation.py`、`sidecar/shared_query.py`、`sidecar/viewer/` 187 项资源、
`install.sh`（除 `PKG_VERSION`）、`uninstall.sh`、`verify.sh`、`extras/`、`tools/`）
**逐字节不变**。

## 断言清单（`_build_kb041_portable.py`）

1. donor README 确为 sharekb 线（首行 `# dsh-raganything-sharekb`）；
2. live `package.json` 版本确为 `0.4.0` 且只替换那一处；
3. `payload/sidecar/viewer/` 与 live 逐字节一致（187 项，哈希字典相等）；
4. `install.sh` 的 `PKG_VERSION="0.4.0"` 锚点唯一，且安装器仍是 viewer-aware；
5. 便携包连打两次 md5 相同；
6. 便携包内 `plugin/*.tgz` 与发行 tgz 逐字节相同。

## 部署状态（2026-10-13 打包时点）

- 8.6 宿主 + 11 用户副本的 `lib/*.js` / `sidecar/server.py` **已是本版载荷**（0.4.1 即 live 快照），
  但各 profile `package.json` 依赖指符仍指向更早的 sharedkb tgz。
  **未切指符前**，任何按 `file:` 指符的重新物化（懒加载 / `pnpm install` / 网关重建）都会把
  `lib/*.js` 与 `sidecar/server.py` 回退到旧版。
- 切换照 `build/sync_0316_86.py` 模板做文件层三重一致同步（依赖串 + pnpm-lock 5 处 + 已装目录全量比对），
  重启前先查 sidecar `/status` 的 `tasks_running==0`。
