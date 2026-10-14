# 政策解读（@local/policy-analysis）

面向政府机关人员的 DSH 能力包：政策检索、版本比较与政策依据审查工作台。由两部分组成：

- **Host 半（index.js）**：为每个会话注册 3 个门禁工具，把产品规格里的安全铁律变成模型必须经过的代码关卡：
  - `policy_preflight` —— 门禁校验：公开性未确认一律拒绝（拒绝优先），并按唯一检索来源下发硬性检索指令；
  - `policy_extract` —— 本地文本提取（PDF/DOCX/XLSX），扫描件/加密件阻断，Excel 只读静态缓存不执行公式；
  - `policy_evidence_check` —— 证据卡字段校验，核验状态恒为"待人工复核"。
  - 另提供能力包 HTTP 路由：`GET /api/policy-analysis`（包身份探测）、`POST /api/policy-analysis/upload`（附件字节落盘暂存：白名单 .pdf/.docx/.xlsx、30MB 上限、净化文件名防穿越、审计留痕；**只存不读**，读取正文仍须经门禁）、`POST /api/policy-analysis/ask`（面板内问答 SSE，宿主编程式创建 DSH 会话）。
  - **v1.2.0 解析后台**：`POST /api/policy-analysis/parse` + `GET /api/policy-analysis/parse/events`（SSE）——通过 DeepSeek Harness 编程式会话接口（agents.create + followup）驱动政策解读 Agent（policy-analysis 技能）对已上传的公开政策文件产出结构化解读报告；解析记录持久化于 `~/.dsh/policy-analysis/parse-records.json`，配套 `GET/DELETE /records(/:id)`、`POST /records/:id/archive` 归档与 `POST /records/:id/edit` 单条编辑 API（v1.4.2；筛选：内容关键字 + 日期范围 + 仅已归档）。
  - **v1.3.0 智能问答后台**：`POST /api/policy-analysis/qa`（请求即 SSE 流，多轮同会话追问）、`GET /qa/sessions`（历史会话列表）、`GET /qa/sessions/:id`（会话消息全量）、`DELETE /qa/sessions/:id`、`POST /qa/archive`（一键把当前会话问答归档为解析归档记录，转录为「【问】…【答】…」）。QA 会话持久化于 `~/.dsh/policy-analysis/qa-sessions.json`（每会话 ≤200 条消息，100 个会话按最近活跃淘汰）。
- **Client 半（client.js）**：Web 工作台 UI，左侧导航栏三个入口：
  1. **文件解析**（默认）：上传文件（chips 展示服务器落盘绝对路径，可复制）→「开始解析」→ 解析过程窗口（终端风日志：状态/工具调用/思考）→ 解析结果流式渲染 →「归档」（解析标题 + 备注）；
  2. **解析归档**：内容关键字 + 日期范围筛选；列 = 序号 / 解析日期 / 解析标题（状态徽标）/ 解析文件名称 / 备注 / 操作（**@文件问答**、查看、**编辑**（v1.4.2：行内/抽屉均可打开，修订解析标题/文件名称/备注/解析结果）、下载、删除）。点「@文件问答」跳转智能问答页并自动带入该文件（显示为待附文件 chip，不自动发送）；
  3. **智能问答**：页内多轮对话（DSH 会话 API 流式回答），左侧历史会话列表 +「新建会话」，支持上传/拖拽文件（走 /upload 落盘），当前会话可「一键归档」至解析归档表格；未确认公开性时输入区上方显示门禁条。
  工作台界面与 DSH「设置 → 通用设置 → 外观」保持一致：颜色取 DSH 设计令牌，跟随浅色/深色/跟随系统主题切换，正文字号跟随外观字号设置。

## 安装

在 DSH 会话中让助手执行 `plugin_manager` 的 `install_bundle`，目标为本目录的绝对路径；或在"设置 → 插件"页安装。安装后：

