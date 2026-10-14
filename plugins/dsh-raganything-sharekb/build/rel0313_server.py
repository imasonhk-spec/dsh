"""RAG-Anything sidecar for the dsh-raganything DeepSeek Harness plugin.

A small FastAPI service that owns one RAGAnything (LightRAG) instance and
exposes a task-based JSON API:

    GET    /health                  liveness + init state
    GET    /status                  health + config summary (no secrets) + tasks
    GET    /documents               all documents with processing status
    GET    /documents/{doc_id}/content  raw document content from full_docs
    DELETE /documents/{doc_id}      delete one document (task)
    GET    /failures                failure ledger (classified ingest errors)
    GET    /failures/summary        failure counters by code / lifecycle
    POST   /failures/retry          manually retry one ledger entry {id}
    POST   /failures/dismiss        give up on one entry (stop auto retry) {id}
    GET    /workspace/artifacts     read-only mirror of DSH workspace files
    GET    /workspace/file          text preview of one workspace file
    GET    /workspace/download      download one workspace file (attachment)
    POST   /folders/download        package one KB folder's files into a zip
    POST   /upload                  accept a browser file upload; saves it under
                                    the managed uploads dir and enqueues an
                                    ingest task (txt/md direct; PDF/Office via
                                    the parser). Returns {task_id, path, ...}.
    POST   /tasks                   submit {op, params}; returns {task_id}
    GET    /tasks/{task_id}         poll task status/result
    DELETE /tasks/{task_id}         cancel a task

Operations (op):
    query               {query, mode?, only_need_context?, vlm_enhanced?}
    ingest              {path, doc_id?, parse_method?, device?}   txt/md direct; PDF/Office via parser (device defaults to cpu)
    ingest_text         {text, title?}
    ingest_office       {text, title?, format?}   generate a Word/Excel/PPT
                        file (docx/xlsx/pptx) from markdown text, store it in
                        the uploads dir, and ingest it as a KB doc so the
                        知识库产物 folder shows the real .docx/.xlsx/.pptx
                        artifact (downloadable via 打开原始文件)
    ingest_content_list {content_list, file_path?, doc_id?}
    delete_document     {doc_id}

Configuration comes from the JSON file named by RAG_SIDECAR_CONFIG. Secrets
are never read from it: the LLM API key arrives through the RAG_LLM_API_KEY
environment variable, set by the plugin at spawn time from the DSH
credentials store. An optional shared access token for remote deployments is
read from the RAG_SIDECAR_TOKEN environment variable or the config file's
"token" key (see below).

Run:  python server.py   (host/port via RAG_SIDECAR_HOST / RAG_SIDECAR_PORT
or the config file's host/port keys)
"""
from __future__ import annotations

import asyncio
import io
import json
import os
import re
import hashlib
import shutil
import subprocess
import sys
import threading
import time
import traceback
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from typing import Any
from urllib.parse import quote

# Environment defaults that must land BEFORE heavy imports read them.
os.environ.setdefault("MINERU_MODEL_SOURCE", "modelscope")
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("PYTHONUNBUFFERED", "1")

# RAG-Anything's MineruParser.check_installation() shells out to the `mineru`
# CLI via PATH. When the sidecar is launched with the venv python's absolute
# path, venv/bin is not on PATH and the check fails even though mineru is
# installed — so prepend it ourselves.
_VENV_BIN = str(Path(sys.prefix) / "bin")
if os.path.isdir(_VENV_BIN) and _VENV_BIN not in os.environ.get("PATH", "").split(os.pathsep):
    os.environ["PATH"] = _VENV_BIN + os.pathsep + os.environ.get("PATH", "")

import httpx
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse

CONFIG_PATH = os.environ.get("RAG_SIDECAR_CONFIG") or str(
    Path.home() / ".dsh" / "raganything" / "config.json"
)

with open(CONFIG_PATH, encoding="utf-8") as _fh:
    CONFIG: dict[str, Any] = json.load(_fh)

HOST = os.environ.get("RAG_SIDECAR_HOST") or CONFIG.get("host", "127.0.0.1")
PORT = int(os.environ.get("RAG_SIDECAR_PORT") or CONFIG.get("port", 17321))

INGEST_OPS = {"ingest", "ingest_text", "ingest_content_list", "delete_document"}

# Extensions the parser backend (MinerU) can actually handle. Anything else is
# rejected with a clear message instead of being handed to the parser and
# silently "succeeding" (observed: a 1 KB fake .mp3 was reported as ingested
# while audio processing is disabled).
PARSER_SUPPORTED_EXTS: set[str] = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp", ".gif",
}
AUDIO_EXTS: set[str] = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac", ".wma"}
TEXT_EXTS: set[str] = {".txt", ".md", ".markdown"}

# Browser file uploads land here before an ingest task picks them up.
UPLOAD_DIR = CONFIG.get("upload_dir") or str(Path(CONFIG["working_dir"]) / "uploads")

# Knowledge-base panel user operation log (JSONL; one JSON object per line).
LOG_PATH = Path(CONFIG_PATH).parent / "kb-logs.jsonl"

# ---------------------------------------------------------------------------
# 产物命名空间（DSH产物 / 知识库产物）
#
# 两类产物都会真实入库，file_path 分别以 "DSH产物/"、"知识库产物/" 开头，
# 因此「是否纳入全局知识库」= 全局检索时是否排除对应前缀。
# ---------------------------------------------------------------------------
NS_DSH = "DSH产物"
NS_KB = "知识库产物"
NS_ORDER = (NS_DSH, NS_KB)

# 全局检索包含开关（默认关）。存盘在 kb-prefs.json，前端可即时改，无需重启。
PREFS_PATH = Path(CONFIG_PATH).parent / "kb-prefs.json"
DEFAULT_PREFS: dict[str, bool] = {
    "include_dsh_artifacts": False,
    "include_kb_artifacts": False,
}

# DSH 工作区产物自动同步的记账文件：path -> {mtime, size, title, doc_id, status}
WS_SYNC_PATH = Path(CONFIG_PATH).parent / "kb-ws-sync.json"
WS_SYNC_STATE: dict[str, Any] = {
    "running": False,
    "last_run_at": 0.0,
    "last_ingested": 0,
    "last_error": None,
    "total_ingested": 0,
}


