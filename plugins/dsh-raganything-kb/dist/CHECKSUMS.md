# CHECKSUMS — dsh-raganything-kb 0.3.14-sharedkb

分支：8.6 多用户网关线（sharedkb）。基线：`0.3.13-sharedkb`。

## 发布件

| 文件 | md5 | sha256 | size (B) |
| --- | --- | --- | --- |
| `dsh-raganything-kb-0.3.14-sharedkb-portable.tar.gz` | `0cffc329a045776fbf84f1400997901c` | `8908aa3d9e70012f91a15a79bd92ae6da9ced36bf17aac8132bc519a44bdd08f` | 10692311 |
| `dsh-raganything-kb-0.3.14-sharedkb.tgz` | `60b23c2f4354a60166160b97c1965ee0` | `afae8edfaf71c256e67c5e500defa1263c320dd900fac43a817ea8e6ee0e29aa` | 5330114 |

## 构建口径

- **基线**：`releases/0.3.13-sharedkb/dsh-raganything-kb-0.3.13-sharedkb.tgz`
  （md5 `37fec124b41996b5b5c4ca522f2ae7a6`，196 成员）
- **确定性**：GNU_FORMAT tar + 固定 mtime/uid/gid/uname/gname/mode + 成员按名排序 +
  gzip `filename=""` `compresslevel=9` `mtime=0`；连打两次 md5 相同。
- **打包器**：`build/build_rel0314.py`（发行 tgz）/ `build/build_portable_0314.py`（便携包）

## 与基线的差异（全部）

| 成员 | 变更 |
| --- | --- |
| `package/sidecar/server.py` | 替换为 host-aware 合成版（宿主 GLOBAL 活副本 + 带守卫的 forward 块） |
| `package/lib/client.js` | 替换为 8.6 全量热修版（md5 `b41f84aa99a107079e9a6174a697cd26`） |
| `package/lib/client.js.map` | **删除**（旧 sourcemap 与新版 client.js 不匹配） |
| `package/package.json` | 版本 `0.3.13` -> `0.3.14` |
| `package/RELEASE-NOTES.md` | 替换为 0.3.14 说明 |

其余 191 个成员（含 `lib/index.js`、`cordis.patch.yml`、`kb/config.json.template`、
README、`sidecar/viewer/` 187 项资源）**逐字节不变**。

## 断言（打包器内置，全部通过）

1. 基线版本 == `0.3.13`
2. 其余成员逐字节不变（gone / added / changed 三集合为空）
3. 产物内无 `.bak`
4. 修复标记齐备：server 6 项、client 6 项
5. `py_compile`（server）+ `node --check`（client）通过；无 CRLF 泄漏
6. 确定性 md5 复核通过

## 便携包额外断言

- `payload/sidecar/viewer/` 187 个普通文件在包内（缺则 `/viewer/*` 404）
- `install.sh` / `uninstall.sh` / `verify.sh` 语法检查按**退出码**判定，全部 ok
- `manifest.json` 记录 204 条目；`changes_0.3.13` 保留、新增 `changes_0.3.14`

## 部署状态（重要）

- `server.py` 是「单文件同时服务宿主与用户实例」的合成版：
  宿主 `_shared_is_local()` 为 True（PORT==SHARED_BASE 端口）-> 本地检索；
  用户实例为 False（3200N != 17321）-> 转发宿主 sidecar。判据见 `dl/rel0314/VERIFY-0.3.14.md`。
- **8.6 多用户网关 12 份 profile 已全部对齐到本包（2026-09-19 完成）**：
  `pnpm install --frozen-lockfile` 12/12 PASS，实装 `client.js=b41f84aa…`、`server.py=9fec09ba…`
  ×12 统一；全树 0 处旧版引用。宿主 sidecar 与 dsh-web 已重启加载新代码。
- 100.100.6.55 与本机 DSH Desktop 按用户选择**暂未**切换（Desktop 仍指 0.3.5）。
