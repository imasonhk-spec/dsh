"""Request-scoped DSH generation. Never modifies RAG configuration or shared LLMs.

The bridge URL/token are trusted process environment, not request parameters.
Providers resolve credentials entirely within the DSH Host adapter.
"""
from contextvars import ContextVar
from copy import deepcopy
import json
import os
from urllib.parse import urlsplit

_SELECTION = ContextVar("rag_generation_selection", default=None)

# P2-20261007：宿主桥接是否支持结构化多轮。由 /validate 的 historySupport 声明，
# 未声明即视为不支持 —— 老宿主上自动降级为"折进 prompt 文本"，绝不报错。
_HISTORY_SUPPORTED = False


# P2-20260707：桥接侧结构化多轮默认**启用**，但带自动降级。
# 宿主桥接声明 historySupport 只是「接口存在」；索引里 index.js 的 assistant 消息
# 形状（DSH 要求 source/id）只有在宿主重新 import 后才生效。无法保证宿主何时重载，
# 因此运行期自己判定：默认尝试下发，首次在产出内容前失败就永久降级为文本折叠。
# KB_BRIDGE_HISTORY=0/false/no/off 可显式关掉，完全不尝试。
_SEND_BRIDGE_HISTORY = (os.environ.get("KB_BRIDGE_HISTORY") or "1").strip().lower() not in (
    "0", "false", "no", "off")
# 本进程内探测到的结论：True=桥接拒绝结构化 history（已降级），None/False=仍可尝试。
_HISTORY_BROKEN: bool | None = False


def history_supported() -> bool:
    """桥接侧结构化多轮当前是否可用（能力位 × 开关 × 未被判定失效）。"""
    return (_HISTORY_SUPPORTED is True and _SEND_BRIDGE_HISTORY
            and not _HISTORY_BROKEN)


def history_state() -> str:
    """本进程多轮形态：native=结构化消息；folded=折进 prompt 文本；
    folded-fallback=尝试结构化失败后自动降级。"""
    if _HISTORY_BROKEN:
        return "folded-fallback"
    return "native" if history_supported() else "folded"


def _fold_history_text(history) -> str:
    """把 history 折成 prompt 文本前缀（降级路径，语义与 native 等价）。"""
    lines = []
    for h in history or []:
        if not isinstance(h, dict):
            continue
        text = str(h.get("text") or h.get("content") or "").strip()
        if not text:
            continue
        lines.append(("用户：" if str(h.get("role")) != "assistant" else "助手：") + text[:600])
    if not lines:
        return ""
    return "【对话上文（仅供理解指代，不得当作资料引用）】\n" + "\n".join(lines) + "\n\n"


def normalize_selection(value):
    if value is None:
        return None
    if not isinstance(value, dict) or set(value) != {"provider", "model"}:
        raise ValueError("modelSelection accepts only provider and model catalogue identifiers")
    if any(not isinstance(value[k], str) or not value[k].strip()
           or len(value[k]) > 256 for k in ("provider", "model")):
        raise ValueError("Invalid modelSelection identifiers")
    return deepcopy(value)


def current_selection():
    value = _SELECTION.get()
    return dict(value) if value else None


def bind_selection(value):
    return _SELECTION.set(normalize_selection(value))


def reset_selection(token):
    _SELECTION.reset(token)


def bridge_config():
    url = os.environ.get("RAG_DSH_GENERATION_URL", "")
    token = os.environ.get("RAG_DSH_GENERATION_TOKEN", "")
    parsed = urlsplit(url)
    if (parsed.scheme != "http" or parsed.hostname != "127.0.0.1"
            or not parsed.port or parsed.path not in ("", "/")
            or parsed.username or parsed.password or parsed.query or parsed.fragment or not token):
        raise RuntimeError("Request-level DSH model service unavailable; Host/sidecar lifecycle update required")
    return url.rstrip("/"), {"Authorization": "Bearer " + token}


async def validate_selection(value):
    import httpx
    selection = normalize_selection(value)
    if selection is None:
        return None
    url, headers = bridge_config()
    async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
        response = await client.post(url + "/validate", headers=headers,
                                     json={"modelSelection": selection})
        if response.status_code != 200:
            raise ValueError("Unknown, unavailable or rejected DSH catalogue model")
        payload = response.json()
        if payload.get("generationModel") != selection:
            raise RuntimeError("DSH model validation identity mismatch")
        global _HISTORY_SUPPORTED
        _HISTORY_SUPPORTED = payload.get("historySupport") is True
    return selection


def _clean_history(history):
    """把上游 history 规范化成桥接契约的 [{role,text}]，非法项丢弃。"""
    rows = []
    for h in history or []:
        if not isinstance(h, dict):
            continue
        text = str(h.get("text") or h.get("content") or "").strip()
        if not text:
            continue
        rows.append({"role": "assistant" if str(h.get("role")) == "assistant" else "user",
                     "text": text})
    return rows