def _load_prefs() -> dict[str, bool]:
    """全局检索包含开关；缺省为「两皆不纳入」(DEFAULT_PREFS)。"""
    out = dict(DEFAULT_PREFS)
    try:
        data = json.loads(PREFS_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            for key in DEFAULT_PREFS:
                if isinstance(data.get(key), bool):
                    out[key] = data[key]
    except Exception:
        pass
    return out


def _save_prefs(patch: dict[str, Any]) -> dict[str, bool]:
    """合并写入开关；只接受 DEFAULT_PREFS 里声明过的布尔键。"""
    cur = _load_prefs()
    for key in DEFAULT_PREFS:
        if isinstance(patch.get(key), bool):
            cur[key] = patch[key]
    try:
        PREFS_PATH.parent.mkdir(parents=True, exist_ok=True)
        PREFS_PATH.write_text(
            json.dumps(cur, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as exc:  # noqa: BLE001 - 开关写失败不应影响问答
        print(f"[sidecar] prefs write failed: {type(exc).__name__}: {exc}")
    return cur


def _excluded_prefixes(prefs: dict[str, bool] | None = None) -> list[str]:
    """全局检索恒定排除的产物前缀（DSH产物 / 知识库产物）。

    2026-09-12：产物不再作为知识库内容对外——面板里的「DSH产物 / 知识库产物」
    文件夹已下线，改成对话框右侧可折叠的「对话产物」栏。因此全局问答恒定排除
    这两个命名空间；显式 @ 指定产物文件/文件夹走 scope 分支，不受此处影响，
    仍可精确引用。prefs 参数保留仅为兼容旧调用点。
    """
    return list(NS_ORDER)

def _is_ns_prefix(path: Any) -> bool:
    p = str(path or "").replace("\\", "/").strip()
    return any(p == ns or p.startswith(ns + "/") for ns in NS_ORDER)

# ---------------------------------------------------------------------------
# AI 模型管理：本地模型目录、可下载模型目录、下载状态、GPU 设备检测
#
# 提供「AI 模型」面板（知识库左侧导航底部入口）所需的全部数据与动作：
#   GET    /models                模型目录 + 当前选择 + 设备 + 下载进度
#   POST   /models/download       {model_id} 启动后台下载（GGUF 单文件 /
#                                 HF 目录快照 / pip 包），返回 download_id
#   GET    /models/download/{id}  轮询下载进度 {status, received, total, pct}
#   POST   /models/select         {category, model_id?, base_url?, api_key?,
#                                 model?, dims?} 持久化默认模型到 config.json
#   POST   /models/custom         {category, name, base_url, api_key?, model,
#                                 dims?} 新增自定义模型配置（参考 DSH-设置-模型）
#   POST   /models/restart        重启 sidecar 进程（使 embedding/rerank/asr/
#                                 parser 等构建期捕获的配置生效）
#
# 下载源默认走 HF 镜像（HF_ENDPOINT，脚本顶部已 setdefault 为 hf-mirror.com）。
# 设备检测兼容 NVIDIA CUDA 与 AMD ROCm：ROCm 构建的 torch 同时满足
# torch.version.hip 非空，因此先判 hip 再判 cuda。
# ---------------------------------------------------------------------------

MODELS_DIR = CONFIG.get("models_dir") or str(Path(CONFIG_PATH).parent / "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# 可下载本地模型的注册表。kind:
#   file — 单个 GGUF 文件（hf-mirror resolve URL 流式下载，带字节级进度）
#   dir  — 一个 HF 仓库目录（逐文件下载到 MODELS_DIR/{id}/，带文件级进度）
#   pip  — 安装/更新到 sidecar 的 venv（流式输出进度）
MODELS_CATALOG: dict[str, list[dict[str, Any]]] = {
    "embedding": [
        {
            "id": "bge-m3-f16",
            "name": "bge-m3-f16.gguf",
            "kind": "file",
            "repo": "gpustack/bge-m3-GGUF",
            "file": "bge-m3-FP16.gguf",
            "dims": 1024,
            "size_hint": "约 1.1 GB",
            "device_note": "本地 GGUF 需安装 llama-cpp-python 运行时（NVIDIA CUDA / AMD ROCm 均可）",
            # 插件默认 embedding（config.json.template 指向此文件）；bge-m3 为
            # 纯本地推理，不依赖任何在线 embedding 服务，任何设备开箱即用。
            "is_default": True,
            # 兼容旧布局：本机已存在的旧文件（.dsh/raganything/ 根目录）视为已下载
            "legacy_paths": [str(Path(CONFIG_PATH).parent / "bge-m3-f16.gguf")],
        },
    ],
    "rerank": [
        {
            "id": "bge-reranker-base",
            "name": "bge-reranker-base",
            "kind": "dir",
            "repo": "BAAI/bge-reranker-base",
            "size_hint": "约 1.1 GB",
            "device_note": "Transformers 模型，NVIDIA CUDA / AMD ROCm / CPU 均可运行",
            # 已存在的 modelscope/HF 缓存路径视为已下载（兼容本机现状）
            "legacy_paths": [
                str(Path.home() / ".cache/modelscope/models/BAAI--bge-reranker-base/snapshots/master"),
            ],
        },
    ],
    "asr": [
        {
            "id": "sensevoice",
            "name": "SenseVoice",
            "kind": "dir",
            "repo": "FunAudioLLM/SenseVoiceSmall",
            "size_hint": "约 1 GB",
            "device_note": "funasr 语音识别，NVIDIA CUDA / AMD ROCm / CPU 均可运行",
            "legacy_paths": [
                str(Path.home() / ".cache/modelscope/models/iic--SenseVoiceSmall"),
            ],
        },
    ],
    "parser": [
        {
            "id": "mineru",
            "name": "MinerU",
            "kind": "pip",
            "package": "mineru[core]",
            "size_hint": "Python 包（venv）",
            "device_note": "文档解析（PDF/Office），NVIDIA CUDA / AMD ROCm 自动选用 GPU",
        },
    ],
}

# download_id -> {"model_id", "status": queued|downloading|done|error,
#                 "received", "total", "pct", "message", "error"}
_downloads: dict[str, dict[str, Any]] = {}


def _catalog_entry(model_id: str) -> dict[str, Any] | None:
    for entries in MODELS_CATALOG.values():
        for entry in entries:
            if entry["id"] == model_id:
                return entry
    return None


def _detect_device() -> dict[str, str]:
    """Return the inference device facts: vendor (nvidia/amd/cpu/unknown),
    backend (cuda/rocm/cpu), device name and torch version. ROCm builds of
    torch set torch.version.hip, so that is checked BEFORE torch.cuda."""
    try:
        import torch  # heavy import — lazy, only when models UI asks

        hip = getattr(torch.version, "hip", None)
        if hip:
            return {
                "vendor": "amd",
                "backend": "rocm",
                "name": f"AMD ROCm (HIP {hip})",
                "torch": torch.__version__,
            }
        if torch.cuda.is_available():
            return {
                "vendor": "nvidia",
                "backend": "cuda",
                "name": torch.cuda.get_device_name(0),
                "torch": torch.__version__,
            }
        return {"vendor": "cpu", "backend": "cpu", "name": "CPU", "torch": torch.__version__}
    except Exception as exc:  # torch missing/broken
        return {"vendor": "unknown", "backend": "unknown", "name": str(exc), "torch": ""}


def _model_local_state(entry: dict[str, Any]) -> dict[str, Any]:
    """Downloaded-or-not for one catalog entry: {status, path, size, version}."""
    if entry["kind"] == "file":
        dest = Path(MODELS_DIR) / entry["id"] / entry["file"]
        legacy = [Path(p) for p in entry.get("legacy_paths", [])]
        for cand in [dest, *legacy]:
            if cand.is_file() and cand.stat().st_size > 0:
                return {"status": "ready", "path": str(cand), "size": cand.stat().st_size, "version": None}
        return {"status": "missing", "path": str(dest), "size": None, "version": None}
    if entry["kind"] == "dir":
        dest = Path(MODELS_DIR) / entry["id"]
        legacy = [Path(p) for p in entry.get("legacy_paths", [])]
        for cand in [dest, *legacy]:
            if cand.is_dir() and any(cand.iterdir()):
                total = sum(f.stat().st_size for f in cand.rglob("*") if f.is_file())
                return {"status": "ready", "path": str(cand), "size": total, "version": None}
        return {"status": "missing", "path": str(dest), "size": None, "version": None}
    if entry["kind"] == "pip":
        try:
            import importlib.metadata as _md

            ver = _md.version(entry.get("package", "").split("[")[0])
            return {"status": "ready", "path": None, "size": None, "version": ver}
        except Exception:
            return {"status": "missing", "path": None, "size": None, "version": None}
    return {"status": "missing", "path": None, "size": None, "version": None}


def _runtime_state() -> dict[str, Any]:
    """Whether the local GGUF embedding runtime (llama-cpp-python) is usable."""
    try:
        import importlib.metadata as _md

        ver = _md.version("llama-cpp-python")
        return {"llama_cpp": True, "llama_cpp_version": ver}
    except Exception:
        return {"llama_cpp": False, "llama_cpp_version": None}


# PyPI 镜像源优先级：国内网络（GitHub 不可达）必须走镜像才能下载到
# llama-cpp-python 的 sdist（官方源下载会长时间卡死）。清华源优先，
# 失败后回退官方源。
_PYPI_MIRRORS = [
    "https://pypi.tuna.tsinghua.edu.cn/simple",
    "https://mirrors.aliyun.com/pypi/simple/",
    "https://pypi.org/simple",
]

# 固定一个已验证可编译的版本：0.3.35 的 sdist 自带完整 llama.cpp 源码
# （vendor/llama.cpp），离线即可编译，不依赖 GitHub 拉取子模块。
LLAMA_CPP_PIN = "llama-cpp-python==0.3.35"


def _detect_cuda_arch() -> str | None:
    """Detect the installed GPU's compute capability (e.g. '87') so the CUDA
    build only compiles for the actual architecture. On Jetson Orin this is
    sm_87; on desktop GPUs it avoids a full matrix of virtual archs, cutting
    build time dramatically. Falls back to None (CMake auto/native)."""
    try:
        import torch

        if torch.cuda.is_available():
            cap = torch.cuda.get_device_capability(0)
            return f"{cap[0]}{cap[1]}"
    except Exception:
        pass
    return None


async def _install_runtime_worker(dl_id: str, vendor: str) -> None:
    """Install llama-cpp-python into the sidecar venv, built for the detected
    GPU vendor (NVIDIA CUDA via GGML_CUDA, AMD ROCm via GGML_HIPBLAS) or CPU.
    Heavy (source build), so it runs as a background download-style job.

    关键修复（2026-09-10）：
    1. 走 PyPI 镜像源下载 sdist——官方源在 GitHub 不可达的网络下会卡死；
    2. 固定 0.3.35（sdist 自带 llama.cpp 源码，离线可编译）；
    3. CUDA 编译加 -DGGML_CUDA_FA=OFF：跳过 FlashAttention 大模板
       （数百个 .cu 文件，单文件 nvcc 1-2 分钟），bge-m3 等 embedding
       模型用不到 FA，关闭后编译量减半以上，避免超时；
    4. 自动探测 CUDA 架构（sm_XX），只编译本机架构；
    5. CPU/ROCm 设备不传 CUDA 参数，走默认（CPU 编译极快）。
    """
    _download_set(dl_id, status="downloading", message="准备安装 llama-cpp-python …")
    env = os.environ.copy()
    cmake = []
    if vendor == "cuda":
        cmake.append("-DGGML_CUDA=on")
        cmake.append("-DGGML_CUDA_FA=OFF")
        arch = _detect_cuda_arch()
        if arch:
            cmake.append(f"-DGGML_CUDA_ARCHITECTURES={arch}")
    elif vendor == "rocm":
        cmake.append("-DGGML_HIPBLAS=on")
    if cmake:
        env["CMAKE_ARGS"] = " ".join(cmake)
        env["FORCE_CMAKE"] = "1"
    # 限制并行编译，避免小内存设备（Jetson 7GB）OOM。
    env.setdefault("CMAKE_BUILD_PARALLEL_LEVEL", "2")

    async def _pip_try(index_url: str) -> tuple[int, list[str]]:
        cmd = [sys.executable, "-m", "pip", "install", "-U", LLAMA_CPP_PIN,
               "-i", index_url, "--no-cache-dir"]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
            env=env,
        )
        assert proc.stdout is not None
        out: list[str] = []
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            text = line.decode("utf-8", "replace").strip()
            if text:
                out.append(text)
                _download_set(dl_id, message=text[-160:])
        code = await proc.wait()
        return code, out

    last_lines: list[str] = []
    for idx, mirror in enumerate(_PYPI_MIRRORS):
        _download_set(dl_id, message=f"尝试镜像 {idx + 1}/{len(_PYPI_MIRRORS)}：{mirror}")
        try:
            code, last_lines = await _pip_try(mirror)
        except Exception as exc:
            last_lines = [f"{type(exc).__name__}: {exc}"]
            code = 1
        if code == 0:
            _download_set(dl_id, status="done", pct=100, message="llama-cpp-python 安装完成")
            return
    raise RuntimeError(f"llama-cpp-python 安装失败 (exit {code}): {last_lines[-3:]}")


def _download_set(dl_id: str, **patch: Any) -> None:
    _downloads[dl_id].update(patch)


async def _download_stream_file(dl_id: str, url: str, dest: Path) -> None:
    """Stream one URL to dest with byte-level progress (Range 续传支持)。"""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    headers = {}
    if tmp.exists():
        headers["Range"] = f"bytes={tmp.stat().st_size}-"
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        async with client.stream("GET", url, headers=headers) as resp:
            if resp.status_code == 416:  # already complete
                tmp.replace(dest)
                _download_set(dl_id, received=dest.stat().st_size, total=dest.stat().st_size, pct=100)
                return
            resp.raise_for_status()
            total = int(resp.headers.get("content-length") or 0)
            received = tmp.stat().st_size if tmp.exists() else 0
            _download_set(dl_id, received=received, total=total,
                          pct=(received / total * 100) if total else 0)
            with open(tmp, "ab") as fh:
                async for chunk in resp.aiter_bytes(1 << 20):
                    fh.write(chunk)
                    received += len(chunk)
                    _download_set(dl_id, received=received,
                                  pct=(received / total * 100) if total else 0)
    tmp.replace(dest)


async def _download_worker(dl_id: str, entry: dict[str, Any]) -> None:
    _download_set(dl_id, status="downloading", message=f"开始下载 {entry['name']} …")
    try:
        if entry["kind"] == "file":
            url = f"{os.environ.get('HF_ENDPOINT', 'https://hf-mirror.com')}/{entry['repo']}/resolve/main/{entry['file']}"
            dest = Path(MODELS_DIR) / entry["id"] / entry["file"]
            await _download_stream_file(dl_id, url, dest)
            _download_set(dl_id, status="done", pct=100, message=f"{entry['name']} 下载完成")
        elif entry["kind"] == "dir":
            # 逐文件下载 HF 仓库到 MODELS_DIR/{id}/（保留相对路径）。
            from huggingface_hub import HfApi

            dest = Path(MODELS_DIR) / entry["id"]
            dest.mkdir(parents=True, exist_ok=True)
            files = HfApi().list_repo_files(entry["repo"])
            for idx, rel in enumerate(files, start=1):
                _download_set(dl_id, message=f"{entry['name']}：{rel}（{idx}/{len(files)}）",
                              pct=round((idx - 1) / len(files) * 100))
                url = f"{os.environ.get('HF_ENDPOINT', 'https://hf-mirror.com')}/{entry['repo']}/resolve/main/{rel}"
                await _download_stream_file(dl_id, url, dest / rel)
            _download_set(dl_id, status="done", pct=100, message=f"{entry['name']} 下载完成")
        elif entry["kind"] == "pip":
            proc = await asyncio.create_subprocess_exec(
                sys.executable, "-m", "pip", "install", "-U", entry.get("package", ""),
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
            )
            assert proc.stdout is not None
            lines: list[str] = []
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                text = line.decode("utf-8", "replace").strip()
                if text:
                    lines.append(text)
                    _download_set(dl_id, message=text[-160:])
            code = await proc.wait()
            if code != 0:
                raise RuntimeError(f"pip install 失败 (exit {code}): {lines[-3:]}")
            _download_set(dl_id, status="done", pct=100, message=f"{entry['name']} 安装完成")
    except Exception as exc:
        _download_set(dl_id, status="error", error=f"{type(exc).__name__}: {exc}")
        print(f"[sidecar] model download {dl_id} failed: {exc}")


def _auto_log(action: str, detail: str | None = None) -> None:
    """Best-effort sidecar-side log entry (parse/delete task events).

    Never raises: logging must not break the ingest pipeline.
    """
    entry: dict[str, Any] = {"ts": round(time.time(), 3), "action": action[:120], "source": "sidecar"}
    if detail:
        entry["detail"] = str(detail)[:500]
    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError:
        pass

# Upload manifest: dest filename → display_path, appended on every upload and
# pruned on document deletion. The index rebuild only re-ingests files listed
# here so previously deleted documents do not resurrect.
MANIFEST_PATH = Path(CONFIG_PATH).parent / "kb-uploads-manifest.json"

# Duplicate-detection fingerprint cache: dest filename → {sha256, size, mtime,
# source_mtime, display_path}. Lets /upload answer R2 (identical content) and
# R3 (same content under a different name) without re-hashing stored files.
HASHES_PATH = Path(CONFIG_PATH).parent / "kb-upload-hashes.json"
# Overwrite backups: the superseded physical file is moved to trash/<stamp>/
# and purged after duplicate_trash_retention_days (default 7).
TRASH_DIR = Path(CONFIG_PATH).parent / "trash"
# Version archive: previous revisions of a display path move to
# versions/<display>/vN__<dest> and are indexed in kb-versions.json. This dir
# is OUTSIDE uploads/, so index rebuilds never resurrect archived versions.
VERSIONS_DIR = Path(CONFIG_PATH).parent / "versions"
VERSIONS_META_PATH = Path(CONFIG_PATH).parent / "kb-versions.json"
DUP_TRASH_RETENTION_DAYS = max(1, int(CONFIG.get("duplicate_trash_retention_days", 7)))
DUP_AUTO_RULE = str(CONFIG.get("duplicate_auto_rule") or "keep_newest").strip().lower()
# R4 near-duplicate detection for images: optional (needs Pillow), off by
# default. 64-bit DCT pHash; similarity% = (64 - hamming) / 64 * 100.
IMAGE_EXTS: set[str] = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp", ".gif"}
DUP_PHASH_ENABLED = bool(CONFIG.get("duplicate_phash_enabled", False))
DUP_PHASH_THRESHOLD = max(50, min(100, int(CONFIG.get("duplicate_phash_threshold", 90))))

app = FastAPI(title="raganything-sidecar", docs_url=None, redoc_url=None)

# Allow the desktop-client prototype (and other local web pages) to call the
# sidecar REST API directly from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Open File Viewer static assets (/viewer/*): the browser bundle of
# @open-file-viewer/core served next to the API so the KB panel and the DSH
# document sidebar can load it same-origin (via /rag) or directly.
# ---------------------------------------------------------------------------

VIEWER_DIR = Path(__file__).resolve().parent / "viewer"

if VIEWER_DIR.is_dir():
    from starlette.staticfiles import StaticFiles

    app.mount("/viewer", StaticFiles(directory=str(VIEWER_DIR)), name="viewer")

# Optional access token for shared/remote deployments. When set (via the
# RAG_SIDECAR_TOKEN environment variable or a "token" key in the config
# file), every endpoint except GET /health requires it as
# `Authorization: Bearer <token>` (or `X-API-Key: <token>`). Unset -> the
# sidecar stays open, exactly as before.
SIDECAR_TOKEN = os.environ.get("RAG_SIDECAR_TOKEN") or CONFIG.get("token") or ""

if SIDECAR_TOKEN:

    @app.middleware("http")
    async def _require_token(request: Request, call_next):
        # CORS preflight and the liveness probe stay open so monitoring and
        # browsers can always reach them.
        if request.method == "OPTIONS" or request.url.path == "/health" or request.url.path.startswith("/viewer/"):
            return await call_next(request)
        auth = request.headers.get("authorization", "") or ""
        provided = (
            auth[7:].strip() if auth.lower().startswith("bearer ") else request.headers.get("x-api-key", "")
        )
        if not provided or provided != SIDECAR_TOKEN:
            return JSONResponse(status_code=401, content={"detail": "missing or invalid token"})
        return await call_next(request)

_state: dict[str, Any] = {
    "rag": None,
    "initialized": False,
    "init_error": None,
    "init_lock": asyncio.Lock(),
    "ingest_lock": asyncio.Lock(),
    "started_at": time.time(),
    # task_id -> {"title", "created_at"}; sidecar-side "parsing" registry for
    # uploads whose LightRAG doc record only appears after parsing finishes.
    "processing_entries": {},
    # Startup reconciliation of docs stranded by a killed process runs once.
    "reconciled": False,
}

_tasks: dict[str, dict[str, Any]] = {}
# 入库类任务与查询类任务**分开限流**。
# 之前二者共用同一个信号量：MinerU 解析一个 PDF 往往要几分钟，4 个名额被
# 长任务占满后，问答会连带排到十几分钟起步（实测 naive 纯检索 pending >15min，
# 基线仅 ~2s）。现在 query 走自己的信号量，批量入库期间问答依然可用。
_task_semaphore = asyncio.Semaphore(int(CONFIG.get("max_concurrent_tasks", 4)))
_query_semaphore = asyncio.Semaphore(int(CONFIG.get("max_concurrent_queries", 4)))


# ---------------------------------------------------------------------------
# Upload manifest (dest filename → display_path) for the index rebuild
# ---------------------------------------------------------------------------


def _manifest_load() -> dict[str, str]:
    try:
        data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _manifest_save(mapping: dict[str, str]) -> None:
    try:
        MANIFEST_PATH.write_text(
            json.dumps(mapping, ensure_ascii=False, indent=1), encoding="utf-8"
        )
    except Exception as exc:
        print(f"[sidecar] manifest save failed: {exc}")


def _manifest_add(dest_name: str, display_path: str) -> None:
    mapping = _manifest_load()
    mapping[dest_name] = display_path
    _manifest_save(mapping)


def _manifest_drop_display(display_path: str) -> None:
    """Remove manifest entries whose display_path matches a deleted doc title."""
    mapping = _manifest_load()
    kept = {k: v for k, v in mapping.items() if v != display_path}
    if len(kept) != len(mapping):
        _manifest_save(kept)


def _manifest_prune_display(display_path: str, keep: str) -> None:
    """Re-upload support: keep only ONE manifest entry per display path (the
    newest upload), so a full rebuild never resurrects the superseded copy."""
    mapping = _manifest_load()
    kept = {k: v for k, v in mapping.items() if v != display_path or k == keep}
    if len(kept) != len(mapping):
        _manifest_save(kept)

# ---------------------------------------------------------------------------
# 仅文件产物（DSH产物 / 知识库产物）—— 2026-09-14
#
# 产物不再进入知识库索引与解析：生成/记录时只把文件落到 uploads 并登记 manifest，
# 不调用 LightRAG 的 ainsert，因此不会占用向量库，也不会进实体图谱（避免污染）。
# 面板右侧「对话产物」栏据 manifest 列出这些文件，可打开/下载/重命名/删除，也可
# 显式「添加到个人知识库 / 共享知识库」——那时才走正常解析入库。
#
# doc_id 约定：art-<dest_name>（dest_name = uploads 里的物理文件名）。
# 历史遗留：老版本已入库的产物文档由一次性迁移 _purge_artifact_index_once() 清理。
# ---------------------------------------------------------------------------
ART_ID_PREFIX = "art-"
ART_PURGE_FLAG = Path(CONFIG_PATH).parent / "kb-artifacts-fileonly-v1.flag"


def _artifact_dest_of(doc_id: Any) -> str | None:
    """art-<dest_name> → dest_name；不是产物 id 时返回 None。"""
    s = str(doc_id or "")
    return s[len(ART_ID_PREFIX):] if s.startswith(ART_ID_PREFIX) else None


def _artifact_entries() -> list[dict[str, Any]]:
    """manifest 里所有产物文件（DSH产物 / 知识库产物），按 mtime 升序。"""
    out: list[dict[str, Any]] = []
    try:
        upload_dir = Path(UPLOAD_DIR)
        for dest_name, display in _manifest_load().items():
            disp = str(display).replace("\\", "/")
            if not _is_ns_prefix(disp):
                continue
            p = upload_dir / str(dest_name)
            if not p.is_file():
                continue
            st = p.stat()
            out.append({"dest_name": str(dest_name), "title": disp,
                        "size": st.st_size, "mtime": st.st_mtime})
    except Exception as exc:  # noqa: BLE001 - 列不出来不能拖垮 /documents
        print(f"[sidecar] artifact scan failed: {type(exc).__name__}: {exc}")
    return sorted(out, key=lambda x: x["mtime"])


def _artifact_by_doc_id(doc_id: Any) -> tuple[str, str, Path] | None:
    """(dest_name, display_path, physical_path)；不存在或不是产物时 None。"""
    dest = _artifact_dest_of(doc_id)
    if not dest:
        return None
    display = _manifest_load().get(dest)
    if not display or not _is_ns_prefix(str(display).replace("\\", "/")):
        return None
    p = Path(UPLOAD_DIR) / dest
    if not p.is_file():
        return None
    return dest, str(display).replace("\\", "/"), p


def _artifact_supersede(display_path: str) -> None:
    """同一产物路径再次生成时：旧文件移入回收站、摘掉 manifest 条目，只留最新一份。"""
    norm = str(display_path).replace("\\", "/")
    mapping = _manifest_load()
    victims = [k for k, v in mapping.items() if str(v).replace("\\", "/") == norm]
    if not victims:
        return
    tdir = TRASH_DIR / time.strftime("%Y%m%d-%H%M%S")
    try:
        tdir.mkdir(parents=True, exist_ok=True)
        for k in victims:
            src = Path(UPLOAD_DIR) / k
            if src.is_file():
                shutil.move(str(src), str(tdir / k))
    except Exception as exc:  # noqa: BLE001
        print(f"[sidecar] artifact supersede move failed: {exc}")
    keep = _manifest_load()
    for k in victims:
        keep.pop(k, None)
    _manifest_save(keep)


def _write_text_artifact(text: str, title: str) -> tuple[str, str]:
    """文本产物（问答记录）只落盘的写盘动作，返回 (dest_name, display_path)。"""
    base = Path(str(title).replace("\\", "/")).name or "产物.md"
    if not base.lower().endswith((".md", ".markdown", ".txt")):
        base = f"{base}.md"
    dest_name = f"{uuid.uuid4().hex[:8]}-{base}"
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    (Path(UPLOAD_DIR) / dest_name).write_text(str(text), encoding="utf-8")
    return dest_name, str(title)


def _artifact_purge_needed() -> bool:
    """廉价预检：本实例的 LightRAG doc_status 里是否还有产物文档。"""
    p = MANIFEST_PATH.parent / "storage" / "kv_store_doc_status.json"
    if not p.is_file():
        return False
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return True
    if isinstance(data, dict) and isinstance(data.get("data"), dict):
        data = data["data"]
    if not isinstance(data, dict):
        return True
    for k, v in data.items():
        if str(k).startswith("_"):
            continue
        fp = str(v.get("file_path") or "") if isinstance(v, dict) else ""
        if _is_ns_prefix(fp):
            return True
    return False


async def _purge_artifact_index_once() -> None:
    """一次性迁移：把历史已入库的产物文档从 LightRAG 删除（原始文件保留）。

    产物自 2026-09-14 起不再解析/索引；老版本写进向量库与实体图谱的产物正是
    「污染」，这里一次性清掉。标记文件写盘后不再执行。
    """
    if ART_PURGE_FLAG.exists():
        return
    try:
        if not _artifact_purge_needed():
            ART_PURGE_FLAG.write_text("nothing to purge\n", encoding="utf-8")
            return
        rag = await ensure_rag()
        from lightrag.base import DocStatus
        statuses = (DocStatus.PROCESSED, DocStatus.PROCESSING, DocStatus.PENDING,
                    DocStatus.FAILED, DocStatus.PREPROCESSED)
        results = await asyncio.gather(*[rag.lightrag.get_docs_by_status(s) for s in statuses])
        removed = failed = 0
        for mapping in results:
            for doc_id, doc in mapping.items():
                if not _is_ns_prefix(getattr(doc, "file_path", "")):
                    continue
                try:
                    await rag.lightrag.adelete_by_doc_id(str(doc_id))
                    removed += 1
                except Exception:  # noqa: BLE001 - 单个失败继续
                    failed += 1
        ART_PURGE_FLAG.write_text(
            json.dumps({"removed": removed, "failed": failed,
                        "at": datetime.now(timezone.utc).isoformat()}, ensure_ascii=False),
            encoding="utf-8",
        )
        _auto_log("清理产物索引", f"移除 {removed} 个产物文档（失败 {failed}）；文件保留在「对话产物」栏")
        print(f"[sidecar] artifact index purge: removed={removed} failed={failed}")
    except Exception as exc:  # noqa: BLE001 - 迁移失败不能挡启动
        print(f"[sidecar] artifact index purge failed: {type(exc).__name__}: {exc}")


async def _purge_artifact_index_later() -> None:
    """延后执行，避开与 embedding bootstrap 抢初始化锁。"""
    await asyncio.sleep(25)
    await _purge_artifact_index_once()


def _artifact_scope_texts(files: list[str]) -> list[tuple[str, str]]:
    """@ 指定的仅文件产物 → (显示路径, 正文)。

    产物不再入库，file_paths 过滤命不中它们；显式 @ 时改为直读文件正文注入。
    office 等二进制产物无法直读，返回空正文（由调用方给提示）。
    """
    out: list[tuple[str, str]] = []
    readable = TEXT_EXTS | {".csv", ".json", ".log", ".xml", ".yaml", ".yml"}
    for f in files or []:
        disp = str(f).replace("\\", "/")
        if not _is_ns_prefix(disp):
            continue
        p = _original_file_of(disp)
        if p is None:
            continue
        if p.suffix.lower() not in readable:
            out.append((disp, ""))
            continue
        try:
            out.append((disp, p.read_text(encoding="utf-8", errors="replace")[:40_000]))
        except Exception:  # noqa: BLE001
            continue
    return out




def _duplicate_original_doc_id(exc: BaseException, message: str = "") -> str | None:
    """Extract `Original doc_id: doc-xxx` from a LightRAG duplicate rejection."""
    text = f"{message} {exc}"
    m = re.search(r"Original doc_id:\s*(doc-[0-9a-f]{8,})", text, re.IGNORECASE)
    if m:
        return m.group(1)
    m = re.search(r"original_doc_id['\"]?\s*[:=]\s*['\"]?(doc-[0-9a-f]{8,})", text, re.IGNORECASE)
    return m.group(1) if m else None


async def _clear_duplicate_blocker(rag: Any, display_path: str, exc: BaseException,
                                   message: str = "", *,
                                   locked: bool = False) -> bool:
    """Self-heal "Content already exists" by removing the blocking original.

    A re-index is rejected by LightRAG's content-hash dedup whenever an earlier
    copy of the same bytes is still registered — typically a document whose
    ingest was interrupted and whose status fell outside the DocStatus enum, so
    it is impossible to see or delete through the normal status APIs. Deleting
    the blocker (identified by the exception's `Original doc_id`) lets the
    retry actually insert. Returns True when something was cleared.

    `locked=True` means the caller is already inside the `ingest_lock` critical
    section. asyncio locks are NOT reentrant, so taking it again here would
    deadlock the ingest task forever — every ingest-path caller must pass it.
    """
    blocker = _duplicate_original_doc_id(exc, message)
    if not blocker:
        return False
    try:
        existing = await rag.lightrag.aget_docs_by_ids([blocker])
        if not (existing and existing.get(blocker) is not None):
            return False
        if locked:
            await rag.lightrag.adelete_by_doc_id(blocker)
        else:
            async with _state["ingest_lock"]:
                await rag.lightrag.adelete_by_doc_id(blocker)
        _auto_log("重复冲突自愈", f"{display_path} · 已清除阻塞文档 {blocker}，准备重新入库")
        print(f"[sidecar] duplicate blocker {blocker} cleared for {display_path}")
        return True
    except Exception as exc2:
        print(f"[sidecar] clear duplicate blocker {blocker} failed: "
              f"{type(exc2).__name__}: {exc2}")
        return False


def _display_of(dest_name: str) -> str:
    """Original display path of an uploaded file (manifest, else uuid-stripped)."""
    mapping = _manifest_load()
    if dest_name in mapping:
        return mapping[dest_name]
    return re.sub(r"^[0-9a-f]{8}-", "", dest_name)


# ---------------------------------------------------------------------------
# Duplicate detection & conflict resolution (R1-R4 + skip/overwrite/rename/
# version/auto). 详见《DSH知识库索引失败处理与补偿策略设计.md》重复上传章节。
# ---------------------------------------------------------------------------


def _sha256_file(path: str | Path) -> str | None:
    try:
        h = hashlib.sha256()
        with Path(path).open("rb") as fh:
            for chunk in iter(lambda: fh.read(1 << 20), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return None


def _hashes_load() -> dict[str, dict[str, Any]]:
    try:
        data = json.loads(HASHES_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _hashes_save(data: dict[str, dict[str, Any]]) -> None:
    try:
        HASHES_PATH.write_text(
            json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8"
        )
    except Exception as exc:
        print(f"[sidecar] hash-cache save failed: {exc}")


def _hashes_gc() -> None:
    """Drop cache entries whose physical upload file no longer exists."""
    data = _hashes_load()
    kept = {k: v for k, v in data.items() if (Path(UPLOAD_DIR) / k).is_file()}
    if len(kept) != len(data):
        _hashes_save(kept)

BS = chr(92)  # backslash constant; used by hash-cache display_path normalization

def _hashes_drop_display(display_path: str) -> None:
    """Remove hash-cache entries whose display_path matches a deleted doc.

    Without this, the fingerprint of a deleted file survives in
    kb-upload-hashes.json and re-uploading the same (or same-content) file is
    rejected as a duplicate (R2 exact / R3 cross-name)."""
    norm = str(display_path).replace(BS, "/").strip().strip("/")
    if not norm:
        return
    data = _hashes_load()
    kept = {k: v for k, v in data.items()
            if str((v or {}).get("display_path") or "").replace(BS, "/").strip().strip("/") != norm}
    if len(kept) != len(data):
        _hashes_save(kept)


async def _doc_title_by_id(rag: Any, doc_id: str) -> str | None:
    """Best-effort title (file_path) lookup that also sees FAILED rows.

    aget_docs_by_ids misses some FAILED/transitional docs; get_docs_by_status
    lists them, so scan every status when the fast path returns nothing."""
    try:
        rec = (await rag.lightrag.aget_docs_by_ids([doc_id])) or {}
        doc = rec.get(doc_id)
        if doc is not None:
            t = getattr(doc, "file_path", None) or (doc.get("file_path") if isinstance(doc, dict) else None)
            if t:
                return str(t)
    except Exception:
        pass
    from lightrag.base import DocStatus
    for st in (DocStatus.PROCESSED, DocStatus.PROCESSING, DocStatus.PENDING,
               DocStatus.FAILED, DocStatus.PREPROCESSED):
        try:
            mapping = await rag.lightrag.get_docs_by_status(st)
        except Exception:
            continue
        doc = (mapping or {}).get(doc_id)
        if doc is not None:
            t = getattr(doc, "file_path", None) or (doc.get("file_path") if isinstance(doc, dict) else None)
            if t:
                return str(t)
    return None



def _hashes_record(dest_name: str, path: str | Path, display_path: str,
                   sha256: str | None = None, source_mtime: float | None = None) -> None:
    p = Path(path)
    rec: dict[str, Any] = {
        "sha256": sha256 or _sha256_file(p),
        "size": p.stat().st_size if p.is_file() else None,
        "mtime": p.stat().st_mtime if p.is_file() else None,
        "source_mtime": source_mtime,
        "display_path": display_path,
    }
    if DUP_PHASH_ENABLED and Path(display_path).suffix.lower() in IMAGE_EXTS:
        rec["phash"] = _phash(p)
    data = _hashes_load()
    data[dest_name] = rec
    _hashes_save(data)


def _phash(path: str | Path) -> str | None:
    """64-bit DCT perceptual hash for images; None when Pillow is missing."""
    try:
        from PIL import Image
    except Exception:
        return None
    try:
        import math

        img = Image.open(path).convert("L").resize((32, 32), Image.LANCZOS)
        px = list(img.getdata())
        n = 32

        def dct1d(vec: list[float]) -> list[float]:
            return [
                sum(v * math.cos(math.pi * (2 * i + 1) * k / (2 * n)) for i, v in enumerate(vec))
                for k in range(n)
            ]

        rows = [dct1d(px[r * n:(r + 1) * n]) for r in range(n)]
        cols = [dct1d([rows[r][c] for r in range(n)]) for c in range(n)]
        flat = [cols[c][r] for r in range(1, 9) for c in range(1, 9)]
        med = sorted(flat)[len(flat) // 2]
        bits = 0
        for b in flat:
            bits = (bits << 1) | (1 if b > med else 0)
        return f"{bits:016x}"
    except Exception:
        return None


def _phash_similar(a: str, b: str) -> bool:
    try:
        dist = bin(int(a, 16) ^ int(b, 16)).count("1")
        return (64 - dist) / 64 * 100 >= DUP_PHASH_THRESHOLD
    except Exception:
        return False


def _trash_old_upload(display_path: str) -> list[str]:
    """Overwrite support: move the superseded physical file(s) into
    trash/<stamp>/ (kept DUP_TRASH_RETENTION_DAYS days) so an accidental
    overwrite stays recoverable. Returns the moved dest names."""
    mapping = _manifest_load()
    norm = str(display_path).replace("\\", "/")
    victims = [k for k, v in mapping.items() if str(v).replace("\\", "/") == norm]
    moved: list[str] = []
    if victims:
        tdir = TRASH_DIR / time.strftime("%Y%m%d-%H%M%S")
        try:
            tdir.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            print(f"[sidecar] trash mkdir failed: {exc}")
            return moved
        for k in victims:
            src = Path(UPLOAD_DIR) / k
            if src.is_file():
                try:
                    shutil.move(str(src), str(tdir / k))
                    moved.append(k)
                except Exception as exc:
                    print(f"[sidecar] trash move failed for {k}: {exc}")
        if moved:
            _auto_log("覆盖上传", f"{display_path} · 旧文件已移入回收站（保留 {DUP_TRASH_RETENTION_DAYS} 天）: {len(moved)} 个")
    _trash_gc()
    return moved


def _trash_gc() -> None:
    """Purge trash subdirs older than the retention window."""
    try:
        if not TRASH_DIR.is_dir():
            return
        cutoff = time.time() - DUP_TRASH_RETENTION_DAYS * 86400
        for d in TRASH_DIR.iterdir():
            if d.is_dir() and d.stat().st_mtime < cutoff:
                shutil.rmtree(d, ignore_errors=True)
    except Exception as exc:
        print(f"[sidecar] trash gc failed: {exc}")


def _versions_meta_load() -> dict[str, Any]:
    try:
        data = json.loads(VERSIONS_META_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _versions_meta_save(data: dict[str, Any]) -> None:
    try:
        VERSIONS_META_PATH.write_text(
            json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8"
        )
    except Exception as exc:
        print(f"[sidecar] versions meta save failed: {exc}")


def _versions_dir_for(display_path: str) -> Path:
    segs = [s.strip() for s in str(display_path).replace("\\", "/").split("/")
            if s.strip() and s.strip() not in (".", "..")]
    return VERSIONS_DIR.joinpath(*segs) if segs else VERSIONS_DIR / "_root"


def _archive_version(display_path: str) -> int:
    """Version support: move the current physical file(s) of a display path to
    versions/<display>/vN__<dest>, record metadata, and drop their manifest
    entries (the new upload re-adds its own). Returns the new version number."""
    norm = str(display_path).replace("\\", "/")
    mapping = _manifest_load()
    victims = [k for k, v in mapping.items() if str(v).replace("\\", "/") == norm]
    meta = _versions_meta_load()
    entry = meta.setdefault(norm, {"versions": []})
    ver = len(entry["versions"]) + 1
    vdir = _versions_dir_for(norm)
    if victims:
        try:
            vdir.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            print(f"[sidecar] versions mkdir failed: {exc}")
            return ver - 1 if entry["versions"] else 0
        for k in victims:
            src = Path(UPLOAD_DIR) / k
            if src.is_file():
                dstp = vdir / f"v{ver}__{k}"
                try:
                    shutil.move(str(src), str(dstp))
                    entry["versions"].append({
                        "v": ver,
                        "file": str(dstp),
                        "dest_name": k,
                        "size": dstp.stat().st_size,
                        "archived_at": _now_iso(),
                    })
                except Exception as exc:
                    print(f"[sidecar] version move failed for {k}: {exc}")
        # Cap the recorded history; the archive files themselves are never
        # auto-deleted (disk-bound, user-manageable via the versions dir).
        entry["versions"] = entry["versions"][-50:]
        meta[norm] = entry
        _versions_meta_save(meta)
        kept = {k2: v2 for k2, v2 in mapping.items() if str(v2).replace("\\", "/") != norm}
        if len(kept) != len(mapping):
            _manifest_save(kept)
        _auto_log("版本归档", f"{norm} · 旧版本 v{ver} 已归档至 versions/")
    return ver


def _unique_copy_display(display_path: str, taken: set[str], style: str = "copy") -> str:
    """New display path with a _copy_N (rename) or ' (N)' (keep_both) suffix."""
    norm = display_path.replace("\\", "/")
    dir_part, _, fname = norm.rpartition("/")
    stem, dot, suf = fname.rpartition(".")
    if dot:
        suf = f".{suf}"
    else:
        # extensionless name: rpartition(".") returns ("", "", fname), so the
        # whole name is the stem — without this guard the copy would become
        # "_copy_2" and lose the original name entirely.
        stem, suf = fname, ""
    for i in range(2, 1000):
        cand = f"{stem}_copy_{i}{suf}" if style == "copy" else f"{stem} ({i}){suf}"
        full = f"{dir_part}/{cand}" if dir_part else cand
        if full not in taken:
            return full
    cand = f"{stem}_copy_{uuid.uuid4().hex[:4]}{suf}" if style == "copy" else f"{stem} ({uuid.uuid4().hex[:4]}){suf}"
    return f"{dir_part}/{cand}" if dir_part else cand


# ---------------------------------------------------------------------------
# Original-file resolution (需求2: KB 打开原始布局文件)
# ---------------------------------------------------------------------------

# MIME type per extension, used when serving the original uploaded file.
MIME_BY_EXT: dict[str, str] = {
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".markdown": "text/markdown; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".json": "application/json",
    ".log": "text/plain; charset=utf-8",
    ".xml": "application/xml",
    ".yaml": "application/yaml",
    ".yml": "application/yaml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".dot": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docm": "application/vnd.ms-word.document.macroEnabled.12",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".pptm": "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".zip": "application/zip",
    ".rar": "application/vnd.rar",
    ".7z": "application/x-7z-compressed",
    ".tar": "application/x-tar",
}

# Extensions the browser can render inline (everything else is offered as a
# download so Word/Excel/PPT keep their original layout on the local machine).
INLINE_EXTENSIONS: set[str] = {
    ".txt", ".md", ".markdown", ".csv", ".json", ".log", ".xml", ".yaml", ".yml",
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg",
}


def _original_file_of(title: str | None) -> Path | None:
    """Locate the physical original upload for a doc's display path.

    Resolution order:
      1. manifest reverse lookup (dest_name → display_path), exact match;
      2. uploads-dir scan by the uuid-stripped basename (pre-manifest uploads).
    Returns None when the doc has no original file (e.g. pasted text)."""
    if not title:
        return None
    norm = str(title).replace("\\", "/")
    mapping = _manifest_load()
    for dest_name, display in mapping.items():
        if str(display).replace("\\", "/") == norm:
            candidate = Path(UPLOAD_DIR) / dest_name
            if candidate.is_file():
                return candidate
    base = norm.rsplit("/", 1)[-1]
    upload_dir = Path(UPLOAD_DIR)
    if base and upload_dir.is_dir():
        for p in upload_dir.iterdir():
            if not p.is_file():
                continue
            if re.sub(r"^[0-9a-f]{8}-", "", p.name) == base:
                return p
    return None


def _media_type_of(ext: str) -> str:
    return MIME_BY_EXT.get(ext.lower(), "application/octet-stream")


# Index rebuild progress (single background task at a time).
_rebuild_state: dict[str, Any] = {
    "running": False,
    "total": 0,
    "done": 0,
    "failed": [],
    "started_at": None,
    "finished_at": None,
    "error": None,
}


# ---------------------------------------------------------------------------
# RAG instance construction
# ---------------------------------------------------------------------------


def _build_rag():
    from raganything import RAGAnything, RAGAnythingConfig
    from lightrag.utils import EmbeddingFunc

    llm_cfg = CONFIG["llm"]
    api_key = llm_cfg.get("api_key") or os.environ.get("RAG_LLM_API_KEY") or ""
    if not api_key and _is_local_base_url(llm_cfg.get("base_url")):
        # 本机 Ollama 的 OpenAI 兼容端点不校验 Authorization，给占位值即可；
        # 否则「选了本地模型但没配 key」会让整个 RAG 实例构建失败。
        api_key = _LOCAL_LLM_PLACEHOLDER_KEY
    if not api_key:
        raise RuntimeError(
            "no LLM API key: set the RAG_LLM_API_KEY environment variable "
            "(the dsh-raganything plugin does this from the DSH credentials store)"
        )

    from lightrag.llm.openai import openai_complete_if_cache

    # Dual-model routing: ingestion-time bulk calls (entity/relation extraction,
    # keyword extraction) go to a fast flash model so a single document does not
    # spend 20+ minutes on reasoning-model think time (observed: deepseek-v4-flash
    # entity-extraction calls timed out at 1200s under 6-way concurrency).
    # Query answering keeps the primary model for answer quality.
    index_llm_model = (CONFIG.get("lightrag") or {}).get("index_llm_model")
    # 方案 B：索引调用显式关闭/降低模型的推理（thinking）开销。
    # 实测 qwen3.5-flash 实体抽取 40~60s -> ~2s（reasoning_effort="none"）。
    # 部分模型不接受该参数（如 glm-5.3-flash 会返回 400），失败时自动去掉
    # 参数重试一次，保证抽取流程不被参数兼容性打断。
    index_reasoning_effort = (CONFIG.get("lightrag") or {}).get("index_reasoning_effort")

    async def llm_model_func(prompt, system_prompt=None, history_messages=None, **kwargs):
        model = llm_cfg["model"]
        routed_index = False
        if index_llm_model and system_prompt:
            # Route only the INGEST-time bulk prompts (entity/relation
            # extraction, entity summarization, keyword extraction) to the fast
            # flash model. The RAG answer prompt must keep the primary model —
            # it mentions "Knowledge Graph Data" in its context block, so a
            # substring match on "knowledge graph" would wrongly fast-lane it.
            _sp = system_prompt.lower()
            if (
                "extracting entities and relationships" in _sp
                or "keyword extractor" in _sp
                or "data curation and synthesis" in _sp
            ):
                model = index_llm_model
                routed_index = True
        if routed_index and index_reasoning_effort:
            kwargs.setdefault("reasoning_effort", index_reasoning_effort)
        # 索引模型若在本机 Ollama 上存在就走本机端点，否则「llm 用本地、
        # index_llm 用云端」这种半套配置会静默把入库打挂。
        call_base_url = llm_cfg["base_url"]
        if routed_index:
            call_base_url = _resolve_base_url("llm", model, None) or call_base_url
        try:
            return await openai_complete_if_cache(
                model,
                prompt,
                system_prompt=system_prompt,
                history_messages=history_messages or [],
                api_key=api_key,
                base_url=call_base_url,
                **kwargs,
            )
        except Exception as exc:
            if routed_index and "reasoning_effort" in kwargs:
                kwargs.pop("reasoning_effort", None)
                print(f"[sidecar] index LLM call failed with reasoning_effort={index_reasoning_effort} ({exc}); retrying without it")
                try:
                    return await openai_complete_if_cache(
                        model,
                        prompt,
                        system_prompt=system_prompt,
                        history_messages=history_messages or [],
                        api_key=api_key,
                        base_url=call_base_url,
                        **kwargs,
                    )
                except Exception as exc2:
                    raise exc2 from exc
            raise

    vision_cfg = CONFIG.get("vision")

    def vision_model_func(prompt, system_prompt=None, history_messages=None, image_data=None, messages=None, **kwargs):
        if not vision_cfg:
            return llm_model_func(prompt, system_prompt, history_messages, **kwargs)
        if messages:
            return openai_complete_if_cache(
                vision_cfg["model"],
                "",
                system_prompt=None,
                history_messages=[],
                messages=messages,
                api_key=api_key,
                base_url=vision_cfg["base_url"],
                **kwargs,
            )
        if image_data:
            content = [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
            ]
            return openai_complete_if_cache(
                vision_cfg["model"],
                "",
                system_prompt=system_prompt,
                history_messages=history_messages or [],
                messages=[{"role": "user", "content": content}],
                api_key=api_key,
                base_url=vision_cfg["base_url"],
                **kwargs,
            )
        return llm_model_func(prompt, system_prompt, history_messages, **kwargs)

    emb_cfg = CONFIG["embedding"]
    if emb_cfg["backend"] == "ollama":

        async def _embed(texts: list[str]) -> list[list[float]]:
            async with httpx.AsyncClient(timeout=600.0) as client:
                resp = await client.post(
                    emb_cfg["base_url"].rstrip("/") + "/api/embed",
                    json={"model": emb_cfg["model"], "input": texts},
                )
                resp.raise_for_status()
                data = resp.json()
            embs = data.get("embeddings")
            if not embs or len(embs) != len(texts):
                raise RuntimeError(f"ollama embed returned {len(embs or [])} vectors for {len(texts)} inputs: {data}")
            return np.array(embs, dtype=np.float32)

    elif emb_cfg["backend"] == "openai":

        # Some OpenAI-compatible gateways deterministically return HTTP 500 for
        # single inputs above a token budget far smaller than the model's
        # native context (observed on tokens.store with Qwen3-Embedding GGUF:
        # >=~800 CJK tokens -> 500). Strategy: sub-batch, retry transient 5xx,
        # then degrade to shorter truncation tiers so one long chunk can never
        # wedge the whole ingest pipeline. Vector dims are unaffected.
        _EMB_URL = emb_cfg["base_url"].rstrip("/") + "/embeddings"
        _EMB_MODEL = emb_cfg["model"]
        _EMB_HEADERS = {"content-type": "application/json"}
        if emb_cfg.get("api_key_env"):
            _emb_key = os.environ.get(emb_cfg["api_key_env"]) or ""
            if _emb_key:
                _EMB_HEADERS["authorization"] = f"Bearer {_emb_key}"
        _EMB_TRUNC_TIERS = (None, 4000, 1500, 400)
        _EMB_BATCH = 16

        async def _embed_call(texts: list[str], timeout_s: float = 120.0):
            async with httpx.AsyncClient(timeout=timeout_s) as client:
                resp = await client.post(
                    _EMB_URL,
                    json={"model": _EMB_MODEL, "input": texts},
                    headers=_EMB_HEADERS,
                )
                resp.raise_for_status()
                data = resp.json()
            vecs = [item["embedding"] for item in data["data"]]
            if len(vecs) != len(texts):
                raise RuntimeError(
                    f"embeddings returned {len(vecs)} vectors for {len(texts)} inputs"
                )
            return np.array(vecs, dtype=np.float32)

        async def _embed_one(text: str) -> list[float]:
            last_exc: Exception | None = None
            for tier in _EMB_TRUNC_TIERS:
                candidate = text if tier is None else text[:tier]
                if not candidate:
                    candidate = text[:4000]
                for attempt in range(2):
                    try:
                        return (await _embed_call([candidate]))[0]
                    except httpx.HTTPStatusError as exc:
                        last_exc = exc
                        if exc.response.status_code < 500:
                            raise
                        await asyncio.sleep(1.5 * (attempt + 1))
            raise last_exc  # type: ignore[misc]

        async def _embed(texts: list[str]) -> list[list[float]]:
            out: list[list[float]] = []
            for i in range(0, len(texts), _EMB_BATCH):
                batch = list(texts[i : i + _EMB_BATCH])
                try:
                    out.extend(await _embed_call(batch))
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code < 500:
                        raise
                    print(f"[sidecar] embeddings 5xx on batch of {len(batch)}; "
                          "falling back to per-text truncation tiers")
                    for t in batch:
                        out.append(await _embed_one(t))
            # LightRAG/NanoVectorDB expect a numpy array (e.g. .size / shape
            # checks downstream) — never return a bare list.
            return np.array(out, dtype=np.float32)

    elif emb_cfg["backend"] == "gguf":
        # Local GGUF embedding (Qwen3-Embedding / bge-m3) via llama-cpp-python.
        # Works on NVIDIA CUDA and AMD ROCm: llama-cpp-python is built against
        # the same CUDA/ROCm runtime torch uses; GPU layers are picked from the
        # device detection below (nvidia/amd -> n_gpu_layers=-1, cpu -> 0).
        try:
            from llama_cpp import Llama as _Llama
        except ImportError:
            if _BOOTSTRAP["running"]:
                raise RuntimeError(
                    "本地 GGUF 嵌入所需 llama-cpp-python 正在自动安装中，"
                    "完成后 sidecar 会自动重启生效，请稍候重试。"
                )
            raise RuntimeError(
                "本地 GGUF 嵌入需要 llama-cpp-python 运行时。首次启动会自动安装；"
                "若自动安装失败，请在「AI 模型」面板手动安装（NVIDIA CUDA / AMD ROCm 均可），"
                "或改用远程 embedding 后端。"
            )
        _GGUF_PATH = emb_cfg["model_path"]
        if not _GGUF_PATH or not os.path.isfile(_GGUF_PATH):
            raise RuntimeError(
                f"本地 GGUF 模型文件不存在: {_GGUF_PATH}。首次启动会自动下载 bge-m3 模型，"
                "完成后 sidecar 会自动重启生效；也可在「AI 模型」面板手动下载。"
            )
        _GGUF_DIMS = int(emb_cfg.get("dims", 1024))
        _GGUF_CTX = int(emb_cfg.get("max_token_size", 8192))
        _device = _detect_device()
        _n_gpu = -1 if _device["vendor"] in ("nvidia", "amd") else 0
        print(f"[sidecar] gguf embedding: {_GGUF_PATH} ({_GGUF_DIMS}d, {_device['backend']}, gpu_layers={_n_gpu})")
        _llama = _Llama(model_path=_GGUF_PATH, embedding=True, n_ctx=_GGUF_CTX, n_gpu_layers=_n_gpu, verbose=False)
        # 并发安全：LightRAG 合并阶段会并发调用 embedding（async=8），而共享的
        # llama.cpp 实例的 create_embedding 非线程安全（实测 NULL pointer access /
        # llama_decode returned -1 崩溃）。串行化保证稳定；远程后端无此问题。
        _gguf_embed_lock = threading.Lock()

        def _gguf_embed_sync(texts: list[str]) -> np.ndarray:
            vecs = []
            for t in texts:
                with _gguf_embed_lock:
                    out = _llama.create_embedding(t)
                vecs.append(out["data"][0]["embedding"])
            return np.array(vecs, dtype=np.float32)

        async def _embed(texts: list[str]) -> list[list[float]]:
            return await asyncio.to_thread(_gguf_embed_sync, list(texts))

    else:
        raise RuntimeError(f"unknown embedding backend: {emb_cfg['backend']}")

    embedding_func = EmbeddingFunc(
        embedding_dim=int(emb_cfg["dims"]),
        max_token_size=int(emb_cfg.get("max_token_size", 8192)),
        func=_embed,
    )

    # ------------------------------------------------------------------
    # Rerank (optional): local cross-encoder loaded via transformers.
    # The sidecar reads the "rerank" section of config.json:
    #   "rerank": {
    #       "enabled": true,
    #       "model_path": "/path/to/bge-reranker-base",
    #       "device": "cpu" | "cuda"
    #   }
    # The async function follows LightRAG's index-based contract:
    #   rerank_func(query, documents, top_n) -> [{"index": i, "relevance_score": s}]
    # ------------------------------------------------------------------
    rerank_model_func = None
    rerank_cfg = CONFIG.get("rerank") or {}
    if rerank_cfg.get("enabled", False):
        import asyncio as _aio

        import torch as _torch

        _rerank_path = rerank_cfg["model_path"]
        _rerank_device = rerank_cfg.get("device", "cpu")

        _reranker_cache: dict[str, tuple] = {}

        def _get_reranker():
            # Load once and reuse: reloading the cross-encoder on every query
            # costs seconds and churns memory on this RAM-constrained host.
            if "model" not in _reranker_cache:
                from transformers import (
                    AutoModelForSequenceClassification,
                    AutoTokenizer,
                )

                tokenizer = AutoTokenizer.from_pretrained(_rerank_path)
                model = AutoModelForSequenceClassification.from_pretrained(_rerank_path)
                model.to(_rerank_device).eval()
                _reranker_cache["model"] = (tokenizer, model)
            return _reranker_cache["model"]

        def _rerank_sync(query: str, documents: list) -> list:
            tokenizer, model = _get_reranker()
            pairs = [[query, str(d)] for d in documents]
            inputs = tokenizer(
                pairs,
                padding=True,
                truncation=True,
                max_length=int(rerank_cfg.get("max_length", 512)),
                return_tensors="pt",
            )
            inputs = {k: v.to(_rerank_device) for k, v in inputs.items()}
            with _torch.no_grad():
                logits = model(**inputs).logits
                scores = logits.view(-1).sigmoid().tolist()
            return [
                {"index": i, "relevance_score": float(scores[i])}
                for i in range(len(documents))
            ]

        async def rerank_model_func(query: str, documents: list, top_n: int = None, **kwargs):
            if not documents:
                return []
            return await _aio.to_thread(_rerank_sync, query, list(documents))

        rerank_model_func._rerank_model_name = rerank_cfg.get("model", "bge-reranker-base")
        print(f"[sidecar] rerank enabled: {rerank_cfg.get('model', 'bge-reranker-base')} @ {_rerank_path} on {_rerank_device}")

    rag_config = RAGAnythingConfig(
        working_dir=CONFIG["working_dir"],
        use_full_path=True,
        parser=CONFIG.get("parser", "mineru"),
        parse_method=CONFIG.get("parse_method", "auto"),
        parser_output_dir=CONFIG.get("output_dir", str(Path(CONFIG["working_dir"]) / "output")),
        enable_image_processing=bool(CONFIG.get("enable_image_processing", True)),
        enable_table_processing=bool(CONFIG.get("enable_table_processing", True)),
        enable_equation_processing=bool(CONFIG.get("enable_equation_processing", True)),
        enable_audio_processing=bool(CONFIG.get("enable_audio_processing", False)),
        enable_video_processing=bool(CONFIG.get("enable_video_processing", False)),
    )

    # default_embedding_timeout: LightRAG's embedding worker defaults to 30s
    # (execution timeout 60s). With per-text truncation fallbacks for the
    # gateway's long-input 500s, a full batch can legitimately exceed that,
    # so raise the budget.
    lightrag_kwargs: dict[str, Any] = {
        "default_embedding_timeout": 180,
        # The gateway LLM can take >6min per chunk under load; LightRAG's
        # default (180s -> execution timeout 360s) kills those chunks.
        "default_llm_timeout": 600,
    }
    # Tunables from config.json "lightrag" section (speed/cache knobs for the
    # LightRAG pipeline: max_parallel_insert, chunk_token_size,
    # chunk_overlap_token_size, embedding_batch_num, entity_extract_max_gleaning).
    # This is the biggest ingest-time lever on this host: entity extraction is
    # per-chunk remote-LLM work, so raising max_parallel_insert (2 -> N) and
    # chunk_token_size (1200 -> 2000) cuts wall time several-fold.
    lr_cfg = CONFIG.get("lightrag") or {}
    for _key in (
        "max_parallel_insert",
        "chunk_token_size",
        "chunk_overlap_token_size",
        "embedding_batch_num",
        "embedding_func_max_async",
        "entity_extract_max_gleaning",
        "entity_summary_to_max_tokens",
        "enable_llm_cache",
        "default_llm_timeout",
        "default_embedding_timeout",
    ):
        if _key in lr_cfg:
            lightrag_kwargs[_key] = lr_cfg[_key]
    if rerank_model_func is not None:
        lightrag_kwargs["rerank_model_func"] = rerank_model_func
    rag_kwargs = {"lightrag_kwargs": lightrag_kwargs}

    return RAGAnything(
        config=rag_config,
        llm_model_func=llm_model_func,
        vision_model_func=vision_model_func,
        embedding_func=embedding_func,
        **rag_kwargs,
    )


async def _reconcile_stale_docs(rag: Any) -> None:
    """Reset docs stranded in a transient state by a previous process kill.

    An ingest interrupted by SIGKILL (or by restarting the sidecar mid-ingest)
    leaves its doc_status row at pending/processing forever: /documents keeps
    advertising a document that will never finish, and the entry can never be
    retried because the doc id already exists. Run once, right after the first
    successful LightRAG init, and mark those rows failed with an actionable
    message so the panel shows a real error instead of an eternal spinner.
    """
    try:
        lt = getattr(rag, "lightrag", None)
        store = getattr(lt, "doc_status", None)
        if lt is None or store is None:
            return
        from lightrag.base import DocStatus

        # Scan the RAW doc-status store rather than iterating DocStatus members.
        # A record whose status string is not in the enum (e.g. "handling",
        # written by an older/interrupted build) is invisible to
        # get_docs_by_status() yet its chunks + content hash are already in the
        # store, so every later re-index is rejected with "Content already
        # exists" while the panel can never show why. Sweeping the raw store
        # catches those zombies.
        known = {s.value for s in DocStatus}
        terminal = {DocStatus.PROCESSED.value, DocStatus.FAILED.value}
        transient = {DocStatus.PROCESSING.value, DocStatus.PENDING.value,
                     DocStatus.PREPROCESSED.value}
        raw_ids: list[str] = []
        try:
            raw = getattr(store, "_data", None) or getattr(store, "data", None)
            if isinstance(raw, dict):
                for doc_id, rec in raw.items():
                    st = str((rec or {}).get("status") or "")
                    if st not in terminal:
                        raw_ids.append(str(doc_id))
        except Exception:
            pass
        stale: list[str] = []
        for status in (DocStatus.PROCESSING, DocStatus.PENDING, DocStatus.PREPROCESSED):
            try:
                mapping = await lt.get_docs_by_status(status)
            except Exception:
                continue
            stale.extend(list((mapping or {}).keys()))
        for doc_id in raw_ids:
            if doc_id not in stale:
                stale.append(doc_id)
        if not stale:
            return
        reset = 0
        for doc_id in stale:
            try:
                rec = await store.get_by_id(doc_id)
                if not rec:
                    continue
                rec = dict(rec) if isinstance(rec, dict) else dict(getattr(rec, "__dict__", {}))
                if not rec:
                    continue
                # Only DocProcessingStatus fields survive: read paths rebuild the
                # record with DocProcessingStatus(**data) and silently drop any
                # doc carrying an unknown key, so use error_msg (not "error").
                rec.pop("error", None)
                rec["status"] = DocStatus.FAILED.value
                rec["error_msg"] = "interrupted by sidecar restart; re-upload or re-index to retry"
                await store.upsert({doc_id: rec})
                reset += 1
                # C5 compensation: queue exactly one automatic re-ingest.
                _record_interrupted_doc(doc_id, rec)
            except Exception as exc:
                print(f"[sidecar] reconcile {doc_id} failed: {type(exc).__name__}: {exc}")
        if hasattr(store, "index_done_callback"):
            try:
                await store.index_done_callback()
            except Exception:
                pass
        if reset:
            _auto_log("启动对账", f"重置 {reset} 个被中断文档为 failed")
            print(f"[sidecar] startup reconcile: reset {reset} stale doc(s) to failed")
    except Exception as exc:
        # Never let bookkeeping break startup.
        print(f"[sidecar] startup reconcile skipped: {type(exc).__name__}: {exc}")


async def ensure_rag():
    if _state["initialized"] and _state["rag"] is not None:
        return _state["rag"]
    async with _state["init_lock"]:
        if _state["initialized"] and _state["rag"] is not None:
            return _state["rag"]
        try:
            rag = _build_rag()
            init_result = await rag._ensure_lightrag_initialized()
            if not init_result or not init_result.get("success"):
                raise RuntimeError(f"LightRAG init failed: {(init_result or {}).get('error', 'unknown')}")
            _state["rag"] = rag
            _state["initialized"] = True
            _state["init_error"] = None
            if not _state.get("reconciled"):
                _state["reconciled"] = True
                try:
                    async def _startup_consistency() -> None:
                        await _reconcile_stale_docs(rag)
                        await _sweep_phantom_failed_rows(rag)
                    asyncio.get_running_loop().create_task(_startup_consistency())
                except Exception:
                    pass
            return rag
        except Exception as exc:
            _state["init_error"] = f"{type(exc).__name__}: {exc}"
            raise


# ---------------------------------------------------------------------------
# Task runner
# ---------------------------------------------------------------------------

INGEST_TIMEOUT_S = float(CONFIG.get("ingest_timeout_s", 1800))


def _status_of(entry: Any) -> str:
    """Read the status field from a DocProcessingStatus object, a raw dict, or
    a LightRAG DocStatus enum. LightRAG storage backends return either dicts or
    objects depending on the code path, and str() of a str-Enum member is
    'DocStatus.PROCESSED' (not 'processed') on Python >= 3.11 — always unwrap
    .value so the caller can compare against plain status names."""
    if entry is None:
        return ""
    raw = entry.get("status") if isinstance(entry, dict) else getattr(entry, "status", None)
    if raw is None:
        return ""
    if isinstance(raw, Enum):
        return str(raw.value)
    return str(raw)


def _field_of(entry: Any, name: str, default: Any = None) -> Any:
    """Read a field from either a DocProcessingStatus object or a raw dict."""
    if entry is None:
        return default
    if isinstance(entry, dict):
        return entry.get(name, default)
    return getattr(entry, name, default)


def _parser_env(device: str) -> dict[str, str]:
    """MinerU normally runs on CPU; allow `cuda` without the GPU blacklist so
    the parser subprocess can use the Jetson GPU for VLM. Layout stays on CPU:
    torch 2.14+cu130 has no official build for Orin CC 8.7 and its Layout
    inference hangs on the GPU (MINERU_LAYOUT_DEVICE is honoured by the
    mineru model_init patch)."""
    if device == "cuda":
        return {
            "MINERU_LAYOUT_DEVICE": "cpu",
            "PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
        }
    return {"CUDA_VISIBLE_DEVICES": ""}


def _register_processing(task_id: str, title: str) -> None:
    """Mark an upload as 'parsing' before the LightRAG doc record exists."""
    _state["processing_entries"][task_id] = {
        "title": title,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _unregister_processing(task_id: str) -> None:
    """Clear the 'parsing' marker once the ingest task settles."""
    _state["processing_entries"].pop(task_id, None)


async def _wait_doc_settled(rag, track_id: str, timeout_s: float = INGEST_TIMEOUT_S) -> dict[str, Any]:
    """LightRAG's ainsert returns a TRACK id before its background pipeline
    finishes. Resolve track_id → doc id(s), then poll document status until it
    reaches a terminal state (or the timeout)."""
    deadline = time.time() + timeout_s
    doc_status: dict[str, Any] = {}
    while time.time() < deadline:
        try:
            doc_status = await rag.lightrag.aget_docs_by_track_id(track_id)
        except Exception:
            doc_status = {}
        if doc_status:
            break
        await asyncio.sleep(2.0)
    if not doc_status:
        err = RuntimeError(f"no document found for track id {track_id} within {timeout_s:.0f}s")
        # Carry the (possibly unknown) doc id so the failure ledger can key a
        # later retry's delete-before-insert on it.
        err.doc_id = None  # type: ignore[attr-defined]
        raise err
    doc_id, last = next(iter(doc_status.items()))
    status_value = _status_of(last)
    while status_value not in ("processed", "failed") and time.time() < deadline:
        await asyncio.sleep(2.0)
        refreshed = await rag.lightrag.aget_docs_by_ids([doc_id])
        last = refreshed.get(doc_id)
        if last is None:
            break
        status_value = _status_of(last)
    if last is None:
        err = RuntimeError(f"document {doc_id} vanished from doc status storage")
        err.doc_id = doc_id  # type: ignore[attr-defined]
        raise err
    if status_value == "failed":
        err = RuntimeError(f"ingest pipeline failed: {_field_of(last, 'error_msg') or 'unknown error'}")
        err.doc_id = doc_id  # type: ignore[attr-defined]
        raise err
    if status_value != "processed":
        err = TimeoutError(f"ingest still '{status_value}' after {timeout_s:.0f}s")
        err.doc_id = doc_id  # type: ignore[attr-defined]
        raise err
    return {
        "doc_id": doc_id,
        "track_id": track_id,
        "status": status_value,
        "chunks_count": _field_of(last, "chunks_count"),
        "content_length": _field_of(last, "content_length"),
    }


# ---------------------------------------------------------------------------
# Re-upload: same display path REPLACES the previous document
# ---------------------------------------------------------------------------


async def _find_doc_ids_by_display(rag, display: str, manifest_aware: bool = False) -> list[str]:
    """Doc ids whose file_path equals the display path (exact match; namespace
    products DSH产物/知识库产物 are never matched)."""
    norm = _strip_vroot(display)
    if not norm:
        return []
    from lightrag.base import DocStatus

    # When manifest_aware, ignore docs whose display_path is no longer in the
    # upload manifest. Deletion prunes the manifest synchronously, so a just-
    # deleted doc no longer blocks re-upload even while LightRAG's async delete
    # is still in flight (it can be starved by the ingest lock).
    _manifest_set = ({str(v).replace(chr(92), '/') for v in _manifest_load().values()}
                     if manifest_aware else None)
    ids: list[str] = []
    for status_ in (DocStatus.PROCESSED, DocStatus.PROCESSING, DocStatus.PENDING,
                    DocStatus.FAILED, DocStatus.PREPROCESSED):
        try:
            mapping = await rag.lightrag.get_docs_by_status(status_)
        except Exception:
            continue
        for doc_id, doc in (mapping or {}).items():
            fp = str(getattr(doc, "file_path", "") or "").replace("\\", "/")
            if fp and fp == norm and not _is_ns_prefix(fp):
                if manifest_aware and _manifest_set is not None and fp not in _manifest_set:
                    continue
                ids.append(doc_id)
    return ids


async def _purge_failed_rows(rag: Any, display: str) -> int:
    """Delete FAILED doc rows sharing a display path after it indexed OK.

    LightRAG keeps every rejected duplicate as its own FAILED row. Those rows
    share the file_path of the healthy document, so both /documents and
    /index/files reported 失败 long after the file was fine. Removing them
    keeps the panel honest; the failure ledger is already cleared separately.
    """
    if not display or rag is None:
        return 0
    removed = 0
    try:
        for vid in await _find_doc_ids_by_display(rag, display):
            try:
                rec = (await rag.lightrag.aget_docs_by_ids([vid])) or {}
                doc = rec.get(vid)
                if doc is None:
                    continue
                if str(getattr(doc, "status", "")).lower() != "failed":
                    continue
                async with _state["ingest_lock"]:
                    await rag.lightrag.adelete_by_doc_id(vid)
                removed += 1
            except Exception as exc:
                print(f"[sidecar] purge failed row {vid} skipped: "
                      f"{type(exc).__name__}: {exc}")
    except Exception as exc:
        print(f"[sidecar] purge failed rows for {display} failed: "
              f"{type(exc).__name__}: {exc}")
    if removed:
        print(f"[sidecar] purged {removed} stale FAILED row(s) for {display}")
    return removed


async def _sweep_phantom_failed_rows(rag: Any) -> int:
    """Delete FAILED rows whose file_path also has a PROCESSED row.

    LightRAG turns every rejected duplicate ingest into its own FAILED row that
    shares the source path of the healthy document. /documents already hides
    them, but they still inflate the 索引 modal's 失败 count (and keep showing a
    stale red badge in the left nav) long after the file itself is fine. Sweep
    them once at startup so the panel agrees with the index; the failure ledger
    is reconciled separately.

    Matching is exact on the normalised file_path — never on the basename — so a
    genuinely failed document in another folder is never touched.
    """
    removed = 0
    try:
        lt = getattr(rag, "lightrag", None)
        store = getattr(lt, "doc_status", None)
        if lt is None or store is None:
            return 0
        from lightrag.base import DocStatus

        ok_paths: set[str] = set()
        try:
            processed = await lt.get_docs_by_status(DocStatus.PROCESSED)
        except Exception:
            processed = {}
        for doc in (processed or {}).values():
            fp = str(getattr(doc, "file_path", "") or "").replace("\\", "/")
            if fp:
                ok_paths.add(fp)
        try:
            raw = getattr(store, "_data", None) or getattr(store, "data", None)
        except Exception:
            raw = None
        if not ok_paths or not isinstance(raw, dict):
            return 0
        victims: list[str] = []
        for doc_id, rec in list(raw.items()):
            rec = rec if isinstance(rec, dict) else {}
            if str(rec.get("status") or "").lower() != DocStatus.FAILED.value:
                continue
            fp = str(rec.get("file_path") or "").replace("\\", "/")
            if fp and fp in ok_paths:
                victims.append(str(doc_id))
        for doc_id in victims:
            try:
                async with _state["ingest_lock"]:
                    await lt.adelete_by_doc_id(doc_id)
                removed += 1
            except Exception as exc:
                print(f"[sidecar] phantom failed row {doc_id} skipped: "
                      f"{type(exc).__name__}: {exc}")
    except Exception as exc:
        print(f"[sidecar] phantom failed sweep failed: {type(exc).__name__}: {exc}")
    if removed:
        print(f"[sidecar] swept {removed} phantom FAILED row(s) (source already indexed)")
    return removed


async def _delete_existing_by_display(rag, display: str) -> list[str]:
    """Re-upload support: remove existing doc(s) whose file_path equals the
    incoming display path, so uploading the same file again REPLACES the old
    index entry instead of duplicating it (duplicate docs would double-hit in
    query results and double the ingest cost on every rebuild). Namespace
    products (DSH产物/知识库产物) are never touched. Must run inside
    ingest_lock; returns the deleted doc ids."""
    victims = await _find_doc_ids_by_display(rag, display)
    for doc_id in victims:
        try:
            await rag.lightrag.adelete_by_doc_id(doc_id)
            _auto_log("重复上传替换", f"{display} · 已删除旧文档 {doc_id}")
        except Exception as exc:
            print(f"[sidecar] re-upload delete {doc_id} failed: {type(exc).__name__}: {exc}")
    return victims


# ---------------------------------------------------------------------------
# Index-failure ledger & compensation
#
# Classifies ingest failures (error_code), persists them in a sidecar ledger
# (kb-failures.json) and schedules automatic retries for transient classes
# (upstream LLM/embedding timeouts, restart-interrupted docs).
#
# Ground rules (see 索引失败处理与补偿策略设计):
#   * the task dict (_tasks) is in-memory and pruned — the ledger, NOT the task
#     dict, is the single source of truth for retry scheduling;
#   * failure reason for LightRAG doc_status may only ever be written to
#     `error_msg` (an extra `error` key makes the doc vanish from all APIs on
#     lightrag-hku 1.4.16);
#   * backoff NEVER sleeps inside ingest_lock — the reaper re-submits through
#     the normal task queue and lets the locks serialize;
#   * retries are delete-before-insert: the previous failed doc record is
#     removed first so re-ingesting cannot duplicate the document.
# ---------------------------------------------------------------------------

FAILURES_PATH = Path(CONFIG_PATH).parent / "kb-failures.json"
_failures_lock = threading.Lock()

# Configurable via the config file's "retry" key.
RETRY_CFG: dict[str, Any] = {
    "reaper_interval_s": 120,
    "daily_budget": 10,
    "circuit_window_s": 600,
    "circuit_threshold": 3,
    "circuit_pause_s": 1800,
    # Attempts that already burned more than this are never auto-retried:
    # a blind re-run would occupy the serialized ingest lane for ~15+ min.
    "max_duration_s": 900,
}
RETRY_CFG.update(CONFIG.get("retry") or {})

# error_code -> auto-retry policy. Classes absent here are manual-only.
RETRY_POLICY: dict[str, dict[str, Any]] = {
    "E_LLM_TIMEOUT": {"max_attempts": 3, "delays": [60, 300, 900]},
    "E_LLM_RATE": {"max_attempts": 3, "delays": [120, 600, 1800]},
    "E_LLM_CONN": {"max_attempts": 3, "delays": [60, 300, 900]},
    "E_LLM_5XX": {"max_attempts": 3, "delays": [60, 300, 900]},
    "E_PARSER_FAIL": {"max_attempts": 1, "delays": [300]},
    "E_INTERRUPTED": {"max_attempts": 1, "delays": [90]},
}

# Classification signals, first match wins (on "TypeName: message").
_ERROR_PATTERNS: list[tuple[str, str]] = [
    ("E_INTERRUPTED", r"interrupted by sidecar restart|vanished from doc status|no document found for track id"),
    ("E_TIMEOUT", r"ingest still '"),
    ("E_DISK_FULL", r"No space left|errno 28"),
    ("E_PERM", r"PermissionError|Permission denied|errno 13"),
    ("E_STORE_CORRUPT", r"JSONDecodeError|doc status storage"),
    ("E_DUPLICATE", r"already exist|duplicate"),
    ("E_LLM_RATE", r"RateLimitError|rate limit|status code 429|\b429\b"),
    ("E_LLM_TIMEOUT", r"APITimeoutError|ReadTimeout|ConnectTimeout|timed? ?out"),
    ("E_LLM_CONN", r"APIConnectionError|Connection error|connection refused|ConnectionReset|SSLError|getaddrinfo"),
    ("E_LLM_5XX", r"InternalServerError|APIStatusError|internal server error|bad gateway|service unavailable|status code 5\d\d"),
    ("E_PARSER_FAIL", r"Mineru command failed|Mineru|mineru"),
]


def _classify_error(exc: BaseException) -> str:
    """Map an exception to a coarse error_code (C0..C7 taxonomy, 策略设计 §1)."""
    if isinstance(exc, TimeoutError):
        return "E_TIMEOUT"
    text = f"{type(exc).__name__}: {exc}"
    for code, pattern in _ERROR_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return code
    return "E_UNKNOWN"


_circuit_ts: list[float] = []


def _circuit_open() -> bool:
    """Circuit breaker for upstream (E_LLM_*) storms: >= threshold failures
    inside the window pauses all automatic retries for circuit_pause_s."""
    now = time.time()
    while _circuit_ts and now - _circuit_ts[0] > RETRY_CFG["circuit_window_s"]:
        _circuit_ts.pop(0)
    return len(_circuit_ts) >= RETRY_CFG["circuit_threshold"]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _parse_iso(value: Any) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return None


def _failures_load() -> dict[str, Any]:
    try:
        data = json.loads(FAILURES_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _failures_save(store: dict[str, Any]) -> None:
    try:
        FAILURES_PATH.parent.mkdir(parents=True, exist_ok=True)
        FAILURES_PATH.write_text(
            json.dumps(store, ensure_ascii=False, indent=1), encoding="utf-8"
        )
    except Exception as exc:
        print(f"[sidecar] failures save failed: {exc}")


def _failures_resolve(display: str | None) -> None:
    """Drop the ledger entry once an ingest for `display` succeeds (a retry
    or a manual re-ingest recovered the document)."""
    if not display:
        return
    fid = str(display).replace("\\", "/")
    with _failures_lock:
        store = _failures_load()
        if fid in store:
            store.pop(fid, None)
            _failures_save(store)
            _auto_log("重试成功", f"{display} · 台账条目已清除")


def _record_ingest_failure(op: str, params: dict[str, Any], exc: BaseException,
                           duration_s: float | None = None) -> None:
    """Classify an ingest failure, upsert the ledger and queue an automatic
    retry when the class has a policy. Best-effort: bookkeeping must never
    mask the original pipeline error."""
    entry: dict[str, Any] = {}
    try:
        code = _classify_error(exc)
        params = params or {}
        display = str(params.get("display_path") or params.get("title")
                      or (Path(params["path"]).name if params.get("path") else "unknown"))
        fid = display.replace("\\", "/")
        path = params.get("path")
        ctx: dict[str, Any] = {"op": op}
        if path:
            p = Path(path)
            ctx.update({"path": str(p), "ext": p.suffix.lower()})
            try:
                ctx["size"] = p.stat().st_size
            except OSError:
                pass
        if duration_s is not None:
            ctx["duration_s"] = round(duration_s, 1)
        with _failures_lock:
            store = _failures_load()
            prev = store.get(fid) if isinstance(store.get(fid), dict) else {}
            attempts = int(prev.get("attempts") or 0) + 1
            # Retry params must carry EVERYTHING needed to re-submit the exact
            # same ingest. Bug found via the ledger (2026-09-09): dropping
            # display_path made the retried doc register under the physical
            # uuid path, so _failures_resolve could never match it.
            retry_params: dict[str, Any] = {"display_path": display}
            if path:
                retry_params["path"] = str(path)
            if op == "ingest_text":
                retry_params["title"] = display
                retry_params["text"] = str(params.get("text") or "")[:200_000]
            entry = {
                "id": fid,
                "display_path": display,
                "error_code": code,
                "error_msg": f"{type(exc).__name__}: {exc}"[:500],
                "attempts": attempts,
                "first_seen": prev.get("first_seen") or _now_iso(),
                "last_attempt": _now_iso(),
                "doc_id": getattr(exc, "doc_id", None) or params.get("doc_id") or prev.get("doc_id"),
                "params": retry_params,
                "context": {**(prev.get("context") or {}), **ctx},
            }
            policy = RETRY_POLICY.get(code)
            heavy = duration_s is not None and duration_s > RETRY_CFG["max_duration_s"]
            if policy and attempts < policy["max_attempts"] and not heavy:
                delay = policy["delays"][min(attempts - 1, len(policy["delays"]) - 1)]
                entry["lifecycle"] = "retrying"
                entry["next_retry_at"] = (
                    datetime.now(timezone.utc) + timedelta(seconds=delay)
                ).isoformat(timespec="seconds")
                if code.startswith("E_LLM"):
                    _circuit_ts.append(time.time())
            else:
                entry["lifecycle"] = "archived" if code == "E_NO_TEXT" else "failed"
                entry["next_retry_at"] = None
            store[fid] = entry
            _failures_save(store)
        if entry.get("lifecycle") == "retrying":
            _auto_log("自动重试排队", f"{display} · {code} · 第 {attempts} 次失败，稍后自动重试")
        else:
            _auto_log("失败定级", f"{display} · {code} · 转人工处理")
    except Exception as meta_exc:
        print(f"[sidecar] failure bookkeeping error: {type(meta_exc).__name__}: {meta_exc}")


def _record_empty_ingest(params: dict[str, Any], res: dict[str, Any]) -> None:
    """Pseudo-success guard: a parse that reports success but extracted zero
    characters is archived as E_NO_TEXT instead of silently passing."""
    try:
        params = params or {}
        display = str(params.get("display_path") or params.get("title") or "unknown")
        fid = display.replace("\\", "/")
        with _failures_lock:
            store = _failures_load()
            prev = store.get(fid) if isinstance(store.get(fid), dict) else {}
            store[fid] = {
                "id": fid,
                "display_path": display,
                "error_code": "E_NO_TEXT",
                "error_msg": "parsed successfully but extracted 0 characters; archived for manual review",
                "attempts": int(prev.get("attempts") or 0) + 1,
                "first_seen": prev.get("first_seen") or _now_iso(),
                "last_attempt": _now_iso(),
                "doc_id": (res or {}).get("doc_id") or prev.get("doc_id"),
                "lifecycle": "archived",
                "next_retry_at": None,
                "params": ({"path": str(params["path"]), "display_path": display}
                           if params.get("path") else {"title": display}),
                "context": {"how": (res or {}).get("how"), "op": "ingest"},
            }
            _failures_save(store)
        _auto_log("空文本入库", f"{display} · 0 字符，已标记仅存档")
    except Exception as exc:
        print(f"[sidecar] empty-ingest bookkeeping failed: {type(exc).__name__}: {exc}")


def _record_interrupted_doc(doc_id: str, rec: Any) -> None:
    """Ledger entry for a doc the startup reconcile reset to failed (C5):
    schedule exactly one automatic re-ingest when a source file exists."""
    try:
        display = str(
            getattr(rec, "file_path", None)
            or (rec.get("file_path") if isinstance(rec, dict) else "")
            or "unknown"
        )
        if display == "unknown":
            return
        fid = display.replace("\\", "/")
        src = _original_file_of(display)
        if src is None:
            return  # no source file to re-ingest from; keep the failed doc as-is
        with _failures_lock:
            store = _failures_load()
            store[fid] = {
                "id": fid,
                "display_path": display,
                "error_code": "E_INTERRUPTED",
                "error_msg": "interrupted by sidecar restart; scheduled one auto re-ingest",
                "attempts": 0,
                "first_seen": _now_iso(),
                "last_attempt": _now_iso(),
                "doc_id": doc_id,
                "lifecycle": "retrying",
                "next_retry_at": (
                    datetime.now(timezone.utc) + timedelta(seconds=90)
                ).isoformat(timespec="seconds"),
                "params": {"path": str(src)},
                "context": {"stage": "startup-reconcile"},
            }
            _failures_save(store)
        _auto_log("中断恢复", f"{display} · 90s 后自动重试入库")
    except Exception as exc:
        print(f"[sidecar] interrupted-doc bookkeeping failed: {type(exc).__name__}: {exc}")


async def _retry_entry(fid: str) -> bool:
    """Execute one due retry: budget/circuit guarded, delete-before-insert,
    then re-submit through the normal ingest task queue."""
    with _failures_lock:
        store = _failures_load()
        entry = store.get(fid)
        if not isinstance(entry, dict) or entry.get("lifecycle") != "retrying":
            return False
        meta = store.get("_meta") if isinstance(store.get("_meta"), dict) else {}
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if meta.get("date") != today:
            meta = {"date": today, "used": 0}
        if int(meta.get("used") or 0) >= RETRY_CFG["daily_budget"]:
            entry["next_retry_at"] = (
                datetime.now(timezone.utc) + timedelta(hours=1)
            ).isoformat(timespec="seconds")
            store[fid] = entry
            _failures_save(store)
            return False
    if _circuit_open():
        with _failures_lock:
            entry["next_retry_at"] = (
                datetime.now(timezone.utc) + timedelta(seconds=RETRY_CFG["circuit_pause_s"])
            ).isoformat(timespec="seconds")
            store[fid] = entry
            _failures_save(store)
        return False
    params = dict(entry.get("params") or {})
    op = str((entry.get("context") or {}).get("op") or "ingest")
    if op == "ingest_text":
        text = str(params.get("text") or "")
        if not text:
            with _failures_lock:
                entry["lifecycle"] = "archived"
                entry["error_msg"] = f"{entry.get('error_msg') or ''} | text not recorded; manual re-upload required".strip(" |")
                entry["next_retry_at"] = None
                store[fid] = entry
                _failures_save(store)
            return False
        with _failures_lock:
            meta["used"] = int(meta.get("used") or 0) + 1
            store["_meta"] = meta
            entry["last_attempt"] = _now_iso()
            entry["next_retry_at"] = None
            store[fid] = entry
            _failures_save(store)
        task_id = _submit("ingest_text", {"text": text, "title": params.get("title") or entry.get("display_path")})
        _auto_log("自动重试", f"{entry.get('display_path')} · task {task_id}")
        return True
    src = Path(params.get("path") or "")
    if not src.is_file():
        with _failures_lock:
            entry["lifecycle"] = "archived"
            entry["error_msg"] = f"{entry.get('error_msg') or ''} | source file missing; archived".strip(" |")
            entry["next_retry_at"] = None
            store[fid] = entry
            _failures_save(store)
        _auto_log("归档", f"{entry.get('display_path')} · 源文件丢失，转仅存档")
        return False
    # Idempotency: drop the previous failed doc record so re-ingesting does
    # not create a duplicate document (double hits in query results).
    #
    # E_DUPLICATE is special: the failing doc id is the REJECTED copy, while
    # the record blocking the insert is a DIFFERENT (already-processed) doc
    # with the same file_path. Deleting only entry["doc_id"] therefore never
    # clears the conflict and every retry fails again with "Content already
    # exists". Sweep every doc sharing the display path, not just the ledger id.
    rag = await ensure_rag()
    victims: list[str] = []
    old_doc_id = entry.get("doc_id")
    display_path = str(entry.get("display_path") or "")
    if old_doc_id:
        victims.append(str(old_doc_id))
    if display_path:
        try:
            for vid in await _find_doc_ids_by_display(rag, display_path):
                if vid not in victims:
                    victims.append(vid)
        except Exception as exc:
            print(f"[sidecar] retry sweep {display_path} failed: {type(exc).__name__}: {exc}")
    for vid in victims:
        try:
            existing = await rag.lightrag.aget_docs_by_ids([vid])
            if existing and existing.get(vid) is not None:
                async with _state["ingest_lock"]:
                    await rag.lightrag.adelete_by_doc_id(vid)
                print(f"[sidecar] retry pre-delete cleared {vid} for {display_path}")
        except Exception as exc:
            print(f"[sidecar] retry pre-delete {vid} failed: {type(exc).__name__}: {exc}")
    params.pop("doc_id", None)
    with _failures_lock:
        meta["used"] = int(meta.get("used") or 0) + 1
        store["_meta"] = meta
        entry["last_attempt"] = _now_iso()
        entry["next_retry_at"] = None
        store[fid] = entry
        _failures_save(store)
    task_id = _submit("ingest", params)
    _auto_log("自动重试", f"{entry.get('display_path')} · task {task_id}")
    return True


async def _retry_reaper_once() -> int:
    store = _failures_load()
    now = datetime.now(timezone.utc)
    dispatched = 0
    for fid, entry in store.items():
        if fid == "_meta" or not isinstance(entry, dict):
            continue
        if entry.get("lifecycle") != "retrying":
            continue
        nra = _parse_iso(entry.get("next_retry_at"))
        if nra is None or nra > now:
            continue
        if await _retry_entry(fid):
            dispatched += 1
    return dispatched


async def _retry_reaper_loop() -> None:
    print(f"[sidecar] retry reaper started (interval {RETRY_CFG['reaper_interval_s']}s)")
    while True:
        try:
            # Ledger self-heal first: entries whose doc already indexed OK must
            # not linger as FAILED badges or count against the 24h metrics.
            if _state["initialized"] and _state["rag"]:
                await _failures_reconcile(_failures_load())
            n = await _retry_reaper_once()
            if n:
                print(f"[sidecar] retry reaper dispatched {n} task(s)")
        except Exception as exc:
            print(f"[sidecar] retry reaper error: {type(exc).__name__}: {exc}")
        await asyncio.sleep(RETRY_CFG["reaper_interval_s"])


async def _failures_reconcile(store: dict[str, Any]) -> dict[str, Any]:
    """Drop ledger entries whose document actually indexed OK.

    Ingest paths that do not run through the sidecar task runner (plugin-side
    ingest_content_list, direct LightRAG use) never call `_failures_resolve`,
    so a later success left a stale FAILED badge in the panel even though the
    doc was PROCESSED. Cheap self-heal: compare each non-archived entry against
    the live doc statuses by file_path. Returns the (possibly pruned) store.
    """
    try:
        rag = _state["rag"] if (_state["initialized"] and _state["rag"]) else None
        if rag is None:
            return store
        from lightrag.base import DocStatus

        mapping = await rag.lightrag.get_docs_by_status(DocStatus.PROCESSED)
        ok_paths = {str(getattr(d, "file_path", "") or "").replace("\\", "/")
                    for d in (mapping or {}).values()}
        ok_paths.discard("")
        if not ok_paths:
            return store
        dropped: list[str] = []
        for key, entry in list(store.items()):
            if key == "_meta" or not isinstance(entry, dict):
                continue
            if str(entry.get("lifecycle") or "") in ("archived", "dismissed"):
                continue
            disp = str(entry.get("display_path") or entry.get("id") or "").replace("\\", "/")
            if not disp:
                continue
            if disp in ok_paths or Path(disp).name in {Path(p).name for p in ok_paths}:
                store.pop(key, None)
                dropped.append(disp)
        if dropped:
            _failures_save(store)
            _auto_log("台账自愈", f"清除 {len(dropped)} 条已成功入库的陈旧失败记录")
            print(f"[sidecar] failures reconcile: dropped {len(dropped)} stale entr(ies)")
        return store
    except Exception as exc:
        print(f"[sidecar] failures reconcile failed: {type(exc).__name__}: {exc}")
        return store


def _failures_metrics() -> dict[str, Any]:
    """Compact counters for /health and /status (monitoring hooks)."""
    store = _failures_load()
    cutoff = time.time() - 86400
    last_24h = 0
    retrying = 0
    by_code: dict[str, int] = {}
    for k, v in store.items():
        if k == "_meta" or not isinstance(v, dict):
            continue
        code = str(v.get("error_code") or "E_UNKNOWN")
        by_code[code] = by_code.get(code, 0) + 1
        if v.get("lifecycle") == "retrying":
            retrying += 1
        la = _parse_iso(v.get("last_attempt"))
        if la is not None and la.timestamp() >= cutoff:
            last_24h += 1
    meta = store.get("_meta") if isinstance(store.get("_meta"), dict) else {}
    used = int(meta.get("used") or 0) if meta.get("date") == datetime.now(timezone.utc).strftime("%Y-%m-%d") else 0
    return {
        "failures_24h": last_24h,
        "retrying": retrying,
        "by_error_code": by_code,
        "retry_budget_left": max(0, RETRY_CFG["daily_budget"] - used),
        "retry_circuit_open": _circuit_open(),
    }


def _op_label(op: str, params: dict[str, Any]) -> str:
    """Human-readable label for a task, used in auto log entries."""
    if op == "ingest":
        return str(params.get("display_path") or Path(params.get("path", "?")).name)
    if op == "ingest_text":
        return str(params.get("title") or "粘贴文本")
    if op == "ingest_office":
        return str(params.get("title") or "Office 导出")
    if op == "ingest_content_list":
        return str(params.get("file_path") or "内容列表")
    if op == "delete_document":
        return str(params.get("doc_id", "?"))[:16]
    return op


# 虚拟根目录（UI 的「全部文档」根视图）不是真实文件夹，任何已入库 chunk 的
# file_path 都不会带此前缀。前端在 @文件 时把根级文件拼成「全部文档/<名>」，
# 与入库时的真实 file_path（无前缀）不匹配，导致限定范围检索全部落空。
# 归一化时剥掉这一前缀，使 scope 与入库路径空间一致。
_VROOT_PREFIXES = ("全部文档/", "共享/")

def _strip_vroot(path: str) -> str:
    p = str(path or "").replace("\\", "/").strip()
    for pre in _VROOT_PREFIXES:
        if p.startswith(pre):
            return p[len(pre):]
    return p


def _normalize_scope(scope: Any) -> tuple[list[str], list[str]]:
    """把前端传来的 scope 归一化成 (files, folders)。

    files   —— 精确制导：与文档 file_path **全等**匹配。
    folders —— 区域聚焦：file_path 以「文件夹/」为前缀，天然覆盖所有子文件夹。
    两者都为空 == 未限定 == 全库检索（保持原有行为）。
    """
    files: list[str] = []
    folders: list[str] = []
    if isinstance(scope, dict):
        raw_files = scope.get("files") or []
        raw_folders = scope.get("folders") or []
    elif isinstance(scope, (list, tuple)):
        raw_files = list(scope)
        raw_folders = []
    elif isinstance(scope, str) and scope.strip():
        raw_files = []
        raw_folders = [scope]
    else:
        return [], []
    for f in raw_files:
        f = _strip_vroot(f).strip()
        if f and f not in files:
            files.append(f)
    for d in raw_folders:
        d = _strip_vroot(d).strip().strip("/")
        if d and d not in folders:
            folders.append(d)
    return files, folders


def _strip_ext(path: str) -> str:
    """去掉路径末尾的扩展名（只作用于最后一段）。

    必要原因：前端 @ 文件 chip 的 label 是「文件夹/文件名」且**扩展名被剥掉**
    （client.js groupDocsIntoFolders / pinnedFolders），而索引里 chunk 的
    file_path 是带扩展名的。不做这次归一化的话，UI 上点选文件永远匹配不上。
    """
    head, sep, base = str(path or "").rpartition("/")
    if "." in base and not base.startswith("."):
        base = base.rsplit(".", 1)[0]
    return f"{head}{sep}{base}"


def _in_scope(file_path: Any, files: list[str], folders: list[str]) -> bool:
    """file_path 是否落在指定作用域内。空作用域 == 全库。

    匹配顺序：先全等（最严格），再去扩展名后比较（兼容 UI chip）。
    """
    if not files and not folders:
        return True
    fp = str(file_path or "").replace("\\", "/").strip()
    if not fp:
        return False
    nfp = _strip_ext(fp)
    # 两端都剥虚拟根（全部文档/ 与 共享/）：兼容「chunk 带前缀、scope 不带」
    # 与「scope 带前缀、chunk 不带」两种方向，避免共享文件 @范围检索落空。
    fp0 = _strip_vroot(fp)
    nfp0 = _strip_ext(fp0)
    for f in files:
        f0 = _strip_vroot(f)
        nf0 = _strip_ext(f0)
        if fp == f or nfp == nf0 or fp0 == f0 or nfp0 == nf0:
            return True
    for d in folders:
        d0 = _strip_vroot(d)
        if (fp == d or fp.startswith(d + "/") or nfp == d or nfp.startswith(d + "/")
                or fp0 == d0 or fp0.startswith(d0 + "/") or nfp0 == d0 or nfp0.startswith(d0 + "/")):
            return True
    return False


def _excluded(file_path: Any, exclude_prefixes: list[str]) -> bool:
    """file_path 是否落在被排除的命名空间前缀下。"""
    if not exclude_prefixes:
        return False
    fp = str(file_path or "").replace("\\", "/").strip()
    return any(fp == p or fp.startswith(p + "/") for p in exclude_prefixes)


def _scope_desc(files: list[str], folders: list[str]) -> str:
    parts = [f"文件 {f}" for f in files] + [f"文件夹 {d}/" for d in folders]
    return "、".join(parts) if parts else "整个知识库"


async def _filtered_hits(rag, query_text: str, files: list[str], folders: list[str],
                         exclude_prefixes: list[str], top_k: int) -> list[dict[str, Any]]:
    """语义召回 → 按作用域过滤（包含 files/folders，排除 exclude_prefixes）→ top_k。

    files/folders 非空时是「精确制导/区域聚焦」；只有 exclude_prefixes 时是
    「全局检索但排除某些产物命名空间」。两者都为空 == 完全不过滤。
    """
    vdb = getattr(rag.lightrag, "chunks_vdb", None) or getattr(rag.lightrag, "text_chunks", None)
    if vdb is None or not hasattr(vdb, "query"):
        raise RuntimeError("LightRAG 未提供可用的 chunks 向量库（chunks_vdb）")

    last_exc: Exception | None = None
    results: list[dict[str, Any]] = []
    for recall in (4096, 1024, 256, 64, top_k):
        try:
            results = await vdb.query(query_text, top_k=recall)
            last_exc = None
            break
        except Exception as exc:  # noqa: BLE001 - 仅为兼容不同后端对 top_k 的限制
            last_exc = exc
            results = []
    if last_exc is not None:
        raise last_exc
    hits = [
        r for r in results
        if _in_scope(r.get("file_path"), files, folders)
        and not _excluded(r.get("file_path"), exclude_prefixes)
    ]
    return hits[:top_k]


async def _scoped_hits(rag, query_text: str, files: list[str], folders: list[str],
                       top_k: int) -> list[dict[str, Any]]:
    """先按语义全量召回，再按作用域过滤，取 top_k。

    为什么不用 LightRAG 的 doc_ids：LightRAG 1.4.16 的 QueryParam **没有**
    doc_ids / 作用域字段，aquery 无法下推过滤条件。但每个 chunk 都带
    file_path（已核对：与 kv_store_doc_status 的 file_path 零错配），所以
    「多召回 + 按 file_path 过滤」是等价且稳定的做法。
    """
    return await _filtered_hits(rag, query_text, files, folders, [], top_k)


class _UpstreamLLMError(RuntimeError):
    """上游 LLM 端点**在流里**主动报错（SSE 的 error 事件）。

    典型：llama.cpp 上下文超限时只发一个
    `data: {"error":{"message":"Context size has been exceeded.","code":500}}`
    然后收尾 —— 它没有 choices，被当成空增量吞掉（2026-09-15 定位）。
    """

    def __init__(self, message: str, code: Any = None) -> None:
        super().__init__(str(message))
        self.message = str(message)
        self.code = code


# 上游「上下文塞不下」的各种措辞：llama.cpp / vLLM / OpenAI / 各类网关。
_CONTEXT_OVERFLOW_MARKERS = (
    "context size has been exceeded",
    "exceeds the available context size",
    "context length exceeded",
    "context_length_exceeded",
    "maximum context length",
    "reduce the length of the messages",
    "prompt is too long",
    "too many tokens",
)


def _is_context_overflow(exc: BaseException) -> bool:
    body = f"{exc}".lower()
    return any(m in body for m in _CONTEXT_OVERFLOW_MARKERS)


# 参考资料放不下时值得「收缩重试一次」的 HTTP 状态：请求体过大 / 服务端内部失败。
_SHRINK_RETRY_STATUS = frozenset({400, 413, 422, 500})


async def _chat_stream(prompt: str, system_prompt: str, timeout_s: float = 900.0):
    """OpenAI 兼容接口的流式调用，产出 ("thinking"|"answer", 增量文本)。"""
    llm_cfg = CONFIG["llm"]
    api_key = llm_cfg.get("api_key") or os.environ.get("RAG_LLM_API_KEY") or ""
    url = llm_cfg["base_url"].rstrip("/") + "/chat/completions"
    payload = {
        "model": llm_cfg["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "stream": True,
    }
    # 空 api_key 必须**不发** Authorization 头：f"Bearer {api_key}" 在 key 为空时
    # 得到 b"Bearer "（尾部空格），httpx 直接抛 LocalProtocolError，比 401 更难排查。
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_s, connect=30.0)) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as resp:
            resp.raise_for_status()
            async for raw in resp.aiter_lines():
                line = (raw or "").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except Exception:  # noqa: BLE001 - 忽略心跳/非 JSON 行
                    continue
                # 上游在流中途失败时只发一个 error 事件就收尾（没有 choices）。
                # 旧代码 `if not delta: continue` 会把它静默吞掉，任务最终以
                # status=done + 空答案结束 —— 面板上表现为「检索失败但没报错」。
                err = chunk.get("error")
                if err:
                    if isinstance(err, dict):
                        msg = err.get("message") or err.get("detail") or str(err)
                        code = err.get("code")
                    else:
                        msg, code = err, None
                    raise _UpstreamLLMError(msg, code)
                choices = chunk.get("choices") or [{}]
                delta = choices[0].get("delta") if choices else {}
                if not delta:
                    continue
                if delta.get("reasoning_content"):
                    yield "thinking", delta["reasoning_content"]
                if delta.get("content"):
                    yield "answer", delta["content"]


_EXTRACTION_MARKERS = ("entity<|#|>", "relation<|#|>", "<|COMPLETE|>")


def _looks_like_extraction(text: str) -> bool:
    """判断一段回答是不是被模型写成了 LightRAG 的实体/关系抽取原文。

    背景（2026-09-13）：Ollama 里没有 chat template 的模型（`/api/show` 的 template
    为 `{{ .Prompt }}`）在长文档上下文下会间歇性滑向「文档处理模式」，把实体抽取结果
    当回答吐出来。`<|#|>` / `<|COMPLETE|>` 是 LightRAG 抽取链路的分隔符
    （tuple_delimiter / completion_delimiter），正常中文问答里不会出现，因此命中即可
    判定退化。判定刻意保守：短文本不判，避免用户真的在问这两个分隔符本身时被误伤。
    """
    body = (text or "").strip()
    if len(body) < 40:
        return False
    if "<|COMPLETE|>" in body:
        return True
    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
    if not lines:
        return False
    tagged = sum(1 for ln in lines
                 if ln.startswith(("entity<|#|>", "relation<|#|>",
                                   "entity<|##|>", "relation<|##|>")))
    return tagged >= 2 and tagged * 2 >= len(lines)


_ANTI_EXTRACTION_NUDGE = (
    "\n\n【重要】你上一次的回答误用了实体抽取格式（出现了 <|#|> 或 <|COMPLETE|>）。"
    "请重新回答：用自然流畅的中文、以普通段落或条目直接作答，"
    "绝对不要输出 entity/relation 行，也不要输出 <|#|>、<|COMPLETE|> 这类分隔符。"
)


SCOPED_SYSTEM_PROMPT = (
    "你是知识库问答助手。只能使用下面“参考资料”中的信息回答用户的问题。\n"
    "规则：\n"
    "1. 参考资料之外的信息一律不要使用，也不要编造；\n"
    "2. 若资料中没有答案，直接说明“指定范围内未找到相关信息”，不要臆测；\n"
    "3. 回答用中文，简洁准确，必要时引用来源编号；\n"
    "4. 不要提及“参考资料”这个词，直接给出答案。"
)


# 参考资料超出模型上下文时的收缩档位：(保留条数, 每条截断字符数)。
# 中文按 ~1.5 字/token 估：8 × 3000 字 ≈ 16k token，一路降到 1 × 300 字 ≈ 0.2k token，
# 覆盖 ctx 从 16k+ 一直到 ~1k 的小模型（实测 ctx=4096 时只有 4×1000 及以下的档位放得下）。
_SHRINK_TIERS: tuple[tuple[int, int], ...] = (
    (8, 3000), (4, 1000), (2, 500), (1, 300),
)


def _build_rag_prompt(hits: list[dict[str, Any]], query_text: str,
                      max_hits: int | None = None,
                      per_hit_chars: int | None = None) -> str:
    """把召回片段拼成「参考资料 + 问题」的 prompt。

    默认 None/None ⇒ 不裁剪，逐字等价于历史行为；收缩重试时传入上限。
    """
    selected = hits[:max_hits] if max_hits else hits
    blocks = []
    for i, h in enumerate(selected, 1):
        src = str(h.get("file_path") or "未知来源")
        body = str(h.get("content") or "")
        if per_hit_chars:
            body = body[:per_hit_chars]
        blocks.append(f"[{i}] 来源：{src}\n{body}")
    context = "\n\n---\n\n".join(blocks)
    return (
        f"参考资料：\n{context}\n\n"
        f"用户问题：{query_text}\n\n"
        f"请只依据上述参考资料作答。"
    )


async def _run_scoped_query_op(rag, query_text: str, files: list[str],
                               folders: list[str], set_progress, task: dict[str, Any],
                               q_started: float,
                               exclude_prefixes: list[str] | None = None) -> None:
    """带过滤的问答。两种形态：

    - files/folders 非空：@精确制导 / @区域聚焦（只检索被选中的文件/文件夹）。
    - 两者皆空但 exclude_prefixes 非空：全局检索，但排除产物命名空间
      （DSH产物 / 知识库产物 —— 由面板上的「纳入全局」开关控制）。
    """
    scoped = bool(files or folders)
    scope_desc = _scope_desc(files, folders)
    if scoped:
        label = f"正在按指定范围检索（{scope_desc}）…"
    elif exclude_prefixes:
        label = f"正在检索知识库（已排除 {'、'.join(exclude_prefixes)}）…"
    else:
        label = "正在检索知识库…"
    top_k = int((CONFIG.get("lightrag") or {}).get("scope_top_k", 20))
    set_progress("retrieval", label)

    hits = await _filtered_hits(rag, query_text, files, folders, exclude_prefixes or [], top_k)
    # 产物（DSH产物/知识库产物）不入库，按 file_paths 过滤命不中 —— 显式 @ 时
    # 直接读文件正文当参考资料注入，保住「@文件」的可用性。
    if scoped:
        for _i, (_disp, _txt) in enumerate(_artifact_scope_texts(files), 1):
            if _txt.strip():
                hits.append({"file_path": _disp, "content": _txt})
    if not hits:
        if scoped:
            note = (f"在「{scope_desc}」范围内没有检索到与该问题相关的内容。"
                    f"可以换个说法，或改用 @其他文件 / @其他文件夹，也可以不加 @ 进行全库检索。")
            if any(_is_ns_prefix(str(_f)) for _f in files):
                note += ("「对话产物」里的文件不参与知识库检索；如需把它当知识用，"
                         "请在右侧产物栏「更多操作 → 添加到个人知识库」后重试。")
        elif exclude_prefixes:
            note = (f"排除 {'、'.join(exclude_prefixes)} 后没有检索到与该问题相关的内容。"
                    f"可以在知识库面板把对应产物纳入全局检索后重试。")
        else:
            note = "没有检索到与该问题相关的内容。"
        set_progress("done", "没有命中内容")
        task["result"] = {
            "answer": note,
            "thinking": "",
            "mode": "scope" if scoped else "global",
            "scope": {"files": files, "folders": folders},
            "excluded": exclude_prefixes or [],
            "hits": 0,
            "elapsed": round(time.time() - q_started, 1),
        }
        return

    prompt = _build_rag_prompt(hits, query_text)

    async def _answer_once(sys_prompt: str) -> tuple[str, str]:
        """跑一轮流式生成，返回 (thinking, answer)。

        兜底：部分模型不吐 reasoning_content，而是把思考包在 <think> 里。
        """
        th = ""
        an = ""
        tick = 0.0
        async for kind, delta in _chat_stream(prompt, sys_prompt):
            if kind == "thinking":
                th += delta
            else:
                an += delta
            now = time.time()
            if now - tick >= 0.8:
                tick = now
                set_progress("generating", "正在生成回答…", thinking=th, answer=an)
        if "<think>" in an:
            head, sep, tail = an.partition("</think>")
            if sep:
                th = (th + head.split("<think>", 1)[-1]).strip()
                an = tail
            else:
                an = an.replace("<think>", "").strip()
        return th, an

    # ---- 上下文超限自愈（2026-09-15）----------------------------------------
    # 「召回太猛 → 参考资料塞爆模型上下文」是本地小 ctx 模型上最常见的失败形态。
    # 上游有两种报法：流里的 error 事件（llama.cpp）或 HTTP 400/413/422/500
    # （vLLM / 各类网关）。两种都收敛到「按档位收缩参考资料重试」，
    # 并且**绝不再把空回答当成功返回**。
    thinking, answer = "", ""
    need_shrink = False
    try:
        thinking, answer = await _answer_once(SCOPED_SYSTEM_PROMPT)
    except _UpstreamLLMError as exc:
        if not _is_context_overflow(exc):
            raise RuntimeError(f"问答失败：上游模型报错 —— {exc}") from exc
        need_shrink = True
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code not in _SHRINK_RETRY_STATUS:
            raise
        need_shrink = True

    # 上游没报错却没吐出答案（流被截断、旧版只回 error 事件、思考跑完没正文）。
    if not need_shrink and not answer.strip():
        need_shrink = True

    if need_shrink:
        last_exc: BaseException | None = None
        for _keep, _chars in _SHRINK_TIERS:
            _auto_log(
                "问答上下文收缩",
                f"参考资料超出模型上下文，按 {_keep} 条 × {_chars} 字重试 · {query_text[:60]}",
            )
            set_progress(
                "generating",
                f"参考资料过长，正在收缩到 {_keep} 条后重试…",
                thinking=thinking, answer=answer,
            )
            prompt = _build_rag_prompt(
                hits, query_text, max_hits=_keep, per_hit_chars=_chars
            )
            try:
                thinking, answer = await _answer_once(SCOPED_SYSTEM_PROMPT)
            except Exception as exc:  # noqa: BLE001 - 记录后继续降档
                last_exc = exc
                continue
            if answer.strip():
                break
        if not answer.strip():
            detail = f"（最后一次上游报错：{last_exc}）" if last_exc else ""
            hint = (f" 模型只产出了思考、没有正文：{thinking.strip()[:200]}…"
                    if thinking.strip() else "")
            raise RuntimeError(
                "问答失败：模型没有返回正文答案"
                f"{detail}{hint} 常见原因是参考资料超出模型上下文 —— "
                "可缩小 @范围 / 减少知识库正文，或提高模型服务的上下文上限（ctx-size）。"
            )

    # 退化防护（2026-09-13）：本机模型可能在长文档上下文下把回答写成 LightRAG 实体
    # 抽取原文。检测到就用显式纠正指令重跑一次；仍退化则打 degraded 标记，前端据此
    # 不再把这段文本写进「知识库产物」（否则抽取原文会被再次入库、自我强化）。
    degraded = _looks_like_extraction(answer)
    if degraded:
        print(f"[sidecar] answer looks like LightRAG extraction (len={len(answer)}), retry once")
        _auto_log("问答格式退化", f"命中抽取格式，已用纠正指令重试 · {query_text[:80]}")
        set_progress("generating", "回答格式异常，正在重新生成…", thinking=thinking, answer=answer)
        retry_thinking, retry_answer = await _answer_once(SCOPED_SYSTEM_PROMPT + _ANTI_EXTRACTION_NUDGE)
        if retry_answer.strip():
            thinking, answer = retry_thinking, retry_answer
            degraded = _looks_like_extraction(answer)
        if degraded:
            _auto_log("问答格式退化", "重试后仍为抽取格式，已标记 degraded=True")

    set_progress("done", "回答完成", thinking=thinking, answer=answer)
    task["result"] = {
        "answer": answer.strip(),
        "thinking": thinking.strip(),
        "mode": "scope" if scoped else "global",
        "scope": {"files": files, "folders": folders},
        "excluded": exclude_prefixes or [],
        "hits": len(hits),
        "sources": [str(h.get("file_path") or "") for h in hits[:10]],
        "degraded": degraded,
        "elapsed": round(time.time() - q_started, 1),
    }


# ---------------------------------------------------------------------------
# === shared-scope forward (2026-09-16) =====================================
# 多用户部署里，共享知识库实体只入库到「宿主 sidecar」（默认 17321），用户实例的
# rag 只持有自己的私有库（file_path 无「共享/」前缀）。前端 @ 共享文件时 scope
# 不带「共享/」前缀，用户实例本地检索永远 0 命中。这里把「命中共享文件夹」的
# 作用域拆分出来，转发到宿主 sidecar 检索，私有部分仍本地检索，最后合并。
_SHARED_KB_JSON = os.environ.get("RAG_SHARED_KB_JSON") or "/home/lgsj/.dsh/raganything/shared_kb.json"
_SHARED_FOLDER_CACHE = {"names": None, "ts": 0.0}

def _shared_folder_names():
    _now = time.time()
    _c = _SHARED_FOLDER_CACHE
    if _c["names"] is not None and (_now - _c["ts"]) < 30:
        return _c["names"]
    _names = set()
    try:
        with open(_SHARED_KB_JSON, encoding="utf-8") as _f:
            _d = json.load(_f)
        _folders = (_d.get("folders") or [])
        if isinstance(_folders, list):
            for _x in _folders:
                if isinstance(_x, dict) and _x.get("name"):
                    _names.add(_x["name"])
        elif isinstance(_folders, dict):
            _names.update(_folders.keys())
    except Exception:
        pass
    _c["names"] = _names
    _c["ts"] = _now
    return _names

def _split_shared_scope(files, folders):
    _names = _shared_folder_names()
    def _top(p):
        return str(p).replace("\\", "/").strip("/").split("/", 1)[0]
    def _iss(p):
        return _top(p) in _names
    return ([f for f in files if _iss(f)], [d for d in folders if _iss(d)],
            [f for f in files if not _iss(f)], [d for d in folders if not _iss(d)])

async def _forward_shared_scope_query(query_text, shared_files, shared_folders, set_progress, q_started):
    import httpx  # 惰性 import，避免拖慢启动
    _base = (os.environ.get("RAG_HOST_SIDECAR_URL")
             or (CONFIG.get("shared_kb") or {}).get("host_sidecar_url")
             or "http://127.0.0.1:17321").rstrip("/")
    _scope = {"files": ["共享/" + f for f in shared_files],
              "folders": ["共享/" + d for d in shared_folders]}
    _payload = {"op": "query", "params": {"query": query_text, "scope": _scope, "mode": "hybrid"}}
    set_progress("retrieval", "正在检索共享知识库（转发至宿主实例）…")
    async with httpx.AsyncClient(timeout=httpx.Timeout(900.0, connect=10.0)) as _cli:
        _r = await _cli.post(_base + "/tasks", json=_payload)
        _r.raise_for_status()
        _tid = (_r.json() or {}).get("task_id")
        if not _tid:
            raise RuntimeError("宿主实例未返回 task_id")
        while True:
            await asyncio.sleep(1.5)
            _st = await _cli.get(_base + "/tasks/" + _tid)
            _st.raise_for_status()
            _data = _st.json() or {}
            if _data.get("status") == "done":
                return _data.get("result") or {}
            if _data.get("status") == "error":
                raise RuntimeError(str(_data.get("error") or "宿主实例检索失败"))
            _prog = _data.get("progress") or {}
            if isinstance(_prog, dict) and _prog.get("stage"):
                set_progress(_prog.get("stage"), _prog.get("message", ""),
                             thinking=_prog.get("thinking", ""), answer=_prog.get("answer", ""))

def _merge_scope_results(shared_res, priv_res):
    shared_res = shared_res or {}
    priv_res = priv_res or {}
    _secs = []
    if shared_res.get("answer"):
        _secs.append("【共享知识库】\n" + shared_res.get("answer", ""))
    if priv_res.get("answer"):
        _secs.append("【私有知识库】\n" + priv_res.get("answer", ""))
    _answer = "\n\n".join(s for s in _secs if s).strip()
    if not _answer:
        _answer = shared_res.get("answer") or priv_res.get("answer") or "没有检索到与该问题相关的内容。"
    return {"answer": _answer,
            "thinking": shared_res.get("thinking", "") or priv_res.get("thinking", ""),
            "mode": "scope",
            "hits": (shared_res.get("hits") or 0) + (priv_res.get("hits") or 0),
            "sources": ((shared_res.get("sources") or []) + (priv_res.get("sources") or []))[:10],
            "degraded": bool(shared_res.get("degraded") or priv_res.get("degraded")),
            "elapsed": 0}

async def _route_scope_query(rag, query_text, scope_files, scope_folders, set_progress, task, q_started):
    # host-aware：宿主实例（_shared_is_local 为 True）本持共享库本体，直接本地检索；
    # 用户实例才把命中共享文件夹的作用域转发宿主 sidecar，避免转发自环。
    if _shared_is_local():
        await _run_scoped_query_op(
            rag, query_text, scope_files, scope_folders, set_progress, task, q_started,
        )
        return

    _sf, _sfold, _pf, _pfold = _split_shared_scope(scope_files, scope_folders)
    if not (_sf or _sfold):
        await _run_scoped_query_op(rag, query_text, scope_files, scope_folders, set_progress, task, q_started)
        return
    if not (_pf or _pfold):
        _res = await _forward_shared_scope_query(query_text, _sf, _sfold, set_progress, q_started)
        task["result"] = _res
        set_progress("done", "回答完成", thinking=_res.get("thinking", ""), answer=_res.get("answer", ""))
        return
    # 混合作用域：共享部分转发宿主，私有部分本地检索，合并回答
    await _run_scoped_query_op(rag, query_text, _pf, _pfold, set_progress, task, q_started)
    _priv_res = task.get("result")
    _shared_res = await _forward_shared_scope_query(query_text, _sf, _sfold, set_progress, q_started)
    task["result"] = _merge_scope_results(_shared_res, _priv_res)
    set_progress("done", "回答完成",
                 thinking=(_shared_res or {}).get("thinking", "") or (_priv_res or {}).get("thinking", ""),
                 answer=task["result"].get("answer", ""))
# === end shared-scope forward ==============================================

# Office 产物生成（Word / Excel / PPT）
#
# 知识库面板问答的回答是 markdown 文本；当用户要求「以 word/excel/ppt 格式
# 输出」时（或手动点击回答下方的导出按钮），sidecar 把 markdown 转成真正的
# .docx / .xlsx / .pptx 文件，存进 uploads 目录并登记 manifest，再以同一标题
# 入库 LightRAG —— 与 ingest_text 的 .md 产物同一套流程，产物出现在
# 「知识库产物」文件夹，可点击「打开原始文件」下载到本地用 Office 打开。
# 转换依赖 python-docx / openpyxl / python-pptx（venv 已内置），惰性 import
# 避免拖慢 sidecar 启动。
# ---------------------------------------------------------------------------

OFFICE_FORMAT_ALIASES: dict[str, str] = {
    "word": "docx", "doc": "docx", "docx": "docx",
    "excel": "xlsx", "xls": "xlsx", "xlsx": "xlsx",
    "ppt": "pptx", "powerpoint": "pptx", "pptx": "pptx",
}


def _normalize_office_format(fmt: str) -> str:
    key = str(fmt or "").strip().lower().lstrip(".")
    if key not in OFFICE_FORMAT_ALIASES:
        raise ValueError(f"unsupported office format: {fmt!r}; supported: docx/xlsx/pptx")
    return OFFICE_FORMAT_ALIASES[key]


_OFFICE_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_OFFICE_LIST_RE = re.compile(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$")
_OFFICE_QUOTE_RE = re.compile(r"^>\s?(.*)$")
_OFFICE_FENCE_RE = re.compile(r"^(`{3,}|~{3,})")
_OFFICE_HR_RE = re.compile(r"^\s*(-{3,}|\*{3,}|_{3,})\s*$")


def _office_strip_inline(text: str) -> str:
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text


def _office_split_inline(text: str) -> list[tuple[str, str]]:
    runs: list[tuple[str, str]] = []
    pos = 0
    pattern = re.compile(r"(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]*)`|\[([^\]]*)\]\(([^)]*)\))")
    for m in pattern.finditer(text):
        if m.start() > pos:
            runs.append(("text", text[pos:m.start()]))
        if m.group(2) is not None:
            runs.append(("bold", m.group(2)))
        elif m.group(3) is not None:
            runs.append(("italic", m.group(3)))
        elif m.group(4) is not None:
            runs.append(("code", m.group(4)))
        else:
            runs.append(("link", m.group(5)))
        pos = m.end()
    if pos < len(text):
        runs.append(("text", text[pos:]))
    return runs or [("text", text)]


class _OfficeBlock:
    __slots__ = ("kind", "level", "text", "items", "rows", "code", "lang")

    def __init__(self, kind: str, **kw: Any) -> None:
        self.kind = kind
        self.level = int(kw.get("level", 0))
        self.text = str(kw.get("text", ""))
        self.items = list(kw.get("items", []))
        self.rows = list(kw.get("rows", []))
        self.code = str(kw.get("code", ""))
        self.lang = str(kw.get("lang", ""))


def _office_parse_blocks(md: str) -> list[_OfficeBlock]:
    lines = md.splitlines()
    blocks: list[_OfficeBlock] = []
    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()

        m = _OFFICE_FENCE_RE.match(stripped)
        if m:
            fence = m.group(1)
            lang = stripped[len(fence):].strip()
            buf: list[str] = []
            i += 1
            while i < n:
                if lines[i].strip().startswith(fence[0] * len(fence)):
                    i += 1
                    break
                buf.append(lines[i])
                i += 1
            blocks.append(_OfficeBlock("code", code="\n".join(buf), lang=lang))
            continue

        m = _OFFICE_HEADING_RE.match(stripped)
        if m:
            blocks.append(_OfficeBlock("heading", level=len(m.group(1)), text=m.group(2).strip()))
            i += 1
            continue

        if stripped.startswith("|"):
            rows: list[list[str]] = []
            while i < n:
                s = lines[i].strip()
                if not s.startswith("|") and not s.endswith("|"):
                    break
                cells = [c.strip() for c in s.strip("|").split("|")]
                if all(re.fullmatch(r":?-{2,}:?", c) for c in cells):
                    i += 1
                    continue
                rows.append(cells)
                i += 1
            if len(rows) >= 1:
                blocks.append(_OfficeBlock("table", rows=rows))
                continue

        if _OFFICE_HR_RE.match(stripped):
            i += 1
            continue

        if stripped.startswith(">"):
            buf = []
            while i < n and lines[i].strip().startswith(">"):
                mm = _OFFICE_QUOTE_RE.match(lines[i].strip())
                buf.append(mm.group(1) if mm else "")
                i += 1
            blocks.append(_OfficeBlock("quote", text="\n".join(buf).strip()))
            continue

        m = _OFFICE_LIST_RE.match(line)
        if m:
            ordered = m.group(2)[0].isdigit()
            items: list[tuple[bool, str]] = []
            while i < n:
                lm = _OFFICE_LIST_RE.match(lines[i])
                if not lm:
                    break
                ordered = ordered or lm.group(2)[0].isdigit()
                items.append((ordered, lm.group(3).strip()))
                i += 1
            blocks.append(_OfficeBlock("list", items=items))
            continue

        if stripped:
            buf = [line.strip()]
            i += 1
            while i < n:
                s = lines[i].strip()
                if not s or _OFFICE_HEADING_RE.match(s) or _OFFICE_FENCE_RE.match(s) or _OFFICE_LIST_RE.match(lines[i]):
                    break
                if s.startswith("|") or s.startswith(">"):
                    break
                buf.append(s)
                i += 1
            blocks.append(_OfficeBlock("para", text=" ".join(buf)))
            continue

        i += 1
    return blocks


def _md_to_docx_bytes(md: str) -> bytes:
    from docx import Document
    from docx.oxml.ns import qn
    from docx.shared import Pt

    doc = Document()

    def set_cjk(style_or_run, name: str = "微软雅黑") -> None:
        try:
            style_or_run.font.name = name
            rpr = style_or_run._element.get_or_add_rPr()
            rfonts = rpr.find(qn("w:rFonts"))
            if rfonts is None:
                rfonts = rpr.makeelement(qn("w:rFonts"), {})
                rpr.append(rfonts)
            rfonts.set(qn("w:eastAsia"), name)
        except Exception:
            pass

    for sname in ("Normal", "Heading 1", "Heading 2", "Heading 3", "Heading 4",
                  "List Bullet", "List Number", "Title"):
        try:
            st = doc.styles[sname]
            set_cjk(st)
            if sname == "Normal":
                st.font.size = Pt(11)
        except Exception:
            pass

    def add_runs(paragraph, text: str) -> None:
        for kind, chunk in _office_split_inline(text):
            run = paragraph.add_run(chunk)
            if kind == "bold":
                run.bold = True
            elif kind == "italic":
                run.italic = True
            elif kind == "code":
                run.font.name = "Consolas"
                try:
                    rpr = run._element.get_or_add_rPr()
                    rf = rpr.get_or_add_rFonts()
                    rf.set(qn("w:ascii"), "Consolas")
                    rf.set(qn("w:hAnsi"), "Consolas")
                except Exception:
                    pass
            set_cjk(run)

    for b in _office_parse_blocks(md):
        if b.kind == "heading":
            h = doc.add_heading(level=min(b.level, 4))
            add_runs(h, b.text)
        elif b.kind == "para":
            add_runs(doc.add_paragraph(), b.text)
        elif b.kind == "quote":
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(18)
            add_runs(p, b.text)
        elif b.kind == "list":
            for ordered, item in b.items:
                add_runs(doc.add_paragraph(style="List Number" if ordered else "List Bullet"), item)
        elif b.kind == "table":
            if not b.rows:
                continue
            table = doc.add_table(rows=len(b.rows), cols=max(len(r) for r in b.rows))
            table.style = "Table Grid"
            for ri, row in enumerate(b.rows):
                row_cells = table.rows[ri].cells
                for ci in range(min(len(row), len(row_cells))):
                    add_runs(row_cells[ci].paragraphs[0], _office_strip_inline(row[ci]))
        elif b.kind == "code":
            p = doc.add_paragraph()
            run = p.add_run(b.code)
            run.font.name = "Consolas"
            try:
                rpr = run._element.get_or_add_rPr()
                rf = rpr.get_or_add_rFonts()
                rf.set(qn("w:ascii"), "Consolas")
                rf.set(qn("w:hAnsi"), "Consolas")
            except Exception:
                pass
            set_cjk(run)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _md_to_xlsx_bytes(md: str, max_sheets: int = 12) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    wb.remove(wb.active)
    blocks = _office_parse_blocks(md)
    tables = [b for b in blocks if b.kind == "table"]
    bold = Font(bold=True)

    def write_block(ws, b: _OfficeBlock, row: int) -> int:
        if b.kind == "heading":
            ws.cell(row=row, column=1, value=_office_strip_inline(b.text)).font = bold
        elif b.kind in ("para", "quote"):
            ws.cell(row=row, column=1, value=_office_strip_inline(b.text))
        elif b.kind == "list":
            for _o, item in b.items:
                ws.cell(row=row, column=1, value=_office_strip_inline(item))
                row += 1
            return row
        elif b.kind == "code":
            for ln in b.code.splitlines():
                ws.cell(row=row, column=1, value=ln)
                row += 1
            return row
        elif b.kind == "table":
            for ri, cells in enumerate(b.rows):
                for ci, val in enumerate(cells):
                    ws.cell(row=row + ri, column=ci + 1, value=_office_strip_inline(val))
            return row + len(b.rows)
        return row + 1

    if not tables:
        ws = wb.create_sheet("内容")
        row = 1
        for b in blocks:
            row = write_block(ws, b, row)
    else:
        ws = wb.create_sheet("概述")
        row = 1
        for b in blocks:
            if b.kind != "table":
                row = write_block(ws, b, row)
        cur_name = "概述"
        sheet_idx = 0
        for b in blocks:
            if b.kind == "heading":
                cur_name = _office_strip_inline(b.text)[:28] or "概述"
            elif b.kind == "table":
                sheet_idx += 1
                name = cur_name if cur_name != "概述" else f"表格{sheet_idx}"
                write_block(wb.create_sheet(name), b, 1)
                if sheet_idx >= max_sheets:
                    break

    if not wb.sheetnames:
        ws = wb.create_sheet("内容")
        ws.cell(row=1, column=1, value=_office_strip_inline(md)[:500])

    for ws in wb.worksheets:
        for col_cells in ws.columns:
            maxlen = 0
            for c in col_cells:
                if c.value is not None:
                    maxlen = max(maxlen, len(str(c.value)))
            if maxlen:
                ws.column_dimensions[get_column_letter(col_cells[0].column)].width = min(maxlen + 2, 60)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _office_set_pptx_cjk(run, name: str = "微软雅黑") -> None:
    try:
        run.font.name = name
        from pptx.oxml.ns import qn
        rPr = run._r.get_or_add_rPr()
        ea = rPr.find(qn("a:ea"))
        if ea is None:
            ea = rPr.makeelement(qn("a:ea"), {})
            rPr.append(ea)
        ea.set("typeface", name)
    except Exception:
        pass


def _md_to_pptx_bytes(md: str, max_slides: int = 30) -> bytes:
    from pptx import Presentation
    from pptx.util import Pt

    prs = Presentation()
    blocks = _office_parse_blocks(md)

    slides: list[tuple[str, list[_OfficeBlock]]] = []
    doc_title = "知识库回答"
    cur_title = doc_title
    cur: list[_OfficeBlock] = []
    for b in blocks:
        if b.kind == "heading":
            if b.level == 1 and not slides and not cur:
                doc_title = _office_strip_inline(b.text)
                cur_title = doc_title
                continue
            if slides or cur:
                slides.append((cur_title, cur))
            cur_title = _office_strip_inline(b.text)
            cur = []
        else:
            cur.append(b)
    if cur or not slides:
        slides.append((cur_title, cur))

    try:
        slide = prs.slides.add_slide(prs.slide_layouts[0])
        slide.shapes.title.text = doc_title
        _office_set_pptx_cjk(slide.shapes.title.text_frame.paragraphs[0].runs[0])
    except Exception:
        pass

    def fill_body(tf, bs: list[_OfficeBlock]) -> None:
        first_para = tf.paragraphs[0] if tf.paragraphs else None

        def add_par():
            nonlocal first_para
            if first_para is not None and not first_para.text:
                p = first_para
                first_para = None
                return p
            return tf.add_paragraph()

        for b in bs:
            if b.kind == "heading":
                p = add_par()
                r = p.add_run()
                r.text = _office_strip_inline(b.text)
                r.font.bold = True
                r.font.size = Pt(18)
                _office_set_pptx_cjk(r)
            elif b.kind == "para":
                p = add_par()
                r = p.add_run()
                r.text = _office_strip_inline(b.text)
                r.font.size = Pt(14)
                _office_set_pptx_cjk(r)
            elif b.kind == "quote":
                p = add_par()
                r = p.add_run()
                r.text = _office_strip_inline(b.text)
                r.font.size = Pt(13)
                r.font.italic = True
                _office_set_pptx_cjk(r)
            elif b.kind == "list":
                for _o, item in b.items:
                    p = add_par()
                    r = p.add_run()
                    r.text = "• " + _office_strip_inline(item)
                    r.font.size = Pt(14)
                    _office_set_pptx_cjk(r)
            elif b.kind == "table":
                if not b.rows:
                    continue
                p = add_par()
                r = p.add_run()
                r.text = "  |  ".join(_office_strip_inline(c) for c in b.rows[0])
                r.font.bold = True
                r.font.size = Pt(12)
                _office_set_pptx_cjk(r)
                for cells in b.rows[1:]:
                    p2 = add_par()
                    r2 = p2.add_run()
                    r2.text = "  |  ".join(_office_strip_inline(c) for c in cells)
                    r2.font.size = Pt(12)
                    _office_set_pptx_cjk(r2)
            elif b.kind == "code":
                for ln in b.code.splitlines()[:40]:
                    p = add_par()
                    r = p.add_run()
                    r.text = ln
                    r.font.size = Pt(11)
                    _office_set_pptx_cjk(r)

    for idx, (stitle, bs) in enumerate(slides[: max_slides - 1]):
        slide = prs.slides.add_slide(prs.slide_layouts[1])
        try:
            slide.shapes.title.text = stitle
            for para in slide.shapes.title.text_frame.paragraphs:
                for r in para.runs:
                    _office_set_pptx_cjk(r)
        except Exception:
            pass
        body = slide.placeholders[1].text_frame
        body.word_wrap = True
        fill_body(body, bs)

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()


def markdown_to_office(md: str, fmt: str) -> bytes:
    fmt = _normalize_office_format(fmt)
    if fmt == "docx":
        return _md_to_docx_bytes(md)
    if fmt == "xlsx":
        return _md_to_xlsx_bytes(md)
    return _md_to_pptx_bytes(md)


def _write_office_artifact(text: str, title: str, fmt: str) -> tuple[str, str]:
    """Generate an Office file from markdown text into the uploads dir and
    register it in the manifest. Returns (dest_name, display_path)."""
    fmt = _normalize_office_format(fmt)
    data = markdown_to_office(text, fmt)
    base = Path(str(title).replace("\\", "/")).name or f"导出.{fmt}"
    if not base.lower().endswith("." + fmt):
        base = f"{base}.{fmt}"
    dest_name = f"{uuid.uuid4().hex[:8]}-{base}"
    dest = Path(UPLOAD_DIR) / dest_name
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return dest_name, str(title)


async def _run_query_op(params: dict[str, Any], task: dict[str, Any]) -> None:
    """One retrieval query, surfaced to the UI the way DSH answers are: the
    user sees the thinking process live (retrieval stages + the model's
    chain-of-thought streaming), and the finished turn carries both the
    thinking and the final answer.

    The query LLM generation runs in streaming mode (LightRAG wraps COT in
    `<think>…</think>`), so `task["progress"]` is updated ~every second with
    the growing thinking/answer text and an elapsed counter; the KB panel
    polls it and renders a live 思考过程 block instead of a blank wait.
    `task["result"]` then contains `{"answer", "thinking", "mode"}`.

    VLM-enhanced queries (explicit `vlm_enhanced: true`) cannot stream —
    they run two LightRAG passes plus a vision call — so they keep the
    non-streaming path with stage progress only. The default (param absent)
    is the plain streaming path: it is strictly faster (one retrieval pass)
    and gives live thinking.
    """
    rag = await ensure_rag()
    mode = params.get("mode") or "hybrid"
    query_text = params["query"]
    q_started = time.time()

    def set_progress(stage: str, message: str, thinking: str = "", answer: str = "", **extra):
        task["progress"] = {
            "stage": stage,
            "message": message,
            "elapsed": round(time.time() - q_started, 1),
            "thinking": thinking,
            "answer": answer,
            **extra,
        }

    # Keep the elapsed counter live even while we are blocked inside LightRAG
    # (retrieval can take tens of seconds with no token to report yet).
    async def _ticker():
        try:
            while task["status"] not in ("done", "error", "cancelled"):
                await asyncio.sleep(1.0)
                p = task.get("progress")
                if isinstance(p, dict):
                    p["elapsed"] = round(time.time() - q_started, 1)
                    task["progress"] = dict(p)
        except asyncio.CancelledError:
            pass

    ticker = asyncio.create_task(_ticker())
    try:
        # @指定文件 / @指定文件夹 —— 精确制导 / 区域聚焦（含所有子文件夹）。
        # 未指定作用域时 files/folders 皆为空，走原来的全库检索路径。
        _scope_files, _scope_folders = _normalize_scope(params.get("scope"))
        if _scope_files or _scope_folders:
            _auto_log(
                "知识库问答(限定范围)",
                f"{_scope_desc(_scope_files, _scope_folders)} · {params['query'][:120]}",
            )
            await _route_scope_query(
                rag, query_text, _scope_files, _scope_folders,
                set_progress, task, q_started,
            )
            return

        # 全局检索的产物排除：面板开关默认「不纳入」，此时 DSH产物/知识库产物
        # 不进入全局检索（@ 显式指定时不受影响 —— 上面已 return）。
        _excl = _excluded_prefixes()
        if _excl:
            _auto_log("知识库问答(排除产物)", f"排除 {'、'.join(_excl)} · {params['query'][:120]}")
            if params.get("only_need_context"):
                set_progress("retrieval", f"正在检索上下文（已排除 {'、'.join(_excl)}）…")
                top_k = int((CONFIG.get("lightrag") or {}).get("scope_top_k", 20))
                hits = await _filtered_hits(rag, query_text, [], [], _excl, top_k)
                if not hits:
                    answer = (f"排除 {'、'.join(_excl)} 后没有检索到与该问题相关的内容。")
                else:
                    answer = "\n\n---\n\n".join(
                        f"来源：{h.get('file_path')}\n{h.get('content') or ''}" for h in hits
                    )
                set_progress("done", "检索完成")
                task["result"] = {"answer": answer, "mode": "global", "thinking": "",
                                  "excluded": _excl}
                return
            await _run_scoped_query_op(
                rag, query_text, [], [], set_progress, task, q_started,
                exclude_prefixes=_excl,
            )
            return

        if params.get("only_need_context"):
            set_progress("retrieval", "正在检索上下文…")
            answer = await rag.aquery(query_text, mode=mode, vlm_enhanced=False, only_need_context=True)
            set_progress("done", "检索完成")
            task["result"] = {"answer": answer, "mode": mode, "thinking": ""}
            return

        set_progress("retrieval", "正在理解问题并检索知识库（向量/实体/图谱）…")
        if params.get("vlm_enhanced") is True:
            set_progress("vlm", "正在多模态增强检索（图像理解）…")
            answer = await rag.aquery(query_text, mode=mode, vlm_enhanced=True)
            set_progress("done", "回答完成")
            task["result"] = {"answer": answer, "mode": mode, "thinking": ""}
            return

        # Plain path: force one retrieval pass and stream the LLM answer so
        # the model's reasoning arrives live (LightRAG emits `<think>`…).
        stream = await rag.aquery(query_text, mode=mode, vlm_enhanced=False, stream=True)

        # A cached query (or a non-streaming fallback) returns a plain string.
        if isinstance(stream, str):
            set_progress("done", "回答完成")
            task["result"] = {"answer": stream, "mode": mode, "thinking": ""}
            return

        # LightRAG swallows LLM failures (e.g. upstream APITimeoutError) and
        # returns None instead of raising; without this guard the loop below
        # dies with a confusing "'async for' requires __aiter__" TypeError.
        if stream is None:
            raise RuntimeError(
                "模型接口超时或被限流（LLM 调用未返回内容），请稍后重试；"
                "若正在解析大文档，建议等解析完成后再提问"
            )

        buf = ""
        thinking = ""
        answer = ""
        closed = False
        last_tick = 0.0
        async for token in stream:
            buf += token
            if not closed:
                if buf.startswith("<think>"):
                    idx = buf.find("</think>")
                    if idx != -1:
                        closed = True
                        head, _, tail = buf.partition("</think>")
                        thinking = head[len("<think>"):].strip()
                        answer = tail
                        buf = tail
                else:
                    # Content arrived without a COT marker: it is all answer.
                    closed = True
                    answer = buf
            else:
                answer = buf
            now = time.time()
            if now - last_tick >= 0.8:
                last_tick = now
                if not closed:
                    set_progress("generating", "模型思考中…", thinking=thinking, answer=answer)
                else:
                    set_progress("generating", "正在生成回答…", thinking=thinking, answer=answer)
        _plain_degraded = _looks_like_extraction(answer)
        if _plain_degraded:
            _auto_log("问答格式退化",
                      f"全库检索路径命中抽取格式（len={len(answer)}）· {query_text[:80]}")
        set_progress("done", "回答完成", thinking=thinking, answer=answer)
        task["result"] = {
            "answer": answer,
            "mode": mode,
            "thinking": thinking,
            "degraded": _plain_degraded,
            "elapsed": round(time.time() - q_started, 1),
        }
    finally:
        ticker.cancel()


def _reject_unsupported(ext: str, name: str = "") -> None:
    """Fail fast (and loudly) on file types the sidecar cannot really ingest.

    Without this guard MinerU is handed arbitrary binaries; depending on the
    file it either errors deep inside the parser or reports success after
    ingesting nothing useful, and the upload stays in the manifest so every
    later rebuild retries it forever.
    """
    if ext in AUDIO_EXTS and not CONFIG.get("enable_audio_processing"):
        raise ValueError(
            f"audio processing is disabled (enable_audio_processing=false); "
            f"cannot ingest {ext} file{(': ' + name) if name else ''}"
        )
    # TEXT_EXTS must pass too: the rebuild worker guards every file with this
    # check BEFORE its own txt/md branch, and the error message below already
    # advertises TEXT_EXTS | PARSER_SUPPORTED_EXTS as supported (bug found via
    # the failure ledger: every rebuild rejected .md uploads, attempts=6).
    if ext not in (TEXT_EXTS | PARSER_SUPPORTED_EXTS):
        raise ValueError(
            f"unsupported file type {ext or '(none)'}{(': ' + name) if name else ''}; "
            f"supported: {', '.join(sorted(TEXT_EXTS | PARSER_SUPPORTED_EXTS))}"
        )


async def _run_op(op: str, params: dict[str, Any], task: dict[str, Any]) -> None:
    label = _op_label(op, params)
    started = time.time()
    if op.startswith("ingest"):
        _auto_log("开始解析", label)
    try:
        # 查询不再与入库争抢名额（详见 _query_semaphore 注释）。
        _sem = _query_semaphore if op == "query" else _task_semaphore
        async with _sem:
            task["status"] = "running"
            task["started_at"] = time.time()

            if op == "query":
                await _run_query_op(params=params, task=task)

            elif op == "ingest_text":
                title = params.get("title") or "text"
                if _is_ns_prefix(title):
                    # 2026-09-14：对话问答记录属于产物，只落盘、不入库。
                    _artifact_supersede(title)
                    dest_name, display_path = _write_text_artifact(params["text"], title)
                    _manifest_add(dest_name, display_path)
                    task["result"] = {
                        "doc_id": ART_ID_PREFIX + dest_name,
                        "status": "stored",
                        "file_only": True,
                        "title": title,
                        "chars": len(params["text"]),
                    }
                else:
                    rag = await ensure_rag()
                    async with _state["ingest_lock"]:
                        doc_id = await rag.lightrag.ainsert(params["text"], file_paths=[title])
                        summary = await _wait_doc_settled(rag, str(doc_id))
                    task["result"] = {**summary, "title": title, "chars": len(params["text"])}

            elif op == "ingest_office":
                # 2026-09-14：产物只落盘、不入库 —— 不解析、不向量化、不进实体图谱。
                # 需要把它当知识用时，用户在右侧「对话产物」栏点「添加到个人知识库」。
                fmt = _normalize_office_format(params.get("format") or "docx")
                title = params.get("title") or f"导出-{datetime.now().strftime('%Y%m%d-%H%M%S')}.{fmt}"
                task["progress"] = {"stage": "生成", "percent": 60,
                                    "message": f"正在生成 {fmt.upper()} 文件…"}
                _artifact_supersede(title)
                dest_name, display_path = _write_office_artifact(params["text"], title, fmt)
                _manifest_add(dest_name, display_path)
                task["progress"] = {"stage": "完成", "percent": 100,
                                    "message": "已生成（仅文件，不进入知识库索引）"}
                task["result"] = {
                    "doc_id": ART_ID_PREFIX + dest_name,
                    "status": "stored",
                    "existing": False,
                    "file_only": True,
                    "title": title,
                    "format": fmt,
                    "file": display_path,
                    "chars": len(params["text"]),
                }

            elif op == "ingest":
                rag = await ensure_rag()
                path = params["path"]
                if not Path(path).is_file():
                    raise FileNotFoundError(f"no such file: {path}")
                ext = Path(path).suffix.lower()
                async with _state["ingest_lock"]:
                    # Re-upload semantics: a file uploaded again under the same
                    # display path replaces the old document (delete-before-
                    # insert) instead of creating a duplicate.
                    _display = str(params.get("display_path") or Path(path).name)
                    removed = await _delete_existing_by_display(rag, _display)
                    _manifest_prune_display(_display, keep=Path(path).name)
                    if removed:
                        task["progress"] = {
                            "stage": "替换旧文档", "percent": 5,
                            "message": f"检测到同名旧文档，已删除 {len(removed)} 份，重新入库…",
                        }
                    if ext in (".txt", ".md", ".markdown"):
                        task["progress"] = {"stage": "入库", "percent": 20,
                                            "message": "直接写入文本…"}
                        text = Path(path).read_text(encoding="utf-8", errors="replace")
                        if params.get("dup_copy"):
                            text = f"[知识库副本 · 来源: {_display}]\n\n{text}"
                        _fp = params.get("display_path") or path
                        try:
                            doc_id = await rag.lightrag.ainsert(text, file_paths=[_fp])
                        except Exception as exc:
                            # Same zombie-original case as the rebuild path:
                            # clear the unreachable blocker, then insert once.
                            # (locked=True: we already hold ingest_lock above.)
                            if not await _clear_duplicate_blocker(rag, _display, exc, locked=True):
                                raise
                            doc_id = await rag.lightrag.ainsert(text, file_paths=[_fp])
                        task["progress"] = {"stage": "索引", "percent": 60,
                                            "message": "分块/向量/实体索引中…"}
                        summary = await _wait_doc_settled(rag, str(doc_id))
                        task["progress"] = {"stage": "完成", "percent": 100}
                        task["result"] = {**summary, "path": path, "chars": len(text), "how": "direct"}
                    elif ext == ".pdf":
                        await _ingest_pdf(rag, Path(path), params, task, label)
                    else:
                        _reject_unsupported(ext, Path(path).name)
                        await _ingest_via_mineru(rag, Path(path), params, task, label)

            elif op == "ingest_content_list":
                rag = await ensure_rag()
                async with _state["ingest_lock"]:
                    await rag.insert_content_list(
                        content_list=params["content_list"],
                        file_path=params.get("file_path", "unknown_document"),
                        doc_id=params.get("doc_id"),
                    )
                task["result"] = {"ok": True, "items": len(params["content_list"])}

            elif op == "delete_document":
                rag = await ensure_rag()
                doc_id_param = str(params["doc_id"])
                # Resolve the doc title. aget_docs_by_ids cannot see some
                # FAILED/transitional rows that /documents (get_docs_by_status)
                # still lists, so fall back to a status scan; otherwise a delete
                # of such a row would raise document not found and the KB
                # entry would survive - and a later re-upload of the same file
                # would be flagged as a duplicate.
                title = await _doc_title_by_id(rag, doc_id_param)
                # A pending upload is listed in the KB panel as task-{id}. Resolve its
                # display path (so the duplicate-detection fingerprints get pruned) and
                # cancel the in-flight ingest so it does not re-add the doc later.
                if str(doc_id_param).startswith("task-"):
                    _pid = str(doc_id_param)[5:]
                    _pe = _state["processing_entries"].get(_pid) or {}
                    if not title:
                        title = str(_pe.get("title") or "") or None
                    # Fallback: the persisted upload task record keeps display_path even
                    # after ingest finishes and processing_entries is popped, so the
                    # duplicate-detection fingerprints (hash cache + manifest) still get
                    # pruned when deleting a not-yet-ingested (task-) upload.
                    if not title:
                        _tp = (_tasks.get(_pid) or {}).get("params") or {}
                        _pd = (_tp.get("display_path") or _tp.get("title") or _tp.get("file_path") or "")
                        if _pd:
                            title = str(_pd) or None

                    _t = _tasks.get(_pid)
                    if _t is not None:
                        _runner = _t.get("_async_task")
                        if _runner is not None and not _runner.done():
                            try:
                                _runner.cancel()
                            except Exception:
                                pass
                    _state["processing_entries"].pop(_pid, None)

                # Prune the upload manifest AND the duplicate-detection hash
                # cache for this display path FIRST, so a re-upload of the
                # same (or same-content) file is accepted immediately even if
                # the LightRAG delete below is slow (it can be blocked behind
                # the ingest lock while other ingests retry on quota errors).
                if title:
                    _manifest_drop_display(title)
                    _hashes_drop_display(title)
                try:
                    async with _state["ingest_lock"]:
                        await rag.lightrag.adelete_by_doc_id(doc_id_param)
                    if title:
                        try:
                            await _purge_failed_rows(rag, title)
                        except Exception:
                            pass
                except Exception as exc:
                    print(f"[sidecar] adelete {doc_id_param} failed: "
                          f"{type(exc).__name__}: {exc}")
                task["result"] = {"deleted": doc_id_param}

            else:
                raise ValueError(f"unknown op: {op}")

        task["status"] = "done"
        task["finished_at"] = time.time()
        if op.startswith("ingest"):
            _auto_log("解析完成", f"{label} · {task['finished_at'] - started:.1f}s")
            # A success (possibly of a retry) clears any ledger entry for the
            # same document; a zero-character "success" is archived instead.
            _ingest_display = (params or {}).get("display_path") or (params or {}).get("title")
            _failures_resolve(_ingest_display)
            # Drop FAILED duplicate leftovers so the panel does not keep showing
            # 失败 for a file that just indexed successfully.
            if _ingest_display and (_state["initialized"] and _state["rag"]):
                await _purge_failed_rows(_state["rag"], _ingest_display)
            if op == "ingest" and (task.get("result") or {}).get("content_length") == 0:
                _record_empty_ingest(params, task.get("result") or {})
        elif op == "delete_document":
            _auto_log("删除文档完成", label)
    except asyncio.CancelledError:
        task["status"] = "cancelled"
        task["error"] = "cancelled"
        task["finished_at"] = time.time()
    except Exception as exc:
        task["status"] = "error"
        task["error"] = f"{type(exc).__name__}: {exc}"
        task["finished_at"] = time.time()
        traceback.print_exc()
        if op in ("ingest", "ingest_text"):
            _duration = task["finished_at"] - (task.get("started_at") or task["submitted_at"])
            _record_ingest_failure(op, params, exc, duration_s=_duration)
            _auto_log("解析失败", f"{label} · {task['error']}")
        elif op == "delete_document":
            _auto_log("删除文档失败", f"{label} · {task['error']}")
        elif op == "query":
            # 问答失败以前是「静默空答案」，面板上看不到任何线索；现在显式记一条。
            _auto_log("知识库问答失败", f"{label} · {task['error']}")
    finally:
        _unregister_processing(task["task_id"])


def _submit(op: str, params: dict[str, Any]) -> str:
    task = {
        "task_id": uuid.uuid4().hex[:12],
        "op": op,
        "status": "pending",
        "submitted_at": time.time(),
        "started_at": None,
        "finished_at": None,
        "result": None,
        "error": None,
        "progress": None,
    }
    _tasks[task["task_id"]] = task
    # Prune finished tasks beyond the most recent 200.
    finished = [t for t in _tasks.values() if t["status"] in ("done", "error", "cancelled")]
    if len(finished) > 200:
        for old in sorted(finished, key=lambda t: t["submitted_at"])[: len(finished) - 200]:
            _tasks.pop(old["task_id"], None)
    task["_async_task"] = asyncio.get_running_loop().create_task(_run_op(op, params, task))
    return task["task_id"]


def _validate(op: str, params: dict[str, Any]) -> str | None:
    if op == "query":
        if not params.get("query"):
            return "query is required"
        mode = params.get("mode")
        if mode and mode not in ("local", "global", "hybrid", "naive", "mix", "bypass"):
            return f"invalid mode: {mode}"
    elif op == "ingest":
        if not params.get("path"):
            return "path is required"
    elif op == "ingest_text":
        if not params.get("text"):
            return "text is required"
    elif op == "ingest_office":
        if not params.get("text"):
            return "text is required"
        try:
            _normalize_office_format(params.get("format") or "docx")
        except ValueError as exc:
            return str(exc)
    elif op == "ingest_content_list":
        if not params.get("content_list"):
            return "content_list is required"
    elif op == "delete_document":
        if not params.get("doc_id"):
            return "doc_id is required"
    else:
        return f"unknown op: {op}"
    return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


def _config_save() -> None:
    """Persist the in-memory CONFIG back to config.json with a timestamped
    backup (best-effort). Never raises: config writes must not break a task."""
    try:
        backup = f"{CONFIG_PATH}.bak-models-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        shutil.copy2(CONFIG_PATH, backup)
    except OSError:
        pass
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as fh:
            json.dump(CONFIG, fh, ensure_ascii=False, indent=2)
    except OSError as exc:
        print(f"[sidecar] config save failed: {exc}")


# ---------------------------------------------------------------------------
# 本机 Ollama 端点自适应（KB_LOCAL_OLLAMA_ENDPOINT_FIX_v1）
#
# 面板「AI 模型」下拉里的候选项来自 DSH 主机的模型目录，而目录只给 model id、
# **不带 base_url**。用户改用本机 Ollama 模型（如 qwen3.6:35b）时，
# /models/select 只改了模型名，llm.base_url 仍停留在云端
# （https://tokens.store/v1）——出网一旦被中间人接管，问答就必然报
# CERTIFICATE_VERIFY_FAILED。这里让 sidecar 自己认出「这是本机 Ollama 上
# 存在的模型」，把端点落回本机，并在启动时自愈历史遗留的半套配置。
# ---------------------------------------------------------------------------
LOCAL_OLLAMA_BASE = (os.environ.get("RAG_LOCAL_OLLAMA_BASE_URL")
                     or "http://127.0.0.1:11434/v1")
_LOCAL_MODELS_CACHE: dict[str, Any] = {"at": 0.0, "names": set()}
_LOCAL_HEAL_ENABLED = (os.environ.get("RAG_LOCAL_ENDPOINT_HEAL", "on")
                       .strip().lower() not in {"0", "off", "no", "false"})

_LOCAL_LLM_PLACEHOLDER_KEY = "ollama"


def _is_local_base_url(base_url: Any) -> bool:
    """端点是否指向本机（loopback）的 OpenAI 兼容服务。"""
    b = str(base_url or "").strip().lower()
    return b.startswith("http://127.0.0.1:") or b.startswith("http://localhost:")


def _local_ollama_models(force: bool = False) -> set[str]:
    """本机 Ollama 已安装模型名集合（30s 缓存；查询失败不写缓存）。"""
    now = time.time()
    names = _LOCAL_MODELS_CACHE["names"]
    if not force and names and now - _LOCAL_MODELS_CACHE["at"] < 30.0:
        return names
    found: set[str] = set()
    root = LOCAL_OLLAMA_BASE.rstrip("/")
    if root.endswith("/v1"):
        root = root[:-3]
    try:
        import httpx as _httpx
        with _httpx.Client(timeout=_httpx.Timeout(3.0, connect=2.0)) as client:
            resp = client.get(root.rstrip("/") + "/api/tags")
            resp.raise_for_status()
            for item in (resp.json().get("models") or []):
                name = item.get("name") or item.get("model")
                if name:
                    found.add(str(name))
                    found.add(str(name).split(":")[0])
    except Exception:  # noqa: BLE001 - 本机没起 Ollama 时静默降级
        return names
    if found:
        _LOCAL_MODELS_CACHE["at"] = now
        _LOCAL_MODELS_CACHE["names"] = found
    return found


def _is_local_ollama_model(model: Any) -> bool:
    m = str(model or "").strip()
    return bool(m) and m in _local_ollama_models()


def _resolve_base_url(category: str, model: Any, base_url: Any) -> str | None:
    """把「只给了模型名」的选择补全成可用端点。

    优先级：显式 base_url > custom_models 里同名条目 > 本机 Ollama
    （模型在本机存在时）。都不匹配返回 None，调用方保持原端点不动。
    """
    if base_url:
        return str(base_url)
    for entry in (CONFIG.get("custom_models", {}).get(category) or []):
        if str(entry.get("model") or "") == str(model or "") and entry.get("base_url"):
            return str(entry["base_url"])
    if _is_local_ollama_model(model):
        return LOCAL_OLLAMA_BASE
    return None


def _heal_local_model_endpoint() -> list[str]:
    """启动自愈：模型在本机 Ollama 上、端点却不是本机的配置，改回本机。

    修的正是「历史配置里模型名已经是本地的、base_url 还留在云端」这一形态。
    设 RAG_LOCAL_ENDPOINT_HEAL=off 可关闭。
    """
    changed: list[str] = []
    if not _LOCAL_HEAL_ENABLED:
        return changed
    local = _local_ollama_models(force=True)
    if not local:
        return changed
    for category in ("llm", "vision"):
        cfg = CONFIG.get(category) or {}
        model = str(cfg.get("model") or "")
        base = str(cfg.get("base_url") or "")
        if model and model in local and not _is_local_base_url(base):
            cfg["base_url"] = LOCAL_OLLAMA_BASE
            CONFIG[category] = cfg
            changed.append(f"{category}:{model} -> {LOCAL_OLLAMA_BASE}")
    if changed:
        _config_save()
    return changed


def _public_selections() -> dict[str, Any]:
    """Current default-model selections, read live from the in-memory CONFIG."""
    llm = CONFIG.get("llm") or {}
    vision = CONFIG.get("vision") or {}
    emb = CONFIG.get("embedding") or {}
    rerank = CONFIG.get("rerank") or {}
    asr = CONFIG.get("asr") or {}
    return {
        "llm": {"model": llm.get("model", ""), "base_url": llm.get("base_url", "")},
        "vision": {"model": vision.get("model", ""), "base_url": vision.get("base_url", "")},
        "index_llm": {"model": (CONFIG.get("lightrag") or {}).get("index_llm_model", "")},
        "embedding": {k: emb.get(k) for k in ("backend", "model", "base_url", "dims")},
        "rerank": {k: rerank.get(k) for k in ("enabled", "model", "model_path", "device")},
        "asr": {k: asr.get(k) for k in ("backend", "model", "device")},
        "parser": {"parser": CONFIG.get("parser", "mineru"), "parser_device": CONFIG.get("parser_device", "cpu")},
    }


@app.get("/models")
async def models_snapshot():
    """AI 模型面板的全量快照：可下载目录（含本地状态）、当前选择、设备、下载进度。"""
    catalog: dict[str, list[dict[str, Any]]] = {}
    for category, entries in MODELS_CATALOG.items():
        catalog[category] = []
        for entry in entries:
            state = _model_local_state(entry)
            catalog[category].append({
                "id": entry["id"],
                "name": entry["name"],
                "kind": entry["kind"],
                "size_hint": entry.get("size_hint"),
                "dims": entry.get("dims"),
                "device_note": entry.get("device_note"),
                **state,
            })
    return {
        "catalog": catalog,
        "selections": _public_selections(),
        "device": _detect_device(),
        "runtime": _runtime_state(),
        "custom_models": CONFIG.get("custom_models", {}),
        "bootstrap": dict(_BOOTSTRAP),
        "downloads": {k: {kk: vv for kk, vv in v.items() if not kk.startswith("_")}
                      for k, v in _downloads.items()},
    }


@app.post("/models/install-runtime")
async def models_install_runtime(body: dict[str, Any]):
    """Install the local GGUF embedding runtime (llama-cpp-python) for the
    detected GPU vendor: auto -> detect from torch (nvidia->cuda, amd->rocm),
    or an explicit vendor: cuda | rocm | cpu."""
    vendor = (body or {}).get("vendor", "auto")
    if vendor == "auto":
        vendor = _detect_device()["backend"]  # cuda / rocm / cpu
    if vendor not in ("cuda", "rocm", "cpu"):
        raise HTTPException(status_code=400, detail=f"invalid vendor: {vendor}")
    # 不重复安装：已有运行时直接返回成功。
    rt = _runtime_state()
    if rt["llama_cpp"]:
        return {"ok": True, "already_installed": True, "version": rt["llama_cpp_version"]}
    for dl in _downloads.values():
        if dl.get("_is_runtime") and dl["status"] in ("queued", "downloading"):
            return {"download_id": next(k for k, v in _downloads.items() if v is dl)}
    dl_id = uuid.uuid4().hex[:10]
    _downloads[dl_id] = {
        "model_id": "llama-cpp-python",
        "_is_runtime": True,
        "status": "queued",
        "received": 0,
        "total": 0,
        "pct": 0,
        "message": f"排队安装 llama-cpp-python（{vendor}）…",
        "error": None,
    }
    asyncio.get_running_loop().create_task(_install_runtime_worker(dl_id, vendor))
    return {"download_id": dl_id, "vendor": vendor}


@app.post("/models/download")
async def models_download(body: dict[str, Any]):
    model_id = (body or {}).get("model_id")
    entry = _catalog_entry(str(model_id)) if model_id else None
    if entry is None:
        raise HTTPException(status_code=404, detail=f"unknown model: {model_id}")
    # 同一模型不重复下载；进行中的下载直接复用。
    for dl in _downloads.values():
        if dl["model_id"] == model_id and dl["status"] in ("queued", "downloading"):
            return {"download_id": next(k for k, v in _downloads.items() if v is dl)}
    dl_id = uuid.uuid4().hex[:10]
    _downloads[dl_id] = {
        "model_id": model_id,
        "status": "queued",
        "received": 0,
        "total": 0,
        "pct": 0,
        "message": "排队中…",
        "error": None,
    }
    asyncio.get_running_loop().create_task(_download_worker(dl_id, entry))
    return {"download_id": dl_id}


@app.get("/models/download/{dl_id}")
async def models_download_status(dl_id: str):
    dl = _downloads.get(dl_id)
    if dl is None:
        raise HTTPException(status_code=404, detail="unknown download id")
    return {k: v for k, v in dl.items() if not k.startswith("_")}


@app.post("/models/select")
async def models_select(body: dict[str, Any]):
    """持久化某类别的默认模型。llm/vision 立即生效（每次调用现读 CONFIG）；
    embedding/rerank/asr/parser 在 RAG 构建期捕获，返回 restart_required=True，
    由面板提示用户在「重启服务」后生效。"""
    category = (body or {}).get("category")
    model = (body or {}).get("model")
    base_url = (body or {}).get("base_url")
    api_key = (body or {}).get("api_key")
    device = _detect_device()["backend"]  # cuda / rocm / cpu
    restart_required = False

    if category == "llm":
        if not model:
            raise HTTPException(status_code=400, detail="model is required")
        CONFIG.setdefault("llm", {})["model"] = model
        # 面板只给模型名时（DSH 模型目录不带 base_url）自动补全端点：
        # 本机 Ollama 上存在的模型一律落到本机端点，避免「选了本地模型、
        # 请求仍发往云端」→ CERTIFICATE_VERIFY_FAILED。
        _resolved_base = _resolve_base_url("llm", model, base_url)
        if _resolved_base:
            CONFIG["llm"]["base_url"] = _resolved_base
        if api_key:
            CONFIG["llm"]["api_key"] = api_key
    elif category == "vision":
        if not model:
            raise HTTPException(status_code=400, detail="model is required")
        CONFIG.setdefault("vision", {})["model"] = model
        # 同 llm：模型名在本机 Ollama 上时自动落到本机端点。
        _resolved_base = _resolve_base_url("vision", model, base_url)
        if _resolved_base:
            CONFIG["vision"]["base_url"] = _resolved_base
        if api_key:
            CONFIG["vision"]["api_key"] = api_key
    elif category == "index_llm":
        # 索引模型：入库（解析）阶段的实体/关系抽取与合并专用模型。
        # 与 llm 一样从 DSH-设置-模型 选择；在 RAG 构建期被 llm_model_func
        # 捕获，因此改动需要重启 sidecar 后生效。
        if not model:
            raise HTTPException(status_code=400, detail="model is required")
        CONFIG.setdefault("lightrag", {})["index_llm_model"] = model
        restart_required = True
    elif category == "embedding":
        entry = _catalog_entry(str(model or "")) if model else None
        if entry is not None:
            state = _model_local_state(entry)
            if state["status"] != "ready":
                raise HTTPException(status_code=400, detail=f"模型未下载完成：{model}")
            CONFIG["embedding"] = {
                "backend": "gguf",
                "model": entry["name"],
                "model_path": state["path"],
                "dims": entry.get("dims", 1024),
                "max_token_size": CONFIG.get("embedding", {}).get("max_token_size", 8192),
            }
        else:
            # 自定义 OpenAI 兼容 embedding 端点（由 /models/custom 登记）
            custom = next((c for c in (CONFIG.get("custom_models", {}).get("embedding") or [])
                           if c.get("model") == model), None)
            if not base_url and not custom:
                raise HTTPException(status_code=400, detail="embedding 需选择已下载本地模型或自定义端点")
            CONFIG["embedding"] = {
                "backend": "openai",
                "model": model,
                "base_url": base_url or (custom or {}).get("base_url", ""),
                "dims": int((body or {}).get("dims") or (custom or {}).get("dims") or 1024),
                "api_key_env": (body or {}).get("api_key_env") or "RAG_LLM_API_KEY",
                "max_token_size": CONFIG.get("embedding", {}).get("max_token_size", 8192),
            }
        restart_required = True
    elif category == "rerank":
        entry = _catalog_entry(str(model or "")) if model else None
        if entry is None:
            raise HTTPException(status_code=400, detail="rerank 仅支持本地模型")
        state = _model_local_state(entry)
        if state["status"] != "ready":
            raise HTTPException(status_code=400, detail=f"模型未下载完成：{model}")
        CONFIG["rerank"] = {
            "enabled": True,
            "backend": "transformers",
            "model": entry["name"],
            "model_path": state["path"],
            "device": device,
            "max_length": CONFIG.get("rerank", {}).get("max_length", 512),
        }
        restart_required = True
    elif category == "asr":
        entry = _catalog_entry(str(model or "")) if model else None
        if entry is None:
            raise HTTPException(status_code=400, detail="ASR 仅支持本地模型")
        state = _model_local_state(entry)
        if state["status"] != "ready":
            raise HTTPException(status_code=400, detail=f"模型未下载完成：{model}")
        CONFIG["asr"] = {
            "backend": "sensevoice",
            "model": state["path"] or entry["name"],
            "device": device,
        }
        restart_required = True
    elif category == "parser":
        CONFIG["parser"] = "mineru"
        CONFIG["parser_device"] = "cuda" if device in ("cuda", "rocm") else "cpu"
        restart_required = True
    else:
        raise HTTPException(status_code=400, detail=f"unknown category: {category}")

    _config_save()
    _auto_log("设置模型", f"{category} → {model}")
    return {"ok": True, "restart_required": restart_required, "device": device}


@app.post("/models/custom")
async def models_custom(body: dict[str, Any]):
    """新增自定义模型配置（参考 DSH-设置-模型：名称 + Base URL + API Key + 模型 ID）。
    登记到 config.json 的 custom_models[category]，随后成为该类别的可选项。"""
    category = (body or {}).get("category")
    name = (body or {}).get("name")
    model = (body or {}).get("model")
    base_url = (body or {}).get("base_url")
    if category not in ("llm", "vision", "embedding"):
        raise HTTPException(status_code=400, detail="自定义配置仅支持 llm / vision / embedding")
    if not name or not model:
        raise HTTPException(status_code=400, detail="name 与 model 为必填")
    if not base_url:
        raise HTTPException(status_code=400, detail="base_url 为必填")
    entry = {
        "name": name,
        "model": model,
        "base_url": base_url,
        "dims": int((body or {}).get("dims") or 0) or None,
    }
    if (body or {}).get("api_key"):
        entry["api_key"] = body["api_key"]
    custom = CONFIG.setdefault("custom_models", {}).setdefault(category, [])
    # 同名同端点视为更新
    for i, c in enumerate(custom):
        if c.get("model") == model and c.get("base_url") == base_url:
            custom[i] = entry
            break
    else:
        custom.append(entry)
    _config_save()
    _auto_log("新增模型配置", f"{category} · {name} · {model}")
    return {"ok": True}


@app.post("/models/restart")
async def models_restart():
    """重启 sidecar 进程，使构建期捕获的配置（embedding/rerank/asr/parser）生效。
    新进程继承当前环境（RAG_SIDECAR_* / RAG_LLM_API_KEY 等），DSH 插件会在下次
    health 检查时收养它。"""
    env = os.environ.copy()
    # 旧进程要等 ~1s 才释放监听端口；新进程若在同一秒内 bind，会拿到
    # EADDRINUSE 后自杀，结果是「旧的新的一起没了、端口没人听」。
    # 这里让新进程先等端口空出来（幂等：每次自重启都会重新注入）。
    env["RAG_RESTART_DELAY_S"] = "4"
    log_path = Path(CONFIG_PATH).parent / "logs" / "sidecar.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logf = open(log_path, "a")
    try:
        subprocess.Popen(
            [sys.executable, "server.py"],
            cwd=os.getcwd(),
            env=env,
            stdout=logf,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    except Exception as exc:
        logf.close()
        raise HTTPException(status_code=500, detail=f"restart failed: {exc}")
    # 给响应一个机会发出后再退出当前进程。
    threading.Timer(1.0, os._exit, args=(0,)).start()
    return {"restarting": True}


@app.get("/health")
async def health():
    try:
        _failure_metrics = _failures_metrics()
    except Exception:
        _failure_metrics = {}
    return {
        "ok": True,
        "initialized": _state["initialized"],
        "init_error": _state["init_error"],
        "uptime_s": round(time.time() - _state["started_at"], 1),
        "tasks_running": sum(1 for t in _tasks.values() if t["status"] in ("pending", "running")),
        **_failure_metrics,
    }


@app.get("/prefs")
async def get_prefs():
    """产物是否纳入全局知识库检索（默认两皆不纳入）。"""
    return _load_prefs()


@app.put("/prefs")
async def put_prefs(patch: dict[str, Any]):
    """同上，写开关。只认 include_dsh_artifacts / include_kb_artifacts 两个布尔值。"""
    return _save_prefs(patch or {})


@app.get("/workspace/sync")
async def workspace_sync_status():
    """DSH 工作区产物同步的状态（是否运行中、上一轮入库数、累计入库数）。"""
    return dict(WS_SYNC_STATE)


@app.post("/workspace/sync")
async def workspace_sync_run(max_files: int = 0):
    """手工触发一轮工作区产物同步（max_files=0 表示用配置默认值）。"""
    if WS_SYNC_STATE["running"]:
        return {"started": False, "note": "sync already running", "state": dict(WS_SYNC_STATE)}
    asyncio.get_running_loop().create_task(_workspace_sync_once(max_files or None))
    return {"started": True, "state": dict(WS_SYNC_STATE)}


# 首次启动自动就绪（bootstrap）状态：embedding 走本地 GGUF 时，若
# llama-cpp-python 运行时或默认 bge-m3 模型缺失，自动安装/下载并在全部
# 就绪后重启自身。任何设备安装插件即可用，无需手动操作。
_BOOTSTRAP = {"running": False, "last_error": None, "finished": False}


def _bootstrap_needed() -> tuple[bool, list[str]]:
    """Return (needed, missing_parts) for the configured embedding backend.
    missing_parts is a subset of {'runtime', 'model'}. Only the local GGUF
    backend is auto-bootstrapped; remote/openai embeddings are left alone."""
    emb = CONFIG.get("embedding") or {}
    if emb.get("backend") != "gguf":
        return False, []
    missing: list[str] = []
    if not _runtime_state()["llama_cpp"]:
        missing.append("runtime")
    entry = _catalog_entry("bge-m3-f16")
    if entry is not None:
        state = _model_local_state(entry)
        if state["status"] != "ready":
            missing.append("model")
    return bool(missing), missing


async def _bootstrap_default_embedding():
    """Install the llama-cpp-python runtime and download the default bge-m3
    GGUF model when the embedding backend is local GGUF and parts are missing,
    then restart the sidecar so the freshly built components take effect.

    Runs once per process; guarded by _BOOTSTRAP['running'] so overlapping
    startup hooks (e.g. uvicorn reload) cannot double-launch. Failures are
    recorded and left for the UI's manual install path — they do not crash
    startup."""
    if _BOOTSTRAP["running"] or _BOOTSTRAP["finished"]:
        return
    _BOOTSTRAP["running"] = True
    try:
        needed, missing = _bootstrap_needed()
        if not needed:
            _BOOTSTRAP["finished"] = True
            _BOOTSTRAP["running"] = False
            return
        print(f"[sidecar] bootstrap: embedding=gguf, missing={missing}, auto-installing …")
        # 1) runtime
        if "runtime" in missing:
            vendor = _detect_device()["backend"]
            if vendor not in ("cuda", "rocm", "cpu"):
                vendor = "cpu"
            dl_id = uuid.uuid4().hex[:10]
            _downloads[dl_id] = {
                "model_id": "llama-cpp-python", "_is_runtime": True,
                "status": "queued", "received": 0, "total": 0, "pct": 0,
                "message": f"自动安装 llama-cpp-python（{vendor}）…", "error": None,
            }
            await _install_runtime_worker(dl_id, vendor)
        # 2) default model
        if "model" in missing:
            entry = _catalog_entry("bge-m3-f16")
            if entry is None:
                raise RuntimeError("bge-m3-f16 不在模型目录中")
            dl_id = uuid.uuid4().hex[:10]
            _downloads[dl_id] = {
                "model_id": entry["id"], "status": "queued",
                "received": 0, "total": 0, "pct": 0, "message": "自动下载 bge-m3 模型…", "error": None,
            }
            await _download_worker(dl_id, entry)
        _BOOTSTRAP["finished"] = True
        _BOOTSTRAP["running"] = False
        print("[sidecar] bootstrap done — restarting to load local embedding")
        # 3) restart so the built RAG picks up the local GGUF embedding.
        env = os.environ.copy()
        log_path = Path(CONFIG_PATH).parent / "logs" / "sidecar.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        logf = open(log_path, "a")
        subprocess.Popen(
            [sys.executable, "server.py"],
            cwd=os.getcwd(), env=env,
            stdout=logf, stderr=subprocess.STDOUT,
            start_new_session=True,
        )
        threading.Timer(1.0, os._exit, args=(0,)).start()
    except Exception as exc:
        _BOOTSTRAP["last_error"] = str(exc)
        _BOOTSTRAP["running"] = False
        print(f"[sidecar] bootstrap failed (manual install in AI 模型 panel): {exc}")


@app.on_event("startup")
async def _start_background_loops():
    """Start the DSH-artifact sync loop and the failure-retry reaper."""
    if WS_SYNC_ENABLED and WS_SYNC_INDEX_ENABLED:
        asyncio.get_running_loop().create_task(_workspace_sync_loop())
    else:
        print("[sidecar] workspace sync disabled by config")
    asyncio.get_running_loop().create_task(_retry_reaper_loop())
    # 一次性迁移：清掉历史已入库的产物文档（文件保留）。
    asyncio.get_running_loop().create_task(_purge_artifact_index_later())
    # 启动自愈：模型在本机 Ollama 上、端点却仍指向云端的配置，自动改回本机。
    try:
        _healed = _heal_local_model_endpoint()
        if _healed:
            print(f"[sidecar] local model endpoint healed: {', '.join(_healed)}")
    except Exception as exc:  # noqa: BLE001 - 自愈失败不得影响启动
        print(f"[sidecar] local endpoint heal skipped: {type(exc).__name__}: {exc}")
    # 首次启动自动就绪：本地 GGUF embedding 缺运行时/模型时自动补齐。
    asyncio.get_running_loop().create_task(_bootstrap_default_embedding())


@app.get("/status")
async def status():
    counts = {"pending": 0, "running": 0, "done": 0, "error": 0, "cancelled": 0}
    for t in _tasks.values():
        counts[t["status"]] = counts.get(t["status"], 0) + 1
    docs = None
    if _state["initialized"]:
        try:
            from lightrag.base import DocStatus

            rag = _state["rag"]
            results = await asyncio.gather(
                *[rag.lightrag.get_docs_by_status(s) for s in (DocStatus.PROCESSED, DocStatus.PROCESSING, DocStatus.PENDING, DocStatus.FAILED, DocStatus.PREPROCESSED)]
            )
            docs = {s.value: len(r) for s, r in zip((DocStatus.PROCESSED, DocStatus.PROCESSING, DocStatus.PENDING, DocStatus.FAILED, DocStatus.PREPROCESSED), results)}
            if _state["processing_entries"]:
                docs["processing"] = docs.get("processing", 0) + len(_state["processing_entries"])
        except Exception as exc:
            docs = {"error": str(exc)}
    return {
        **await health(),
        "config": {
            "llm": {"base_url": CONFIG["llm"]["base_url"], "model": CONFIG["llm"]["model"], "key_present": bool(os.environ.get("RAG_LLM_API_KEY") or CONFIG["llm"].get("api_key"))},
            "vision": {"model": (CONFIG.get("vision") or {}).get("model")},
            "embedding": {k: CONFIG["embedding"].get(k) for k in ("backend", "base_url", "model", "dims")},
            "parser": CONFIG.get("parser", "mineru"),
            "working_dir": CONFIG["working_dir"],
        },
        "docs": docs,
        "tasks": counts,
    }


@app.get("/documents")
async def documents():
    rag = await ensure_rag()
    from lightrag.base import DocStatus

    statuses = (DocStatus.PROCESSED, DocStatus.PROCESSING, DocStatus.PENDING,
                DocStatus.FAILED, DocStatus.PREPROCESSED)
    results = await asyncio.gather(*[rag.lightrag.get_docs_by_status(s) for s in statuses])
    out = []
    # Titles already covered by real LightRAG docs; a sidecar-side "parsing"
    # entry with the same title is redundant (e.g. fast txt/md ingests that
    # registered a processing row before the doc record appeared).
    covered_titles: set[str] = set()
    for status_, mapping in zip(statuses, results):
        for doc_id, doc in mapping.items():
            title = getattr(doc, "file_path", "")
            covered_titles.add(str(title))
            out.append(
                {
                    "id": doc_id,
                    "status": status_.value,
                    "title": title,
                    "content_length": getattr(doc, "content_length", None),
                    "chunks_count": getattr(doc, "chunks_count", None),
                    "created_at": getattr(doc, "created_at", None),
                    "updated_at": getattr(doc, "updated_at", None),
                    "error": getattr(doc, "error_msg", None),
                    "has_file": _original_file_of(str(title)) is not None,
                }
            )
    # Sidecar-side "parsing" entries (uploads whose LightRAG doc record only
    # appears after the parser finishes) come first, carrying the task id so
    # the KB panel can poll /tasks/{id} for progress. The original file is
    # already on disk, so these entries are openable/downloadable too.
    for task_id, info in _state["processing_entries"].items():
        title = str(info.get("title") or "")
        if title in covered_titles:
            continue
        out.append(
            {
                "id": f"task-{task_id}",
                "status": "processing",
                "title": title,
                "content_length": None,
                "chunks_count": None,
                "created_at": info.get("created_at"),
                "updated_at": info.get("created_at"),
                "error": None,
                "task_id": task_id,
                "has_file": _original_file_of(title) is not None,
            }
        )
    # Failure-ledger enrichment (error_code / attempts / lifecycle): the KB
    # panel uses these for badges and the retry button.
    try:
        with _failures_lock:
            _fstore = _failures_load()
        fmap = {
            v.get("display_path"): v
            for k, v in _fstore.items()
            if k != "_meta" and isinstance(v, dict)
        }
    except Exception:
        fmap = {}
    for row in out:
        fe = fmap.get(str(row.get("title") or ""))
        if fe:
            row["error_code"] = fe.get("error_code")
            row["attempts"] = fe.get("attempts")
            row["lifecycle"] = fe.get("lifecycle")
            row["next_retry_at"] = fe.get("next_retry_at")
    out.sort(key=lambda d: str(d.get("created_at") or ""))
    # Same-source reconciliation: LightRAG keeps the rejected copy of a
    # duplicate ingest as a separate FAILED doc sharing the title. Showing it
    # made a healthy, indexed file read as 失败 in both the index modal and the
    # left nav. When a title has any non-failed record, drop the failed
    # leftovers from the visible list (their cause stays in the failure ledger).
    _GOOD = ("processed", "processing", "pending", "preprocessed", "handling")
    by_title: dict[str, list[dict[str, Any]]] = {}
    for row in out:
        by_title.setdefault(str(row.get("title") or ""), []).append(row)
    if any(len(v) > 1 for v in by_title.values()):
        pruned: list[dict[str, Any]] = []
        for title, rows in by_title.items():
            if len(rows) > 1 and any(r["status"] in _GOOD for r in rows):
                pruned.extend(r for r in rows if r["status"] != "failed")
            else:
                pruned.extend(rows)
        out = sorted(pruned, key=lambda d: str(d.get("created_at") or ""))
    # 历史遗留产物（LightRAG 里还留着 doc- 记录、尚未被一次性迁移清掉）：统一
    # 按「仅文件产物」呈现，否则产物栏拿到 doc- id，重命名/删除会 404。
    try:
        _rev: dict[str, str] = {}
        for _dest, _disp in _manifest_load().items():
            _d = str(_disp).replace("\\", "/")
            if _is_ns_prefix(_d):
                _rev[_d] = str(_dest)
        for _row in out:
            _t = str(_row.get("title") or "").replace("\\", "/")
            if not _is_ns_prefix(_t):
                continue
            _dest = _rev.get(_t)
            if not _dest:
                continue
            _row["id"] = ART_ID_PREFIX + _dest
            _row["status"] = "stored"
            _row["chunks_count"] = 0
            _row["file_only"] = True
            _row["has_file"] = True
    except Exception as _exc:  # noqa: BLE001
        print(f"[sidecar] artifact id normalize failed: {type(_exc).__name__}: {_exc}")
    # 仅文件产物（2026-09-14）：产物不再进索引，但仍要在右侧「对话产物」栏里
    # 可见、可打开/下载/重命名/删除 —— 这里把 manifest 里的产物文件补成
    # status="stored" 的条目（id 前缀 art-，chunks_count=0，不参与任何检索）。
    try:
        _covered = {str(r.get("title") or "") for r in out}
        for _a in _artifact_entries():
            if _a["title"] in _covered:
                continue
            _ts = datetime.fromtimestamp(_a["mtime"], timezone.utc).isoformat()
            out.append({
                "id": ART_ID_PREFIX + _a["dest_name"],
                "status": "stored",
                "title": _a["title"],
                "content_length": None,
                "chunks_count": 0,
                "created_at": _ts,
                "updated_at": _ts,
                "error": None,
                "has_file": True,
                "file_only": True,
                "size": _a["size"],
            })
    except Exception as _exc:  # noqa: BLE001 - 列不出来不能拖垮文档接口
        print(f"[sidecar] artifact listing failed: {type(_exc).__name__}: {_exc}")
    # 「个人知识库」只呈现本人上传/生成的文件。共享知识库的文档以
    # display_path "共享/<文件夹>/…" 与宿主个人文档同库存放（宿主实例是共享
    # 存储），不摘掉就会在个人目录树里长出一个「共享」文件夹。共享内容一律归
    # 「共享知识库」分区，由 /shared/* 按成员权限下发。
    out = [row for row in out if not _is_shared_display(row.get("title"))]
    return {"documents": out, "total": len(out)}


@app.get("/documents/{doc_id}/file")
async def document_file(doc_id: str, download: int = 0):
    """Serve the ORIGINAL uploaded file for a document (Word/Excel/PPT/txt
    keep their original layout — 需求2).

    Resolution: doc title (display path) → uploads dir via the manifest.
    `?download=1` forces Content-Disposition: attachment so local Office
    opens the real .docx/.xlsx/.pptx; otherwise browser-renderable types
    (txt/md/pdf/images) open inline, everything else downloads."""
    rag = await ensure_rag()
    title: str | None = None
    if doc_id.startswith(ART_ID_PREFIX):
        # 仅文件产物：标题直接取 manifest，不经 LightRAG。
        title = _manifest_load().get(str(doc_id)[len(ART_ID_PREFIX):])
    elif doc_id.startswith("task-"):
        info = _state["processing_entries"].get(doc_id[len("task-"):])
        title = str(info.get("title") or "") if info else None
    else:
        try:
            infos = await rag.lightrag.aget_docs_by_ids([doc_id])
            doc = infos.get(doc_id)
            if doc is not None:
                title = getattr(doc, "file_path", None)
                if title is None and isinstance(doc, dict):
                    title = doc.get("file_path")
        except Exception:
            title = None
    target = _original_file_of(title)
    if target is None or not target.is_file():
        raise HTTPException(status_code=404, detail=f"original file not found: {doc_id}")
    ext = target.suffix.lower()
    filename = Path(str(title).replace("\\", "/")).name if title else target.name
    inline = download == 0 and ext in INLINE_EXTENSIONS
    return FileResponse(
        str(target),
        media_type=_media_type_of(ext),
        filename=filename,
        content_disposition_type="inline" if inline else "attachment",
    )


@app.get("/documents/{doc_id}/content")
async def document_content(doc_id: str):
    """Return the original document content stored in full_docs."""
    # 2026-09-15: 仅文件产物（art- 前缀）不进 LightRAG，直接从磁盘读原文；
    # 否则 /documents/{art-}/content 恒 404，前端据此报“无法读取原始文件内容”。
    art = _artifact_by_doc_id(doc_id)
    if art is not None:
        _, _, _phys = art
        try:
            _text = _phys.read_bytes().decode("utf-8")
        except UnicodeDecodeError:
            _text = ""
        if _text == "" or _phys.suffix.lower() in (
            ".docx", ".xlsx", ".pptx", ".pdf", ".zip", ".png",
            ".jpg", ".jpeg", ".gif", ".doc", ".xls", ".ppt",
        ):
            return {"doc_id": doc_id, "content": "", "file_path": str(_phys)}
        return {"doc_id": doc_id, "content": _text, "file_path": str(_phys)}
    rag = await ensure_rag()
    data = await rag.lightrag.full_docs.get_by_id(doc_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"document content not found: {doc_id}")
    return {
        "doc_id": doc_id,
        "content": data.get("content", ""),
        "file_path": data.get("file_path", ""),
    }


# ---------------------------------------------------------------------------
# DSH workspace artifacts (read-only mirror for the KB panel's pinned nodes)
# ---------------------------------------------------------------------------

# Per-account workspace registry: a sidecar running inside a user instance has
# $DSH_HOME pointed at that account's home, so it must read THEIR workspace
# registry. Falling back to Path.home() would scan the host's registered
# workspaces and ingest the host's files into the user's private KB.
_DSH_HOME_ENV = os.environ.get("DSH_HOME", "").strip()
WORKSPACE_REGISTRY = (
    Path(_DSH_HOME_ENV) / "storages" / "workspace.json"
    if _DSH_HOME_ENV
    else Path.home() / ".dsh" / "storages" / "workspace.json"
)
# Directories never descended into when collecting workspace artifacts.
WS_SKIP_DIRS = {
    ".git", ".gradle", ".idea", ".vscode", ".dsh", ".dsh-vision-router",
    ".dsh-market", ".dsh-module-fallback", ".dsh-market-cache",
    "node_modules", "venv", ".venv", "__pycache__", "build", "dist",
    ".next", "target", "vendor",
}
WS_MAX_FILES = 400          # per workspace, most-recent first
WS_MAX_PREVIEW = 200_000    # bytes of text preview returned by /workspace/file


def _account_scope_roots() -> list[Path]:
    """本实例只允许镜像「自己」的目录。

    managed 账号的实例跑在 ~/.dsh/multi-user/users/<acct>/home，但整套多用户部署
    共用同一个 Linux 账号（lgsj），文件系统权限不构成边界。DSH 的工作区登记表里
    一旦出现宿主路径（实测 /home/lgsj/Downloads、/home/lgsj/temp、
    /home/lgsj/01-DSH/02-测试），个人知识库的「DSH产物」只读镜像就会把服务器家
    目录的文件列进用户的知识库树 —— 这就是"个人知识库出现 home 目录文件"的来源。
    宿主实例（DSH_HOME 不含 users/<acct>）不受限：操作者本来就有整机权限。
    """
    acct = _shared_self_account()
    if acct:
        home_env = Path(str(_DSH_HOME_ENV)).resolve()
        return [home_env.parent / "workspace", home_env.parent / "home"]
    try:
        return [Path.home().resolve()]
    except Exception:
        return []


_SCOPE_ROOTS_CACHE: list[Path] | None = None


def _scope_roots() -> list[Path]:
    global _SCOPE_ROOTS_CACHE
    if _SCOPE_ROOTS_CACHE is None:
        try:
            _SCOPE_ROOTS_CACHE = [p.resolve() for p in _account_scope_roots()]
        except Exception:
            _SCOPE_ROOTS_CACHE = []
    return _SCOPE_ROOTS_CACHE


def _workspace_roots() -> list[tuple[str, Path]]:
    """Registered DSH workspaces (title, path) from this account's registry file,
    fenced to the directories this account actually owns (_account_scope_roots)."""
    try:
        data = json.loads(WORKSPACE_REGISTRY.read_text(encoding="utf-8"))
        rows = (data.get("tables") or {}).get("workspaces") or {}
        out: list[tuple[str, Path]] = []
        allowed = _scope_roots()
        for row in rows.values():
            title = str(row.get("title") or "").strip()
            path = str(row.get("path") or "").strip()
            if not title or not path:
                continue
            try:
                resolved = Path(path).resolve()
            except Exception:
                continue
            if allowed and not any(resolved.is_relative_to(root) for root in allowed):
                continue
            out.append((title, resolved))
        out.sort(key=lambda x: x[0])
        return out
    except Exception:
        return []


def _collect_artifacts(root: Path) -> list[dict[str, Any]]:
    """Files under one workspace, junk dirs skipped, most recent first."""
    files: list[dict[str, Any]] = []
    if not root.is_dir():
        return files
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in WS_SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            if name.startswith("."):
                continue
            p = Path(dirpath) / name
            try:
                st = p.stat()
            except OSError:
                continue
            files.append({
                "path": str(p),
                # Path relative to the workspace root, POSIX separators — the UI
                # uses this to rebuild the workspace's multi-level folder tree.
                "rel": str(p.relative_to(root)).replace(os.sep, "/"),
                "name": name,
                "ext": name.lower().rsplit(".", 1)[-1] if "." in name else "",
                "size": st.st_size,
                "mtime": int(st.st_mtime),
            })
    files.sort(key=lambda f: f["mtime"], reverse=True)
    return files[:WS_MAX_FILES]


# ---------------------------------------------------------------------------
# DSH产物 —— 工作区文件自动入库到 "DSH产物/<工作区>/<相对路径>"
#
# 「及时」= 后台定时扫描（默认 15 分钟一轮，启动后 60s 首轮），只入库新增或
# 改动过的文本文件；_collect_artifacts 按 mtime 倒序，所以新文件优先。
# 统一落在 "DSH产物/" 前缀下带来两个好处：
#   - @DSH产物 或 @DSH产物/<工作区> 可以精确引用（file_path 前缀匹配）；
#   - 开关关闭时，全局检索直接排除该前缀。
# ---------------------------------------------------------------------------
WS_SYNC_CFG = CONFIG.get("workspace_sync") or {}
WS_SYNC_ENABLED = bool(WS_SYNC_CFG.get("enabled", False))
# 2026-09-14：DSH 工作区产物不再进知识库（不解析/不索引），只保留
# /workspace/artifacts 只读镜像；老版本已入库的产物由一次性迁移清理。
WS_SYNC_INDEX_ENABLED = False
WS_SYNC_INTERVAL = int(WS_SYNC_CFG.get("interval_s", 900))
WS_SYNC_MAX_PER_RUN = int(WS_SYNC_CFG.get("max_files_per_run", 10))
WS_SYNC_MAX_BYTES = int(WS_SYNC_CFG.get("max_bytes", 120_000))
WS_SYNC_FIRST_DELAY = int(WS_SYNC_CFG.get("first_delay_s", 60))
WS_SYNC_TEXT_EXTS = TEXT_EXTS | {
    ".json", ".yaml", ".yml", ".toml", ".ini", ".csv", ".log", ".xml",
    ".html", ".css", ".sql", ".sh", ".py", ".js", ".ts", ".tsx", ".jsx",
    ".java", ".go", ".rs", ".c", ".cpp", ".h",
}


def _load_ws_sync() -> dict[str, Any]:
    try:
        data = json.loads(WS_SYNC_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {}


def _save_ws_sync(ledger: dict[str, Any]) -> None:
    try:
        WS_SYNC_PATH.parent.mkdir(parents=True, exist_ok=True)
        WS_SYNC_PATH.write_text(
            json.dumps(ledger, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as exc:  # noqa: BLE001 - 记账失败不应中断同步
        print(f"[sidecar] ws-sync ledger write failed: {type(exc).__name__}: {exc}")


def _ws_doc_title(ws_title: str, rel: str) -> str:
    """DSH产物/<工作区>/<相对路径>。工作区名做与前端 sanitizeSeg 相同的归一化
    （/ 和 \\ 换成 _），保证索引里的 file_path 与 UI 树、@ chip 的 label 对得上。"""
    seg = re.sub(r"[/\\]+", "_", str(ws_title)).strip() or "未命名"
    return f"{NS_DSH}/{seg}/{str(rel).replace(chr(92), '/')}"


async def _workspace_sync_once(max_files: int | None = None) -> dict[str, Any]:
    """把 DSH 工作区里新增/改动过的文本文件入库到 DSH产物/ 命名空间。

    记账文件 kb-ws-sync.json 记录 path -> {mtime, size, title, doc_id}：
    - 未变过的文件跳过（不重复入库、不重复计费）；
    - 改动过的文件先删旧 doc 再入新 doc，避免同一路径在索引里堆积多份。
    """
    if WS_SYNC_STATE["running"]:
        return {"started": False, "note": "already running", "state": dict(WS_SYNC_STATE)}
    WS_SYNC_STATE["running"] = True
    if not WS_SYNC_INDEX_ENABLED:
        WS_SYNC_STATE["running"] = False
        return {"ingested": 0, "indexing": False,
                "note": "DSH产物不再进入知识库索引/解析",
                "state": dict(WS_SYNC_STATE)}
    ingested = 0
    try:
        rag = await ensure_rag()
        ledger = _load_ws_sync()
        todo: list[tuple[str, dict[str, Any]]] = []
        for ws_title, root in _workspace_roots():
            for f in _collect_artifacts(root):
                ext = ("." + f["ext"]) if f.get("ext") else ""
                if ext not in WS_SYNC_TEXT_EXTS:
                    continue
                if not f["size"] or f["size"] > WS_SYNC_MAX_BYTES:
                    continue
                prev = ledger.get(f["path"])
                if prev and prev.get("mtime") == f["mtime"] and prev.get("size") == f["size"] \
                        and prev.get("doc_id"):
                    continue
                todo.append((ws_title, f))
        todo = todo[: (max_files or WS_SYNC_MAX_PER_RUN)]

        for ws_title, f in todo:
            doc_title = _ws_doc_title(ws_title, f["rel"])
            try:
                text = Path(f["path"]).read_text(encoding="utf-8", errors="replace")[:WS_SYNC_MAX_BYTES]
            except Exception as exc:  # noqa: BLE001 - 单个文件读失败不影响整轮
                ledger[f["path"]] = {"mtime": f["mtime"], "size": f["size"],
                                     "title": doc_title, "error": f"{type(exc).__name__}"}
                continue
            if not text.strip():
                continue
            prev = ledger.get(f["path"]) or {}
            old_id = prev.get("doc_id")
            try:
                async with _state["ingest_lock"]:
                    if old_id:
                        try:
                            await rag.lightrag.adelete_by_doc_id(str(old_id))
                        except Exception:
                            pass
                    # 内容与索引里的旧副本相同（账本丢失 doc_id 时最常见）会被
                    # LightRAG 的内容哈希去重拒绝，直接冒泡就会留下一条
                    # "Content already exists" 的 FAILED 行，在「索引」里表现为
                    # 一条永远清不掉的失败。清掉阻塞者后再插一次。
                    # 注意：失败是在 _wait_doc_settled 里才暴露的（ainsert 正常返回
                    # 一个 track id，由 LightRAG 把该 doc 记为 FAILED），所以两处都要
                    # 包住。locked=True：这里已经在 ingest_lock 临界区里。
                    payload = f"# {f['rel']}\n\n文件路径：{doc_title}\n\n{text}"
                    try:
                        doc_id = await rag.lightrag.ainsert(payload, file_paths=[doc_title])
                        summary = await _wait_doc_settled(rag, str(doc_id))
                    except Exception as exc:
                        if not await _clear_duplicate_blocker(rag, doc_title, exc, locked=True):
                            raise
                        doc_id = await rag.lightrag.ainsert(payload, file_paths=[doc_title])
                        summary = await _wait_doc_settled(rag, str(doc_id))
            except Exception as exc:  # noqa: BLE001 - 单个文件失败不阻塞后续文件
                ledger[f["path"]] = {"mtime": f["mtime"], "size": f["size"],
                                     "title": doc_title, "error": str(exc)[:200]}
                continue
            ledger[f["path"]] = {
                "mtime": f["mtime"], "size": f["size"], "title": doc_title,
                "doc_id": str(summary.get("doc_id") or doc_id),
            }
            # 成功入库后如果自愈过程中留下过被拒绝的 FAILED 副本（LightRAG 会给每次
            # 被拒的插入单独记一行），在这里就地清掉，否则「索引」里的失败计数会一直涨。
            _failures_resolve(doc_title)
            await _purge_failed_rows(rag, doc_title)
            ingested += 1

        _save_ws_sync(ledger)
        WS_SYNC_STATE.update(
            last_run_at=time.time(),
            last_ingested=ingested,
            last_error=None,
            total_ingested=WS_SYNC_STATE["total_ingested"] + ingested,
        )
        if ingested:
            _auto_log("DSH产物同步", f"入库 {ingested} 个文件到 {NS_DSH}/")
        return {"ingested": ingested, "pending": len(todo), "state": dict(WS_SYNC_STATE)}
    except Exception as exc:  # noqa: BLE001 - 同步是后台任务，绝不能冒泡
        WS_SYNC_STATE["last_error"] = f"{type(exc).__name__}: {exc}"
        print(f"[sidecar] workspace sync failed: {type(exc).__name__}: {exc}")
        return {"ingested": ingested, "error": str(exc), "state": dict(WS_SYNC_STATE)}
    finally:
        WS_SYNC_STATE["running"] = False


async def _workspace_sync_loop():
    """后台定时同步循环；失败也继续下一轮。"""
    await asyncio.sleep(max(5, WS_SYNC_FIRST_DELAY))
    while True:
        try:
            if WS_SYNC_ENABLED:
                await _workspace_sync_once()
        except Exception as exc:  # noqa: BLE001
            print(f"[sidecar] workspace sync loop error: {type(exc).__name__}: {exc}")
        await asyncio.sleep(max(60, WS_SYNC_INTERVAL))


@app.get("/workspace/artifacts")
async def workspace_artifacts():
    """Read-only mirror of the DSH workspaces' files for the KB panel."""
    return {
        "groups": [
            {"title": title, "path": str(root), "files": _collect_artifacts(root)}
            for title, root in _workspace_roots()
        ]
    }


@app.get("/workspace/file")
async def workspace_file(path: str):
    """Text preview of one workspace file; path must sit inside a registered workspace."""
    roots = [root.resolve() for _, root in _workspace_roots()]
    try:
        target = Path(path).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="invalid path")
    if not any(target.is_relative_to(root) for root in roots):
        raise HTTPException(status_code=403, detail="path is outside registered workspaces")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    size = target.stat().st_size
    try:
        with target.open("rb") as fh:
            head = fh.read(min(size, WS_MAX_PREVIEW + 1))
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"read failed: {exc}")
    if b"\x00" in head[:8192]:
        raise HTTPException(status_code=415, detail="binary file preview is not supported")
    text = head.decode("utf-8", errors="replace")
    return {
        "path": str(target),
        "name": target.name,
        "size": size,
        "truncated": size > WS_MAX_PREVIEW,
        "content": text[:WS_MAX_PREVIEW],
    }


def _unique_label(label: str, used: set[str]) -> str:
    """De-duplicate one zip entry name by appending " (2)", " (3)", … before the extension."""
    if label not in used:
        return label
    stem, _, ext = label.rpartition(".")
    k = 2
    while True:
        cand = f"{stem} ({k})" + (f".{ext}" if ext else "")
        if cand not in used:
            return cand
        k += 1


@app.get("/workspace/download")
async def workspace_download(path: str):
    """Download one workspace file as an attachment (KB panel 文件「下载」).

    Same containment rule as /workspace/file: the path must sit inside a
    registered DSH workspace; the file is served with
    Content-Disposition: attachment so the browser saves it."""
    roots = [root.resolve() for _, root in _workspace_roots()]
    try:
        target = Path(path).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="invalid path")
    if not any(target.is_relative_to(root) for root in roots):
        raise HTTPException(status_code=403, detail="path is outside registered workspaces")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(str(target), filename=target.name, content_disposition_type="attachment")


@app.post("/folders/download")
async def folder_download(body: dict[str, Any]):
    """Package the files of one KB folder into a downloadable zip.

    The KB panel enumerates the folder's files (including sub-folders) and
    posts them here as {name, files:[{kind, doc_id?, ws_path?, label}]}:
      kind "doc" – a sidecar document; the original upload is resolved via the
                   doc's title and included when it is still on disk;
      kind "ws"  – a DSH workspace mirror file; served straight from the
                   registered workspace.
    `label` is the path the file takes inside the zip (folder-relative).
    Entries whose source is missing are skipped; an empty result is 404.
    """
    name = str(body.get("name") or "知识库文件夹.zip")
    name = re.sub(r'[\\/:*?"<>|\s]+', "_", name).strip("._") or "知识库文件夹"
    if not name.lower().endswith(".zip"):
        name += ".zip"
    items = body.get("files") or []
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="files must be a list")
    rag = await ensure_rag()
    ws_roots = [root.resolve() for _, root in _workspace_roots()]
    buf = io.BytesIO()
    used: set[str] = set()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in items:
            if not isinstance(item, dict):
                continue
            label = re.sub(r"[\\]+", "/", str(item.get("label") or "")).strip("/")
            if not label or label.startswith("/") or label in (".", "..") \
                    or label.startswith("../") or "/../" in label:
                continue
            src: Path | None = None
            if item.get("kind") == "ws":
                ws_path = str(item.get("ws_path") or "")
                try:
                    cand = Path(ws_path).resolve()
                except Exception:
                    cand = None
                if cand is not None and any(cand.is_relative_to(root) for root in ws_roots) \
                        and cand.is_file():
                    src = cand
            else:
                doc_id = str(item.get("doc_id") or "")
                title: str | None = None
                if doc_id.startswith("task-"):
                    info = _state["processing_entries"].get(doc_id[len("task-"):])
                    title = str(info.get("title") or "") if info else None
                elif doc_id:
                    try:
                        infos = await rag.lightrag.aget_docs_by_ids([doc_id])
                        doc = infos.get(doc_id)
                        if doc is not None:
                            title = getattr(doc, "file_path", None)
                            if title is None and isinstance(doc, dict):
                                title = doc.get("file_path")
                    except Exception:
                        title = None
                src = _original_file_of(title)
            if src is None or not src.is_file():
                continue
            try:
                data = src.read_bytes()
            except OSError:
                continue
            final = _unique_label(label, used)
            used.add(final)
            zf.writestr(final, data)
    if not used:
        raise HTTPException(status_code=404, detail="no downloadable files in this folder")
    buf.seek(0)
    # Headers are latin-1: percent-encode the (possibly Chinese) zip name per
    # RFC 5987, keeping an ASCII fallback for old clients.
    enc = quote(name, safe="")
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=\"knowledge-base.zip\"; filename*=UTF-8''{enc}"},
    )


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    doc_id: str | None = Form(None),
    parse_method: str | None = Form(None),
    device: str | None = Form(None),
    parent_path: str | None = Form(None),
    on_duplicate: str | None = Form(None),
    file_mtime: float | None = Form(None),
):
    """Accept a file from the browser and enqueue an ingest task for it.

    The file is saved under the managed uploads dir; the returned task_id can
    be polled via GET /tasks/{task_id}. .txt/.md are ingested directly, any
    other format (PDF/Office/...) goes through the configured parser.

    Duplicate detection (R1-R4):
      R1 quick      same display_path (+ size compare vs the stored file);
      R2 exact      SHA-256 identical vs the stored same-name file;
      R3 cross-name SHA-256 identical vs ANY other uploaded file;
      R4 near       image pHash >= threshold (optional, config-gated).
    The 409 conflict body carries "match_type" so the client can explain WHY.

    `on_duplicate` picks the strategy —
      ask        (default) answer 409 {duplicate:true, options:[...]} so the
                 client can prompt; re-post with on_duplicate set;
      skip       discard the new upload, keep the old file untouched;
      overwrite  move the old file to trash/ (7-day retention), delete the
                 old document(s) at task time, index the new file in place;
      rename     index the new file under a `<name>_copy_N` display path;
      version    move the old file to versions/<display>/vN__..., record
                 kb-versions.json metadata, index the new file as latest;
      auto       apply config "duplicate_auto_rule" (default keep_newest:
                 compare client-provided file_mtime vs the stored one);
      keep_both  legacy alias -> " (N)" numbered copy display path;
      delete_old delete the old document(s) and discard the new upload.
    A global default can be set via config "duplicate_policy" (default ask).
    `file_mtime` is the source file's lastModified (ms, browser-provided) and
    feeds the auto rule; server-side callers may omit it.
    """
    if file is None or not file.filename:
        raise HTTPException(status_code=400, detail="file is required")
    name = Path(file.filename or "upload.bin").name or "upload.bin"
    if name in (".", "..") or "\x00" in name:
        raise HTTPException(status_code=400, detail="invalid filename")
    # Reject unsupported formats before the file is written, so junk never
    # reaches the uploads dir (and therefore never comes back on a rebuild).
    upload_ext = name.lower().rsplit(".", 1)[-1] if "." in name else ""
    upload_ext = f".{upload_ext}" if upload_ext else ""
    if upload_ext and upload_ext not in TEXT_EXTS:
        try:
            _reject_unsupported(upload_ext, name)
        except ValueError as exc:
            raise HTTPException(status_code=415, detail=str(exc))
    upload_dir = Path(UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / f"{uuid.uuid4().hex[:8]}-{name}"
    try:
        with dest.open("wb") as out:
            shutil.copyfileobj(file.file, out)
    except Exception as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"failed to save upload: {exc}")
    size = dest.stat().st_size
    if size == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="uploaded file is empty")
    # `display_path` is the user-visible path (original name, optional KB
    # folder prefix). The physical dest keeps the uuid prefix for collision
    # safety; the ingest task records display_path as the doc's file_path so
    # the UI shows the original file name inside the target folder.
    parent = None
    if parent_path:
        segs = [s.strip() for s in str(parent_path).replace("\\", "/").split("/") if s.strip()]
        if any(s in (".", "..") for s in segs):
            raise HTTPException(status_code=400, detail="invalid parent_path")
        parent = "/".join(segs) or None
    display_path = f"{parent}/{name}" if parent else name
    params: dict[str, Any] = {"path": str(dest), "display_path": display_path}
    if doc_id:
        params["doc_id"] = doc_id
    if parse_method:
        params["parse_method"] = parse_method
    if device:
        params["device"] = device
    error = _validate("ingest", params)
    if error:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=error)

    # ---- duplicate detection: R1 quick / R2 exact / R3 cross-name / R4 near ----
    policy = str(on_duplicate or CONFIG.get("duplicate_policy") or "ask").strip().lower()
    if policy not in ("ask", "skip", "overwrite", "rename", "version", "auto",
                      "keep_both", "delete_old"):
        policy = "ask"
    rag_now = _state["rag"] if (_state["initialized"] and _state["rag"]) else None
    dup_doc_ids: list[str] = []
    if rag_now is not None:
        try:
            dup_doc_ids = await _find_doc_ids_by_display(rag_now, display_path, manifest_aware=True)
        except Exception:
            dup_doc_ids = []
    mapping_now = _manifest_load()
    norm_display = display_path.replace("\\", "/")
    dup_manifest = any(str(v).replace("\\", "/") == norm_display for v in mapping_now.values())
    dup_parsing = any(
        str((info or {}).get("title") or "").replace("\\", "/") == norm_display
        for info in _state["processing_entries"].values()
    )
    old_dest_names = [k for k, v in mapping_now.items()
                      if str(v).replace("\\", "/") == norm_display]
    _hashes_gc()
    hashes_now = _hashes_load()
    incoming_sha = _sha256_file(dest)
    match_type = "name" if (dup_doc_ids or dup_manifest or dup_parsing) else None
    match_detail: dict[str, Any] | None = None
    # R2 exact: same name AND same SHA-256 → 完全重复
    if match_type and old_dest_names and incoming_sha:
        old_info = hashes_now.get(old_dest_names[-1]) or {}
        if old_info.get("sha256") == incoming_sha:
            match_type = "identical-content"
            match_detail = {"existing_display": display_path, "existing_size": old_info.get("size")}
    # R3 cross-name: identical content under a DIFFERENT name still counts as
    # a duplicate (hard link / same content re-shared).
    if not match_type and incoming_sha:
        cross = [k for k, h in hashes_now.items()
                 if (h or {}).get("sha256") == incoming_sha
                 and str((h or {}).get("display_path") or _display_of(k)).replace("\\", "/") != norm_display]
        if cross:
            match_type = "cross-name-content"
            old_dest_names = cross
            match_detail = {"existing_display": str((hashes_now.get(cross[0]) or {}).get("display_path") or _display_of(cross[0]))}
    # R4 near-duplicate (images only, config-gated; needs Pillow)
    if not match_type and DUP_PHASH_ENABLED and upload_ext in IMAGE_EXTS:
        ph = _phash(dest)
        if ph:
            for k, h in hashes_now.items():
                if (h or {}).get("phash") and _phash_similar(ph, h["phash"]):
                    match_type = "near-duplicate"
                    old_dest_names = [k]
                    match_detail = {"existing_display": str(h.get("display_path") or _display_of(k))}
                    break
    is_dup = match_type is not None
    if is_dup and policy == "ask":
        # Hand the decision to the user; discard the just-saved copy so a
        # cancelled prompt leaves no orphan file in uploads/.
        dest.unlink(missing_ok=True)
        return JSONResponse(status_code=409, content={
            "duplicate": True,
            "match_type": match_type,
            "match_detail": match_detail,
            "display_path": display_path,
            "existing_doc_ids": dup_doc_ids,
            "parsing": dup_parsing,
            "message": "检测到重复文件，请选择处理方式",
            "options": [
                {"value": "skip", "label": "跳过（不上传该文件，不中断批量上传）"},
                {"value": "overwrite", "label": "覆盖（旧文件移入回收站，保留 7 天）"},
                {"value": "rename", "label": "重命名并上传（自动添加 _copy_N 后缀）"},
                {"value": "version", "label": "版本归档（旧文件归入 versions/，新文件作为最新版）"},
                {"value": "auto", "label": "自动（按规则保留最新修改时间的版本）"},
            ],
        })
    if is_dup and policy == "auto":
        # Apply the configured rule. keep_newest compares the client-provided
        # source mtime against the stored one; unknown sides default to
        # overwrite (matches the historical silent-replace behaviour).
        old_mtime = None
        if old_dest_names:
            old_mtime = (hashes_now.get(old_dest_names[-1]) or {}).get("source_mtime")
        inc_mtime = (file_mtime / 1000.0) if file_mtime else None
        if DUP_AUTO_RULE in ("keep_existing", "skip"):
            effective = "skip"
        elif DUP_AUTO_RULE in ("keep_newest", "newest"):
            effective = "overwrite" if (old_mtime is None or inc_mtime is None or inc_mtime > float(old_mtime)) else "skip"
        else:
            effective = "overwrite"
        _auto_log("重复上传·自动", f"{display_path} · 规则={DUP_AUTO_RULE} → {effective}（{match_type}）")
    else:
        effective = policy

    if is_dup and effective == "skip":
        dest.unlink(missing_ok=True)
        _auto_log("重复上传", f"{display_path} · 选择跳过，未上传（{match_type}）")
        return {
            "skipped": True,
            "duplicate": True,
            "match_type": match_type,
            "display_path": display_path,
            "uploaded": False,
        }
    if is_dup and effective == "delete_old":
        dest.unlink(missing_ok=True)
        _manifest_drop_display(display_path)
        delete_tasks = [_submit("delete_document", {"doc_id": i}) for i in dup_doc_ids]
        _auto_log("删除旧文件", f"{display_path} · 上传时选择删除旧文件（{len(dup_doc_ids)} 个文档）")
        return {
            "deleted_doc_ids": dup_doc_ids,
            "delete_task_ids": delete_tasks,
            "uploaded": False,
            "display_path": display_path,
        }
    version_no: int | None = None
    renamed_to: str | None = None
    if is_dup and effective == "overwrite":
        # Old physical file(s) go to trash/ with 7-day retention; the old
        # document(s) are removed delete-before-insert at ingest task time.
        _trash_old_upload(display_path)
    if is_dup and effective == "version":
        version_no = _archive_version(display_path)
    if is_dup and effective in ("rename", "keep_both"):
        taken = {str(v).replace("\\", "/") for v in mapping_now.values()}
        taken.update(
            str((info or {}).get("title") or "").replace("\\", "/")
            for info in _state["processing_entries"].values()
        )
        taken.add(norm_display)
        alt = _unique_copy_display(display_path, taken,
                                   style="copy" if effective == "rename" else "paren")
        _auto_log("重复上传", f"{display_path} · 选择{'重命名' if effective == 'rename' else '保留两份'}，新文件入库为 {alt}")
        display_path = alt
        params["display_path"] = alt
        renamed_to = alt
        # LightRAG dedups by content hash: a byte-identical copy is rejected
        # ("Content already exists"). Tag txt/md copies with a provenance line
        # so both copies can coexist. Parser-based formats cannot be tagged —
        # identical content there ends as E_DUPLICATE (manual), a known edge.
        params["dup_copy"] = True

    task_id = _submit("ingest", params)
    # Record the upload in the manifest so index rebuilds re-ingest exactly
    # the set of currently uploaded (non-deleted) files. Re-uploading the same
    # display path keeps only the newest entry, so the superseded copy can
    # never come back on a rebuild.
    _manifest_add(dest.name, display_path)
    _manifest_prune_display(display_path, keep=dest.name)
    # Register the content fingerprint so future uploads can run R2/R3 checks
    # without re-hashing stored files.
    _hashes_record(dest.name, dest, display_path, sha256=incoming_sha,
                   source_mtime=(file_mtime / 1000.0) if file_mtime else None)
    # 需求1: 所有上传(含 txt/md)都立即注册「解析中」条目,文件先出现在知识库
    # 列表,再在后台慢慢解析;任务结束后条目被移除,文档状态流转为「已入库」。
    _register_processing(task_id, display_path)
    ext = name.lower().rsplit(".", 1)[-1] if "." in name else ""
    resp: dict[str, Any] = {
        "task_id": task_id,
        "path": str(dest),
        "name": name,
        "size": size,
        "how": "direct" if ext in ("txt", "md", "markdown") else f"parser:{CONFIG.get('parser', 'mineru')}",
    }
    if renamed_to:
        resp["renamed_to"] = renamed_to
    if version_no:
        resp["version"] = version_no
    return resp


@app.post("/tasks")
async def submit_task(body: dict[str, Any]):
    op = body.get("op")
    params = body.get("params") or {}
    error = _validate(op, params)
    if error:
        raise HTTPException(status_code=400, detail=error)
    task_id = _submit(op, params)
    return {"task_id": task_id}


@app.get("/tasks/{task_id}")
async def get_task(task_id: str):
    task = _tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"no such task: {task_id}")
    return {k: task.get(k) for k in ("task_id", "op", "status", "submitted_at", "started_at", "finished_at", "result", "error", "progress")}


@app.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    task = _tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"no such task: {task_id}")
    runner = task.get("_async_task")
    if runner is not None and not runner.done():
        runner.cancel()
        return {"cancelled": task_id}
    return {"cancelled": task_id, "note": f"task already {task['status']}"}


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    # patch6: synchronous fingerprint prune in DELETE route
    # Prune the duplicate-detection fingerprints (hash cache + manifest) HERE,
    # synchronously, so a re-upload of the same / renamed / same-content file is
    # accepted immediately even while the async delete worker is queued behind the
    # ingest semaphore (token errors make ingests retry and can starve delete
    # tasks for many seconds). The LightRAG doc removal still happens in the worker.
    _pid = str(doc_id)[5:] if str(doc_id).startswith("task-") else None
    _title = None
    if _pid:
        _pe = _state["processing_entries"].get(_pid) or {}
        _title = str(_pe.get("title") or "") or None
        if not _title:
            _tp = (_tasks.get(_pid) or {}).get("params") or {}
            _pd = (_tp.get("display_path") or _tp.get("title") or _tp.get("file_path") or "")
            if _pd:
                _title = str(_pd) or None
        # patch7: cancel ingest + pop processing_entries in route
        # Cancel the in-flight ingest and drop the processing entry so a
        # same-name re-upload is not flagged as a duplicate still-parsing
        # (dup_parsing) even though the hash cache + manifest were pruned.
        _t = _tasks.get(_pid)
        if _t is not None:
            _runner = _t.get("_async_task")
            if _runner is not None and not _runner.done():
                try:
                    _runner.cancel()
                except Exception:
                    pass
        _state["processing_entries"].pop(_pid, None)
    else:
        if _state.get("initialized") and _state.get("rag") is not None:
            try:
                _title = await _doc_title_by_id(_state["rag"], str(doc_id))
            except Exception:
                _title = None
    if _title:
        try:
            _manifest_drop_display(_title)
        except Exception:
            pass
        try:
            _hashes_drop_display(_title)
        except Exception:
            pass
    task_id = _submit("delete_document", {"doc_id": doc_id})
    return {"task_id": task_id}


# ---------------------------------------------------------------------------
# User operation log (知识库面板「日志」)
# ---------------------------------------------------------------------------


@app.post("/log")
async def append_log(body: dict[str, Any]):
    """Append one user operation entry to the JSONL log."""
    action = str(body.get("action") or "").strip()
    if not action:
        raise HTTPException(status_code=400, detail="action is required")
    entry: dict[str, Any] = {"ts": round(time.time(), 3), "action": action[:120]}
    detail = body.get("detail")
    if detail:
        entry["detail"] = str(detail)[:500]
    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"log write failed: {exc}")
    return {"ok": True}


@app.get("/log")
async def list_logs(limit: int = 500):
    """Most recent log entries, newest first."""
    limit = max(1, min(limit, 5000))
    entries: list[dict[str, Any]] = []
    if LOG_PATH.is_file():
        with LOG_PATH.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return {"logs": list(reversed(entries[-limit:])), "total": len(entries)}


@app.get("/log/export")
async def export_logs():
    """Download the raw JSONL log file."""
    if not LOG_PATH.is_file():
        data = ""
    else:
        data = LOG_PATH.read_text(encoding="utf-8")
    stamp = time.strftime("%Y%m%d-%H%M%S")
    return Response(
        content=data,
        media_type="application/x-ndjson",
        headers={"Content-Disposition": f'attachment; filename="kb-logs-{stamp}.jsonl"'},
    )


# ---------------------------------------------------------------------------
# Index statistics + full rebuild (知识库面板「索引」)
# ---------------------------------------------------------------------------


def _dir_size(path: Path) -> int:
    total = 0
    for dirpath, _dirnames, filenames in os.walk(path):
        for name in filenames:
            try:
                total += (Path(dirpath) / name).stat().st_size
            except OSError:
                continue
    return total


def _pdf_fast_text(path: Path) -> tuple[str | None, int]:
    """Extract the text layer of a PDF with PyMuPDF (fast path).

    Returns (text, page_count); text is None when the PDF has no usable text
    layer (scanned/image-only) or extraction fails, in which case the caller
    falls through to the full MinerU parser."""
    try:
        import pymupdf
    except Exception:
        return None, 0
    try:
        doc = pymupdf.open(str(path))
        n = doc.page_count
        parts = [page.get_text("text") or "" for page in doc]
        doc.close()
        return "\n".join(parts).strip(), n
    except Exception:
        try:
            doc.close()
        except Exception:
            pass
        return None, 0


def _looks_scanned(text: str, pages: int) -> bool:
    """Heuristic: fewer than ~100 chars per page usually means the PDF is
    image-only (scanned) and needs OCR/版面 analysis instead of raw text."""
    if not text:
        return True
    return len(text) / max(pages, 1) < 100


async def _ingest_pdf(rag, path: Path, params: dict[str, Any], task: dict[str, Any], label: str) -> None:
    """PDF ingest: fast path (PyMuPDF text layer, seconds) when the file has
    real text; otherwise full MinerU parse (scanned/image PDFs)."""
    task["progress"] = {"stage": "抽取文本", "percent": 10,
                        "message": "PyMuPDF 快速抽取文本层…"}
    pdf_text, pdf_pages = _pdf_fast_text(path)
    if pdf_text and not _looks_scanned(pdf_text, pdf_pages):
        display = params.get("display_path") or str(path)
        import hashlib as _hashlib
        stable_id = "pdf-fast-" + _hashlib.md5(pdf_text.encode("utf-8")).hexdigest()[:16]
        task["progress"] = {"stage": "入库", "percent": 30,
                            "message": f"文本抽取完成（{pdf_pages} 页 / {len(pdf_text)} 字符），正在索引…"}
        track_id = await rag.lightrag.ainsert(
            pdf_text, file_paths=[display], ids=stable_id,
        )
        task["progress"] = {"stage": "索引", "percent": 60,
                            "message": "分块/向量/实体索引中（快通道，跳过版面 OCR）…"}
        summary = await _wait_doc_settled(rag, str(track_id))
        task["progress"] = {"stage": "完成", "percent": 100}
        task["result"] = {**summary, "path": str(path), "chars": len(pdf_text),
                          "pages": pdf_pages, "how": "pdf-fast(pymupdf)"}
    else:
        reason = "未抽取到文本（疑似扫描件）" if not pdf_text else "文本量过低（疑似扫描件）"
        task["progress"] = {"stage": "解析中", "percent": 5,
                            "message": f"{reason}，改用 MinerU 完整解析…"}
        await _ingest_via_mineru(rag, path, params, task, label)


async def _ingest_via_mineru(rag, path: Path, params: dict[str, Any], task: dict[str, Any], label: str) -> None:
    """Full MinerU pipeline for scanned PDFs / Office / images. Stage-based
    progress (no subprocess-level %, but the UI at least sees movement)."""
    device = params.get("device") or CONFIG.get("parser_device") or "cpu"
    task["progress"] = {
        "stage": "解析中",
        "device": device,
        "percent": 5,
        "message": "MinerU 正在解析（版面/OCR）…",
    }
    used_backend = await _parse_with_fallback(
        rag, path,
        params.get("display_path") or None,
        device, label,
        doc_id=params.get("doc_id"),
        parse_method=params.get("parse_method"),
    )
    task["progress"] = {"stage": "完成", "percent": 100}
    task["result"] = {"path": str(path), "how": f"parser:{CONFIG.get('parser', 'mineru')}({used_backend})"}



async def _parse_with_fallback(rag, path, display, device, label, doc_id=None,
                               parse_method=None):
    """MinerU parse with one automatic VLM->pipeline(OCR) degradation.

    The VLM engine holds a multi-GB resident model; on RAM-constrained hosts
    (e.g. 7.4GB Jetson) large PDFs OOM/timeout near the end of a long parse.
    The lighter pipeline (OCR) backend survives those."""
    primary_backend = CONFIG.get("parser_backend") or "vlm-engine"

    async def _parse(backend: str):
        await rag.process_document_complete(
            file_path=str(path),
            file_name=display,
            doc_id=doc_id,
            parse_method=parse_method,
            device=device,
            backend=backend,
            env=_parser_env(device),
        )

    def _is_dup(exc: BaseException) -> bool:
        return "already exists" in str(exc).lower() or "duplicate" in str(exc).lower()

    try:
        await _parse(primary_backend)
        return primary_backend
    except Exception as parse_exc:
        # A duplicate rejection here means an earlier copy of this file is still
        # registered (often a zombie whose status is outside DocStatus). Clear
        # the blocker and run the parse again instead of reporting 失败.
        # locked=True: every caller (_ingest_via_mineru / _ingest_pdf, both
        # reached from the ingest critical section) already holds ingest_lock.
        if display and _is_dup(parse_exc) and await _clear_duplicate_blocker(rag, display, parse_exc, locked=True):
            try:
                await _parse(primary_backend)
                return primary_backend
            except Exception as retry_exc:
                parse_exc = retry_exc
        degrade = (
            primary_backend != "pipeline"
            and "Mineru command failed" in str(parse_exc)
        )
        if not degrade:
            raise
        print(f"[sidecar] {primary_backend} parse failed ({parse_exc}); "
              "retrying with pipeline (OCR) backend")
        _auto_log("解析降级", f"{label} · {primary_backend} 解析失败，自动改用 pipeline(OCR) 后端重试")
        await _parse("pipeline")
        return "pipeline"
        return "pipeline"


async def _rebuild_worker(files: list[tuple[Path, str]]) -> None:
    """Sequentially re-ingest the given (path, display_path) pairs."""
    _rebuild_state.update(
        running=True, total=len(files), done=0, failed=[],
        started_at=time.time(), finished_at=None, error=None,
    )
    _auto_log("开始重建索引", f"共 {len(files)} 个文件")
    try:
        rag = await ensure_rag()
        for path, display in files:
            try:
                ext = path.suffix.lower()
                # Rebuild walks uploads/ directly, so it bypasses the /upload
                # guard. Re-apply the type whitelist or a stray file left behind
                # by an older build keeps failing on every rebuild.
                _reject_unsupported(ext, path.name)
                async with _state["ingest_lock"]:
                    # Delete-before-insert: re-indexing a file whose content is
                    # already in the store would be rejected by LightRAG's
                    # content-hash dedup ("Content already exists"), leaving the
                    # panel stuck on 失败 even though a healthy copy exists.
                    # Clear every record sharing this display path first, then
                    # insert the fresh copy.
                    try:
                        for vid in await _find_doc_ids_by_display(rag, display):
                            await rag.lightrag.adelete_by_doc_id(vid)
                    except Exception as exc:
                        print(f"[sidecar] rebuild pre-delete {display} failed: "
                              f"{type(exc).__name__}: {exc}")
                    if ext in (".txt", ".md", ".markdown"):
                        text = path.read_text(encoding="utf-8", errors="replace")
                        try:
                            await rag.lightrag.ainsert(text, file_paths=[display])
                        except Exception as exc:
                            # ZOMBIE ORIGINAL: the blocking doc id is not
                            # reachable via _find_doc_ids_by_display (status
                            # outside the enum). Clear it and insert once more.
                            # (locked=True: we already hold ingest_lock above.)
                            if not await _clear_duplicate_blocker(rag, display, exc, locked=True):
                                raise
                            await rag.lightrag.ainsert(text, file_paths=[display])
                    else:
                        _device = CONFIG.get("parser_device") or "cpu"
                        await _parse_with_fallback(rag, path, display, _device, display)
                _rebuild_state["done"] += 1
                # A successful re-index must also clear the failure ledger and
                # the stale FAILED doc rows, otherwise the panel keeps showing
                # 失败 (and error_code/attempts badges) for a healthy file.
                _failures_resolve(display)
                await _purge_failed_rows(rag, display)
                _auto_log("重建文件完成", display)
            except Exception as exc:
                _record_ingest_failure("ingest", {"path": str(path), "display_path": display}, exc)
                _rebuild_state["failed"].append(f"{display}: {type(exc).__name__}: {exc}")
                if len(_rebuild_state["failed"]) > 50:
                    _rebuild_state["failed"] = _rebuild_state["failed"][-50:]
                traceback.print_exc()
                _auto_log("重建文件失败", f"{display} · {type(exc).__name__}: {exc}")
    except Exception as exc:
        _rebuild_state["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        _rebuild_state["running"] = False
        _rebuild_state["finished_at"] = time.time()
        _auto_log("重建索引完成", f"成功 {_rebuild_state['done']}，失败 {len(_rebuild_state['failed'])}")


def _rebuild_public() -> dict[str, Any]:
    return {k: _rebuild_state[k] for k in ("running", "total", "done", "failed", "started_at", "finished_at", "error")}


def _ingest_active() -> int:
    """Number of ingest/parse tasks currently pending or running."""
    return sum(1 for t in _tasks.values()
               if t["op"].startswith("ingest") and t["status"] in ("pending", "running"))



# ---------------------------------------------------------------------------
# 共享知识库（2026-09-13）
# 设计：多用户部署里以宿主实例（默认 http://127.0.0.1:17321）为共享存储——
#   · 共享文档以 display_path 前缀 "共享/<文件夹>/" 入库到宿主实例；
#   · 文件夹与成员清单（谁可查看）记录在宿主 config 同目录 shared_kb.json；
#   · 用户实例的 /shared/* 全部转发到宿主（自动读取宿主 token）。
# 单实例部署（PORT==17321）自动进入本地模式，功能照常可用。
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# 代理环境自愈（2026-09-14）
#
# httpx 0.28 在构造 AsyncClient 时会把 NO_PROXY 的每一个条目当作 URL 解析
# （httpx/_client.py -> URLPattern -> URL）。条目里一旦出现**带方括号的 IPv6
# 字面量**（如 `[::1]`），URL 解析就把 ":1]" 当成端口，直接抛：
#
#     httpx.InvalidURL: Invalid port: ':1]'
#
# 关键点：这个异常发生在**客户端构造阶段**，与请求目标毫不相关 —— 于是本进程里
# 每一次出站调用（共享知识库转发 /shared/*、LLM、embedding、rerank）都会在
# new AsyncClient() 那一行整体失败。用户实例的症状就是「共享知识库永远是空的」
# 加上「上传/问答全部报错」，而宿主实例因为不需要转发、没人注意。
#
# 方括号写法与裸写法（::1）在主机名匹配上等价，这里统一去掉方括号并去重：
# NO_PROXY 依然能被 Node / curl 正确理解，同时不会再毒死 httpx。
# ---------------------------------------------------------------------------
def _sanitize_no_proxy_env() -> None:
    for name in ("NO_PROXY", "no_proxy"):
        raw = os.environ.get(name)
        if not raw:
            continue
        seen: list[str] = []
        for part in raw.split(","):
            entry = part.strip().replace("[", "").replace("]", "")
            if entry and entry not in seen:
                seen.append(entry)
        os.environ[name] = ",".join(seen)


_sanitize_no_proxy_env()

SHARED_NS = "共享"
SHARED_BASE = (os.environ.get("RAG_SHARED_BASE") or "http://127.0.0.1:17321").rstrip("/")


def _is_shared_display(title: Any) -> bool:
    """display_path 是否属于共享知识库命名空间（`共享` 或 `共享/<文件夹>/…`）。

    共享文档与宿主个人文档**同库**（宿主实例就是共享存储），只靠不同的
    display_path 前缀区分；个人知识库的列表/检索必须把它们摘掉。
    """
    t = str(title or "").replace("\\", "/").strip()
    return t == SHARED_NS or t.startswith(SHARED_NS + "/")


def _shared_is_local() -> bool:
    """本实例自己就是共享存储宿主。"""
    if SHARED_BASE == "local":
        return True
    try:
        from urllib.parse import urlparse
        u = urlparse(SHARED_BASE)
        host = u.hostname or "127.0.0.1"
        return host in ("127.0.0.1", "localhost", "::1") and (u.port or 80) == PORT
    except Exception:
        return False


def _mu_host_home() -> Path:
    """multi-user 部署里 dsh-web 宿主的家目录（读宿主 token / 账号清单用）。"""
    if _DSH_HOME_ENV:
        parts = Path(_DSH_HOME_ENV).resolve().parts
        if ".dsh" in parts:
            i = parts.index(".dsh")
            return Path(*parts[:i]) if i > 0 else Path("/")
    return Path.home()


_SHARED_TOK_CACHE = {"ts": 0.0, "token": ""}


def _shared_token() -> str:
    tok = os.environ.get("RAG_SHARED_TOKEN", "").strip()
    if tok:
        return tok
    now = time.time()
    if now - _SHARED_TOK_CACHE["ts"] < 10:
        return _SHARED_TOK_CACHE["token"]
    tok = ""
    cfg_path = os.environ.get("RAG_SHARED_CONFIG") or str(_mu_host_home() / ".dsh" / "raganything" / "config.json")
    try:
        tok = str(json.loads(Path(cfg_path).read_text(encoding="utf-8")).get("token") or "")
    except Exception:
        tok = ""
    _SHARED_TOK_CACHE["ts"] = now
    _SHARED_TOK_CACHE["token"] = tok
    return tok


def _shared_self_account() -> str:
    """本实例能从 DSH_HOME 自证的账号；宿主实例推导不出，返回 ""。"""
    if _DSH_HOME_ENV:
        parts = Path(_DSH_HOME_ENV).resolve().parts
        if "users" in parts:
            try:
                return str(parts[parts.index("users") + 1] or "").strip()
            except IndexError:
                pass
    return ""


def _shared_account(explicit: str | None = None) -> str:
    """当前账号：**DSH_HOME 自证 > 客户端传入 > 宿主用户名**。

    顺序不能反。managed 账号的实例路径里就写着自己的账号名，是服务端事实；
    而 `user=` 参数只是浏览器 cookie `dsh_mu_user` 的镜射 —— 改一下自己的
    cookie 就能冒名读别人的共享文件夹。所以能自证时一律以自证为准；只有宿主
    实例（推导不出账号）才采信传入值，而宿主实例只接受受信的用户实例转发，
    或操作者本机直连。
    """
    derived = _shared_self_account()
    if derived:
        return derived
    e = (explicit or "").strip()
    if e:
        return e
    return _mu_host_home().name or "admin"


def _shared_body_for(body: Any, name: str | None = None) -> dict:
    """转发给宿主前把账号钉死为本实例自证的身份，忽略浏览器传入的 user。"""
    out = dict(body) if isinstance(body, dict) else {}
    out["user"] = _shared_account(out.get("user"))
    if name is not None:
        out["name"] = name
    return out


def _shared_manifest_path() -> Path:
    return Path(CONFIG_PATH).parent / "shared_kb.json"


def _shared_manifest() -> dict:
    try:
        data = json.loads(_shared_manifest_path().read_text(encoding="utf-8"))
    except Exception:
        data = {}
    if not isinstance(data, dict):
        data = {}
    if not isinstance(data.get("folders"), list):
        data["folders"] = []
    return data


def _shared_manifest_save(data: dict) -> None:
    p = _shared_manifest_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(p)


def _shared_mu_account_db() -> tuple[list[str], set[str]]:
    """(有效用户, 管理员集合)：users.json 为权威来源（已删除/停用账号不可选）。"""
    mu_root = _mu_host_home() / ".dsh" / "multi-user"
    valid: list[str] = []
    admins: set[str] = set()
    try:
        uj = json.loads((mu_root / "users.json").read_text(encoding="utf-8"))
        for u in uj.get("users") or []:
            if not isinstance(u, dict):
                continue
            name = str(u.get("username") or "").strip()
            if not name:
                continue
            if str(u.get("status") or "active") == "active":
                valid.append(name)
            if str(u.get("role") or "") == "admin":
                admins.add(name)
    except Exception:
        valid = []
    if not valid:
        # users.json 缺失时退回目录列表（旧行为）
        try:
            uroot = mu_root / "users"
            if uroot.is_dir():
                valid = sorted(d.name for d in uroot.iterdir() if d.is_dir())
        except Exception:
            valid = []
    return valid, admins


def _shared_known_users() -> list[str]:
    valid, _admins = _shared_mu_account_db()
    host = _mu_host_home().name or "admin"
    if host not in valid:
        valid = [host] + valid
    return sorted(set(valid))


def _shared_is_admin(acct: str) -> bool:
    """宿主用户与 users.json 里 role=admin 的账号视为管理员。"""
    if acct == (_mu_host_home().name or "admin"):
        return True
    _valid, admins = _shared_mu_account_db()
    return acct in admins


def _shared_folder_visible(folder: dict, user: str) -> bool:
    return user == (folder.get("created_by") or "") or user in (folder.get("members") or [])


async def _shared_forward(method: str, path: str, *, params=None, json_body=None,
                          files=None, data=None, raw: bool = False):
    headers = {}
    tok = _shared_token()
    if tok:
        headers["Authorization"] = f"Bearer {tok}"
    # 转发目标恒为 loopback（宿主 sidecar）：trust_env=False 既不走系统代理，
    # 也不受调用方 NO_PROXY 写法的影响。
    async with httpx.AsyncClient(timeout=120.0, trust_env=False) as hc:
        r = await hc.request(method, SHARED_BASE + path, params=params, json=json_body,
                             files=files, data=data, headers=headers)
    if raw:
        return Response(content=r.content, status_code=r.status_code,
                        media_type=r.headers.get("content-type", "application/octet-stream"))
    if r.status_code >= 400:
        try:
            detail = r.json().get("detail", r.text)
        except Exception:
            detail = r.text
        raise HTTPException(status_code=r.status_code, detail=str(detail))
    try:
        return r.json()
    except Exception:
        return {}


async def _shared_local_docs() -> list[dict]:
    """宿主本地：收集 display_path 以 共享/ 开头的全部文档（轻量版 /documents）。"""
    rag = await ensure_rag()
    from lightrag.base import DocStatus
    statuses = (DocStatus.PROCESSED, DocStatus.PROCESSING, DocStatus.PENDING,
                DocStatus.FAILED, DocStatus.PREPROCESSED)
    results = await asyncio.gather(*[rag.lightrag.get_docs_by_status(s) for s in statuses])
    out: list[dict] = []
    for status_, mapping in zip(statuses, results):
        for doc_id, doc in mapping.items():
            title = str(getattr(doc, "file_path", "") or "").replace("\\", "/")
            if not title.startswith(SHARED_NS + "/"):
                continue
            out.append({
                "doc_id": doc_id,
                "title": title,
                "status": status_.value,
                "has_file": _original_file_of(title) is not None,
                "content_length": getattr(doc, "content_length", None),
            })
    for task_id, info in _state["processing_entries"].items():
        title = str(info.get("title") or "").replace("\\", "/")
        if title.startswith(SHARED_NS + "/"):
            out.append({"doc_id": f"task-{task_id}", "title": title, "status": "processing",
                        "has_file": True, "content_length": None})
    out.sort(key=lambda d: str(d["title"]))
    return out


@app.get("/shared/tree")
async def shared_tree(user: str | None = None):
    if not _shared_is_local():
        return await _shared_forward("GET", "/shared/tree", params={"user": _shared_account(user)})
    acct = _shared_account(user)
    data = _shared_manifest()
    docs = await _shared_local_docs()
    # 回收箱中的文档不在树中展示
    trashed_ids = {str(x) for t in (data.get("trash") or []) for x in (t.get("doc_ids") or [])}
    if trashed_ids:
        docs = [d for d in docs if str(d["doc_id"]) not in trashed_ids]
    host_admin = _shared_is_admin(acct)
    # 每个文档归属"最长匹配"的文件夹条目，避免父子条目重复列出同一文档
    names = sorted((str(f.get("name") or "") for f in data["folders"]), key=len, reverse=True)

    def _owner_of(title: str) -> str | None:
        for n in names:
            if n and title.startswith(f"{SHARED_NS}/{n}/"):
                return n
        return None

    by_owner: dict[str, list[dict]] = {}
    for d in docs:
        owner = _owner_of(str(d["title"]))
        if owner:
            by_owner.setdefault(owner, []).append(d)
    folders = []
    for f in data["folders"]:
        fname = str(f.get("name") or "")
        if not _shared_folder_visible(f, acct) and not host_admin:
            continue
        renames = f.get("renames") or {}
        fd = []
        for d in by_owner.get(fname, []):
            dd = dict(d)
            rn = renames.get(str(dd["doc_id"]))
            if rn:
                dd["title"] = f"{SHARED_NS}/{fname}/{rn}"
            fd.append(dd)
        folders.append({
            "name": fname,
            "display": f.get("alias") or fname,
            "members": f.get("members") or [],
            "created_by": f.get("created_by") or "",
            "docs": fd,
            "can_manage": acct == (f.get("created_by") or "") or host_admin,
        })
    folders.sort(key=lambda x: x["name"])
    return {"folders": folders, "users": _shared_known_users(), "account": acct, "is_admin": host_admin}


@app.post("/shared/folders")
async def shared_folder_create(request: Request):
    body = await request.json()
    if not _shared_is_local():
        return await _shared_forward("POST", "/shared/folders", json_body=_shared_body_for(body))
    name = str(body.get("name") or "").strip().strip("/")
    user = _shared_account(body.get("user"))
    if not name or len(name) > 80 or "\\" in name or any(s in (".", "..") for s in name.split("/")):
        raise HTTPException(status_code=400, detail="invalid folder name")
    data = _shared_manifest()
    if any(f.get("name") == name for f in data["folders"]):
        raise HTTPException(status_code=409, detail="共享文件夹已存在")
    members = sorted({str(m).strip() for m in (body.get("members") or []) if str(m).strip()} | {user})
    data["folders"].append({
        "name": name,
        "members": members,
        "created_by": user,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    _shared_manifest_save(data)
    return {"ok": True, "name": name}


@app.put("/shared/folders/{name}")
async def shared_folder_update(name: str, request: Request):
    body = await request.json()
    return await _shared_folder_manage(name, body)


@app.put("/shared/folders")
async def shared_folder_update_q(request: Request):
    """嵌套名（含 /）的成员/别名更新：name 走 body。"""
    body = await request.json()
    name = str(body.get("name") or "").strip().strip("/")
    return await _shared_folder_manage(name, body)


async def _shared_folder_manage(name: str, body: dict):
    if not _shared_is_local():
        return await _shared_forward("PUT", "/shared/folders", json_body=_shared_body_for(body, name))
    user = _shared_account(body.get("user"))
    data = _shared_manifest()
    f = next((x for x in data["folders"] if x.get("name") == name), None)
    if f is None:
        raise HTTPException(status_code=404, detail="共享文件夹不存在")
    if user != (f.get("created_by") or "") and not _shared_is_admin(user):
        raise HTTPException(status_code=403, detail="只有创建者可以管理")
    if "alias" in body:
        alias = str(body.get("alias") or "").strip().strip("/")
        if not alias or len(alias) > 80 or "\\" in alias:
            raise HTTPException(status_code=400, detail="invalid alias")
        f["alias"] = alias
    if "members" in body:
        members = sorted({str(m).strip() for m in (body.get("members") or []) if str(m).strip()} | {f.get("created_by") or user})
        f["members"] = members
    _shared_manifest_save(data)
    return {"ok": True, "members": f.get("members") or [], "alias": f.get("alias") or name}


@app.delete("/shared/folders/{name}")
async def shared_folder_delete(name: str, user: str | None = None):
    return await _shared_folder_trash(name, user)


@app.delete("/shared/folders")
async def shared_folder_delete_q(name: str = "", user: str | None = None):
    """嵌套名（含 /）的文件夹删除（入回收箱）：name 走 query。"""
    return await _shared_folder_trash(name, user)


async def _shared_folder_trash(name: str, user: str | None = None):
    if not _shared_is_local():
        return await _shared_forward("DELETE", "/shared/folders", params={"name": name, "user": _shared_account(user)})
    name = str(name or "").strip().strip("/")
    acct = _shared_account(user)
    data = _shared_manifest()
    f = next((x for x in data["folders"] if x.get("name") == name), None)
    if f is None:
        raise HTTPException(status_code=404, detail="共享文件夹不存在")
    if acct != (f.get("created_by") or "") and not _shared_is_admin(acct):
        raise HTTPException(status_code=403, detail="只有创建者可以删除")
    docs = await _shared_local_docs()
    now = datetime.now(timezone.utc).isoformat()
    trash = data.setdefault("trash", [])
    # 本文件夹 + 全部子孙条目一起入回收箱（文档保留，仅清单摘除）
    doomed = [x for x in data["folders"] if x.get("name") == name or str(x.get("name") or "").startswith(name + "/")]
    for x in doomed:
        xname = str(x.get("name") or "")
        xprefix = f"{SHARED_NS}/{xname}/"
        doc_ids = [str(d["doc_id"]) for d in docs
                   if str(d["title"]).startswith(xprefix) and not str(d["doc_id"]).startswith("task-")]
        trash.append({
            "id": uuid.uuid4().hex[:12],
            "kind": "folder",
            "name": xname,
            "doc_ids": doc_ids,
            "members": x.get("members") or [],
            "created_by": x.get("created_by") or "",
            "alias": x.get("alias") or "",
            "renames": x.get("renames") or {},
            "deleted_by": acct,
            "deleted_at": now,
        })
    doomed_names = {str(x.get("name") or "") for x in doomed}
    data["folders"] = [x for x in data["folders"] if str(x.get("name") or "") not in doomed_names]
    _shared_manifest_save(data)
    return {"ok": True, "trashed": len(doomed), "trashed_docs": sum(len(t["doc_ids"]) for t in trash[-len(doomed):])}


@app.post("/shared/publish")
async def shared_publish(
    file: UploadFile = File(...),
    folder: str = Form(...),
    user: str | None = Form(None),
):
    if not _shared_is_local():
        content = await file.read()
        files = {"file": (file.filename or "upload.bin", content, file.content_type or "application/octet-stream")}
        return await _shared_forward("POST", "/shared/publish", files=files,
                                     data={"folder": folder, "user": _shared_account(user)})
    name = Path(file.filename or "upload.bin").name or "upload.bin"
    if name in (".", "..") or "\x00" in name:
        raise HTTPException(status_code=400, detail="invalid filename")
    folder = folder.strip().strip("/")
    acct = _shared_account(user)
    data = _shared_manifest()
    segs = [p for p in folder.split("/") if p]
    if not segs or any(p in (".", "..") for p in segs):
        raise HTTPException(status_code=400, detail="invalid folder path")
    # 权限按"最长已存在的祖先条目"判定
    anc = None
    for i in range(len(segs), 0, -1):
        cand = "/".join(segs[:i])
        m = next((x for x in data["folders"] if x.get("name") == cand), None)
        if m is not None:
            anc = m
            break
    if anc is None:
        raise HTTPException(status_code=404, detail="共享文件夹不存在")
    if not _shared_folder_visible(anc, acct) and not _shared_is_admin(acct):
        raise HTTPException(status_code=403, detail="没有该共享文件夹的权限")
    # 沿途缺失的子文件夹条目自动补齐（继承祖先成员）
    now = datetime.now(timezone.utc).isoformat()
    f = None
    for i in range(1, len(segs) + 1):
        cand = "/".join(segs[:i])
        f = next((x for x in data["folders"] if x.get("name") == cand), None)
        if f is None:
            f = {"name": cand, "members": list(anc.get("members") or []),
                 "created_by": anc.get("created_by") or acct, "created_at": now}
            data["folders"].append(f)
    upload_dir = Path(UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / f"{uuid.uuid4().hex[:8]}-{name}"
    try:
        with dest.open("wb") as out:
            shutil.copyfileobj(file.file, out)
    except Exception as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"failed to save upload: {exc}")
    if dest.stat().st_size == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="uploaded file is empty")
    display_path = f"{SHARED_NS}/{folder}/{name}"
    params: dict[str, Any] = {"path": str(dest), "display_path": display_path}
    error = _validate("ingest", params)
    if error:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=error)
    task_id = _submit("ingest", params)
    _manifest_add(dest.name, display_path)
    _register_processing(task_id, display_path)
    return {"ok": True, "task_id": task_id, "display_path": display_path}


def _shared_folder_of(title: str, data: dict) -> dict | None:
    """文档 display_path 归属清单里"最长匹配"的文件夹条目。"""
    t = str(title or "").replace("\\", "/")
    best: dict | None = None
    for f in data.get("folders") or []:
        n = str(f.get("name") or "")
        if n and t.startswith(f"{SHARED_NS}/{n}/"):
            if best is None or len(n) > len(str(best.get("name") or "")):
                best = f
    return best


async def _shared_guard_doc(doc_id: str, acct: str) -> None:
    """只允许打开「自己有权限的文件夹」里的共享文件。

    /shared/tree 会按成员关系过滤文件夹，但 /shared/file 与 /shared/content 是
    拿 doc_id 直接取原文件/正文的 —— 不校验就能靠猜 doc_id 读到别人的共享文件。
    管理员不受限（要统管全部共享文件夹）。
    """
    if _shared_is_admin(acct):
        return
    hit = next((d for d in await _shared_local_docs() if str(d["doc_id"]) == str(doc_id)), None)
    if hit is None:
        raise HTTPException(status_code=404, detail="共享文件不存在")
    folder = _shared_folder_of(str(hit["title"]), _shared_manifest())
    if folder is None or not _shared_folder_visible(folder, acct):
        raise HTTPException(status_code=403, detail="没有该共享文件夹的权限")


@app.get("/shared/file")
async def shared_file(doc_id: str, download: int = 0, user: str | None = None):
    acct = _shared_account(user)
    if not _shared_is_local():
        return await _shared_forward("GET", "/shared/file",
                                     params={"doc_id": doc_id, "download": download, "user": acct},
                                     raw=True)
    await _shared_guard_doc(doc_id, acct)
    return await document_file(doc_id, download=download)


@app.get("/shared/content")
async def shared_content(doc_id: str, user: str | None = None):
    acct = _shared_account(user)
    if not _shared_is_local():
        return await _shared_forward("GET", "/shared/content",
                                     params={"doc_id": doc_id, "user": acct})
    await _shared_guard_doc(doc_id, acct)
    return await document_content(doc_id)


@app.put("/shared/files")
async def shared_file_rename(request: Request):
    """共享文件改名（清单级 display 改名，不动底层文档）。"""
    body = await request.json()
    if not _shared_is_local():
        return await _shared_forward("PUT", "/shared/files", json_body=_shared_body_for(body))
    folder = str(body.get("folder") or "").strip().strip("/")
    doc_id = str(body.get("doc_id") or "").strip()
    name = str(body.get("name") or "").strip()
    user = _shared_account(body.get("user"))
    if not folder or not doc_id or not name or "/" in name or "\\" in name or name in (".", ".."):
        raise HTTPException(status_code=400, detail="invalid rename payload")
    data = _shared_manifest()
    f = next((x for x in data["folders"] if x.get("name") == folder), None)
    if f is None:
        raise HTTPException(status_code=404, detail="共享文件夹不存在")
    if user != (f.get("created_by") or "") and not _shared_is_admin(user) and user not in (f.get("members") or []):
        raise HTTPException(status_code=403, detail="没有权限")
    docs = await _shared_local_docs()
    prefix = f"{SHARED_NS}/{folder}/"
    hit = next((d for d in docs if str(d["doc_id"]) == doc_id and str(d["title"]).startswith(prefix)), None)
    if hit is None:
        raise HTTPException(status_code=404, detail="共享文件不存在")
    f.setdefault("renames", {})[doc_id] = name
    _shared_manifest_save(data)
    return {"ok": True, "name": name}


@app.delete("/shared/files")
async def shared_file_trash(folder: str, doc_id: str, user: str | None = None):
    """删除共享文件 → 入回收箱（文档保留）。"""
    if not _shared_is_local():
        return await _shared_forward("DELETE", "/shared/files",
                                     params={"folder": folder, "doc_id": doc_id, "user": _shared_account(user)})
    folder = folder.strip().strip("/")
    acct = _shared_account(user)
    data = _shared_manifest()
    f = next((x for x in data["folders"] if x.get("name") == folder), None)
    if f is None:
        raise HTTPException(status_code=404, detail="共享文件夹不存在")
    if acct != (f.get("created_by") or "") and not _shared_is_admin(acct):
        raise HTTPException(status_code=403, detail="只有创建者或管理员可以删除")
    docs = await _shared_local_docs()
    prefix = f"{SHARED_NS}/{folder}/"
    hit = next((d for d in docs if str(d["doc_id"]) == doc_id and str(d["title"]).startswith(prefix)), None)
    if hit is None:
        raise HTTPException(status_code=404, detail="共享文件不存在")
    title = str(hit["title"]).replace("\\", "/")
    data.setdefault("trash", []).append({
        "id": uuid.uuid4().hex[:12],
        "kind": "file",
        "folder": folder,
        "name": title.split("/")[-1],
        "doc_ids": [str(hit["doc_id"])],
        "deleted_by": acct,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
    })
    _shared_manifest_save(data)
    return {"ok": True}


@app.get("/shared/trash")
async def shared_trash(user: str | None = None):
    """回收箱清单（仅管理员）。"""
    if not _shared_is_local():
        return await _shared_forward("GET", "/shared/trash", params={"user": _shared_account(user)})
    acct = _shared_account(user)
    admin = _shared_is_admin(acct)
    data = _shared_manifest()
    entries = sorted(data.get("trash") or [], key=lambda x: str(x.get("deleted_at") or ""), reverse=True)
    if not admin:
        entries = [e for e in entries if (e.get("deleted_by") or "") == acct]
    return {"trash": entries, "account": acct, "is_admin": admin}


@app.post("/shared/trash/restore")
async def shared_trash_restore(request: Request):
    """从回收箱还原（仅管理员）。"""
    body = await request.json()
    if not _shared_is_local():
        return await _shared_forward("POST", "/shared/trash/restore", json_body=_shared_body_for(body))
    acct = _shared_account(body.get("user"))
    admin = _shared_is_admin(acct)
    tid = str(body.get("id") or "").strip()
    data = _shared_manifest()
    trash = data.get("trash") or []
    entry = next((x for x in trash if str(x.get("id")) == tid), None)
    if entry is None:
        raise HTTPException(status_code=404, detail="回收箱记录不存在")
    if not admin and (entry.get("deleted_by") or "") != acct:
        raise HTTPException(status_code=403, detail="仅管理员或删除者本人可还原")
    if entry.get("kind") == "folder":
        name = str(entry.get("name") or "")
        if any(str(x.get("name") or "") == name for x in data["folders"]):
            raise HTTPException(status_code=409, detail="同名文件夹已存在，无法还原")
        data["folders"].append({
            "name": name,
            "members": entry.get("members") or [],
            "created_by": entry.get("created_by") or acct,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **({"alias": entry["alias"]} if entry.get("alias") else {}),
            **({"renames": entry["renames"]} if entry.get("renames") else {}),
        })
    data["trash"] = [x for x in trash if str(x.get("id")) != tid]
    _shared_manifest_save(data)
    return {"ok": True}


@app.delete("/shared/trash/{tid}")
async def shared_trash_purge(tid: str, user: str | None = None):
    """彻底删除回收箱记录（仅管理员）：真实删除底层文档。"""
    if not _shared_is_local():
        return await _shared_forward("DELETE", f"/shared/trash/{quote(tid, safe='')}", params={"user": _shared_account(user)})
    acct = _shared_account(user)
    admin = _shared_is_admin(acct)
    data = _shared_manifest()
    trash = data.get("trash") or []
    entry = next((x for x in trash if str(x.get("id")) == tid), None)
    if entry is None:
        raise HTTPException(status_code=404, detail="回收箱记录不存在")
    if not admin and (entry.get("deleted_by") or "") != acct:
        raise HTTPException(status_code=403, detail="仅管理员或删除者本人可彻底删除")
    removed = 0
    for did in entry.get("doc_ids") or []:
        if str(did).startswith("task-"):
            continue
        _submit("delete_document", {"doc_id": str(did)})
        removed += 1
    data["trash"] = [x for x in trash if str(x.get("id")) != tid]
    _shared_manifest_save(data)
    return {"ok": True, "removed_docs": removed}


@app.get("/shared/download")
async def shared_download(folder: str, user: str | None = None):
    """共享文件夹打包下载（zip，含子文件夹）。"""
    if not _shared_is_local():
        return await _shared_forward("GET", "/shared/download",
                                     params={"folder": folder, "user": _shared_account(user)}, raw=True)
    folder = folder.strip().strip("/")
    acct = _shared_account(user)
    data = _shared_manifest()
    f = next((x for x in data["folders"] if x.get("name") == folder), None)
    if f is None:
        raise HTTPException(status_code=404, detail="共享文件夹不存在")
    if not _shared_folder_visible(f, acct) and not _shared_is_admin(acct):
        raise HTTPException(status_code=403, detail="没有该共享文件夹的权限")
    prefix = f"{SHARED_NS}/{folder}/"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for d in await _shared_local_docs():
            title = str(d["title"]).replace("\\", "/")
            if not title.startswith(prefix) or str(d["doc_id"]).startswith("task-"):
                continue
            src = _original_file_of(title)
            if src and Path(src).is_file():
                zf.write(src, title[len(SHARED_NS) + 1:])
    buf.seek(0)
    zname = (folder.replace("/", "_") or "shared") + ".zip"
    return Response(content=buf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(zname)}"})


# ---------------------------------------------------------------------------
# 仅文件产物操作（右侧「对话产物」栏的「更多操作」，2026-09-14）
#   PUT    /artifacts            改名（manifest 层，扩展名由服务端保留）
#   DELETE /artifacts?doc_id=    删除（文件移入回收站，到期自动清理）
#   POST   /artifacts/promote    复制一份进个人知识库指定文件夹，并走正常解析入库
# ---------------------------------------------------------------------------


@app.put("/artifacts")
async def artifact_rename(body: dict[str, Any]):
    doc_id = str(body.get("doc_id") or "")
    name = str(body.get("name") or "").strip()
    hit = _artifact_by_doc_id(doc_id)
    if hit is None:
        raise HTTPException(status_code=404, detail="产物文件不存在")
    dest, display, _p = hit
    if not name or "/" in name or "\\" in name or name in (".", ".."):
        raise HTTPException(status_code=400, detail="非法的文件名")
    segs = display.split("/")
    old = segs[-1]
    ext = old.rsplit(".", 1)[1] if "." in old else ""
    if ext and name.lower().endswith("." + ext.lower()):
        new_last = name
    else:
        new_last = f"{name}.{ext}" if ext else name
    new_display = "/".join(segs[:-1] + [new_last])
    mapping = _manifest_load()
    mapping[dest] = new_display
    _manifest_save(mapping)
    _auto_log("产物重命名", f"{display} → {new_display}")
    return {"ok": True, "name": new_last, "display_path": new_display}


@app.delete("/artifacts")
async def artifact_delete(doc_id: str):
    hit = _artifact_by_doc_id(doc_id)
    if hit is None:
        raise HTTPException(status_code=404, detail="产物文件不存在")
    dest, display, p = hit
    tdir = TRASH_DIR / time.strftime("%Y%m%d-%H%M%S")
    try:
        tdir.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p), str(tdir / dest))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"删除失败: {exc}")
    mapping = _manifest_load()
    mapping.pop(dest, None)
    _manifest_save(mapping)
    _hashes_drop_display(display)
    _trash_gc()
    _auto_log("删除产物", f"{display}（已移入回收站，保留 {DUP_TRASH_RETENTION_DAYS} 天）")
    return {"ok": True, "retention_days": DUP_TRASH_RETENTION_DAYS}


