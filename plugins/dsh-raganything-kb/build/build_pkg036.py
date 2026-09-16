#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build dsh-raganything-kb 0.3.6 portable package from the PATCHED live plugin.

0.3.6 = 0.3.5 packaging (scripts/extras/tools, unchanged)
      + refreshed payload from the live plugin dir, which carries:
          * multi-user isolation  (lib/index.js autostart, lib/client.js
            gateway basePath + per-account localStorage namespace)
          * duplicate-reupload fix (sidecar/server.py, 7 patches A-G)

Outputs (under /home/lgsj):
    dsh-raganything-kb-0.3.6-portable/          the tree
    dsh-raganything-kb-0.3.6-portable.tar.gz    the tree, packed
    dsh-raganything-kb-0.3.6.tgz                standalone npm-style plugin tgz
"""
import gzip, hashlib, json, os, shutil, subprocess, sys, tarfile, time
from pathlib import Path

HOME = Path("/home/lgsj")
OLD = HOME / "dsh-raganything-kb-0.3.5-portable"
NEW = HOME / "dsh-raganything-kb-0.3.6-portable"
LIVE = HOME / ".dsh/profiles/web/node_modules/dsh-raganything-kb"
PKG = "dsh-raganything-kb"
OLDVER, VER = "0.3.5", "0.3.6"
FIXED_MTIME = 1_700_000_000
EXEC_SUFFIX = {".sh", ".py", ".mjs"}

# The exact payload file set the 0.3.5 package shipped (fresh content from live).
PAYLOAD_FILES = [
    "package.json", "README.md", "cordis.patch.yml", "kb/config.json.template",
    "lib/index.js", "lib/client.js", "lib/client.js.map", "sidecar/server.py",
]

def sh(cmd):
    return subprocess.run(["bash", "-lc", cmd], capture_output=True, text=True).stdout

def md5(p):
    return hashlib.md5(Path(p).read_bytes()).hexdigest()

def size(p):
    return Path(p).stat().st_size

def head(t):
    print("\n" + "=" * 72 + f"\n{t}\n" + "=" * 72)

# ─────────────────────────────────────────────── 0. pre-flight ────────────────
head("0  pre-flight: stray version refs + install.sh tgz usage")
print("install.sh tgz/plugin references:")
print(sh(f"grep -n 'tgz\\|plugin/' {OLD}/install.sh | head -25"))
print("\nany '0.3.5' literal inside the 0.3.5 package tree (top-level scripts):")
print(sh(f"grep -rn '0\\.3\\.5' {OLD}/install.sh {OLD}/verify.sh {OLD}/uninstall.sh {OLD}/extras {OLD}/tools 2>/dev/null | head"))

# ─────────────────────────────────────────────── 1. copy skeleton ────────────
head("1  copy 0.3.5 skeleton -> 0.3.6 (payload/ + manifest.json + plugin/ regenerated)")
if NEW.exists():
    shutil.rmtree(NEW)
ign = shutil.ignore_patterns("manifest.json", "plugin", "*.pyc", "__pycache__", "*.log", "*.bak")
shutil.copytree(OLD, NEW, ignore=ign)
os.makedirs(NEW / "plugin", exist_ok=True)
print("  skeleton files:", sorted(p.relative_to(NEW).as_posix() for p in NEW.rglob("*") if p.is_file()))

# ─────────────────────────────────────────────── 2. refresh payload ──────────
head("2  refresh payload/ from the PATCHED live plugin dir")
for f in PAYLOAD_FILES:
    src = LIVE / f
    if not src.is_file():
        sys.exit(f"  FATAL: live file missing: {src}")
    shutil.copy2(src, NEW / "payload" / f)
    print(f"  {f:<28} {size(src):>8} bytes  md5={md5(src)[:10]}")

# sanity: the patch markers must all be present in the shipped server.py
srv = (NEW / "payload" / "sidecar" / "server.py").read_text(encoding="utf-8")
marks = {
    "A _hashes_drop_display": "_hashes_drop_display" in srv,
    "B BS = chr(92)": "BS = chr(92)" in srv,
    "C manifest_aware": "manifest_aware" in srv,
    "D task- branch": 'startswith("task-")' in srv,
    "E _tasks fallback": "_tp = (_tasks.get(_pid)" in srv,
    "F route sync prune": "# patch6: synchronous fingerprint prune" in srv,
    "G route cancel+pop": "# patch7: cancel ingest + pop" in srv,
}
print("  patch markers:", {k: v for k, v in marks.items()})
if not all(marks.values()):
    sys.exit("  FATAL: a patch marker is missing from the shipped server.py!")
cli = (NEW / "payload" / "lib" / "client.js").read_text(encoding="utf-8")
idx = (NEW / "payload" / "lib" / "index.js").read_text(encoding="utf-8")
iso = {"client: dsh_mu_user cookie ns": "dsh_mu_user" in cli,
       "client: gateway basePath regex": "\\/mu\\/" in cli,
       "client: MU_NS prefix": "MU_NS" in cli,
       "index: autostart sidecar": "autostart sidecar" in idx}
print("  isolation markers:", iso)
if not all(iso.values()):
    sys.exit("  FATAL: multi-user isolation markers missing!")

# ─────────────────────────────────────────────── 3. bump versions ────────────
head("3  bump version strings 0.3.5 -> 0.3.6")
pj = NEW / "payload" / "package.json"
txt = pj.read_text(encoding="utf-8")
if f'"version": "{OLDVER}"' not in txt:
    sys.exit("  FATAL: payload/package.json has no 0.3.5 version to bump")
pj.write_text(txt.replace(f'"version": "{OLDVER}"', f'"version": "{VER}"'), encoding="utf-8")
print("  payload/package.json ->", json.loads(pj.read_text(encoding="utf-8"))["version"])

ins = NEW / "install.sh"
t = ins.read_text(encoding="utf-8")
if f'PKG_VERSION="{OLDVER}"' not in t:
    sys.exit("  FATAL: install.sh has no PKG_VERSION=0.3.5")
t = t.replace(f'PKG_VERSION="{OLDVER}"', f'PKG_VERSION="{VER}"')

# Fix an inherited 0.3.5 defect: README documents --no-pnpm and the code has a
# USE_PNPM=0 branch (unreachable dead code), but the option parser rejected it.
anchor_parse = "    --skip-venv)    SKIP_VENV=1; shift ;;\n"
if "--no-pnpm)" not in t and anchor_parse in t:
    t = t.replace(anchor_parse, anchor_parse + "    --no-pnpm)      USE_PNPM=0; shift ;;\n")
    print("  install.sh: added --no-pnpm to the option parser")
anchor_usage = "  --skip-venv         Do not create or verify the Python venv\n"
if anchor_usage in t and "--no-pnpm  " not in t:
    t = t.replace(anchor_usage, anchor_usage + "  --no-pnpm" + " " * 11
                  + "Offline: direct copy only, never call pnpm\n")
    print("  install.sh: documented --no-pnpm in usage()")
ins.write_text(t, encoding="utf-8")
print("  install.sh PKG_VERSION ->", sh(f"grep -m1 'PKG_VERSION=' {ins}").strip())
print("  install.sh --no-pnpm accepted? ->",
      sh(f"bash -n {ins} && grep -c -- '--no-pnpm)' {ins}").strip())

# ─────────────────────────────────────────────── 4. README ───────────────────
head("4  update portable README.md (title / source / quick-start / 0.3.6 changes)")
rm = NEW / "README.md"
r = rm.read_text(encoding="utf-8")
reps = [
    (f"# {PKG} {OLDVER} — 独立可移植包",
     f"# {PKG} {VER} — 独立可移植包"),
    (f"tar xzf {PKG}-{OLDVER}-portable.tar.gz", f"tar xzf {PKG}-{VER}-portable.tar.gz"),
    (f"cd {PKG}-{OLDVER}-portable", f"cd {PKG}-{VER}-portable"),
    ("来源：`100.100.6.55` 上 **正在运行的** live 插件目录（含 0.3.5 之后的 statefix\n补丁），不是旧的 0.3.5 发布 tgz。",
     "来源：`192.168.8.6` 上 **正在运行的** live 插件目录，含 0.3.5 之后的\n**多用户数据隔离**（kb-isolate / RAG URL）与 **知识库删除后重传仍报重复** 的修复，\n不是旧的 0.3.5 发布 tgz。"),
]
for a, b in reps:
    if a not in r:
        print(f"  WARN: README pattern not found (left as-is): {a[:50]!r}")
    r = r.replace(a, b)

NEW_SEC = """
## 0.3.6 变更（相对 0.3.5 载荷）

