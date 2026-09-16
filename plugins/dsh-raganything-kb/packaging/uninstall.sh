#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# dsh-raganything-kb uninstall / rollback.
#
# Removes the plugin from the DSH profile, stops the sidecar and (optionally)
# deletes the knowledge-base home. Knowledge-base data is preserved unless
# --purge-data is given.
# ---------------------------------------------------------------------------
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_NAME="dsh-raganything-kb"
PROFILE=""; RAG_HOME=""; PURGE=0; KEEP_SERVICE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --profile)     PROFILE="$2"; shift 2 ;;
    --rag-home)    RAG_HOME="$2"; shift 2 ;;
    --purge-data)  PURGE=1; shift ;;
    --keep-service) KEEP_SERVICE=1; shift ;;
    -h|--help)     sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

RUN_USER="$(id -un)"
[ "$RUN_USER" = "root" ] && RUN_USER="${SUDO_USER:-root}"
RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
DSH_DIR="$RUN_HOME/.dsh"
[ -z "$RAG_HOME" ] && RAG_HOME="$DSH_DIR/raganything"
for p in web desktop default; do
  [ -z "$PROFILE" ] && [ -f "$DSH_DIR/profiles/$p/package.json" ] && PROFILE="$p"
done
PROFILE_DIR="$DSH_DIR/profiles/${PROFILE:-web}"
STAMP="$(date +%Y%m%d-%H%M%S)"

run_root() {
  if [ "$(id -u)" -eq 0 ]; then bash -c "$1"
  elif [ -n "${SUDO_PW:-}" ]; then printf '%s\n' "$SUDO_PW" | sudo -S -p '' bash -c "$1"
  else sudo bash -c "$1"; fi
}

echo "[1/5] stop sidecar"
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q '^raganything-sidecar\.service'; then
  run_root "systemctl stop raganything-sidecar; systemctl disable raganything-sidecar" >/dev/null 2>&1 && echo "  ✔ systemd service stopped"
  [ "$KEEP_SERVICE" = "0" ] && run_root "rm -f /etc/systemd/system/raganything-sidecar.service /etc/systemd/system/raganything-sidecar.service.d/hardening.conf; systemctl daemon-reload" >/dev/null 2>&1 && echo "  ✔ unit removed"
else
  PID_FILE="$RAG_HOME/sidecar.pid"
  [ -f "$PID_FILE" ] && { kill "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null; rm -f "$PID_FILE"; }
  # Anchored to this install's own venv — a bare `python.*server.py` pattern also
  # matches the systemd-managed host sidecar and other users' instances.
  pkill -f "$RAG_HOME/venv.*server\.py" 2>/dev/null && echo "  ✔ nohup sidecar killed" || echo "  · no sidecar process found"
fi

echo "[2/5] revert profile manifest"
python3 - "$PROFILE_DIR/package.json" "$PKG_NAME" "$STAMP" <<'PYEOF'
import json, shutil, sys
path, name, stamp = sys.argv[1:4]
man = json.load(open(path, encoding="utf-8"))
shutil.copy2(path, f"{path}.bak-uninstall-{stamp}")
(man.get("dependencies") or {}).pop(name, None)
prof = ((man.get("dsh") or {}).get("profile")) or {}
if "bundles" in prof:
    prof["bundles"] = [b for b in prof["bundles"] if b != name]
json.dump(man, open(path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
open(path, "a", encoding="utf-8").write("\n")
print("  ✔ dependency and bundle entry removed")
PYEOF

echo "[3/5] remove plugin directory"
[ -d "$PROFILE_DIR/node_modules/$PKG_NAME" ] && rm -rf "$PROFILE_DIR/node_modules/$PKG_NAME" && echo "  ✔ $PROFILE_DIR/node_modules/$PKG_NAME"

echo "[4/5] remove the nginx /rag/ proxy"
SNIP=/etc/nginx/dsh-rag-proxy.conf
if [ -e "$SNIP" ] && command -v nginx >/dev/null 2>&1; then
  run_root "for f in \$(find /etc/nginx/sites-enabled -maxdepth 1 -type f ! -name '*.bak*'); do
              if grep -q 'dsh-rag-proxy' \"\$f\"; then
                cp -a \"\$f\" \"\$f.bak-uninstall-$STAMP\"
                sed -i '/dsh-rag-proxy/d' \"\$f\"
                echo \"  ✔ unpatched \$f\"
              fi
            done
            rm -f '$SNIP'
            nginx -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1 && echo '  ✔ nginx reloaded'" \
    || echo "  ! nginx cleanup needs sudo — remove the include line by hand"
else
  echo "  · no /etc/nginx/dsh-rag-proxy.conf"
fi

echo "[5/5] knowledge-base data"
if [ "$PURGE" = "1" ]; then
  read -r -p "  type DELETE to erase $RAG_HOME: " ans
  [ "$ans" = "DELETE" ] && rm -rf "$RAG_HOME" && echo "  ✔ erased" || echo "  · aborted"
else
  echo "  · kept $RAG_HOME (stop the sidecar, then delete it by hand if you really want the data gone)"
  if ls -d "$RAG_HOME"/backup-portable-* >/dev/null 2>&1; then
    echo "  · the pre-install plugin copy is under $RAG_HOME/backup-portable-<stamp>/dsh-raganything-kb"
  fi
fi

if command -v systemctl >/dev/null 2>&1; then
  for svc in dsh-web dsh; do
    systemctl list-unit-files 2>/dev/null | grep -q "^$svc\.service" && run_root "systemctl restart $svc" >/dev/null 2>&1 && echo "  ✔ restarted $svc" && break
  done
fi
echo "done."
