#!/usr/bin/env python3
"""Inventory the dsh-raganything-kb installs on 8.6 (runs ON the host).

Reads-only. Extracts the new 0.3.12 tarball to /tmp/rel0312 and reports, for every
profile that depends on the plugin:
  - the dependency spec (which tarball path it points at)
  - whether node_modules/dsh-raganything-kb is a real dir or a symlink (into .pnpm?)
  - file-level diff of the installed copy vs the 0.3.12 payload
Outputs JSON on stdout.

WHERE THIS RUNS
---------------
**On the 8.6 host, as `lgsj`**. Read-only — it never writes to any profile.
Side effect: extracts the 0.3.12 tarball to /tmp/rel0312 for comparison.
"""
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import tarfile

TGZ = "/home/lgsj/dsh-raganything-kb-0.3.12-sharedkb.tgz"
EXPECT_MD5 = "d6c076e84cf89e193afcd50be5502fa1"
REF = pathlib.Path("/tmp/rel0312/package")
SKIP_PREFIX = ("node_modules", ".git", "__pycache__")

out = {"tarball": {}, "profiles": [], "errors": []}


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


# ---- tarball present + md5 + extract ----
if not os.path.exists(TGZ):
    out["tarball"] = {"exists": False}
else:
    m = md5(TGZ)
    out["tarball"] = {"exists": True, "size": os.path.getsize(TGZ), "md5": m,
                      "match": m == EXPECT_MD5}
    if REF.exists():
        subprocess.run(["rm", "-rf", str(REF.parent)], check=False)
    os.makedirs(REF.parent, exist_ok=True)
    with tarfile.open(TGZ) as t:
        t.extractall(REF.parent, filter="data")
    out["tarball"]["extracted"] = REF.is_dir()

ref_files = {}
if REF.is_dir():
    for p in REF.rglob("*"):
        if p.is_file():
            ref_files[str(p.relative_to(REF))] = (p.stat().st_size, md5(p))
out["ref_file_count"] = len(ref_files)

# ---- find profile package.json (not under node_modules) ----
r = subprocess.run(
    ["bash", "-lc",
     "find /home/lgsj/.dsh -name package.json -not -path '*/node_modules/*' "
     "-exec grep -l 'dsh-raganything-kb' {} + 2>/dev/null"],
    capture_output=True, text=True)
profiles = sorted(set(x for x in r.stdout.split("\n") if x.strip()))
out["profile_count"] = len(profiles)

for pkg in profiles:
    prof = os.path.dirname(pkg)
    rec = {"profile": prof, "pkg": pkg}
    try:
        cfg = json.load(open(pkg, encoding="utf-8"))
        rec["dep"] = cfg.get("dependencies", {}).get("dsh-raganything-kb")
    except Exception as e:  # noqa: BLE001
        rec["error"] = f"pkg parse: {e}"
        out["profiles"].append(rec)
        continue

    pdir = os.path.join(prof, "node_modules", "dsh-raganything-kb")
    rec["plugin_dir"] = pdir
    rec["exists"] = os.path.exists(pdir)
    rec["is_symlink"] = os.path.islink(pdir)
    if rec["is_symlink"]:
        rec["symlink_target"] = os.path.realpath(pdir)
    if rec["exists"]:
        real = os.path.realpath(pdir)
        rec["realpath"] = real
        live = {}
        for dp, dns, fns in os.walk(real):
            dns[:] = [d for d in dns if d not in ("__pycache__", ".git")]
            for fn in fns:
                fp = os.path.join(dp, fn)
                if os.path.islink(fp):
                    continue
                rel = os.path.relpath(fp, real)
                live[rel] = (os.path.getsize(fp), md5(fp))
        rec["live_file_count"] = len(live)
        only_live = sorted(set(live) - set(ref_files))
        only_ref = sorted(set(ref_files) - set(live))
        mismatch = sorted(k for k in set(live) & set(ref_files)
                          if live[k][1] != ref_files[k][1])
        rec["diff"] = {
            "only_live": only_live,
            "only_ref": only_ref,
            "md5_mismatch": mismatch,
        }
        # version actually installed
        try:
            rec["installed_version"] = json.load(
                open(os.path.join(real, "package.json"), encoding="utf-8"))["version"]
        except Exception:  # noqa: BLE001
            rec["installed_version"] = None
    out["profiles"].append(rec)

print(json.dumps(out, ensure_ascii=False, indent=1))
