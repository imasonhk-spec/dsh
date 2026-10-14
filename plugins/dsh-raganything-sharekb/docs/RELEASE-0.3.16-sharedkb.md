# RELEASE 0.3.16-sharedkb

> 分支：8.6 多用户网关线（sharedkb） · 基线：`0.3.15-sharedkb` · 日期：2026-09-22
> 发布件与校验值见 [`../releases/0.3.16-sharedkb/CHECKSUMS.md`](../releases/0.3.16-sharedkb/CHECKSUMS.md)

## 一句话

把 2026-09-21 落在 8.6 活副本上的 3 项 server 侧热修（@产物读 office 正文、跨实例产物解析、
外部 office 文件 `ingest_file` 入库）固化进发行包，并把线上 **CRLF 泄漏**的 `server.py` 归一为 LF。

## 为什么不发不可

0.3.15 截止于 2026-09-20。此后 8.6 网关上又落了 3 项 server 侧修复，**只存在于活副本**。
本版发布前已实测到一次真实回退：**2026-09-22 18:47，账号 `admin` 的 profile 被按
`file:/home/lgsj/dsh-raganything-kb-0.3.15-sharedkb.tgz` 重新物化**，
`sidecar/server.py` 回退为 0.3.15 的 `75559557795d26e881fb218ffd53fc02`（375559 B），
热修整体丢失 —— 即「热修只活在活副本」的风险不是理论。

## 改了什么

### 1. 产物正文抽取：`_artifact_text_of()`

`@` 指定「对话产物」时，此前对 `docx/xlsx/pptx` 等二进制一律返回空正文（由调用方降级为提示）。
本版改为真解析：

| 扩展名 | 解析方式 |
| --- | --- |
| `.docx` | `python-docx`：段落 + 表格单元格 |
| `.xlsx` | `openpyxl`（`read_only=True, data_only=True`）：逐工作表逐行 |
| `.pptx` | `python-pptx`：逐页逐 shape 的 text_frame runs |
| 文本类（`TEXT_EXTS` + `.csv/.json/.log/.xml/.yaml/.yml/.pdf`） | 直接读，失败返回 `""` |

任何解析异常都返回 `""`，不抛错（保持「降级为提示」的旧行为）。

### 2. 跨实例产物解析：`_global_upload_dir()`

多用户网关上，产物由**宿主** sidecar 写入宿主 uploads 目录，而子账号实例有自己的
`working_dir`，于是子账号 `@` 自己的产物时找不到原始文件。新增第三级回退：

```
_original_file_of(title)
  1) 本实例 manifest 反查（dest_name -> display_path）
  2) 本实例 uploads 目录按「去掉 8 位 uuid 前缀的 basename」扫描
  3) 跨实例回退：_global_upload_dir()（RAG_HOST_WORKING_DIR env >
     结构推导 .../<x>/.dsh/multi-user/users/<u>/home/raganything -> .../<x>/.dsh/raganything/uploads）
     做全局 manifest 反查 + basename 扫描
```

### 3. `ingest_file`：外部 office 文件入库为「仅文件」产物

- `POST /ingest_file`（同步）：`{src_path, title, format, session_id}`
- `POST /tasks` 新增 `op="ingest_file"`（异步，走任务队列，前端导出链路用）
- `_copy_file_artifact(src, title, fmt)`：`src_path` 必须是**绝对路径**且位于
  `/tmp`、`storage/uploads`、用户家目录三者之一；拷成 `uploads/<8位uuid>-<标题>.<ext>`，
  返回 `(dest_name, display_path)`；随后 `_manifest_add_session` + `_session_bind` 记账，
  于是右侧「对话产物」栏按 `session_id` 正常归组。
- 产物为 `file_only: true`（**只落盘不入库**，与既有产物语义一致）。

## CRLF 归一（本版特有）

线上宿主活副本 `server.py` = `391869 B`、md5 `a1e8c800294e0e8fb277f0a65b539d20`，
其中 **8465 个换行全部是 `\r\n`、0 个裸 LF**；基线是纯 LF。

- 这会让朴素 diff 显示「8465 行全改」；按 `CRLF -> LF` 归一后真实改动是 **+192/-24 行、6 个 hunk**。
- `py_compile` 对 CRLF 不报错，只能靠字节核对发现 —— 打包器已加断言
  （`len == 383404`、md5 `== cc60b669…`、`b"\r\n" not in data`）。
- 发行件统一 LF：`383404 B`、md5 `cc60b66917834cc7d0c6de1ddfe29b9a`。

## 没改什么

`lib/client.js`（`526ed56d…`）与 0.3.15 **逐字节相同**；`lib/index.js`、`cordis.patch.yml`、
`kb/config.json.template`、README、`sidecar/viewer/` 187 项资源、安装骨架全部沿用基线。
发行 tgz 195 -> 195 个成员，仅 3 个成员有意替换。

## 发布件

| 文件 | md5 | size (B) |
| --- | --- | --- |
| `dsh-raganything-kb-0.3.16-sharedkb.tgz` | `c0a530d2eec995d7670e8141b108c7c1` | 5348229 |
| `dsh-raganything-kb-0.3.16-sharedkb-portable.tar.gz` | `c455c4dd6e43b1afa0482e479f15ce0b` | 10730800 |

两者均**确定性可复现**（连打两次 md5 相同）。打包器：`build/build_rel0316.py`、
`build/build_portable_0316.py`；载荷输入：`build/live_server_0316.py`。

## 部署注意

12 份 profile 的依赖串仍指向 `file:/home/lgsj/dsh-raganything-kb-0.3.15-sharedkb.tgz`。
**不切指符，`admin` 这类实例会继续按 0.3.15 回退。** 切换走「文件层三重一致手工对齐」
（profile `package.json` 依赖串 / `pnpm-lock.yaml` 5 处引用 + integrity + version 行 /
已装 `node_modules/.../package.json` 的 `version`），**不要跑 `pnpm install`**（无出口且会清掉现场 `.bak-*`）。
宿主重启 `systemctl restart raganything-sidecar`；用户实例 `POST :3200N/models/restart` 或重启 `dsh-web`。
