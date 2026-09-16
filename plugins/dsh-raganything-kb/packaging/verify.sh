#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# dsh-raganything-kb post-install verification.
#
# Checks, in order of increasing cost:
#   1  plugin payload present, version matches, UI bundle is real React code
#   2  profile manifest declares the dependency and the bundle exactly once
#   3  node module resolvable in the profile
#   4  rag_* tools registered by the host plugin (static)
#   5  sidecar /health reachable
#   6  sidecar /status initialized with an LLM key present
#   7  browser path: HTTPS /rag/ proxy (or direct 17321) actually answers
#   8  --deep: a real query round-trip through /tasks (forces lazy init)
#
# Exit code = number of failures.
# ---------------------------------------------------------------------------
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_NAME="dsh-raganything-kb"
PROFILE=""
RAG_HOME=""
PORT="17321"
DEEP=0
FAIL=0
PASS=0

while [ $# -gt 0 ]; do
  case "$1" in
    --profile)  PROFILE="$2"; shift 2 ;;
    --rag-home) RAG_HOME="$2"; shift 2 ;;
    --port)     PORT="$2"; shift 2 ;;
    --deep)     DEEP=1; shift ;;
    -h|--help)  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
yes_() { PASS=$((PASS+1)); printf '  \033[1;32m✔\033[0m %s\n' "$*"; }
no_()  { FAIL=$((FAIL+1)); printf '  \033[1;31m✘\033[0m %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }

RUN_HOME="${HOME}"
DSH_DIR="$RUN_HOME/.dsh"
[ -z "$RAG_HOME" ] && RAG_HOME="$DSH_DIR/raganything"
if [ -z "$PROFILE" ]; then
  for p in web desktop default; do
    [ -f "$DSH_DIR/profiles/$p/package.json" ] && { PROFILE="$p"; break; }
  done
fi

step "1  plugin payload"
TARGET="$DSH_DIR/profiles/${PROFILE:-?}/node_modules/$PKG_NAME"
if [ -d "$TARGET" ]; then
  V="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$TARGET/package.json" 2>/dev/null)"
  yes_ "installed at $TARGET (v$V)"
  for f in lib/index.js lib/client.js sidecar/server.py cordis.patch.yml kb/config.json.template; do
    [ -s "$TARGET/$f" ] && yes_ "  payload file $f ($(stat -c%s "$TARGET/$f") bytes)" || no_ "  missing payload file: $f"
  done
  if grep -q '__ModuleLoader__' "$TARGET/lib/client.js" 2>/dev/null; then
    yes_ "  UI bundle is a DSH client module (window.__ModuleLoader__)"
  else
    no_ "  UI bundle does not look like a DSH client module"
  fi
  if grep -q 'sidebar\.footer\.action' "$TARGET/lib/client.js" 2>/dev/null; then
    yes_ "  UI registers the sidebar entry (sidebar.footer.action)"
  else
    no_ "  UI does not register the sidebar entry"
  fi
else
  no_ "plugin not installed at $TARGET"
fi

step "2  profile manifest"
MAN="$DSH_DIR/profiles/${PROFILE:-?}/package.json"
if [ -f "$MAN" ]; then
  python3 - "$MAN" "$PKG_NAME" <<'PYEOF'
import json, sys
man = json.load(open(sys.argv[1], encoding="utf-8"))
name = sys.argv[2]
dep = (man.get("dependencies") or {}).get(name)
bundles = ((man.get("dsh") or {}).get("profile") or {}).get("bundles") or []
print(f"  {'✔' if dep else '✘'} dependency {name} = {dep}")
print(f"  {'✔' if bundles.count(name) == 1 else '✘'} bundle listed {bundles.count(name)}x in dsh.profile.bundles")
for b in ("@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"):
    if b in bundles:
        print(f"  ✔ in-box bundle present: {b}")
PYEOF
  n=$(python3 -c 'import json,sys;m=json.load(open(sys.argv[1]));print(((m.get("dsh") or {}).get("profile") or {}).get("bundles",[]).count(sys.argv[2]))' "$MAN" "$PKG_NAME" 2>/dev/null)
  d=$(python3 -c 'import json,sys;m=json.load(open(sys.argv[1]));print(1 if (m.get("dependencies") or {}).get(sys.argv[2]) else 0)' "$MAN" "$PKG_NAME" 2>/dev/null)
  [ "${d:-0}" = "1" ] && yes_ "manifest dependency declared" || no_ "manifest dependency missing"
  [ "${n:-0}" = "1" ] && yes_ "manifest bundle declared exactly once" || no_ "manifest bundle count = ${n:-0} (must be 1)"
else
  no_ "profile manifest missing: $MAN"
fi

step "3  host tools (static)"
if [ -f "$TARGET/lib/index.js" ]; then
  TOOLS="$(grep -oE "name: 'rag_[a-z_]+'" "$TARGET/lib/index.js" | sed "s/name: '//;s/'//" | sort -u | tr '\n' ' ')"
  n=$(echo "$TOOLS" | wc -w)
  [ "$n" -ge 6 ] && yes_ "registers $n rag_* tools: $TOOLS" || no_ "expected 6 rag_* tools, found $n: $TOOLS"
fi

step "4  sidecar health"
HEALTH="$(curl -s -m 8 "http://127.0.0.1:$PORT/health" 2>/dev/null)"
if [ -n "$HEALTH" ] && echo "$HEALTH" | grep -q '"ok":true'; then
  yes_ "http://127.0.0.1:$PORT/health -> ok"
  info "$HEALTH"
else
  no_ "sidecar not answering on 127.0.0.1:$PORT"
  info "log tail:"; tail -12 "$RAG_HOME/logs/sidecar.log" 2>/dev/null | sed 's/^/      /'
