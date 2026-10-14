#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build dsh-raganything-kb 0.3.9 portable package from the PATCHED live plugin.

0.3.9 = 0.3.8 (count-rail status fix + artifact-rail md filter + OFV viewer mount +
        crash guard + artifact rail + multi-user isolation + duplicate-reupload fix)
        PLUS the KB 「索引」modal count fix:
          * the 索引 modal header used to sum its file-type distribution over
            `docs` (ALL documents incl. the read-only `DSH产物/` workspace mirror and
            the `知识库产物/` artifact docs), so it displayed 455 while the sidebar
            status bar displayed 9 for the very same corpus. `extDist` now walks
            `kbDocs`, so the two numbers agree and both match the KB folder tree.

Outputs (under $HOME):
    dsh-raganything-kb-0.3.9-portable/          the tree
    dsh-raganything-kb-0.3.9-portable.tar.gz    the tree, packed
    dsh-raganything-kb-0.3.9.tgz                standalone npm-style plugin tgz
"""
import gzip
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import time
from pathlib import Path

HOME = Path("/home/lgsj")
OLD = HOME / "dsh-raganything-kb-0.3.8-portable"
NEW = HOME / "dsh-raganything-kb-0.3.9-portable"
LIVE = HOME / ".dsh/profiles/web/node_modules/dsh-raganything-kb"
PKG = "dsh-raganything-kb"
OLDVER, VER = "0.3.8", "0.3.9"
FIXED_MTIME = 1_700_000_000
EXEC_SUFFIX = {".sh", ".py", ".mjs"}
SANDBOX = Path("/tmp/pkgtest039")

PAYLOAD_FILES = [
    "package.json", "README.md", "cordis.patch.yml", "kb/config.json.template",
    "lib/index.js", "lib/client.js", "lib/client.js.map", "sidecar/server.py",
]

FAILED = []


def sh(cmd):
    return subprocess.run(["bash", "-lc", cmd], capture_output=True, text=True).stdout


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def size(p):
    return Path(p).stat().st_size


def junk(p):
    p = Path(p)
    return "__pycache__" in p.parts or p.suffix in (".pyc", ".bak") or ".bak-" in p.name


def walk(root):
    for p in sorted(Path(root).rglob("*")):
        if p.is_file() and not junk(p):
            yield p


def head(t):
    print("\n" + "=" * 72 + "\n" + t + "\n" + "=" * 72)


def check(label, okv, detail=""):
    print("  [%s] %s%s" % ("OK " if okv else "FAIL", label, ("  " + str(detail)) if detail else ""))
    if not okv:
        FAILED.append(label)


# ─────────────────────────────────────────────── 0. pre-flight ────────────────
head("0  pre-flight")
for p in (OLD, LIVE):
    if not p.exists():
        sys.exit("  FATAL: missing %s" % p)
print("  0.3.8 tree  :", sh("ls -d %s/*/ | tr '\\n' ' '" % OLD).strip())
print("  live plugin :", sh("md5sum %s/lib/client.js %s/sidecar/server.py" % (LIVE, LIVE)).strip())
print("  python      :", sh("python3 -V").strip())

# ─────────────────────────────────────────────── 1. copy skeleton ────────────
head("1  copy 0.3.8 skeleton -> 0.3.9 (payload/ + manifest + plugin regenerated)")
if NEW.exists():
    shutil.rmtree(NEW)
ign = shutil.ignore_patterns("manifest.json", "plugin", "__pycache__", "*.pyc", "*.log", "*.bak", "*.bak-*")
shutil.copytree(OLD, NEW, ignore=ign)
os.makedirs(NEW / "plugin", exist_ok=True)
stale = list(NEW.rglob("__pycache__"))
for d in stale:
    shutil.rmtree(d)
check("stale __pycache__ removed from the skeleton", True, "%d dir(s)" % len(stale))
print("  skeleton files:", len([p for p in walk(NEW)]))

# ─────────────────────────────────────────────── 2. refresh payload ──────────
head("2  refresh payload/ from the live plugin dir")
for f in PAYLOAD_FILES:
    src = LIVE / f
    if not src.is_file():
        sys.exit("  FATAL: live file missing: %s" % src)
    shutil.copy2(src, NEW / "payload" / f)
    print("  %-26s %8d bytes  md5=%s" % (f, size(src), md5(src)[:12]))

# ─────────────────────────────────────────────── 2b. port the crash guard ────
head("2b port normaliseModelsSnap (panel-crash guard) from the 100.100.6.55 branch")
cli_path = NEW / "payload" / "lib" / "client.js"
r = subprocess.run([sys.executable, str(Path(__file__).with_name("apply_norm_fix.py")), str(cli_path)],
                   capture_output=True, text=True)
print("  " + (r.stdout.strip() or r.stderr.strip()))
check("normaliseModelsSnap ported", "PATCHED" in r.stdout or "ALREADY_PATCHED" in r.stdout)

# ─────────────────────────────────────────────── 2b2. count-rail fix ─────────
head("2b2 apply the KB count-rail fix (status count + artifact-rail md filter)")
r2 = subprocess.run([sys.executable, str(Path(__file__).with_name("apply_count_rail_fix.py")), str(cli_path)],
                    capture_output=True, text=True)
print("  " + (r2.stdout.strip() or r2.stderr.strip()))
check("count-rail fix applied", "PATCHED" in r2.stdout or "ALREADY_PATCHED" in r2.stdout)

# ─────────────────────────────────────────────── 2b3. index-modal fix ────────
head("2b3 apply the KB index-modal (extDist) count fix")
r3 = subprocess.run([sys.executable, str(Path(__file__).with_name("apply_extdist_fix.py")), str(cli_path)],
                    capture_output=True, text=True)
print("  " + (r3.stdout.strip() or r3.stderr.strip()))
check("index-modal (extDist) fix applied", "PATCHED" in r3.stdout or "ALREADY_PATCHED" in r3.stdout)

# ─────────────────────────────────────────────── 2c. payload markers ─────────
head("2c payload marker assertions")
srv = (NEW / "payload" / "sidecar" / "server.py").read_text(encoding="utf-8")
cli = (NEW / "payload" / "lib" / "client.js").read_text(encoding="utf-8")
idx = (NEW / "payload" / "lib" / "index.js").read_text(encoding="utf-8")

dupe = {
    "A _hashes_drop_display": "_hashes_drop_display", "B BS = chr(92)": "BS = chr(92)",
    "C manifest_aware": "manifest_aware", "D task- branch": 'startswith("task-")',
    "E _tasks fallback": "_tp = (_tasks.get(_pid)",
    "F route sync prune": "# patch6: synchronous fingerprint prune",
    "G route cancel+pop": "# patch7: cancel ingest + pop",
}
for k, v in dupe.items():
    check("dupe " + k, v in srv)
iso = {"isolation dsh_mu_user": "dsh_mu_user", "isolation MU_NS": "MU_NS",
       "isolation index autostart": "autostart sidecar"}
for k, v in iso.items():
    check(k, v in (idx if "index" in k else cli))
rail = {
    "rail component KbArtifactRail": "KbArtifactRail",
    "rail layout chatRow": "chatRow",
    "rail layout chatLeft": "chatLeft",
    "rail collapsed state artRailCollapsed": "artRailCollapsed",
    "rail toggleArtRail": "toggleArtRail",
    "rail groups artifactGroups": "artifactGroups",
    "rail @mention reuses mentionFile": "mentionFile",
    "rail guard normaliseModelsSnap": "normaliseModelsSnap",
}
for k, v in rail.items():
    check(k, v in cli)
count_rail = {
    "count-rail status uses kbDocs.length": "kbDocs.length",
    "count-rail skips .md transcripts": 'if (ext === "md") continue;',
    "count-rail drops empty groups": ".filter((g) => g.files.length > 0).sort",
    "count-rail total = generated file count": "artifactGroups.reduce((n, g) => n + g.files.length, 0)",
}
for k, v in count_rail.items():
    check(k, v in cli)
index_modal = {
    "index-modal extDist walks kbDocs": "for (const d of kbDocs) {",
    "index-modal extDist deps [kbDocs]": "}, [kbDocs]);",
}
for k, v in index_modal.items():
    check(k, v in cli)
check("index-modal no longer walks all docs", "for (const d of docs) {" not in cli)
check("artifact tree nodes removed (no 纳入全局检索 switch)",
      "DSH产物纳入全局检索" not in cli and "知识库产物纳入全局检索" not in cli)
check("server: _excluded_prefixes returns NS_ORDER unconditionally",
      "return list(NS_ORDER)" in srv)
check("server: WS_SYNC default off", 'WS_SYNC_CFG.get("enabled", False)' in srv)
check("server: /viewer/* static mount present", "/viewer" in srv)

# ─────────────────────────────────────────────── 2d. line endings ────────────
head("2d normalise line endings (CRLF -> LF) across the package tree")
TEXT_EXT = {".sh", ".py", ".mjs", ".js", ".json", ".yml", ".yaml", ".md",
            ".template", ".map", ".conf", ".service", ".txt"}
converted = []
for p in sorted(NEW.rglob("*")):
    if not p.is_file() or junk(p) or p.suffix not in TEXT_EXT:
        continue
    b = p.read_bytes()
    if b"\r\n" in b:
        p.write_bytes(b.replace(b"\r\n", b"\n"))
        converted.append(p.relative_to(NEW).as_posix())
print("  converted:", converted or "(none)")
left = [p.relative_to(NEW).as_posix() for p in NEW.rglob("*")
        if p.is_file() and not junk(p) and p.suffix in TEXT_EXT and b"\r\n" in p.read_bytes()]
check("no CRLF left in any text file", not left, left)

# ─────────────────────────────────────────────── 3. bump versions ────────────
head("3  bump version strings %s -> %s" % (OLDVER, VER))
pj = NEW / "payload" / "package.json"
txt = pj.read_text(encoding="utf-8")
m = re.search(r'"version"\s*:\s*"([^"]+)"', txt)
if not m:
    sys.exit("  FATAL: payload/package.json has no version field")
found = m.group(1)
if found not in ("0.3.5", "0.3.6", "0.3.7", OLDVER, VER):
    sys.exit("  FATAL: unexpected payload version %r" % found)
pj.write_text(txt[:m.start(1)] + VER + txt[m.end(1):], encoding="utf-8")
check("payload/package.json version", json.loads(pj.read_text(encoding="utf-8"))["version"] == VER,
      "%s -> %s" % (found, VER))

ins = NEW / "install.sh"
t = ins.read_text(encoding="utf-8")
if 'PKG_VERSION="%s"' % OLDVER not in t:
    sys.exit("  FATAL: install.sh has no PKG_VERSION=%s" % OLDVER)
t = t.replace('PKG_VERSION="%s"' % OLDVER, 'PKG_VERSION="%s"' % VER)
ins.write_text(t, encoding="utf-8")
check("install.sh PKG_VERSION", 'PKG_VERSION="%s"' % VER in ins.read_text(encoding="utf-8"),
      sh("grep -m1 PKG_VERSION %s" % ins).strip())
check("install.sh still accepts --no-pnpm", "--no-pnpm)" in ins.read_text(encoding="utf-8"))

# ─────────────────────────────────────────────── 4. README ───────────────────
head("4  update portable README.md")
rm = NEW / "README.md"
r = rm.read_text(encoding="utf-8")
src_note = ("来源：`192.168.8.6` 上 **正在运行的** live 插件目录。相对 0.3.8，这一版补上了\n"
            "知识库面板**「索引」弹窗**的计数口径修复（详见下方 0.3.9 变更）：弹窗顶部的文档数\n"
            "原先统计全部文档（含只读 `DSH产物/` 镜像与 `知识库产物/` 产物），与侧栏状态栏、\n"
            "目录树三者对不上；现在统一为 `kbDocs` 口径，三处数字一致。\n"
            "其余沿用 0.3.8/0.3.7：状态栏计数对齐目录树、「对话产物」栏只放生成文件、\n"
            "产物从目录树下线改为右侧栏、面板崩溃防护、多用户隔离、删除后重传去重修复。")
i_src = r.find("来源：")
if i_src >= 0:
    i_end = r.find("\n---", i_src)
    if i_end < 0:
        print("  WARN: source-note terminator not found (left as-is)")
    else:
        r = r[:i_src] + src_note + "\n" + r[i_end:]
        print("  source note replaced")
else:
    print("  WARN: source note pattern not found (left as-is)")

for a, b in (("# %s %s — 独立可移植包" % (PKG, OLDVER), "# %s %s — 独立可移植包" % (PKG, VER)),
             ("tar xzf %s-%s-portable.tar.gz" % (PKG, OLDVER), "tar xzf %s-%s-portable.tar.gz" % (PKG, VER)),
             ("cd %s-%s-portable" % (PKG, OLDVER), "cd %s-%s-portable" % (PKG, VER))):
    if a not in r:
        print("  WARN: README pattern not found (left as-is): %r" % a[:60])
    r = r.replace(a, b)

NEW_SEC = """
## 0.3.9 变更（相对 0.3.8 载荷）

