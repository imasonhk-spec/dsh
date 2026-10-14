# CHECKSUMS — dsh-raganything-kb 0.3.16-sharedkb

分支：8.6 多用户网关线（sharedkb）。基线：`0.3.15-sharedkb`。

## 发布件

| 文件 | md5 | sha256 | size (B) |
| --- | --- | --- | --- |
| `dsh-raganything-kb-0.3.16-sharedkb-portable.tar.gz` | `c455c4dd6e43b1afa0482e479f15ce0b` | `3d68507e0d3d168e210e36bc12d47d43d5580e18e67120e9f6b91940613ac987` | 10730800 |
| `dsh-raganything-kb-0.3.16-sharedkb.tgz` | `c0a530d2eec995d7670e8141b108c7c1` | `5ae65deb1eda6d2808b1ceefe1b2bce0148098887cf0af177a16e65ca25cd6a1` | 5348229 |

## 构建口径

- **基线**：`releases/0.3.15-sharedkb/dsh-raganything-kb-0.3.15-sharedkb.tgz`
  （md5 `5087278c121b9ca1d05bc31e6aa587cb`，195 成员）
- **确定性**：GNU_FORMAT tar + 固定 mtime/uid/gid/uname/gname/mode + 成员按名排序 +
  gzip `filename=""` `compresslevel=9` `mtime=0`；连打两次 md5 相同（发行 tgz 与便携包各复核一次）。
  便携包 `portable_build` 用 `--build-stamp` 冻结为 `2026-09-22T19:10:00+0800`。
- **打包器**：`build/build_rel0316.py`（发行 tgz）/ `build/build_portable_0316.py`（便携包）
- **载荷来源**：8.6 宿主活副本
  `/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb/`

| 载荷 | 线上原始 | 打包输入 |
| --- | --- | --- |
| `sidecar/server.py` | `a1e8c800294e0e8fb277f0a65b539d20`（391869 B，**CRLF 泄漏**） | `cc60b66917834cc7d0c6de1ddfe29b9a`（383404 B，LF 归一） |
| `lib/client.js` | `526ed56d7d44daeae0fcefb40eebb371`（410089 B） | 同左（**本版未动前端**） |
| `package.json` | `2fcae1c405c48d79082c4929c6f7ddde`（909 B，version 0.3.15） | 版本 `0.3.15` -> `0.3.16` |

## CRLF 归一（本版特有，必读）

线上宿主活副本 `server.py` 的 8465 个换行**全部是 `\r\n`**、0 个裸 LF（基线为纯 LF）。
这是 Windows 侧补丁脚本回写时把 `\n` 转成 `\r\n` 造成的，`py_compile` 不会报错，只能靠字节核对发现。

- 未归一化时 diff 会伪装成「8465 行全改」；归一化后**真实改动 = `+192/-24` 行、6 个 hunk**。
- 本版发行件统一 LF，与基线及历史发行件口径一致。
- `server.py` 输入断言：`len == 383404`、md5 `== cc60b669…`、`b"\r\n" not in data`。

## 与基线的差异（全部）

| 成员 | 变更 |
| --- | --- |
| `package/sidecar/server.py` | 替换为 2026-09-21 server 侧热修版（相对基线 +192/-24 行） |
| `package/package.json` | 版本 `0.3.15` -> `0.3.16` |
| `package/RELEASE-NOTES.md` | 替换为 0.3.16 说明 |

其余 192 个成员（含 `lib/client.js`、`lib/index.js`、`cordis.patch.yml`、
`kb/config.json.template`、README、`sidecar/viewer/` 187 项资源）**逐字节不变**。

### server.py 改动内容（3 组）

1. **产物正文抽取** `_artifact_text_of()`：docx（python-docx）/ xlsx（openpyxl）/
   pptx（python-pptx）解析出正文；`_artifact_scope_texts()` 不再对 office 二进制返回空正文。
2. **跨实例解析** `_global_upload_dir()` + `_original_file_of()` 第三级回退：
   子账号实例的 `working_dir` 与宿主不同，产物实际写在宿主 `uploads/`，
   新增「按 `RAG_HOST_WORKING_DIR` 或结构推导定位宿主 uploads + 全局 manifest 反查 + basename 扫描」。
3. **`ingest_file`**：新增 `POST /ingest_file` 端点、`POST /tasks` 的 `ingest_file` op 分支、
   `_copy_file_artifact()`（把外部已生成的 office 文件拷入 `storage/uploads/` 并登记为
   `file_only: true` 产物，绑定 `session_id`）。

## 断言（打包器内置，全部通过）

1. 基线版本 == `0.3.15`
2. 其余成员逐字节不变（gone / added / changed 三集合为空，有意替换 3 项）
3. 产物内无 `.bak`
4. `lib/client.js` 与基线逐字节相同（本版未动前端）
5. 修复标记齐备：server 12 项（0.3.15 的 8 项 + `_artifact_text_of` / `_global_upload_dir` /
   `_copy_file_artifact` / `ingest_file`）、client 6 项（沿用 0.3.15）；且无探针残留（`kbProto` 计数 0）