fi

step "5  sidecar status"
ST="$(curl -s -m 15 "http://127.0.0.1:$PORT/status" 2>/dev/null)"
if [ -n "$ST" ]; then
  echo "$ST" | python3 -c '
import json, sys
s = json.load(sys.stdin)
cfg = s.get("config") or {}
print(f"  {\"✔\" if s.get(\"initialized\") else \"✘\"} initialized={s.get(\"initialized\")} init_error={s.get(\"init_error\")}")
llm = cfg.get("llm") or {}
key = "✔" if llm.get("key_present") else "✘"
print(f"  {key} llm={llm.get(\"model\")} @ {llm.get(\"base_url\")} key_present={llm.get(\"key_present\")}")
emb = cfg.get("embedding") or {}
print(f"  ✔ embedding={emb.get(\"backend\")} {emb.get(\"model\")} dims={emb.get(\"dims\")}")
print(f"  ✔ parser={cfg.get(\"parser\")} storage={cfg.get(\"working_dir\")}")
boot = s.get("bootstrap") or {}
if boot.get("last_error"):
    print(f"  ! bootstrap error: {boot.get(\"last_error\")}")
if s.get("docs") is not None:
    print(f"  ✔ docs={json.dumps(s.get(\"docs\"), ensure_ascii=False)}")
' 2>/dev/null || info "$ST"
  echo "$ST" | grep -q '"initialized":true' \
    && yes_ "RAGAnything initialized" \
    || info "not initialized yet — by design: the sidecar initializes lazily on the first query/ingest (use --deep to force it now)"
  echo "$ST" | grep -q '"init_error":null' \
    && yes_ "no init_error recorded" \
    || no_ "init_error is set — see the sidecar log"
  echo "$ST" | grep -q '"key_present":true' && yes_ "LLM API key present" || no_ "LLM API key MISSING (edit $RAG_HOME/sidecar.env)"
else
  no_ "no /status response"
fi

step "6  browser access path (HTTPS /rag/)"
# Skip our own .bak-portable-* copies: a site we already patched leaves one
# behind, and scanning it would make the port detection read a stale file.
NGX_FILES="$(find /etc/nginx/sites-enabled -maxdepth 1 -type f ! -name '*.bak*' 2>/dev/null)"
P="$(grep -hoE 'listen[[:space:]]+[0-9]+[[:space:]]+ssl' $NGX_FILES 2>/dev/null | grep -oE '[0-9]+' | head -1)"
if [ -n "$P" ]; then
  RAG_CODE="$(curl -sk -m 10 -o /dev/null -w '%{http_code}' "https://127.0.0.1:$P/rag/health" 2>/dev/null)"
  if [ "$RAG_CODE" = "200" ]; then
    yes_ "https://<host>:$P/rag/health -> 200 (panel reaches the sidecar over TLS)"
  else
    no_ "https://<host>:$P/rag/health -> $RAG_CODE (HTTPS panel will show «未连接»)"
    info "install.sh adds 'location /rag/' to the TLS server block; if it was skipped:"
    info "  cp $HERE/extras/dsh-rag-proxy.conf /etc/nginx/dsh-rag-proxy.conf"
    info "  add 'include /etc/nginx/dsh-rag-proxy.conf;' inside the TLS server block, then nginx -s reload"
  fi
else
  info "no TLS nginx site found — the panel talks to http://<host>:$PORT directly"
  curl -s -m 8 -o /dev/null -w '' "http://127.0.0.1:$PORT/health" && yes_ "sidecar reachable directly" || no_ "sidecar unreachable directly"
fi

if [ "$DEEP" = "1" ]; then
  step "7  end-to-end query round-trip (forces lazy init)"
  TID="$(curl -s -m 20 -X POST "http://127.0.0.1:$PORT/tasks" \
        -H 'content-type: application/json' \
        -d '{"op":"query","params":{"query":"知识库当前收录了哪些主题？","mode":"naive"}}' 2>/dev/null \
        | python3 -c 'import json,sys;print((json.load(sys.stdin) or {}).get("task_id",""))' 2>/dev/null)"
  if [ -n "$TID" ]; then
    yes_ "query task submitted: $TID"
    for i in $(seq 1 90); do
      sleep 2
      S="$(curl -s -m 10 "http://127.0.0.1:$PORT/tasks/$TID" 2>/dev/null)"
      STATUS="$(echo "$S" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("status",""))' 2>/dev/null)"
      case "$STATUS" in
        done)  yes_ "query completed in ~$((i*2))s"; echo "$S" | python3 -c 'import json,sys;r=json.load(sys.stdin).get("result") or {};a=r.get("answer") or "";print("      answer:", (a[:200] + ("…" if len(a) > 200 else "")) or "(empty — knowledge base may be empty)")' 2>/dev/null; break ;;
        error) no_ "query failed: $(echo "$S" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("error"))' 2>/dev/null)"; break ;;
      esac
      [ "$i" = "90" ] && no_ "query did not finish within 180s"
    done
  else
    no_ "could not submit a query task"
  fi

  ST2="$(curl -s -m 15 "http://127.0.0.1:$PORT/status" 2>/dev/null)"
  echo "$ST2" | grep -q '"initialized":true' \
    && yes_ "sidecar is initialized after the round-trip (lazy init works)" \
    || no_ "sidecar still not initialized after a query — check the sidecar log"
fi

printf '\n────────────────────────────────────────────\n'
printf ' passed %d · failed %d\n' "$PASS" "$FAIL"
printf '────────────────────────────────────────────\n'
exit "$FAIL"
