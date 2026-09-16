#!/usr/bin/env python3
"""Make the knowledge-base panel reachable from an HTTPS DSH page.

The bundled browser bundle talks to the sidecar through `${location.origin}/rag`
whenever the page is served over HTTPS (otherwise the browser blocks the mixed
`http://host:17321` request). That requires an nginx location that proxies
`/rag/` to the sidecar. This script finds every server block that already
proxies the DSH web port over TLS and adds the include if it is missing.

Idempotent: a block that already routes /rag/ is left alone.
"""
from __future__ import annotations

import argparse
import re
import shutil
import sys
import time
from pathlib import Path

SCAN = [Path("/etc/nginx/sites-enabled"), Path("/etc/nginx/conf.d")]


def server_blocks(text: str) -> list[tuple[int, int]]:
    """Return (content_start, close_index) for every top-level `server { }`."""
    out: list[tuple[int, int]] = []
    depth = 0
    start = -1
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                head = text[max(0, i - 40):i]
                if re.search(r"(^|[\s;}])server\s*$", head):
                    start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                out.append((start, i))
                start = -1
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dsh-port", default="3080")
    ap.add_argument("--snippet", required=True)
    ap.add_argument("--stamp", default=time.strftime("%Y%m%d-%H%M%S"))
    ap.add_argument("--scan", action="append", default=None,
                    help="override the scanned directories (repeatable; for testing)")
    a = ap.parse_args()
    scan = [Path(p) for p in a.scan] if a.scan else SCAN

    needle = f"proxy_pass http://127.0.0.1:{a.dsh_port}"
    snippet = Path(a.snippet)
    if not snippet.exists():
        print("unchanged: snippet missing")
        return 0
    include_line = f"    include {snippet};\n"

    def is_backup(p: Path) -> bool:
        """Never treat our own backups (or any *.bak / *~ / *.disabled) as a
        live config — otherwise a second run injects the include into the
        backup copy and the real site silently stays unpatched."""
        n = p.name
        return (".bak" in n or n.endswith("~")
                or n.endswith(".disabled") or n.endswith(".orig")
                or n.endswith(".save"))

    files: list[Path] = []
    for root in scan:
        if root.is_dir():
            files += sorted(p for p in root.iterdir()
                            if p.is_file() and not is_backup(p))

    patched: list[str] = []
    for path in files:
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if needle not in text:
            continue
        if str(snippet) in text:
            continue

        new_text = text
        hits = 0
        for content_start, _close in reversed(server_blocks(text)):
            block = text[content_start:_close]
            if needle not in block or "ssl" not in block:
                continue
            if re.search(r"location\s+[\^~=]*\s*/rag", block) or "rag-proxy" in block:
                continue
            # insert on the line after the opening brace
            eol = new_text.find("\n", content_start)
            if eol < 0:
                continue
            new_text = new_text[:eol + 1] + include_line + new_text[eol + 1:]
            hits += 1
        if hits:
            shutil.copy2(path, f"{path}.bak-portable-{a.stamp}")
            path.write_text(new_text, encoding="utf-8")
            patched.append(f"{path} ({hits} block(s))")

    if patched:
        print("injected: " + ", ".join(patched))
    else:
        print("unchanged: no TLS DSH server block needs a /rag/ route")
    return 0


if __name__ == "__main__":
    sys.exit(main())
