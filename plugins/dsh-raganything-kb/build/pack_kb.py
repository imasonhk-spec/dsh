#!/usr/bin/env python3
"""确定性打包 dsh-raganything-kb 插件为 npm-pack 布局的 .tgz。

用法: pack_kb.py <plugin_root> <out.tgz>
布局: package/{package.json,README.md,cordis.patch.yml,kb/config.json.template,
                lib/index.js,lib/client.js,lib/client.js.map,sidecar/server.py}
确定性: 固定 mtime=1700000000、uid/gid=0、名称排序、gzip mtime=0 -> 同输入同 md5。
"""
import gzip
import hashlib
import json
import os
import sys
import tarfile

FIXED_MTIME = 1_700_000_000
PAYLOAD = [
    "package.json",
    "README.md",
    "cordis.patch.yml",
    "kb/config.json.template",
    "lib/index.js",
    "lib/client.js",
    "lib/client.js.map",
    "sidecar/server.py",
]


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    root, out = sys.argv[1].rstrip("/\\"), sys.argv[2]
    missing = [f for f in PAYLOAD if not os.path.isfile(os.path.join(root, f))]
    if missing:
        raise SystemExit(f"!! 缺少文件: {missing}")

    ver = json.load(open(os.path.join(root, "package.json"), encoding="utf-8"))["version"]

    # 先写成未压缩 tar（确定性头），再 gzip(mtime=0)
    import io
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w", format=tarfile.GNU_FORMAT) as arc:
        for rel in sorted(PAYLOAD):
            src = os.path.join(root, rel)
            data = open(src, "rb").read()
            info = tarfile.TarInfo("package/" + rel)
            info.size = len(data)
            info.mtime = FIXED_MTIME
            info.mode = 0o644
            info.uid = info.gid = 0
            info.uname = info.gname = "root"
            info.type = tarfile.REGTYPE
            arc.addfile(info, io.BytesIO(data))
    raw = buf.getvalue()

    with open(out, "wb") as fh:
        # filename="" 必须在：否则 GzipFile 会把输出文件名写进 gzip 头的 FNAME
        # 字段，导致同一份输入打成不同文件名时 md5 不一致（不可复现）。
        with gzip.GzipFile(filename="", fileobj=fh, mode="wb",
                           compresslevel=9, mtime=0) as gz:
            gz.write(raw)

    with open(out, "rb") as fh:
        blob = fh.read()
    print(f"  version   = {ver}")
    for rel in sorted(PAYLOAD):
        print(f"    {rel:28s} {os.path.getsize(os.path.join(root, rel)):>9d} B")
    print(f"  out       = {out}")
    print(f"  size      = {len(blob)} B")
    print(f"  md5       = {hashlib.md5(blob).hexdigest()}")
    print(f"  sha256    = {hashlib.sha256(blob).hexdigest()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
