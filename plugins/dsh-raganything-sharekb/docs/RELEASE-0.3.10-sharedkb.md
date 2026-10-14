# 版本汇总：dsh-raganything-kb @ 192.168.8.6:3082（live = 0.3.10-sharedkb）

> 汇总时间：2026-09-15（CST）
> 汇总对象：生产网关 `https://192.168.8.6:3082` 当前在跑的 DSH 知识库插件
> 对应 GitHub 分支：`release/0.3.10-sharedkb`（本分支同时含 0.4.0-sharedkb.1 开发线源码 + 本 0.3.10 tarball 资产，见文末"完整性"）

---

## 1. 版本标识

| 项 | 值 |
|---|---|
| 插件名 | `dsh-raganything-kb`（RAG-Anything 多模态知识库，用于 DeepSeek Harness） |
| **在跑版本** | **0.3.10**（npm `version` 字段） |
| 构建标签 | `0.3.10-sharedkb`（便携 tarball 后缀） |
| tarball 路径（8.6） | `/home/lgsj/dsh-raganything-kb-0.3.10-sharedkb.tgz` |
| 构建时间 | 2026-09-14 17:33（CST） |
| 文件大小 | 5,484,980 字节（≈5.48 MB） |
| **MD5** | `49884110d433460a5286c890e4a1ac3b` |
| 部署目录 | `/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb` |

> 归档资产见 `releases/0.3.10-sharedkb/dsh-raganything-kb-0.3.10-sharedkb.tgz`（已 `git add -f`，本地 MD5 与线上一致）。

---

## 2. 部署拓扑（8.6:3082）

| 层 | 地址 / 单元 | 说明 |
|---|---|---|
| 公网/内网入口 | `https://192.168.8.6:3082`、`https://10.18.100.4:3082`（TLS） | nginx `sites-enabled/dsh-web`，TLS 终结（server.crt/key） |
| HTTP→HTTPS | `:3081` → 302 → `:3082` | 明文入口重定向 |
| 反向代理 | nginx → `127.0.0.1:3090` | dsh-multi-user 网关（按会话 cookie 判身份） |
| 宿主 dsh-web | `127.0.0.1:3080`（loopback） | `pnpm dsh web --host 127.0.0.1 --port 3080`；systemd `dsh-web.service` |
| 宿主 RAG sidecar | `127.0.0.1:17321` | `raganything-sidecar.service`，**持有共享 KB 本体** |
| 各用户 sidecar | `32000 + slot` | xiongsirui(0)→32000、admin(1)→32001、mason(2)→32002、chenning(3)→32003 |
| 各用户 web 端口 | `31000 + 启动顺序`（非 slot） | 以 `supervisor` 的 `record.port` 为准 |
| 旧直连配置 | `dsh-proxy.conf` / `dsh-proxy.service` | **已停用（inactive/dead）**，原 `/rag/→17321` 直连是串号根因，见 §5 |

**服务状态（2026-09-15 核实）**

| 单元 | 状态 | 备注 |
|---|---|---|
| `dsh-web.service` | active (running) | PID 1110259，启动 2026-09-14 22:42:31 CST |
| `raganything-sidecar.service` | active (running) | 宿主 sidecar，端口 17321 |
| `nginx.service` | active (running) | 当前生效网关（`sites-enabled/dsh-web`） |
| `dsh-proxy.service` | inactive (dead) | 旧独立 nginx 配置，已弃用 |

---

## 3. 多用户与共享知识库

- **账号（4，均 `homeMode=managed`）**：`admin`(slot 1)、`mason`(slot 2)、`chenning`(slot 3)、`xiongsirui`(slot 0)。
- **共享 KB**：宿主 sidecar 17321 持本体，manifest `~/.dsh/raganything/shared_kb.json`；现网唯一文件夹 **`01-算力一部`**（成员：admin / mason / minson / test3）。用户实例只**转发** `/shared/*`，共享逻辑只改宿主一处。
- **隔离模型**：每账号实例 `~/.dsh/multi-user/users/<账号>/home/raganything/config.json`；用户实例懒加载，`ensureRunning()` 健康优先自动收养（冷启动首次 >60s，二次 ≈13–20s）。

---

## 4. 功能集（0.3.10-sharedkb 相对前版增量）

