#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# dsh-raganything-kb portable installer
#
# Installs the DSH knowledge-base plugin (host plugin + in-DSH UI + Python
# sidecar) into a DeepSeek Harness profile on THIS machine and brings it up
# without any further manual configuration.
#
# Cross-platform: x86_64 / aarch64, NVIDIA CUDA / AMD ROCm / plain CPU.
# Idempotent: safe to re-run; existing knowledge-base data is never touched.
#
# Run it as the user that owns the DSH installation:
#     ./install.sh --profile web
#   with sudo available (optional password via env):
#     SUDO_PW='...' ./install.sh --profile web
#
# Options: see usage() below.
# ---------------------------------------------------------------------------
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_NAME="dsh-raganything-kb"
PKG_VERSION="0.3.9"
STAMP="$(date +%Y%m%d-%H%M%S)"

# ---------------------------------------------------------------- defaults --
PROFILE=""
RAG_HOME=""
PORT="17321"
DSH_PORT="3080"
REUSE_VENV=""
SKIP_VENV=0
USE_SYSTEMD=1
USE_NGINX=1
USE_PNPM=1
DO_RESTART=1
API_KEY="${RAG_LLM_API_KEY:-}"
ASSUME_YES=0
OFFLINE_MODEL=""

usage() {
  cat <<'USAGE'
dsh-raganything-kb portable installer

Installs the DSH knowledge-base plugin (host plugin + in-DSH UI + Python
sidecar) into a DeepSeek Harness profile on THIS machine and brings it up
without any further manual configuration.
Cross-platform (x86_64 / aarch64, CUDA / ROCm / CPU), idempotent, and it
never touches existing knowledge-base data.

  ./install.sh --profile web          # as the DSH owner user
  SUDO_PW='...' ./install.sh          # non-interactive sudo

Options:
  --profile NAME      DSH profile to install into (default: auto-detect)
  --rag-home PATH     Knowledge-base home (default: ~/.dsh/raganything)
  --port N            Sidecar port (default: 17321)
  --dsh-port N        DSH web port used for reverse-proxy detection (default: 3080)
  --reuse-venv PATH   Reuse an existing Python venv instead of building one
  --offline-model P   Copy the bge-m3 GGUF from PATH instead of downloading
  --api-key KEY       LLM API key (default: read from ~/.dsh/.credentials.yaml
                      refs.TOKENSTORE_API_KEY)
  --no-systemd        Supervise the sidecar with nohup instead of systemd
  --no-nginx          Skip the HTTPS /rag/ reverse-proxy step
  --no-restart        Do not restart the DSH web service
  --skip-venv         Do not create or verify the Python venv
  --no-pnpm           Offline: direct copy only, never call pnpm
  -y                  Do not prompt
  -h, --help          This help
USAGE
}

log()  { printf '\033[1;34m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
ok()   { printf '\033[1;32m  ✔\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  ! \033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m  ✘ %s\033[0m\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --profile)      PROFILE="$2"; shift 2 ;;
    --rag-home)     RAG_HOME="$2"; shift 2 ;;
    --port)         PORT="$2"; shift 2 ;;
    --dsh-port)     DSH_PORT="$2"; shift 2 ;;
    --reuse-venv)   REUSE_VENV="$2"; shift 2 ;;
    --offline-model) OFFLINE_MODEL="$2"; shift 2 ;;
    --api-key)      API_KEY="$2"; shift 2 ;;
    --no-systemd)   USE_SYSTEMD=0; shift ;;
    --no-nginx)     USE_NGINX=0; shift ;;
    --no-restart)   DO_RESTART=0; shift ;;
    --skip-venv)    SKIP_VENV=1; shift ;;
    --no-pnpm)      USE_PNPM=0; shift ;;
    -y)             ASSUME_YES=1; shift ;;
    -h|--help)      usage; exit 0 ;;
    *)              die "unknown option: $1 (try --help)" ;;
  esac
done

# ------------------------------------------------------------------ helpers --
RUN_USER="$(id -un)"
RUN_HOME="${HOME}"
if [ "$RUN_USER" = "root" ]; then
  if [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != "root" ]; then
    RUN_USER="${SUDO_USER}"
    RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
  else
    die "run this installer as the DSH owner user (not root), e.g.: sudo -u <user> ./install.sh --profile web"
  fi
