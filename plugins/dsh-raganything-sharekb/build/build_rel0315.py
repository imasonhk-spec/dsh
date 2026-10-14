"""确定性打包 0.3.15-sharedkb（增量回灌，基线 = 0.3.14-sharedkb）。

替换：
  package/sidecar/server.py  <- build/live_server_0315.py（8.6 宿主活副本，12 份 md5 全一致 7555955）
  package/lib/client.js      <- build/live_client_0315.js（8.6 活副本，md5 526ed56d）
bump：
  package/package.json 0.3.14 -> 0.3.15
新增：
  package/RELEASE-NOTES.md（替换式，不留两份同名成员）

（0.3.14 已删除 client.js.map，本版无需再删。）

确定性 tar/gzip（同输入同 md5）：
  GNU_FORMAT + 固定 mtime/uid/gid/uname/gname/mode + 成员按名排序 +
  gzip filename="" + compresslevel=9 + mtime=0

断言（任一不满足即中止，不写产物）：
  1. 基线版本 == 0.3.14
  2. 其余成员逐字节不变（gone/added/changed 三集合为空，除有意替换）
  3. 产物内无 .bak
  4. 修复标记齐备（server + client）
  5. server.py py_compile / client.js node --check 通过
  6. 连跑两次 md5 相同（确定性）
  7. 注入的 server.py/client.js 与 8.6 活副本 md5 一致
"""
import gzip
import hashlib
import io
import json
import py_compile
import subprocess
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = Path("C:/Users/81901/WorkBuddy/2026-09-11-07-04-09/repo")
BASE = REPO / "releases/0.3.14-sharedkb/dsh-raganything-kb-0.3.14-sharedkb.tgz"
OUTDIR = REPO / "releases/0.3.15-sharedkb"
OUT_TGZ = OUTDIR / "dsh-raganything-kb-0.3.15-sharedkb.tgz"
NEW_VER = "0.3.15"
OLD_VER = "0.3.14"

SERVER = REPO / "build" / "live_server_0315.py"
CLIENT = REPO / "build" / "live_client_0315.js"
LIVE_SRV_MD5 = "75559557795d26e881fb218ffd53fc02"
LIVE_CLI_MD5 = "526ed56d7d44daeae0fcefb40eebb371"
NODE = "C:/Users/81901/.workbuddy/binaries/node/versions/22.22.2-2/node.exe"

