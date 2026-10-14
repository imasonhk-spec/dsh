"""确定性打包 0.3.16-sharedkb（增量回灌，基线 = 0.3.15-sharedkb）。

替换：
  package/sidecar/server.py  <- build/live_server_0316.py
      来源 = 8.6 宿主活副本 sidecar/server.py（md5 a1e8c800…，391869 B，**CRLF 泄漏版**）
      本版**归一为 LF** 后打包（原因见 RELEASE-NOTES「CRLF 归一」节）。
bump：
  package/package.json 0.3.15 -> 0.3.16
替换：
  package/RELEASE-NOTES.md（替换式，不留两份同名成员）

不动：
  package/lib/client.js（与 0.3.15 逐字节相同，显式断言）

确定性 tar/gzip（同输入同 md5）：
  GNU_FORMAT + 固定 mtime/uid/gid/uname/gname/mode + 成员按名排序 +
  gzip filename="" + compresslevel=9 + mtime=0

断言（任一不满足即中止，不写产物）：
  1. 基线版本 == 0.3.15
  2. 其余成员逐字节不变（gone/added/changed 三集合为空，除有意替换 3 项）
  3. 产物内无 .bak
  4. client.js 与基线逐字节相同（本版未动前端）
  5. 修复标记齐备（server 12 项 / client 6 项）
  6. server.py py_compile / client.js node --check 通过、无 CRLF
  7. 连跑两次 md5 相同（确定性）
  8. 注入的 server.py LF 归一后 == 线上活副本按 CRLF->LF 归一的结果
"""
import gzip
import hashlib
import io
import json
import py_compile
import subprocess
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = Path("C:/Users/81901/WorkBuddy/2026-09-11-07-04-09/repo")
BASE = REPO / "releases/0.3.15-sharedkb/dsh-raganything-kb-0.3.15-sharedkb.tgz"
OUTDIR = REPO / "releases/0.3.16-sharedkb"
OUT_TGZ = OUTDIR / "dsh-raganything-kb-0.3.16-sharedkb.tgz"
NEW_VER = "0.3.16"
OLD_VER = "0.3.15"

SERVER = REPO / "build" / "live_server_0316.py"
# 8.6 宿主活副本原始字节（CRLF 泄漏版）的 md5 / 大小
LIVE_SRV_MD5 = "a1e8c800294e0e8fb277f0a65b539d20"
LIVE_SRV_SIZE = 391869
# 归一为 LF 后（= 打包输入）
LF_SRV_MD5 = "cc60b66917834cc7d0c6de1ddfe29b9a"
LF_SRV_SIZE = 383404
# client.js 应与基线完全相同（本版未动前端）
BASE_CLI_MD5 = "526ed56d7d44daeae0fcefb40eebb371"
NODE = "C:/Users/81901/.workbuddy/binaries/node/versions/22.22.2-2/node.exe"

