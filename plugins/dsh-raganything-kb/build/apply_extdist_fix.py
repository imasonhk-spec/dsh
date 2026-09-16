#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply the KB 「索引」 modal count fix onto a client.js that carries the artifact rail.

Problem this fixes
------------------
The knowledge-base panel renders the document count in TWO places with two
different formulas:

  * sidebar status bar  -> `RAG-Anything · 已连接 · ${kbDocs.length} 篇文档`
                            (kbDocs = the docs actually rendered in the KB folder
                             tree; artifact/mirror prefixes already excluded)
  * 「索引」 modal header -> `extDist.reduce((a, s) => a + s.n, 0)` computed by
                            walking `docs` — ALL documents, including the read-only
                            `DSH产物/` workspace mirror and the `知识库产物/`
                            conversation-artifact docs that are NOT in the tree.

So the status bar says 9 while the index modal says 455 for the same corpus.
-> make `extDist` walk `kbDocs` so both places agree.

Usage
-----
  apply_extdist_fix.py <path/to/lib/client.js> [--check]

  --check   verify the anchors and the result without writing the file
Exit codes: 0 ok / already patched, 1 anchor problem.
"""
import sys

MARKER = "const extDist = (0, react.useMemo)"
END_ANCHOR = "}, [docs]);"
NEW_END = "}, [kbDocs]);"
OLD_LOOP = "for (const d of docs) {"
NEW_LOOP = "for (const d of kbDocs) {"

OLD_COMMENT = "/** File-type distribution across all ingested docs (索引 modal bar). */"
NEW_COMMENT = ("/** File-type distribution across KB docs (索引 modal bar). Mirrors (DSH产物/) and "
               "artifacts (知识库产物/) are excluded so this count matches the sidebar status and the KB tree. */")


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

    # locate the extDist memo
    i = text.find(MARKER)
    if i < 0:
        print("FAIL: extDist marker not found in %s" % path)
        return 1

    # the block ends at whichever dependency-array anchor comes first
    j_old = text.find(END_ANCHOR, i)          # }, [docs]);   (unpatched)
    j_new = text.find(NEW_END, i)             # }, [kbDocs]); (patched)
    if j_new >= 0 and (j_old < 0 or j_new < j_old):
        # already patched — confirm the old shape is really gone
        if j_old >= 0 and j_old < j_new:
            print("FAIL: inconsistent state — both dependency anchors present in %s" % path)
            return 1
        if OLD_LOOP in text[i:j_new]:
            print("FAIL: inconsistent state — old docs loop still present in %s" % path)
            return 1
        print("ALREADY_PATCHED %s" % path)
        return 0
    if j_old < 0:
        print("FAIL: extDist end anchor not found in %s" % path)
        return 1

    end = j_old + len(END_ANCHOR)
    body = text[i:end]
    n = body.count(OLD_LOOP)
    if n != 1:
        print("FAIL: loop anchor count = %d (expected 1) in %s" % (n, path))
        return 1

    new = body.replace(OLD_LOOP, NEW_LOOP, 1)
    new = new.replace(END_ANCHOR, NEW_END, 1)
    out = text[:i] + new + text[end:]
    if OLD_COMMENT in out:
        out = out.replace(OLD_COMMENT, NEW_COMMENT)

    # consistency
    if NEW_LOOP not in out or NEW_END not in out:
        print("FAIL: consistency check after patch")
        return 1

    if check_only:
        print("CHECK_OK %s" % path)
        return 0

    with open(path, "wb") as f:
        f.write(out.encode("utf-8"))
    print("PATCHED %s" % path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