fi

# Run one shell command string as root (avoids the `sudo a && b` trap where
# only `a` is privileged).
SU_ROOT=""
[ "$(id -u)" -eq 0 ] && SU_ROOT="root"
run_root() {
  if [ "$SU_ROOT" = "root" ]; then
    bash -c "$1"
  elif [ -n "${SUDO_PW:-}" ]; then
    printf '%s\n' "$SUDO_PW" | sudo -S -p '' bash -c "$1"
  else
    sudo bash -c "$1"
  fi
}
have_sudo() {
  [ "$SU_ROOT" = "root" ] && return 0
  if [ -n "${SUDO_PW:-}" ]; then
    printf '%s\n' "$SUDO_PW" | sudo -S -p '' true 2>/dev/null
  else
    sudo -n true 2>/dev/null
  fi
}

# ------------------------------------------------------------------- step 0 --
log "dsh-raganything-kb $PKG_VERSION portable installer"
log "host: $(uname -m) $(uname -s) · user: $RUN_USER · home: $RUN_HOME"

ARCH="$(uname -m)"
DSH_DIR="$RUN_HOME/.dsh"
[ -z "$RAG_HOME" ] && RAG_HOME="$DSH_DIR/raganything"
RAG_HOME="${RAG_HOME/#\~/$RUN_HOME}"
VENV_DIR="$RAG_HOME/venv"

[ -f "$HERE/plugin/$PKG_NAME-$PKG_VERSION.tgz" ] || die "package payload missing: plugin/$PKG_NAME-$PKG_VERSION.tgz"
[ -f "$HERE/payload/sidecar/server.py" ]         || die "package payload missing: payload/sidecar/server.py"

# GPU / device detection ----------------------------------------------------
DEVICE="cpu"; GPU_KIND="none"
if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1; then
  DEVICE="cuda"; GPU_KIND="nvidia"
  ok "GPU: NVIDIA detected ($(nvidia-smi -L 2>/dev/null | head -1))"
elif [ -e /dev/kfd ] || [ -e /dev/dri/renderD128 ]; then
  DEVICE="cpu"; GPU_KIND="amd-nodriver"
  warn "GPU: AMD render node present but no CUDA runtime — using CPU for torch-side models"
fi
[ "$DEVICE" = "cpu" ] && ok "GPU: none — CPU inference (llama.cpp / transformers)"

# Python --------------------------------------------------------------------
PY=""
for c in python3 python3.12 python3.11 python3.10; do
  if command -v "$c" >/dev/null 2>&1; then
    v="$("$c" -c 'import sys;print(sys.version_info[0]*100+sys.version_info[1])' 2>/dev/null || echo 0)"
    if [ "${v:-0}" -ge 310 ] 2>/dev/null; then PY="$(command -v "$c")"; break; fi
  fi
done
[ -n "$PY" ] || die "python3 >= 3.10 not found — install python3 first"
ok "python: $PY ($("$PY" -V 2>&1))"

# ------------------------------------------------------- DSH profile detect --
if [ -z "$PROFILE" ]; then
  for p in web desktop default; do
    [ -f "$DSH_DIR/profiles/$p/package.json" ] && { PROFILE="$p"; break; }
  done
fi
[ -n "$PROFILE" ] || die "cannot auto-detect the DSH profile — pass --profile <name>"
PROFILE_DIR="$DSH_DIR/profiles/$PROFILE"
[ -f "$PROFILE_DIR/package.json" ] || die "profile manifest not found: $PROFILE_DIR/package.json"
ok "DSH profile: $PROFILE ($PROFILE_DIR)"

# DSH installation directory (for `dsh plugin` / the web service) -------------
DSH_INSTALL=""
if command -v systemctl >/dev/null 2>&1; then
  for svc in dsh-web dsh dsh-desktop; do
    wd="$(systemctl show "$svc" -p WorkingDirectory --value 2>/dev/null)"
    [ -n "$wd" ] && [ -d "$wd" ] && [ -f "$wd/package.json" ] && { DSH_INSTALL="$wd"; break; }
  done
fi
if [ -z "$DSH_INSTALL" ]; then
  for d in "$RUN_HOME"/deepseek-harness* "$RUN_HOME"/dsh; do
    [ -d "$d" ] && [ -f "$d/package.json" ] && { DSH_INSTALL="$d"; break; }
  done