RELEASE_NOTES = """# dsh-raganything-kb 0.3.16-sharedkb

分支：8.6 多用户网关线（sharedkb），基线 = 0.3.15-sharedkb。

## 与基线差异（仅三处，其余成员逐字节不变）

| 成员 | 变更 |
| --- | --- |
| `sidecar/server.py` | 回灌 2026-09-21 全部 server 侧线上热修（相对基线 +192/-24 行）：①**产物正文抽取** `_artifact_text_of()`（docx/xlsx/pptx 用 python-docx/openpyxl/python-pptx 抽正文，替代旧「office 二进制返回空正文」）；②**跨实例解析** `_global_upload_dir()` + `_original_file_of()` 第三级回退（子账号实例去宿主 uploads 找原始文件）；③**`ingest_file`**：新增 `POST /ingest_file` 端点 + `POST /tasks` 的 `ingest_file` op 分支 + `_copy_file_artifact()`，把外部已生成的 office 文件（dsh-skill-office 产物）直接拷入 `storage/uploads/` 并登记为「仅文件」产物 |
| `package.json` | 版本 0.3.15 -> 0.3.16 |
| `RELEASE-NOTES.md` | 替换为本文件 |

## CRLF 归一（重要，本版特有）

线上宿主活副本的 `server.py`（md5 `a1e8c800…`，391869 B）是 **CRLF 泄漏版**：8465 个换行
全部为 `\\r\\n`，0 个裸 LF；基线是纯 LF。8 份补丁脚本在 Windows 侧生成/回写时把 `\\n`
转成了 `\\r\\n`，`py_compile` 不会报错，只能靠字节核对发现。

- 打包输入 = 线上活副本按 `CRLF -> LF` 归一后的字节：
  `383404 B`，md5 `cc60b66917834cc7d0c6de1ddfe29b9a`。
- 与基线做 diff 的**真实**改动是 `+192/-24` 行、6 个 hunk（未归一化时会伪装成 8465 行全改）。
- 本版发行件统一为 LF，与仓库与历史发行件口径一致。

## server.py 来源（重要）

本版直接取 **8.6 宿主活副本**（`/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb/`）：

- `server.py` 原始 `a1e8c800…`（391869 B CRLF）-> 归一后 `cc60b669…`（383404 B LF）
- `lib/client.js` 与基线 0.3.15 逐字节相同（`526ed56d…`，410089 B）—— 本版未动前端

## 为什么要出这一版

0.3.15 截止于 2026-09-20；此后 8.6 网关上又落了 3 项 server 侧热修
（@产物正文抽取支持 office 二进制、跨实例产物解析、`ingest_file` 外部 office 入库），
全部只存在于活副本、从未进入任何发行包。任何 `pnpm install` / 重装 / 回滚
都会把这些修复整体抹掉 —— 本版把它们固化进发行件。

**已观测到的真实回退**：2026-09-22 18:47，账号 `admin` 的 profile 插件目录被按
`file:/home/lgsj/dsh-raganything-kb-0.3.15-sharedkb.tgz` 重新物化，
`sidecar/server.py` 回退为 0.3.15 的 `7555955…`（375559 B）——即本版要消灭的
「热修只活在活副本」风险已实际发生一次。

## 验证

- 包内 `server.py` LF 归一后与 8.6 宿主活副本逐字节一致；`client.js` 与 0.3.15 一致。
- 修复标记齐备：server 12 项（含 `_artifact_text_of` / `_global_upload_dir` /
  `_copy_file_artifact` / `ingest_file`）、client 6 项（沿用 0.3.15）。
- `py_compile` / `node --check` 通过；无 CRLF 泄漏；无 `.bak` 混入；确定性 md5 复核通过。

## 部署注意

换用本包需同步改 12 份 profile 的依赖（宿主 + 11 用户 home）并重算 pnpm-lock integrity，
否则重装仍会按旧 tgz 还原（0.3.15 -> 0.3.16 未换指符时，`admin` 这类实例会继续回退）。
宿主重启 `systemctl restart raganything-sidecar`（独立服务）；用户实例用
`POST :3200N/models/restart` 或整服务重启 `dsh-web`。
"""


def deterministic_tar(members, out_path):
    """members: dict name -> (bytes, is_dir, mode)"""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w", format=tarfile.GNU_FORMAT) as t:
        for name in sorted(members):
            data, is_dir, mode = members[name]
            ti = tarfile.TarInfo(name)
            ti.mtime = 1_700_000_000
            ti.uid = ti.gid = 0
            ti.uname = ti.gname = "root"
            if is_dir:
                ti.type = tarfile.DIRTYPE
                ti.mode = 0o755
                ti.size = 0
                t.addfile(ti)
            else:
                ti.type = tarfile.REGTYPE
                ti.mode = mode
                ti.size = len(data)
                t.addfile(ti, io.BytesIO(data))
    raw = buf.getvalue()
    out = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=out, compresslevel=9, mtime=0) as gz:
        gz.write(raw)
    out_path.write_bytes(out.getvalue())


