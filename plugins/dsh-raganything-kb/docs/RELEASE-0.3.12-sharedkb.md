# Release 0.3.12-sharedkb — 对话产物「打开原始文件」修复

> **分支定位**：本包是 **192.168.8.6 多用户网关线（sharedkb）** 的发布件，
> 基线 = 0.3.11-sharedkb。**不是** `src/`（0.4.0-sharedkb.1）的超集，请勿互相合并。
> `src/` 线的产物走「真实入库」模型（`file_path` 带 `DSH产物/`、`知识库产物/` 前缀），
> 不存在本问题，因此本补丁**不适用于 `src/` 线**。

## 现象

知识库面板里点「对话产物 → 打开原始文件」：

```
无法读取原始文件内容：RAG-Anything 无响应或该文档无内容
```

文本型产物（`.md`）能正常打开，**Word / Excel / PPT 类 office 产物必报错**。

## 根因

产物与普通文档的存储模型不同：

| 类型 | doc_id | 落库 |
| --- | --- | --- |
| 上传资料 | LightRAG 真实 doc id | 进 `full_docs` |
| **对话产物** | `art-<uuid>-<文件名>` | **只落盘、不入库** |

sidecar 里两个同族端点对 `art-` 前缀的处理**不一致**：

| 端点 | 0.3.11 | 0.3.12 |
| --- | --- | --- |
| `GET /documents/{doc_id}/file` | ✅ 已处理 `art-` | ✅ |
| `GET /documents/{doc_id}/content` | ❌ 只查 LightRAG `full_docs` → 对 `art-` **恒 404** | ✅ |

前端 `viewDoc`（`lib/client.js`）在产物非文本型时走 `/documents/{id}/content`，
`ragDocContent` 拿到 **null** 就弹出上面那句错误（只有返回 null 才弹）。

## 修复（`sidecar/server.py`，+15 行）

`document_content` 开头增加 `art-` 分支：命中则直接从磁盘读原文 ——
文本型返回正文；二进制型（`docx/xlsx/pptx/pdf/zip/png/jpg/gif/doc/xls/ppt`）返回
空 `content` + `file_path`，交给前端 `ofvUrl` 用 Open File Viewer 渲染（与 `/file` 同源）。

```python
@app.get("/documents/{doc_id}/content")
async def document_content(doc_id: str):
    """Return the original document content stored in full_docs."""
    # 2026-09-15: 仅文件产物（art- 前缀）不进 LightRAG，直接从磁盘读原文；
    # 否则 /documents/{art-}/content 恒 404，前端据此报“无法读取原始文件内容”。
    art = _artifact_by_doc_id(doc_id)
    if art is not None:
        _, _, _phys = art
        try:
            _text = _phys.read_bytes().decode("utf-8")
        except UnicodeDecodeError:
            _text = ""
        if _text == "" or _phys.suffix.lower() in (...):
            return {"doc_id": doc_id, "content": "", "file_path": str(_phys)}
        return {"doc_id": doc_id, "content": _text, "file_path": str(_phys)}
    rag = await ensure_rag()
    ...
```

## 验证记录（2026-09-15）

**修复前（复现）**

- 宿主 `.md` 产物：`/content` = 404，`/file` = 200。
- admin 实例 `.docx` 产物 `art-ac6e5489-…-210048.docx`（21:00:48 生成，即报障对象）：
  `/content` = **404**。

**修复后（走前端真实路径 `https://192.168.8.6:3082/rag/*` → 网关 → admin 实例，复用 admin 会话）**

| 请求 | 结果 |
| --- | --- |
| `GET /rag/documents/art-…docx/content` | **200**（office 型：空正文 + `file_path`） |
| `GET /rag/documents/art-…docx/file` | **200**，37318 B（真实 docx） |
| 同实例 `.md` 产物 `/content`（对照） | **200**，带真实正文 |

**生效范围**：12 份 `server.py`（宿主 + 11 用户实例）全部就地打补丁，各留备份
`.bak-artcontent-20260915-211205`；宿主 `systemctl restart raganything-sidecar`（pid 4087851），
admin 实例 `POST :32001/models/restart`（pid 4098529）。

## 产物

本版发**两个**件（sharedkb 线此前只有 `.tgz`，没有对应的可移植包）：

### 1. 插件包 `dsh-raganything-kb-0.3.12-sharedkb.tgz`

| 项 | 值 |
| --- | --- |
| 文件 | `dist/dsh-raganything-kb-0.3.12-sharedkb.tgz` |
| 大小 | 5 381 483 B |
| md5 | `d6c076e84cf89e193afcd50be5502fa1` |
| sha256 | `f9c333e46a496fecef822582f5964994eb3a1c1fb2a2f49018feee69ad8b5a8e` |

打包器 `build/build_rel0312.py`，**确定性**（固定 mtime/uid/gid、条目排序、gzip `mtime=0`，
两次构建 md5 一致）。相对 0.3.11 基线的差异仅三处，已由脚本自查断言：

1. `package/sidecar/server.py` 换成线上已验证的补丁版（301 988 → 302 744 B，与线上字节一致）；
2. `package/package.json` 版本 `0.3.11` → `0.3.12`；
3. 删除 0.3.11 包内误带的 `sidecar/server.py.scopefix-20260915-121321.bak`；
4. 新增 `package/RELEASE-NOTES.md`。

