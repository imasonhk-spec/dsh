#!/usr/bin/env python3
"""Build dsh-raganything-kb-0.3.12-sharedkb.tgz from the 0.3.11-sharedkb baseline.

Baseline = the 0.3.11-sharedkb release tarball (already aligned with the 12 live
plugin copies on 192.168.8.6).  Delta = exactly the verified `artcontent` hot-fix
(`GET /documents/{art-<id>}/content` no longer 404s), plus:
  - drop the stray `sidecar/server.py.scopefix-*.bak` that shipped inside 0.3.11
  - bump package.json version 0.3.11 -> 0.3.12
  - add RELEASE-NOTES.md so a future reinstall/rollback can tell the builds apart

Every other member must stay byte-identical to the baseline (asserted, not assumed).

Deterministic: fixed mtime/uid/gid, sorted entries, gzip mtime=0 and no FNAME
field -> same input, same md5.

Usage:
    python build_rel0312.py \
        --base   dsh-raganything-kb-0.3.11-sharedkb.tgz \
        --server-py /path/to/patched/sidecar/server.py \
        --out    dist/dsh-raganything-kb-0.3.12-sharedkb.tgz
"""
import argparse
import gzip
import hashlib
import io
import json
import os
import py_compile
import tarfile
import tempfile

VER_OLD, VER_NEW = "0.3.11", "0.3.12"
FIX_MARKER = "_artifact_by_doc_id(doc_id)"
FIXED_MTIME = 1_700_000_000
TOUCHED = {"package/sidecar/server.py", "package/package.json", "package/RELEASE-NOTES.md"}

NOTES = """# dsh-raganything-kb 0.3.12-sharedkb

分支：8.6 多用户网关线（sharedkb），基线 = 0.3.11-sharedkb。
与基线唯一的代码差异：`/documents/{doc_id}/content` 增加 `art-` 前缀分支。

## 修复内容

「只落盘不入库」的对话产物（doc_id = `art-<uuid>-<name>`）：

| 端点 | 0.3.11 | 0.3.12 |
| --- | --- | --- |
| `GET /documents/{art-*}/file` | 200（已支持） | 200 |
| `GET /documents/{art-*}/content` | **404** | **200** |

0.3.11 里 `document_content` 只查 LightRAG `full_docs`，对 `art-` 恒 404，
前端 `ragDocContent` 拿到 null 就弹「无法读取原始文件内容：RAG-Anything 无响应或该文档无内容」。
文本型产物（.md）走 `document_file` 仍能打开，所以故障只体现在 Word/Excel/PPT 类
office 产物上。

0.3.12 行为：文本型返回正文；二进制型（docx/xlsx/pptx/pdf/图片/压缩包等）返回
空 `content` + `file_path`，由前端经 `ofvUrl` 交给 Open File Viewer 渲染。

## 其他

- 移除 0.3.11 包内误带的 `sidecar/server.py.scopefix-20260915-121321.bak`。
- 部署注意：8.6 上 12 份 profile 的依赖仍写着
  `file:/home/lgsj/dsh-raganything-kb-0.3.11-sharedkb.tgz`，换用本包需同步改依赖并重启。
"""


def md5b(b: bytes) -> str:
    return hashlib.md5(b).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="0.3.11-sharedkb baseline .tgz")
    ap.add_argument("--server-py", required=True,
                    help="patched sidecar/server.py (byte-identical to what runs live)")
    ap.add_argument("--out", required=True, help="output .tgz path")
    a = ap.parse_args()

    src = tarfile.open(a.base)
    live = open(a.server_py, "rb").read()

    members: list[tuple[tarfile.TarInfo, bytes | None]] = []
    dropped, replaced = [], []
    for m in src.getmembers():
        if m.name.split("/")[-1].endswith(".bak") or ".bak-" in m.name:
            dropped.append(m.name)
            continue
        if m.isdir():
            members.append((m, None))
            continue
        if not m.isfile():
            continue  # this artifact carries no symlinks/devices
        data = src.extractfile(m).read()
        if m.name == "package/sidecar/server.py":
            data = live
            replaced.append((m.name, m.size, len(data)))
        elif m.name == "package/package.json":
            cfg = json.loads(data.decode("utf-8"))
            assert cfg["version"] == VER_OLD, f"baseline version {cfg['version']} != {VER_OLD}"
            cfg["version"] = VER_NEW
            data = (json.dumps(cfg, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
            replaced.append((m.name, m.size, len(data)))
        members.append((m, data))

    notes_b = NOTES.encode("utf-8")
    nm = tarfile.TarInfo("package/RELEASE-NOTES.md")
    nm.size = len(notes_b)
    members.append((nm, notes_b))
    members.sort(key=lambda t: t[0].name)

    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w", format=tarfile.GNU_FORMAT) as arc:
        for m, data in members:
            mi = tarfile.TarInfo(m.name)
            if m.isdir():
                mi.type, mi.mode, mi.size = tarfile.DIRTYPE, 0o755, 0
            else:
                mi.type, mi.mode, mi.size = tarfile.REGTYPE, 0o644, len(data)
            mi.mtime = FIXED_MTIME
            mi.uid = mi.gid = 0
            mi.uname = mi.gname = "root"
            arc.addfile(mi, None if data is None else io.BytesIO(data))
    raw = buf.getvalue()

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "wb") as fh:
        # filename="" is required: otherwise GzipFile writes the output name into
        # the gzip FNAME field and the same input yields a different md5.
        with gzip.GzipFile(filename="", fileobj=fh, mode="wb",
                           compresslevel=9, mtime=0) as gz:
            gz.write(raw)
    blob = open(a.out, "rb").read()

    # ---- self-verify ----
    chk = tarfile.open(a.out)
    names = chk.getnames()
    assert not [n for n in names if ".bak" in n], "backup file leaked"
    sv = chk.extractfile("package/sidecar/server.py").read()
    assert FIX_MARKER in sv.decode("utf-8"), "artcontent fix missing"
    assert sv == live, "packaged server.py != input patched file"
    assert json.loads(chk.extractfile("package/package.json").read().decode())["version"] == VER_NEW

    base_files = {m.name: md5b(src.extractfile(m).read()) for m in src.getmembers() if m.isfile()}
    new_files = {m.name: md5b(chk.extractfile(m).read()) for m in chk.getmembers() if m.isfile()}
    gone = set(base_files) - set(new_files) - set(dropped)
    added = set(new_files) - set(base_files) - {"package/RELEASE-NOTES.md"}
    changed = {n for n in set(base_files) & set(new_files) if base_files[n] != new_files[n]} - TOUCHED
    assert not gone, f"payload lost: {gone}"
    assert not added, f"unexpected new files: {added}"
    assert not changed, f"unexpectedly modified: {changed}"

    with tempfile.TemporaryDirectory() as td:
        tmp = os.path.join(td, "_check_server.py")
        open(tmp, "wb").write(sv)
        py_compile.compile(tmp, doraise=True)

    print("dropped :", dropped or "-")
    for n, x, y in replaced:
        print(f"replaced: {n}  {x} -> {y} B")
    print("added   : package/RELEASE-NOTES.md", len(notes_b), "B")
    print("entries :", len(members))
    print("out     :", a.out)
    print("size    :", len(blob))
    print("md5     :", md5b(blob))
    print("sha256  :", hashlib.sha256(blob).hexdigest())
    print("SELF-VERIFY: OK (no .bak / fix present / version %s / "
          "baseline members byte-identical / server.py compiles)" % VER_NEW)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
