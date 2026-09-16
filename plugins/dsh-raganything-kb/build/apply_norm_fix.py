#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Port the `normaliseModelsSnap` panel-crash guard onto a client.js that lacks it.

Why
---
On the 100.100.6.55 branch this guard was added after the knowledge-base panel
kept dying as a whole: DSH's slot boundary catches the exception and unmounts the
entire KB UI (`slot entry crashed in 'sidebar.footer.action'`). The trigger was an
unprotected dereference of `modelsSnap.selections.index_llm.model` when the
sidecar's `/models` snapshot did not carry that key.

The 192.168.8.6 branch was forked before that fix and never received it. The guard
is a pure defensive addition — it only fills in missing fields, it never changes
a value that is present — so it is safe to port onto either fork.

Usage
-----
  apply_norm_fix.py <path/to/lib/client.js> [--check]

  --check   verify the anchors and the result without writing the file
Exit codes: 0 ok / already patched, 1 anchor problem.
"""
import sys

# Exactly the block that lives on the 100.100.6.55 branch (byte-for-byte).
# NOTE: the body is indented with tabs + 4 spaces, matching the original.
BLOCK = (
    "\t\t\t/** 归一化 sidecar 快照：字段缺失时绝不能让整块面板崩掉。DSH 的 slot 边界\n"
    "\t\t\t *  捕获到异常会卸载整个知识库 UI（旧版 sidecar 缺 selections.index_llm 时，\n"
    "\t\t\t *  点「AI 模型」即整块闪退）。缺字段一律补成空对象/空串，保证渲染安全。 */\n"
    "\t\t\tconst normaliseModelsSnap = (raw) => {\n"
    "\t\t\t    if (!raw || typeof raw !== \"object\") return raw;\n"
    "\t\t\t    const sel = raw.selections && typeof raw.selections === \"object\"\n"
    "\t\t\t        ? raw.selections : (raw.selections = {});\n"
    "\t\t\t    for (const k of [\"llm\", \"index_llm\", \"vision\", \"embedding\", \"rerank\", \"asr\", \"parser\"]) {\n"
    "\t\t\t        if (!sel[k] || typeof sel[k] !== \"object\") sel[k] = {};\n"
    "\t\t\t    }\n"
    "\t\t\t    if (!sel.index_llm.model && sel.llm.model) sel.index_llm.model = sel.llm.model;\n"
    "\t\t\t    for (const k of [\"device\", \"runtime\", \"catalog\", \"downloads\", \"custom_models\"]) {\n"
    "\t\t\t        if (!raw[k] || typeof raw[k] !== \"object\") raw[k] = {};\n"
    "\t\t\t    }\n"
    "\t\t\t    return raw;\n"
    "\t\t\t};\n"
)

ANCHOR = "\t\t\t/** Load the AI 模型 panel snapshot from the sidecar. */"
CALL_OLD = "if (snap !== null) setModelsSnap(snap);"
CALL_NEW = "if (snap !== null) setModelsSnap(normaliseModelsSnap(snap));"
MARK = "normaliseModelsSnap"


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    path = sys.argv[1]
    check_only = "--check" in sys.argv

    with open(path, "rb") as f:
        raw = f.read()
    if b"\r\n" in raw:
        print("FAIL: %s contains CRLF — refusing to patch (would rewrite line endings)" % path)
        return 1
    text = raw.decode("utf-8")

    if MARK in text:
        print("ALREADY_PATCHED %s" % path)
        return 0

    if text.count(ANCHOR) != 1:
        print("FAIL: anchor count = %d (expected 1)" % text.count(ANCHOR))
        return 1
    if text.count(CALL_OLD) != 1:
        print("FAIL: call anchor count = %d (expected 1)" % text.count(CALL_OLD))
        return 1

    new = text.replace(ANCHOR, BLOCK + ANCHOR, 1).replace(CALL_OLD, CALL_NEW, 1)
    if new.count(MARK) != 2:
        print("FAIL: post-patch marker count = %d (expected 2)" % new.count(MARK))
        return 1
    if len(new) != len(text) + len(BLOCK) + (len(CALL_NEW) - len(CALL_OLD)):
        print("FAIL: unexpected size delta")
        return 1

    if check_only:
        print("CHECK_OK %s (+%d bytes)" % (path, len(new) - len(text)))
        return 0

    with open(path, "wb") as f:
        f.write(new.encode("utf-8"))
    print("PATCHED %s (+%d bytes)" % (path, len(new) - len(text)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