@app.post("/artifacts/promote")
async def artifact_promote(body: dict[str, Any]):
    """把产物**复制**一份到个人知识库的指定文件夹并正常入库（解析 + 索引）。

    产物本身留在「对话产物」栏不动（复制语义，不移动、不删除）。"""
    doc_id = str(body.get("doc_id") or "")
    folder = str(body.get("folder") or "").strip().strip("/")
    hit = _artifact_by_doc_id(doc_id)
    if hit is None:
        raise HTTPException(status_code=404, detail="产物文件不存在")
    _dest, display, p = hit
    name = display.rsplit("/", 1)[-1]
    new_display = f"{folder}/{name}" if folder else name
    if _is_ns_prefix(new_display):
        raise HTTPException(status_code=400, detail="不能加入产物命名空间")
    new_dest = f"{uuid.uuid4().hex[:8]}-{name}"
    dst = Path(UPLOAD_DIR) / new_dest
    try:
        Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dst)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"复制失败: {exc}")
    params: dict[str, Any] = {"path": str(dst), "display_path": new_display}
    error = _validate("ingest", params)
    if error:
        dst.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=error)
    task_id = _submit("ingest", params)
    _manifest_add(new_dest, new_display)
    _register_processing(task_id, new_display)
    _auto_log("产物加入个人知识库", new_display)
    return {"ok": True, "task_id": task_id, "display_path": new_display}


