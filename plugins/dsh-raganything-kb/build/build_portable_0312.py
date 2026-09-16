#!/usr/bin/env python3
"""Assemble dsh-raganything-kb-0.3.12-sharedkb-portable.tar.gz.

Layout (same as the 0.3.10-portable precedent):

    dsh-raganything-kb-0.3.12-sharedkb-portable/
        README.md            repo README
        install.sh           packaging/install.sh (PKG_VERSION bumped; viewer-aware)
        uninstall.sh         packaging/uninstall.sh
        verify.sh            packaging/verify.sh
        manifest.json        regenerated (donor: previous portable's manifest)
        extras/              systemd unit + nginx conf + env template
        tools/               adapt_config.py / patch_nginx.py
        payload/             canonical plugin files (incl. sidecar/viewer/)
        plugin/              dsh-raganything-kb-0.3.12.tgz (name install.sh expects)

Deterministic: fixed mtime/uid/gid, sorted entries, gzip mtime=0, no FNAME.

Usage:
    python build_portable_0312.py --repo <repo> --release-tgz <0.3.12-sharedkb.tgz> \
        --base-portable <prev -portable.tar.gz> --out <out.tar.gz> [--stage DIR]
"""
import argparse
import datetime
import gzip
import hashlib
import json
import os
import shutil
import subprocess
import tarfile

PKG, VER = "dsh-raganything-kb", "0.3.12"
CORE = ["package.json", "README.md", "cordis.patch.yml", "kb/config.json.template",
        "lib/index.js", "lib/client.js", "lib/client.js.map", "sidecar/server.py"]
FIXED = 1_700_000_000


