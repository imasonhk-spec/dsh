# dsh-raganything-kb 0.3.10 — 发布说明

构建于 192.168.8.6 的 live 插件目录，相对 0.3.9 改动 `server.py` + `lib/client.js`
（及随之 bump 的 `package.json` 版本号）。本版聚焦两件事：**多用户「选本地模型报 SSL」彻底修复**
（本地端点自适应 + 配置归一化，已全 10 实例验证），以及 **ABCD 四步加固**（防问答退化成 LightRAG 抽取原文）。

## 一、多用户「选本地模型报 SSL」彻底修复（`server.py`）

根因：DSH 模型目录（`packages/api/session-controller/src/catalog.ts` 的 `ModelProviderGroup`
只有 `{id,name,models}`）**刻意不含 `base_url`**，面板 `/models/select` 只改模型名、不带回端点 →
本地模型仍指向 `https://tokens.store/v1`。在 8.6 断网（奇安信 QAXNAC 管控网）环境下该域名被 MITM，
于是报 `CERTIFICATE_VERIFY_FAILED`。

修复（10 份 `server.py` 逐份打补丁，md5 统一 `47a3031a1b1724e8`）：

- 新增 `_resolve_base_url` / `_local_ollama_models` / `_heal_local_model_endpoint`：
  `/models/select` 的 llm、vision 分支在缺 `base_url` 时，按「显式 > custom_models > 本机 Ollama」
  顺序补端点；空 key + loopback 补占位；索引分支走本机端点；`startup` 自愈。
- 10 份 `config.json` 归一化为 `http://127.0.0.1:11434/v1` + `qwen3.6:35b`/`qwen3.8:27b`，
  `index_llm` 同步 + 登记 `custom_models`。
- 顺带修 `/models/restart` 端口释放竞态：注入 `RAG_RESTART_DELAY_S=4` + `__main__` 先 sleep 再
  `uvicorn.run`，避免新旧进程 `EADDRINUSE` 同亡（该竞态曾把 test3 实例整没）。

验证：test3 由 `status=error`+SSL → `done/error=null`；复刻面板 payload（无 base_url）后 base_url 不回退；
`/models/restart` 不再 `EADDRINUSE`；宿主问「ZeroClaw 用什么语言写的」得 `Rust`（内容可核对）；
全新账号 test02/mason 端点本机且 SSL 残留 False；test3 入库重试队列解封、`failed` 停止增长。

## 二、ABCD 四步加固（`server.py` + `client.js`）

| 步 | 内容 | 落点 |
| --- | --- | --- |
| A | 问答模型切到 `qwen3.6:35b-chat`（给 `qwen3.6:35b` 永久补 ChatML 模板，复用 layer，1506 字） | 10 份 `config.json` |
| B | 给 `qwen3.6:35b` tag 永久补 ChatML 模板（`/tmp/Modelfile.fix86`，回滚 `Modelfile.rollback86`） | Ollama |
| C | 插件加固 0.3.8→0.3.10，8 处函数级改动（见下） | `server.py` + `client.js` |
| D | 删除 2 篇被抽取原文污染的「知识库产物」文档，全库扫描 `<|#|>`/`<|COMPLETE|>` 残留 0 命中 | 数据 |

### C 步 8 处改动

1. S1 空 `api_key` 不再发非法 `Bearer ` 头（`if api_key:` 守卫）。
2. S2 `_looks_like_extraction(text)` + `_ANTI_EXTRACTION_NUDGE`：检测答案退化成 `entity/relation<|#|>...<|COMPLETE|>`。
3. S3 scoped 退化重试（检测到抽取格式时带纠正提示重试一次）。
4. S4/S5 响应增加 `degraded` 字段（bool）。
5. S6 `client.js` 新增 `isDegenerateAnswer()`。
6. S7 退化答案**不**写「知识库产物」（切断污染再入库链路）。
7. S8 `ragAskLive` 透传 `degraded` 给前端。

验证：Py 单测 9/9、JS 单测 5/5 全绿；运行时假 LLM 决定性通过（recover→重试回正常 54 字/`degraded=False`；
always→`degraded=True` 且不再污染入库）。

## 三、产物

- `dist/dsh-raganything-kb-0.3.10.tgz`（md5 `bec3ebcd7beb9cf4acaaf8a26ad4f088`，215331 B，确定性打包）。
- 已就地分发到 8.6 多用户网关 10 份副本（server.py `15aa2d29…` / client.js `64fe4284…`）。

## 四、升级提示

`install.sh` 幂等，升级直接重跑（自行备份旧版到 `~/.dsh/raganything/backup-portable-<时间戳>/`），
不要先卸载。多用户网关下每个账号 home 里的插件副本需另行传播（见 `build/apply_norm_fix.py` 等）。

> 注：8.6 出网（QAXNAC 拦截）本身未修，选云端模型现为 404；需出网恢复后**显式带 base_url** 才能用云端模型。
