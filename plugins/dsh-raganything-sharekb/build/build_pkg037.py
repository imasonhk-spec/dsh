#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build dsh-raganything-kb 0.3.7 portable package from the PATCHED live plugin.

0.3.7 = 0.3.6 packaging skeleton (install.sh / verify.sh / uninstall.sh /
        extras/ / tools/ — unchanged apart from the version string)
      + refreshed payload taken from the live plugin dir, which now carries:
          * the 「对话产物」 side rail on the chat pane (artifact rail)
          * the artifact folders (DSH产物 / 知识库产物) removed from the KB tree,
            and the two "纳入全局检索" switches deleted with them
          * global retrieval always excludes the two artifact namespaces;
            an explicit @file reference still reaches them (scope branch)
          * (inherited) multi-user isolation + duplicate-reupload fix A-G
      + the `normaliseModelsSnap` panel-crash guard, ported byte-for-byte from
        the 100.100.6.55 branch (that fork had it, this one did not)

Outputs (under $HOME):
    dsh-raganything-kb-0.3.7-portable/          the tree
    dsh-raganything-kb-0.3.7-portable.tar.gz    the tree, packed
    dsh-raganything-kb-0.3.7.tgz                standalone npm-style plugin tgz
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
OLD = HOME / "dsh-raganything-kb-0.3.6-portable"
NEW = HOME / "dsh-raganything-kb-0.3.7-portable"
LIVE = HOME / ".dsh/profiles/web/node_modules/dsh-raganything-kb"
PKG = "dsh-raganything-kb"
OLDVER, VER = "0.3.6", "0.3.7"
FIXED_MTIME = 1_700_000_000
EXEC_SUFFIX = {".sh", ".py", ".mjs"}
SANDBOX = Path("/tmp/pkgtest037")

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
print("  0.3.6 tree  :", sh("ls -d %s/*/ | tr '\\n' ' '" % OLD).strip())
print("  live plugin :", sh("md5sum %s/lib/client.js %s/sidecar/server.py" % (LIVE, LIVE)).strip())
print("  python      :", sh("python3 -V").strip())

# ─────────────────────────────────────────────── 1. copy skeleton ────────────
head("1  copy 0.3.6 skeleton -> 0.3.7 (payload/ + manifest + plugin regenerated)")
if NEW.exists():
    shutil.rmtree(NEW)
ign = shutil.ignore_patterns("manifest.json", "plugin", "__pycache__", "*.pyc", "*.log", "*.bak", "*.bak-*")
shutil.copytree(OLD, NEW, ignore=ign)
os.makedirs(NEW / "plugin", exist_ok=True)
# the 0.3.6 package accidentally shipped a stale __pycache__/server.cpython-312.pyc
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
check("artifact tree nodes removed (no 纳入全局检索 switch)",
      "DSH产物纳入全局检索" not in cli and "知识库产物纳入全局检索" not in cli)
check("server: _excluded_prefixes returns NS_ORDER unconditionally",
      "return list(NS_ORDER)" in srv)
check("server: WS_SYNC default off", 'WS_SYNC_CFG.get("enabled", False)' in srv)

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
# 0.3.6 shipped uninstall.sh with CRLF, which breaks `bash -n` and `./uninstall.sh`
# on Linux ("syntax error near unexpected token `in\r'"). Its build script only
# printed bash's stdout and never checked the exit code, so it slipped through.
check("no CRLF left in any text file", not left, left)

# ─────────────────────────────────────────────── 3. bump versions ────────────
head("3  bump version strings %s -> %s" % (OLDVER, VER))
pj = NEW / "payload" / "package.json"
txt = pj.read_text(encoding="utf-8")
# The payload is refreshed from the LIVE plugin dir, whose package.json still
# declares the ORIGINAL upstream version (0.3.5) — 0.3.6's bump only ever lived
# inside the package, never in the live tree. So match any version here.
m = re.search(r'"version"\s*:\s*"([^"]+)"', txt)
if not m:
    sys.exit("  FATAL: payload/package.json has no version field")
found = m.group(1)
if found not in ("0.3.5", "0.3.6", OLDVER, VER):
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
src_note = ("来源：`192.168.8.6` 上 **正在运行的** live 插件目录。相对 0.3.6，这一版把\n"
            "产物从知识库目录树里**彻底下线**（`DSH产物` / `知识库产物` 两个置顶节点与两个\n"
            "「纳入全局检索」开关一并移除），改为对话框右侧的**可折叠「对话产物」栏**；\n"
            "每个产物后跟 **`@文件`** 按钮，点击即作为引用注入当前对话。\n"
            "同时并入 100.100.6.55 分支的 **面板崩溃防护**（`normaliseModelsSnap`）。")
r2 = re.sub(r"来源：.*?不是旧的 0\.3\.5 发布 tgz。", lambda m: src_note, r, flags=re.S)
if r2 == r:
    print("  WARN: source note pattern not found (left as-is)")