| 能力 | 状态 |
|---|---|
| 共享知识库（文件夹/成员/权限） | ✅ 含（共享 KB 本体在宿主 sidecar 17321） |
| 回收箱权限（admin 回收箱） | ✅ 含 |
| OFV viewer 挂载（`/viewer`，需 `ofv.bundle.js` 等资产） | ✅ 含（目录缺失则静默不挂载） |
| 多用户隔离 / 绑定补丁 | ✅ 含（§5 所述 nginx 修复） |
| 重复上传提示简化 | ✅ 5 选项 `prompt` → 单项 `confirm`；服务端 `on_duplicate=overwrite` |

---

## 5. 个人知识库隔离修复（关键）

**根因**：旧 `dsh-proxy.conf` 把 `location /rag/` 直连宿主 sidecar `127.0.0.1:17321`。登录后跳转是 `/`，插件 `ragBaseUrl()` 匹配不到 `/mu/<账号>` 前缀，退化为 `${origin}/rag` → 全部账号读写同一宿主库（串号）。

**现网修复**（已在 `sites-enabled/dsh-web` + 包含的 `dsh-rag-proxy.conf` 生效）：
- `location /rag/` → `proxy_pass http://127.0.0.1:3090/mu/rag/;`（交给多用户网关按会话 cookie 判身份）。
- `location ~ ^/mu/[^/]+/rag/?(.*)$` → rewrite 到 `/mu/rag/$1` 后 `proxy_pass 3090`。
- 旧 `dsh-proxy.conf`（`/rag/→17321` 直连）随 `dsh-proxy.service` 停用。

> ⚠️ 测试纪律：必须按前端真实路径 `/rag/*` 测；`/mu/rag/*` 与 `/rag/*` 链路不同，用前者会得假 PASS。

---

## 6. 模型与推理后端

| 角色 | 模型 | 备注 |
|---|---|---|
| KB 索引/抽取 | `qwen3.6:35b-chat` | 由 27B 切到 35B（2026-09-15），入库 85s→35s；受 `lightrag.index_llm_model` 控制（优先级压过 `llm.model`） |
| embedding | `bge-m3` | 不动 |
| 多模态/vision | `qwen3.8:27b` | 不动 |
| Ollama 后端 | Docker `ollama-host` → `http://127.0.0.1:11434/v1` | ROCm iGPU |

**出网**：整机无公网出口、DNS 全死；唯一出口 = 反向隧道 HTTP 代理 `127.0.0.1:11808`（出口 IP 162.128.70.187）。

---

## 7. 与源码仓库的关系 / 完整性

- **GitHub 仓库**：`github.com/imasonhk-spec/dsh-raganything-kb`（私有）。
- **本分支 `release/0.3.10-sharedkb` 同时交付两份**：
  1. **开发线源码（0.4.0-sharedkb.1）**：当前 `feature/shared-kb` 的 HEAD 加上未提交的 `src/lib/client.js`、`src/sidecar/server.py` 改动——补齐完整性后提交，避免开发进度丢失。
  2. **生产 tarball 资产**：`releases/0.3.10-sharedkb/dsh-raganything-kb-0.3.10-sharedkb.tgz`，即 8.6:3082 在跑的冻结版，MD5 已校验一致。
- **注意**：`0.3.10-sharedkb`（线上冻结版）与 `0.4.0-sharedkb.1`（仓库开发线）不是同一版；开发线包含 0.3.10 全部能力且更新。本分支把二者并列归档，便于回溯线上状态。
- tarball 被根 `.gitignore` 的 `*.tgz` 忽略，已用 `git add -f` 强制纳入；`.gitattributes` 将 `*.tgz` 标为 binary（仅影响换行，无碍）。

---

## 8. 快速核对清单（回滚/验收用）

- [ ] `https://192.168.8.6:3082/mu/login` → 200
- [ ] 匿名 `GET /` → 401
- [ ] `nginx -t` 通过（注意：非 root 跑会报 server.key 权限拒绝，是误报；需用 `sudo`）
- [ ] 各账号 `/rag/documents` 仅见自己的库（无串号）
- [ ] 共享文件夹 `01-算力一部` 成员可见一致
- [ ] tarball MD5 = `49884110d433460a5286c890e4a1ac3b`