@app.get("/index/stats")
async def index_stats():
    """Aggregate statistics for the KB panel's 索引 modal."""
    rag = await ensure_rag()
    from lightrag.base import DocStatus

    statuses = (DocStatus.PROCESSED, DocStatus.PROCESSING, DocStatus.PENDING, DocStatus.FAILED, DocStatus.PREPROCESSED)
    results = await asyncio.gather(*[rag.lightrag.get_docs_by_status(s) for s in statuses])
    status_counts = {s.value: len(mapping) for s, mapping in zip(statuses, results)}
    docs_total = sum(status_counts.values())
    last_updated: str | None = None
    for mapping in results:
        for doc in mapping.values():
            updated = getattr(doc, "updated_at", None)
            if updated and (last_updated is None or str(updated) > last_updated):
                last_updated = str(updated)
    working_dir = Path(CONFIG["working_dir"])
    return {
        "docs_total": docs_total,
        "status_counts": status_counts,
        "data_size": _dir_size(working_dir) if working_dir.is_dir() else 0,
        "last_updated": last_updated,
        "ingest_active": _ingest_active(),
        "rebuild": _rebuild_public(),
    }


def _index_files() -> list[dict[str, Any]]:
    """Every source file in the managed uploads dir, for per-file re-index.

    The upload manifest is authoritative for display paths, but files placed in
    uploads/ outside of ``POST /upload`` (plugin-side ingest, manual copy) never
    get a manifest entry — with the old manifest-only listing they silently
    vanished from /index/files and from a full rebuild. Merge both sources and
    flag unregistered / missing entries instead of dropping them.
    """
    manifest = _manifest_load()
    upload_dir = Path(UPLOAD_DIR)
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    if upload_dir.is_dir():
        for p in sorted(upload_dir.glob("*")):
            if not p.is_file() or p.name in seen:
                continue
            seen.add(p.name)
            st = p.stat()
            items.append({
                "name": p.name,
                "display": manifest.get(p.name) or _display_of(p.name),
                "size": st.st_size,
                "mtime": st.st_mtime,
                "registered": p.name in manifest,
                "missing": False,
            })
    # Manifest entries whose file disappeared: keep them visible so the panel
    # can report them instead of hiding the fact that a source is gone.
    for name, display in manifest.items():
        if name in seen:
            continue
        items.append({
            "name": name,
            "display": display,
            "size": 0,
            "mtime": 0.0,
            "registered": True,
            "missing": True,
        })
    items.sort(key=lambda i: i["mtime"], reverse=True)
    return items


