#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Drive the 0.3.9 package build on 192.168.8.6 and pull the artifacts home.

  --mode build   upload the builder scripts and run them on the server
  --mode fetch   download the built artifacts into ./dist/
"""
import argparse
import hashlib
import importlib.util
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)

REMOTE_DIR = "build039"
DIST = os.path.join(BASE, "dist")
ARTIFACTS = [
    "dsh-raganything-kb-0.3.9-portable.tar.gz",
    "dsh-raganything-kb-0.3.9.tgz",
]
EXTRAS = ["dsh-raganything-kb-0.3.9-manifest.json", "dsh-raganything-kb-0.3.9-README.md"]

BUILD_SCRIPT = r"""
mkdir -p "$HOME/%(d)s"
cd "$HOME/%(d)s"
rm -f build039.log
python3 -u build_pkg039.py 2>&1 | tee build039.log
echo "BUILD_EXIT=${PIPESTATUS[0]}"
"""


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["build", "fetch"])
    ap.add_argument("--timeout", type=int, default=900)
    args = ap.parse_args()

    mod = load("ssh_86", os.path.join(BASE, "ssh_86.py"))
    cli = mod.connect()

    if args.mode == "build":
        sftp = cli.open_sftp()
        scripts = [os.path.join(BASE, "tools", "build_pkg039.py"),
                   os.path.join(BASE, "tools", "apply_norm_fix.py"),
                   os.path.join(BASE, "tools", "apply_count_rail_fix.py"),
                   os.path.join(BASE, "tools", "apply_extdist_fix.py")]
        try:
            sftp.mkdir(REMOTE_DIR)
        except IOError:
            pass
        for lp in scripts:
            rp = "%s/%s" % (REMOTE_DIR, os.path.basename(lp))
            sftp.put(lp, rp)
            print("uploaded %-24s %d bytes" % (os.path.basename(lp), os.path.getsize(lp)))
        sftp.close()
        st, out = mod.run(cli, BUILD_SCRIPT % {"d": REMOTE_DIR}, timeout=args.timeout)
        print(out)
        print("[exit=%s]" % st)
    else:
        os.makedirs(DIST, exist_ok=True)
        sftp = cli.open_sftp()
        for name in ARTIFACTS:
            rp = "/home/lgsj/%s" % name
            lp = os.path.join(DIST, name)
            sftp.get(rp, lp)
            print("  %-46s %9d bytes  md5=%s" % (name, os.path.getsize(lp), md5(lp)))
        M = "/home/lgsj/dsh-raganything-kb-0.3.9-portable/manifest.json"
        R = "/home/lgsj/dsh-raganything-kb-0.3.9-portable/README.md"
        sftp.get(M, os.path.join(DIST, EXTRAS[0]))
        sftp.get(R, os.path.join(DIST, EXTRAS[1]))
        for e in EXTRAS:
            print("  %-46s %9d bytes" % (e, os.path.getsize(os.path.join(DIST, e))))
        sftp.close()

    cli.close()


if __name__ == "__main__":
    main()