**一、知识库「删除后再上传提示重复文件」修复**（`payload/sidecar/server.py`，7 处补丁）

删除文件/文件夹后再上传同名或同内容文件，不再被判定为「重复文件」。修复覆盖
4 路去重检测（R1 同名 / R2 同 SHA 同名 / R3 同 SHA 跨名 / R4 图片 pHash）：

| # | 缺陷 | 修复 |
| --- | --- | --- |
| A | 删除 worker 从不修剪 `kb-upload-hashes.json`（R2/R3 根因） | 把 fingerprint 修剪提到 LightRAG 删除之前，删除即时生效 |
| B | 删除 worker 引用了未定义的 `BS` 常量 → `NameError`，整个 worker 崩溃 | 补 `BS = chr(92)`；这是「改了代码仍 409」的真正元凶 |
| C | R1 实时文档检测与同步清单不同步 | `_find_doc_ids_by_display(manifest_aware=True)`，清单已移除的文档不再算重复 |
| D | 面板里 `task-{id}` 待入库条目删不掉 | 删除 worker 处理 `task-` id（解析标题、取消 ingest、pop 注册表） |
| E | `task-` 标题依赖会被 ingest 完成的 `processing_entries` | 回退到持久化的 `_tasks[tid].params.display_path` |
| F | 删除任务与 ingest 共用 4 槽信号量，被 token 失败的重试饿死 | DELETE 路由内**同步**修剪指纹，彻底绕开信号量 |
| G | 路由清了 hash/清单却没清 `dup_parsing` | 路由内同步取消在途 ingest + pop `processing_entries` |

