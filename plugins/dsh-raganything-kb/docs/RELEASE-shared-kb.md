# Release 0.4.0-sharedkb.1 — 共享知识库（feature/shared-kb 分支）

> **分支定位**：本分支对应 **192.168.8.6 多用户网关的线上分叉线**
> （0.3.7 基准 + `MU_NS` 命名空间补丁 + 本轮共享知识库增强），
> **不是** main（0.3.10）的超集，请勿直接互相合并。

## 新增功能

1. **成员管理只列有效用户**
   - `/shared/*` 的用户清单改为读 `~/.dsh/multi-user/users.json`（`status=active`），
     已删除账号不再出现在成员选择列表（目录里残留的 home 不影响）。
   - tree 响应新增 `is_admin` 字段（users.json `role=admin` 或宿主账号）。

2. **文件夹 / 文件「更多操作」菜单**
   - 文件夹：@文件夹、成员管理、新建文件夹、上传文件、上传文件夹、下载(zip)、重命名、删除共享文件夹；
     非管理者显示「创建者」提示替代管理项。
   - 文件：@文件、重命名、下载、打开预览、删除共享文件。
   - 嵌套文件夹名（含 `/`）走 body/query 变体路由：
     `PUT /shared/folders`（body）、`DELETE /shared/folders?name=`（query）。

3. **回收箱（admin 专属）**
   - 删除共享文件夹/文件进入 `shared_kb.json` 的 trash；tree 排除已删 doc_ids。
   - 新端点：`GET /shared/trash`、`POST /shared/trash/restore`、`DELETE /shared/trash/{id}`、
     `GET /shared/download`（整夹 zip）；非管理员一律 403。
   - 共享区头部回收箱入口仅 admin 渲染。

## 修复

- 成员弹窗保存按钮 i18n 缺键（`kb.save`）。
- 重命名/成员/删除路由对嵌套名 404 的问题（见上变体路由）。

## 验证记录（2026-09-14）

- API 冒烟 15/15 PASS（用户过滤、is_admin、403、文件/文件夹回收箱全链路、转发链路）。
- 无头浏览器 UI 验证 7/7 PASS（经 3082 网关 + admin 会话）。

## 部署注意

- 产物为本目录 `lib/client.js` + `sidecar/server.py`，逐实例覆盖后需滚动重启各 sidecar。
- 多用户主机上**用户 sidecar 的端口映射以 users.json 的 slot 字段为准**（32000+slot）；
  手动 respawn 时 env 可从在跑实例 `/proc/<pid>/environ` dump 派生，错位会导致网关串号。
- 宿主 3080 loopback 无 `/rag` 代理，UI 需经 3082（nginx TLS → 3090 网关）访问。
