# CHECKSUMS — dsh-raganything-kb 0.3.17-sharedkb

分支：8.6 多用户网关线（sharedkb）。基线：`0.3.16-sharedkb`。

## 发布件

| 文件 | md5 | sha256 | size (B) |
| --- | --- | --- | --- |
| `dsh-raganything-kb-0.3.17-sharedkb-portable.tar.gz` | `d6591e54f9d1fe0541c8447b9965f426` | `7bd0f4bfc7933bc2b8aeb39b77ebaef2f139e46e06dcb63b5bbbb5d5d584b3b2` | 10735698 |
| `dsh-raganything-kb-0.3.17-sharedkb.tgz` | `8d5a94f80c89979f6c01f07dcfffd326` | `987c5541d32928c4907a3b213d33ae51f4539ea71a5f3f562fb457619a0c0656` | 5349801 |

## 构建口径

- **基线**：`releases/0.3.16-sharedkb/dsh-raganything-kb-0.3.16-sharedkb.tgz`
  （195 成员）
- **确定性**：GNU_FORMAT tar + 固定 mtime/uid/gid/uname/gname/mode + 成员按名排序 +
  gzip `filename=""` `compresslevel=9` `mtime=0`；连打两次 md5 相同（发行 tgz 与便携包各复核一次）。
  便携包 `portable_build` 用 `--build-stamp` 冻结为 `2026-09-26T23:40:00+0800`。
- **打包器**：`build/build_rel0317.py`（发行 tgz）/ `build/build_portable_0317.py`（便携包）；
  载荷输入 `build/live_client_0317.js` / `build/live_index_0317.js` 已入库。
- **载荷来源**：8.6 宿主活副本 `/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb/`
  （2026-09-26 抓取，两个 js 均 LF-clean，无 CRLF 泄漏）

| 载荷 | 线上活副本 | 基线 0.3.16 |
| --- | --- | --- |
| `lib/client.js` | `f5e7e7cfddcadbf12d547b9db2bd1a21`（415617 B，LF） | `526ed56d7d44daeae0fcefb40eebb371`（410089 B） |
| `lib/index.js` | `375437b25223fac25474bcf19d4fcc30`（36473 B，LF） | `e8430c4d19177b133d434098d25f6601`（36437 B） |
| `sidecar/server.py` | 与基线逐字节相同 `cc60b66917834cc7d0c6de1ddfe29b9a`（383404 B）——**本版未动 server 侧** | 同左 |
| `package.json` | version 0.3.16 | 版本 `0.3.16` -> `0.3.17` |

## 与基线的差异（全部）

| 成员 | 变更 |
| --- | --- |
| `package/lib/client.js` | 回灌 2026-09-22 以来 client 侧热修：① `kbIcons071`（0.1.7 图标尺寸后缀 -> 字重后缀 `IconXRegular`，缺了即 React #130 整条 UI 消失）；② KB 面板 x DSH 导航栏联动（`closeKbPanel` / `softCloseKb` / `activePanelId` 监视 / 捕获阶段导航点击兜底）；③ 侧栏跟随（`--dsh-kb-left`）；④ 工件栏/模型面板 CSS 增量 |
| `package/lib/index.js` | 工具 schema 修复（对齐 `tools/patch_kb_tool_schema86.py`）：`rag_query` / `rag_ingest` / `rag_note` / `rag_delete` 等的属性级 `required: true` 移到顶层 `required` 数组（严格 OpenAI/Gemini 端点旧 schema 一律 400） |
| `package/package.json` | 版本 `0.3.16` -> `0.3.17` |
| `package/RELEASE-NOTES.md` | 替换为 0.3.17 说明 |

其余 191 个成员（含 `sidecar/server.py`、`cordis.patch.yml`、`kb/config.json.template`、
`sidecar/viewer/` 187 项资源）**逐字节不变**（打包器 gone/added/changed 三集合断言通过）。

## 断言清单（build_rel0317.py）

1. 基线版本 == 0.3.16；2. 其余成员逐字节不变；3. 无 `.bak` 混入；4. `server.py` 与基线逐字节相同；
5. 修复标记齐备（client 11 项 + index 顶层 `required` 4 项 + 无属性级 `required: true`）；
6. 两个 js `node --check` 通过且无 CRLF；7. 连打两次 md5 相同。

## 部署状态（2026-09-26 打包时点）

- 8.6 宿主 + 11 用户副本的 `lib/client.js` / `lib/index.js` **已是本版载荷**（0.3.17 即 live 快照），
  但各 profile `package.json` 依赖指符仍指向 `dsh-raganything-kb-0.3.16-sharedkb.tgz`。
  **未切指符前**，任何按 `file:` 指符的重新物化（懒加载 / `pnpm install` / 网关重建）都会把
  `lib/*.js` 回退到 0.3.16（0.3.15 时代 `admin` 已实际发生过一次 server.py 回退）。
- 切换照 `build/sync_0316_86.py` 模板做文件层三重一致同步（依赖串 + pnpm-lock 5 处 + 已装目录全量比对），
  重启前先查 sidecar `/status` 的 `tasks_running==0`。