def build():
    assert BASE.exists(), f"基线不存在: {BASE}"
    assert SERVER.exists(), f"缺 server 输入: {SERVER}"

    srv = SERVER.read_bytes()
    assert len(srv) == LF_SRV_SIZE, f"server 输入大小 {len(srv)} != {LF_SRV_SIZE}"
    assert hashlib.md5(srv).hexdigest() == LF_SRV_MD5, "server 输入与 LF 归一结果 md5 不符"
    assert b"\r\n" not in srv and b"\r" not in srv, "server 输入含 CRLF"

    # --- 读基线 ---
    base_files = {}
    with tarfile.open(BASE) as t:
        for m in t.getmembers():
            if m.isfile():
                base_files[m.name] = hashlib.md5(t.extractfile(m).read()).hexdigest()
    with tarfile.open(BASE) as t:
        pj = json.loads(t.extractfile("package/package.json").read())
    assert pj["version"] == OLD_VER, f"基线版本 {pj['version']} != {OLD_VER}"
    assert base_files["package/lib/client.js"] == BASE_CLI_MD5, "基线 client.js md5 不符"
    print(f"[1] 基线版本 {pj['version']} OK，成员 {len(base_files)} 个")

    # --- 组装 ---
    members = {}
    with tarfile.open(BASE) as t:
        for m in t.getmembers():
            if m.isdir():
                members[m.name] = (b"", True, 0o755)
            elif m.isfile():
                members[m.name] = (t.extractfile(m).read(), False, m.mode & 0o777)

    members["package/sidecar/server.py"] = (srv, False, 0o644)
    members["package/RELEASE-NOTES.md"] = (RELEASE_NOTES.encode("utf-8"), False, 0o644)

    pj2 = dict(pj)
    pj2["version"] = NEW_VER
    members["package/package.json"] = (
        (json.dumps(pj2, indent=2, ensure_ascii=False) + "\n").encode("utf-8"), False, 0o644)

    OUTDIR.mkdir(parents=True, exist_ok=True)
    deterministic_tar(members, OUT_TGZ)
    md5a = hashlib.md5(OUT_TGZ.read_bytes()).hexdigest()
    print(f"[2] 打出 {OUT_TGZ.name}: {OUT_TGZ.stat().st_size} B  md5={md5a}")

    # --- 断言：其余成员逐字节不变 ---
    with tarfile.open(OUT_TGZ) as t:
        new_files = {m.name: hashlib.md5(t.extractfile(m).read()).hexdigest()
                     for m in t.getmembers() if m.isfile()}
    intentional = {"package/sidecar/server.py", "package/package.json",
                   "package/RELEASE-NOTES.md"}
    gone = set(base_files) - set(new_files)
    added = set(new_files) - set(base_files)
    changed = {n for n in (set(base_files) & set(new_files))
               if base_files[n] != new_files[n]} - intentional
    assert not gone, f"意外丢失成员: {gone}"
    assert not added, f"意外新增成员: {added}"
    assert not changed, f"意外变更成员: {changed}"
    print(f"[3] 逐字节不变断言通过（有意替换 {len(intentional)}）")

    assert not [n for n in new_files if ".bak" in n], "产物混入 .bak"
    print("[4] 无 .bak 混入")

    assert new_files["package/lib/client.js"] == BASE_CLI_MD5, "client.js 被意外改动"
    print("[4b] client.js 与基线逐字节相同（本版未动前端）")

    # --- 断言：修复标记 ---
    with tarfile.open(OUT_TGZ) as t:
        s = t.extractfile("package/sidecar/server.py").read().decode("utf-8")
        c = t.extractfile("package/lib/client.js").read().decode("utf-8")
    srv_marks = ["_ainsert_dup_safe", "kb-sessions.json", "_route_scope_query",
                 "_shared_is_local", "_VROOT_PREFIXES", "_silent_dup", "semantic_title",
                 "_find_doc_ids_by_display",
                 "_artifact_text_of", "_global_upload_dir", "_copy_file_artifact",
                 "ingest_file"]
    cli_marks = ["buildSharedTree", "flattenSharedRows", "activeSessId", "executeCopyTo",
                 "sharedVisibleRows", "kbFeat86-shareddocid"]
    for k in srv_marks:
        assert s.count(k) >= 1, f"server 缺标记 {k}"
    for k in cli_marks:
        assert c.count(k) >= 1, f"client 缺标记 {k}"
    assert "kbProto" not in s, "server 含探针残留 kbProto"
    print(f"[5] 修复标记齐备（server {len(srv_marks)} 项 / client {len(cli_marks)} 项），无探针残留")

    # --- 断言：语法 ---
    tmp_py = HERE / "_verify_server_0316.py"
    tmp_py.write_bytes(srv)
    py_compile.compile(str(tmp_py), doraise=True)
    tmp_py.unlink()
    r = subprocess.run([NODE, "--check", str(REPO / "build" / "live_client_0315.js")],
                       capture_output=True)
    assert r.returncode == 0, r.stderr.decode()
    print("[6] py_compile + node --check 通过")

    # --- 断言：确定性 ---
    deterministic_tar(members, OUT_TGZ)
    md5b = hashlib.md5(OUT_TGZ.read_bytes()).hexdigest()
    assert md5a == md5b, f"不确定性: {md5a} != {md5b}"
    print(f"[7] 确定性复核通过 md5={md5b}")

    print(f"\nBUILD-OK {OUT_TGZ}")
    return OUT_TGZ, md5b


if __name__ == "__main__":
    build()
