# dsh-raganything-kb 0.3.13-sharedkb 发布说明

> 多用户网关线（8.6）。相对 0.3.12-sharedkb 的唯一代码差异：修复「@ 共享文件 / 文件夹
> 限定范围问答返回『没有检索到与该问题相关的内容』」。完整校验口径、md5/sha256、部署状态见
> [`../releases/0.3.13-sharedkb/CHECKSUMS.md`](../releases/0.3.13-sharedkb/CHECKSUMS.md)。

## 根因（两层）

| 层 | 问题 |
| --- | --- |
| ① 前缀不对称 | 共享 chunk 的 `file_path` 带 `共享/` 前缀，前端 `@` scope 不带；旧 `_in_scope` 只剥 `全部文档/` |
| ② 作用域检索跑在用户实例本地（系统性主因） | 用户实例 `rag` 只持私有库（0 个 `共享/` chunk），共享库本体在宿主 sidecar（17321）；`@` 限定范围被路由到用户实例本地跑，永远查不到共享库 |

全库检索（不加 @）正常，是因为它走 `rag.aquery`（宿主可达）——唯独 `@` 范围被留在本地。

## 修复

- **修复①**：`_VROOT_PREFIXES` 加 `"共享/"`，`_in_scope` 对 chunk 与 scope 两端对称剥虚拟根。
- **修复②（host-aware）**：`_route_scope_query` 在**宿主实例**（`_shared_is_local()` 为 True）直接本地检索；
  **用户实例**把命中共享文件夹的作用域转发宿主 sidecar（`SHARED_BASE`/17321）检索，私有部分仍本地检索并合并
  （带【共享知识库】/【私有知识库】标签）。单文件同时正确服务宿主与用户实例，不会转发自环。

0.3.12 的 artcontent 修复（`GET /documents/{art-*}/content` 不再 404）原样保留。

## 验证（线上）

8.6 多用户网关 admin 实例 `@ 01-算力一部/灵拓·Tokens Store Token聚合服务平台0819.pptx`
由 hits=0 变为 **hits=18**，回答正常，不再出现「没有检索到与该问题相关的内容」。

## 发布件

| 文件 | MD5 | SIZE |
| --- | --- | --- |
| `dsh-raganything-kb-0.3.13-sharedkb.tgz` | `37fec124b41996b5b5c4ca522f2ae7a6` | 5 384 086 B |
| `dsh-raganything-kb-0.3.13-sharedkb-portable.tar.gz` | `bc1178477c0fac5405277d7bdfda1e43` | 10 800 099 B |

构建器：`build/build_rel0313.py`、`build/build_portable_0313.py`（均确定性打包，同输入同 md5）。

## 部署

代码侧：本版 `server.py` 与 8.6 线上热修副本等价（已实测），发布件正确。
部署侧：12 份 profile 依赖仍指向 0.3.12-sharedkb，尚未切换到 0.3.13。
建议用 `build/deploy_profiles_0313.py`（外科手术式依赖同步，默认 dry-run，`--apply` 落盘，幂等）切换，
之后宿主 `systemctl restart raganything-sidecar`、用户实例 `POST :3200N/models/restart`。
