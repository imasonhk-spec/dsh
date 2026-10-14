#!/usr/bin/env python3
"""Surgically switch the 12 dsh-raganything-kb installs on 8.6 from 0.3.15-sharedkb
to 0.3.16-sharedkb.  RUNS ON THE 8.6 HOST as lgsj (everything is under /home/lgsj,
no sudo needed for the file work; sudo is only used afterwards by the caller for
the service restarts).

Why not `pnpm install`: the host has no public egress, and a resolve step would
also wipe the `.bak-*` backups sitting inside node_modules.  The 0.3.16 payload is
byte-identical to 0.3.15 except `sidecar/server.py` (LF-normalised), `package.json`
(version) and `RELEASE-NOTES.md`, so a surgical sync is enough:

  1. profile `package.json`   : dep 0.3.15 -> 0.3.16            (backup first)
  2. profile `pnpm-lock.yaml` : 5 tgz refs + integrity + version line (backup first)
  3. installed payload        : only files whose bytes differ from the 0.3.16
                                tarball are rewritten (server.py / package.json /
                                RELEASE-NOTES.md), each with a `.bak-rel0316-<ts>`
  4. `sidecar/viewer/**` (187 files, 11 MB) is never touched (no diff by construction)

Usage:  python3 sync_0316.py [--apply]        (default = dry run)
Idempotent: a second --apply run reports "already 0.3.16" everywhere and changes
nothing.

Prereq: the 0.3.16 release tarball already uploaded to
        /home/lgsj/dsh-raganything-kb-0.3.16-sharedkb.tgz and extracted to
        /tmp/rel0316/package
"""
import base64
import hashlib
import json
import os
import re
import shutil
import sys
import tarfile
import time

H = "/home/lgsj"
REF = "/tmp/rel0316/package"
NEW_TGZ_NAME = "dsh-raganything-kb-0.3.16-sharedkb.tgz"
OLD_TGZ_NAME = "dsh-raganything-kb-0.3.15-sharedkb.tgz"
NEW_TGZ = f"{H}/{NEW_TGZ_NAME}"
NEW_DEP = f"file:{NEW_TGZ}"
OLD_DEP = f"file:{H}/{OLD_TGZ_NAME}"
NEW_VER = "0.3.16"
OLD_VER = "0.3.15"
TS = time.strftime("%Y%m%d-%H%M%S")
APPLY = "--apply" in sys.argv
EXPECT_REFS = 5

PROFILES = [
    ("host", f"{H}/.dsh/profiles/web"),
] + [
    (u, f"{H}/.dsh/multi-user/users/{u}/home/profiles/web")
    for u in ("admin", "chenning", "fresh1", "iso1", "mason", "minson",
              "test", "test01", "test02", "test3", "xiongsirui")
]


def sha512_b64(path):
    h = hashlib.sha512()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return "sha512-" + base64.b64encode(h.digest()).decode()


