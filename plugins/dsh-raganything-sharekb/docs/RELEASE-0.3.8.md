# dsh-raganything-kb 0.3.8 — 发布说明

构建于 192.168.8.6 的 live 插件目录，相对 0.3.7 仅改动 `lib/client.js`（及随之 bump 的 `package.json` 版本号）。`server.py` / `index.js` / 打包脚本均无变化。

## 修复内容

### 1. 状态栏文档数与目录树对不上（`client.js`）
- 修复前：`RAG-Anything · 已连接 · ${docs.length} 篇文档`，`docs` 是**全部文档**（含 441 个只读 `DSH产物/` 镜像 + 5 个 `知识库产物/` 产物文档，均不在目录树中显示）。删文件后状态栏仍显示 455，与树对不上。
- 修复后：改用 `${kbDocs.length}`，`kbDocs` 是**目录树实际渲染的文档**（已排除产物前缀），与树数量一致。

### 2. 「对话产物」栏混入对话 md 记录（`client.js`）
- 修复前：栏内列出全部 `知识库产物/*` 文档，含 4 个**对话 `.md` 记录** + 1 个生成 `.pptx`。
- 修复后：循环内 `if (ext === "md") continue;` 跳过对话记录；空组被过滤；栏总数改用**实际展示的生成文件数**（`artifactGroups.reduce((n, g) => n + g.files.length, 0)`）而非 `productDocs.length`。

> 删除行为本身一直有效（`ragDeleteDoc` 会等删除任务完成）。数量不符纯属公式口径问题，不是删除 bug。

## 验证
- 构建脚本 9 步静态校验 `FAILED checks: 0`；沙箱演练安装/verify 通过（3 项预期 FAIL 来自 `--no-systemd/--no-nginx/--skip-venv` 与隔离端口）。
- 8.6 实测：状态栏 `RAG-Anything · 已连接 · 9 篇文档`；对话产物栏仅 1 个生成 PPTX，对话 md 已过滤。
