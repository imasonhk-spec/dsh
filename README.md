# DSH 全栈部署仓库（DSH + 知识库 + 多用户）

把一套生产可用的 **DeepSeek Harness (DSH) + 共享知识库 + 多用户网关 + 8.6 全套自研插件**（共 9 个，见 [plugins/README.md](plugins/README.md)）整栈源码与部署工具打包在此，供其他盒子 `git clone` 后**一键拉起**。

> 本仓库是 192.168.8.6:3082 生产部署的「可移植快照」。harness 是我们基于 `@deepseek-ai/dsh-root` v0.1.5-rc.1 的 **fork**，含 3 个未提交的生产补丁（见下方说明），已随源码一并纳入。

---

## 两类用户速查

| 用户 | 目标 | 流程 | 入口 |
|------|------|------|------|
| **终端用户** | 在其他盒子上跑起一套和 8.6 一样的 DSH | `git clone` → 填 `.env` → `sudo ./deploy/deploy.sh` | [docs/end-user.md](docs/end-user.md) |
| **开发环境** | 改 harness / 插件源码并本地调试 | `git clone` → `./deploy/deploy.sh --dev` → 手动 `pnpm dsh web`；改完重跑 | [docs/dev.md](docs/dev.md) |

---

## 仓库布局

```
dsh/
├── harness/                 # DSH 宿主程序 fork 源码（@deepseek-ai/dsh-root v0.1.5-rc.1）
│                             #   含 3 个生产补丁：loopback-hostname.ts / serialize.ts / context.ts
├── plugins/                 # 8.6 生产机的完整插件集（详见 plugins/README.md）
│   ├── dsh-raganything-sharekb/  # 共享知识库（RAG sidecar + 面板）★ 8.6 在用线
│   ├── dsh-multi-user/           # 多用户网关（登录门禁 + 每用户独立空间）
│   ├── dsh-workbench/            # 工作台（导航 / 全屏面板托管）
│   ├── dsh-meetai/               # 会议助手
│   ├── dsh-policy-analysis/      # 政策解读
│   ├── dsh-huiwen-ppt/           # 汇文 PPT（模板驱动 PPT 生产）
│   ├── dsh-bot-shell/            # Bot 对话外壳
│   ├── dsh-memory-evolve/        # 分层记忆 + 自我进化
│   ├── dsh-workbench-bot/        # 工作台 Bot 入口
│   └── dsh-raganything-kb/       # 早期单机线快照（非 8.6 载荷，保留）
├── deploy/
│   ├── deploy.sh            # 一键部署编排（终端用户 / 开发 双模式）
│   ├── config-templates/    # 所有 systemd / nginx / sidecar / settings 模板（{{VAR}} 占位）
│   │   ├── sidecar-requirements.txt         # RAG venv 完整依赖（含 CUDA）
│   │   └── sidecar-requirements.nocuda.txt   # 无 N 卡盒子默认用这份
│   └── scripts/             # setup-sidecar.sh / render-config.sh 辅助脚本
├── docs/
│   ├── end-user.md          # 终端用户部署指南
│   ├── dev.md               # 开发环境指南
│   └── architecture.md      # 拓扑 / 端口 / 隔离设计 / 补丁说明
├── .env.example             # 所有可配置项（复制为 .env 填写）
└── .gitignore               # 已排除 node_modules / 密钥 / 用户数据
```

---

## 安全边界（重要）

本仓库**只包含源码、配置模板与部署工具**，以下生产敏感内容**绝不入库**（已被 `.gitignore` 忽略，且未随 vendoring 带入）：

- 密钥：`.credentials.yaml`、`sessions/`、`storages/`、`DSH_WEB_TOKEN`、各 `apiKey`
- 用户数据：`raganything/` 下的知识库内容、12 份 profile 数据、真实账号

部署时所有密钥/路径通过 **`.env`**（本地、不提交）注入模板生成，目标盒上彼此隔离。

---

## 3 个必须随 fork 携带的 harness 补丁

| 文件 | 作用 |
|------|------|
| `packages/client/connection/src/loopback-hostname.ts` | 入口 Host 白名单：仅放行 loopback 与 `--trusted-host` 配置的入口 IP，防止 Host 围栏绕过 |
| `packages/llm/llm-deepseek/src/serialize.ts` | DeepSeek 工具调用请求的序列化修复 |
| `packages/llm/llm-pi-ai/src/context.ts` | pi-ai provider 上下文拼接修复 |

> 不带这 3 个补丁，其他盒子部署出来行为与 8.6 不一致（入口校验、工具调用会出问题）。

详见 [docs/architecture.md](docs/architecture.md)。