def md5f(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    # ---- reference sanity ----
    ref_pj = json.load(open(f"{REF}/package.json", encoding="utf-8"))
    assert ref_pj["version"] == NEW_VER, f"ref version {ref_pj['version']} != {NEW_VER}"
    ref_srv_md5 = md5f(f"{REF}/sidecar/server.py")
    assert ref_srv_md5 == "cc60b66917834cc7d0c6de1ddfe29b9a", f"ref server.py md5 {ref_srv_md5}"
    new_integ = sha512_b64(NEW_TGZ)
    # sanity: the OLD integrity recorded in the locks must match the OLD tarball
    old_integ = sha512_b64(f"{H}/{OLD_TGZ_NAME}")

    # payload inventory = every file in package/ (dirs implied), viewer included
    ref_files = {}
    with tarfile.open(NEW_TGZ) as t:
        for m in t.getmembers():
            if m.isfile():
                ref_files[m.name[len("package/"):]] = t.extractfile(m).read()
    n_viewer = len([k for k in ref_files if k.startswith("sidecar/viewer/")])

    print(json.dumps({
        "apply": APPLY, "ts": TS,
        "ref_version": ref_pj["version"], "ref_server_md5": ref_srv_md5,
        "payload_files": len(ref_files), "viewer_files": n_viewer,
        "new_integrity": new_integ, "old_integrity": old_integ,
    }, ensure_ascii=False, indent=1))

    results = []
    for user, prof in PROFILES:
        rec = {"user": user, "profile": prof, "actions": [], "ok": True}
        pkg = os.path.join(prof, "package.json")
        lock = os.path.join(prof, "pnpm-lock.yaml")
        pdir = os.path.join(prof, "node_modules", "dsh-raganything-kb")
        if not os.path.exists(pkg):
            rec["ok"], rec["error"] = False, "profile package.json missing"
            results.append(rec)
            continue

        # ---- 1) profile dependency string ----
        raw = open(pkg, encoding="utf-8").read()
        if NEW_DEP in raw and OLD_DEP not in raw:
            rec["actions"].append(f"dep already {NEW_VER} (skip)")
        elif raw.count(OLD_DEP) == 1:
            if APPLY:
                shutil.copy2(pkg, f"{pkg}.bak-rel0316-{TS}")
                open(pkg, "w", encoding="utf-8", newline="").write(
                    raw.replace(OLD_DEP, NEW_DEP))
            rec["actions"].append(f"dep {OLD_VER} -> {NEW_VER}")
        else:
            rec["ok"] = False
            rec["error"] = f"unexpected dep occurrence count: {raw.count(OLD_DEP)}"
            results.append(rec)
            continue

        # ---- 2) pnpm-lock.yaml ----
        lk = open(lock, encoding="utf-8").read()
        n_old, n_new = lk.count(OLD_TGZ_NAME), lk.count(NEW_TGZ_NAME)
        if n_new == EXPECT_REFS and n_old == 0 and new_integ in lk:
            rec["actions"].append(f"lock already {NEW_VER} (5 refs + new integrity)")
        elif n_old == EXPECT_REFS:
            if APPLY:
                shutil.copy2(lock, f"{lock}.bak-rel0316-{TS}")
            nl = lk.replace(OLD_TGZ_NAME, NEW_TGZ_NAME)
            # Rewrite the packages/ entry: integrity + version line.
            # NOTE: the recorded integrity is NOT trustworthy as an "old value"
            # anchor - the 0.3.15 rollout renamed the tgz but left 0.3.14's
            # integrity behind, so we replace whatever sha512- string is there.
            nl, nv = re.subn(
                r"(dsh-raganything-kb@file:[^\n]*\n\s*resolution: \{integrity: )"
                r"sha512-[A-Za-z0-9+/=]+"
                r"(, tarball: file:)([^\n}]+)"
                r"(\}\n\s*version: )[0-9][0-9.]*",
                lambda m: m.group(1) + new_integ + m.group(2) + m.group(3) + m.group(4) + NEW_VER,
                nl, count=1)
            assert nv == 1, f"{user}: lock entry (integrity+version) not rewritten"
            assert nl.count(OLD_TGZ_NAME) == 0, f"{user}: old tgz name still in lock"
            assert nl.count(NEW_TGZ_NAME) == EXPECT_REFS, f"{user}: new ref count wrong"
            if APPLY:
                open(lock, "w", encoding="utf-8", newline="").write(nl)
            rec["actions"].append(
                f"lock: 5 tgz refs renamed + integrity -> {new_integ[:24]}... + version -> {NEW_VER}")
        else:
            rec["ok"] = False
            rec["error"] = f"unexpected lock ref counts old={n_old} new={n_new}"
            results.append(rec)
            continue

        # ---- 3) installed payload (write only differing files) ----
        if not os.path.isdir(pdir):
            rec["actions"].append("installed dir missing (skip payload sync)")
            results.append(rec)
            continue
        wrote, skipped_viewer = [], 0
        for rel, data in sorted(ref_files.items()):
            dst = os.path.join(pdir, rel)
            if rel.startswith("sidecar/viewer/"):
                skipped_viewer += 1
                continue
            cur = None
            if os.path.isfile(dst):
                with open(dst, "rb") as f:
                    cur = f.read()
            if cur == data:
                continue
            if APPLY:
                if cur is not None:
                    shutil.copy2(dst, f"{dst}.bak-rel0316-{TS}")
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                with open(dst, "wb") as f:
                    f.write(data)
            wrote.append(rel)
        rec["actions"].append(
            f"payload rewritten: {wrote if wrote else 'none'} "
            f"(viewer/{skipped_viewer} files untouched)")
        rec["server_md5_after"] = md5f(os.path.join(pdir, "sidecar/server.py")) \
            if os.path.exists(os.path.join(pdir, "sidecar/server.py")) else "MISSING"
        rec["installed_version_after"] = json.load(
            open(os.path.join(pdir, "package.json"), encoding="utf-8"))["version"] \
            if os.path.exists(os.path.join(pdir, "package.json")) else "MISSING"
        results.append(rec)

    print(json.dumps({"results": results}, ensure_ascii=False, indent=1))
    bad = [r for r in results if not r["ok"]]
    print(f"\nSUMMARY: {len(results)} profiles, {len(bad)} failures")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