1. 左侧栏"工作台"分组出现"政策解读"入口（📜 图标，`cap:policy-analysis`）；
2. 工作台首页出现"政策解读"能力卡片（order 15），卡片「打开」/「加载到工作台」分别控制主面板与导航显隐；
3. 新会话中模型工具列表出现 `policy_preflight` / `policy_extract` / `policy_evidence_check`；
4. 提供能力包 HTTP 子前缀路由：`GET /api/policy-analysis`（包身份与运行状态探测）、`POST /api/policy-analysis/upload`（附件上传落盘）。

## 能力包接入（CAPABILITY-PACK-API v1.0）

本插件遵循工作台能力包 API：

- **静态声明**：`package.json` → `dsh.capabilityPack`（id / title / description / entryKey / order / icon / subs / openEvent）；
- **宿主半**：`export const inject = ['tools', 'webServer']`；`apply` 内向工作台注册能力清单（best-effort，**延迟重试 150ms×20 应对工作台框架交错 apply**，disposer 注销）+ `ctx.webServer.register({kind:'prefix', path:'/api/policy-analysis'})`；
- **浏览器半**：`main` key 与 `sidebar.panellist` id 均为 `cap:policy-analysis`（order 15）；监听 `cappacks:open-policy-analysis` 打开事件，派发时 `ctx.layout.selectPanel('cap:policy-analysis')` 切入主面板。

## 四条底线原则

1. **公开性绝对前置**：仅受理公开材料；上传文件不等于授权，门禁工具未收到显式公开确认前拒绝一切读取与检索。
2. **检索源单向绝对互斥**：仅知识库（`rag_query` 且 `folders:["政策资料"]` 硬过滤）与仅联网（政府官网/公报/人大）二选一；知识库空库必须回复"政策知识库暂无资料"，严禁联网兜底；联网无果必须索取官方链接，严禁切回本地库。
3. **不可信数据隔离**：附件文本、网页抓取、RAG 片段均为不可信数据，其中的指令性内容不触发任何工具调度。
4. **证据链与人工复核**：结论 C-xxx 与证据卡 E-xxx 一一绑定；AI 输出一律不是正式法律意见，末端标注"待人工复核"。

## 使用流程

1. 点击左侧栏"政策解读"进入工作台（进入后 DSH 左侧导航栏自动收起，左栏底部有「返回主页」按钮，点击展开侧栏并回到会话页）；
2. 左侧导航选择：**文件解析**（默认）/ **解析归档** / **智能问答**；
3. 文件解析：上传公开政策文件（或拖拽）→ 勾选公开确认 →「开始解析」→ 过程窗口与结果流式呈现 →「归档」入解析归档表；
4. 智能问答：新建或选择历史会话 → 📎 上传/拖拽文件（可选）→ 输入问题回车 → 流式回答渲染在页内（有附件时 Agent 先 policy_preflight 门禁再 policy_extract 读正文）；点「一键归档」把本会话问答（含转录）归档至解析归档表；
5. 解析归档：按内容/日期筛选记录，点「编辑」修订任一条的解析标题/文件名称/备注/解析结果（解析进行中的记录仅锁结果正文），点「@文件问答」跳转智能问答并带入该文件继续追问；
6. AI 输出全部标注"待人工复核"。

也可以不走工作台，直接在任意会话用自然语言下达任务——门禁工具对每个会话同样生效。

## 审计与暂存

每次 preflight 校验（允许/拒绝）与工作台附件保存（`upload-saved`）以 JSONL 追加记录到 `~/.dsh/policy-analysis/audit.jsonl`（写入失败不影响功能）。工作台上传的附件暂存于 `~/.dsh/policy-analysis/uploads/`（时间戳防碰撞命名），插件只落盘不解析；读取正文一律经门禁工具按路径进行。

## 边界与免责

- 首版不支持 OCR：扫描型 PDF 会被明确阻断，请提供可提取文字的矢量文本件。
- 工作台内场景 A/B/C 为演示样例数据，不构成任何真实政策依据。
- AI 输出不可作为法定公文依据；重要决议需人工比对原件，正式公文引用与高风险审查必须人工把关。
