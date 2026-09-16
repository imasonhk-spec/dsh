#!/usr/bin/env bash
# 建 RAG sidecar 的 Python venv 并安装依赖（lightrag / mineru / llama_cpp 等）
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES="$SCRIPT_DIR/../config-templates"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
set -a; [ -f "$REPO_ROOT/.env" ] && . "$REPO_ROOT/.env"; set +a

RAG_HOME="$DSH_HOME/raganything"
VENV="$RAG_HOME/venv"
REQ="$TEMPLATES/sidecar-requirements.nocuda.txt"
[ "${RAG_CUDA:-false}" = "true" ] && REQ="$TEMPLATES/sidecar-requirements.txt"

echo "  venv: $VENV"
echo "  requirements: $REQ"
sudo -u "$DSH_USER" bash -c "
  set -e
  mkdir -p '$RAG_HOME'/{models,working_dir,output_dir,logs}
  if [ ! -d '$VENV' ]; then python3 -m venv '$VENV'; fi
"
if [ -n "${DEPLOY_HTTP_PROXY:-}" ]; then
  export PIP_PROXY="$DEPLOY_HTTP_PROXY" HTTPS_PROXY="$DEPLOY_HTTPS_PROXY" HTTP_PROXY="$DEPLOY_HTTP_PROXY"
fi
# pip 用国内/隧道镜像更快：若设了 DEPLOY_HTTP_PROXY 已覆盖；否则走默认
sudo -u "$DSH_USER" bash -c "
  '$VENV/bin/pip' install --upgrade pip
  '$VENV/bin/pip' install -r '$REQ'
"
echo "  ✓ RAG venv 就绪"
echo "  ⚠ 请把 bge-m3 / bge-reranker-v2-m3 的 gguf 放到 $RAG_HOME/models/，并在 .env 填好 RAG_EMBEDDING_MODEL_PATH / RAG_RERANK_MODEL_PATH"
