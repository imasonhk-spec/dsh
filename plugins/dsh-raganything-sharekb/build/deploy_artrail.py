#!/usr/bin/env python3
"""Deploy the KB artifact-rail patch to all three DSH deployments.

  host "win"   : C:\\Users\\81901\\.dsh\\profiles\\desktop\\node_modules\\dsh-raganything-kb   (baseline)
  host "100"   : profiles/web + 01-DSH source (live100 fork), profiles/desktop (baseline)
  host "86"    : profiles/web + every multi-user per-user copy (fork86 fork)
"""
import argparse
import hashlib
import importlib.util
import os
import shutil
import sys
import time

BASE = r"C:\Users\81901\WorkBuddy\2026-09-11-07-04-09"
sys.path.insert(0, BASE)
TS = time.strftime("%Y%m%d-%H%M%S")
STAGE = "/tmp/kbartrail"

FILES = (("lib/client.js", "client.js"), ("sidecar/server.py", "server.py"))


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def push(sshmod, local_dir):
    cli = sshmod.connect()
    sftp = cli.open_sftp()
    try:
        sftp.mkdir(STAGE)
    except IOError:
        pass
    for rel, name in FILES:
        lp = os.path.join(local_dir, rel.replace("/", os.sep))
        sftp.put(lp, "%s/%s" % (STAGE, name))
        print("   staged %-18s %d bytes md5=%s" % (name, os.path.getsize(lp), md5(lp)))
    sftp.close()
    return cli


# --------------------------------------------------------------------------- windows
def deploy_win(local_dir):
    target = r"C:\Users\81901\.dsh\profiles\desktop\node_modules\dsh-raganything-kb"
    for rel, _ in FILES:
        dst = os.path.join(target, rel.replace("/", os.sep))
        src = os.path.join(local_dir, rel.replace("/", os.sep))
        bak = "%s.bak-artrail-%s" % (dst, TS)
        shutil.copy2(dst, bak)
        shutil.copy2(src, dst)
        print("   %-24s -> md5=%s" % (rel, md5(dst)))
    print("   backups: *.bak-artrail-%s" % TS)


# --------------------------------------------------------------------------- 100
SCRIPT_100 = r"""
set -e
TS="{TS}"; STAGE="{STAGE}"
install_one() {{
  D="$1"; CF="$2"; SF="$3"
  [ -d "$D" ] || {{ echo "   skip (absent) $D"; return 0; }}
  cp -a "$D/lib/client.js" "$D/lib/client.js.bak-artrail-$TS"
  cp -a "$D/sidecar/server.py" "$D/sidecar/server.py.bak-artrail-$TS"
  install -m 644 "$CF" "$D/lib/client.js"
  install -m 644 "$SF" "$D/sidecar/server.py"
  echo "   OK $D"
  echo "      client md5=$(md5sum "$D/lib/client.js" | cut -d' ' -f1)"
  echo "      server md5=$(md5sum "$D/sidecar/server.py" | cut -d' ' -f1)"
}}
install_one "$HOME/.dsh/profiles/web/node_modules/dsh-raganything-kb"     "$STAGE/client.js"          "$STAGE/server.py"
install_one "$HOME/01-DSH/04-RAG-Anything/dsh-raganything-kb"             "$STAGE/client.js"          "$STAGE/server.py"
install_one "$HOME/.dsh/profiles/desktop/node_modules/dsh-raganything-kb" "$STAGE/baseline_client.js" "$STAGE/baseline_server.py"
echo "---- restart dsh-web ----"
echo '{PW}' | sudo -S -p '' systemctl restart dsh-web
sleep 3
systemctl is-active dsh-web
echo "DONE"
"""


# --------------------------------------------------------------------------- 86
SCRIPT_86 = r"""
set -e
TS="{TS}"; STAGE="{STAGE}"
TARGETS="$HOME/.dsh/profiles/web/node_modules/dsh-raganything-kb"
for u in $(ls -1 "$HOME/.dsh/multi-user/users" 2>/dev/null); do
  P="$HOME/.dsh/multi-user/users/$u/home/profiles/web/node_modules/dsh-raganything-kb"
  [ -d "$P" ] && TARGETS="$TARGETS $P"
done
N=0
for D in $TARGETS; do
  cp -a "$D/lib/client.js" "$D/lib/client.js.bak-artrail-$TS"
  cp -a "$D/sidecar/server.py" "$D/sidecar/server.py.bak-artrail-$TS"
  install -m 644 "$STAGE/client.js" "$D/lib/client.js"
  install -m 644 "$STAGE/server.py" "$D/sidecar/server.py"
  N=$((N+1))
done
echo "   patched $N copies"
echo "   master client md5=$(md5sum "$HOME/.dsh/profiles/web/node_modules/dsh-raganything-kb/lib/client.js" | cut -d' ' -f1)"
echo "   master server md5=$(md5sum "$HOME/.dsh/profiles/web/node_modules/dsh-raganything-kb/sidecar/server.py" | cut -d' ' -f1)"
echo "---- restart dsh-web ----"
echo '{PW}' | sudo -S -p '' systemctl restart dsh-web
sleep 3
systemctl is-active dsh-web
echo "DONE"
"""


def _pw(env_name: str, host: str) -> str:
    """Return the SSH/sudo password for `host` from the environment.

    Credentials are deliberately NOT stored in this repository: export
    DSH_SSH_PW_100 / DSH_SSH_PW_86 before running a non-Windows deploy.
    """
    val = os.environ.get(env_name, "")
    if not val:
        raise SystemExit(
            "[FAIL] %s is not set (needed to deploy to %s).\n"
            "       Export it first, e.g.  export %s='<password>'" % (env_name, host, env_name)
        )
    return val


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", required=True, choices=["win", "100", "86", "all"])
    ap.add_argument("--timeout", type=int, default=300)
    args = ap.parse_args()

    todo = ["win", "100", "86"] if args.host == "all" else [args.host]

    for h in todo:
        print("=" * 62)
        print("HOST", h)
        print("=" * 62)
        if h == "win":
            deploy_win(os.path.join(BASE, "build", "rail"))
            continue

        if h == "100":
            mod = load("ssh_100", os.path.join(BASE, "ssh_100.py"))
            pw = _pw("DSH_SSH_PW_100", "100.100.6.55")
            cli = push(mod, os.path.join(BASE, "build", "live100_patched"))
            # stage the baseline-patched variant under a distinct name (for profiles/desktop)
            sftp = cli.open_sftp()
            for rel, name in FILES:
                lp = os.path.join(BASE, "build", "rail", rel.replace("/", os.sep))
                sftp.put(lp, "%s/baseline_%s" % (STAGE, name))
                print("   staged baseline_%-9s md5=%s" % (name, md5(lp)))
            sftp.close()
            script = SCRIPT_100.format(TS=TS, STAGE=STAGE, PW=pw)
            st, out = mod.run(cli, script, timeout=args.timeout)
            print(out)
            print("[exit=%s]" % st)
            cli.close()
        else:
            mod = load("ssh_86", os.path.join(BASE, "ssh_86.py"))
            pw = _pw("DSH_SSH_PW_86", "192.168.8.6")
            cli = push(mod, os.path.join(BASE, "build", "fork86_patched"))
            script = SCRIPT_86.format(TS=TS, STAGE=STAGE, PW=pw)
            st, out = mod.run(cli, script, timeout=args.timeout)
            print(out)
            print("[exit=%s]" % st)
            cli.close()


if __name__ == "__main__":
    main()