fi
[ -n "$DSH_INSTALL" ] && ok "DSH install dir: $DSH_INSTALL" || warn "DSH install dir not detected (direct-copy install path will be used)"

PNPM="$(command -v pnpm || echo '')"
[ -z "$PNPM" ] && warn "pnpm not found on PATH"

# ============================================================== 1) payload ===
log "1/9 install plugin payload"
TARGET="$PROFILE_DIR/node_modules/$PKG_NAME"
if [ -d "$TARGET" ]; then
  BK="$RAG_HOME/backup-portable-$STAMP"
  mkdir -p "$BK"
  cp -a "$TARGET" "$BK/$PKG_NAME" 2>/dev/null && ok "backed up existing plugin → $BK/$PKG_NAME"
fi

# Idempotent, byte-exact payload write. This is the authoritative install: it
# works with or without pnpm, a lockfile, or network access, and it re-asserts
# the plugin files after any pnpm pass that may have relinked the directory.
materialize_payload() {
  mkdir -p "$TARGET/lib" "$TARGET/sidecar" "$TARGET/kb"
  cp -a "$HERE/payload/package.json"            "$TARGET/package.json"
  cp -a "$HERE/payload/README.md"               "$TARGET/README.md"
  cp -a "$HERE/payload/cordis.patch.yml"        "$TARGET/cordis.patch.yml"
  cp -a "$HERE/payload/kb/config.json.template" "$TARGET/kb/config.json.template"
  cp -a "$HERE/payload/lib/."                   "$TARGET/lib/"
  cp -a "$HERE/payload/sidecar/server.py"       "$TARGET/sidecar/server.py"
  # OFV viewer assets (pdf.js cmaps / standard fonts / ofv bundle). The sidecar
  # mounts them statically at /viewer/*; without them 「打开原始文件」on Office /
  # PDF artifacts has nothing to render. Older payloads did not ship this dir,
  # so it is copied only when present (keeps this installer backwards-compatible).
  if [ -d "$HERE/payload/sidecar/viewer" ]; then
    mkdir -p "$TARGET/sidecar/viewer"
    cp -a "$HERE/payload/sidecar/viewer/." "$TARGET/sidecar/viewer/"
  fi
  # prune stale hand-made backups carried over from a previous install
  find "$TARGET" -name '*.bak-*' -type f -delete 2>/dev/null
}
materialize_payload
INSTALLED_VER="$("$PY" -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$TARGET/package.json")"
ok "payload → $TARGET (v$INSTALLED_VER)"

# =============================================== 2) distribution tarball ====
log "2/9 stage distribution tarball"
TGZ_DEST="$RUN_HOME/$PKG_NAME-$PKG_VERSION.tgz"
cp -f "$HERE/plugin/$PKG_NAME-$PKG_VERSION.tgz" "$TGZ_DEST"
ok "$TGZ_DEST"

# ========================================= 3) profile manifest reconcile ===
log "3/9 reconcile profile manifest (dependencies + bundles)"
"$PY" - "$PROFILE_DIR/package.json" "$TGZ_DEST" "$PKG_NAME" "$STAMP" <<'PYEOF'
import json, shutil, sys
path, tgz, name, stamp = sys.argv[1:5]
with open(path, encoding="utf-8") as fh:
    man = json.load(fh)
shutil.copy2(path, f"{path}.bak-portable-{stamp}")
man.setdefault("dependencies", {})[name] = f"file:{tgz}"
man.setdefault("dsh", {}).setdefault("profile", {})
bundles = man["dsh"]["profile"].setdefault("bundles", [])
# exactly once — a duplicate id crashes the DSH loader
removed = bundles.count(name)
bundles[:] = [b for b in bundles if b != name]
bundles.append(name)
with open(path, "w", encoding="utf-8") as fh:
    json.dump(man, fh, indent=2, ensure_ascii=False)
    fh.write("\n")
print(f"  ✔ dependencies.{name} = file:{tgz}")
print(f"  ✔ bundles += {name} (deduped {removed} stale entr{'y' if removed == 1 else 'ies'})")
PYEOF