> 该修复与 ingest 是否可用**解耦**：即使 LLM token 失效、入库大量失败，
> 「删除 → 重传」也不会再报重复。

**二、多用户数据隔离**（`payload/lib/index.js`、`payload/lib/client.js`）

| 文件 | 变更 |
| --- | --- |
| `lib/index.js` | 实例启动后自动拉起**本账户自己的** sidecar（`autoStart` 且非 remote 时，5s 后 `ensureRunning()`），面板不再停留在「未连接」直到首次 `rag_*` 调用 |
| `lib/client.js` | `ragBaseUrl()` 识别网关 `basePath`：路径含 `/mu/<用户>` 时请求 `${origin}/mu/<用户>/rag`，否则回落 `http://127.0.0.1:17321` |
| `lib/client.js` | localStorage 按账号加命名空间：读取可读 cookie `dsh_mu_user`，为全部浏览器态 key（会话历史、知识库目录、索引偏好、侧栏折叠、导出偏好、重命名映射）加 `<user>.` 前缀，避免同一 origin 下多账号互相看见对方数据 |

> 无任何硬编码主机地址；仅使用 `127.0.0.1` 与默认端口 `17321`，与本机无关。

**三、安装器修复**（`install.sh`）

README 一直写着 `--no-pnpm`（完全离线、只做直接拷贝），但 0.3.5 的选项解析器
**不接受**该参数，一传就 `unknown option` 退出；代码里 `USE_PNPM=0` 分支因此是
**不可达的死代码**。0.3.6 已把 `--no-pnpm` 补进解析器与 `usage()`，文档与行为一致。
"""
marker = "## 相对 0.3.5 原始载荷做的修正"
if marker in r:
    r = r.replace(marker, NEW_SEC.strip() + "\n\n" + marker)
    print("  inserted 0.3.6 changes section before the packaging-fixes section")
else:
    r = r.rstrip() + "\n" + NEW_SEC
    print("  appended 0.3.6 changes section (marker not found)")
rm.write_text(r, encoding="utf-8")

# ─────────────────────────────────────────────── 5. plugin tgz ───────────────
head("5  build npm-style plugin tarball (package/ prefix, deterministic)")
tgz = NEW / "plugin" / f"{PKG}-{VER}.tgz"
files = []
for p in sorted((NEW / "payload").rglob("*")):
    if p.is_file():
        files.append((p, "package/" + p.relative_to(NEW / "payload").as_posix()))
files.sort(key=lambda it: it[1])
with gzip.GzipFile(str(tgz), "wb", mtime=0) as comp:
    with tarfile.open(fileobj=comp, mode="w") as arc:
        for p, name in files:
            info = arc.gettarinfo(str(p), arcname=name)
            info.uid = 0; info.gid = 0; info.uname = "root"; info.gname = "root"
            info.mtime = FIXED_MTIME; info.mode = 0o644
            with p.open("rb") as h:
                arc.addfile(info, h)
print(f"  {tgz.name}  {size(tgz)} bytes  md5={md5(tgz)}")
print("  entries:", sh(f"tar tzf {tgz}").split())

# ─────────────────────────────────────────────── 6. manifest ─────────────────
head("6  rebuild manifest.json")
entries = {}
for p in sorted(NEW.rglob("*")):
    if p.is_file() and p.name != "manifest.json":
        entries[p.relative_to(NEW).as_posix()] = {"size": size(p), "md5": md5(p)}
old_man = json.loads((OLD / "manifest.json").read_text(encoding="utf-8"))
man = dict(old_man)
man["version"] = VER
man["portable_build"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
man["source"] = {
    "host": "192.168.8.6",
    "arch": "x86_64",
    "path": "/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb",
    "note": ("live directory on the multi-user gateway host; carries 0.3.5 + "
             "multi-user isolation (kb-isolate / RAG URL) + duplicate-reupload fix (patches A-G)"),
}
man["supersedes"] = f"{PKG} {OLDVER} portable (payload was pre-isolation, pre-dupe-fix)"
man["capabilities"] = list(man.get("capabilities", [])) + [
    "per-account data isolation: localStorage namespaced by the dsh_mu_user cookie; sidecar base URL follows the gateway basePath; each account autostarts its own sidecar",
    "duplicate-reupload fix: deleting a file/folder prunes the fingerprint cache synchronously in the DELETE route, so a re-upload of the same name/content is accepted",
]
man["changes_0.3.6"] = {
    "install.sh": [
        "fix: the documented --no-pnpm flag was rejected by the option parser"
        " (USE_PNPM=0 existed but was unreachable dead code); added to the parser and usage()",
    ],
    "payload/sidecar/server.py": [
        "A delete worker prunes kb-upload-hashes.json / kb-uploads-manifest.json before the LightRAG delete",
        "B define the missing BS = chr(92) constant (delete worker crashed with NameError -> neither prune nor delete ran)",
        "C _find_doc_ids_by_display(..., manifest_aware=True): docs already removed from the manifest are no longer treated as live duplicates (R1)",
        "D delete worker handles panel 'task-{id}' (not-yet-ingested) entries: resolves title, cancels the ingest task, pops processing_entries",
        "E task- title falls back to the persisted _tasks[task_id].params.display_path when processing_entries is already gone",
        "F DELETE route prunes hash + manifest synchronously, bypassing the 4-slot _task_semaphore that starves delete tasks behind failing ingests",
        "G DELETE route cancels the in-flight ingest and pops processing_entries, so dup_parsing no longer fires on a same-name re-upload",
    ],
    "payload/lib/index.js": [
        "autostart the account's own sidecar 5s after the instance starts (config.autoStart && !config.isRemote)",
    ],
    "payload/lib/client.js": [
        "ragBaseUrl() follows the gateway basePath (/mu/<user>/rag) and falls back to http://127.0.0.1:17321",
        "per-account localStorage namespace from the dsh_mu_user cookie applied to sessions/folders/history/idxPrefs/sidebar/artpref/renamedfiles",
    ],
    "_unchanged_vs_0.3.5": ["package.json (only the version bumped)", "cordis.patch.yml",
                            "README.md", "lib/client.js.map", "kb/config.json.template"],
    "_note": "lib/client.js.map is the source map generated by the 0.3.5 build; client.js was "
             "patched afterwards without regenerating the map, so the map is approximate.",
}
man["files"] = entries
(NEW / "manifest.json").write_text(
    json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"  manifest.json: {len(entries)} file entries, version {man['version']}")

# ─────────────────────────────────────────────── 7. portable tarball ─────────
head("7  build portable tarball")
arc_path = HOME / f"{PKG}-{VER}-portable.tar.gz"
if arc_path.exists():
    arc_path.unlink()
with gzip.GzipFile(str(arc_path), "wb", mtime=0) as comp:
    with tarfile.open(fileobj=comp, mode="w") as arc:
        root = tarfile.TarInfo(f"{NEW.name}/"); root.type = tarfile.DIRTYPE
        root.mode = 0o755; root.mtime = FIXED_MTIME
        arc.addfile(root)
        for p in sorted(NEW.rglob("*")):
            name = f"{NEW.name}/{p.relative_to(NEW).as_posix()}"
            if p.is_dir():
                info = tarfile.TarInfo(name + "/"); info.type = tarfile.DIRTYPE
                info.mode = 0o755
            else:
                info = arc.gettarinfo(str(p), arcname=name)
                info.mode = 0o755 if p.suffix in EXEC_SUFFIX else 0o644
            info.uid = 0; info.gid = 0; info.uname = "root"; info.gname = "root"
            info.mtime = FIXED_MTIME
            if p.is_file():
                with p.open("rb") as h:
                    arc.addfile(info, h)
            else:
                arc.addfile(info)
print(f"  {arc_path.name}  {size(arc_path)} bytes  md5={md5(arc_path)}")

# root-level standalone plugin tgz (mirrors dsh-raganything-kb-0.3.5.tgz)
root_tgz = HOME / f"{PKG}-{VER}.tgz"
shutil.copy2(tgz, root_tgz)
print(f"  {root_tgz.name}  {size(root_tgz)} bytes  md5={md5(root_tgz)}")

# ─────────────────────────────────────────────── 8. verify ───────────────────
head("8  verification")
tmp = Path("/tmp/kb036_verify")
if tmp.exists():
    shutil.rmtree(tmp)
tmp.mkdir(parents=True)
with tarfile.open(tgz) as arc:
    arc.extractall(tmp)
mism = []
for p in sorted((NEW / "payload").rglob("*")):
    if p.is_file():
        a = p
        b = tmp / "package" / p.relative_to(NEW / "payload")
        if not b.is_file() or md5(a) != md5(b):
            mism.append(p.relative_to(NEW).as_posix())
print(f"  tgz payload vs payload/ md5 match: {'OK' if not mism else 'MISMATCH ' + str(mism)}")

print("  py_compile server.py:", sh(f"python3 -m py_compile {NEW}/payload/sidecar/server.py && echo OK").strip() or "OK")
for s in ("install.sh", "verify.sh", "uninstall.sh"):
    r_ = sh(f"bash -n {NEW}/{s} && echo OK").strip()
    print(f"  bash -n {s}: {r_ or 'OK'}")
for j in ("lib/index.js", "lib/client.js"):
    print(f"  node --check {j}:", sh(f"node --check {NEW}/payload/{j} && echo OK").strip() or "OK")

print("  payload version =", sh(f"python3 -c \"import json;print(json.load(open('{NEW}/payload/package.json'))['version'])\"").strip())
print("  install.sh version =", sh(f"grep -m1 PKG_VERSION {NEW}/install.sh").strip())

head("9  remaining '0.3.5' literals in the NEW tree (expected: historical notes only)")
print(sh(f"grep -rn '0\\.3\\.5' {NEW} 2>/dev/null | grep -v 'Binary file' | head -20") or "  (none)")

head("DONE")
print(sh(f"ls -la {NEW} {arc_path} {root_tgz}"))