async def _stream_once(url, headers, selection, prompt, system_prompt, hist):
    """单次桥接生成。hist=None 表示不带结构化多轮。"""
    import httpx
    payload = {"modelSelection": selection, "prompt": prompt}
    if system_prompt is not None:
        payload["system"] = system_prompt
    if hist:
        payload["history"] = hist
    finished = False
    async with httpx.AsyncClient(timeout=httpx.Timeout(900.0, connect=10.0), trust_env=False) as client:
        async with client.stream("POST", url + "/generate", headers=headers, json=payload) as response:
            if response.status_code != 200:
                raise RuntimeError("DSH model generation request rejected")
            async for line in response.aiter_lines():
                if not line:
                    continue
                row = json.loads(line)
                if row.get("error"):
                    raise RuntimeError("DSH model generation failed or cancelled")
                if row.get("done"):
                    finished = True
                    break
                if row.get("kind") in ("answer", "thinking") and isinstance(row.get("text"), str):
                    yield row["kind"], row["text"]
    if not finished:
        raise RuntimeError("DSH model stream interrupted before completion")


async def stream_selection(selection, prompt, system_prompt=None, history=None):
    """流式生成。带多轮时优先下发结构化 history；若桥接在产出任何内容前就拒绝，
    自动降级为「折进 prompt 文本」重试一次，用户侧无感（P2 自愈路径）。"""
    selection = normalize_selection(selection)
    if selection is None:
        raise ValueError("An explicit selection is required")
    url, headers = bridge_config()
    hist = _clean_history(history)

    if hist and history_supported():
        yielded = False
        try:
            async for kind, text in _stream_once(url, headers, selection, prompt,
                                                 system_prompt, hist):
                yielded = True
                yield kind, text
            return
        except RuntimeError:
            if yielded:
                # 已经吐过内容，重试会导致重复输出 —— 如实上抛。
                raise
            global _HISTORY_BROKEN
            _HISTORY_BROKEN = True
            prompt = _fold_history_text(hist) + prompt
    elif hist:
        prompt = _fold_history_text(hist) + prompt

    async for kind, text in _stream_once(url, headers, selection, prompt,
                                         system_prompt, None):
        yield kind, text


def model_function(selection):
    """Freeze the route in a closure, including LightRAG keyword calls.

    This function is passed on QueryParam.model_func, never assigned to the
    shared LightRAG object. LightRAG can run workers whose ContextVars differ.
    """
    frozen = normalize_selection(selection)

    async def complete(prompt, system_prompt=None, history_messages=None, **kwargs):
        # P2-20260707：不再拒绝 history —— LightRAG 的 bypass 模式会把
        # conversation_history 作为 history_messages 传进来；转成结构化对话下发。
        history = None
        if history_messages:
            history = [{"role": "assistant" if str(m.get("role")) == "assistant" else "user",
                        "content": str(m.get("content") or "")}
                       for m in history_messages if isinstance(m, dict)
                       and str(m.get("content") or "").strip()] or None

        async def tokens():
            thinking = False
            async for kind, text in stream_selection(frozen, prompt, system_prompt,
                                                     history=history):
                if kind == "thinking":
                    if not thinking:
                        yield "<think>"
                        thinking = True
                    yield text
                else:
                    if thinking:
                        yield "</think>"
                        thinking = False
                    yield text
            if thinking:
                yield "</think>"

        if kwargs.get("stream"):
            return tokens()
        # Keyword extraction must receive only content, not private reasoning.
        answer = []
        async for kind, text in stream_selection(frozen, prompt, system_prompt,
                                                 history=history):
            if kind == "answer":
                answer.append(text)
        if not "".join(answer).strip():
            raise RuntimeError("DSH model returned no answer content")
        return "".join(answer)

    return complete


def sources_from_hits(hits, document_ids=None):
    """Only retrieved paths/IDs/snippets; no model-generated citation parsing.

    Missing IDs remain null, never invented. Location is intentionally omitted:
    the current LightRAG chunk contract does not certify pages or sections.
    """
    ids = document_ids or {}
    seen = set()
    result = []
    for hit in hits:
        if not isinstance(hit, dict):
            continue
        path = str(hit.get("file_path") or "").replace("\\", "/")
        if not path or path == "unknown_source" or path in seen:
            continue
        seen.add(path)
        doc_id = hit.get("full_doc_id") or hit.get("doc_id") or ids.get(path)
        source = {"doc_id": str(doc_id) if doc_id else None, "file_path": path,
                  "title": path.rsplit("/", 1)[-1], "shared": path.startswith("共享/")}
        if isinstance(hit.get("content"), str) and hit["content"]:
            source["excerpt"] = hit["content"][:1000]
        result.append(source)
        if len(result) == 10:
            break
    return result
