#!/usr/bin/env python3
"""Platform-adapt the RAG sidecar config for this machine.

Creates `config.json` from the packaged template on a fresh install, and on an
existing install only touches fields that are (a) missing, (b) filesystem paths
outside the current knowledge-base home, or (c) device choices that cannot work
on this host. Everything else — models, endpoints, tuning — is preserved, and
the previous file is backed up first.

This is what makes the packaged plugin usable with zero manual configuration
across aarch64/x86_64 and CUDA/ROCm/CPU hosts.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

HOME = Path.home()


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--template", required=True)
    ap.add_argument("--rag-home", required=True)
    ap.add_argument("--port", type=int, default=17321)
    ap.add_argument("--device", default="cpu", choices=["cuda", "rocm", "cpu"])
    ap.add_argument("--dry-run", action="store_true")
    return ap.parse_args()


def substitute(node, token: str, value: str):
    """Recursively replace `token` inside every string value."""
    if isinstance(node, dict):
        return {k: substitute(v, token, value) for k, v in node.items()}
    if isinstance(node, list):
        return [substitute(v, token, value) for v in node]
    if isinstance(node, str):
        return node.replace(token, value)
    return node


def load_template(path: Path, rag_home: Path) -> dict:
    """Render the packaged template. The `__RAG_HOME__` token is substituted
    after JSON parsing so a Windows-style path can never break the escaping."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return substitute(data, "__RAG_HOME__", str(rag_home))


def model_present(cfg: dict, rag_home: Path) -> tuple[bool, str]:
    """Where the reranker actually lives on this host, if anywhere."""
    candidates = []
    if isinstance(cfg.get("model_path"), str) and cfg["model_path"]:
        candidates.append(Path(cfg["model_path"]))
    candidates += [
        rag_home / "models" / "bge-reranker-base",
        HOME / ".cache/modelscope/models/BAAI--bge-reranker-base/snapshots/master",
        HOME / ".cache/huggingface/hub/models--BAAI--bge-reranker-base",
    ]
    for c in candidates:
        try:
            if c.is_dir() and any(c.iterdir()):
                return True, str(c)
        except OSError:
            continue
    return False, ""


