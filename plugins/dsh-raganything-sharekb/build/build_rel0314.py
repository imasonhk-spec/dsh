"""确定性打包 0.3.14-sharedkb（增量回灌，基线 = 0.3.13-sharedkb）。

替换：
  package/sidecar/server.py  <- payload/server-0.3.14.py（合成 host-aware，含全部 Phase-4）
  package/lib/client.js      <- payload/client.js（b41f84aa，11 份用户副本同源，严格超集）
  package/lib/client.js.map  <- 同步删除（与新 client.js 不匹配，避免误导调试器）
bump：
  package/package.json 0.3.13 -> 0.3.14
新增：
  package/RELEASE-NOTES.md（替换式，不留两份同名成员）

确定性 tar/gzip（同输入同 md5）：
  GNU_FORMAT + 固定 mtime/uid/gid/uname/gname/mode + 成员按名排序 +
  gzip filename="" + compresslevel=9 + mtime=0

断言（任一不满足即中止，不写产物）：
  1. 基线版本 == 0.3.13
  2. 其余成员逐字节不变（gone/added/changed 三集合为空，除有意替换）
  3. 产物内无 .bak
  4. 4 类修复标记齐备
  5. server.py py_compile / client.js node --check 通过
  6. 连跑两次 md5 相同（确定性）
"""
import gzip
import hashlib
import io
import json
import os
import py_compile
import subprocess
import sys
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = Path("C:/Users/81901/WorkBuddy/2026-09-11-07-04-09/repo/releases/0.3.13-sharedkb/dsh-raganything-kb-0.3.13-sharedkb.tgz")
OUTDIR = Path("C:/Users/81901/WorkBuddy/2026-09-11-07-04-09/repo/releases/0.3.14-sharedkb")
OUT_TGZ = OUTDIR / "dsh-raganything-kb-0.3.14-sharedkb.tgz"
NEW_VER = "0.3.14"
OLD_VER = "0.3.13"

SERVER = HERE / "payload" / "server-0.3.14.py"
CLIENT = HERE / "payload" / "client.js"
NODE = "C:/Users/81901/.workbuddy/binaries/node/versions/22.22.2-2/node.exe"

RELEASE_NOTES = """# dsh-raganything-kb 0.3.14-sharedkb

分支：8.6 多用户网关线（sharedkb），基线 = 0.3.13-sharedkb。

## 与基线差异（仅三处，其余成员逐字节不变）

| 成员 | 变更 |
| --- | --- |
| `sidecar/server.py` | 合入宿主/用户同一份 host-aware 权威版：新增 shared-scope forward 块（含宿主守卫），并补齐 Phase-4 dup 自愈、session 产物账本、重试/回收等全部 server 侧修复 |
| `lib/client.js` | 更新为 8.6 全量热修版（共享分级目录树 / 产物栏 session 锚定 / 共享→个人复制 docId 修复 / 重试标签 / .md 排除 / activeDir 过滤） |
| `lib/client.js.map` | 移除（旧 sourcemap 与新版 client.js 不匹配，保留会误导调试器） |
| `package.json` | 版本 0.3.13 -> 0.3.14 |
| `RELEASE-NOTES.md` | 替换为本文件 |

## 为什么出这一版

0.3.13 只含「@ 共享作用域转发」一项修复；8.6 网关上 2026-09-17~18 又落了 13 个 server 侧与 8 个 client 侧热修，
全部只存在于活副本、从未进入任何发行包。任何 `pnpm install` / 重装 / 回滚都会把上述修复整体抹掉。

## server.py 合成口径（重要）

8.6 活副本的 server.py 是**分叉**的：

- 宿主 GLOBAL（`/home/lgsj/.dsh/profiles/web`，PORT=17321）：含全部 Phase-4/session 修复，但**无** forward 块。
- 用户副本（多用户 home，PORT=3200N）：含 forward 块（无宿主守卫），且与宿主仅在 2 行上有差异。

直接拿任一份装到另一侧都会坏：

- 宿主装用户份 -> 无守卫、转发自环（宿主自己就是共享库本体）。
- 用户装宿主份 -> forward 块丢失，`@` 共享作用域回退为「本地跑、0 命中」。

本版 server.py = 以宿主 GLOBAL 活副本为底，插入 0.3.13 发行包中**带 `_shared_is_local()` 宿主守卫**
的 forward 块，并把唯一的 scoped 调用点改为 `_route_scope_query`。因此同一个文件同时正确服务两侧：

- 宿主 `_shared_is_local()` == True（SHARED_BASE 端口 == PORT）-> 本地检索，不转发。
- 用户 `_shared_is_local()` == False（3200N != 17321）-> 转发宿主 sidecar。

## 验证

- 载入包内 server.py 与 client.js，与 8.6 活副本逐项比对：client.js 与 11 份用户副本 md5 完全一致。
- 4 类修复标记齐备（server: `_ainsert_dup_safe` / `kb-sessions.json` / `_route_scope_query` / `_shared_is_local`；
  client: `buildSharedTree` / `activeSessId` / `executeCopyTo` / `sharedVisibleRows`）。
- `py_compile` / `node --check` 通过；无 CRLF 泄漏；无 `.bak` 混入；确定性 md5 复核通过。

## 部署注意

换用本包需同步改 12 份 profile 的依赖（宿主 + 11 用户 home）并重算 pnpm-lock integrity，
否则重装仍会按旧 tgz 还原。宿主重启 `systemctl restart raganything-sidecar`（独立服务，`restart dsh-web` 不会带上它），
用户实例用 `POST :3200N/models/restart` 或整服务重启 `dsh-web`。
"""


