#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build dsh-raganything-kb-0.3.13-sharedkb.tgz from the 0.3.12-sharedkb baseline.

Baseline = the 0.3.12-sharedkb release tarball (already aligned with the 12 live
plugin copies on 192.168.8.6).  Delta = exactly the verified `@`-scope hot-fix:

  (a) 前缀对称（已在 0.3.12 的 _in_scope 基础上补「共享/」虚拟根）
      共享 chunk 的 file_path 带 `共享/` 前缀、前端 @ scope 不带，旧逻辑只剥
      `全部文档/` → 宿主侧也匹配不上。
  (b) 用户实例共享作用域转发（host-aware）：`_route_scope_query` 在宿主实例
      （_shared_is_local() 为 True）走本地检索；用户实例把命中共享文件夹的作用域
      转发宿主 sidecar (SHARED_BASE/17321) 检索，私有部分本地检索并合并
      （带【共享知识库】/【私有知识库】标签）。宿主不再转发给自己（避免自环）。

这两处都已线上验证：8.6 多用户网关 admin 实例 @ 共享 PPTX 由 hits=0 变为 hits=18。

Every other member stays byte-identical to the baseline (asserted, not assumed).

Deterministic: fixed mtime/uid/gid, sorted entries, gzip mtime=0 and no FNAME field.

Usage:
    python build_rel0313.py \
        --base      dist/dsh-raganything-kb-0.3.12-sharedkb.tgz \
        --server-py build/rel0313_server.py \
        --out       dist/dsh-raganything-kb-0.3.13-sharedkb.tgz
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

VER_OLD, VER_NEW = "0.3.12", "0.3.13"
# 0.3.12 已含 artcontent 修复；0.3.13 必须保留它，并新增前缀 + host-aware 转发。
FIX_MARKERS = (
    "_artifact_by_doc_id(doc_id)",   # 0.3.12 artcontent 修复，必须保留
    "_VROOT_PREFIXES",               # 前缀对称修复
    "_route_scope_query",            # host-aware 共享作用域转发
    "_shared_is_local",              # 宿主判定（守卫，避免转发自环）
)
FIXED_MTIME = 1_700_000_000
TOUCHED = {"package/sidecar/server.py", "package/package.json", "package/RELEASE-NOTES.md"}

NOTES = """# dsh-raganything-kb 0.3.13-sharedkb

分支：8.6 多用户网关线（sharedkb），基线 = 0.3.12-sharedkb。
与基线唯一的代码差异：修复「@ 共享文件 / 文件夹 限定范围问答返回『没有检索到』」。

## 根因（两层）

| 层 | 问题 |
| --- | --- |
| ① 前缀不对称 | 共享 chunk 的 `file_path` 带 `共享/` 前缀，前端 `@` scope 不带；旧 `_in_scope` 只剥 `全部文档/` |
| ② 作用域检索跑在用户实例本地（系统性主因） | 用户实例 `rag` 只持私有库（0 个 `共享/` chunk），共享库本体在宿主 sidecar（17321）；`@` 限定范围被路由到用户实例本地跑，永远查不到共享库 |

全库检索（不加 @）正常，是因为它走 `rag.aquery`（宿主可达）——唯独 `@` 范围被留在本地。

## 修复

- 修复①：`_VROOT_PREFIXES` 加 `"共享/"`，`_in_scope` 对 chunk 与 scope 两端对称剥虚拟根。
- 修复②（host-aware）：`_route_scope_query` 在**宿主实例**（`_shared_is_local()` 为 True）直接本地检索；
  **用户实例**把命中共享文件夹的作用域转发宿主 sidecar（`SHARED_BASE`/17321）检索，私有部分仍本地检索并合并
  （带【共享知识库】/【私有知识库】标签）。单文件同时正确服务宿主与用户实例，不会转发自环。

## 验证（线上）

8.6 多用户网关 admin 实例 `@ 01-算力一部/灵拓·Tokens Store Token聚合服务平台0819.pptx`
由 hits=0 变为 **hits=18**，回答正常，不再出现「没有检索到与该问题相关的内容」。

## 其他

- 0.3.12 的 artcontent 修复（`GET /documents/{art-*}/content` 不再 404）原样保留。
- 部署注意：8.6 上 12 份 profile 的依赖仍写着
  `file:/home/lgsj/dsh-raganything-kb-0.3.12-sharedkb.tgz`，换用本包需同步改依赖并重启
  （宿主 `systemctl restart raganything-sidecar`；用户实例 `POST :3200N/models/restart`）。
"""


def md5b(b: bytes) -> str:
    return hashlib.md5(b).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="0.3.12-sharedkb baseline .tgz")
    ap.add_argument("--server-py", required=True,
                    help="host-aware patched sidecar/server.py (byte-identical to what runs live + host guard)")
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
            continue
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
        elif m.name == "package/RELEASE-NOTES.md":
            data = NOTES.encode("utf-8")
            replaced.append((m.name, m.size, len(data)))
        members.append((m, data))

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
        with gzip.GzipFile(filename="", fileobj=fh, mode="wb",
                           compresslevel=9, mtime=0) as gz:
            gz.write(raw)
    blob = open(a.out, "rb").read()

    # ---- self-verify ----
    chk = tarfile.open(a.out)
    names = chk.getnames()
    assert not [n for n in names if ".bak" in n], "backup file leaked"
    sv = chk.extractfile("package/sidecar/server.py").read()
    for mk in FIX_MARKERS:
        assert mk in sv.decode("utf-8"), f"fix marker missing: {mk}"
    assert sv == live, "packaged server.py != input patched file"
    assert json.loads(chk.extractfile("package/package.json").read().decode())["version"] == VER_NEW
    assert chk.extractfile("package/RELEASE-NOTES.md").read() == NOTES.encode("utf-8")

    base_files = {m.name: md5b(src.extractfile(m).read()) for m in src.getmembers() if m.isfile()}
    new_files = {m.name: md5b(chk.extractfile(m).read()) for m in chk.getmembers() if m.isfile()}
    gone = set(base_files) - set(new_files) - set(dropped)
    added = set(new_files) - set(base_files)  # RELEASE-NOTES 已替换而非新增
    changed = {n for n in set(base_files) & set(new_files) if base_files[n] != new_files[n]} - TOUCHED
    assert not gone, f"payload lost: {gone}"
    assert not added, f"unexpected new files: {added}"
    assert not changed, f"unexpectedly modified: {changed}"

    with tempfile.TemporaryDirectory() as td:
        tmp = os.path.join(td, "_check_server.py")
        open(tmp, "wb").write(sv)
        py_compile.compile(tmp, doraise=True)

    # determinism re-check
    raw2 = io.BytesIO()
    with tarfile.open(fileobj=raw2, mode="w", format=tarfile.GNU_FORMAT) as arc:
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
    buf2 = io.BytesIO()
    with gzip.GzipFile(filename="", fileobj=buf2, mode="wb", compresslevel=9, mtime=0) as gz:
        gz.write(raw2.getvalue())
    assert md5b(buf2.getvalue()) == md5b(blob), "non-deterministic output"

    print("dropped :", dropped or "-")
    for n, x, y in replaced:
        print(f"replaced: {n}  {x} -> {y} B")
    print("entries :", len(members))
    print("out     :", a.out)
    print("size    :", len(blob))
    print("md5     :", md5b(blob))
    print("sha256  :", hashlib.sha256(blob).hexdigest())
    print("SELF-VERIFY: OK (no .bak / 4 fix markers / version %s / "
          "baseline members byte-identical / server.py compiles / deterministic)" % VER_NEW)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