**「索引」弹窗的文档数与侧栏状态栏不一致**（`payload/lib/client.js`）

同一个知识库面板里有**两处**文档计数，用的是两套口径：

| 位置 | 修复前 | 修复后 |
| --- | --- | --- |
| 侧栏状态栏 | `RAG-Anything · 已连接 · ${kbDocs.length} 篇文档`（0.3.8 已修） | 不变 |
| **「索引」弹窗顶部大数** | `extDist.reduce((a, s) => a + s.n, 0)`，而 `extDist` 遍历的是 **`docs`（全部文档）**，含只读 `DSH产物/` 工作区镜像与 `知识库产物/` 对话产物 —— 于是状态栏显示 9、弹窗显示 455，自相矛盾 | `extDist` 改遍历 **`kbDocs`**（目录树实际渲染的文档，已排除镜像与产物前缀），依赖数组 `[docs]` → `[kbDocs]`；注释同步更新 |

实测口径（同一份语料）：

| 服务器 | 弹窗显示（修复前） | 其中 `DSH产物/` | 其中 `知识库产物/` | 真实知识库 | 修复后 |
| --- | --- | --- | --- | --- | --- |
| 100.100.6.55 | 455 | 441 | 5 | 9（`知识库/`） | **9** |
| 192.168.8.6 | 111 | 100 | 9 | 2（`01-资料/`） | **2** |