@app.get("/index/files")
async def index_files():
    """List indexed/uploaded source files so each can be re-indexed individually."""
    items = _index_files()
    try:
        rag = await ensure_rag()
        from lightrag.base import DocStatus

        statuses = (DocStatus.PROCESSED, DocStatus.PROCESSING, DocStatus.PENDING,
                    DocStatus.FAILED, DocStatus.PREPROCESSED)
        results = await asyncio.gather(*[rag.lightrag.get_docs_by_status(s) for s in statuses])
        title_status: dict[str, str] = {}
        for status_, mapping in zip(statuses, results):
            for doc in mapping.values():
                fp = getattr(doc, "file_path", "") or ""
                if fp:
                    title_status.setdefault(fp, status_.value)
        for info in _state["processing_entries"].values():
            t = info.get("title", "") if isinstance(info, dict) else getattr(info, "title", "")
            if t:
                title_status.setdefault(t, "processing")
        for item in items:
            disp = item["display"]
            status = title_status.get(disp)
            if status is None:
                # doc.file_path often carries a folder prefix the uploads dir
                # does not have (e.g. "01-资料/x.pdf" vs "x.pdf"), which made
                # perfectly indexed files show up as "not_indexed" and invite a
                # pointless rebuild. Fall back to a basename match.
                base = Path(disp).name
                for fp, st in title_status.items():
                    if Path(fp).name == base:
                        status = st
                        break
            item["status"] = status or "not_indexed"
    except Exception:
        for item in items:
            item["status"] = "unknown"
    # A source file is only genuinely "failed" when NOTHING was indexed for it.
    # E_DUPLICATE leftovers (a rejected copy of an already-processed file) share
    # the file_path/basename and used to make healthy files display as 失败 even
    # after a successful re-index. Prefer any successful/busy status.
    _OK = ("processed", "processing", "pending", "preprocessed", "handling")
    groups: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        groups.setdefault(Path(item["display"]).name, []).append(item)
    for _base, group in groups.items():
        if len(group) < 2:
            continue
        if any(i["status"] in _OK for i in group):
            for i in group:
                if i["status"] == "failed":
                    i["status"] = "processed" if any(j["status"] == "processed" for j in group) else "processing"
                    i["note"] = "同源重复记录已忽略"
    return {"files": items}


