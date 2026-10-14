"""确定性打包 0.3.17-sharedkb（增量回灌，基线 = 0.3.16-sharedkb）。

替换（来源 = 8.6 宿主活副本，均 LF-clean）：
  package/lib/client.js  <- build/live_client_0317.js
      md5 f5e7e7cfddcadbf12d547b9db2bd1a21, 415617 B（基线 526ed56d…, 410089 B）
  package/lib/index.js   <- build/live_index_0317.js
      md5 375437b25223fac25474bcf19d4fcc30, 36473 B（基线 e8430c4d…, 36437 B）
bump：
  package/package.json 0.3.16 -> 0.3.17
替换：
  package/RELEASE-NOTES.md（替换式，不留两份同名成员）

不动：
  package/sidecar/server.py（与 0.3.16 逐字节相同，显式断言）

确定性 tar/gzip（同输入同 md5）：GNU_FORMAT + 固定 mtime/uid/gid/uname/gname/mode
+ 成员按名排序 + gzip filename="" + compresslevel=9 + mtime=0

断言（任一不满足即中止，不写产物）：
  1. 基线版本 == 0.3.16
  2. 其余成员逐字节不变（gone/added/changed 三集合为空，除有意替换 4 项）
  3. 产物内无 .bak
  4. server.py 与基线逐字节相同（本版未动 server 侧）
  5. 修复标记齐备（client 新标记 + 沿用标记）
  6. 两个 js node --check 通过、无 CRLF
  7. 连跑两次 md5 相同（确定性）
"""
import gzip
import hashlib
import io
import json
import subprocess
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = Path("C:/Users/81901/WorkBuddy/2026-09-11-07-04-09/repo")
BASE = REPO / "releases/0.3.16-sharedkb/dsh-raganything-kb-0.3.16-sharedkb.tgz"
OUTDIR = REPO / "releases/0.3.17-sharedkb"
OUT_TGZ = OUTDIR / "dsh-raganything-kb-0.3.17-sharedkb.tgz"
NEW_VER = "0.3.17"
OLD_VER = "0.3.16"

CLIENT = REPO / "build" / "live_client_0317.js"
INDEX = REPO / "build" / "live_index_0317.js"
LIVE_CLI_MD5 = "f5e7e7cfddcadbf12d547b9db2bd1a21"
LIVE_CLI_SIZE = 415617
LIVE_IDX_MD5 = "375437b25223fac25474bcf19d4fcc30"
LIVE_IDX_SIZE = 36473
# server.py 应与基线完全相同（本版未动 server 侧）
BASE_SRV_MD5 = "cc60b66917834cc7d0c6de1ddfe29b9a"
NODE = "C:/Users/81901/.workbuddy/binaries/node/versions/22.22.2-2/node.exe"

