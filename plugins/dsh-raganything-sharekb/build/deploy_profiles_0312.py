#!/usr/bin/env python3
"""Switch the 12 dsh-raganything-kb installs on 8.6 from 0.3.11-sharedkb to
0.3.12-sharedkb.  Runs ON the host as lgsj (no sudo needed: everything is under
/home/lgsj).

Why not `pnpm install`: the host has no public egress, and a resolve step would
also wipe the `.bak-*` backups sitting inside node_modules.  The inventory proved
the installed payload is already byte-identical to 0.3.12 except `package.json`
(version/CRLF) and the new RELEASE-NOTES.md, so a surgical sync is enough:
  1. profile package.json : dep 0.3.11 -> 0.3.12   (backup first)
  2. installed package.json: take the 0.3.12 one from the tarball (backup first)
  3. installed RELEASE-NOTES.md: add
Nothing else is touched; `.bak-*` backups are left in place.

Usage:  python3 deploy_profiles_0312.py [--apply]      (default = dry run)

WHERE THIS RUNS
---------------
**On the 8.6 host, as `lgsj`** (no sudo: everything lives under /home/lgsj).
All paths below are 8.6-absolute. Requires the 0.3.12 tarball already extracted to
/tmp/rel0312 (see inventory_profiles_0312.py, which does that extraction).

Idempotent: a second run reports "dep already 0.3.12" for all 12 and changes nothing.
"""
import hashlib
import json
import os
import shutil
import sys
import time

REF = "/tmp/rel0312/package"
OLD_DEP = "file:/home/lgsj/dsh-raganything-kb-0.3.11-sharedkb.tgz"
NEW_DEP = "file:/home/lgsj/dsh-raganything-kb-0.3.12-sharedkb.tgz"
TS = time.strftime("%Y%m%d-%H%M%S")
APPLY = "--apply" in sys.argv
SKIP = "/raganything/backup-portable-"

PROFILE_PKGS = [
    "/home/lgsj/.dsh/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/admin/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/chenning/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/fresh1/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/iso1/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/mason/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/minson/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/test/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/test01/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/test02/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/test3/home/profiles/web/package.json",
    "/home/lgsj/.dsh/multi-user/users/xiongsirui/home/profiles/web/package.json",
]

ref_pj = json.load(open(f"{REF}/package.json", encoding="utf-8"))
assert ref_pj["version"] == "0.3.12", ref_pj["version"]
ref_pj_bytes = open(f"{REF}/package.json", "rb").read()
ref_notes = open(f"{REF}/RELEASE-NOTES.md", "rb").read()


def md5b(b):
    return hashlib.md5(b).hexdigest()


results = []
for pkg in PROFILE_PKGS:
    rec = {"pkg": pkg, "actions": [], "ok": True}
    if not os.path.exists(pkg):
        rec["ok"], rec["error"] = False, "profile package.json missing"
        results.append(rec)
        continue
    prof = os.path.dirname(pkg)
    pdir = os.path.join(prof, "node_modules", "dsh-raganything-kb")
    raw = open(pkg, encoding="utf-8").read()

    # --- 1) profile dependency ---
    if NEW_DEP in raw:
        rec["actions"].append("dep already 0.3.12 (skip)")
    elif raw.count(OLD_DEP) == 1:
        if APPLY:
            shutil.copy2(pkg, f"{pkg}.bak-rel0312-{TS}")
            open(pkg, "w", encoding="utf-8").write(raw.replace(OLD_DEP, NEW_DEP))
        rec["actions"].append("dep 0.3.11 -> 0.3.12")
    else:
        rec["ok"] = False
        rec["error"] = f"unexpected dep occurrence count: {raw.count(OLD_DEP)}"
        results.append(rec)
        continue

    # --- 2) installed package.json ---
    ipj = os.path.join(pdir, "package.json")
    if not os.path.isdir(pdir):
        rec["actions"].append("installed dir missing (skip payload sync)")
    else:
        cur = open(ipj, "rb").read()
        if cur == ref_pj_bytes:
            rec["actions"].append("installed package.json already 0.3.12")
        else:
            ver = json.loads(cur.decode("utf-8")).get("version")
            if APPLY:
                shutil.copy2(ipj, f"{ipj}.bak-rel0312-{TS}")
                open(ipj, "wb").write(ref_pj_bytes)
            rec["actions"].append(f"installed package.json {ver} -> 0.3.12")

        notes = os.path.join(pdir, "RELEASE-NOTES.md")
        if os.path.exists(notes) and open(notes, "rb").read() == ref_notes:
            rec["actions"].append("RELEASE-NOTES.md already present")
        else:
            if APPLY:
                open(notes, "wb").write(ref_notes)
            rec["actions"].append("add RELEASE-NOTES.md")

    results.append(rec)

print(json.dumps({"apply": APPLY, "ts": TS, "results": results}, ensure_ascii=False, indent=1))
