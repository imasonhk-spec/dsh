# 架构说明

## 进程 / 端口拓扑

```
                        ┌─────────────────────────────────────────────┐
   浏览器 ──HTTPS──▶    │  nginx  :3082 (TLS)  /  :3081 (→3082 跳转)    │
                        │   • /rag/*  ──▶ 3090 多用户网关（按会话路由）  │
                        │   • /mu/<账号>/rag/* 安全改写后 ──▶ 3090       │
                        │   • / 及其它 ──▶ 3090                         │
                        └───────────────┬─────────────────────────────┘
                                        │ 127.0.0.1
                        ┌───────────────▼─────────────────────────────┐
                        │  dsh-web  (pnpm dsh web --port 3080)          │
                        │   进程同时监听 3080(loopback) + 3090(网关)     │
                        │   ├─ 宿主 DSH（loopback，nginx 反代进入）      │
                        │   └─ dsh-multi-user 网关(:3090)               │
                        │       按会话 cookie 判定身份 → 转发到该账号     │
                        │       的 RAG sidecar(32000+slot)              │
                        └───────────────┬─────────────────────────────┘
                                        │ /shared/* 转发
                        ┌───────────────▼─────────────────────────────┐
       宿主 sidecar     │  raganything-sidecar  :17321 (loopback)       │
       (RAG-Anything)   │   Python venv：lightrag + mineru + llama_cpp  │
                        │   持有共享库本体；用户实例只转发 /shared/*      │
                        └──────────────────────────────────────────────┘
       用户 sidecar（懒加载）：32001, 32002, …（每个账号一个，冷启动首次>60s）
```

## 隔离设计（红线）

1. **sidecar 收回 loopback**：`RAG_SIDECAR_HOST=127.0.0.1`（dsh-web drop-in 设置，用户实例继承）。原默认 `0.0.0.0` 且无 token，同网段任意主机可直连 17321/32xxx 读别人库——隔离完全绕过。
2. **nginx 不直接连宿主 sidecar**：`/rag/*` 一律交给 3090 网关，由网关按会话判定身份再转发到该账号自己的 sidecar 端口；禁止把 `/rag/` 直连 17321。
3. **Host 围栏**：dsh-web 仅 `--trusted-host` 放行 nginx 入口端口，避免 Host 伪造绕过鉴权。会话 Cookie 名 `dsh_mu_session`。

## 必须的 harness 补丁（已随 fork 纳入）

| 文件 | 作用 |
|------|------|
| `packages/client/connection/src/loopback-hostname.ts` | 入口 Host 白名单 |
| `packages/llm/llm-deepseek/src/serialize.ts` | DeepSeek 工具调用序列化修复 |
| `packages/llm/llm-pi-ai/src/context.ts` | pi-ai provider 上下文拼接修复 |

不带这 3 个补丁，其他盒子部署出来行为与 8.6 不一致。

## 已知部署约束（其他盒子需留意）

- **无公网 DNS 的盒子**：`pnpm install` / `pip install` 需要能连 registry。若盒子整机 DNS 不可用，在 `.env` 设 `DEPLOY_HTTP_PROXY`（如本地反向隧道 `http://127.0.0.1:11808`），deploy 会自动注入到 pnpm/pip/systemd。
- **RAG venv 很重**：lightrag + mineru + llama_cpp + gradio，需下载数百 MB；无 N 卡盒子用 `sidecar-requirements.nocuda.txt`（默认）。
- **DSH_WEB_TOKEN**：nginx 用它做「首次访问自动带 token 跳转」；生产请 `openssl rand -hex 24` 重新生成，不要沿用示例值。
- **dsh-memory-evolve**：市场插件，不在本仓；需在 Web 面板「插件」里安装才能启用记忆进化页签。