def md5f(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


def add_tar(tw, path, arcname):
    if os.path.isdir(path):
        ti = tarfile.TarInfo(arcname)
        ti.type, ti.mode, ti.mtime = tarfile.DIRTYPE, 0o755, FIXED
        ti.uid = ti.gid = 0
        ti.uname = ti.gname = ""
        tw.addfile(ti)
        for n in sorted(os.listdir(path)):
            add_tar(tw, os.path.join(path, n), arcname + "/" + n)
    else:
        ti = tarfile.TarInfo(arcname)
        ti.size, ti.mode, ti.mtime = os.path.getsize(path), 0o644, FIXED
        ti.uid = ti.gid = 0
        ti.uname = ti.gname = ""
        with open(path, "rb") as fh:
            tw.addfile(ti, fh)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--release-tgz", required=True)
    ap.add_argument("--base-portable", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--stage", default=".tmp_portable_build",
                    help="scratch dir; keep it under a real path (MSYS /tmp and "
                         "Windows /tmp are different directories)")
    a = ap.parse_args()

    repo = os.path.abspath(a.repo)
    pkgdir = os.path.join(repo, "packaging")
    TOP = f"{PKG}-{VER}-sharedkb-portable"
    STAGE = os.path.join(a.stage, TOP)
    shutil.rmtree(a.stage, ignore_errors=True)
    os.makedirs(STAGE, exist_ok=True)

    # --- 1) packaging skeleton ---
    for f in ("install.sh", "uninstall.sh", "verify.sh"):
        shutil.copy(os.path.join(pkgdir, f), os.path.join(STAGE, f))
    for d in ("extras", "tools"):
        shutil.copytree(os.path.join(pkgdir, d), os.path.join(STAGE, d))

    inst = os.path.join(STAGE, "install.sh")
    s = open(inst, encoding="utf-8").read()
    assert s.count('PKG_VERSION="0.3.9"') == 1, "PKG_VERSION anchor not unique"
    s = s.replace('PKG_VERSION="0.3.9"', f'PKG_VERSION="{VER}"')
    assert 'payload/sidecar/viewer' in s, "installer is not viewer-aware"
    open(inst, "w", encoding="utf-8", newline="\n").write(s)

    # --- 2) payload from the release tarball ---
    pay = os.path.join(STAGE, "payload")
    tmp = os.path.join(a.stage, "_x")
    with tarfile.open(a.release_tgz) as t:
        t.extractall(tmp, filter="data")
    src = os.path.join(tmp, "package")
    missing = [f for f in CORE if not os.path.isfile(os.path.join(src, f))]
    assert not missing, f"release tarball missing core files: {missing}"
    for f in CORE:
        dst = os.path.join(pay, f)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy(os.path.join(src, f), dst)
    vdir = os.path.join(src, "sidecar", "viewer")
    assert os.path.isdir(vdir), "release tarball has no sidecar/viewer"
    shutil.copytree(vdir, os.path.join(pay, "sidecar", "viewer"))
    n_viewer = sum(len(fs) for _r, _d, fs in os.walk(os.path.join(pay, "sidecar", "viewer")))

    # --- 3) plugin tarball (name install.sh expects) ---
    plug = os.path.join(STAGE, "plugin")
    os.makedirs(plug, exist_ok=True)
    plug_tgz = os.path.join(plug, f"{PKG}-{VER}.tgz")
    shutil.copy(a.release_tgz, plug_tgz)

    # --- 4) README ---
    shutil.copy(os.path.join(repo, "README.md"), os.path.join(STAGE, "README.md"))

    # --- 5) manifest.json (donor = previous portable) ---
    with tarfile.open(a.base_portable) as t:
        mname = [n for n in t.getnames() if n.endswith("/manifest.json")][0]
        base = json.loads(t.extractfile(mname).read().decode("utf-8"))
    base["version"] = VER
    base["portable_build"] = datetime.datetime.now().astimezone().strftime("%Y-%m-%dT%H:%M:%S%z")
    base["source"] = {
        "host": "192.168.8.6",
        "arch": "x86_64",
        "path": "/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb",
        "note": (
            "sharedkb line (8.6 multi-user gateway). 0.3.12 = 0.3.11-sharedkb + the "
            "'对话产物打开原始文件' fix: GET /documents/{art-<id>}/content used to 404 for "
            "file-only artifacts (art- prefix never reaches LightRAG), so the panel showed "
            "'无法读取原始文件内容：RAG-Anything 无响应或该文档无内容' on every Office artifact. "
            "It now reads the file from disk: text returns the body, binaries return an empty "
            "'content' plus 'file_path' for the Open File Viewer. Also drops the stray "
            "sidecar/server.py.scopefix-*.bak that 0.3.11 shipped."
        ),
    }
    base["changes_0.3.12"] = {
        "src/sidecar/server.py": [
            "document_content(): new art- branch — resolve the physical file via "
            "_artifact_by_doc_id(), return the decoded body for text and "
            "{content: '', file_path: ...} for binaries (.docx/.xlsx/.pptx/.pdf/images); "
            "server.py is byte-identical to the hot-fixed file running on 8.6",
        ],
        "src/package.json": ["version 0.3.11 -> 0.3.12"],
        "install.sh": [
            "materialize_payload() now also copies payload/sidecar/viewer/ when present "
            "(OFV assets for the /viewer/* static mount); older payloads lacked it and a "
            "portable install would render no Office/PDF preview. Guarded, so payloads "
            "without the dir keep working as before",
        ],
        "_unchanged_vs_0.3.11-sharedkb": [
            "lib/index.js", "lib/client.js", "lib/client.js.map", "cordis.patch.yml",
            "kb/config.json.template", "verify.sh", "uninstall.sh", "extras/", "tools/",
        ],
        "_note": (
            "Verified before switching: the 12 live installs on 8.6 were already byte-identical "
            "to this payload except package.json (version string) — only metadata changed, so no "
            "service restart was required. dist/dsh-raganything-kb-0.3.12-sharedkb.tgz md5 "
            "d6c076e84cf89e193afcd50be5502fa1."
        ),
    }
    files = {}
    for dp, _d, fns in os.walk(STAGE):
        for fn in fns:
            full = os.path.join(dp, fn)
            rel = os.path.relpath(full, STAGE).replace("\\", "/")
            if rel == "manifest.json":
                continue
            files[rel] = {"size": os.path.getsize(full), "md5": md5f(full)}
    base["files"] = files
    json.dump(base, open(os.path.join(STAGE, "manifest.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    # --- 6) deterministic tar.gz ---
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "wb") as fout:
        with gzip.GzipFile(filename="", mode="wb", fileobj=fout, compresslevel=9, mtime=0) as gz:
            with tarfile.open(fileobj=gz, mode="w", format=tarfile.GNU_FORMAT) as tw:
                for n in sorted(os.listdir(STAGE)):
                    add_tar(tw, os.path.join(STAGE, n), TOP + "/" + n)
    blob = open(a.out, "rb").read()

    # --- 7) static checks (bash -n by EXIT CODE, not stdout) ---
    checks = []
    for sh in ("install.sh", "uninstall.sh", "verify.sh"):
        # MSYS/Git-Bash needs forward slashes ("C:/tmp/..."); os.path.join gives
        # backslashes on Windows and bash then reports "No such file or directory".
        p = subprocess.run(["bash", "-n", os.path.join(STAGE, sh).replace("\\", "/")],
                           capture_output=True, text=True)
        checks.append((sh, p.returncode == 0, p.stderr.strip()[:200]))
    assert all(c[1] for c in checks), f"syntax check failed: {checks}"
    assert not any(line.endswith("\r") for line in
                   open(inst, "rb").read().decode().split("\n")), "CRLF leaked into install.sh"

    # manifest must describe exactly what is in the archive
    chk = tarfile.open(a.out)
    arc = {n[len(TOP) + 1:] for n in chk.getnames() if n.startswith(TOP + "/") and n != TOP + "/"}
    arc_files = {n for n in arc if chk.getmember(f"{TOP}/{n}").isfile()}
    # manifest.json deliberately does not list itself (same as the 0.3.10 build)
    assert arc_files - {"manifest.json"} == set(files), (arc_files ^ set(files))
    assert md5f(plug_tgz) == md5f(a.release_tgz), "plugin tgz != release tarball"
    pj = json.loads(chk.extractfile(f"{TOP}/payload/package.json").read().decode())
    assert pj["version"] == VER, pj["version"]
    assert len([n for n in arc if n.startswith("payload/sidecar/viewer/")]) > 180, "viewer missing"
    assert chk.extractfile(f"{TOP}/payload/sidecar/server.py").read() == \
        open(os.path.join(src, "sidecar/server.py"), "rb").read(), "server.py drifted"

    print("top dir      :", TOP)
    print("payload core :", len(CORE), "files +", n_viewer, "viewer files")
    print("plugin tgz   :", f"{PKG}-{VER}.tgz", md5f(plug_tgz))
    print("syntax check :", ", ".join(f"{n}={'ok' if ok else 'FAIL'}" for n, ok, _ in checks))
    print("manifest     :", len(files), "files recorded")
    print("out          :", a.out)
    print("size         :", len(blob))
    print("md5          :", hashlib.md5(blob).hexdigest())
    print("sha256       :", hashlib.sha256(blob).hexdigest())
    print("SELF-VERIFY: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
