# dsh-workbench

DSH 工作台插件（包名 `@local/dsh-workbench`）。源码 = 8.6 宿主 live 副本快照（2026-09-28，`~/01-DSH/04-工作台/workbench-bundle`）。部署：宿主 profile + admin 账号（两份副本 tar 聚合 md5 一致）。

## 结构

- `client.js` — 工作台前端
- `index.js` — 服务端注册入口

## 发行件

`dist/dsh-workbench-1.1.1.tgz` —— 确定性构建（全部版本校验见 [CHECKSUMS.md](dist/CHECKSUMS.md)）。

## 版本

| 版本 | 内容 |
| --- | --- |
| 1.1.1 | `WB_FULLSCREEN_PANELS` 增补 `'cap:huiwen-ppt'` —— 进入「汇文 PPT」能力包页面时同样自动收起宿主侧栏 |
| 1.1.0 | `wbAutoCollapse-20261005`：进入能力包「全屏应用」页（知识库 / 会议助手 / 政策解读）自动把宿主侧栏收起为 56px 图标条，离开时恢复；同时移除旧的知识库 DOM 桥接（`KbWorkbenchPage` / `clickKbTrigger` / `startKbNavObserver`），`main cap:kb` 交由 RAG 插件唯一注册 |
| 1.0.0 | 首发 = 8.6 线上活副本快照（2026-09-28） |
