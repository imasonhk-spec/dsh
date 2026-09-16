# 终端用户部署指南

目标：在一台新的 Linux 盒子上跑起一套和 192.168.8.6:3082 一致的 DSH 全栈。

## 前置条件

- Linux（Ubuntu 24.04 验证），已装 **node ≥ 22.19（推荐 24）**、**pnpm**、**python3-venv**、**nginx**、**systemd**
- 一个普通用户（如 `lgsj`）作为 DSH 运行用户；部署以 **root** 执行（内部用 `sudo -u` 写用户目录）
- 能访问本 GitHub 仓库（私有仓需给目标盒 read 权限或配 PAT）
- 已准备好：TLS 证书（`/etc/ssl/dsh/server.crt` + `server.key`）、一个 OpenAI 兼容的 LLM 端点（如本机 Ollama `:11434/v1`）、bge-m3 / bge-reranker-v2-m3 的 gguf 模型文件

## 步骤

```bash
# 1) 拉取（私有仓：用有读权限的账号/PAT）
git clone <本仓 URL> dsh && cd dsh

# 2) 填配置
cp .env.example .env
vim .env            # 至少改：DSH_USER / DSH_HOST_IP / HARNESS_DIR / DSH_HOME /
                   #           DSH_WEB_TOKEN(用 `openssl rand -hex 24` 生成) /
                   #           RAG_* 模型端点与 gguf 路径 / SSL_* 证书路径
                   # 无 DNS 的盒子另填 DEPLOY_HTTP_PROXY

# 3) 一键部署（root 执行）
sudo ./deploy/deploy.sh

# 4) 验证
systemctl is-active dsh-web raganything-sidecar nginx
curl -sk https://localhost:3082/ | head
# 浏览器打开 https://<DSH_HOST_IP>:3082/
```

`deploy.sh` 会依次：预检 → `pnpm install` 装 harness 依赖 → 复制两个插件到 profile `node_modules` → 建 RAG venv 并装依赖 → 渲染全部 systemd/nginx/sidecar 模板 → 起服务。

## 排错

| 现象 | 原因 / 处理 |
|------|------|
| `pnpm install` 卡 ~70s 后失败 | 盒子无 DNS。在 `.env` 设 `DEPLOY_HTTP_PROXY` 后重跑 |
| dsh-web 起不来，日志 `EADDRINUSE` | 3080/3090 被占用（旧进程/孤儿）。`systemctl stop dsh-web` 后查 `ss -tlnp` 清理 |
| nginx 启动失败 | `nginx -t` 看是否证书路径不对或 3082 被占 |
| 知识库面板「未连接」 | sidecar venv 没装好或 `config.json` 的 gguf 路径不存在；看 `/home/<用户>/.dsh/raganything/logs/sidecar.log` |
| 用户读到别人的库 | 隔离被破坏。确认 `20-rag-loopback.conf` 已安装（RAG_SIDECAR_HOST=127.0.0.1）且 nginx 未把 `/rag/` 直连 17321 |
| 想只刷新配置不改依赖 | `sudo ./deploy/deploy.sh --render-only`；改完 `.env` 后 `systemctl restart dsh-web` |

## 加用户

多用户网关建好后，在 Web 面板注册账号即可；每个账号首次访问知识库时其 sidecar 懒加载（>60s 属正常）。