RELEASE_NOTES = """# dsh-raganything-kb 0.3.17-sharedkb

分支：8.6 多用户网关线（sharedkb），基线 = 0.3.16-sharedkb。

## 与基线差异（仅四处，其余成员逐字节不变）

| 成员 | 变更 |
| --- | --- |
| `lib/client.js` | 回灌 2026-09-22 以来全部 client 侧线上热修（410089 B -> 415617 B）：① **0.1.7 图标兼容**（`kbIcons071`：`IconX14/16` 尺寸后缀 -> `IconXRegular` 字重后缀，随 DSH 0.1.7-alpha.2 升级落地的适配，缺了即 React #130 整条 UI 消失）；② **KB 面板与 DSH 导航栏联动**：`closeKbPanel`（Esc/关闭 = 回主页并展开侧栏）、`softCloseKb`（点其他面板即轻量收起覆盖层）、主面板切换监视（`usePanelInfo`/`activePanelId`）、导航栏捕获阶段点击兜底；③ **侧栏跟随**：打开期间跟踪 DSH 侧栏列宽发布为 `--dsh-kb-left`，fixed 覆盖层始终位于导航栏右侧；④ 工件栏/模型面板等 CSS 增量 |
| `lib/index.js` | **工具 schema 修复**（对齐 `tools/patch_kb_tool_schema86.py`）：`rag_query` / `rag_ingest` / `rag_note` / `rag_delete` 等工具把属性对象内部的 `required: true` 移到 `parameters` 顶层 `required` 数组——旧写法会被 OpenAI/Gemini 严格端点判 400（`Invalid schema for function ...: True is not of type 'array'`） |
| `package.json` | 版本 0.3.16 -> 0.3.17 |
| `RELEASE-NOTES.md` | 替换为本文件 |

## 不变项（显式断言）

- `sidecar/server.py` 与 0.3.16 逐字节相同（`cc60b669…`，383404 B）—— 本版未动 server 侧。
- 其余成员（cordis.patch.yml / kb/config.json.template / sidecar/viewer/ 等）逐字节不变。

## 为什么要出这一版

0.3.16 截止于 2026-09-22；此后 8.6 上又落了两类只存在于活副本的热修：
① 2026-09-23 DSH 升级 0.1.7-alpha.2 后的图标字重后缀适配（漏了即知识库面板整条消失）；
② 2026-09-24 的 KB 工具 schema 修复（严格 OpenAI 兼容端点 400 的真根因）。
任何 `pnpm install` / 重装 / 回滚都会把这些修复整体抹掉 —— 本版把它们固化进发行件。

## 验证

- 包内 `lib/client.js` / `lib/index.js` 与 8.6 宿主活副本逐字节一致（LF-clean，无 CRLF）。
- 修复标记齐备（见 build_rel0317.py 断言 5）。
- `node --check` 通过；无 `.bak` 混入；确定性 md5 复核通过（连跑两次同 md5）。

## 部署注意

换用本包需同步改 12 份 profile 的依赖（宿主 + 11 用户 home）并重算 pnpm-lock integrity，
否则重装仍会按旧 tgz 还原。宿主重启 `systemctl restart raganything-sidecar`（独立服务）；
用户实例用 `POST :3200N/models/restart` 或整服务重启 `dsh-web`。
"""


def deterministic_tar(members, out_path):
    """members: dict name -> (bytes, is_dir, mode)"""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w", format=tarfile.GNU_FORMAT) as t:
        for name in sorted(members):
            data, is_dir, mode = members[name]
            ti = tarfile.TarInfo(name)
            ti.mtime = 1_700_000_000
            ti.uid = ti.gid = 0
            ti.uname = ti.gname = "root"
            if is_dir:
                ti.type = tarfile.DIRTYPE
                ti.mode = 0o755
                ti.size = 0
                t.addfile(ti)
            else:
                ti.type = tarfile.REGTYPE
                ti.mode = mode
                ti.size = len(data)
                t.addfile(ti, io.BytesIO(data))
    raw = buf.getvalue()
    out = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=out, compresslevel=9, mtime=0) as gz:
        gz.write(raw)
    out_path.write_bytes(out.getvalue())