6. `py_compile`（server）+ `node --check`（client）通过；无 CRLF 泄漏
7. 确定性 md5 复核通过
8. 注入的 `server.py` LF 归一后与 8.6 活副本按 `CRLF -> LF` 归一的结果逐字节一致

## 便携包额外断言

- `payload/sidecar/viewer/` 187 个普通文件在包内（缺则 `/viewer/*` 404）
- `install.sh` / `uninstall.sh` / `verify.sh` 语法检查按**退出码**判定，全部 ok
- `manifest.json` 记录 204 条目；保留 `changes_0.3.13/0.3.14/0.3.15`，新增 `changes_0.3.16`
- `plugin/dsh-raganything-kb-0.3.16.tgz` 与发行 tgz 逐字节相同
- 组装脚本自查：manifest 清单 == 归档实际条目（比对时排除不自列的 `manifest.json`）

## 部署侧状态 —— ✅ 已于 2026-09-22 20:33 完成切换

切换前核验（2026-09-22 18:5x）发现的**真实回退**：

| 范围 | `sidecar/server.py` | 说明 |
| --- | --- | --- |
| 宿主 `web` + 10 个账号（chenning/fresh1/iso1/mason/minson/test/test01/test02/test3/xiongsirui） | `a1e8c800…`（CRLF 热修版） | 与 0.3.16 打包输入同源（仅换行归一差异） |
| 账号 `admin` | `75559557795d26…`（375559 B = **0.3.15 发行件原样**） | 2026-09-22 18:47 被按 `file:…0.3.15-sharedkb.tgz` **重新物化**，热修被回退 |

即「热修只活在活副本、一重装就回退」的风险已实际发生一次（`admin`）。

### 切换动作（`build/sync_0316_86.py`，在 8.6 上 dry-run 后 `--apply`）

对新 tgz 稳定落地 `/home/lgsj/dsh-raganything-kb-0.3.16-sharedkb.tgz`
（SFTP 上传 + 远端 `sha256sum` 与本地一致），解到 `/tmp/rel0316/`，随后逐份（12 份）：

1. profile `package.json` 依赖串 `0.3.15 -> 0.3.16`（备份 `.bak-rel0316-<ts>`）；
2. `pnpm-lock.yaml`：5 处 tgz 引用改名 + `resolution.integrity` + 条目 `version:` 行；
3. 已装插件目录：**只重写字节不同的文件**（实测 12 份都只动 `sidecar/server.py`；
   宿主/admin/mason 另外补了 `RELEASE-NOTES.md`），`sidecar/viewer/**` 187 项一律不碰。

★ **顺带修掉一个历史遗留**：切换前所有 12 份 lock 里记的 integrity 是
`sha512-pChCwVQs+…`，实测那是 **0.3.14** tgz 的 sha512 —— 0.3.15 那次切换只改了 tgz 名字、
**没更新 integrity**。本版按 `"sha512-" + base64(sha512(tgz 字节))` 重算并写入
`sha512-pcffIoGKtpYveLkbA1r8Qq6jf8Zqa98vtP85NWRZHpyuYPIstXFLl4asXDz/Vhb087g3U3XWXa9E1LKYr/+DAA==`。

### 切换后核验（全绿）

| 检查 | 结果 |
| --- | --- |
| 12 份 `package.json` 依赖串 | 全部 `file:/home/lgsj/dsh-raganything-kb-0.3.16-sharedkb.tgz` |
| 12 份 `pnpm-lock.yaml` | 新名引用 5 处 / 旧名 0 处 / 新 integrity 1 处 |
| 12 份 `sidecar/server.py` | **12/12 md5 = `cc60b66917834cc7d0c6de1ddfe29b9a`（= 发行件内那份）** |
| 12 份已装 `package.json` version | 全部 `0.3.16` |
| 12 份载荷全树比对（195 文件 vs `/tmp/rel0316/package`） | **0 diff / 0 missing** |
| 服务重启 | `sudo systemctl restart raganything-sidecar` + `restart dsh-web`，两者 `is-active=active` |
| 宿主 sidecar `:17321` | `GET /documents`=200、`POST /ingest_file`=400（端点存在）、`/status` ok / init / `tasks_running=0` |
| 账号实例（`admin` `:32001`，由 admin profile 现拉起的） | `GET /documents`=200、`POST /ingest_file`=400 ⇒ **原先回退的那份现在确实在跑 0.3.16** |
| 网关 | `https://127.0.0.1:3082/mu/login` = 200；`sidecar.log` 无报错 |

回滚：`cp -a <f>.bak-rel0316-20260922-203210 <f>`（每个被改文件旁都留了备份）+ 依赖改回 0.3.15 指符 + 重启同两个服务。