# ============================================== 4) materialize node module ==
log "4/9 materialize node module"
DONE_CLI=0
if [ "$USE_PNPM" = "1" ] && [ -n "$PNPM" ] && [ -n "$DSH_INSTALL" ]; then
  # `dsh plugin add` is a pnpm forwarder that runs with cwd = the profile dir
  # and then reconciles dsh.profile.bundles against the installed state. It is
  # the canonical path (it also refreshes pnpm-lock.yaml); the payload copy
  # below stays authoritative either way.
  if ( cd "$DSH_INSTALL" && "$PNPM" dsh plugin --profile "$PROFILE" add "$TGZ_DEST" ) \
       >"$RAG_HOME/logs/plugin-add.log" 2>&1; then
    DONE_CLI=1
    ok "dsh plugin add completed (pnpm)"
  else
    warn "dsh plugin add failed — see $RAG_HOME/logs/plugin-add.log; using the direct copy"
  fi
elif [ "$USE_PNPM" = "0" ]; then
  ok "--no-pnpm: direct-copy install"
else
  warn "pnpm or the DSH install dir unavailable — direct-copy install"
fi
INSTALLED_VER="$("$PY" -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$TARGET/package.json")"
if [ "$INSTALLED_VER" != "$PKG_VERSION" ]; then
  warn "plugin dir is v$INSTALLED_VER after the pnpm pass — re-asserting the payload"
fi
materialize_payload
INSTALLED_VER="$("$PY" -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$TARGET/package.json")"
[ "$INSTALLED_VER" = "$PKG_VERSION" ] || die "plugin payload is v$INSTALLED_VER, expected $PKG_VERSION"
ok "plugin in place: $TARGET (v$INSTALLED_VER)"

# ==================================================== 5) knowledge-base home =
log "5/9 prepare knowledge-base home"
mkdir -p "$RAG_HOME"/{storage,output,logs,models,trash,versions}
ok "$RAG_HOME/{storage,output,logs,models}"

# ============================================== 6) sidecar config (adapted) =
log "6/9 generate/adapt sidecar config"
"$PY" "$HERE/tools/adapt_config.py" \
  --config "$RAG_HOME/config.json" \
  --template "$HERE/payload/kb/config.json.template" \
  --rag-home "$RAG_HOME" --port "$PORT" --device "$DEVICE" || die "config adaptation failed"

# ==================================================== 7) python environment ==
log "7/9 python environment"
if [ "$SKIP_VENV" = "1" ]; then
  warn "--skip-venv: leaving the venv untouched"
else
  if [ -n "$REUSE_VENV" ]; then
    REUSE_VENV="${REUSE_VENV/#\~/$RUN_HOME}"
    if [ -d "$REUSE_VENV" ] && [ -x "$REUSE_VENV/bin/python" ]; then
      if [ "$REUSE_VENV" != "$VENV_DIR" ]; then
        [ -e "$VENV_DIR" ] && mv "$VENV_DIR" "$VENV_DIR.bak-$STAMP"
        ln -sfn "$REUSE_VENV" "$VENV_DIR"
      fi
      ok "reusing venv $REUSE_VENV"
    else
      die "--reuse-venv path is not a usable venv: $REUSE_VENV"
    fi
  fi
  if [ -x "$VENV_DIR/bin/python" ] && "$VENV_DIR/bin/python" -c 'import raganything, fastapi, uvicorn' >/dev/null 2>&1; then
    ok "venv already provisioned: $VENV_DIR"
  else
    if [ ! -x "$VENV_DIR/bin/python" ]; then
      log "  creating venv at $VENV_DIR"
      "$PY" -m venv "$VENV_DIR" || die "venv creation failed (install python3-venv)"
    fi
    PIP_INDEX="${PIP_INDEX_URL:-https://mirrors.aliyun.com/pypi/simple/}"
    log "  pip install raganything / fastapi / uvicorn / mineru (this can take a while)"
    "$VENV_DIR/bin/pip" install --upgrade pip -i "$PIP_INDEX" >/dev/null 2>&1
    "$VENV_DIR/bin/pip" install -i "$PIP_INDEX" \
      'raganything[text]' fastapi 'uvicorn[standard]' 'mineru[core]' \
      python-docx openpyxl python-pptx >"$RAG_HOME/logs/pip-install.log" 2>&1 \
      || die "pip install failed — see $RAG_HOME/logs/pip-install.log"
    ok "python deps installed"
  fi
fi

