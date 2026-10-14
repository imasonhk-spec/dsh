#!/usr/bin/env bash
# Re-run the sandbox drill against the FIXED portable package and prove it no
# longer kills unrelated sidecars: the production processes (host systemd
# sidecar + admin's instance sidecar) must be identical before and after.
#
# WHERE THIS RUNS
# ---------------
# On a host that already runs production sidecars — the whole point is to prove a
# sandbox install does NOT touch them. On 8.6, as lgsj.
#
#   PKG=/tmp/dsh-raganything-kb-0.3.12-sharedkb-portable.tar.gz \
#       bash drill_0312_no_collateral_kill.sh
#
# Exit code 0 == no collateral kill. Regressions from the pre-0.3.12 installer
# (bare `pkill -f "python.*server.py"`) show up as a non-empty diff.
set -u
PKG="${PKG:-/tmp/dsh-raganything-kb-0.3.12-sharedkb-portable.tar.gz}"
[ -f "$PKG" ] || { echo "portable tarball not found: $PKG (set \$PKG)"; exit 2; }
echo "== production sidecars BEFORE =="
pgrep -af 'server\.py' | sed 's/  */ /g' > /tmp/before.txt; cat /tmp/before.txt

rm -rf /tmp/drill0312b /tmp/pkg0312b
mkdir -p /tmp/drill0312b/.dsh/profiles/web /tmp/pkg0312b
printf '{\n  "name": "dsh-profile-web",\n  "version": "0.0.0-drill",\n  "dependencies": {}\n}\n' \
  > /tmp/drill0312b/.dsh/profiles/web/package.json
tar xzf "$PKG" -C /tmp/pkg0312b
D=$(find /tmp/pkg0312b -maxdepth 1 -mindepth 1 -type d | head -1)
[ -n "$D" ] || { echo "archive has no top-level dir"; exit 2; }

echo "== install (isolated HOME, --no-systemd/--no-nginx/--no-pnpm/--skip-venv) =="
( cd "$D" && HOME=/tmp/drill0312b bash ./install.sh --profile web \
    --rag-home /tmp/drill0312b/.dsh/raganything --port 17999 --dsh-port 17998 \
    --skip-venv --no-systemd --no-nginx --no-restart --no-pnpm -y 2>&1 | tail -18 )

echo "== production sidecars AFTER =="
pgrep -af 'server\.py' | sed 's/  */ /g' > /tmp/after.txt; cat /tmp/after.txt
echo "== diff (empty == installer no longer kills unrelated sidecars) =="
RC=0
if diff /tmp/before.txt /tmp/after.txt; then echo "NO COLLATERAL KILL ✅"; else echo "COLLATERAL KILL ❌"; RC=1; fi

echo "== viewer landed in the drilled install? =="
find /tmp/drill0312b/.dsh/profiles/web/node_modules/dsh-raganything-kb/sidecar/viewer -type f | wc -l
echo "== anything left listening on 17999? =="
ss -ltn 2>/dev/null | grep -c ':17999'

rm -rf /tmp/drill0312b /tmp/pkg0312b /tmp/before.txt /tmp/after.txt
echo "== drill dirs cleaned =="
exit $RC
