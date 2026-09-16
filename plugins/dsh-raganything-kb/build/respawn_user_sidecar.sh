#!/usr/bin/env bash
# Restore a per-user KB sidecar that died **without auto-recovery**.
#
# WHY THIS EXISTS
# ---------------
# The host sidecar runs under systemd with `Restart=always`, so it heals itself.
# **Per-user instances are lazily spawned by the dsh-multi-user supervisor**, and
# once one is up the plugin adopts the running process instead of spawning a
# second one. So if something kills it — e.g. a portable installer's over-broad
# `pkill -f "python.*server.py"` (pre-0.3.12) — nothing brings it back, and the
# gateway starts answering:
#     502 rag sidecar on port <port> unreachable
#
# The spawn below is **env-identical to the plugin's own spawnSidecar()**:
#   cwd = <plugin>/sidecar
#   RAG_SIDECAR_{CONFIG,HOST,PORT}
#   the profile's own venv python
#   stdout/stderr appended to <ragHome>/logs/sidecar.log
# ...so the plugin adopts this process exactly as if it had started it. No
# restart of dsh-web is needed, and the gateway picks it up immediately.
#
# USAGE (on 8.6, as `lgsj` — no sudo, everything is under /home/lgsj)
# ----------------------------------------------------------------
#   USER=admin PORT=32001 bash respawn_user_sidecar.sh
#
# Slot -> port is 32000 + slot, so the admin slot (1) is 32001:
#   xiongsirui 32000 · admin 32001 · mason 32002 · chenning 32003
# First start of a cold instance takes >60s (venv + model probes) — the polling
# loop below allows 120s.
set -u
USER_NAME="${USER:-admin}"
PORT="${PORT:-32001}"
MU_ROOT="${MU_ROOT:-/home/lgsj/.dsh/multi-user/users}"

A="$MU_ROOT/$USER_NAME/home"
PLUGIN="$A/profiles/web/node_modules/dsh-raganything-kb"
RAGHOME="$A/raganything"

echo "== preflight =="
[ -d "$PLUGIN/sidecar" ] || { echo "!! sidecar dir missing: $PLUGIN/sidecar"; exit 1; }
[ -x "$RAGHOME/venv/bin/python" ] || { echo "!! venv python missing under $RAGHOME"; exit 1; }
ss -ltn 2>/dev/null | grep -q ":$PORT " && { echo "!! port $PORT already in use — aborting"; exit 1; }
echo "user=$USER_NAME port=$PORT plugin=$PLUGIN"

mkdir -p "$RAGHOME/logs"
cd "$PLUGIN/sidecar" || { echo "!! sidecar dir missing"; exit 1; }
export RAG_SIDECAR_CONFIG="$RAGHOME/config.json"
export RAG_SIDECAR_HOST=127.0.0.1
export RAG_SIDECAR_PORT="$PORT"
nohup "$RAGHOME/venv/bin/python" server.py >> "$RAGHOME/logs/sidecar.log" 2>&1 &
echo "spawned pid $! (log: $RAGHOME/logs/sidecar.log)"

for i in $(seq 1 40); do
  sleep 3
  code=$(curl -s -m 4 -o /tmp/respawn_health.json -w '%{http_code}' "http://127.0.0.1:$PORT/health" 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "health OK after $((i*3))s: $(head -c 200 /tmp/respawn_health.json)"
    exit 0
  fi
done
echo "!! sidecar did not answer /health within 120s (last http=$code)"
tail -15 "$RAGHOME/logs/sidecar.log"
exit 1
