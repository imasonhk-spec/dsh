# 开发环境指南

目标：在本仓里改 harness / 插件源码，本地起服务调试，并把改动回灌。

## 初始化（开发模式）

```bash
git clone <本仓 URL> dsh && cd dsh
cp .env.example .env && vim .env      # 填好，但开发模式不强制 TLS/证书齐全
sudo ./deploy/deploy.sh --dev         # 装依赖 + 链接插件 + 建 venv + 渲染配置
                                   #   （不接管 systemd，只准备好一切）
```

`--dev` 完成后打印手动运行命令，例如：

```bash
cd /home/lgsj/deepseek-harness.dsh-v0.1.5-rc.1
pnpm dsh web --host 0.0.0.0 --port 3080 --trusted-host 192.168.8.6:3082
```

## 改源码如何生效

- **harness/` 与 `plugins/*/` 是源码**：pnpm 以 tsx 直接跑 TS，多数改动**重跑 `pnpm dsh web` 即生效**，无需 rebuild。
- 涉及原生编译（native/）或 `tsconfig` 产物时，才需 `pnpm run build:lib`。
- 插件改动：deploy 把插件 `cp` 到 `$DSH_HOME/profiles/web/node_modules/<名>`。改 `plugins/<名>` 后重跑 `sudo ./deploy/deploy.sh --dev`（会重新复制）或手动再 `cp`。

## 提交改动

本仓 vendoring 了三个部分，回灌各自上游：

1. **harness 补丁**：`harness/` 内的 3 个补丁同时提交到本仓。若要同步到 harness 的正式 fork 远端，单独 `git diff` 这 3 个文件提 PR。
2. **插件**：`plugins/dsh-raganything-kb` 与 `plugins/dsh-multi-user` 是各自私有仓（`imasonhk-spec/dsh-raganything-kb`、`imasonhk-spec/dsh-multi-user`）的快照。改完插件后，把对应目录 `git add -A` 同步推回原私有仓（注意保留 `dist/`/`releases/` 的 gitignore 规则）。
3. **部署工具**：`deploy/` 与 `.env.example` 直接在本仓提交。

## 捕获新的 harness 生产补丁

若在生产盒（如 8.6）改了 harness 源码且验证有效，把改动 `git diff` 出来，应用到本仓 `harness/` 对应文件并提交，保持「可移植快照」与线上一致。

## 纯配置刷新

只改了 `.env` 想重渲染：`sudo ./deploy/deploy.sh --render-only`，然后 `systemctl restart dsh-web raganything-sidecar`。
