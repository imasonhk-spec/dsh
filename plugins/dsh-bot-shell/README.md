# dsh-bot-shell

DSH Bot 对话外壳（包名 `dsh-bot-shell`）。把独立的 Bot 实例（DS Bot 原生界面 + 领域 Bot）同源挂到 `/bot`，并在 DSH 主界面提供悬浮窗 / 融入态双向切换与归档入口。

源码 = 8.6 宿主 live 副本快照（2026-10-14，`~/.dsh/profiles/web/node_modules/dsh-bot-shell`）。

## 结构

- `lib/index.js` — 宿主半：在 host web server 注册 `/bot` 同源挂载 + 反代到独立 Bot 实例
- `lib/client.js` — 客户端半：左侧导航「Bot对话」+ 融入态落点 + 右下悬浮窗（纯 React.createElement）
- `cordis.patch.yml` — bundle patch：插入 `bot-shell` host row（ownerHome 自门控）
- `package.json` — `dsh.bundle.patch` + `dsh.client.inject`

## 发行件

`dist/dsh-bot-shell-0.1.3.tgz` —— 确定性构建（校验见 [CHECKSUMS.md](dist/CHECKSUMS.md)）。

## 版本

| 版本 | 内容 |
| --- | --- |
| 0.1.3 | 首发 = 8.6 线上活副本快照（2026-10-14） |
