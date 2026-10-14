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

PKG, VER = "dsh-raganything-kb", "0.3.17"
CORE = ["package.json", "README.md", "cordis.patch.yml", "kb/config.json.template",
        "lib/index.js", "lib/client.js", "sidecar/server.py"]
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
    ap.add_argument("--build-stamp", default="2026-09-26T23:40:00+0800",
                    help="frozen portable_build timestamp (fixes determinism)")
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
    base["portable_build"] = a.build_stamp
    base["source"] = {
        "host": "192.168.8.6",
        "arch": "x86_64",
        "path": "/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb",
        "note": (
            "sharedkb line (8.6 multi-user gateway). 0.3.17 = 0.3.16-sharedkb + the client-side "
            "hot-fixes that had only ever existed on the live 8.6 copies. sidecar/server.py is "
            "byte-identical to 0.3.16 (cc60b66917834cc7d0c6de1ddfe29b9a, 383404 B, server side "
            "untouched this round). lib/client.js md5 f5e7e7cfddcadbf12d547b9db2bd1a21 (415617 B, "
            "LF-clean, taken from the live host copy): (1) kbIcons071 - icon exports renamed with "
            "DSH 0.1.7-alpha.2 from size suffix (IconX14/16) to weight suffix (IconXRegular); "
            "missing these members crashes the whole KB panel with React error #130; (2) KB panel "
            "x DSH sidebar integration: closeKbPanel (Esc/close = go home + expand sidebar), "
            "softCloseKb (lightweight overlay close when the user navigates elsewhere), "
            "activePanelId change monitor via usePanelInfo, capture-phase nav-click fallback; "
            "(3) sidebar tracking: while open, publishes the DSH sidebar width as --dsh-kb-left so "
            "the fixed overlay always sits right of the nav rail; (4) artifact-rail / model-panel "
            "CSS increments. lib/index.js md5 375437b25223fac25474bcf19d4fcc30 (36473 B): tool "
            "schema fix aligned with tools/patch_kb_tool_schema86.py - moves required:true from "
            "property level to the top-level required array on rag_query / rag_ingest / rag_note / "
            "rag_delete etc.; strict OpenAI/Gemini endpoints used to reject the old schema with "
            "HTTP 400 (Invalid schema for function ...: True is not of type 'array')."
        ),
    }

    # keep donor's changes_0.3.12 for cumulative history; append 0.3.13
    base["changes_0.3.13"] = {
        "src/sidecar/server.py": [
            "_in_scope: strip virtual root (全部文档/ and 共享/) symmetrically on BOTH the chunk "
            "file_path and the scope side, so shared chunks (prefix '共享/') match a front-end "
            "@ scope that omits it.",
            "_route_scope_query (host-aware): on a user instance, split the scope by shared-folder "
            "names from shared_kb.json; forward the shared part to the host sidecar (SHARED_BASE/"
            "17321) and keep the private part local, then merge answers (【共享知识库】/【私有知识库】 "
            "labels). On the host (_shared_is_local() is True) it answers locally — no forward loop. "
            "server.py is byte-identical to the hot-fixed file running on 8.6 plus the host guard.",
        ],
        "src/package.json": ["version 0.3.12 -> 0.3.13"],
        "_unchanged_vs_0.3.12-sharedkb": [
            "lib/index.js", "lib/client.js", "lib/client.js.map", "cordis.patch.yml",
            "kb/config.json.template", "verify.sh", "uninstall.sh", "extras/", "tools/",
            "sidecar/viewer/",
        ],
        "_note": (
            "Incremental over 0.3.12-sharedkb: only package/sidecar/server.py (the @-scope fix) "
            "and package/package.json (version) changed; every other member is byte-identical to "
            "the 0.3.12 baseline. dist/dsh-raganything-kb-0.3.13-sharedkb.tgz md5 "
            "37fec124b41996b5b5c4ca522f2ae7a6."
        ),
    }
    base["changes_0.3.14"] = {
        "src/sidecar/server.py": [
            "Host-aware synthesis: host GLOBAL live copy (all Phase-4 fixes) + the guarded "
            "shared-scope forward block from 0.3.13. _route_scope_query short-circuits to local "
            "retrieval when _shared_is_local() is True (host), otherwise splits the scope and "
            "forwards the shared part to the host sidecar.",
            "server-side Phase-4 fixes now shipped: _ainsert_dup_safe content-dedup self-heal "
            "(ingest_text / txt-md / rebuild / pdf-fast), _clear_duplicate_blocker (refuses to "
            "delete a processed blocker), the reaper that rolls back stuck 'retrying' entries, "
            "and the session artifact ledger (SESSIONS_PATH / kb-sessions.json + PUT "
            "/artifacts/session).",
        ],
        "src/lib/client.js": [
            "Shared KB folder tree: buildSharedTree + flattenSharedRows + sharedVisibleRows "
            "rendering with per-depth indent (shared doc.title = 共享/<folder>/sub/... ).",
            "Artifact rail session anchoring (activeSessId / sessionDirOf '会话-<id>') and .md "
            "exclusion.",
            "Shared->personal copy docId normalisation (buildSharedTree parent.files push) + "
            "executeCopyTo fetch fallback; folder copy used to 404 (d.docId undefined).",
            "Retry affordance labels (retrylabel / retryimmediate).",
        ],
        "src/package.json": ["version 0.3.13 -> 0.3.14"],
        "_removed_vs_0.3.13-sharedkb": ["lib/client.js.map (stale source map)"],
        "_unchanged_vs_0.3.13-sharedkb": [
            "lib/index.js", "cordis.patch.yml", "kb/config.json.template", "README.md",
            "verify.sh", "uninstall.sh", "extras/", "tools/", "sidecar/viewer/",
        ],
        "_note": (
            "Incremental over 0.3.13-sharedkb: only package/sidecar/server.py, "
            "package/lib/client.js and package/package.json changed; lib/client.js.map was "
            "dropped; every other member is byte-identical to the 0.3.13 baseline."
        ),
    }
    base["changes_0.3.15"] = {
        "src/sidecar/server.py": [
            "Retry-state roll-forward: _silent_dup self-heal (verify a processed/processing "
            "chunk actually exists after ingest; if not, delete the dirty dup- placeholder and "
            "re-insert with a provenance line), _find_doc_ids_by_display two-sided vroot "
            "normalisation (shared-KB docs were never found -> self-heal early-returned), and "
            "twin grouping (all stem-matching FAILED twins enqueue together).",
            "Shared-KB overwrite preserves the folder tree and the correct landing path; "
            "recycle bin gains scroll, restore-all and purge-all.",
            "Conversation artifact cross-session ledger (kb-sessions.json) hardened.",
            "Semantic artifact naming (semantic_title) for Word/Excel/PPT artifacts.",
            "/index/reingest enqueue-ification (no global lock; returns started:true).",
        ],
        "src/lib/client.js": [
            "Recycle-bin scroll + whole-tree top level.",
            "Semantic-naming trigger for artifacts.",
            "Shared folder-tree / artifact-rail session filtering refinements.",
        ],
        "src/package.json": ["version 0.3.14 -> 0.3.15"],
        "_unchanged_vs_0.3.14-sharedkb": [
            "lib/index.js", "cordis.patch.yml", "kb/config.json.template", "README.md",
            "verify.sh", "uninstall.sh", "extras/", "tools/", "sidecar/viewer/",
        ],
        "_note": (
            "Incremental over 0.3.14-sharedkb: only package/sidecar/server.py, "
            "package/lib/client.js, package/package.json and package/RELEASE-NOTES.md changed; "
            "every other member is byte-identical to the 0.3.14 baseline."
        ),
    }
    base["changes_0.3.16"] = {
        "src/sidecar/server.py": [
            "Artifact text extraction: _artifact_text_of() reads docx (python-docx), xlsx "
            "(openpyxl) and pptx (python-pptx) bodies for @-scoped artifact injection; "
            "_artifact_scope_texts() no longer returns an empty body for office binaries.",
            "Cross-instance artifact resolution: _global_upload_dir() (RAG_HOST_WORKING_DIR env "
            "> structural derivation .../.dsh/raganything/uploads) plus a third fallback level "
            "in _original_file_of() (global manifest reverse lookup + basename scan), so a "
            "sub-account instance can find originals written by the host sidecar.",
            "ingest_file: POST /ingest_file endpoint + the ingest_file branch inside POST "
            "/tasks + _copy_file_artifact() - copies an externally generated office file "
            "(absolute path restricted to /tmp, uploads, or the user home) into storage/uploads "
            "and registers it as a file-only artifact (file_only: true) bound to session_id.",
            "Size/md5: raw live copy 391869 B md5 a1e8c800294e0e8fb277f0a65b539d20 was CRLF "
            "leaked; the shipped file is the LF-normalised form, 383404 B md5 "
            "cc60b66917834cc7d0c6de1ddfe29b9a (true diff vs 0.3.15: +192/-24 lines, 6 hunks).",
        ],
        "src/package.json": ["version 0.3.15 -> 0.3.16"],
        "_unchanged_vs_0.3.15-sharedkb": [
            "lib/index.js", "lib/client.js", "cordis.patch.yml", "kb/config.json.template",
            "README.md", "verify.sh", "uninstall.sh", "extras/", "tools/", "sidecar/viewer/",
        ],
        "_note": (
            "Incremental over 0.3.15-sharedkb: only package/sidecar/server.py, "
            "package/package.json and package/RELEASE-NOTES.md changed; lib/client.js is "
            "byte-identical to 0.3.15 and every other member is byte-identical to the 0.3.15 "
            "baseline. dist/dsh-raganything-kb-0.3.16-sharedkb.tgz md5 "
            "c0a530d2eec995d7670e8141b108c7c1."
        ),
    }
    base["changes_0.3.17"] = {
        "src/lib/client.js": [
            "kbIcons071: icon exports IconX14/16 -> IconXRegular (DSH 0.1.7-alpha.2 compat; "
            "without it the KB panel dies with React error #130).",
            "KB panel x DSH sidebar integration: closeKbPanel / softCloseKb / activePanelId "
            "monitor (usePanelInfo) / capture-phase nav-click fallback.",
            "Sidebar tracking: publishes sidebar width as --dsh-kb-left while open.",
            "md5 f5e7e7cfddcadbf12d547b9db2bd1a21 (415617 B), from the live 8.6 host copy.",
        ],
        "src/lib/index.js": [
            "Tool schema fix: property-level required:true moved to top-level required arrays "
            "(rag_query / rag_ingest / rag_note / rag_delete); strict OpenAI/Gemini endpoints "
            "no longer reject the request with HTTP 400.",
            "md5 375437b25223fac25474bcf19d4fcc30 (36473 B).",
        ],
        "src/package.json": ["version 0.3.16 -> 0.3.17"],
        "_unchanged_vs_0.3.16-sharedkb": [
            "sidecar/server.py", "cordis.patch.yml", "kb/config.json.template", "README.md",
            "verify.sh", "uninstall.sh", "extras/", "tools/", "sidecar/viewer/",
        ],
        "_note": (
            "Incremental over 0.3.16-sharedkb: only package/lib/client.js, package/lib/index.js, "
            "package/package.json and package/RELEASE-NOTES.md changed; every other member is "
            "byte-identical to the 0.3.16 baseline. releases/0.3.17-sharedkb/"
            "dsh-raganything-kb-0.3.17-sharedkb.tgz md5 8d5a94f80c89979f6c01f07dcfffd326."
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