def build():
    assert BASE.exists(), f"基线不存在: {BASE}"
    assert CLIENT.exists() and INDEX.exists(), "缺 live 输入"

    cli = CLIENT.read_bytes()
    idx = INDEX.read_bytes()
    assert len(cli) == LIVE_CLI_SIZE and hashlib.md5(cli).hexdigest() == LIVE_CLI_MD5, "client 输入不符"
    assert len(idx) == LIVE_IDX_SIZE and hashlib.md5(idx).hexdigest() == LIVE_IDX_MD5, "index 输入不符"
    assert b"\r" not in cli and b"\r" not in idx, "js 输入含 CRLF"

    # --- 读基线 ---
    base_files = {}
    with tarfile.open(BASE) as t:
        for m in t.getmembers():
            if m.isfile():
                base_files[m.name] = hashlib.md5(t.extractfile(m).read()).hexdigest()
    with tarfile.open(BASE) as t:
        pj = json.loads(t.extractfile("package/package.json").read())
    assert pj["version"] == OLD_VER, f"基线版本 {pj['version']} != {OLD_VER}"
    assert base_files["package/sidecar/server.py"] == BASE_SRV_MD5, "基线 server.py md5 不符"
    print(f"[1] 基线版本 {pj['version']} OK，成员 {len(base_files)} 个")

    # --- 组装 ---
    members = {}
    with tarfile.open(BASE) as t:
        for m in t.getmembers():
            if m.isdir():
                members[m.name] = (b"", True, 0o755)
            elif m.isfile():
                members[m.name] = (t.extractfile(m).read(), False, m.mode & 0o777)

    members["package/lib/client.js"] = (cli, False, 0o644)
    members["package/lib/index.js"] = (idx, False, 0o644)
    members["package/RELEASE-NOTES.md"] = (RELEASE_NOTES.encode("utf-8"), False, 0o644)
    pj2 = dict(pj)
    pj2["version"] = NEW_VER
    members["package/package.json"] = (
        (json.dumps(pj2, indent=2, ensure_ascii=False) + "\n").encode("utf-8"), False, 0o644)

    OUTDIR.mkdir(parents=True, exist_ok=True)
    deterministic_tar(members, OUT_TGZ)
    md5a = hashlib.md5(OUT_TGZ.read_bytes()).hexdigest()
    print(f"[2] 打出 {OUT_TGZ.name}: {OUT_TGZ.stat().st_size} B  md5={md5a}")

    # --- 断言：其余成员逐字节不变 ---
    with tarfile.open(OUT_TGZ) as t:
        new_files = {m.name: hashlib.md5(t.extractfile(m).read()).hexdigest()
                     for m in t.getmembers() if m.isfile()}
    intentional = {"package/lib/client.js", "package/lib/index.js",
                   "package/package.json", "package/RELEASE-NOTES.md"}
    gone = set(base_files) - set(new_files)
    added = set(new_files) - set(base_files)
    changed = {n for n in (set(base_files) & set(new_files))
               if base_files[n] != new_files[n]} - intentional
    assert not gone, f"意外丢失成员: {gone}"
    assert not added, f"意外新增成员: {added}"
    assert not changed, f"意外变更成员: {changed}"
    print(f"[3] 逐字节不变断言通过（有意替换 {len(intentional)}）")

    assert not [n for n in new_files if ".bak" in n], "产物混入 .bak"
    print("[4] 无 .bak 混入")
    assert new_files["package/sidecar/server.py"] == BASE_SRV_MD5, "server.py 被意外改动"
    print("[4b] server.py 与基线逐字节相同（本版未动 server 侧）")

    # --- 断言：修复标记 ---
    with tarfile.open(OUT_TGZ) as t:
        c = t.extractfile("package/lib/client.js").read().decode("utf-8")
        i = t.extractfile("package/lib/index.js").read().decode("utf-8")
    cli_marks = ["kbIcons071", "IconThinkOutlineRegular", "closeKbPanel", "softCloseKb",
                 "--dsh-kb-left", "buildSharedTree", "flattenSharedRows", "activeSessId",
                 "executeCopyTo", "sharedVisibleRows", "kbFeat86-shareddocid"]
    for k in cli_marks:
        assert c.count(k) >= 1, f"client 缺标记 {k}"
    # schema 修复：不允许属性级 required:true（严格端点 400 根因）
    assert "required: true" not in i, "index.js 仍含属性级 required:true"
    for k in ["required: ['query']", "required: ['path']", "required: ['doc_id']",
              "required: ['title', 'text']"]:
        assert k in i, f"index.js 缺顶层 required {k}"
    print(f"[5] 修复标记齐备（client {len(cli_marks)} 项 + index schema 4 项）")

    # --- 断言：语法 ---
    for b, name in ((cli, "_verify_client_0317.js"), (idx, "_verify_index_0317.js")):
        tmp = HERE / name
        tmp.write_bytes(b)
        r = subprocess.run([NODE, "--check", str(tmp)], capture_output=True)
        tmp.unlink()
        assert r.returncode == 0, r.stderr.decode()
    print("[6] node --check x2 通过")

    # --- 断言：确定性 ---
    deterministic_tar(members, OUT_TGZ)
    md5b = hashlib.md5(OUT_TGZ.read_bytes()).hexdigest()
    assert md5a == md5b, f"不确定性: {md5a} != {md5b}"
    print(f"[7] 确定性复核通过 md5={md5b}")

    print(f"\nBUILD-OK {OUT_TGZ}")
    return OUT_TGZ, md5b


if __name__ == "__main__":
    build()