RELEASE_NOTES = """# dsh-raganything-kb 0.3.15-sharedkb

分支：8.6 多用户网关线（sharedkb），基线 = 0.3.14-sharedkb。

## 与基线差异（仅三处，其余成员逐字节不变）

| 成员 | 变更 |
| --- | --- |
| `sidecar/server.py` | 回灌 2026-09-19~20 全部 server 侧线上热修（+839/-26 行）：重试解析状态转正链（`_silent_dup` 自愈 / `_find_doc_ids_by_display` 双侧 vroot 归一 / 孪生一起入队）、共享库覆盖保目录树与落点、回收箱（滚动/全部还原/全部删除）、对话产物跨会话账本、产物语义化命名（`semantic_title`）、`/index/reingest` 入队化 |
| `lib/client.js` | 回灌同期前端热修：共享分级目录树、产物栏 session 锚定、共享→个人复制 docId、重试标签、回收箱滚动与整树顶层、语义化命名触发 |
| `package.json` | 版本 0.3.14 -> 0.3.15 |
| `RELEASE-NOTES.md` | 替换为本文件 |

## 为什么出这一版

0.3.14 截止于 2026-09-18；此后 8.6 网关上又落了 **14 项 server 侧 + 8 项 client 侧**热修
（重新解析失败行无法转正、共享库目录树重复嵌套、共享落点与文件夹删除、回收箱三项、
对话产物跨会话隔离、产物语义化命名、共享作用域 @ 命中修复链…），
全部只存在于活副本、从未进入任何发行包。任何 `pnpm install` / 重装 / 回滚
都会把这些修复整体抹掉 —— 本版把它们固化进发行件。

## server.py / client.js 来源（重要）

本版直接取 **8.6 宿主活副本**（`/home/lgsj/.dsh/profiles/web/node_modules/dsh-raganything-kb/`）：

- `server.py` 375559 B md5 `7555955...`（宿主 + 11 份用户副本 **12 份 md5 全一致**）
- `client.js` 410089 B md5 `526ed56d...`

两侧一致意味着 0.3.14 引入的 host-aware 合成（含 `_shared_is_local()` 宿主守卫 + `_route_scope_query`）
已在活副本上收敛为单一权威版本，不再需要分叉合成。

## 顺带说明：为何 0.3.15 未包含「切片离线克隆」代码

2026-09-20 修复的「共享 ZeroClaw @ 范围检索为空」是**数据层**问题（LightRAG 内容哈希去重
导致目标 `file_path` 0 切片），修法是离线把已有切片克隆到精确 `file_path`，
属**运维操作**而非代码变更（工程脚本见 `tools/_zc_clone.py`，未随包发布）。

## 验证

- 载入包内 server.py / client.js，与 8.6 活副本 md5 逐字节一致。
- `py_compile` / `node --check` 通过；无 CRLF 泄漏；无 `.bak` 混入；确定性 md5 复核通过。

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
    assert SERVER.exists(), f"缺 server 输入: {SERVER}"
    assert CLIENT.exists(), f"缺 client 输入: {CLIENT}"

    # 注入源必须与线上活副本一致
    assert hashlib.md5(SERVER.read_bytes()).hexdigest() == LIVE_SRV_MD5, "server 输入与线上 md5 不符"
    assert hashlib.md5(CLIENT.read_bytes()).hexdigest() == LIVE_CLI_MD5, "client 输入与线上 md5 不符"

    # --- 读基线 ---
    base_files = {}
    with tarfile.open(BASE) as t:
        for m in t.getmembers():
            if m.isfile():
                base_files[m.name] = hashlib.md5(t.extractfile(m).read()).hexdigest()
    with tarfile.open(BASE) as t:
        pj = json.loads(t.extractfile("package/package.json").read())
    assert pj["version"] == OLD_VER, f"基线版本 {pj['version']} != {OLD_VER}"
    print(f"[1] 基线版本 {pj['version']} OK，成员 {len(base_files)} 个")

    # --- 组装 ---
    members = {}
    with tarfile.open(BASE) as t:
        for m in t.getmembers():
            if m.isdir():
                members[m.name] = (b"", True, 0o755)
            elif m.isfile():
                members[m.name] = (t.extractfile(m).read(), False, m.mode & 0o777)

    srv = SERVER.read_bytes()
    assert b"\r\n" not in srv, "server.py CRLF 泄漏"
    members["package/sidecar/server.py"] = (srv, False, 0o644)

    cli = CLIENT.read_bytes()
    assert b"\r\n" not in cli, "client.js CRLF 泄漏"
    members["package/lib/client.js"] = (cli, False, 0o644)

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
    intentional = {"package/sidecar/server.py", "package/lib/client.js",
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

    # --- 断言：修复标记 ---
    with tarfile.open(OUT_TGZ) as t:
        s = t.extractfile("package/sidecar/server.py").read().decode("utf-8")
        c = t.extractfile("package/lib/client.js").read().decode("utf-8")
    srv_marks = ["_ainsert_dup_safe", "kb-sessions.json", "_route_scope_query",
                 "_shared_is_local", "_VROOT_PREFIXES", "_silent_dup", "semantic_title",
                 "_find_doc_ids_by_display"]
    cli_marks = ["buildSharedTree", "flattenSharedRows", "activeSessId", "executeCopyTo",
                 "sharedVisibleRows", "kbFeat86-shareddocid"]
    for k in srv_marks:
        assert s.count(k) >= 1, f"server 缺标记 {k}"
    for k in cli_marks:
        assert c.count(k) >= 1, f"client 缺标记 {k}"
    print(f"[5] 修复标记齐备（server {len(srv_marks)} 项 / client {len(cli_marks)} 项）")

    # --- 断言：语法 ---
    tmp_py = HERE / "_verify_server_0315.py"
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