@app.post("/index/reingest")
async def index_reingest(body: dict[str, Any]):
    """Re-index one uploaded source file (by manifest dest name or display path)."""
    if _rebuild_state["running"]:
        return JSONResponse(status_code=409, content={"started": False, "note": "rebuild already running"})
    wanted = str(body.get("name") or body.get("display") or "").strip()
    if not wanted:
        raise HTTPException(status_code=400, detail="name is required")
    upload_dir = Path(UPLOAD_DIR)
    target: tuple[Path, str] | None = None
    for item in _index_files():
        if item["name"] == wanted or item["display"] == wanted:
            target = (upload_dir / item["name"], item["display"])
            break
    if target is None:
        raise HTTPException(status_code=404, detail=f"no such uploaded file: {wanted}")
    asyncio.get_running_loop().create_task(_rebuild_worker([target]))
    return {"started": True, "total": 1, "display": target[1]}


@app.post("/index/rebuild")
async def start_index_rebuild():
    """Start a full index rebuild over all manifested uploads (one at a time)."""
    if _rebuild_state["running"]:
        return {"started": False, "note": "rebuild already running", "state": _rebuild_public()}
    # Cover every file physically present in uploads/ (manifest-registered or
    # not) — see _index_files for why the manifest alone is not enough.
    files = [
        (Path(UPLOAD_DIR) / item["name"], item["display"])
        for item in _index_files()
        if not item.get("missing")
    ]
    if not files:
        raise HTTPException(status_code=400, detail="no uploaded files to rebuild")
    asyncio.get_running_loop().create_task(_rebuild_worker(files))
    return {"started": True, "total": len(files)}


