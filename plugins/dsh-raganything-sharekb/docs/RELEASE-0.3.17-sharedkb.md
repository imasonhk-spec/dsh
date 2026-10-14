# RELEASE 0.3.17-sharedkb（2026-09-26）

- 分支：8.6 多用户网关线（sharedkb）。基线 `0.3.16-sharedkb`，增量回灌。
- 变更成员仅 4 个：`lib/client.js`、`lib/index.js`、`package.json`（bump）、`RELEASE-NOTES.md`；
  其余 191 个成员逐字节不变（`server.py` 本版未动）。
- 详细口径 / 断言 / 部署状态：[`releases/0.3.17-sharedkb/CHECKSUMS.md`](../releases/0.3.17-sharedkb/CHECKSUMS.md)。
- 构建：`build/build_rel0317.py` + `build/build_portable_0317.py`（载荷输入
  `build/live_client_0317.js` / `build/live_index_0317.js` 已入库）。