# llama-cpp-python + default bge-m3 GGUF: the sidecar self-provisions these on
# first start. Seed them from an offline copy when one is supplied.
if [ -n "$OFFLINE_MODEL" ]; then
  SRC="${OFFLINE_MODEL/#\~/$RUN_HOME}"
  DEST="$RAG_HOME/models/bge-m3-f16"
  mkdir -p "$DEST"
  if [ -d "$SRC" ]; then cp -a "$SRC"/. "$DEST"/; else cp -a "$SRC" "$DEST/bge-m3-FP16.gguf"; fi
  ok "seeded embedding model from $SRC → $DEST"
else
  ok "embedding model: auto-downloaded by the sidecar on first start (hf-mirror)"
fi

# ==================================================== 8) service + API key ==
log "8/9 service supervision and credentials"
ENV_FILE="$RAG_HOME/sidecar.env"
# A key already present in sidecar.env is the one this host is proven to run
# with — never silently swap it for a different one, or a working install
# regresses into 401s. The credentials store is only the fallback.
EXISTING_KEY=""
if [ -f "$ENV_FILE" ]; then
  cp -a "$ENV_FILE" "$ENV_FILE.bak-portable-$STAMP"
  EXISTING_KEY="$(sed -n 's/^RAG_LLM_API_KEY=//p' "$ENV_FILE" | head -1)"
fi
if [ -z "$API_KEY" ] && [ -f "$DSH_DIR/.credentials.yaml" ]; then
  API_KEY="$("$PY" - "$DSH_DIR/.credentials.yaml" <<'PYEOF'
import re, sys
try:
    txt = open(sys.argv[1], encoding="utf-8").read().splitlines()
except Exception:
    sys.exit(0)
inrefs = False
for line in txt:
    if re.match(r'^refs:\s*(#.*)?$', line):
        inrefs = True; continue
    if not inrefs:
        continue
    if re.match(r'^\S', line):
        break
    m = re.match(r'^ {2}(TOKENSTORE_API_KEY|RAGANYTHING_LLM_API_KEY|LLM_API_KEY):\s*(.*)$', line)
    if m:
        v = m.group(2).strip()
        q = re.match(r'^(["\'])(.*)\1$', v)
        print(q.group(2) if q else v)
        break
PYEOF
)"
  [ -n "$API_KEY" ] && ok "API key resolved from $DSH_DIR/.credentials.yaml (refs)"
fi
if [ -n "$EXISTING_KEY" ] && [ "$EXISTING_KEY" != "$API_KEY" ]; then
  warn "keeping the RAG_LLM_API_KEY already in $ENV_FILE (differs from the credentials store)"
  API_KEY="$EXISTING_KEY"
fi
if [ -n "$EXISTING_KEY" ]; then
  ok "previous $ENV_FILE saved as $ENV_FILE.bak-portable-$STAMP"
fi
umask 077
{
  echo "RAG_LLM_API_KEY=${API_KEY}"
  echo "RAG_SIDECAR_CONFIG=$RAG_HOME/config.json"
  echo "RAG_SIDECAR_HOST=0.0.0.0"
  echo "RAG_SIDECAR_PORT=$PORT"
  echo "RAG_SIDECAR_TOKEN="
  echo "PYTHONUNBUFFERED=1"
} > "$ENV_FILE"
umask 022
chmod 600 "$ENV_FILE"
if [ -n "$API_KEY" ]; then ok "$ENV_FILE (key present, mode 600)"; else warn "$ENV_FILE written WITHOUT a key — add RAG_LLM_API_KEY there"; fi

SVC="raganything-sidecar"
if [ "$USE_SYSTEMD" = "1" ] && command -v systemctl >/dev/null 2>&1 && have_sudo; then
  UNIT_SRC="$HERE/extras/raganything-sidecar.service"
  UNIT_TMP="$(mktemp)"
  sed -e "s#__USER__#$RUN_USER#g" \
      -e "s#__WORKDIR__#$TARGET/sidecar#g" \
      -e "s#__VENVBIN__#$VENV_DIR/bin#g" \
      -e "s#__VENV__#$VENV_DIR/bin/python#g" \
      -e "s#__ENVFILE__#$ENV_FILE#g" \
      -e "s#__LOGDIR__#$RAG_HOME/logs#g" \
      "$UNIT_SRC" > "$UNIT_TMP"
  run_root "install -m 0644 '$UNIT_TMP' /etc/systemd/system/$SVC.service" \
    && ok "systemd unit /etc/systemd/system/$SVC.service"
  run_root "mkdir -p /var/log/raganything && chown $RUN_USER /var/log/raganything" >/dev/null 2>&1
  run_root "systemctl daemon-reload && systemctl enable $SVC >/dev/null 2>&1 && systemctl restart $SVC" \
    && ok "systemd service $SVC enabled + restarted" \
    || warn "systemd start failed — check: journalctl -u $SVC -n 50"
  rm -f "$UNIT_TMP"
