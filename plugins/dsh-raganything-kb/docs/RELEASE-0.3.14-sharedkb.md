# dsh-raganything-kb 0.3.14-sharedkb 发布说明

> 多用户网关线（8.6）。相对 `0.3.13-sharedkb` 的增量：把此前在 8.6 线上**热修但从未进发行包**的四条定稿行为，正式回灌为 `0.3.14-sharedkb` 发行包，并一次性根除「重装/回滚即回退」的两个复发风险。
> 校验口径、md5/sha256/integrity、构建口径、与基线差异、部署状态见 [`../dist/CHECKSUMS.md`](../dist/CHECKSUMS.md)。

## 为什么是 0.3.14（而非只发 0.3.13）

排查发现 GitHub 上最新的 `0.3.13-sharedkb` **只含共享 scope 修复**，四条定稿行为一条都没进包（client 8 处补丁标记 = 0、server 13 处标记 = 0）。8.6 线上副本却载着 13 处 server + 8 处 client 热修，从未发布 → 任何 `pnpm install` / 重装 / 回滚都会把修复全冲掉。故直接回灌到 `0.3.14-sharedkb`，把四条行为全部固化。

## 本次交付的四条定稿行为

| # | 行为 | 关键实现 |
| --- | --- | --- |
| ① | 对话产物栏 = **当前对话**的非 `.md` 产物 | 锚定 `session_id`（方案 B），非按标题；账本 `kb-sessions.json`；剔除 `.md` |
| ② | 个人 / 共享 KB 均为**分级展开目录树** | `buildSharedTree` / `flattenSharedRows` / `sharedVisibleRows` 由 `doc.title` 路径前缀推导 |
| ③ | 共享检索 scope 带「共享/」前缀 → **转发宿主** | host-aware `_shared_is_local()`：`SHARED_BASE` 默认 `http://127.0.0.1:17321`，宿主本地检索、用户实例转发，不自环 |
| ④ | 共享→个人复制 / 同内容再上传 = **内容 dedup 非破坏自愈** | `_ainsert_dup_safe` + `_clear_duplicate_blocker` + reaper 回滚卡死条目 |

> 0.3.13 的 scope 修复（① 前缀不对称、② 作用域检索跑在用户实例本地）原样保留并纳入 ③ 的 host-aware 守卫。

## server.py 合成（关键难点）

8.6 线上 `server.py` 已分叉：宿主 GLOBAL 有 Phase-4 / session 修复但无 forward 守卫；用户副本有守卫但无 Phase-4 修复，互装必坏（宿主自环 / 用户 0 命中）。
合成版 = **宿主 GLOBAL 活副本为底 + 0.3.13 的 8 行守卫块**，单文件同时正确服务宿主与用户实例。md5 `9fec09bad3b0a1198b399fe6a709fc38`。

`_shared_is_local()` 判定矩阵（实测）：

| 环境 | PORT | SHARED_BASE | 行为 |
| --- | --- | --- | --- |
| 宿主 | 17321 | `127.0.0.1:17321` | True → 本地检索 |
| 用户实例 | 3200N | `127.0.0.1:17321` | False → 转发宿主 |

## 发布件

| 文件 | MD5 | SIZE |
| --- | --- | --- |
| `dsh-raganything-kb-0.3.14-sharedkb.tgz` | `60b23c2f4354a60166160b97c1965ee0` | 5 330 114 B |
| `dsh-raganything-kb-0.3.14-sharedkb-portable.tar.gz` | `0cffc329a045776fbf84f1400997901c` | 10 692 311 B |

构建器：`build/build_rel0314.py`、`build/build_portable_0314.py`（确定性打包，同输入同 md5）。

## 部署状态（重要）

- **8.6 多用户网关 12 份 profile 已全部对齐到本包（2026-09-19 完成）**：`pnpm install --frozen-lockfile` 12/12 PASS，实装 `client.js=b41f84aa…`、`server.py=9fec09ba…` ×12 统一；全树 0 处旧版引用。宿主 sidecar 与 dsh-web 已重启加载新代码。
- 100.100.6.55 与本机 DSH Desktop 按用户选择**暂未**切换（Desktop 仍指 0.3.5）。
- 已打开的用户标签页需 `Ctrl+Shift+R` 才能拿到新 chunk。

## 验证（线上，2026-09-19）

| 判据 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 12/12 PASS |
| integrity 一致性 | 12 份全为 `sha512-pChCwVQs+…`（与 tgz 字节重算逐位相符） |
| 实装 client.js | `b41f84aa99a107079e9a6174a697cd26` ×12（首次统一） |
| 实装 server.py | `9fec09bad3b0a1198b399fe6a709fc38` ×12（首次统一） |
| combo 字节补丁标记 | 7/7 命中（`buildSharedTree`/`flattenSharedRows`/`sharedVisibleRows`/`activeSessId`/`会话-`/`executeCopyTo`/`collectSharedFolderDocs`） |
| UI `pageerror` | NONE |
| 共享 scope 首帧 | 「正在检索共享知识库（转发至宿主实例）…」✅，`hits=2/5 mode=scope` |
