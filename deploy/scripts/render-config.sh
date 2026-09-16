#!/usr/bin/env bash
# 把所有 *.tmpl 渲染到目标系统路径
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES="$SCRIPT_DIR/../config-templates"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
set -a; [ -f "$REPO_ROOT/.env" ] && . "$REPO_ROOT/.env"; set +a

render() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  python3 - "$src" "$dst" <<'PY'
import os, sys, re
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding='utf-8').read()
def repl(m): return os.environ.get(m.group(1), "")
open(dst, 'w', encoding='utf-8').write(re.sub(r'{{(\w+)}}', repl, text))
PY
  echo "  ✓ $dst"
}

# ---- systemd: dsh-web ----
render "$TEMPLATES/dsh-web.service.tmpl" /etc/systemd/system/dsh-web.service
render "$TEMPLATES/dsh-web.service.d/20-rag-loopback.conf.tmpl" /etc/systemd/system/dsh-web.service.d/20-rag-loopback.conf
if [ -n "${DEPLOY_HTTP_PROXY:-}" ]; then
  render "$TEMPLATES/dsh-web.service.d/10-proxy.conf.tmpl" /etc/systemd/system/dsh-web.service.d/10-proxy.conf
else
  rm -f /etc/systemd/system/dsh-web.service.d/10-proxy.conf
fi

# ---- systemd: raganything-sidecar ----
render "$TEMPLATES/raganything-sidecar.service.tmpl" /etc/systemd/system/raganything-sidecar.service
render "$TEMPLATES/raganything-sidecar.service.d/hardening.conf" /etc/systemd/system/raganything-sidecar.service.d/hardening.conf

# ---- nginx ----
render "$TEMPLATES/nginx-dsh-web.conf.tmpl" /etc/nginx/sites-enabled/dsh-web
render "$TEMPLATES/dsh-rag-proxy.conf.tmpl" /etc/nginx/dsh-rag-proxy.conf
# 清理可能冲突的旧配置
rm -f /etc/nginx/sites-enabled/dsh-web.bak-* /etc/nginx/dsh-proxy.conf.bak.* 2>/dev/null || true
nginx -t && echo "  ✓ nginx 配置语法 OK"

# ---- sidecar env + config ----
render "$TEMPLATES/sidecar.env.tmpl" "$DSH_HOME/raganything/sidecar.env"
render "$TEMPLATES/sidecar-config.json.tmpl" "$DSH_HOME/raganything/config.json"

# ---- DSH 全局 settings（仅首次，避免覆盖已在面板上改过的配置） ----
if [ -f "$DSH_HOME/settings.yaml" ]; then
  echo "  • $DSH_HOME/settings.yaml 已存在，跳过（如需重置请手动删除后重跑）"
else
  render "$TEMPLATES/settings.yaml.tmpl" "$DSH_HOME/settings.yaml"
  chown "$DSH_USER":"$DSH_USER" "$DSH_HOME/settings.yaml"
fi

# ---- 权限 ----
chown -R "$DSH_USER":"$DSH_USER" "$DSH_HOME/raganything" 2>/dev/null || true
echo "  ✓ 配置渲染完成"