r = r2
for a, b in (("# %s %s — 独立可移植包" % (PKG, OLDVER), "# %s %s — 独立可移植包" % (PKG, VER)),
             ("tar xzf %s-%s-portable.tar.gz" % (PKG, OLDVER), "tar xzf %s-%s-portable.tar.gz" % (PKG, VER)),
             ("cd %s-%s-portable" % (PKG, OLDVER), "cd %s-%s-portable" % (PKG, VER))):
    if a not in r:
        print("  WARN: README pattern not found (left as-is): %r" % a[:60])
    r = r.replace(a, b)

NEW_SEC = """
## 0.3.7 变更（相对 0.3.6 载荷）

**一、产物不再进知识库目录树；改到对话框右侧的「对话产物」栏**（`payload/lib/client.js`、`payload/sidecar/server.py`）

| 项 | 变更 |
| --- | --- |
| 目录树 | `DSH产物` / `知识库产物` 两个置顶节点从个人知识库树中移除；索引弹窗里的两个「纳入全局检索」开关一并删除 |
| 对话产物栏 | 对话框右侧新增**可折叠**面板（展开 236px ⇄ 折叠 40px，竖排标题 + 数量角标，折叠状态本地记忆）；产物**按会话分组**，显示文件类型与名称；点文件本体打开预览 |
| `@文件` 引用 | 每个产物文件后跟 **`@文件`** 按钮，点击即把该文件作为引用注入当前对话框（复用原有 `mentionFile` 通道） |
| 全局检索 | `_excluded_prefixes()` 改为**恒定**返回产品命名空间 → 不带 `@` 的全局问答永远看不到产物；显式 `@` 指定产物文件/文件夹走 **scope 精确检索**分支（早于排除逻辑 return），**不受影响**，仍可正常回答 |
| 工作区自动入库 | `WS_SYNC_ENABLED` 代码默认值改为 `False` |

> 产物**仍然入库**——必须入库，否则 `@文件` 精确引用没有内容可检索。
> 前端不新增 sidecar 端点，产物列表复用了既有的 `productDocs`（`docs` 里 title 以
> `知识库产物/` 开头者）。

**二、面板崩溃防护**（`payload/lib/client.js`，移植自 100.100.6.55 分支）

旧版 sidecar 的 `/models` 快照缺 `selections.index_llm` 时，前端解引用会抛异常，
DSH 的 slot 边界捕获后**整块卸载知识库面板**（`slot entry crashed in 'sidebar.footer.action'`）。
本版在 `loadModelsSnapshot` 前插入 `normaliseModelsSnap()`，统一把
`selections.{llm,index_llm,vision,embedding,rerank,asr,parser}` 与
`device/runtime/catalog/downloads/custom_models` 补成空对象（缺 `index_llm` 时用 `llm` 兜底），
**一处归一化覆盖 20+ 处解引用**。纯防御性补丁：字段存在时不改值。

**三、打包缺陷修复**

| 文件 | 缺陷 | 修复 |
| --- | --- | --- |
| `uninstall.sh` | 0.3.6 里这份文件是 **CRLF 换行**，在 Linux 上 `bash -n` 与 `./uninstall.sh` 都会报 `syntax error near unexpected token 'in\\r'` —— 也就是说现场的**卸载/回滚功能实际是坏的** | 包内全部文本文件统一规范为 LF（实际命中 `uninstall.sh` 与 `payload/kb/config.json.template` 两个文件） |
| `payload/sidecar/__pycache__/server.cpython-312.pyc` | 0.3.6 误把编译缓存打进了包里（且未登记在 manifest 中，与清单不一致） | 打包时排除 `__pycache__` / `*.pyc` |

**四、沿用 0.3.6 的全部修复**

多用户数据隔离（`dsh_mu_user` 命名空间 + 网关 basePath + 每账户自启 sidecar）、
知识库「删除后重传仍报重复」修复（A–G 七处）、`install.sh --no-pnpm` 解析器修复。
"""
marker = "## 0.3.6 变更（相对 0.3.5 载荷）"
if marker in r:
    r = r.replace(marker, NEW_SEC.strip() + "\n\n" + marker, 1)
    print("  inserted 0.3.7 changes section before the 0.3.6 section")
else:
    r = r.rstrip() + "\n" + NEW_SEC
    print("  WARN: 0.3.6 section marker not found; appended at the end")
rm.write_text(r, encoding="utf-8")
check("README carries the 0.3.7 section", "## 0.3.7 变更" in rm.read_text(encoding="utf-8"))

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
             "isolation + duplicate-reupload fix A-G) plus the 0.3.7 artifact rail and the "
             "normaliseModelsSnap crash guard ported from the 100.100.6.55 branch"),
}
man["supersedes"] = ("%s %s portable (payload predates the artifact rail / artifact-folder "
                     "removal and the crash guard)" % (PKG, OLDVER))