else
  warn "systemd unavailable/disabled — supervising with nohup"
  # PID_FILE lives under this install's own RAG_HOME, not in the shared /tmp
  # namespace: on a multi-user host two installs would otherwise overwrite each
  # other's pid and kill the wrong process.
  PID_FILE="$RAG_HOME/sidecar.pid"
  if [ -f "$PID_FILE" ]; then
    kill "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null
    rm -f "$PID_FILE"
  fi
  # Stop only THIS install's sidecar: anchor the pattern to our own venv path.
  # A bare `pkill -f "python.*server.py"` also matches the systemd-managed host
  # sidecar and every other user's lazily spawned instance on a multi-user host
  # — observed 2026-09-15: a sandbox drill killed two unrelated production
  # sidecars (Restart=always only rescued the systemd one).
  pkill -f "$VENV_DIR.*server\.py" 2>/dev/null
  sleep 1
  ( cd "$TARGET/sidecar" && set -a && . "$ENV_FILE" && set +a && \
    nohup "$VENV_DIR/bin/python" server.py >>"$RAG_HOME/logs/sidecar.log" 2>&1 & echo $! > "$PID_FILE" )
  sleep 2
  ok "sidecar started (nohup, pid $(cat "$PID_FILE" 2>/dev/null))"
fi

# ================================================= 9) HTTPS /rag/ proxy ====
log "9/9 browser access path"
if [ "$USE_NGINX" = "1" ] && [ -d /etc/nginx ] && have_sudo; then
  SNIP=/etc/nginx/dsh-rag-proxy.conf
  run_root "install -m 0644 '$HERE/extras/dsh-rag-proxy.conf' '$SNIP'" >/dev/null 2>&1 \
    && ok "$SNIP"
  # /etc/nginx/sites-enabled is root-owned, so the injector must run as root
  # (it writes both the site file and its .bak-portable-<stamp> backup).
  PATCH_CMD="$PY $HERE/tools/patch_nginx.py --dsh-port $DSH_PORT --snippet $SNIP --stamp $STAMP"
  CHANGED="$(run_root "$PATCH_CMD" 2>&1 | tail -1)"
  case "$CHANGED" in
    *injected*|*patched*)
      run_root "nginx -t" >/dev/null 2>&1 && run_root "systemctl reload nginx" >/dev/null 2>&1 \
        && ok "nginx reloaded — https://<host>:<port>/rag/ now proxies the sidecar" \
        || warn "nginx test/reload failed — inspect manually"
      ;;
    *) ok "nginx already routes /rag/ (no change)" ;;
  esac
else
  warn "nginx step skipped — the browser panel will use http://<host>:$PORT directly"
fi

# ------------------------------------------------------------- DSH restart --
if [ "$DO_RESTART" = "1" ] && command -v systemctl >/dev/null 2>&1; then
  for svc in dsh-web dsh dsh-desktop; do
    if systemctl list-unit-files 2>/dev/null | grep -q "^$svc\.service"; then
      if have_sudo; then
        run_root "systemctl restart $svc" >/dev/null 2>&1 && ok "restarted $svc" || warn "could not restart $svc"
      fi
      break
    fi
  done
fi

# ------------------------------------------------------------------ summary --
cat <<EOF

────────────────────────────────────────────────────────────────
 dsh-raganything-kb $PKG_VERSION installed
   profile     : $PROFILE  ($PROFILE_DIR)
   plugin      : $TARGET
   kb home     : $RAG_HOME
   sidecar     : 0.0.0.0:$PORT  (device: $DEVICE)
   credentials : $ENV_FILE
   verify      : $HERE/verify.sh --profile $PROFILE
────────────────────────────────────────────────────────────────
EOF