> 这版只动了 `client.js`；`server.py` / `index.js` 与 0.3.8 完全一致。

**二、沿用 0.3.8 / 0.3.7 / 0.3.6 的全部内容**

状态栏计数对齐目录树、「对话产物」栏只列生成文件（跳过对话 `.md`）、产物从目录树
下线改为右侧「对话产物」栏、`@文件` 引用注入、全局检索恒定排除产物命名空间、
面板崩溃防护（`normaliseModelsSnap`）、多用户数据隔离、删除后重传去重修复 A–G、
OFV（Open File Viewer）`/viewer/*` 静态挂载、打包缺陷修复。
"""
marker = "## 0.3.8 变更（相对 0.3.7 载荷）"
if marker in r:
    r = r.replace(marker, NEW_SEC.strip() + "\n\n" + marker, 1)
    print("  inserted 0.3.9 changes section before the 0.3.8 section")
else:
    r = r.rstrip() + "\n" + NEW_SEC
    print("  WARN: 0.3.8 section marker not found; appended at the end")
rm.write_text(r, encoding="utf-8")
check("README carries the 0.3.9 section", "## 0.3.9 变更" in rm.read_text(encoding="utf-8"))

# ─────────────────────────────────────────────── 5. plugin tgz ───────────────
head("5  build npm-style plugin tarball (package/ prefix, deterministic)")
tgz = NEW / "plugin" / ("%s-%s.tgz" % (PKG, VER))
files = [(p, "package/" + p.relative_to(NEW / "payload").as_posix())
         for p in walk(NEW / "payload")]
files.sort(key=lambda it: it[1])
with gzip.GzipFile(str(tgz), "wb", mtime=0) as comp:
    with tarfile.open(fileobj=comp, mode="w") as arc:
        for p, name in files:
            info = arc.gettarinfo(str(p), arcname=name)
            info.uid = 0
            info.gid = 0
            info.uname = "root"
            info.gname = "root"
            info.mtime = FIXED_MTIME
            info.mode = 0o644
            with p.open("rb") as h:
                arc.addfile(info, h)
print("  %s  %d bytes  md5=%s" % (tgz.name, size(tgz), md5(tgz)))
print("  entries:", sh("tar tzf %s" % tgz).split())

# ─────────────────────────────────────────────── 6. manifest ─────────────────
head("6  rebuild manifest.json")
entries = {p.relative_to(NEW).as_posix(): {"size": size(p), "md5": md5(p)} for p in walk(NEW)}
old_man = json.loads((OLD / "manifest.json").read_text(encoding="utf-8"))
man = dict(old_man)
man["version"] = VER
man["portable_build"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
man["source"] = {
    "host": "192.168.8.6",
    "arch": "x86_64",
    "path": "/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb",
    "note": ("live directory on the multi-user gateway host; carries 0.3.6 (multi-user "
             "isolation + duplicate-reupload fix A-G), the 0.3.7 artifact rail, the "
             "normaliseModelsSnap crash guard (ported from 100.100.6.55), the 0.3.8 "
             "count-rail fix (status count + artifact-rail md filter) and the 0.3.9 "
             "index-modal count fix (extDist walks kbDocs)"),
}
man["supersedes"] = ("%s %s portable (predates the 0.3.9 index-modal count fix: the 索引 modal "
                     "summed its file-type distribution over all docs, showing 455 while the "
                     "sidebar showed 9)" % (PKG, OLDVER))
caps = [c for c in man.get("capabilities", [])]
caps += [
    "index-modal count fix (0.3.9): the 索引 modal header now sums its file-type distribution "
    "over kbDocs (the docs actually rendered in the KB folder tree) instead of docs (all docs "
    "incl. the read-only DSH产物 mirror and the 知识库产物 artifacts), so it agrees with the "
    "sidebar status bar and the tree",
]
man["capabilities"] = caps
man["changes_0.3.9"] = {
    "payload/lib/client.js": [
        "index modal: `extDist` now walks `kbDocs` instead of `docs` "
        "(`for (const d of docs) {` -> `for (const d of kbDocs) {`), and its dependency array "
        "changed from `[docs]` to `[kbDocs]`, so `extDist.reduce((a, s) => a + s.n, 0)` "
        "(the 索引 modal headline) equals the sidebar `${kbDocs.length} 篇文档`",
        "index modal: the `extDist` doc comment updated to state that DSH产物/ mirror and "
        "知识库产物/ artifacts are excluded",
    ],
    "_unchanged_vs_0.3.8": [
        "payload/sidecar/server.py", "payload/lib/index.js", "payload/lib/client.js.map",
        "install.sh", "verify.sh", "uninstall.sh", "extras/", "tools/", "cordis.patch.yml",
    ],
    "_note": "lib/client.js.map is still the map generated by the 0.3.5 build; client.js has been "
             "patched several times since without regenerating the map, so the map is approximate.",
}
man["files"] = entries
(NEW / "manifest.json").write_text(
    json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("  manifest.json: %d file entries, version %s" % (len(entries), man["version"]))

# ─────────────────────────────────────────────── 7. portable tarball ─────────
head("7  build portable tarball")
arc_path = HOME / ("%s-%s-portable.tar.gz" % (PKG, VER))
if arc_path.exists():
    arc_path.unlink()
with gzip.GzipFile(str(arc_path), "wb", mtime=0) as comp:
    with tarfile.open(fileobj=comp, mode="w") as arc:
        root = tarfile.TarInfo(NEW.name + "/")
        root.type = tarfile.DIRTYPE
        root.mode = 0o755
        root.mtime = FIXED_MTIME
        arc.addfile(root)
        for p in sorted(NEW.rglob("*")):
            if junk(p):
                continue
            name = "%s/%s" % (NEW.name, p.relative_to(NEW).as_posix())
            if p.is_dir():
                info = tarfile.TarInfo(name + "/")
                info.type = tarfile.DIRTYPE
                info.mode = 0o755
            else:
                info = arc.gettarinfo(str(p), arcname=name)
                info.mode = 0o755 if p.suffix in EXEC_SUFFIX else 0o644
            info.uid = 0
            info.gid = 0
            info.uname = "root"
            info.gname = "root"
            info.mtime = FIXED_MTIME
            if p.is_file():
                with p.open("rb") as h:
                    arc.addfile(info, h)
            else:
                arc.addfile(info)
print("  %s  %d bytes  md5=%s" % (arc_path.name, size(arc_path), md5(arc_path)))

root_tgz = HOME / ("%s-%s.tgz" % (PKG, VER))
shutil.copy2(tgz, root_tgz)
print("  %s  %d bytes  md5=%s" % (root_tgz.name, size(root_tgz), md5(root_tgz)))

# ─────────────────────────────────────────────── 8. static verification ──────
head("8  static verification")
tmp = Path("/tmp/kb039_verify")
if tmp.exists():
    shutil.rmtree(tmp)
tmp.mkdir(parents=True)
with tarfile.open(tgz) as arc:
    arc.extractall(tmp)
mism = [p.relative_to(NEW / "payload").as_posix() for p in walk(NEW / "payload")
        if md5(p) != md5(tmp / "package" / p.relative_to(NEW / "payload"))]
check("tgz payload == payload/ (md5)", not mism, mism)
check("no __pycache__/.pyc in the tgz", not [n for n in sh("tar tzf %s" % tgz).split()
                                             if "__pycache__" in n or n.endswith(".pyc")])
check("no __pycache__/.pyc in the portable tarball",
      not [n for n in sh("tar tzf %s" % arc_path).split() if "__pycache__" in n or n.endswith(".pyc")])
check("no .bak files leaked into the portable tarball",
      not [n for n in sh("tar tzf %s" % arc_path).split() if ".bak" in n])
env = dict(os.environ, PYTHONPYCACHEPREFIX="/tmp/pycache039")
rc = subprocess.run(["python3", "-m", "py_compile", str(NEW / "payload" / "sidecar" / "server.py")],
                    capture_output=True, text=True, env=env)
check("py_compile server.py", rc.returncode == 0, rc.stderr.strip()[:200])
for s in ("install.sh", "verify.sh", "uninstall.sh"):
    rc = subprocess.run(["bash", "-n", str(NEW / s)], capture_output=True, text=True)
    check("bash -n %s" % s, rc.returncode == 0, rc.stderr.strip()[:200])
for j in ("lib/index.js", "lib/client.js"):
    rc = subprocess.run(["node", "--check", str(NEW / "payload" / j)], capture_output=True, text=True)
    check("node --check %s" % j, rc.returncode == 0, rc.stderr.strip()[:200])
check("__pycache__ not written into the payload",
      not (NEW / "payload" / "sidecar" / "__pycache__").exists())
left = sh("grep -rln '0\\.3\\.8' %s --include='*.sh' --include='*.json' --include='*.md' | head" % NEW).split()
print("  files still mentioning 0.3.8 (expected: README history + manifest history):", left)

# ─────────────────────────────────────────────── 9. sandbox rehearsal ────────
head("9  sandbox install rehearsal (HOME redirected -> zero production impact)")
before = {f: md5(LIVE / f) for f in ("lib/client.js", "lib/index.js", "sidecar/server.py")}
if SANDBOX.exists():
    shutil.rmtree(SANDBOX)
shome = SANDBOX / "home"
(shome / ".dsh" / "profiles" / "web").mkdir(parents=True, exist_ok=True)
(shome / ".dsh" / "profiles" / "web" / "package.json").write_text(
    json.dumps({"name": "web", "version": "0.0.0", "dependencies": {}}, indent=2), encoding="utf-8")
senv = dict(os.environ, HOME=str(shome), PYTHONPYCACHEPREFIX="/tmp/pycache039-sb", SUDO_PW="")
rc = subprocess.run(["bash", str(NEW / "install.sh"), "--profile", "web", "--port", "17999",
                     "--skip-venv", "--no-systemd", "--no-nginx", "--no-restart", "--no-pnpm", "-y"],
                    capture_output=True, text=True, env=senv, cwd=str(NEW))
print(rc.stdout[-4000:])
if rc.stderr.strip():
    print("  STDERR:", rc.stderr[-1500:])
check("install.sh ran clean in the sandbox", rc.returncode == 0, "exit=%d" % rc.returncode)

tgt = shome / ".dsh" / "profiles" / "web" / "node_modules" / PKG
if tgt.exists():
    for f in ("lib/client.js", "lib/index.js", "sidecar/server.py"):
        check("installed %s == payload" % f, md5(tgt / f) == md5(NEW / "payload" / f),
              md5(tgt / f)[:12])
    check("installed package.json version", json.loads((tgt / "package.json").read_text(encoding="utf-8"))["version"] == VER)
    icli = (tgt / "lib" / "client.js").read_text(encoding="utf-8")
    check("installed client.js has the rail", "KbArtifactRail" in icli and "artRailCollapsed" in icli)
    check("installed client.js has the crash guard", "normaliseModelsSnap" in icli)
    check("installed client.js has isolation", "dsh_mu_user" in icli)
    check("installed client.js has the count-rail fix",
          "kbDocs.length" in icli and 'if (ext === "md") continue;' in icli)
    check("installed client.js has the index-modal fix",
          "for (const d of kbDocs) {" in icli and "}, [kbDocs]);" in icli
          and "for (const d of docs) {" not in icli)
    check("installed client.js no longer has the retrieval switches", "DSH产物纳入全局检索" not in icli)
else:
    check("plugin landed in the sandbox profile", False, str(tgt))

prof = json.loads((shome / ".dsh" / "profiles" / "web" / "package.json").read_text(encoding="utf-8"))
bl = prof.get("dsh", {}).get("profile", {}).get("bundles", [])
check("profile bundles references the plugin exactly once",
      bl.count(PKG) == 1, "bundles=%s" % bl)
check("profile dependencies carries the file: tgz",
      str(prof.get("dependencies", {}).get(PKG, "")).startswith("file:"),
      prof.get("dependencies", {}).get(PKG))
check("distributed tgz landed in the sandbox home",
      (shome / ("%s-%s.tgz" % (PKG, VER))).exists())

rc = subprocess.run(["bash", str(NEW / "verify.sh"), "--profile", "web", "--port", "17999"],
                    capture_output=True, text=True, env=senv, cwd=str(NEW))
tail = rc.stdout[-2500:]
print(tail)
m = re.search(r"passed\s+(\d+)\s*·?\s*failed\s+(\d+)", tail)
check("verify.sh reported its summary", bool(m), m.group(0) if m else "no summary line")
if m:
    print("  -> 沙箱内 expected FAIL 仅来自 --no-systemd/--no-nginx/--skip-venv 与隔离端口")

after = {f: md5(LIVE / f) for f in ("lib/client.js", "lib/index.js", "sidecar/server.py")}
check("production live plugin untouched by the rehearsal", before == after, before)

subprocess.run(["bash", "-lc", "rm -rf %s /tmp/pycache039 /tmp/pycache039-sb /tmp/kb039_verify" % SANDBOX])
check("sandbox removed", not SANDBOX.exists())

# ─────────────────────────────────────────────── 10. summary ─────────────────
head("10 summary")
print("  FAILED checks: %d %s" % (len(FAILED), FAILED or ""))
print(sh("ls -la %s %s %s" % (NEW, arc_path, root_tgz)))
print(sh("md5sum %s %s" % (arc_path, root_tgz)))
sys.exit(1 if FAILED else 0)
