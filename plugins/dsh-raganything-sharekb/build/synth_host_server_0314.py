"""合成 0.3.14-sharedkb 的权威 server.py（宿主/用户同一份、host-aware）。

基线 = 8.6 活副本 GLOBAL-server.py（含全部 Phase-4 / session 账本 / 共享目录等补丁，
      但缺 shared-scope forward 块）。
补丁 = 从发行 0.3.13-sharedkb 的 server.py 取出「含 host 守卫的 forward 块」，
      插入 GLOBAL 的 Office 注释块之前，并把第 1 个 scoped 调用点改为 _route_scope_query。

断言（任一不满足即中止，不写盘）：
  A. GLOBAL 原本不含 '# === shared-scope forward'（避免重复插入）
  B. 插入点在 '# Office 产物生成' 注释块之前，且落在两个顶层声明之间
  C. 第 1 个 scoped 调用点所在的 _run_scoped_query_op 调用块唯一可定位
  D. 合成后 forward 块标记齐全、_route_scope_query 有 host 守卫
  E. py_compile 通过
"""
import hashlib
import py_compile
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GLOBAL = HERE / "payload" / "GLOBAL-server.py"
RELEASE = HERE / "extracted" / "server.py"
OUT = HERE / "payload" / "server-0.3.14.py"

# --- 1) 取发行包里的 forward 块（2988..3101 之间，用锚点定位而非行号） ---
rel = RELEASE.read_text(encoding="utf-8")
m = re.search(
    r"^# === shared-scope forward \(2026-09-16\).*?\n^# === end shared-scope forward =+\n",
    rel,
    re.S | re.M,
)
assert m, "发行包中找不到 shared-scope forward 块"
fwd_block = m.group(0)
assert "_shared_is_local()" in fwd_block, "forward 块缺 host 守卫"
assert "正在检索共享知识库（转发至宿主实例）" in fwd_block, "forward 块缺转发文案"
assert fwd_block.endswith("\n"), "forward 块结尾无换行"
print(f"[1] forward 块取出: {len(fwd_block)} bytes, {fwd_block.count(chr(10))} 行")

# --- 2) 基线 GLOBAL ---
g = GLOBAL.read_text(encoding="utf-8")
assert "# === shared-scope forward" not in g, "GLOBAL 已含 forward 块（重复插入）"
assert "_route_scope_query" not in g, "GLOBAL 已含 _route_scope_query（意外）"
assert "_ainsert_dup_safe" in g, "GLOBAL 缺 Phase-4 dup 修复（基线不对）"
assert "kb-sessions.json" in g, "GLOBAL 缺 session 账本（基线不对）"
print("[2] GLOBAL 基线核对通过（含 dup 修复 + session 账本，无 forward 块）")

# --- 3) 定位插入点：'# Office 产物生成' 注释块之前 ---
anchor = "# Office 产物生成（Word / Excel / PPT）"
assert g.count(anchor) == 1, f"锚点 '{anchor}' 出现 {g.count(anchor)} 次"
ai = g.index(anchor)
# 回退到该注释块的起始 '# ----' 分隔线
sep = "# " + "-" * 73
head = g.rfind(sep, 0, ai)
assert head != -1, "找不到 Office 注释块的分隔线"
# 该分隔线之前应是空行
assert g[head - 2:head] == "\n\n", repr(g[head - 3:head])
ins = head
print(f"[3] 插入点 offset={ins}（Office 注释块之前）")

# --- 4) 改第 1 个 scoped 调用点为 _route_scope_query ---
old_call = (
    "            await _run_scoped_query_op(\n"
    "                rag, query_text, _scope_files, _scope_folders,\n"
    "                set_progress, task, q_started,\n"
    "            )\n"
)
new_call = old_call.replace("_run_scoped_query_op", "_route_scope_query")
assert g.count(old_call) == 1, f"scoped 调用点匹配 {g.count(old_call)} 次（应为 1）"
g2 = g.replace(old_call, new_call, 1)
print("[4] scoped 调用点已改为 _route_scope_query（唯一命中）")

# --- 5) 插入 forward 块 ---
g3 = g2[:ins] + fwd_block + "\n" + g2[ins:]

# --- 6) 断言 ---
assert g3.count("# === shared-scope forward") == 1
assert g3.count("# === end shared-scope forward") == 1
assert g3.count("_route_scope_query") == 2, g3.count("_route_scope_query")
assert g3.count("await _route_scope_query(") == 1
assert g3.count("_shared_is_local()") >= 2, "host 守卫未生效"

OUT.write_text(g3, encoding="utf-8", newline="\n")  # ★ newline="\n" 防 CRLF 泄漏
data = OUT.read_bytes()
print(f"[5] 写出 {OUT.name}: {len(data)} bytes, md5={hashlib.md5(data).hexdigest()}")

# --- 7) 语法校验 ---
py_compile.compile(str(OUT), doraise=True)
print("[6] py_compile 通过")

# --- 8) CRLF 泄漏判据 ---
assert b"\r\n" not in data, "CRLF 泄漏！"
print("[7] 无 CRLF 泄漏")

print("\nSYNTH-OK")