其余 187 个 `sidecar/viewer/` 资源与全部载荷文件**逐字节与 0.3.11 相同**（脚本内 md5 断言）。

### 2. 可移植包 `dsh-raganything-kb-0.3.12-sharedkb-portable.tar.gz`

| 项 | 值 |
| --- | --- |
| 文件 | `dist/dsh-raganything-kb-0.3.12-sharedkb-portable.tar.gz` |
| 大小 | 10 794 665 B |
| md5 | `eed83fc0a2b4b4d49eddd391767a4f40` |
| sha256 | `4ac7aa08d76525c96b6d74fce6e7f57e1f6e0416a606c9cd0f078fdaa5e6d229` |
| 条目 | 216 |

组装器 `build/build_portable_0312.py`（确定性：同上），由 0.3.12 插件包 + `packaging/` 骨架
+ 供体 manifest 拼装，`PKG_VERSION` 抬到 0.3.12，并断言 `payload/sidecar/viewer` 确实在包内。
`install.sh` / `uninstall.sh` / `verify.sh` 三个脚本用**退出码**做语法自检（不看 stdout），
最后自查 `manifest.json` 的文件清单 == 归档实际条目。

一键安装：

```bash
tar xzf dsh-raganything-kb-0.3.12-sharedkb-portable.tar.gz
cd dsh-raganything-kb-0.3.12-sharedkb-portable
SUDO_PW='<sudo 密码>' ./install.sh --profile web
./verify.sh --profile web --deep
```

## 打包/安装器顺手修复（随本版一起发）

### a) 可移植包漏发 OFV 资源

`install.sh::materialize_payload()` 此前只落地 `kb/` `lib/` `sidecar/server.py`，
**漏了 `sidecar/viewer/`**（pdf.js cmaps / standard_fonts / `ofv.bundle.js`，187 项）。
sidecar 把该目录静态挂在 `/viewer/*`，缺了它 Office / PDF 产物的「打开原始文件」
就没有渲染资源 —— 正好是本版要修的那条链路的另一半。现补为「目录存在才拷」，
对旧载荷保持兼容。

### b) 安装器 `pkill` 误杀生产 sidecar（**事故**）

`--no-systemd` 分支原来是无锚点的：

```bash
pkill -f "python.*server.py"
```

在多用户宿主上这个模式同时命中：systemd 管理的**宿主 sidecar**、
**其他用户**的懒加载实例、以及**本实例**。2026-09-15 在 8.6 沙盒演练实测触发：

| 受害进程 | 结果 |
| --- | --- |
| 宿主 sidecar（`~/.dsh/raganything/venv`，pid 56561） | 被 `Restart=always` 拉起，`NRestarts=1`，无感恢复 |
| **admin 实例 sidecar（32001，pid 77179）** | **未自愈** → 网关 502 `rag sidecar on port 32001 unreachable` |

修复：锚定到本实例自己的 venv 路径，pid 文件也从共享的 `/tmp/raganything-sidecar.pid`
挪到 `$RAG_HOME/sidecar.pid`（多用户宿主上两个实例本来会互相覆盖 pid 文件）：

```bash
PID_FILE="$RAG_HOME/sidecar.pid"
[ -f "$PID_FILE" ] && { kill "$(cat "$PID_FILE")" 2>/dev/null; rm -f "$PID_FILE"; }
pkill -f "$VENV_DIR.*server\.py" 2>/dev/null      # install.sh
pkill -f "$RAG_HOME/venv.*server\.py" 2>/dev/null # uninstall.sh
```

admin 实例已用 `build/respawn_user_sidecar.sh` 按插件同款环境重建（pid 77179），
并重跑前端真实路径 E2E（docx `/content`=200、`/file`=200/37318 B、md `/content`=200）。

修复后用 `build/drill_0312_no_collateral_kill.sh` 重跑沙盒演练，**对比演练前后生产 sidecar 列表**：

```
== production sidecars BEFORE ==  56561 / 77179 / 141021(nas_server，无关)
== production sidecars AFTER  ==  56561 / 77179 / 141021
== diff (empty) ==                → NO COLLATERAL KILL ✅
```

## 部署状态（2026-09-15 已执行）

8.6 上 **12 份 profile 的依赖已切到 0.3.12**：

```
"dsh-raganything-kb": "file:/home/lgsj/dsh-raganything-kb-0.3.12-sharedkb.tgz"
```

覆盖宿主 `profiles/web` + 11 个用户。执行方式为**外科手术式依赖同步**
（改 profile `package.json` 依赖 → 替换已安装包的 `package.json` → 补 `RELEASE-NOTES.md`，
每份先留 `.bak-*`），**没有跑 `pnpm install`**：8.6 无公网出口，且 `pnpm install`
会清掉现场 `.bak-*` 备份。`pnpm-lock.yaml` 本来就早已失配（还指向 0.3.8），
而 unit 是 `ExecStart=pnpm dsh web`，不触发安装，所以本次改动**不引入新的启动风险**。

执行器：`build/deploy_profiles_0312.py`（默认 dry-run，`--apply` 才落盘，幂等；
重跑输出 12/12 already-0.3.12）。12/12 成功。

⇒ 「重装会回退到 0.3.11」的风险**已消除**。

仍待办：各懒加载用户实例首次启动后，各做一次 `/index/rebuild`。

