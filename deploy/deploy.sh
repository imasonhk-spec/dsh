#!/usr/bin/env bash
# =============================================================================
# DSH 全栈一键部署  (DSH + dsh-raganything-kb + dsh-multi-user)
#
# 用法：
#   ./deploy.sh              # 终端用户：安装依赖 + 链接插件 + 渲染配置 + 起服务
#   ./deploy.sh --dev        # 开发环境：同上但【不】接管 systemd，打印手动运行命令
#   ./deploy.sh --render-only# 仅渲染配置模板（不动依赖/服务），用于改 .env 后快速刷新
#   ./deploy.sh --check      # 仅做部署前检查（版本/端口/证书/.env）
#
# 前置：
#   - 已 `cp .env.example .env` 并填好（尤其 DSH_WEB_TOKEN 用 openssl rand -hex 24 生成）
#   - 目标盒已装 node >= 22.19（推荐 24）、pnpm、python3-venv、nginx、systemd
#   - 以 root 运行（脚本内部用 sudo -u $DSH_USER 写用户目录，systemd 需 root）
# =============================================================================
set -euo pipefail

DEV=0; RENDER_ONLY=0; CHECK_ONLY=0
for a in "$@"; do
  case "$a" in
    --dev) DEV=1 ;;
    --render-only) RENDER_ONLY=1 ;;
    --check) CHECK_ONLY=1 ;;
    *) echo "未知参数: $a"; exit 2 ;;
  esac
done

# ---- 定位仓库根（deploy/ 的上级） ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES="$SCRIPT_DIR/config-templates"
cd "$REPO_ROOT"

# ---- 载入 .env ----
if [ -f "$REPO_ROOT/.env" ]; then
  set -a; . "$REPO_ROOT/.env"; set +a
elif [ -f "$SCRIPT_DIR/.env" ]; then
  set -a; . "$SCRIPT_DIR/.env"; set +a
else
  echo "✗ 找不到 .env（请先 cp .env.example .env 并填写）"; exit 1
fi

# ---- 渲染函数：把模板里的 {{VAR}} 替换为环境变量值 ----
render() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  python3 - "$src" "$dst" <<'PY'
import os, sys, re
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding='utf-8').read()
def repl(m):
    return os.environ.get(m.group(1), "")
open(dst, 'w', encoding='utf-8').write(re.sub(r'{{(\w+)}}', repl, text))
PY
  echo "  ✓ $dst"
}

run_user() { sudo -u "$DSH_USER" bash -c "$1"; }

# =============================================================================
# 预检
# =============================================================================
preflight() {
  echo "== 预检 =="
  local bad=0
  command -v node >/dev/null || { echo "  ✗ 未找到 node"; bad=1; }
  command -v pnpm >/dev/null || command -v corepack >/dev/null || { echo "  ✗ 未找到 pnpm/corepack"; bad=1; }
  command -v python3 >/dev/null || { echo "  ✗ 未找到 python3"; bad=1; }
  command -v nginx >/dev/null || { echo "  ✗ 未找到 nginx"; bad=1; }
  command -v systemctl >/dev/null || { echo "  ✗ 未找到 systemctl"; bad=1; }
  [ "${DSH_WEB_TOKEN:-CHANGE_ME}" = "CHANGE_ME_GENERATE_WITH_OPENSsl_RAND_HEX_24" ] && { echo "  ✗ 请生成并设置 DSH_WEB_TOKEN"; bad=1; }
  [ -z "${DSH_USER:-}" ] && { echo "  ✗ DSH_USER 为空"; bad=1; }
  id "$DSH_USER" >/dev/null 2>&1 || { echo "  ✗ 用户 $DSH_USER 不存在"; bad=1; }
  [ -n "${DEPLOY_HTTP_PROXY:-}" ] && echo "  • 依赖代理: $DEPLOY_HTTP_PROXY"
  [ -f "${SSL_CERT_PATH:-/nonexist}" ] || echo "  ⚠ SSL 证书不存在: ${SSL_CERT_PATH}（请先生成/放置，否则 nginx 起不来）"
  echo "  node=$(node -v 2>/dev/null)  pnpm=$(pnpm -v 2>/dev/null || corepack pnpm -v 2>/dev/null)"
  [ $bad -eq 1 ] && { echo "预检未通过，退出。"; exit 1; }
  echo "  预检通过。"
}

