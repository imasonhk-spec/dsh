#!/usr/bin/env python3
"""dsh-raganything-kb: 下线「DSH产物 / 知识库产物」知识库文件夹, 新增对话框右侧
可折叠「对话产物」栏 (含 @文件 引用)。

用法:
    python kb_artifact_rail_patch.py <plugin_dir> [--out <dir>] [--check]

改动清单 (client.js):
  E1  CSS 追加 chatRow / chatLeft / artRail* 规则
  E2  class map 追加新键
  E3  pinnedFolders -> artifactGroups (只保留对话产物, 供右侧栏使用)
  E4  folders 不再并入 pinned 节点
  E5  新增 artRailCollapsed 状态 + 本地持久化
  E6  新增 KbArtifactRail 组件
  E7  chat 区域改为 row 布局: [chatLeft, 产物栏]
  E8  移除「DSH产物/知识库产物 纳入全局检索」两个开关
  E9  补齐 zh/en 文案
改动清单 (sidecar/server.py):
  S1  _excluded_prefixes 恒定排除两个产物命名空间 (全局问答永不含产物)
  S2  DSH 工作区产物自动入库默认关闭
"""
import argparse
import os
import re
import shutil
import sys

T = lambda n: "\t" * n

NEW_CSS = (
    ".Y4cvAW_chatRow{flex-direction:row}"
    ".Y4cvAW_chatLeft{position:relative;flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}"
    ".Y4cvAW_artRail{box-sizing:border-box;flex:none;display:flex;flex-direction:column;width:236px;"
    "border-left:1px solid var(--dsw-alias-divider-strong,var(--dsw-alias-divider));"
    "background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));overflow:hidden;"
    "--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);"
    "--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}"
    ".Y4cvAW_artRail.Y4cvAW_artRailCollapsed{width:40px}"
    ".Y4cvAW_artRailRail{flex:1;width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;"
    "padding:10px 0;cursor:pointer;background:0 0;border:none;font-family:inherit;"
    "color:var(--dsw-alias-label-secondary)}"
    ".Y4cvAW_artRailRail:hover{background:var(--dsw-alias-interactive-bg-hover);"
    "color:var(--dsw-alias-label-primary)}"
    ".Y4cvAW_artRailVert{writing-mode:vertical-rl;font-size:11.5px;line-height:16px;letter-spacing:2px;"
    "white-space:nowrap}"
    ".Y4cvAW_artRailHead{flex:none;display:flex;align-items:center;gap:6px;min-height:46px;"
    "padding:10px 8px 6px 12px}"
    ".Y4cvAW_artRailTitle{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:12.5px;"
    "font-weight:600;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    ".Y4cvAW_artRailCount{flex:none;box-sizing:border-box;min-width:18px;height:18px;padding:0 5px;"
    "border-radius:9px;background:var(--dsw-alias-interactive-bg-hover);"
    "color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px;text-align:center}"
    ".Y4cvAW_artRailToggle{flex:none;box-sizing:border-box;cursor:pointer;width:24px;height:24px;"
    "display:grid;place-items:center;color:var(--dsw-alias-label-secondary);background:0 0;border:none;"
    "border-radius:7px;padding:0;font-family:inherit}"
    ".Y4cvAW_artRailToggle:hover{background:var(--dsw-alias-interactive-bg-hover);"
    "color:var(--dsw-alias-label-primary)}"
    ".Y4cvAW_artRailBody{flex:1;min-height:0;overflow-y:auto;padding:0 8px 14px}"
    ".Y4cvAW_artRailGroup{margin-bottom:12px}"
    ".Y4cvAW_artRailGroupHead{display:flex;align-items:center;gap:6px;padding:4px 6px;"
    "color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;overflow:hidden}"
    ".Y4cvAW_artRailGroupName{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    ".Y4cvAW_artRailGroupCount{flex:none;opacity:.7}"
    ".Y4cvAW_artRailFile{display:flex;align-items:center;gap:4px;border-radius:8px;padding:1px 2px 1px 6px}"
    ".Y4cvAW_artRailFile:hover{background:var(--dsw-alias-interactive-bg-hover)}"
    ".Y4cvAW_artRailFileMain{flex:1;min-width:0;display:flex;align-items:center;gap:6px;cursor:pointer;"
    "background:0 0;border:none;padding:5px 0;font-family:inherit;font-size:12.5px;line-height:18px;"
    "color:var(--dsw-alias-label-primary);text-align:left}"
    ".Y4cvAW_artRailExt{flex:none;box-sizing:border-box;padding:0 4px;border-radius:5px;"
    "background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);"
    "font-size:10px;line-height:15px;text-transform:uppercase}"
    ".Y4cvAW_artRailName{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    ".Y4cvAW_artRailAt{flex:none;box-sizing:border-box;cursor:pointer;height:22px;padding:0 7px;"
    "border-radius:7px;border:1px solid var(--dsw-alias-border-strong,var(--dsw-alias-divider));"
    "background:0 0;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:11px;"
    "line-height:20px;white-space:nowrap}"
    ".Y4cvAW_artRailAt:hover{border-color:var(--dsw-alias-accent,#0d9d97);"
    "color:var(--dsw-alias-accent,#0d9d97)}"
    ".Y4cvAW_artRailEmpty{padding:18px 10px;color:var(--dsw-alias-label-secondary);font-size:12px;"
    "line-height:18px;text-align:center;opacity:.8}"
)

NEW_CLASS_KEYS = [
    "artRail", "artRailAt", "artRailBody", "artRailCollapsed", "artRailCount",
    "artRailEmpty", "artRailExt", "artRailFile", "artRailFileMain", "artRailGroup",
    "artRailGroupCount", "artRailGroupHead", "artRailGroupName", "artRailHead",
    "artRailName", "artRailRail", "artRailTitle", "artRailToggle", "artRailVert",
    "chatLeft", "chatRow",
]

RAIL_COMPONENT = '''		/**
		* 对话框右侧的「对话产物」栏：收纳知识库问答导出为 Word/Excel/PPT/Markdown
		* 的产物文件，可折叠。每个文件后的「@文件」把该产物作为引用加进当前对话，
		* 走 sidecar 的 scope 分支做精确检索（不受全局问答的产物排除影响）。
		* 产物不再出现在个人知识库目录树里。
		*/
		function KbArtifactRail({ groups, total, collapsed, onToggle, onMention, onOpen, t }) {
			const cssMod = KnowledgeBaseRoot_module_css_default;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: clsx(cssMod.artRail, collapsed && cssMod.artRailCollapsed),
				"aria-label": t("kb.artifacts"),
				children: collapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: cssMod.artRailRail,
					title: t("kb.artifactsExpand"),
					"aria-label": t("kb.artifactsExpand"),
					onClick: onToggle,
					children: [
						total > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cssMod.artRailCount,
							children: total
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cssMod.artRailVert,
							children: t("kb.artifacts")
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: cssMod.artRailHead,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: cssMod.artRailTitle,
									children: t("kb.artifacts")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: cssMod.artRailCount,
									children: total
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: cssMod.artRailToggle,
									title: t("kb.artifactsCollapse"),
									"aria-label": t("kb.artifactsCollapse"),
									onClick: onToggle,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 14 })
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: cssMod.artRailBody,
							children: groups.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: cssMod.artRailEmpty,
								children: t("kb.artifactsEmpty")
							}) : groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: cssMod.artRailGroup,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: cssMod.artRailGroupHead,
										title: group.dir,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: cssMod.artRailGroupName,
												children: group.dir.split("/").pop()
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: cssMod.artRailGroupCount,
												children: group.files.length
											})
										]
									}),
									group.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: cssMod.artRailFile,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: cssMod.artRailFileMain,
												title: `${file.name}.${file.ext}`,
												onClick: () => onOpen(file),
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: cssMod.artRailExt,
														children: file.ext
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: cssMod.artRailName,
														children: file.name
													})
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: cssMod.artRailAt,
												title: t("kb.artifactsMentionHint"),
												onClick: () => onMention(`${PIN_KB}/${group.dir}`, file),
												children: ["@", t("kb.artifactsMention")]
											})
										]
									}, file.docId))
								]
							}, group.dir))
						})
					]
				})
			});
		}
		/** Total file count of a node including all descendants. */'''

ARTIFACT_GROUPS = '''			/**
			* 对话产物（问答导出为 Word/Excel/PPT/Markdown）按会话分组，供对话框
			* 右侧的「对话产物」栏使用。产物不再进入个人知识库目录树，也不参与
			* 全局问答检索（sidecar 恒定排除产物命名空间）；仅可通过「@文件」
			* 显式引用到当前对话做精确检索。
			*/
			const artifactGroups = (0, react.useMemo)(() => {
				const perDir = /* @__PURE__ */ new Map();
				for (const d of productDocs) {
					const parts = (d.title || d.id).replace(/\\\\/g, "/").split("/");
					const dir = parts.length >= 3 ? parts.slice(1, -1).map(sanitizeSeg).join("/") : "未命名会话";
					const base = parts[parts.length - 1] || d.id;
					const m = /\\.([A-Za-z0-9]+)$/.exec(base);
					const ext = (m?.[1] ?? "md").toLowerCase();
					const name = m && m[1] ? base.slice(0, -(m[1].length + 1)) : base;
					const list = perDir.get(dir) ?? [];
					list.push({
						name,
						ext,
						docId: d.id,
						status: d.status,
						hasFile: d.has_file === true,
						...d.error !== void 0 ? { error: d.error } : {}
					});
					perDir.set(dir, list);
				}
				return [...perDir.entries()].map(([dir, files]) => ({
					dir,
					files
				})).sort((a, b) => (b.files.length - a.files.length) || a.dir.localeCompare(b.dir));
			}, [productDocs]);'''

FOLDERS_MEMO = '''			const folders = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map();
				const put = (name, files) => {
					const list = map.get(name);
					if (list) list.push(...files);
					else map.set(name, files.slice());
				};
				for (const f of realFolders) {
					if (isPinnedPrefix(f.name)) continue;
					put(f.name, f.files);
				}
				for (const name of customFolders) if (!map.has(name) && !isPinnedPrefix(name)) map.set(name, []);
				return [...map.entries()].map(([name, files]) => ({
					name,
					files
				})).sort((a, b) => a.name.localeCompare(b.name));
			}, [
				realFolders,
				customFolders
			]);'''

RAIL_STATE = '''			/** 对话框右侧「对话产物」栏的折叠状态（本地持久化，与左侧浏览器栏同套路）。 */
			const [artRailCollapsed, setArtRailCollapsed] = (0, react.useState)(loadArtRailCollapsed);'''

RAIL_HELPERS = '''		/** Persisted collapse preference of the KB panel's right artifact rail. */
		const ART_RAIL_STATE_KEY = "dsh.kb.artrail.v1";
		function loadArtRailCollapsed() {
			try {
				const raw = window.localStorage.getItem(ART_RAIL_STATE_KEY);
				return raw !== null && JSON.parse(raw) === true;
			} catch {
				return false;
			}
		}
		function saveArtRailCollapsed(collapsed) {
			try {
				window.localStorage.setItem(ART_RAIL_STATE_KEY, JSON.stringify(collapsed));
			} catch {}
		}
		/** Index-modal switch defaults (audio/video parsing off by default, per sidecar config). */'''

TOGGLE_ACTION = '''			const toggleArtRail = (0, react.useCallback)(() => {
				setArtRailCollapsed((prev) => {
					saveArtRailCollapsed(!prev);
					return !prev;
				});
			}, []);
'''

ZH_KEYS = '''			"kb.artifacts": "对话产物",
			"kb.artifactsEmpty": "暂无对话产物",
			"kb.artifactsMention": "文件",
			"kb.artifactsMentionHint": "引用该产物文件到当前对话",
			"kb.artifactsCollapse": "收起产物栏",
			"kb.artifactsExpand": "展开产物栏",
'''

EN_KEYS = '''			"kb.artifacts": "Chat artifacts",
			"kb.artifactsEmpty": "No artifacts yet",
			"kb.artifactsMention": "File",
			"kb.artifactsMentionHint": "Reference this artifact in the current conversation",
			"kb.artifactsCollapse": "Collapse artifacts",
			"kb.artifactsExpand": "Expand artifacts",
'''


def rep(text, old, new, label, count=1):
    n = text.count(old)
    if n != count:
        raise SystemExit(f"[FAIL] {label}: expected {count} match, found {n}")
    return text.replace(old, new, count)


def patch_client(text):
    log = []

    # E1: CSS
    m = re.search(r'(\t\tconst css = ")(.*?)(";\n)', text, re.S)
    if not m:
        raise SystemExit("[FAIL] E1: css literal not found")
    text = text[:m.start()] + m.group(1) + m.group(2) + NEW_CSS + m.group(3) + text[m.end():]
    log.append("E1 css +%d chars" % len(NEW_CSS))

    # E2: class map
    anchor = "\t\tvar KnowledgeBaseRoot_module_css_default = {\n"
    add = "".join('\t\t\t"%s": "Y4cvAW_%s",\n' % (k, k) for k in NEW_CLASS_KEYS)
    text = rep(text, anchor, anchor + add, "E2 class map")
    log.append("E2 class keys +%d" % len(NEW_CLASS_KEYS))

    # E3: pinnedFolders -> artifactGroups (index splice between markers)
    start_marker = "\t\t\t/**\n\t\t\t* Virtual folders backing the two pinned mirror nodes."
    end_marker = "\t\t\t}, [\n\t\t\t\twsGroups,\n\t\t\t\tvisibleSessions,\n\t\t\t\tproductDocs\n\t\t\t]);\n"
    i = text.find(start_marker)
    if i < 0:
        raise SystemExit("[FAIL] E3: pinnedFolders start marker not found")
    j = text.find(end_marker, i)
    if j < 0:
        raise SystemExit("[FAIL] E3: pinnedFolders end marker not found")
    text = text[:i] + ARTIFACT_GROUPS + "\n" + text[j + len(end_marker):]
    log.append("E3 pinnedFolders -> artifactGroups")

    # E4: folders memo (no pinned nodes)
    start_marker = "\t\t\tconst folders = (0, react.useMemo)(() => {"
    end_marker = "\t\t\t}, [\n\t\t\t\tpinnedFolders,\n\t\t\t\trealFolders,\n\t\t\t\tcustomFolders\n\t\t\t]);\n"
    i = text.find(start_marker)
    if i < 0:
        raise SystemExit("[FAIL] E4: folders memo start not found")
    j = text.find(end_marker, i)
    if j < 0:
        raise SystemExit("[FAIL] E4: folders memo end not found")
    text = text[:i] + FOLDERS_MEMO + "\n" + text[j + len(end_marker):]
    log.append("E4 folders memo rewritten")

    # E5a: load/save helpers
    anchor = "\t\t/** Index-modal switch defaults (audio/video parsing off by default, per sidecar config). */"
    text = rep(text, anchor, RAIL_HELPERS, "E5a rail persistence helpers")
    # E5b: state
    anchor = "\t\t\tconst [sideCollapsed, setSideCollapsed] = (0, react.useState)(loadSidebarCollapsed);\n"
    text = rep(text, anchor, anchor + RAIL_STATE + "\n", "E5b rail state")
    # E5c: toggle callback
    anchor = "\t\t\tconst removeChip = (0, react.useCallback)((label) => {\n\t\t\t\tsetChips((prev) => prev.filter((c) => c.label !== label));\n\t\t\t}, []);\n"
    text = rep(text, anchor, anchor + TOGGLE_ACTION, "E5c toggle callback")
    log.append("E5 rail state + persistence + toggle")

    # E6: component
    anchor = "\t\t/** Total file count of a node including all descendants. */"
    text = rep(text, anchor, RAIL_COMPONENT, "E6 rail component")
    log.append("E6 KbArtifactRail component")

    # E7a: chat -> row + chatLeft wrapper
    old = (T(8) + "className: KnowledgeBaseRoot_module_css_default.chat,\n"
           + T(8) + "children: [\n")
    new = (T(8) + "className: clsx(KnowledgeBaseRoot_module_css_default.chat, KnowledgeBaseRoot_module_css_default.chatRow),\n"
           + T(8) + "children: [\n"
           + T(9) + '/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {\n'
           + T(10) + "className: KnowledgeBaseRoot_module_css_default.chatLeft,\n"
           + T(10) + "children: [\n")
    text = rep(text, old, new, "E7a chat row + chatLeft")

    # E7b: close chatLeft, append rail, close section
    #   anchor on the send-arrow icon (unique), then the section's closing lines right after it.
    probe = 'd: "M5 12l7-7 7 7"'
    if text.count(probe) != 1:
        raise SystemExit("[FAIL] E7b: send-icon probe not unique")
    probe_i = text.index(probe)
    old = T(8) + "]\n" + T(7) + "}),\n"
    p = text.find(old, probe_i)
    if p < 0:
        raise SystemExit("[FAIL] E7b: section tail not found")
    new = (T(8) + "] }),\n"
           + T(8) + '/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KbArtifactRail, {\n'
           + T(9) + "groups: artifactGroups,\n"
           + T(9) + "total: productDocs.length,\n"
           + T(9) + "collapsed: artRailCollapsed,\n"
           + T(9) + "onToggle: toggleArtRail,\n"
           + T(9) + "onMention: mentionFile,\n"
           + T(9) + "onOpen: viewDoc,\n"
           + T(9) + "t\n"
           + T(8) + "})\n"
           + T(8) + "]\n" + T(7) + "}),\n")
    text = text[:p] + new + text[p + len(old):]
    log.append("E7 chat layout -> [chatLeft, artifact rail]")

    # E8: drop the two "纳入全局检索" switches
    pat = re.compile(
        r'\n\t{11}/\* @__PURE__ \*/ \(0, react_jsx_runtime\.jsxs\)\("div", \{\n'
        r'\t{12}className: KnowledgeBaseRoot_module_css_default\.setRow,\n'
        r'\t{12}children: \[/\* @__PURE__ \*/ \(0, react_jsx_runtime\.jsxs\)\("div", \{ children: \["DSH产物纳入全局检索".*?include_kb_artifacts" \}\)\]\n'
        r'\t{11}\}\),',
        re.S)
    text, n = pat.subn("", text)
    if n != 1:
        raise SystemExit(f"[FAIL] E8: expected 1 removal, got {n}")
    log.append("E8 removed 2 artifact-inclusion switches")

    # E9: locale keys
    text = rep(text, '\t\t\t"kb.mention": "引用文件夹或文件",\n',
               '\t\t\t"kb.mention": "引用文件夹或文件",\n' + ZH_KEYS, "E9 zh keys")
    text = rep(text, '\t\t\t"kb.mention": "Reference a folder or file",\n',
               '\t\t\t"kb.mention": "Reference a folder or file",\n' + EN_KEYS, "E9 en keys")
    log.append("E9 locale keys (zh + en)")

    # E10: notice wording for exports
    old = 'showNotice(`已生成 ${fmt.toUpperCase()} 文件并入库「知识库产物」：${title.split("/").pop()}'
    new = 'showNotice(`已生成 ${fmt.toUpperCase()} 文件并加入右侧「对话产物」：${title.split("/").pop()}'
    if text.count(old) == 1:
        text = text.replace(old, new)
        log.append("E10 export notice wording")
    return text, log


def patch_server(text):
    log = []
    # S1: always exclude artifact namespaces from global retrieval
    start = "def _excluded_prefixes(prefs: dict[str, bool] | None = None) -> list[str]:"
    i = text.find(start)
    if i < 0:
        raise SystemExit("[FAIL] S1: _excluded_prefixes not found")
    end = "\n\ndef _is_ns_prefix("
    j = text.find(end, i)
    if j < 0:
        raise SystemExit("[FAIL] S1: _is_ns_prefix boundary not found")
    new_fn = (
        "def _excluded_prefixes(prefs: dict[str, bool] | None = None) -> list[str]:\n"
        '    """全局检索恒定排除的产物前缀（DSH产物 / 知识库产物）。\n'
        "\n"
        "    2026-09-12：产物不再作为知识库内容对外——面板里的「DSH产物 / 知识库产物」\n"
        "    文件夹已下线，改成对话框右侧可折叠的「对话产物」栏。因此全局问答恒定排除\n"
        "    这两个命名空间；显式 @ 指定产物文件/文件夹走 scope 分支，不受此处影响，\n"
        "    仍可精确引用。prefs 参数保留仅为兼容旧调用点。\n"
        '    """\n'
        "    return list(NS_ORDER)\n"
    )
    text = text[:i] + new_fn + text[j + 1:]
    log.append("S1 _excluded_prefixes -> always exclude artifacts")

    # S2: workspace sync default off
    old = 'WS_SYNC_ENABLED = bool(WS_SYNC_CFG.get("enabled", True))'
    new = 'WS_SYNC_ENABLED = bool(WS_SYNC_CFG.get("enabled", False))'
    text = rep(text, old, new, "S2 ws sync default")
    log.append("S2 DSH workspace artifact sync default OFF")
    return text, log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plugin")
    ap.add_argument("--out")
    args = ap.parse_args()

    src_cli = os.path.join(args.plugin, "lib", "client.js")
    src_srv = os.path.join(args.plugin, "sidecar", "server.py")
    for p in (src_cli, src_srv):
        if not os.path.isfile(p):
            raise SystemExit("missing: %s" % p)

    out = args.out or args.plugin
    out_cli = os.path.join(out, "lib", "client.js")
    out_srv = os.path.join(out, "sidecar", "server.py")
    if out != args.plugin:
        os.makedirs(os.path.join(out, "lib"), exist_ok=True)
        os.makedirs(os.path.join(out, "sidecar"), exist_ok=True)

    cli = open(src_cli, encoding="utf-8").read()
    srv = open(src_srv, encoding="utf-8").read()

    cli2, log1 = patch_client(cli)
    srv2, log2 = patch_server(srv)

    open(out_cli, "w", encoding="utf-8", newline="\n").write(cli2)
    open(out_srv, "w", encoding="utf-8", newline="\n").write(srv2)

    print("client.js : %d -> %d bytes" % (len(cli), len(cli2)))
    for x in log1:
        print("  " + x)
    print("server.py : %d -> %d bytes" % (len(srv), len(srv2)))
    for x in log2:
        print("  " + x)
    print("OK ->", out)


if __name__ == "__main__":
    main()