def main() -> int:
    a = parse_args()
    rag_home = Path(a.rag_home).expanduser()
    config_path = Path(a.config)
    changed: list[str] = []

    if config_path.exists():
        try:
            cfg = json.loads(config_path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! existing config is not valid JSON ({exc}) — regenerating from template")
            cfg = {}
        if not isinstance(cfg, dict):
            cfg = {}
        fresh = False
    else:
        cfg = {}
        fresh = True

    if fresh or not cfg:
        cfg = load_template(Path(a.template), rag_home)
        changed.append("generated from packaged template")

    # ---------------------------------------------------------------- paths --
    for key, value in (("working_dir", rag_home / "storage"),
                       ("output_dir", rag_home / "output"),
                       ("models_dir", rag_home / "models")):
        old = cfg.get(key)
        new = str(value)
        if old != new:
            cfg[key] = new
            changed.append(f"{key}: {old!r} -> {new!r}")

    # --------------------------------------------------------------- socket --
    if cfg.get("host") != "0.0.0.0":
        cfg["host"] = "0.0.0.0"
        changed.append("host -> 0.0.0.0 (panel runs in the browser)")
    if int(cfg.get("port", a.port)) != a.port:
        cfg["port"] = a.port
        changed.append(f"port -> {a.port}")
    cfg.setdefault("parser", "mineru")
    cfg.setdefault("parse_method", "auto")
    cfg.setdefault("max_concurrent_tasks", 2)

    # The packaged default parser backend is the deterministic `pipeline`.
    # `vlm-engine` needs a large VLM and is 10-100x slower per page; it is only
    # ever used when the operator opts in explicitly.
    if not cfg.get("parser_backend"):
        cfg["parser_backend"] = "pipeline"
        changed.append("parser_backend -> pipeline (default; avoids the slow VLM path)")
    elif cfg["parser_backend"] != "pipeline" and a.device == "cpu":
        print(f"  ! parser_backend={cfg['parser_backend']} kept, but no GPU is present — "
              f"expect very slow PDF parsing (set \"pipeline\" to speed up)")
    cfg.setdefault("parser_timeout_s", 900)

    # ------------------------------------------------------------ embedding --
    emb = cfg.get("embedding")
    if not isinstance(emb, dict) or not emb.get("backend"):
        emb = {}
        emb["backend"] = "gguf"
        changed.append("embedding.backend -> gguf (fully local, no online service)")
    if emb.get("backend") == "gguf":
        want_path = str(rag_home / "models" / "bge-m3-f16" / "bge-m3-FP16.gguf")
        if emb.get("model_path") != want_path and not Path(str(emb.get("model_path") or "")).exists():
            changed.append(f"embedding.model_path -> {want_path}")
            emb["model_path"] = want_path
        emb.setdefault("model", "bge-m3-f16.gguf")
        emb.setdefault("dims", 1024)
        emb.setdefault("max_token_size", 8192)
    else:
        print(f"  · embedding backend={emb.get('backend')} (remote) — left untouched")
    cfg["embedding"] = emb

    # --------------------------------------------------------------- rerank --
    rerank = cfg.get("rerank") if isinstance(cfg.get("rerank"), dict) else {}
    present, where = model_present(rerank, rag_home)
    if present:
        if rerank.get("model_path") != where:
            rerank["model_path"] = where
            changed.append(f"rerank.model_path -> {where}")
        want_dev = "cuda" if a.device == "cuda" else "cpu"
        if rerank.get("device") != want_dev:
            rerank["device"] = want_dev
            changed.append(f"rerank.device -> {want_dev}")
        if not rerank.get("enabled", True):
            rerank["enabled"] = True
            changed.append("rerank.enabled -> true (model available)")
        rerank.setdefault("backend", "transformers")
        rerank.setdefault("model", "bge-reranker-base")
        rerank.setdefault("max_length", 512)
    else:
        if rerank.get("enabled"):
            rerank["enabled"] = False
            changed.append("rerank.enabled -> false (no reranker model on this host; "
                           "install it from the AI 模型 panel to turn it on)")
    cfg["rerank"] = rerank

    # ------------------------------------------------------------------ asr --
    asr = cfg.get("asr") if isinstance(cfg.get("asr"), dict) else {}
    if asr:
        want_dev = "cuda" if a.device == "cuda" else "cpu"
        if asr.get("device") != want_dev:
            asr["device"] = want_dev
            changed.append(f"asr.device -> {want_dev}")
        cfg["asr"] = asr

    # -------------------------------------------------------------- lightrag --
    lr = cfg.get("lightrag") if isinstance(cfg.get("lightrag"), dict) else {}
    for key, value in (("max_parallel_insert", 4), ("chunk_token_size", 2000),
                       ("chunk_overlap_token_size", 200), ("embedding_batch_num", 16),
                       ("entity_extract_max_gleaning", 1), ("default_llm_timeout", 900),
                       ("default_embedding_timeout", 300)):
        if key not in lr:
            lr[key] = value
            changed.append(f"lightrag.{key} -> {value} (default)")
    cfg["lightrag"] = lr

    # Entity extraction runs on the *indexing* LLM. A stale or unknown model
    # name here is a silent ingest failure (the endpoint 404s and the document
    # lands in the failure ledger), so a template-generated config inherits the
    # configured chat model. An existing config keeps whatever the operator chose.
    if fresh and isinstance(cfg.get("llm"), dict) and cfg["llm"].get("model"):
        want = cfg["llm"]["model"]
        if lr.get("index_llm_model") != want:
            changed.append(f"lightrag.index_llm_model -> {want} (inherits llm.model)")
            lr["index_llm_model"] = want
            cfg["lightrag"] = lr

    # llm / vision must exist (the packaged template supplies the defaults).
    for key in ("llm", "vision"):
        if not isinstance(cfg.get(key), dict) or not cfg[key].get("base_url"):
            cfg[key] = load_template(Path(a.template), rag_home).get(key, {})
            changed.append(f"{key} -> template default (was missing)")

    # ----------------------------------------------------------------- write --
    if a.dry_run:
        print("  (dry-run) changes: " + ("; ".join(changed) if changed else "none"))
        return 0

    if changed or not config_path.exists():
        if config_path.exists():
            shutil.copy2(config_path, f"{config_path}.bak-portable-{time.strftime('%Y%m%d-%H%M%S')}")
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"  ✔ {config_path} written ({'fresh install' if fresh else str(len(changed)) + ' adaptation(s)'})")
        for c in changed:
            print(f"      · {c}")
    else:
        print(f"  ✔ {config_path} already correct for this host — untouched")

    # a quick, honest summary of what this host will actually do
    print(f"  · device={a.device}  parser={cfg.get('parser')}/{cfg.get('parser_backend')}  "
          f"embedding={emb.get('backend')}:{emb.get('model')}  rerank={'on' if rerank.get('enabled') else 'off'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