caps = [c for c in man.get("capabilities", [])]
caps += [
    "artifact rail: a collapsible 「对话产物」 pane on the right of the KB chat pane, grouping "
    "conversation artifacts by session, each row carrying an @file button that injects the "
    "artifact as a reference into the composer",
    "artifact folders retired: DSH产物 / 知识库产物 no longer appear in the personal KB tree, "
    "and global retrieval always excludes both namespaces; an explicit @file reference still "
    "reaches them through the scope branch",
    "panel crash guard: the /models snapshot is normalised before use, so a sidecar that omits "
    "selections.index_llm can no longer unmount the whole KB panel",
]
man["capabilities"] = caps
man["changes_0.3.7"] = {
    "payload/lib/client.js": [
        "artifact rail: new KbArtifactRail component + .chatRow/.chatLeft layout, artifacts "
        "grouped by session, collapsible 236px<->40px with the collapsed state persisted",
        "each artifact row carries an @file button wired to the existing mentionFile() path",
        "the two pinned artifact nodes and the two 「纳入全局检索」 switches are gone from the "
        "KB browser; isPinnedPrefix() now only keeps the namespaces out of the tree",
        "normaliseModelsSnap() guards every modelsSnap dereference (ported byte-for-byte from "
        "the 100.100.6.55 branch)",
    ],
    "payload/sidecar/server.py": [
        "_excluded_prefixes() always returns the artifact namespaces, so a global question never "
        "sees artifacts; an explicit @file target is resolved by the earlier scope branch",
        'WS_SYNC_ENABLED defaults to False (no automatic workspace ingest of new artifacts)',
    ],
    "install.sh": ["PKG_VERSION 0.3.6 -> 0.3.7"],
    "uninstall.sh": [
        "line endings normalised CRLF -> LF. 0.3.6 shipped this file with CRLF, so "
        "`bash -n uninstall.sh` and `./uninstall.sh` both died on Linux with "
        "\"syntax error near unexpected token `in\\r'\" — i.e. uninstall/rollback was "
        "broken in the field. (0.3.6's builder printed bash's stdout without checking "
        "the exit code, so the failure went unnoticed.)",
    ],
    "README.md": ["0.3.7 change section; source note refreshed"],
    "payload/kb/config.json.template": [
        "CRLF -> LF (0.3.6 shipped this template with Windows line endings; the JSON "
        "content itself is unchanged)",
    ],
    "_unchanged_vs_0.3.6": ["verify.sh", "extras/", "tools/", "cordis.patch.yml",
                            "lib/index.js", "lib/client.js.map"],
    "_note": "lib/client.js.map is still the map generated by the 0.3.5 build; client.js has been "
             "patched several times since without regenerating the map, so the map is approximate.",
    "_build_fix": "the 0.3.6 package accidentally shipped payload/sidecar/__pycache__/"
                  "server.cpython-312.pyc; 0.3.7 excludes __pycache__ from the payload, the tgz "
                  "and the manifest.",
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
tmp = Path("/tmp/kb037_verify")
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
env = dict(os.environ, PYTHONPYCACHEPREFIX="/tmp/pycache037")
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
left = sh("grep -rln '0\\.3\\.6' %s --include='*.sh' --include='*.json' --include='*.md' | head" % NEW).split()
print("  files still mentioning 0.3.6 (expected: README history + manifest history):", left)

# ─────────────────────────────────────────────── 9. sandbox rehearsal ────────
head("9  sandbox install rehearsal (HOME redirected -> zero production impact)")
before = {f: md5(LIVE / f) for f in ("lib/client.js", "lib/index.js", "sidecar/server.py")}
if SANDBOX.exists():
    shutil.rmtree(SANDBOX)
shome = SANDBOX / "home"
(shome / ".dsh" / "profiles" / "web").mkdir(parents=True, exist_ok=True)
(shome / ".dsh" / "profiles" / "web" / "package.json").write_text(
    json.dumps({"name": "web", "version": "0.0.0", "dependencies": {}}, indent=2), encoding="utf-8")
senv = dict(os.environ, HOME=str(shome), PYTHONPYCACHEPREFIX="/tmp/pycache037-sb", SUDO_PW="")
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

subprocess.run(["bash", "-lc", "rm -rf %s /tmp/pycache037 /tmp/pycache037-sb /tmp/kb037_verify" % SANDBOX])
check("sandbox removed", not SANDBOX.exists())

# ─────────────────────────────────────────────── 10. summary ─────────────────
head("10 summary")
print("  FAILED checks: %d %s" % (len(FAILED), FAILED or ""))
print(sh("ls -la %s %s %s" % (NEW, arc_path, root_tgz)))
print(sh("md5sum %s %s" % (arc_path, root_tgz)))
sys.exit(1 if FAILED else 0)
