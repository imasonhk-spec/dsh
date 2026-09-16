# dsh-raganything-kb

为 DeepSeek Harness 接入 [RAG-Anything](https://github.com/HKUDS/RAG-Anything)（HKUDS，基于 LightRAG 的多模态 RAG 框架）。

> 装到任意一台 DSH 后，**得到一个全新的、空的知识库**：不携带任何已上传文档/向量数据，由该服务器自己通过 `rag_ingest` / `rag_ingest_text` 积累内容。每台服务器完全独立，互不关联。

安装后 **Web 界面与当前 DSH 完全一致**：侧边栏「知识库」入口（渲染在「设置」正上方）+ 全屏知识库面板（连接状态、文档树、搜索、AI 问答、历史对话、上传、模型管理、索引管理、日志）。UI 由插件自带客户端 bundle 提供，不依赖其他服务器的任何界面改动。

插件含宿主端 + 浏览器端两部分，两种部署模式：

- **本地托管模式**（默认）：托管 Python sidecar（FastAPI 封装 RAGAnything/LightRAG），首次启动自动生成 sidecar 配置（若尚无 config.json），注册 `rag_*` 模型工具。
- **远程共享模式**：只作为客户端直连别的服务器知识库（`sidecarHost` 非本机时自动进入；不生成本地配置）。

## 工具

| 工具 | 作用 |
| --- | --- |
| `rag_status` | sidecar 健康、配置摘要（无密钥）、文档/任务计数 |
| `rag_query` | 知识库检索并生成回答（hybrid/local/global/naive/mix，长任务可 `run_in_background`） |
| `rag_ingest` | 入库本地文件：`.txt`/`.md` 直读；PDF/Office/图片走 MinerU 解析 |
| `rag_ingest_text` | 入库一段原始文本（标题作为引用来源） |
| `rag_docs` | 列出已入库文档（ID、标题、状态、分块数） |
| `rag_delete` | 按文档 ID 删除一篇文档 |

## 知识库问答生成 Word / Excel / PPT

知识库面板的 AI 问答可以直接生成真正的 Office 文件产物：

- **自动识别**：提问时明确要求「以 word/excel/ppt 格式输出」「生成 PPT」「做成表格」等，
  回答结束后 sidecar 会把回答的 markdown 转成 `.docx` / `.xlsx` / `.pptx`，
  作为文档入库到「知识库产物/<会话>/」文件夹（可点击「打开原始文件」下载，
  本地用 Office/WPS 打开，保留原始版式）；未指定格式时维持原有 `.md` 问答记录。
- **手动导出**：每条已完成的 AI 回答下方有 Word / Excel / PPT 三个导出按钮，
  随时可以把该回答导出为对应 Office 文件。
- **实现**：sidecar `POST /tasks` 新增 `ingest_office` 操作
  `{text, title?, format?}`（format 支持 docx/xlsx/pptx 及 word/excel/ppt 别名），
  转换基于 venv 内置的 python-docx / openpyxl / python-pptx；
  同一回答重复导出时 LightRAG 内容去重按成功收尾（`existing: true`），文件仍可下载。

## 安装（其他 DSH 服务器，全新独立知识库）

前提：目标服务器已安装 DSH，且 Python 3.10+ 可用。

```sh
# 1) 准备 Python 环境（本机默认 ~/.dsh/raganything/venv）
python3 -m venv ~/.dsh/raganything/venv
~/.dsh/raganything/venv/bin/pip install 'raganything[text]' fastapi 'uvicorn[standard]' 'mineru[core]' python-docx openpyxl python-pptx

# 2) 安装本插件（把 dsh-raganything-kb-<版本>.tgz 拷到目标机器）
dsh plugin --profile desktop add ./dsh-raganything-kb-0.3.4.tgz

# 3) 重启 DSH（宿主插件 + 浏览器端 UI 一起生效）
```

首次启动时，若 `~/.dsh/raganything/config.json` 不存在，插件会自动从内置模板生成一份——**embedding 默认走本地 bge-m3 GGUF（1024 维，纯本地推理，不依赖任何在线 embedding 服务）**。首次启动 sidecar 会自动补齐所需组件（自动安装 llama-cpp-python 运行时、自动下载 bge-m3 模型，完成后自动重启生效），**无需任何手动操作**。sidecar 开箱即用——**知识库为空**，`rag_docs` 显示 0 篇，开始用 `rag_ingest` / `rag_ingest_text` 积累自己的知识库即可。

> 不会覆盖已有配置：若服务器上已有 `config.json` 或已存在知识库数据，插件一律不动。
> 自动就绪仅针对本地 GGUF embedding：远程/openai 后端不触发；已有可用的运行时与模型时也直接跳过。

## 打包方法（在插件目录内）

```sh
cd dsh-raganything-kb
npm pack        # 产物即分发用的 tgz；files 已限定 lib/、sidecar/server.py、cordis.patch.yml、kb/、README.md
```

## 架构

```
DSH (Node, dsh --profile <name>)
└── dsh-raganything-kb 插件
    ├── 宿主端 (lib/index.js)
    │   ├── 首次启动：若无 config.json 则从 kb/config.json.template 生成
    │   ├── 拉起/收养 sidecar 子进程（首次工具调用时；插件 stop 时 SIGTERM）
    │   ├── 密钥桥接：启动时从 ~/.dsh/.credentials.yaml refs 读取 API key，
    │   │   仅通过 RAG_LLM_API_KEY 环境变量传入 —— 不落盘、不进日志
    │   └── rag_* 工具 ⇄ HTTP 127.0.0.1:17321 ⇄ sidecar/server.py
    │       ├── RAGAnything + LightRAG（存储 ~/.dsh/raganything/storage，全新空库）
    │       ├── LLM / 视觉：OpenAI 兼容端点（tokenstore）
    │       └── 嵌入：本地 GGUF bge-m3（1024 维，llama-cpp-python 推理；首次启动自动就绪）
    └── 浏览器端 (lib/client.js，经 dsh.client 声明自动挂载)
        ├── 注册 sidebar.footer.action 槽位（id: knowledge-base, order: 0，
        │   渲染在「设置」上方）→ 打开全屏知识库面板
        ├── 自带 locale 词典（raganything 命名空间，与官方 settings 无冲突）
        └── 面板直连 http://<host>:17321 sidecar（CORS 已放行）
```

- sidecar 独立于 DSH 生命周期：DSH 重启后健康检查直接收养已有实例，避免重复进程。
- 知识库数据完全由各服务器本地积累：`~/.dsh/raganything/storage/`（向量库 + 图谱 + 源文件），互不共享。
- 远程模式：不 spawn 任何进程，所有请求带 `Authorization: Bearer <token>`（配置了 apiToken 时）；`autoStart` 默认关闭。

## 配置（cordis.patch.yml insert 行 config）

`sidecarPort`（17321）、`sidecarHost`（`127.0.0.1`=本地托管；其他地址=远程共享）、`sidecarDir`、`sidecarConfig`、`pythonBin`、`ragHome`、`autoStart`（远程模式默认 `false`）、`startTimeoutMs`、`requestTimeoutMs`、`apiKeyEnv`（环境变量优先的密钥来源）、`credentialsFile`、`credentialsRef`（默认 `TOKENSTORE_API_KEY`）、`apiToken`（远程访问令牌）、`tokenEnv`（默认 `RAGANYTHING_API_TOKEN`，环境变量优先）。

## 知识库存储位置

- 数据：`~/.dsh/raganything/storage/`（LightRAG 持久化存储：`kv_store_*.json`、`vdb_*.json` 1024 维向量库、`graph_chunk_entity_relation.graphml` 图谱、`uploads/` 入库源文件）。
- 配置：`~/.dsh/raganything/config.json`。
- 首次运行配置模板：包内 `kb/config.json.template`（`__RAG_HOME__` 会被替换为实际 ragHome）。

## 已知取舍

- 目标机器首次用 MinerU 解析 PDF 会下载模型并推理，耗时取决于硬件；建议 `run_in_background: true`。
- embedding 默认本地 bge-m3 GGUF（1024 维，纯本地，不依赖在线服务）；首次启动自动安装
  llama-cpp-python 运行时 + 自动下载模型（源：hf-mirror；若目标机无法访问需手动配置镜像）。
- 若目标服务器无法访问 tokenstore（LLM/视觉端点），需在 `~/.dsh/raganything/config.json` 中改为可达的 OpenAI 兼容端点（embedding 已本地化，不受影响）。
- 切换 embedding 模型/维度后需保持全库一致（已入库向量维度不匹配需重新入库，参考 `rebuild_index.sh` 思路：备份 → 清空 `vdb_*.json`/`kv_store_*.json` → 重启 → 重入）。
- 浏览器端面板直连 sidecar 的 `17321` 端口（`http://<页面主机名>:17321`）。目标服务器需保证该端口可从浏览器所在机器访问（默认配置 `sidecarHost: 0.0.0.0`，防火墙放行即可）。
- UI 兼容官方 DSH 客户端：依赖 `@deepseek-ai/dsh-client-ui-primitives`、`ui-slots`、`locale`、`api-remotes`（官方 web bundle 自带，无需额外安装）。
- 若目标服务器 DSH 版本过旧（无 `sidebar.footer.action` 槽位声明），侧边栏入口不会出现，但 `rag_*` 工具不受影响。