@app.get("/failures")
async def list_failures():
    """Failure ledger: every classified ingest failure with its lifecycle."""
    store = _failures_load()
    store = await _failures_reconcile(store)
    meta = store.get("_meta") if isinstance(store.get("_meta"), dict) else {}
    entries = [v for k, v in store.items() if k != "_meta" and isinstance(v, dict)]
    entries.sort(key=lambda e: str(e.get("last_attempt") or ""), reverse=True)
    used = int(meta.get("used") or 0) if meta.get("date") == datetime.now(timezone.utc).strftime("%Y-%m-%d") else 0
    return {
        "failures": entries,
        "total": len(entries),
        "meta": {
            "retries_used_today": used,
            "daily_budget": RETRY_CFG["daily_budget"],
            "circuit_open": _circuit_open(),
        },
    }


@app.get("/failures/summary")
async def failures_summary():
    """Aggregated failure counters (panel badge / monitoring)."""
    store = _failures_load()
    store = await _failures_reconcile(store)
    by_code: dict[str, int] = {}
    by_lifecycle: dict[str, int] = {}
    cutoff = time.time() - 86400
    last_24h = 0
    for k, v in store.items():
        if k == "_meta" or not isinstance(v, dict):
            continue
        code = str(v.get("error_code") or "E_UNKNOWN")
        by_code[code] = by_code.get(code, 0) + 1
        life = str(v.get("lifecycle") or "failed")
        by_lifecycle[life] = by_lifecycle.get(life, 0) + 1
        la = _parse_iso(v.get("last_attempt"))
        if la is not None and la.timestamp() >= cutoff:
            last_24h += 1
    return {
        "by_error_code": by_code,
        "by_lifecycle": by_lifecycle,
        "failures_24h": last_24h,
        "circuit_open": _circuit_open(),
    }