def deterministic_tar(members, out_path):
    """members: list of (name, bytes, is_dir, mode)"""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w", format=tarfile.GNU_FORMAT) as t:
        for name in sorted(members):  # 字典序 -> 父目录先于子项
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

    # --- 读基线 ---
    base_files = {}
    members = {}
    with tarfile.open(BASE) as t:
        for m in t.getmembers():
            if m.isfile():
                base_files[m.name] = hashlib.md5(t.extractfile(m).read()).hexdigest()

    # 断言基线版本
    with tarfile.open(BASE) as t:
        pj = json.loads(t.extractfile("package/package.json").read())
    assert pj["version"] == OLD_VER, f"基线版本 {pj['version']} != {OLD_VER}"
    print(f"[1] 基线版本 {pj['version']} OK，成员 {len(base_files)} 个")

    # --- 组装新包 ---
    with tarfile.open(BASE) as t:
        for m in t.getmembers():
            if m.isdir():
                members[m.name] = (b"", True, 0o755)
            elif m.isfile():
                members[m.name] = (t.extractfile(m).read(), False, m.mode & 0o777)

    # 1) 替换 server.py
    srv = SERVER.read_bytes()
    assert b"\r\n" not in srv, "server.py CRLF 泄漏"
    members["package/sidecar/server.py"] = (srv, False, 0o644)

    # 2) 替换 client.js
    cli = CLIENT.read_bytes()
    assert b"\r\n" not in cli, "client.js CRLF 泄漏"
    members["package/lib/client.js"] = (cli, False, 0o644)

    # 3) 删除失配的 sourcemap
    dropped = {"package/lib/client.js.map"}
    for d in dropped:
        members.pop(d, None)

    # 4) 替换 RELEASE-NOTES（替换式）
    members["package/RELEASE-NOTES.md"] = (RELEASE_NOTES.encode("utf-8"), False, 0o644)

    # 5) bump 版本
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
    intentional = {"package/sidecar/server.py", "package/lib/client.js",
                   "package/package.json", "package/RELEASE-NOTES.md"}
    gone = set(base_files) - set(new_files) - dropped
    added = set(new_files) - set(base_files)
    changed = {n for n in (set(base_files) & set(new_files))
               if base_files[n] != new_files[n]} - intentional
    assert not gone, f"意外丢失成员: {gone}"
    assert not added, f"意外新增成员: {added}"
    assert not changed, f"意外变更成员: {changed}"
    print(f"[3] 逐字节不变断言通过（有意替换 {len(intentional)} + 删除 {len(dropped)}）")

    # --- 断言：无 .bak ---
    assert not [n for n in new_files if ".bak" in n], "产物混入 .bak"
    print("[4] 无 .bak 混入")

    # --- 断言：修复标记 ---
    with tarfile.open(OUT_TGZ) as t:
        s = t.extractfile("package/sidecar/server.py").read().decode("utf-8")
        c = t.extractfile("package/lib/client.js").read().decode("utf-8")
    srv_marks = ["_ainsert_dup_safe", "kb-sessions.json", "_route_scope_query",
                 "_shared_is_local", "_clear_duplicate_blocker", "_VROOT_PREFIXES"]
    cli_marks = ["buildSharedTree", "flattenSharedRows", "activeSessId", "executeCopyTo",
                 "sharedVisibleRows", "kbFeat86-shareddocid"]
    for k in srv_marks:
        assert s.count(k) >= 1, f"server 缺标记 {k}"
    for k in cli_marks:
        assert c.count(k) >= 1, f"client 缺标记 {k}"
    print(f"[5] 修复标记齐备（server {len(srv_marks)} 项 / client {len(cli_marks)} 项）")

    # --- 断言：语法 ---
    tmp_py = HERE / "_verify_server.py"
    tmp_py.write_bytes(srv)
    py_compile.compile(str(tmp_py), doraise=True)
    tmp_py.unlink()
    r = subprocess.run([NODE, "--check", str(CLIENT)], capture_output=True)
    assert r.returncode == 0, r.stderr.decode()
    print("[6] py_compile + node --check 通过")

    # --- 断言：确定性 ---
    deterministic_tar(members, OUT_TGZ)
    md5b = hashlib.md5(OUT_TGZ.read_bytes()).hexdigest()
    assert md5a == md5b, f"不确定性: {md5a} != {md5b}"
    print(f"[7] 确定性复核通过 md5={md5b}")

    print(f"\nBUILD-OK {OUT_TGZ}")
    return OUT_TGZ, md5b


if __name__ == "__main__":
    build()