# =============================================================================
# 1) 安装 harness 依赖
# =============================================================================
install_harness() {
  echo "== 安装 harness 依赖 =="
  cd "$HARNESS_DIR"
  if [ -n "${DEPLOY_HTTP_PROXY:-}" ]; then
    export HTTP_PROXY="$DEPLOY_HTTP_PROXY" HTTPS_PROXY="$DEPLOY_HTTPS_PROXY" http_proxy="$DEPLOY_HTTP_PROXY" https_proxy="$DEPLOY_HTTPS_PROXY"
    export npm_config_proxy="$DEPLOY_HTTP_PROXY" npm_config_https_proxy="$DEPLOY_HTTPS_PROXY"
  fi
  command -v pnpm >/dev/null || corepack enable
  pnpm install --frozen-lockfile=false
  echo "  ✓ pnpm install 完成"
  echo "  提示: 若运行时报缺构建产物，可在此盒执行 'pnpm run build:lib'（含原生编译，较慢）。"
}

# =============================================================================
# 2) 链接两个插件到 profile node_modules
# =============================================================================
install_plugins() {
  echo "== 安装插件 =="
  local pm="$DSH_HOME/profiles/web/node_modules"
  run_user "mkdir -p '$pm'"
  for p in dsh-raganything-kb dsh-multi-user; do
    echo "  • $p"
    rm -rf "$pm/$p"
    cp -r "$REPO_ROOT/plugins/$p" "$pm/$p"
  done
  echo "  ✓ 插件已复制到 $pm"
  echo "  ⚠ dsh-memory-evolve 为市场插件，不在本仓；请在 Web 面板「插件」里安装它以启用记忆进化页签。"
}

# =============================================================================
# 3) 建 RAG venv（调用辅助脚本）
# =============================================================================
setup_sidecar() {
  echo "== 配置 RAG sidecar venv =="
  bash "$SCRIPT_DIR/scripts/setup-sidecar.sh"
}

# =============================================================================
# 4) 渲染全部配置（调用辅助脚本）
# =============================================================================
render_config() {
  echo "== 渲染配置 =="
  bash "$SCRIPT_DIR/scripts/render-config.sh"
}

# =============================================================================
# 5) 安装并启动 systemd 服务
# =============================================================================
setup_systemd() {
  if [ $DEV -eq 1 ]; then
    echo "== [dev] 跳过 systemd 接管 =="
    echo "  手动运行 harness（开发）："
    echo "    cd $HARNESS_DIR && pnpm dsh web --host 0.0.0.0 --port $DSH_WEB_PORT --trusted-host $DSH_HOST_IP:$DSH_NGINX_HTTPS_PORT"
    echo "  修改 harness/ 或 plugins/ 源码后重跑上面命令（pnpm 以 tsx 直接跑 TS，无需 rebuild 即可生效多数改动）。"
    return
  fi
  echo "== 安装 systemd 单元 =="
  systemctl daemon-reload
  systemctl enable --now raganything-sidecar.service
  systemctl enable --now dsh-web.service
  if ! systemctl is-active --quiet nginx; then systemctl enable --now nginx; fi
  echo "  等待 15s 让 sidecar 冷启动…"; sleep 15
  echo "== 状态 =="
  systemctl is-active raganything-sidecar.service dsh-web.service nginx
  echo "  完成。浏览器打开 https://$DSH_HOST_IP:$DSH_NGINX_HTTPS_PORT/"
}

# =============================================================================
main
# =============================================================================
preflight
[ $CHECK_ONLY -eq 1 ] && exit 0
if [ $RENDER_ONLY -eq 1 ]; then render_config; exit 0; fi
install_harness
install_plugins
setup_sidecar
render_config
setup_systemd
echo "部署完成 ✓"