@app.post("/failures/retry")
async def retry_failure(body: dict[str, Any]):
    """Manual retry of one ledger entry (dispatches immediately, subject to
    the daily budget and the upstream-failure circuit breaker)."""
    fid = str(body.get("id") or "").strip()
    if not fid:
        raise HTTPException(status_code=400, detail="id is required")
    with _failures_lock:
        store = _failures_load()
        entry = store.get(fid)
        if not isinstance(entry, dict):
            raise HTTPException(status_code=404, detail=f"no such failure entry: {fid}")
        entry["lifecycle"] = "retrying"
        entry["next_retry_at"] = _now_iso()
        store[fid] = entry
        _failures_save(store)
    started = await _retry_entry(fid)
    return {"started": started, "id": fid}


@app.post("/failures/dismiss")
async def dismiss_failure(body: dict[str, Any]):
    """Human decision: mark the entry as permanently given up (stops every
    future automatic retry; the original file stays downloadable)."""
    fid = str(body.get("id") or "").strip()
    if not fid:
        raise HTTPException(status_code=400, detail="id is required")
    with _failures_lock:
        store = _failures_load()
        entry = store.get(fid)
        if not isinstance(entry, dict):
            raise HTTPException(status_code=404, detail=f"no such failure entry: {fid}")
        entry["lifecycle"] = "dismissed"
        entry["next_retry_at"] = None
        store[fid] = entry
        _failures_save(store)
    _auto_log("人工放弃", f"{entry.get('display_path')} · {entry.get('error_code')}")
    return {"dismissed": True, "id": fid}


@app.exception_handler(Exception)
async def unhandled(_request, exc):
    return JSONResponse(status_code=500, content={"error": f"{type(exc).__name__}: {exc}"})


if __name__ == "__main__":
    import uvicorn

    # 自重启（POST /models/restart）注入的等待：等旧进程释放监听端口。
    _restart_delay = float(os.environ.get("RAG_RESTART_DELAY_S") or 0.0)
    if _restart_delay > 0:
        print(f"[sidecar] self-restart: waiting {_restart_delay}s for port {PORT} to be released")
        time.sleep(_restart_delay)

    uvicorn.run(app, host=HOST, port=PORT, log_level="info", access_log=False)
