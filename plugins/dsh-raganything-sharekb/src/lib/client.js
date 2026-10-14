window.__ModuleLoader__.load({
	id: "dsh-raganything-kb",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region src/client/kb-api.ts
		/** Resolve the sidecar base URL: same-origin /rag reverse proxy on HTTPS
		 *  pages (mixed-content safe), otherwise direct http://<host>:17321. */
		function ragBaseUrl() {
			if (typeof location !== "undefined") {
				var m = String(location.pathname || "").match(/^(\/mu\/[^\/]+)/);
				return `${location.origin}${m ? m[1] : ""}/rag`;
			}
			return "http://127.0.0.1:17321";
		
		}
		const RAG_TIMEOUT_MS = 2e4;
		async function ragFetch(path, init, timeoutMs = RAG_TIMEOUT_MS) {
			const controller = new AbortController();
			const timer = window.setTimeout(() => controller.abort(), timeoutMs);
			try {
				return await fetch(`${ragBaseUrl()}${path}`, {
					...init,
					signal: controller.signal
				});
			} finally {
				window.clearTimeout(timer);
			}
		}
		/** Live check: reachable AND reporting ok. */
		async function ragHealth() {
			try {
				const res = await ragFetch("/health");
				if (!res.ok) return null;
				const data = await res.json();
				return {
					ok: data.ok === true,
					initialized: data.initialized === true
				};
			} catch {
				return null;
			}
		}
		/** Fetch all documents; null when the sidecar is unreachable. */
		async function ragDocuments() {
			try {
				const res = await ragFetch("/documents");
				if (!res.ok) return null;
				return (await res.json()).documents ?? [];
			} catch {
				return null;
			}
		}
		/** ---- 共享知识库 API（2026-09-13）：宿主实例为共享存储，用户实例由 sidecar 转发 ---- */
		async function ragSharedTree() {
			try {
				const res = await ragFetch(`/shared/tree?user=${encodeURIComponent(MU_NS_RAW)}`);
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}
		async function ragSharedCreateFolder(name, members) {
			try {
				const res = await ragFetch("/shared/folders", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name, members, user: MU_NS_RAW })
				});
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		async function ragSharedSetMembers(name, members) {
			try {
				const res = await ragFetch(`/shared/folders/${encodeURIComponent(name)}`, {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ members, user: MU_NS_RAW })
				});
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		async function ragSharedDeleteFolder(name) {
			try {
				const res = await ragFetch(`/shared/folders/${encodeURIComponent(name)}?user=${encodeURIComponent(MU_NS_RAW)}`, { method: "DELETE" });
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		function ragSharedFileUrl(docId, download) {
			return `${ragBaseUrl()}/shared/file?doc_id=${encodeURIComponent(docId)}${download ? "&download=1" : ""}`;
		}
		async function ragSharedDeleteFile(folder, docId) {
			try {
				const res = await ragFetch(`/shared/files?folder=${encodeURIComponent(folder)}&doc_id=${encodeURIComponent(docId)}&user=${encodeURIComponent(MU_NS_RAW)}`, { method: "DELETE" });
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		async function ragSharedRenameFile(folder, docId, name) {
			try {
				const res = await ragFetch("/shared/files", {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ folder, doc_id: docId, name, user: MU_NS_RAW })
				});
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		async function ragSharedRenameFolder(name, alias) {
			try {
				const res = await ragFetch(`/shared/folders/${encodeURIComponent(name)}`, {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ alias, user: MU_NS_RAW })
				});
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		async function ragSharedTrashList() {
			try {
				const res = await ragFetch(`/shared/trash?user=${encodeURIComponent(MU_NS_RAW)}`);
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		async function ragSharedTrashRestore(id) {
			try {
				const res = await ragFetch("/shared/trash/restore", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ id, user: MU_NS_RAW })
				});
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		async function ragSharedTrashPurge(id) {
			try {
				const res = await ragFetch(`/shared/trash/${encodeURIComponent(id)}?user=${encodeURIComponent(MU_NS_RAW)}`, { method: "DELETE" });
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		function ragSharedDownloadUrl(folder) {
			return `${ragBaseUrl()}/shared/download?folder=${encodeURIComponent(folder)}&user=${encodeURIComponent(MU_NS_RAW)}`;
		}
		async function ragSharedFileText(docId) {
			try {
				const res = await ragFetch(`/shared/file?doc_id=${encodeURIComponent(docId)}`);
				if (!res.ok) return null;
				return await res.text();
			} catch {
				return null;
			}
		}
		async function ragSharedDocContent(docId) {
			try {
				const res = await ragFetch(`/shared/content?doc_id=${encodeURIComponent(docId)}`);
				if (!res.ok) return null;
				return (await res.json()).content ?? "";
			} catch {
				return null;
			}
		}
		/** Submit one task ({op, params}); returns the task id, or null when unreachable. */
		async function ragSubmit(op, params) {
			try {
				const res = await ragFetch("/tasks", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						op,
						params
					})
				});
				if (!res.ok) return null;
				return (await res.json()).task_id ?? null;
			} catch {
				return null;
			}
		}
		/** Poll a task until terminal; returns the task, or null on network failure.
		*  Every tick passes the current task (with live progress) to onTick. */
		async function ragPollTask(taskId, onTick, deadlineMs = 15e4) {
			const deadline = Date.now() + deadlineMs;
			let waited = 0;
			let failures = 0;
			while (Date.now() < deadline) {
				try {
					const res = await ragFetch(`/tasks/${taskId}`);
					if (res.ok) {
						failures = 0;
						const task = await res.json();
						if (task.status === "done" || task.status === "error" || task.status === "cancelled") return task;
						onTick?.(waited, task);
					}
				} catch {
					failures += 1;
					if (failures >= 3) return null;
				}
				waited += 1;
				onTick?.(waited);
				await new Promise((resolve) => window.setTimeout(resolve, 1200));
			}
			return null;
		}
		/**
		* Run one retrieval query with live progress. While the sidecar works (and
		* streams the model's chain-of-thought), `onProgress` receives the growing
		* stage/elapsed/thinking/answer snapshot on every poll tick, so the KB chat
		* can render a live 思考过程 block instead of a blank wait. RAG queries can
		* legitimately take several minutes, so the poll deadline is generous.
		*/
		async function ragAskLive(query, mode = "hybrid", onProgress, deadlineMs = 9e5, scope) {
			const taskId = await ragSubmit("query", {
				query,
				mode,
				...scope ? { scope } : {}
			});
			if (taskId === null) return null;
			const task = await ragPollTask(taskId, (_waited, live) => {
				if (onProgress && live?.progress) onProgress(live.progress);
			}, deadlineMs);
			if (task !== null && task.status === "error" && typeof task.error === "string" && task.error) {
				return {
					answer: `检索失败：${task.error}`,
					thinking: "",
					mode: "error"
				};
			}
			if (task === null || task.status !== "done" || typeof task.result?.answer !== "string") return null;
			return {
				answer: task.result.answer,
				thinking: task.result.thinking ?? "",
				mode: task.result.mode ?? mode,
				// 回答被判定退化成 LightRAG 抽取原文（sidecar 侧会先重试一次），
				// 前端据此不再把它写进「知识库产物」。
				degraded: task.result.degraded === true
			};
		}
		/** Ingest raw text under a title; resolves the resulting doc id, or null on failure. */
		async function ragIngestText(text, title) {
			const taskId = await ragSubmit("ingest_text", {
				text,
				title
			});
			if (taskId === null) return null;
			const task = await ragPollTask(taskId);
			if (task === null || task.status !== "done") return null;
			return task.result?.doc_id ?? null;
		}
		/**
		* Detect the Office format a KB question explicitly asks for, so the chat
		* can generate a real Word/Excel/PPT artifact instead of only a .md file.
		* Returns "docx" | "xlsx" | "pptx" | null.
		*/
		function detectOfficeFormat(text) {
			const q = String(text || "").toLowerCase();
			if (/\bword\b|\.doc\b|docx|word格式|word文档|word 文档|以word|生成word/.test(q)) return "docx";
			if (/\bexcel\b|\.xls\b|xlsx|excel格式|excel表格|excel 表格|以excel|做成表格|输出表格|生成表格/.test(q)) return "xlsx";
			if (/\bppt\b|pptx|ppt格式|ppt演示|ppt 演示|演示文稿|幻灯片|以ppt|做成ppt|生成ppt/.test(q)) return "pptx";
			return null;
		}
		/**
		* Detect a degenerate KB answer that came back as LightRAG's raw entity /
		* relation extraction text. `<|#|>` / `<|COMPLETE|>` are LightRAG-only
		* delimiters, so a normal Chinese answer never contains them. Such an answer
		* must never be re-ingested as a 「知识库产物」 artifact — that would feed the
		* extraction text back into the KB and make the failure self-reinforcing.
		*/
		function isDegenerateAnswer(text) {
			const s = String(text || "").trim();
			if (s.length < 40) return false;
			if (s.includes("<|COMPLETE|>")) return true;
			const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);
			if (lines.length === 0) return false;
			const tagged = lines.filter((l) => l.startsWith("entity<|#|>") || l.startsWith("relation<|#|>")).length;
			return tagged >= 2 && tagged * 2 >= lines.length;
		}
		/**
		* Ask the sidecar to generate an Office file (.docx/.xlsx/.pptx) from
		* markdown text, store it as a KB artifact (知识库产物), and ingest it.
		* Resolves {doc_id, existing} — `existing: true` means the text was
		* already in the KB (content dedup) but the file is still generated and
		* downloadable; null on failure.
		*/
		async function ragIngestOffice(text, title, format) {
			const taskId = await ragSubmit("ingest_office", {
				text,
				title,
				format
			});
			if (taskId === null) return null;
			const task = await ragPollTask(taskId, void 0, 3e5);
			if (task === null || task.status !== "done") return null;
			return task.result ? {
				doc_id: task.result.doc_id ?? null,
				existing: task.result.existing === true,
				file: task.result.file ?? ""
			} : null;
		}
		/**
		* Fire-and-forget upload: submit the file to the sidecar and return the
		* ingest task id immediately, WITHOUT waiting for the parser to finish.
		*
		* The sidecar registers a "parsing" doc entry right away, so the KB panel
		* shows the file in the list (处理中) while parsing runs in the background;
		* the entry flips to 已入库 once the ingest task settles. Returns
		* {task_id, name, has_original} or null when the sidecar is unreachable.
		*/
		async function ragUploadSubmit(file, parentPath, onDuplicate) {
			const form = new FormData();
			form.append("file", file);
			if (parentPath) form.append("parent_path", parentPath);
			if (onDuplicate) form.append("on_duplicate", onDuplicate);
			if (file.lastModified) form.append("file_mtime", String(file.lastModified));
			const res = await ragFetch("/upload", {
				method: "POST",
				body: form
			}, 12e4);
			if (res.status === 409) {
				let info = {};
				try { info = await res.json(); } catch {}
				return { conflict: true, info };
			}
			if (!res.ok) return null;
			const data = await res.json();
			if (data.skipped) return { skipped: true, info: data };
			if (data.uploaded === false) return { deleted_old: true, deleted: data.deleted_doc_ids ?? [] };
			if (!data.task_id) return null;
			return {
				task_id: data.task_id,
				name: data.name ?? file.name,
				has_original: true,
				renamed_to: data.renamed_to,
				version: data.version
			};
		}
		/**
		* Upload one file, resolving duplicate conflicts interactively: when the
		* sidecar answers 409 the user picks 跳过 / 覆盖 / 重命名 / 版本归档 / 自动,
		* and the upload is re-submitted with on_duplicate set. `batch` carries a
		* shared {policy} so one confirmed choice can apply to every duplicate in
		* the same batch upload. Returns
		* {outcome: "submitted" | "renamed" | "versioned" | "deleted_old" | "skipped" | "failed"}.
		*/
		async function ragUploadInteractive(file, parentPath, batch) {
			const out = await ragUploadSubmit(file, parentPath);
			if (out === null) return { outcome: "failed" };
			if (out.skipped) return { outcome: "skipped" };
			if (out.deleted_old) return { outcome: "deleted_old" };
			if (!out.conflict) return { outcome: out.version ? "versioned" : out.renamed_to ? "renamed" : "submitted", info: out };
			const info = out.info || {};
			const dupLabel = info.match_type === "identical-content" ? "内容完全相同"
				: info.match_type === "cross-name-content" ? `与库内文件「${(info.match_detail || {}).existing_display || "?"}」内容相同`
				: info.match_type === "near-duplicate" ? "内容高度相似"
				: "同名文件";
			let policy = batch && batch.policy ? batch.policy : null;
			if (!policy) {
				const choice = window.prompt(
					`检测到重复文件（${dupLabel}）：\n「${info.display_path || file.name}」\n\n` +
					`输入 1 = 跳过（不上传该文件，不中断批量上传）\n` +
					`输入 2 = 覆盖（旧文件移入回收站，保留 7 天）\n` +
					`输入 3 = 重命名并上传（自动添加 _copy_N 后缀）\n` +
					`输入 4 = 版本归档（旧文件归入 versions/，新文件作为最新版）\n` +
					`输入 5 = 自动（按规则保留最新修改时间的版本）\n\n` +
					`取消或留空 = 跳过该文件`, "1");
				if (choice === null) return { outcome: "skipped" };
				const map = { "1": "skip", "2": "overwrite", "3": "rename", "4": "version", "5": "auto" };
				policy = map[String(choice).trim()];
				if (!policy) return { outcome: "skipped" };
				if (batch && window.confirm(`将此选择（${policy}）应用到本次批量上传中的所有重复文件？`)) batch.policy = policy;
			}
			if (policy === "skip") return { outcome: "skipped" };
			const retry = await ragUploadSubmit(file, parentPath, policy);
			if (retry === null) return { outcome: "failed" };
			if (retry.skipped) return { outcome: "skipped" };
			if (retry.deleted_old) return { outcome: "deleted_old" };
			if (retry.conflict) return { outcome: "failed" };
			return { outcome: retry.version ? "versioned" : retry.renamed_to ? "renamed" : "submitted", info: retry };
		}
		/** URL of the ORIGINAL uploaded file for a doc (需求2: 打开原始布局文件). */
		function ragDocFileUrl(docId, download = false) {
			return `${ragBaseUrl()}/documents/${encodeURIComponent(docId)}/file${download ? "?download=1" : ""}`;
		}
		/** Fetch the original file of a doc as plain text (txt/md/csv…). Null on failure. */
		async function ragDocFileText(docId) {
			try {
				const res = await ragFetch(`/documents/${encodeURIComponent(docId)}/file`, void 0, 3e4);
				if (!res.ok) return null;
				return await res.text();
			} catch {
				return null;
			}
		}
		/** Fetch the original document content for a doc_id; null when unreachable or missing. */
		async function ragDocContent(docId) {
			try {
				const res = await ragFetch(`/documents/${encodeURIComponent(docId)}/content`);
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}
		/** Delete one document by id (returns true on success, false on error, null on unreachable). */
		async function ragDeleteDoc(docId) {
			try {
				const res = await ragFetch(`/documents/${encodeURIComponent(docId)}`, { method: "DELETE" });
				if (!res.ok) return false;
				const data = await res.json();
				if (!data.task_id) return false;
				const task = await ragPollTask(data.task_id, void 0, 6e4);
				if (task === null) return null;
				return task.status === "done";
			} catch {
				return null;
			}
		}
		/** Fetch the DSH workspace artifact mirror; null when the sidecar is unreachable. */
		async function ragWorkspaceArtifacts() {
			try {
				const res = await ragFetch("/workspace/artifacts");
				if (!res.ok) return null;
				return (await res.json()).groups ?? [];
			} catch {
				return null;
			}
		}
		/** Text preview of one workspace file; null on failure (unreachable / binary / outside roots). */
		async function ragWorkspaceFile(path) {
			try {
				const res = await ragFetch(`/workspace/file?path=${encodeURIComponent(path)}`);
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}
		/** Download URL of one workspace file (attachment disposition). */
		function ragWorkspaceDownloadUrl(path) {
			return `${ragBaseUrl()}/workspace/download?path=${encodeURIComponent(path)}`;
		}
		/**
		* Ask the sidecar to package one KB folder's files into a zip and download it.
		* Resolves false on any failure (unreachable / empty / missing files).
		*/
		async function ragFolderDownload(path, name, files) {
			try {
				const res = await ragFetch("/folders/download", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						path,
						name,
						files
					})
				}, 18e4);
				if (!res.ok) return false;
				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = name.toLowerCase().endsWith(".zip") ? name : `${name}.zip`;
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(url);
				return true;
			} catch {
				return false;
			}
		}
		/** Trigger a browser download for an attachment-disposition URL (hidden anchor click). */
		function triggerDownload(url) {
			const a = document.createElement("a");
			a.href = url;
			a.download = "";
			a.rel = "noopener";
			document.body.appendChild(a);
			a.click();
			a.remove();
		}
		function groupDocsIntoFolders(docs) {
			const groups = /* @__PURE__ */ new Map();
			for (const doc of docs) {
				const parts = (doc.title || doc.id || "未命名").replace(/\\/g, "/").split("/");
				const folderName = parts.length > 1 ? parts.slice(0, -1).join("/") : "全部文档";
				const base = parts[parts.length - 1] || doc.id || "未命名";
				const match = /\.([A-Za-z0-9]+)$/.exec(base);
				const ext = (match?.[1] ?? "txt").toLowerCase();
				const stripped = /^[0-9a-f]{8}-/.test(base) ? base.slice(9) : base;
				const name = match && match[1] ? stripped.slice(0, -(match[1].length + 1)) : stripped;
				let folder = groups.get(folderName);
				if (folder === void 0) {
					folder = {
						name: folderName,
						files: []
					};
					groups.set(folderName, folder);
				}
				folder.files.push({
					name,
					ext,
					docId: doc.id,
					status: doc.status,
					...doc.error !== void 0 ? { error: doc.error } : {},
					hasFile: doc.has_file === true
				});
			}
			return [...groups.values()];
		}
		/** Fetch index statistics; null when the sidecar is unreachable. */
		async function ragIndexStats() {
			try {
				const res = await ragFetch("/index/stats");
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}
		/** List uploaded source files (per-file re-index targets); null when unreachable. */
		async function ragIndexFiles() {
			try {
				const res = await ragFetch("/index/files");
				if (!res.ok) return null;
				return (await res.json()).files;
			} catch {
				return null;
			}
		}
		/** Re-index one uploaded source file; returns {started} or null when unreachable. */
		async function ragIndexReingest(name) {
			try {
				const res = await ragFetch("/index/reingest", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name })
				});
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}
		/** Start a full index rebuild; returns {started,total} or null when unreachable. */
		async function ragIndexRebuildStart() {
			try {
				const res = await ragFetch("/index/rebuild", { method: "POST" });
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}
		/** Append one operation log entry (fire-and-forget; failures are ignored). */
		async function ragLogAppend(action, detail) {
			try {
				await ragFetch("/log", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action,
						detail
					})
				}, 5e3);
			} catch {}
		}
		/** Fetch the most recent operation logs (newest first); null when unreachable. */
		async function ragLogList(limit = 500) {
			try {
				const res = await ragFetch(`/log?limit=${limit}`);
				if (!res.ok) return null;
				return (await res.json()).logs ?? [];
			} catch {
				return null;
			}
		}
		/** Download the full operation log as a .jsonl file via the browser. */
		async function ragLogExport() {
			try {
				const res = await ragFetch("/log/export", void 0, 6e4);
				if (!res.ok) return false;
				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-");
				a.href = url;
				a.download = `kb-logs-${stamp}.jsonl`;
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(url);
				return true;
			} catch {
				return false;
			}
		}
		/** Demo folders shown when the sidecar is unreachable (mirrors the prototype). */
		const DEMO_FOLDERS = [
			{
				name: "产品文档",
				files: [{
					name: "璇玑产品白皮书",
					ext: "pdf",
					docId: "demo-whitepaper",
					status: "processed"
				}, {
					name: "桌面客户端 PRD v3.2",
					ext: "docx",
					docId: "demo-prd",
					status: "processed"
				}]
			},
			{
				name: "设计资产",
				files: [{
					name: "UI 验收标准",
					ext: "md",
					docId: "demo-ui",
					status: "processed"
				}]
			},
			{
				name: "会议纪要",
				files: [{
					name: "08-11 周会行动项",
					ext: "md",
					docId: "demo-meeting",
					status: "processed"
				}]
			}
		];
		/** Demo answer streamed when the sidecar is unreachable. */
		const DEMO_ANSWER = "当前 RAG-Anything 未连接，以下为演示回答。\n\n《璇玑产品白皮书》核心观点：\n· 以「四列工作台」组织 AI 能力：导航 / 模块 / 主窗口 / 结果列按需显隐。\n· 知识库以文件夹为权限边界，支持 @ 精确引用。\n· 定时任务将 AI 执行能力延伸到无人值守场景。\n\n（连接 RAG-Anything 后将返回真实检索结果）";
		/** Fetch the AI 模型 panel snapshot; null when the sidecar is unreachable. */
		async function ragModels() {
			try {
				const res = await ragFetch("/models");
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}
		/** Start a background download of one local model; returns the download id. */
		async function ragModelDownload(modelId) {
			try {
				const res = await ragFetch("/models/download", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ model_id: modelId })
				}, 1e4);
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}
		/** Persist the default model for one category. */
		async function ragModelSelect(category, payload) {
			try {
				const res = await ragFetch("/models/select", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						category,
						...payload
					})
				}, 1e4);
				if (!res.ok) return {
					ok: false,
					error: (await res.json().catch(() => null))?.detail ?? `HTTP ${res.status}`
				};
				return await res.json();
			} catch {
				return null;
			}
		}
		/** Add a custom model config (参考 DSH-设置-模型), making it an option for its category. */
		async function ragModelCustom(payload) {
			try {
				const res = await ragFetch("/models/custom", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				}, 1e4);
				if (!res.ok) return {
					ok: false,
					error: (await res.json().catch(() => null))?.detail ?? `HTTP ${res.status}`
				};
				return { ok: true };
			} catch {
				return null;
			}
		}
		/** Ask the sidecar to restart itself (embedding/rerank/asr/parser config生效). */
		async function ragModelRestart() {
			try {
				return (await ragFetch("/models/restart", { method: "POST" }, 8e3)).ok;
			} catch {
				return false;
			}
		}
		/** Install the local GGUF embedding runtime (llama-cpp-python) for CUDA/ROCm/CPU. */
		async function ragModelInstallRuntime(vendor = "auto") {
			try {
				const res = await ragFetch("/models/install-runtime", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ vendor })
				}, 1e4);
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}
		//#endregion
		//#region \0dsh-css:/home/minson/deepseek-harness-src.v013a1/packages/client/dsh-raganything-kb/src/client/KnowledgeBaseRoot.module.css.mjs
		const css = ".Y4cvAW_triggerRow{flex:none;align-items:center;gap:8px;width:calc(100% + 4px);margin:4px -2px;display:flex}.Y4cvAW_triggerRow.Y4cvAW_railRow{width:36px;margin:8px 0 10px}.Y4cvAW_trigger{box-sizing:border-box;cursor:pointer;width:auto;min-width:0;height:42px;color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:12px;flex:1;align-items:center;gap:8px;margin:0;padding:0 10px 0 8px;font-family:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden}.Y4cvAW_trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_trigger.Y4cvAW_rail{corner-shape:round;border-radius:50%;flex:none;justify-content:center;gap:0;width:36px;height:36px;margin:0;padding:0}.Y4cvAW_triggerLabel{white-space:nowrap;overflow:hidden}.Y4cvAW_overlay{z-index:1000;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}.Y4cvAW_mask{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);position:absolute;inset:0}.Y4cvAW_panel{z-index:1;background:var(--dsw-alias-bg-layer-2);width:1100px;max-width:calc(100vw - 48px);height:min(760px,100vh - 48px);box-shadow:var(--dsw-elevation-prominent);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:24px;display:flex;position:relative;overflow:hidden}.Y4cvAW_sidebar{box-sizing:border-box;border-right:1px solid var(--dsw-alias-divider-strong,var(--dsw-alias-divider));background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));flex-direction:column;flex:none;width:280px;padding:18px 14px 14px;display:flex;overflow:hidden}.Y4cvAW_sidebarHead{justify-content:space-between;align-items:center;margin-bottom:12px;display:flex}.Y4cvAW_sidebarTitle{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:600;line-height:24px}.Y4cvAW_close{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;place-items:center;display:grid}.Y4cvAW_close:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_statusChip{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-secondary);border-radius:10px;align-items:center;gap:7px;margin-bottom:10px;padding:6px 8px;font-size:12px;line-height:18px;display:flex}.Y4cvAW_statusChip.Y4cvAW_on .Y4cvAW_dot{background:var(--dsw-alias-ok,#2f9e6e)}.Y4cvAW_statusChip.Y4cvAW_off .Y4cvAW_dot{background:var(--dsw-alias-danger,#e5484d)}.Y4cvAW_dot{background:var(--dsw-alias-label-disabled);border-radius:50%;flex:none;width:7px;height:7px}.Y4cvAW_statusText{white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;overflow:hidden}.Y4cvAW_syncBtn{cursor:pointer;width:22px;height:22px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;flex:none;place-items:center;display:grid}.Y4cvAW_syncBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_search{border:1px solid var(--dsw-alias-divider);height:32px;color:var(--dsw-alias-label-disabled);border-radius:10px;align-items:center;gap:7px;margin-bottom:14px;padding:0 9px;display:flex}.Y4cvAW_search input{min-width:0;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1;font-family:inherit;font-size:13px}.Y4cvAW_folderLabel{letter-spacing:.6px;color:var(--dsw-alias-label-disabled);padding:2px 4px 6px;font-size:11px}.Y4cvAW_folderList{flex-direction:column;flex:2 1 0;gap:2px;min-height:0;max-height:60%;display:flex;overflow-y:auto}.Y4cvAW_folderGroup{flex-direction:column;display:flex}.Y4cvAW_folder{cursor:pointer;width:100%;height:32px;color:var(--dsw-alias-label-secondary);text-align:left;box-sizing:border-box;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:0 8px;font-family:inherit;font-size:13px;display:flex}.Y4cvAW_folder:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_folderChevron{width:14px;height:14px;color:var(--dsw-alias-label-disabled);flex:none;place-items:center;transition:transform .12s;display:grid}.Y4cvAW_folderIcon{color:var(--dsw-alias-accent,#0d9d97);flex:none}.Y4cvAW_folderName{white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;overflow:hidden}.Y4cvAW_pinIconDsh{color:#2f6bff}.Y4cvAW_pinIconKb{color:#8b5cf6}.Y4cvAW_folderCount{color:var(--dsw-alias-label-disabled);font-size:11px}.Y4cvAW_files{flex-direction:column;gap:1px;padding:2px 0 4px 24px;display:flex}.Y4cvAW_fileRowWrap{border-radius:7px;align-items:center;gap:2px;display:flex;position:relative}.Y4cvAW_fileRowWrap:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_fileRow{cursor:pointer;text-align:left;box-sizing:border-box;background:0 0;border:none;border-radius:7px;flex:1;align-items:center;gap:8px;min-width:0;min-height:28px;padding:0 2px 0 18px;font-family:inherit;display:flex}.Y4cvAW_fileName{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-secondary);flex:1;font-size:12.5px;overflow:hidden}.Y4cvAW_fileStatus{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:999px;flex:none;padding:0 6px;font-size:10.5px;line-height:16px}.Y4cvAW_st-processed{color:var(--dsw-alias-ok,#2f9e6e)}.Y4cvAW_st-processing,.Y4cvAW_st-preprocessed{color:var(--dsw-alias-warning,#c98a1b)}.Y4cvAW_st-pending{color:var(--dsw-alias-label-disabled)}.Y4cvAW_st-failed{color:var(--dsw-alias-danger,#e5484d)}.Y4cvAW_docDetail{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:10px;flex:none;margin:10px 0 2px;padding:8px 10px}.Y4cvAW_docDetailHead{align-items:center;gap:6px;display:flex}.Y4cvAW_docDetailName{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:12.5px;font-weight:600;overflow:hidden}.Y4cvAW_docDetailClose{cursor:pointer;width:20px;height:20px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;flex:none;place-items:center;display:grid}.Y4cvAW_docDetailClose:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_docDetailMeta{align-items:center;gap:8px;margin-top:6px;display:flex}.Y4cvAW_docDetailId{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-disabled);flex:1;font-size:10.5px;overflow:hidden}.Y4cvAW_docDetailError{color:var(--dsw-alias-danger,#e5484d);word-break:break-word;margin-top:6px;font-size:11px;line-height:1.5}.Y4cvAW_uploading{align-items:center;gap:7px;margin-top:8px;padding:0 4px;display:flex}.Y4cvAW_uploadingDot{background:var(--dsw-alias-accent,#0d9d97);border-radius:50%;flex:none;width:6px;height:6px;animation:1.1s ease-in-out infinite Y4cvAW_kbPulse}.Y4cvAW_uploadingText{min-width:0;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;flex:1;font-size:11.5px;overflow:hidden}@keyframes Y4cvAW_kbPulse{0%,to{opacity:1}50%{opacity:.35}}.Y4cvAW_empty{color:var(--dsw-alias-label-disabled);padding:14px 8px;font-size:12px}.Y4cvAW_uploadRow{border-top:1px solid var(--dsw-alias-divider);margin-top:10px;padding-top:10px}.Y4cvAW_uploadBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;width:100%;height:34px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:10px;font-family:inherit;font-size:13px}.Y4cvAW_uploadBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_chat{background:var(--dsw-alias-bg-layer-2);flex-direction:column;flex:1;min-width:0;display:flex;position:relative}.Y4cvAW_notice{text-align:center;max-width:86%;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border:1px solid var(--dsw-alias-divider);z-index:30;pointer-events:none;border-radius:10px;padding:8px 14px;font-size:12.5px;line-height:1.45;animation:.18s Y4cvAW_dshKbNoticeIn;position:absolute;bottom:98px;left:50%;transform:translate(-50%);box-shadow:0 4px 18px #00000029}@keyframes Y4cvAW_dshKbNoticeIn{0%{opacity:0;transform:translate(-50%,4px)}to{opacity:1;transform:translate(-50%)}}.Y4cvAW_hero{flex-direction:column;flex:1;justify-content:center;align-items:center;gap:6px;padding:0 28px;display:flex}.Y4cvAW_heroLogo{width:52px;height:52px;color:var(--dsw-alias-accent,#0d9d97);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:16px;place-items:center;margin-bottom:10px;display:grid}.Y4cvAW_heroTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:24px;font-weight:600}.Y4cvAW_heroSub{color:var(--dsw-alias-label-secondary);margin:0 0 20px;font-size:13px}.Y4cvAW_suggestions{grid-template-columns:1fr 1fr;gap:10px;width:min(620px,100%);display:grid}.Y4cvAW_suggestion{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-secondary);text-align:left;cursor:pointer;border-radius:12px;padding:12px 14px;font-family:inherit;font-size:12.5px;line-height:1.5;transition:border-color .15s,background .15s,transform .15s,box-shadow .15s;position:relative}.Y4cvAW_suggestion:hover{border-color:var(--dsw-alias-accent,#0d9d97);background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-3));color:var(--dsw-alias-label-primary);transform:translateY(-1px);box-shadow:0 2px 8px #00000014}.Y4cvAW_suggestion:focus-visible{outline:2px solid var(--dsw-alias-accent,#0d9d97);outline-offset:2px}.Y4cvAW_suggestion:after{content:\"\";border-right:1.5px solid var(--dsw-alias-label-disabled);border-bottom:1.5px solid var(--dsw-alias-label-disabled);width:6px;height:6px;transition:border-color .15s;position:absolute;bottom:8px;right:10px;transform:rotate(-45deg)}.Y4cvAW_suggestion:hover:after{border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_messagesWrap{flex-direction:column;flex:1;min-height:0;display:flex}.Y4cvAW_messagesHead{flex:none;justify-content:space-between;align-items:center;padding:10px 22px 0;display:flex}.Y4cvAW_messagesHeadTitle{letter-spacing:.6px;color:var(--dsw-alias-label-disabled);font-size:11px}.Y4cvAW_clearBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;height:24px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:7px;align-items:center;gap:4px;padding:0 8px;font-family:inherit;font-size:11.5px;display:inline-flex}.Y4cvAW_clearBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-danger,#e5484d);border-color:var(--dsw-alias-danger,#e5484d)}.Y4cvAW_messages{flex-direction:column;flex:1;gap:14px;min-height:0;padding:12px 9%;display:flex;overflow-y:auto}.Y4cvAW_message{max-width:78%}.Y4cvAW_message.Y4cvAW_user{align-self:flex-end}.Y4cvAW_message.Y4cvAW_ai{align-self:flex-start}.Y4cvAW_msgTime{color:var(--dsw-alias-label-disabled);user-select:none;margin-top:4px;font-size:10.5px;line-height:14px}.Y4cvAW_msgTimeUser{text-align:right}.Y4cvAW_bubble{white-space:pre-wrap;word-break:break-word;border-radius:14px;padding:10px 14px;font-size:13.5px;line-height:1.7}.Y4cvAW_message.Y4cvAW_user .Y4cvAW_bubble{color:#182026;background:#95ec69;border-top-right-radius:4px}.Y4cvAW_message.Y4cvAW_ai .Y4cvAW_bubble{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-primary);border-top-left-radius:4px}.Y4cvAW_markdownBubble{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-primary);word-break:break-word;border-radius:4px 14px 14px;padding:10px 14px;font-size:13.5px;line-height:1.7}.Y4cvAW_markdownBubble h1,.Y4cvAW_markdownBubble h2,.Y4cvAW_markdownBubble h3{color:var(--dsw-alias-label-primary);margin:10px 0 6px;font-size:15px;font-weight:600;line-height:1.4}.Y4cvAW_markdownBubble h1{font-size:17px}.Y4cvAW_markdownBubble p{margin:6px 0}.Y4cvAW_markdownBubble ul,.Y4cvAW_markdownBubble ol{margin:6px 0;padding-left:20px}.Y4cvAW_markdownBubble li{margin:3px 0}.Y4cvAW_markdownBubble code{background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1));border-radius:5px;padding:1px 5px;font-family:ui-monospace,monospace;font-size:12.5px}.Y4cvAW_markdownBubble pre{background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1));border-radius:10px;margin:8px 0;padding:10px 12px;overflow-x:auto}.Y4cvAW_markdownBubble a{color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_think{background:color-mix(in srgb, var(--dsw-alias-bg-base,#fff) 55%, transparent);border-radius:10px;flex-direction:column;margin:0 0 6px;display:flex;overflow:hidden}.Y4cvAW_thinkHead{box-sizing:border-box;cursor:default;width:100%;min-width:0;color:var(--dsw-alias-label-primary);text-align:start;background:0 0;border:none;align-items:center;gap:6px;padding:6px 10px;font-family:inherit;font-size:12.5px;line-height:18px;display:flex}button.Y4cvAW_thinkHead{cursor:pointer}.Y4cvAW_thinkHead:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_thinkChevron,.Y4cvAW_thinkIcon{color:var(--dsw-alias-label-secondary);flex:none;display:inline-flex}.Y4cvAW_thinkTitle{color:var(--dsw-alias-label-primary);flex:none;font-weight:500}.Y4cvAW_thinkStage{color:var(--dsw-alias-label-tertiary);flex:none;font-size:12px}.Y4cvAW_thinkElapsed{color:var(--dsw-alias-label-disabled);font-variant-numeric:tabular-nums;flex:none;font-size:11px}.Y4cvAW_thinkSummary{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:auto;font-size:12.5px;overflow:hidden}.Y4cvAW_thinkSpin{width:12px;height:12px;color:var(--dsw-alias-label-tertiary);border:2px solid;border-top-color:#0000;border-radius:50%;flex:none;animation:.8s linear infinite Y4cvAW_kb-spin}.Y4cvAW_thinkBody{color:var(--dsw-alias-label-tertiary);white-space:pre-wrap;word-break:break-word;max-height:240px;padding:2px 10px 8px 40px;font-size:12.5px;line-height:1.65;overflow-y:auto}.Y4cvAW_thinkLiveAnswer{white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary);margin-top:4px}.Y4cvAW_think[data-state=running] .Y4cvAW_thinkHead:after{content:\"\";inset-block:0;background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);pointer-events:none;width:220px;animation:2.6s ease-out infinite Y4cvAW_kb-think-sweep;position:absolute;left:0}.Y4cvAW_think[data-state=running] .Y4cvAW_thinkHead{position:relative;overflow:hidden}@keyframes Y4cvAW_kb-think-sweep{0%{left:-220px}90%,to{left:100%}}@media (prefers-reduced-motion:reduce){.Y4cvAW_think[data-state=running] .Y4cvAW_thinkHead:after{animation:none}}.Y4cvAW_composer{box-sizing:border-box;border:1px solid var(--dsw-alias-border-strong,#0f172a29);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));border-radius:16px;flex-direction:column;flex:none;align-items:stretch;gap:2px;margin:0 18px 16px;padding:10px 12px 8px;display:flex;position:relative;box-shadow:0 1px 2px #0f172a0a,0 6px 20px #0f172a12}.Y4cvAW_composer:focus-within{border-color:var(--dsw-alias-accent,#0d9d97);box-shadow:0 1px 2px #0d9d9714,0 6px 20px #0d9d971f}.Y4cvAW_chipsRow{flex-wrap:wrap;gap:6px;padding:2px 2px 4px;display:flex}.Y4cvAW_msgMentions{flex-wrap:wrap;justify-content:flex-end;gap:5px;margin-top:6px;display:flex}.Y4cvAW_chipReadOnly{cursor:default;opacity:.85;height:22px;padding:0 8px;font-size:11.5px}.Y4cvAW_chip{box-sizing:border-box;background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:8px;align-items:center;gap:5px;max-width:240px;height:26px;padding:0 3px 0 8px;display:inline-flex}.Y4cvAW_chipIcon{flex:none;place-items:center;display:grid}.Y4cvAW_chipFolder{color:var(--dsw-alias-interactive-bg-primary,#1266e3);background:#1266e317;border:1px solid #1266e347}.Y4cvAW_chipFolder .Y4cvAW_chipIcon{color:var(--dsw-alias-interactive-bg-primary,#1266e3)}.Y4cvAW_chipFolder .Y4cvAW_chipLabel{color:#1a56c4}.Y4cvAW_chipFolder .Y4cvAW_chipClose{color:#1266e38c}.Y4cvAW_chipFolder .Y4cvAW_chipClose:hover{color:#1266e3;background:#1266e31f}.Y4cvAW_chipFile{color:var(--dsw-alias-accent,#0d9d97);background:#0d9d9717;border:1px solid #0d9d974d}.Y4cvAW_chipFile .Y4cvAW_chipIcon{color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_chipFile .Y4cvAW_chipLabel{color:#0b7d78}.Y4cvAW_chipFile .Y4cvAW_chipClose{color:#0d9d978c}.Y4cvAW_chipFile .Y4cvAW_chipClose:hover{color:#0d9d97;background:#0d9d971f}.Y4cvAW_chipLabel{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-primary);font-size:12.5px;overflow:hidden}.Y4cvAW_chipClose{cursor:pointer;width:18px;height:18px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:5px;flex:none;place-items:center;display:grid}.Y4cvAW_chipClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_composerBar{align-items:center;gap:8px;padding:4px 2px 2px;display:flex}.Y4cvAW_modelWrap{display:inline-flex;position:relative}.Y4cvAW_modelMenu{z-index:30;border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);min-width:200px;max-height:340px;box-shadow:var(--dsw-elevation-prominent);border-radius:12px;flex-direction:column;padding:6px;display:flex;position:absolute;bottom:calc(100% + 8px);left:0;overflow-y:auto}.Y4cvAW_modelGroup{flex-direction:column;display:flex}.Y4cvAW_modelGroup+.Y4cvAW_modelGroup{border-top:1px dashed var(--dsw-alias-divider);margin-top:4px;padding-top:4px}.Y4cvAW_modelGroupTitle{letter-spacing:.02em;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;padding:4px 10px 2px;font-size:11px;font-weight:600;overflow:hidden}.Y4cvAW_modelStatus{color:var(--dsw-alias-label-secondary);padding:6px 10px;font-size:12px}.Y4cvAW_modelStatusError{color:#c2410c;align-items:center;gap:8px;padding:6px 10px;font-size:12px;display:flex}.Y4cvAW_modelRetry{cursor:pointer;color:var(--dsw-alias-interactive-bg-primary,#1266e3);background:0 0;border:none;border-radius:6px;flex:none;padding:2px 6px;font-family:inherit;font-size:12px}.Y4cvAW_modelRetry:hover{background:#1266e31a}.Y4cvAW_modelMenuItem{cursor:pointer;width:100%;min-height:30px;color:var(--dsw-alias-label-primary);text-align:left;white-space:nowrap;background:0 0;border:none;border-radius:7px;align-items:center;padding:0 10px;font-family:inherit;font-size:12.5px;display:flex}.Y4cvAW_modelMenuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modelMenuItemActive{color:var(--dsw-alias-accent,#0d9d97);font-weight:600}.Y4cvAW_modelBtn{cursor:pointer;height:26px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;align-items:center;gap:4px;padding:0 8px;font-family:inherit;font-size:12.5px;display:inline-flex}.Y4cvAW_modelBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_atBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;width:26px;height:26px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:50%;flex:none;place-items:center;padding:0;font-size:13px;font-weight:600;line-height:1;display:grid}.Y4cvAW_atBtn:hover{border-color:var(--dsw-alias-accent,#0d9d97);color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_barSpacer{flex:1}.Y4cvAW_send{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff;cursor:pointer;border:none;border-radius:50%;flex:none;place-items:center;width:32px;height:32px;display:grid}.Y4cvAW_send:disabled{opacity:.45;cursor:default}.Y4cvAW_mention{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);max-height:260px;box-shadow:var(--dsw-elevation-prominent);border-radius:12px;flex-direction:column;padding:6px;display:flex;position:absolute;bottom:calc(100% - 6px);left:18px;right:18px;overflow-y:auto}.Y4cvAW_mentionItem{cursor:pointer;text-align:left;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;width:100%;min-height:32px;padding:0 8px;font-family:inherit;display:flex}.Y4cvAW_mentionItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_mentionIcon{border-radius:5px;flex:none;place-items:center;width:18px;height:18px;display:grid}.Y4cvAW_mentionFolder{color:var(--dsw-alias-interactive-bg-primary,#1266e3);background:#1266e317}.Y4cvAW_mentionFile{color:var(--dsw-alias-accent,#0d9d97);background:#0d9d9717}.Y4cvAW_mentionLabel{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:12.5px;overflow:hidden}.Y4cvAW_input{resize:none;min-width:0;color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:0;outline:none;flex:1;max-height:140px;padding:6px 4px 2px;font-family:inherit;font-size:13.5px;line-height:1.5}.Y4cvAW_input::placeholder{color:#9ca3af}.Y4cvAW_sectionHead{justify-content:space-between;align-items:center;padding:2px 4px 6px;display:flex}.Y4cvAW_sectionTitle{letter-spacing:.6px;color:var(--dsw-alias-label-disabled);font-size:11px}.Y4cvAW_iconBtn{cursor:pointer;width:22px;height:22px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;place-items:center;display:grid}.Y4cvAW_iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_folderRow{border-radius:8px;align-items:center;gap:2px;display:flex;position:relative}.Y4cvAW_folderRow:hover,.Y4cvAW_folderRowOpen{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_folder{flex:1;min-width:0}.Y4cvAW_moreBtn{cursor:pointer;width:24px;height:24px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;flex:none;place-items:center;margin-right:2px;display:grid}.Y4cvAW_moreBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_emptyFiles{color:var(--dsw-alias-label-disabled);padding:6px 8px 6px 18px;font-size:11.5px}.Y4cvAW_folderMenu{z-index:10;border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);min-width:148px;box-shadow:var(--dsw-elevation-prominent);border-radius:12px;flex-direction:column;padding:6px;display:flex;position:absolute;right:0}.Y4cvAW_menuItem{cursor:pointer;width:100%;min-height:30px;color:var(--dsw-alias-label-primary);text-align:left;background:0 0;border:none;border-radius:7px;align-items:center;gap:8px;padding:0 8px;font-family:inherit;font-size:12.5px;display:flex}.Y4cvAW_menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_menuItemDanger{color:var(--dsw-alias-danger,#e5484d)}.Y4cvAW_menuItemDanger:hover{background:var(--dsw-alias-danger-bg,#e5484d1a)}.Y4cvAW_atIcon{width:16px;height:16px;color:var(--dsw-alias-accent,#0d9d97);flex:none;place-items:center;font-size:12px;font-weight:600;display:grid}.Y4cvAW_historyList{border-top:1px dashed var(--dsw-alias-divider);flex-direction:column;flex:1 1 0;gap:2px;min-height:0;margin-bottom:10px;padding-top:6px;display:flex;overflow-y:auto}.Y4cvAW_renameInput{border:1px solid var(--dsw-alias-accent,#0d9d97);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));min-width:0;min-height:26px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:6px;outline:none;flex:1;padding:0 8px;font-family:inherit;font-size:12.5px}.Y4cvAW_renameInput:focus{box-shadow:0 0 0 2px #0d9d9726}.Y4cvAW_historyItemWrap{border-radius:8px;align-items:center;gap:2px;display:flex;position:relative}.Y4cvAW_historyItemWrap:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_historyItem{cursor:pointer;min-width:0;min-height:30px;color:var(--dsw-alias-label-secondary);border-radius:8px;flex:1;align-items:center;gap:6px;padding:0 2px 0 8px;display:flex}.Y4cvAW_historyItemActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_historyTitle{white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;font-size:12.5px;overflow:hidden}.Y4cvAW_newChatBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;height:24px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:7px;align-items:center;gap:4px;padding:0 8px;font-family:inherit;font-size:11.5px;display:inline-flex}.Y4cvAW_newChatBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-accent,#0d9d97);border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modalOverlay{z-index:20;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.Y4cvAW_modal{background:var(--dsw-alias-bg-layer-2);width:360px;max-width:calc(100% - 48px);box-shadow:var(--dsw-elevation-prominent);border-radius:16px;padding:18px}.Y4cvAW_modalHead{justify-content:space-between;align-items:center;margin-bottom:10px;display:flex}.Y4cvAW_modalTitle{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600}.Y4cvAW_modalClose{cursor:pointer;width:26px;height:26px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:7px;place-items:center;display:grid}.Y4cvAW_modalClose:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modalBody{margin-bottom:16px}.Y4cvAW_modalHint{color:var(--dsw-alias-label-secondary);margin-bottom:8px;font-size:12px}.Y4cvAW_modalInput{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));width:100%;height:36px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:10px;outline:none;padding:0 10px;font-family:inherit;font-size:13.5px}.Y4cvAW_modalInput:focus{border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modalFoot{justify-content:flex-end;gap:10px;display:flex}.Y4cvAW_modalBtnSecondary,.Y4cvAW_modalBtnPrimary{cursor:pointer;border-radius:9px;height:34px;padding:0 14px;font-family:inherit;font-size:13px}.Y4cvAW_modalBtnSecondary{border:1px solid var(--dsw-alias-divider);color:var(--dsw-alias-label-secondary);background:0 0}.Y4cvAW_modalBtnSecondary:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modalBtnPrimary{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff;border:none}.Y4cvAW_modalBtnPrimary:hover{opacity:.9}.Y4cvAW_docViewerOverlay{z-index:20;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.Y4cvAW_docViewer{background:var(--dsw-alias-bg-layer-2);width:720px;max-width:calc(100% - 48px);height:min(560px,100% - 48px);box-shadow:var(--dsw-elevation-prominent);border-radius:16px;flex-direction:column;display:flex;overflow:hidden}.Y4cvAW_docViewerHead{border-bottom:1px solid var(--dsw-alias-divider);flex:none;justify-content:space-between;align-items:center;padding:14px 16px;display:flex}.Y4cvAW_docViewerTitle{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:14px;font-weight:600;overflow:hidden}.Y4cvAW_docViewerTag{color:var(--dsw-alias-brand-6,#7c5cff);border:1px solid var(--dsw-alias-divider);vertical-align:1px;border-radius:999px;margin-left:8px;padding:1px 8px;font-size:11px;font-style:normal;font-weight:500}.Y4cvAW_docViewerOpen{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-divider);cursor:pointer;border-radius:7px;flex:none;align-items:center;gap:5px;margin-right:10px;padding:5px 10px;font-size:12px;text-decoration:none;display:inline-flex}.Y4cvAW_docViewerOpen:hover{opacity:.88}.Y4cvAW_docViewerHint{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-divider);border-radius:8px;margin-bottom:12px;padding:8px 12px;font-size:12px;line-height:1.6}.Y4cvAW_docViewerClose{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:7px;place-items:center;display:grid}.Y4cvAW_docViewerClose:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_docViewerBody{flex:1;min-height:0;padding:16px;overflow-y:auto}.Y4cvAW_docViewerContent{white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary);background:0 0;margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12.5px;line-height:1.7}.Y4cvAW_winControls{align-items:center;gap:2px;display:flex}.Y4cvAW_winBtn{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;place-items:center;display:grid}.Y4cvAW_winBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_winClose:hover{color:#e81123;background:#e811231f}.Y4cvAW_panelMax{border-radius:0;width:100vw;max-width:none;height:100vh}.Y4cvAW_miniLayer{z-index:1000;pointer-events:none;position:fixed;inset:0}.Y4cvAW_miniPill{pointer-events:auto;border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent);cursor:pointer;color:var(--dsw-alias-label-primary);border-radius:999px;align-items:center;gap:8px;padding:10px 18px;font-family:inherit;font-size:13px;font-weight:600;display:flex;position:absolute;bottom:24px;right:24px}.Y4cvAW_miniPill:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_footRow{gap:6px;display:flex}.Y4cvAW_footBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;min-width:0;height:34px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:10px;flex:1;justify-content:center;align-items:center;gap:5px;padding:0 4px;font-family:inherit;font-size:12px;display:flex}.Y4cvAW_footBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_modalWide{flex-direction:column;width:620px;max-height:calc(100% - 48px);display:flex}.Y4cvAW_modalSub{color:var(--dsw-alias-label-secondary);margin-top:2px;font-size:12px}.Y4cvAW_modalScroll{min-height:0;overflow-y:auto}.Y4cvAW_idxCount{color:var(--dsw-alias-label-secondary);margin:4px 0 10px;font-size:13px}.Y4cvAW_idxCount b{color:var(--dsw-alias-label-primary);font-size:22px}.Y4cvAW_idxBar{border-radius:999px;height:14px;display:flex;overflow:hidden}.Y4cvAW_idxBar i{height:100%}.Y4cvAW_idxLegend{flex-wrap:wrap;gap:10px;margin:10px 0 2px;display:flex}.Y4cvAW_idxLegend span{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;font-size:11.5px;display:flex}.Y4cvAW_idxLegend i{border-radius:50%;width:8px;height:8px}.Y4cvAW_idxCard{background:var(--dsw-alias-interactive-bg-hover,#7f7f7f14);border-radius:14px;margin:14px 0;padding:4px 16px}.Y4cvAW_idxRow{border-bottom:1px solid var(--dsw-alias-divider);color:var(--dsw-alias-label-primary);align-items:center;gap:10px;padding:11px 2px;font-size:13px;display:flex}.Y4cvAW_idxVal{color:var(--dsw-alias-label-secondary);margin-left:auto}.Y4cvAW_idxPill{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary);border-radius:999px;align-items:center;gap:6px;margin-left:auto;padding:2px 10px;font-size:11.5px;display:flex}.Y4cvAW_dotGreen{background:#22c55e;border-radius:50%;width:7px;height:7px}.Y4cvAW_dotAmber{background:#f59e0b;border-radius:50%;width:7px;height:7px}.Y4cvAW_idxLastRebuild{color:var(--dsw-alias-label-secondary);margin:-6px 0 8px;font-size:12px}.Y4cvAW_setRow{border-bottom:1px solid var(--dsw-alias-divider);color:var(--dsw-alias-label-primary);justify-content:space-between;align-items:center;gap:16px;padding:11px 2px;font-size:13px;display:flex}.Y4cvAW_setRow:last-child{border-bottom:none}.Y4cvAW_setRowDesc{color:var(--dsw-alias-label-secondary);margin-top:2px;font-size:12px}.Y4cvAW_sw{vertical-align:middle;flex:none;width:44px;height:24px;display:inline-block;position:relative}.Y4cvAW_sw input{opacity:0;cursor:pointer;margin:0;position:absolute;inset:0}.Y4cvAW_sw i{background:#7f7f7f59;border-radius:999px;transition:background .18s;position:absolute;inset:0}.Y4cvAW_sw i:after{content:\"\";background:#fff;border-radius:50%;width:18px;height:18px;transition:left .18s,background .18s;position:absolute;top:3px;left:3px;box-shadow:0 1px 2px #0000004d}.Y4cvAW_sw input:checked+i{background:var(--dsw-alias-interactive-bg-primary,#1266e3)}.Y4cvAW_sw input:checked+i:after{left:23px}.Y4cvAW_btnDanger{color:#fff;cursor:pointer;background:#dc2626;border:none;border-radius:9px;flex:none;height:32px;padding:0 16px;font-family:inherit;font-size:12.5px;font-weight:500}.Y4cvAW_btnDanger:hover{background:#b91c1c}.Y4cvAW_btnDanger:disabled{opacity:.55;cursor:default}.Y4cvAW_logsList{border:1px solid var(--dsw-alias-divider);border-radius:12px;min-height:120px;max-height:52vh;padding:4px 12px;overflow-y:auto}.Y4cvAW_logsEmpty{text-align:center;color:var(--dsw-alias-label-secondary);padding:28px 0;font-size:13px}.Y4cvAW_logRow{border-bottom:1px dashed var(--dsw-alias-divider);align-items:baseline;gap:10px;padding:8px 0;font-size:12.5px;display:flex}.Y4cvAW_logRow:last-child{border-bottom:none}.Y4cvAW_logTime{width:88px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;flex:none}.Y4cvAW_logAction{min-width:84px;color:var(--dsw-alias-label-primary);flex:none;font-weight:600}.Y4cvAW_logDetail{color:var(--dsw-alias-label-secondary);word-break:break-all}.Y4cvAW_logsFoot{justify-content:flex-end;align-items:center;gap:8px;margin-top:12px;display:flex}.Y4cvAW_logsCount{color:var(--dsw-alias-label-secondary);margin-right:auto;font-size:12px}.Y4cvAW_logBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;height:30px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:9px;align-items:center;gap:5px;padding:0 12px;font-family:inherit;font-size:12px;display:inline-flex}.Y4cvAW_logBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_footBtnBusy{color:#f59e0b;background:#f59e0b14;border-color:#f59e0b73}.Y4cvAW_footSpin{border:2px solid;border-top-color:#0000;border-radius:50%;flex:none;width:12px;height:12px;animation:.8s linear infinite Y4cvAW_kb-spin}@keyframes Y4cvAW_kb-spin{to{transform:rotate(360deg)}}.Y4cvAW_idxFilesHead{align-items:center;gap:10px;margin:16px 0 4px;display:flex}.Y4cvAW_idxFilesTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600}.Y4cvAW_idxFilesSub{color:var(--dsw-alias-label-secondary);font-size:12px}.Y4cvAW_idxFileRow{border-bottom:1px dashed var(--dsw-alias-divider);align-items:center;gap:10px;padding:8px 2px;display:flex}.Y4cvAW_idxFileRow:last-of-type{border-bottom:none}.Y4cvAW_idxFileExt{text-align:center;background:var(--dsw-alias-interactive-bg-hover,#7f7f7f1a);letter-spacing:.02em;width:44px;color:var(--dsw-alias-label-secondary);border-radius:6px;flex:none;padding:3px 0;font-size:10px;font-weight:700}.Y4cvAW_idxFileInfo{flex:1;min-width:0}.Y4cvAW_idxFileName{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;font-size:12.5px;overflow:hidden}.Y4cvAW_idxFileMeta{color:var(--dsw-alias-label-secondary);margin-top:1px;font-size:11.5px}.Y4cvAW_reidxBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;height:26px;color:var(--dsw-alias-label-primary);background:0 0;border-radius:8px;flex:none;align-items:center;gap:5px;padding:0 12px;font-family:inherit;font-size:11.5px;display:inline-flex}.Y4cvAW_reidxBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_reidxBtn:disabled{opacity:.6;cursor:default;color:#f59e0b;border-color:#f59e0b73}.Y4cvAW_idxDone{color:var(--dsw-alias-ok,#2f9e6e);flex:none;font-size:11.5px}.Y4cvAW_idxParsing{color:var(--dsw-alias-warning,#c98a1b);flex:none;align-items:center;gap:5px;font-size:11.5px;display:inline-flex}.Y4cvAW_idxFailed{color:var(--dsw-alias-danger,#e5484d);flex:none;font-size:11.5px}.Y4cvAW_sidebarCollapsed{align-items:center;width:52px;padding:14px 6px}.Y4cvAW_sidebarCollapsed .Y4cvAW_sidebarHead{flex-direction:column;justify-content:flex-start;align-items:center;gap:8px;width:100%;margin-bottom:0}.Y4cvAW_sidebarCollapsed .Y4cvAW_winControls{flex-direction:column;align-items:center;gap:4px}.Y4cvAW_railFoot{border-top:1px solid var(--dsw-alias-divider);flex-direction:column;align-items:center;gap:4px;width:100%;margin-top:auto;padding-top:10px;display:flex}.Y4cvAW_railFootBtn{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;flex:none;place-items:center;display:grid}.Y4cvAW_railFootBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_modelsModal{width:720px}.Y4cvAW_modelsDeviceRow{align-items:center;gap:10px;margin:2px 0 10px;display:flex}.Y4cvAW_modelsDeviceLabel{color:var(--dsw-alias-label-secondary);font-size:12px}.Y4cvAW_modelsDeviceChip{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));height:24px;color:var(--dsw-alias-label-primary);border-radius:999px;align-items:center;gap:6px;padding:0 10px;font-size:12px;display:inline-flex}.Y4cvAW_modelsDeviceTorch{color:var(--dsw-alias-label-secondary);font-size:11px;font-style:normal}.Y4cvAW_modelsCat{border-bottom:1px solid var(--dsw-alias-divider);padding:12px 2px}.Y4cvAW_modelsCatHead{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.Y4cvAW_modelsCatTitle{color:var(--dsw-alias-label-primary);font-size:13.5px;font-weight:600}.Y4cvAW_modelsCatHint{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:11px}.Y4cvAW_modelsCatDesc{color:var(--dsw-alias-label-secondary);margin:3px 0 8px;font-size:12px}.Y4cvAW_modelsCatNote{color:#dc2626;background:#dc262614;border-radius:8px;margin-top:8px;padding:8px 10px;font-size:12px}.Y4cvAW_modelsSelect{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));width:100%;height:34px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:9px;outline:none;padding:0 10px;font-family:inherit;font-size:13px}.Y4cvAW_modelsSelect:focus{border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modelsEntry{justify-content:space-between;align-items:center;gap:14px;padding:8px 2px;display:flex}.Y4cvAW_modelsEntryName{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;font-size:13px;display:flex}.Y4cvAW_modelsCurrentTag{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff;border-radius:999px;padding:1px 7px;font-size:10.5px}.Y4cvAW_modelsReadyChip{color:#0d9d97;background:#14b8a61f;border-radius:999px;padding:3px 9px;font-size:11.5px}.Y4cvAW_modelsBusyChip{color:#b45309;background:#f59e0b24;border-radius:999px;padding:3px 9px;font-size:11.5px}.Y4cvAW_modelsDlBtn,.Y4cvAW_modelsSetBtn,.Y4cvAW_modelsSaveBtn,.Y4cvAW_modelsRestartBtn{cursor:pointer;border:none;border-radius:8px;align-items:center;gap:5px;height:30px;padding:0 12px;font-family:inherit;font-size:12px;display:inline-flex}.Y4cvAW_modelsDlBtn{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff}.Y4cvAW_modelsDlBtn:hover{opacity:.9}.Y4cvAW_modelsSetBtn{border:1px solid var(--dsw-alias-divider);color:var(--dsw-alias-label-primary);background:0 0}.Y4cvAW_modelsSetBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modelsProgressBar{background:var(--dsw-alias-interactive-bg-primary,#1266e3);opacity:.75;border-radius:8px;width:0;transition:width .3s;position:absolute;inset:0 auto 0 0}.Y4cvAW_modelsProgressText{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;align-items:center;padding:0 8px;font-size:10.5px;display:flex;position:absolute;inset:0;overflow:hidden}.Y4cvAW_modelsAddToggle{border:1px dashed var(--dsw-alias-divider);height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:9px;align-items:center;gap:6px;padding:0 12px;font-family:inherit;font-size:12.5px;display:inline-flex}.Y4cvAW_modelsAddToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_modelsFieldLabel{color:var(--dsw-alias-label-secondary);font-size:11.5px}.Y4cvAW_modelsInput{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);height:32px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:8px;outline:none;padding:0 9px;font-family:inherit;font-size:12.5px}.Y4cvAW_modelsInput:focus{border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modelsSaveBtn{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff}.Y4cvAW_modelsSaveBtn:hover:not(:disabled){opacity:.9}.Y4cvAW_modelsFoot{justify-content:flex-end;align-items:center;gap:10px;margin-top:12px;display:flex}.Y4cvAW_modelsRestartBtn{color:#fff;background:#dc2626}.Y4cvAW_modelsRestartBtn:hover:not(:disabled){opacity:.9}.Y4cvAW_modelsRestartHint{color:#dc2626;margin-right:auto;font-size:11.5px}.Y4cvAW_modelsRuntimeRow{border-top:1px dashed var(--dsw-alias-divider);justify-content:space-between;align-items:center;gap:14px;margin-top:4px;padding:8px 2px;display:flex}.Y4cvAW_modelsModal{border-radius:18px;width:780px;padding:20px 22px}.Y4cvAW_modelsModal .Y4cvAW_modalHead{margin-bottom:14px}.Y4cvAW_modelsModal .Y4cvAW_modalTitle{letter-spacing:.1px;align-items:center;gap:9px;font-size:17px;display:flex}.Y4cvAW_modelsHeadIcon{color:#0d9d97;background:#0d9d9721;border-radius:9px;flex:none;place-items:center;width:30px;height:30px;display:grid}.Y4cvAW_modelsDeviceRow{border:1px solid var(--dsw-alias-divider);background:linear-gradient(90deg,#0d9d9717,#0000 65%);border-radius:13px;align-items:center;gap:10px;margin:2px 0 14px;padding:10px 14px;display:flex}.Y4cvAW_modelsDeviceLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:550}.Y4cvAW_modelsDeviceChip{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));height:26px;color:var(--dsw-alias-label-primary);border-radius:999px;align-items:center;gap:7px;padding:0 12px;font-size:12px;font-weight:600;display:inline-flex}.Y4cvAW_modelsDeviceDot{background:#10b981;border-radius:50%;width:8px;height:8px;box-shadow:0 0 0 3px #10b9812e}.Y4cvAW_modelsDeviceTorch{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover,#7f7f7f1f);border-radius:999px;padding:2px 8px;font-size:11px;font-style:normal;font-weight:400}.Y4cvAW_modelsCounts{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;margin-left:auto;font-size:11px;display:inline-flex}.Y4cvAW_modelsCounts b{color:#0d9d97;font-weight:650}.Y4cvAW_modelsGrid{grid-template-columns:1fr 1fr;gap:12px;display:grid}@media (width<=640px){.Y4cvAW_modelsGrid{grid-template-columns:1fr}}.Y4cvAW_modelsCat{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));border-radius:14px;margin-bottom:12px;padding:14px 16px 12px;box-shadow:0 1px 2px #0000000a}.Y4cvAW_modelsGrid .Y4cvAW_modelsCat{margin-bottom:0}.Y4cvAW_modelsCatHead{justify-content:space-between;align-items:center;gap:12px;margin-bottom:2px;display:flex}.Y4cvAW_modelsCatTitle{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;font-size:14px;font-weight:650;display:flex}.Y4cvAW_modelsCatIcon{width:26px;height:26px;color:var(--cat,#0d9d97);background:#0d9d971f;background:color-mix(in srgb, var(--cat,#0d9d97) 13%, transparent);border-radius:8px;flex:none;place-items:center;display:grid}.Y4cvAW_modelsCatHint{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover,#7f7f7f1a);white-space:nowrap;border-radius:999px;padding:2px 9px;font-size:11px}.Y4cvAW_modelsCatDesc{color:var(--dsw-alias-label-secondary);margin:4px 0 8px;padding-left:34px;font-size:12px}.Y4cvAW_modelsCatNote{color:#dc2626;background:#dc262612;border:1px solid #dc262640;border-radius:10px;margin-top:8px;padding:9px 12px;font-size:12px}.Y4cvAW_modelsSelect{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);width:100%;height:36px;color:var(--dsw-alias-label-primary);box-sizing:border-box;cursor:pointer;border-radius:10px;outline:none;padding:0 11px;font-family:inherit;font-size:13px;transition:border-color .15s,box-shadow .15s}.Y4cvAW_modelsSelect:focus{border-color:var(--dsw-alias-accent,#0d9d97);box-shadow:0 0 0 3px #0d9d9724}.Y4cvAW_modelsEntry{border-radius:10px;justify-content:space-between;align-items:center;gap:14px;margin:0 -6px;padding:8px 10px;transition:background .15s;display:flex}.Y4cvAW_modelsEntry:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modelsEntryInfo{flex:1;min-width:0}.Y4cvAW_modelsEntryName{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;font-size:13px;font-weight:550;display:flex}.Y4cvAW_modelsCurrentTag{background:linear-gradient(135deg, var(--dsw-alias-interactive-bg-primary,#1266e3), #0d9d97);color:#fff;letter-spacing:.2px;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:600}.Y4cvAW_modelsEntryMeta{color:var(--dsw-alias-label-secondary);margin-top:2px;font-size:11.5px}.Y4cvAW_modelsEntryNote{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));margin-top:2px;font-size:11px}.Y4cvAW_modelsEntryError{color:#dc2626;word-break:break-all;margin-top:3px;font-size:11.5px}.Y4cvAW_modelsEntryActions{flex:none;align-items:center;gap:8px;display:flex}.Y4cvAW_modelsReadyChip,.Y4cvAW_modelsBusyChip{border-radius:999px;align-items:center;gap:5px;padding:3px 10px;font-size:11.5px;font-weight:550;display:inline-flex}.Y4cvAW_modelsReadyChip:before,.Y4cvAW_modelsBusyChip:before{content:\"\";border-radius:50%;width:6px;height:6px}.Y4cvAW_modelsReadyChip{color:#059669;background:#10b9811f}.Y4cvAW_modelsReadyChip:before{background:#10b981;box-shadow:0 0 0 2px #10b9812e}.Y4cvAW_modelsBusyChip{color:#b45309;background:#f59e0b24}.Y4cvAW_modelsBusyChip:before{background:#f59e0b;animation:1.1s ease-in-out infinite Y4cvAW_modelsPulse}@keyframes Y4cvAW_modelsPulse{0%,to{opacity:1}50%{opacity:.35}}.Y4cvAW_modelsDlBtn,.Y4cvAW_modelsSetBtn,.Y4cvAW_modelsSaveBtn,.Y4cvAW_modelsRestartBtn{cursor:pointer;border:none;border-radius:9px;align-items:center;gap:5px;height:30px;padding:0 13px;font-family:inherit;font-size:12px;font-weight:550;transition:filter .15s,background .15s,box-shadow .15s,opacity .15s;display:inline-flex}.Y4cvAW_modelsDlBtn{background:linear-gradient(135deg, var(--dsw-alias-interactive-bg-primary,#1266e3), #0d9d97);color:#fff;box-shadow:0 1px 3px #0d9d974d}.Y4cvAW_modelsDlBtn:hover{filter:brightness(1.07);box-shadow:0 2px 6px #0d9d9759}.Y4cvAW_modelsSetBtn{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.Y4cvAW_modelsSetBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-divider-strong,var(--dsw-alias-divider))}.Y4cvAW_modelsSetBtn:disabled{opacity:.45;cursor:default}.Y4cvAW_modelsProgress{background:#7f7f7f26;border-radius:9px;height:18px;margin-top:7px;position:relative;overflow:hidden}.Y4cvAW_modelsProgressBar{background:linear-gradient(90deg, var(--dsw-alias-interactive-bg-primary,#1266e3), #0d9d97);opacity:.85;background-image:linear-gradient(45deg,#ffffff2e 25%,#0000 25% 50%,#ffffff2e 50% 75%,#0000 75%);background-size:22px 22px;border-radius:9px;width:0;transition:width .3s;animation:.8s linear infinite Y4cvAW_modelsStripes;position:absolute;inset:0 auto 0 0}@keyframes Y4cvAW_modelsStripes{0%{background-position:0 0}to{background-position:22px 0}}.Y4cvAW_modelsProgressText{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;align-items:center;padding:0 9px;font-size:10.5px;font-weight:550;display:flex;position:absolute;inset:0;overflow:hidden}.Y4cvAW_modelsRuntimeRow{background:#d9770612;border:1px solid #d9770652;border-radius:11px;justify-content:space-between;align-items:center;gap:14px;margin:8px -6px 0;padding:10px 12px;display:flex}.Y4cvAW_modelsRuntimeOk{background:#10b98112;border-color:#10b9814d}.Y4cvAW_modelsAddBlock{padding:2px}.Y4cvAW_modelsAddToggle{border:1px dashed var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));height:34px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:10px;align-items:center;gap:6px;padding:0 14px;font-family:inherit;font-size:12.5px;font-weight:550;transition:color .15s,background .15s,border-color .15s;display:inline-flex}.Y4cvAW_modelsAddToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modelsForm{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));border-radius:14px;margin-top:10px;padding:14px}.Y4cvAW_modelsFormGrid{grid-template-columns:1fr 1fr;gap:11px 13px;display:grid}.Y4cvAW_modelsField{flex-direction:column;gap:5px;display:flex}.Y4cvAW_modelsFieldLabel{color:var(--dsw-alias-label-secondary);font-size:11.5px;font-weight:550}.Y4cvAW_modelsInput{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);height:34px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:9px;outline:none;padding:0 10px;font-family:inherit;font-size:12.5px;transition:border-color .15s,box-shadow .15s}.Y4cvAW_modelsInput:focus{border-color:var(--dsw-alias-accent,#0d9d97);box-shadow:0 0 0 3px #0d9d9724}.Y4cvAW_modelsFormFoot{justify-content:space-between;align-items:center;gap:12px;margin-top:13px;display:flex}.Y4cvAW_modelsAddDesc{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:11px}.Y4cvAW_modelsSaveBtn{background:linear-gradient(135deg, var(--dsw-alias-interactive-bg-primary,#1266e3), #0d9d97);color:#fff;box-shadow:0 1px 3px #0d9d974d}.Y4cvAW_modelsSaveBtn:hover:not(:disabled){filter:brightness(1.07)}.Y4cvAW_modelsSaveBtn:disabled{opacity:.5;cursor:default}.Y4cvAW_modelsFoot{border-top:1px solid var(--dsw-alias-divider);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 90%, transparent);backdrop-filter:blur(8px);border-radius:0 0 18px 18px;justify-content:flex-end;align-items:center;gap:10px;margin:16px -22px -20px;padding:13px 22px;display:flex;position:sticky;bottom:-20px}.Y4cvAW_modelsRestartBtn{color:#fff;background:linear-gradient(135deg,#dc2626,#b91c1c);box-shadow:0 1px 3px #dc26264d}.Y4cvAW_modelsRestartBtn:hover:not(:disabled){filter:brightness(1.08)}.Y4cvAW_modelsRestartBtn:disabled{opacity:.5;cursor:default}.Y4cvAW_modelsRestartHint{color:#dc2626;align-items:center;gap:6px;margin-right:auto;font-size:11.5px;display:inline-flex}.Y4cvAW_chatRow{flex-direction:row}.Y4cvAW_chatLeft{position:relative;flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}.Y4cvAW_artRail{box-sizing:border-box;flex:none;display:flex;flex-direction:column;width:236px;border-left:1px solid var(--dsw-alias-divider-strong,var(--dsw-alias-divider));background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));overflow:hidden;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}.Y4cvAW_artRail.Y4cvAW_artRailCollapsed{width:40px}.Y4cvAW_artRailRail{flex:1;width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0;cursor:pointer;background:0 0;border:none;font-family:inherit;color:var(--dsw-alias-label-secondary)}.Y4cvAW_artRailRail:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_artRailVert{writing-mode:vertical-rl;font-size:11.5px;line-height:16px;letter-spacing:2px;white-space:nowrap}.Y4cvAW_artRailHead{flex:none;display:flex;align-items:center;gap:6px;min-height:46px;padding:10px 8px 6px 12px}.Y4cvAW_artRailTitle{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:12.5px;font-weight:600;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.Y4cvAW_artRailCount{flex:none;box-sizing:border-box;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px;text-align:center}.Y4cvAW_artRailToggle{flex:none;box-sizing:border-box;cursor:pointer;width:24px;height:24px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:7px;padding:0;font-family:inherit}.Y4cvAW_artRailToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_artRailBody{flex:1;min-height:0;overflow-y:auto;padding:0 8px 14px}.Y4cvAW_artRailGroup{margin-bottom:12px}.Y4cvAW_artRailGroupHead{display:flex;align-items:center;gap:6px;padding:4px 6px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;overflow:hidden}.Y4cvAW_artRailGroupName{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.Y4cvAW_artRailGroupCount{flex:none;opacity:.7}.Y4cvAW_artRailFile{display:flex;align-items:center;gap:4px;border-radius:8px;padding:1px 2px 1px 6px}.Y4cvAW_artRailFile:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_artRailFileMain{flex:1;min-width:0;display:flex;align-items:center;gap:6px;cursor:pointer;background:0 0;border:none;padding:5px 0;font-family:inherit;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary);text-align:left}.Y4cvAW_artRailExt{flex:none;box-sizing:border-box;padding:0 4px;border-radius:5px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px;text-transform:uppercase}.Y4cvAW_artRailName{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.Y4cvAW_artRailAt{flex:none;box-sizing:border-box;cursor:pointer;height:22px;padding:0 7px;border-radius:7px;border:1px solid var(--dsw-alias-border-strong,var(--dsw-alias-divider));background:0 0;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:11px;line-height:20px;white-space:nowrap}.Y4cvAW_artRailAt:hover{border-color:var(--dsw-alias-accent,#0d9d97);color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_artRailEmpty{padding:18px 10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;text-align:center;opacity:.8}.Y4cvAW_sectionChev{cursor:pointer;display:inline-grid;place-items:center;width:18px;height:18px;margin-right:2px;border:none;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);flex:none;padding:0}.Y4cvAW_sectionChev:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_sectionCount{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:999px;flex:none;padding:0 6px;font-size:10.5px;line-height:16px}.Y4cvAW_listHidden{display:none!important}.Y4cvAW_menuNote{display:block;padding:6px 10px;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}.Y4cvAW_memberList{display:flex;flex-direction:column;gap:2px;max-height:180px;overflow-y:auto;margin:4px 0 10px;border:1px solid var(--dsw-alias-divider);border-radius:9px;padding:5px}.Y4cvAW_memberItem{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--dsw-alias-label-primary);padding:4px 6px;border-radius:6px;cursor:pointer}.Y4cvAW_memberItem:hover{background:var(--dsw-alias-interactive-bg-hover)}";
		const tagId = "dsh-raganything-kb/KnowledgeBaseRoot.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-raganything-kb";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var KnowledgeBaseRoot_module_css_default = {
			"listHidden": "Y4cvAW_listHidden",
			"memberItem": "Y4cvAW_memberItem",
			"memberList": "Y4cvAW_memberList",
			"menuNote": "Y4cvAW_menuNote",
			"sectionChev": "Y4cvAW_sectionChev",
			"sectionCount": "Y4cvAW_sectionCount",
			"artRail": "Y4cvAW_artRail",
			"artRailAt": "Y4cvAW_artRailAt",
			"artRailBody": "Y4cvAW_artRailBody",
			"artRailCollapsed": "Y4cvAW_artRailCollapsed",
			"artRailCount": "Y4cvAW_artRailCount",
			"artRailEmpty": "Y4cvAW_artRailEmpty",
			"artRailExt": "Y4cvAW_artRailExt",
			"artRailFile": "Y4cvAW_artRailFile",
			"artRailFileMain": "Y4cvAW_artRailFileMain",
			"artRailGroup": "Y4cvAW_artRailGroup",
			"artRailGroupCount": "Y4cvAW_artRailGroupCount",
			"artRailGroupHead": "Y4cvAW_artRailGroupHead",
			"artRailGroupName": "Y4cvAW_artRailGroupName",
			"artRailHead": "Y4cvAW_artRailHead",
			"artRailName": "Y4cvAW_artRailName",
			"artRailRail": "Y4cvAW_artRailRail",
			"artRailTitle": "Y4cvAW_artRailTitle",
			"artRailToggle": "Y4cvAW_artRailToggle",
			"artRailVert": "Y4cvAW_artRailVert",
			"chatLeft": "Y4cvAW_chatLeft",
			"chatRow": "Y4cvAW_chatRow",
			"ai": "Y4cvAW_ai",
			"atBtn": "Y4cvAW_atBtn",
			"atIcon": "Y4cvAW_atIcon",
			"barSpacer": "Y4cvAW_barSpacer",
			"btnDanger": "Y4cvAW_btnDanger",
			"bubble": "Y4cvAW_bubble",
			"chat": "Y4cvAW_chat",
			"chip": "Y4cvAW_chip",
			"chipClose": "Y4cvAW_chipClose",
			"chipFile": "Y4cvAW_chipFile",
			"chipFolder": "Y4cvAW_chipFolder",
			"chipIcon": "Y4cvAW_chipIcon",
			"chipLabel": "Y4cvAW_chipLabel",
			"chipReadOnly": "Y4cvAW_chipReadOnly",
			"chipsRow": "Y4cvAW_chipsRow",
			"clearBtn": "Y4cvAW_clearBtn",
			"close": "Y4cvAW_close",
			"composer": "Y4cvAW_composer",
			"composerBar": "Y4cvAW_composerBar",
			"docDetail": "Y4cvAW_docDetail",
			"docDetailClose": "Y4cvAW_docDetailClose",
			"docDetailError": "Y4cvAW_docDetailError",
			"docDetailHead": "Y4cvAW_docDetailHead",
			"docDetailId": "Y4cvAW_docDetailId",
			"docDetailMeta": "Y4cvAW_docDetailMeta",
			"docDetailName": "Y4cvAW_docDetailName",
			"docViewer": "Y4cvAW_docViewer",
			"docViewerBody": "Y4cvAW_docViewerBody",
			"docViewerClose": "Y4cvAW_docViewerClose",
			"docViewerContent": "Y4cvAW_docViewerContent",
			"docViewerHead": "Y4cvAW_docViewerHead",
			"docViewerHint": "Y4cvAW_docViewerHint",
			"docViewerOpen": "Y4cvAW_docViewerOpen",
			"docViewerOverlay": "Y4cvAW_docViewerOverlay",
			"docViewerTag": "Y4cvAW_docViewerTag",
			"docViewerTitle": "Y4cvAW_docViewerTitle",
			"dot": "Y4cvAW_dot",
			"dotAmber": "Y4cvAW_dotAmber",
			"dotGreen": "Y4cvAW_dotGreen",
			"dshKbNoticeIn": "Y4cvAW_dshKbNoticeIn",
			"empty": "Y4cvAW_empty",
			"emptyFiles": "Y4cvAW_emptyFiles",
			"fileName": "Y4cvAW_fileName",
			"fileRow": "Y4cvAW_fileRow",
			"fileRowWrap": "Y4cvAW_fileRowWrap",
			"fileStatus": "Y4cvAW_fileStatus",
			"files": "Y4cvAW_files",
			"folder": "Y4cvAW_folder",
			"folderChevron": "Y4cvAW_folderChevron",
			"folderCount": "Y4cvAW_folderCount",
			"folderGroup": "Y4cvAW_folderGroup",
			"folderIcon": "Y4cvAW_folderIcon",
			"folderLabel": "Y4cvAW_folderLabel",
			"folderList": "Y4cvAW_folderList",
			"folderMenu": "Y4cvAW_folderMenu",
			"folderName": "Y4cvAW_folderName",
			"folderRow": "Y4cvAW_folderRow",
			"folderRowOpen": "Y4cvAW_folderRowOpen",
			"footBtn": "Y4cvAW_footBtn",
			"footBtnBusy": "Y4cvAW_footBtnBusy",
			"footRow": "Y4cvAW_footRow",
			"footSpin": "Y4cvAW_footSpin",
			"hero": "Y4cvAW_hero",
			"heroLogo": "Y4cvAW_heroLogo",
			"heroSub": "Y4cvAW_heroSub",
			"heroTitle": "Y4cvAW_heroTitle",
			"historyItem": "Y4cvAW_historyItem",
			"historyItemActive": "Y4cvAW_historyItemActive",
			"historyItemWrap": "Y4cvAW_historyItemWrap",
			"historyList": "Y4cvAW_historyList",
			"historyTitle": "Y4cvAW_historyTitle",
			"iconBtn": "Y4cvAW_iconBtn",
			"idxBar": "Y4cvAW_idxBar",
			"idxCard": "Y4cvAW_idxCard",
			"idxCount": "Y4cvAW_idxCount",
			"idxDone": "Y4cvAW_idxDone",
			"idxFailed": "Y4cvAW_idxFailed",
			"idxFileExt": "Y4cvAW_idxFileExt",
			"idxFileInfo": "Y4cvAW_idxFileInfo",
			"idxFileMeta": "Y4cvAW_idxFileMeta",
			"idxFileName": "Y4cvAW_idxFileName",
			"idxFileRow": "Y4cvAW_idxFileRow",
			"idxFilesHead": "Y4cvAW_idxFilesHead",
			"idxFilesSub": "Y4cvAW_idxFilesSub",
			"idxFilesTitle": "Y4cvAW_idxFilesTitle",
			"idxLastRebuild": "Y4cvAW_idxLastRebuild",
			"idxLegend": "Y4cvAW_idxLegend",
			"idxParsing": "Y4cvAW_idxParsing",
			"idxPill": "Y4cvAW_idxPill",
			"idxRow": "Y4cvAW_idxRow",
			"idxVal": "Y4cvAW_idxVal",
			"input": "Y4cvAW_input",
			"kb-spin": "Y4cvAW_kb-spin",
			"kb-think-sweep": "Y4cvAW_kb-think-sweep",
			"kbPulse": "Y4cvAW_kbPulse",
			"logAction": "Y4cvAW_logAction",
			"logBtn": "Y4cvAW_logBtn",
			"logDetail": "Y4cvAW_logDetail",
			"logRow": "Y4cvAW_logRow",
			"logTime": "Y4cvAW_logTime",
			"logsCount": "Y4cvAW_logsCount",
			"logsEmpty": "Y4cvAW_logsEmpty",
			"logsFoot": "Y4cvAW_logsFoot",
			"logsList": "Y4cvAW_logsList",
			"markdownBubble": "Y4cvAW_markdownBubble",
			"mask": "Y4cvAW_mask",
			"mention": "Y4cvAW_mention",
			"mentionFile": "Y4cvAW_mentionFile",
			"mentionFolder": "Y4cvAW_mentionFolder",
			"mentionIcon": "Y4cvAW_mentionIcon",
			"mentionItem": "Y4cvAW_mentionItem",
			"mentionLabel": "Y4cvAW_mentionLabel",
			"menuItem": "Y4cvAW_menuItem",
			"menuItemDanger": "Y4cvAW_menuItemDanger",
			"message": "Y4cvAW_message",
			"messages": "Y4cvAW_messages",
			"messagesHead": "Y4cvAW_messagesHead",
			"messagesHeadTitle": "Y4cvAW_messagesHeadTitle",
			"messagesWrap": "Y4cvAW_messagesWrap",
			"miniLayer": "Y4cvAW_miniLayer",
			"miniPill": "Y4cvAW_miniPill",
			"modal": "Y4cvAW_modal",
			"modalBody": "Y4cvAW_modalBody",
			"modalBtnPrimary": "Y4cvAW_modalBtnPrimary",
			"modalBtnSecondary": "Y4cvAW_modalBtnSecondary",
			"modalClose": "Y4cvAW_modalClose",
			"modalFoot": "Y4cvAW_modalFoot",
			"modalHead": "Y4cvAW_modalHead",
			"modalHint": "Y4cvAW_modalHint",
			"modalInput": "Y4cvAW_modalInput",
			"modalOverlay": "Y4cvAW_modalOverlay",
			"modalScroll": "Y4cvAW_modalScroll",
			"modalSub": "Y4cvAW_modalSub",
			"modalTitle": "Y4cvAW_modalTitle",
			"modalWide": "Y4cvAW_modalWide",
			"modelBtn": "Y4cvAW_modelBtn",
			"modelGroup": "Y4cvAW_modelGroup",
			"modelGroupTitle": "Y4cvAW_modelGroupTitle",
			"modelMenu": "Y4cvAW_modelMenu",
			"modelMenuItem": "Y4cvAW_modelMenuItem",
			"modelMenuItemActive": "Y4cvAW_modelMenuItemActive",
			"modelRetry": "Y4cvAW_modelRetry",
			"modelStatus": "Y4cvAW_modelStatus",
			"modelStatusError": "Y4cvAW_modelStatusError",
			"modelWrap": "Y4cvAW_modelWrap",
			"modelsAddBlock": "Y4cvAW_modelsAddBlock",
			"modelsAddDesc": "Y4cvAW_modelsAddDesc",
			"modelsAddToggle": "Y4cvAW_modelsAddToggle",
			"modelsBusyChip": "Y4cvAW_modelsBusyChip",
			"modelsCat": "Y4cvAW_modelsCat",
			"modelsCatDesc": "Y4cvAW_modelsCatDesc",
			"modelsCatHead": "Y4cvAW_modelsCatHead",
			"modelsCatHint": "Y4cvAW_modelsCatHint",
			"modelsCatIcon": "Y4cvAW_modelsCatIcon",
			"modelsCatNote": "Y4cvAW_modelsCatNote",
			"modelsCatTitle": "Y4cvAW_modelsCatTitle",
			"modelsCounts": "Y4cvAW_modelsCounts",
			"modelsCurrentTag": "Y4cvAW_modelsCurrentTag",
			"modelsDeviceChip": "Y4cvAW_modelsDeviceChip",
			"modelsDeviceDot": "Y4cvAW_modelsDeviceDot",
			"modelsDeviceLabel": "Y4cvAW_modelsDeviceLabel",
			"modelsDeviceRow": "Y4cvAW_modelsDeviceRow",
			"modelsDeviceTorch": "Y4cvAW_modelsDeviceTorch",
			"modelsDlBtn": "Y4cvAW_modelsDlBtn",
			"modelsEntry": "Y4cvAW_modelsEntry",
			"modelsEntryActions": "Y4cvAW_modelsEntryActions",
			"modelsEntryError": "Y4cvAW_modelsEntryError",
			"modelsEntryInfo": "Y4cvAW_modelsEntryInfo",
			"modelsEntryMeta": "Y4cvAW_modelsEntryMeta",
			"modelsEntryName": "Y4cvAW_modelsEntryName",
			"modelsEntryNote": "Y4cvAW_modelsEntryNote",
			"modelsField": "Y4cvAW_modelsField",
			"modelsFieldLabel": "Y4cvAW_modelsFieldLabel",
			"modelsFoot": "Y4cvAW_modelsFoot",
			"modelsForm": "Y4cvAW_modelsForm",
			"modelsFormFoot": "Y4cvAW_modelsFormFoot",
			"modelsFormGrid": "Y4cvAW_modelsFormGrid",
			"modelsGrid": "Y4cvAW_modelsGrid",
			"modelsHeadIcon": "Y4cvAW_modelsHeadIcon",
			"modelsInput": "Y4cvAW_modelsInput",
			"modelsModal": "Y4cvAW_modelsModal",
			"modelsProgress": "Y4cvAW_modelsProgress",
			"modelsProgressBar": "Y4cvAW_modelsProgressBar",
			"modelsProgressText": "Y4cvAW_modelsProgressText",
			"modelsPulse": "Y4cvAW_modelsPulse",
			"modelsReadyChip": "Y4cvAW_modelsReadyChip",
			"modelsRestartBtn": "Y4cvAW_modelsRestartBtn",
			"modelsRestartHint": "Y4cvAW_modelsRestartHint",
			"modelsRuntimeOk": "Y4cvAW_modelsRuntimeOk",
			"modelsRuntimeRow": "Y4cvAW_modelsRuntimeRow",
			"modelsSaveBtn": "Y4cvAW_modelsSaveBtn",
			"modelsSelect": "Y4cvAW_modelsSelect",
			"modelsSetBtn": "Y4cvAW_modelsSetBtn",
			"modelsStripes": "Y4cvAW_modelsStripes",
			"moreBtn": "Y4cvAW_moreBtn",
			"msgMentions": "Y4cvAW_msgMentions",
			"msgTime": "Y4cvAW_msgTime",
			"msgTimeUser": "Y4cvAW_msgTimeUser",
			"newChatBtn": "Y4cvAW_newChatBtn",
			"notice": "Y4cvAW_notice",
			"off": "Y4cvAW_off",
			"on": "Y4cvAW_on",
			"overlay": "Y4cvAW_overlay",
			"panel": "Y4cvAW_panel",
			"panelMax": "Y4cvAW_panelMax",
			"pinIconDsh": "Y4cvAW_pinIconDsh",
			"pinIconKb": "Y4cvAW_pinIconKb",
			"rail": "Y4cvAW_rail",
			"railFoot": "Y4cvAW_railFoot",
			"railFootBtn": "Y4cvAW_railFootBtn",
			"railRow": "Y4cvAW_railRow",
			"reidxBtn": "Y4cvAW_reidxBtn",
			"renameInput": "Y4cvAW_renameInput",
			"search": "Y4cvAW_search",
			"sectionHead": "Y4cvAW_sectionHead",
			"sectionTitle": "Y4cvAW_sectionTitle",
			"send": "Y4cvAW_send",
			"setRow": "Y4cvAW_setRow",
			"setRowDesc": "Y4cvAW_setRowDesc",
			"sidebar": "Y4cvAW_sidebar",
			"sidebarCollapsed": "Y4cvAW_sidebarCollapsed",
			"sidebarHead": "Y4cvAW_sidebarHead",
			"sidebarTitle": "Y4cvAW_sidebarTitle",
			"st-failed": "Y4cvAW_st-failed",
			"st-pending": "Y4cvAW_st-pending",
			"st-preprocessed": "Y4cvAW_st-preprocessed",
			"st-processed": "Y4cvAW_st-processed",
			"st-processing": "Y4cvAW_st-processing",
			"statusChip": "Y4cvAW_statusChip",
			"statusText": "Y4cvAW_statusText",
			"suggestion": "Y4cvAW_suggestion",
			"suggestions": "Y4cvAW_suggestions",
			"sw": "Y4cvAW_sw",
			"syncBtn": "Y4cvAW_syncBtn",
			"think": "Y4cvAW_think",
			"thinkBody": "Y4cvAW_thinkBody",
			"thinkChevron": "Y4cvAW_thinkChevron",
			"thinkElapsed": "Y4cvAW_thinkElapsed",
			"thinkHead": "Y4cvAW_thinkHead",
			"thinkIcon": "Y4cvAW_thinkIcon",
			"thinkLiveAnswer": "Y4cvAW_thinkLiveAnswer",
			"thinkSpin": "Y4cvAW_thinkSpin",
			"thinkStage": "Y4cvAW_thinkStage",
			"thinkSummary": "Y4cvAW_thinkSummary",
			"thinkTitle": "Y4cvAW_thinkTitle",
			"trigger": "Y4cvAW_trigger",
			"triggerLabel": "Y4cvAW_triggerLabel",
			"triggerRow": "Y4cvAW_triggerRow",
			"uploadBtn": "Y4cvAW_uploadBtn",
			"uploadRow": "Y4cvAW_uploadRow",
			"uploading": "Y4cvAW_uploading",
			"uploadingDot": "Y4cvAW_uploadingDot",
			"uploadingText": "Y4cvAW_uploadingText",
			"user": "Y4cvAW_user",
			"winBtn": "Y4cvAW_winBtn",
			"winClose": "Y4cvAW_winClose",
			"winControls": "Y4cvAW_winControls"
		};
		//#endregion
		//#region src/client/KnowledgeBaseRoot.tsx
		/**
		* Knowledge-base foot action: the 知识库 trigger row that the sidebar renders
		* directly ABOVE the Settings trigger (sidebar.footer.action stacks above
		* sidebar.settings), plus the full-viewport KB panel it opens.
		*
		* The panel is a self-contained RAG-Anything viewer: connection chip, live
		* document list (grouped by folder from GET /documents), search filter, and
		* a composer that runs real retrieval queries (POST /tasks op=query) with
		* graceful fallback to demo data when the sidecar is unreachable.
		*
		* v3 layout changes (2026-09-05):
		*  - "个人知识库" header gains a + button to create new folders.
		*  - Each folder row has an expand/collapse chevron and a "..." action menu
		*    (new sub-folder / rename / share / delete). Expanded folders list their
		*    files; clicking a file opens a raw-content viewer.
		*  - A new "历史对话" section sits below the knowledge base, listing all
		*    persisted chat sessions. A "新建对话" button starts a fresh session.
		*/
		/** Stable Markdown chrome copy (code-copy + footnotes) for AI answers. */
		function kbMarkdownLabels() {
			return {
				code: {
					copyLabel: "复制",
					copiedLabel: "已复制"
				},
				footnotes: "脚注"
			};
		}
		const SUGGESTIONS = [
			"总结《璇玑产品白皮书》的核心观点，输出 300 字摘要",
			"对比三个竞品知识库的文件夹权限设计",
			"提取本周会议纪要，生成待办清单",
			"基于 @设计资产 输出 UI 验收标准摘要"
		];
		/** Available chat models shown in the composer model selector (fallback). */
		const MODELS = [
			"Qwen3.8-Max",
			"Qwen3.5-Plus",
			"DeepSeek-V3.2"
		];
		/** Bar/legend palette for the 索引 modal's file-type distribution. */
		const IDX_COLORS = [
			"#14b8a6",
			"#38bdf8",
			"#fb923c",
			"#f87171",
			"#60a5fa",
			"#94a3b8",
			"#7dd3fc",
			"#fbbf24",
			"#34d399"
		];
		/** Compact human timestamp: HH:MM today, 昨天/日期 for older turns. */
		function formatTs(ts) {
			const d = new Date(ts);
			const now = /* @__PURE__ */ new Date();
			const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
			const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
			const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
			if (sameDay(d, now)) return hm;
			if (sameDay(d, yesterday)) return `昨天 ${hm}`;
			if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
			return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
		}
		/** Human seconds → "35 秒" / "1 分 23 秒" style label (locale-aware). */
		function formatElapsed(seconds, t) {
			const s = Math.max(0, Math.floor(seconds));
			if (s < 60) return t("kb.elapsedSec").replace("{s}", String(s));
			const m = Math.floor(s / 60);
			const r = s % 60;
			return r > 0 ? t("kb.elapsedMin").replace("{m}", String(m)).replace("{r}", String(r)) : t("kb.elapsedMinOnly").replace("{m}", String(m));
		}
		/** First line of a text block (the collapsed 思考过程 summary). */
		function firstLine(text) {
			const nl = text.indexOf("\n");
			return nl === -1 ? text : text.slice(0, nl);
		}
		/**
		* 思考过程 block above a KB answer — mirrors how DSH answers surface their
		* reasoning: while the query runs it shows the live working process (stage +
		* elapsed + growing thinking text) instead of a blank wait; when finished it
		* collapses to a one-line summary that expands on click, with the answer
		* rendered below it.
		*/
		function KbThinking({ live, thinking, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			if (live !== void 0) {
				const stageLabel = live.stage === "generating" ? live.answer !== "" ? t("kb.thinkAnswering") : t("kb.thinkReasoning") : t("kb.thinkSearching");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: KnowledgeBaseRoot_module_css_default.think,
					"data-state": "running",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: KnowledgeBaseRoot_module_css_default.thinkHead,
						role: "status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: KnowledgeBaseRoot_module_css_default.thinkIcon,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutline14, { size: 14 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: KnowledgeBaseRoot_module_css_default.thinkTitle,
								children: t("kb.think")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: KnowledgeBaseRoot_module_css_default.thinkStage,
								children: stageLabel
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: KnowledgeBaseRoot_module_css_default.thinkElapsed,
								children: formatElapsed(live.elapsed, t)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: KnowledgeBaseRoot_module_css_default.thinkSpin,
								"aria-hidden": "true"
							})
						]
					}), live.thinking !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: KnowledgeBaseRoot_module_css_default.thinkBody,
						children: live.thinking
					})]
				});
			}
			const text = (thinking ?? "").trim();
			if (text === "") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: KnowledgeBaseRoot_module_css_default.think,
				"data-state": "ok",
				"data-expanded": open || void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: KnowledgeBaseRoot_module_css_default.thinkHead,
					onClick: () => setOpen((v) => !v),
					"aria-expanded": open,
					"aria-label": t("kb.think"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: KnowledgeBaseRoot_module_css_default.thinkChevron,
							children: open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 12 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: KnowledgeBaseRoot_module_css_default.thinkIcon,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutline14, { size: 14 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: KnowledgeBaseRoot_module_css_default.thinkTitle,
							children: t("kb.think")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: KnowledgeBaseRoot_module_css_default.thinkSummary,
							title: text,
							children: firstLine(text)
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: KnowledgeBaseRoot_module_css_default.thinkBody,
					children: text
				})]
			});
		}
		/** Per-account localStorage namespace.
		 *  Browser state (chat history, KB folders, prefs) lives in localStorage,
		 *  which is scoped per ORIGIN — and every account shares one origin behind
		 *  the gateway. The gateway issues a readable `dsh_mu_user` cookie at
		 *  sign-in; prefixing every key with it keeps one account's data invisible
		 *  to another. Falls back to the shared key when the cookie is absent. */
		const MU_NS_RAW = (function () {
			try {
				const m = document.cookie.match(/(?:^|;\s*)dsh_mu_user=([^;]*)/);
				return m ? decodeURIComponent(m[1] || "") : "";
			} catch { return ""; }
		})();
		const MU_NS = MU_NS_RAW && /^[A-Za-z0-9_-]{1,64}$/.test(MU_NS_RAW) ? MU_NS_RAW + "." : "";
		const HISTORY_KEY = "dsh.kb." + MU_NS + "sessions.v1";
		const CUSTOM_FOLDERS_KEY = "dsh.kb." + MU_NS + "folders.v1";
		const LEGACY_HISTORY_KEY = "dsh.kb." + MU_NS + "history.v1";
		/** Pinned mirror folders rendered at the top of the personal KB tree. */
		const PIN_DSH = "DSH产物";
		const PIN_KB = "知识库产物";
		const PIN_ORDER = [PIN_DSH, PIN_KB];
		/** True when a folder path lives inside one of the pinned mirror subtrees. */
		function isPinnedPrefix(name) {
			return PIN_ORDER.some((p) => name === p || name.startsWith(`${p}/`));
		}
		/** Flatten one path segment: separators are not allowed inside a folder name. */
		function sanitizeSeg(value) {
			return value.replace(/[/\\]+/g, "_").trim() || "未命名";
		}
		/** Doc status → locale key. */
		const STATUS_KEYS = {
			processed: "kb.status.processed",
			processing: "kb.status.processing",
			pending: "kb.status.pending",
			failed: "kb.status.failed",
			preprocessed: "kb.status.preprocessed"
		};
		function generateId() {
			return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
		}
		/** Simple inline push-pin icon for the session "pin" action. */
		function PinIcon({ size = 14 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16 12V4h1V2H7v2h1v8l-4 4v2h6v6h2v-6h6v-2l-4-4z" })
			});
		}
		/** Minimal upload icon (tray + up arrow); the primitives set has no upload glyph. */
		function UploadIcon({ size = 13 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 10.5V2.5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4.8 5.2 8 2l3.2 3.2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" })
				]
			});
		}
		/** Home icon (back-home affordance; not in the ui-primitives icon set). */
		function HomeIcon({ size = 13 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.5 7.5 8 2.5l5.5 5" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 7v6.5h8V7" })]
			});
		}
		/** Byte size → compact human string. */
		function formatSize(bytes) {
			if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
			const units = [
				"B",
				"KB",
				"MB",
				"GB",
				"TB"
			];
			let v = bytes;
			let i = 0;
			while (v >= 1024 && i < units.length - 1) {
				v /= 1024;
				i += 1;
			}
			return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
		}
		/** ISO timestamp → "x 分钟前" style relative label. */
		function formatRel(iso) {
			if (!iso) return "-";
			const t = Date.parse(iso);
			if (!Number.isFinite(t)) return "-";
			const mins = Math.max(0, Math.round((Date.now() - t) / 6e4));
			if (mins < 1) return "刚刚";
			if (mins < 60) return `${mins} 分钟前`;
			const hours = Math.round(mins / 60);
			if (hours < 24) return `${hours} 小时前`;
			return `${Math.round(hours / 24)} 天前`;
		}
		/** Byte size (as returned by the sidecar model state) → "1.2 GB" style. */
		function formatBytes(bytes) {
			if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return "";
			const units = [
				"B",
				"KB",
				"MB",
				"GB",
				"TB"
			];
			let v = bytes;
			let i = 0;
			while (v >= 1024 && i < units.length - 1) {
				v /= 1024;
				i += 1;
			}
			return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
		}
		/** Summarize ready/missing counts across every catalog category. */
		function countModelStatus(snap) {
			if (snap === null) return {
				ready: 0,
				missing: 0
			};
			const all = Object.values(snap.catalog).flat();
			return {
				ready: all.filter((e) => e.status === "ready").length,
				missing: all.filter((e) => e.status === "missing").length
			};
		}
		/** A <select> for LLM/vision: DSH catalog (provider-grouped) + custom configs. */
		function ModelCategorySelect({ t, options, customs, current, onSelect }) {
			const groups = [];
			for (const o of options) {
				let g = groups.find((x) => x.provider === o.providerName);
				if (!g) {
					g = {
						provider: o.providerName || "DSH",
						items: []
					};
					groups.push(g);
				}
				g.items.push({
					id: o.id,
					name: o.name
				});
			}
			const inOptions = options.some((o) => o.id === current);
			const inCustom = customs.some((c) => c.model === current);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
				className: KnowledgeBaseRoot_module_css_default.modelsSelect,
				value: inOptions || inCustom ? current : "",
				onChange: (e) => {
					const val = e.target.value;
					if (!val) return;
					const custom = customs.find((c) => c.model === val);
					onSelect(val, custom?.base_url, custom?.api_key);
				},
				children: [
					!inOptions && !inCustom && current && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: current
					}),
					groups.map((g) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("optgroup", {
						label: g.provider,
						children: g.items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: item.id,
							children: item.name
						}, item.id))
					}, g.provider)),
					customs.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("optgroup", {
						label: t("kb.modelAddConfig"),
						children: customs.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: c.model,
							children: [
								c.name,
								" · ",
								c.model
							]
						}, c.model))
					})
				]
			});
		}
		/** One downloadable local model row: status chip + download button + 设为默认. */
		function LocalModelRow({ t, entry, download, isCurrent, onDownload, onSetDefault }) {
			const busy = download !== void 0 && (download.status === "queued" || download.status === "downloading");
			const failed = download?.status === "error";
			const meta = [
				entry.size_hint,
				entry.dims ? `${entry.dims}d` : "",
				entry.status === "ready" ? formatBytes(entry.size) || void 0 : void 0,
				entry.status === "ready" && entry.version ? `v${entry.version}` : void 0
			].filter(Boolean).join(" · ");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: KnowledgeBaseRoot_module_css_default.modelsEntry,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: KnowledgeBaseRoot_module_css_default.modelsEntryInfo,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: KnowledgeBaseRoot_module_css_default.modelsEntryName,
							children: [entry.name, isCurrent && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: KnowledgeBaseRoot_module_css_default.modelsCurrentTag,
								children: t("kb.modelCurrent")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: KnowledgeBaseRoot_module_css_default.modelsEntryMeta,
							children: meta || entry.device_note
						}),
						entry.device_note && entry.status !== "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: KnowledgeBaseRoot_module_css_default.modelsEntryNote,
							children: entry.device_note
						}),
						busy && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: KnowledgeBaseRoot_module_css_default.modelsProgress,
							role: "progressbar",
							"aria-valuenow": Math.round(download.pct),
							"aria-valuemin": 0,
							"aria-valuemax": 100,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.modelsProgressBar,
								style: { width: `${Math.min(100, download.pct)}%` }
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: KnowledgeBaseRoot_module_css_default.modelsProgressText,
								children: [
									t("kb.modelDownloading"),
									" ",
									Math.round(download.pct),
									"%",
									download.message ? ` · ${download.message}` : ""
								]
							})]
						}),
						failed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: KnowledgeBaseRoot_module_css_default.modelsEntryError,
							children: [
								t("kb.modelDownloadFail"),
								"：",
								download?.error
							]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: KnowledgeBaseRoot_module_css_default.modelsEntryActions,
					children: entry.status === "ready" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: KnowledgeBaseRoot_module_css_default.modelsReadyChip,
						children: t("kb.modelReady")
					}), !isCurrent && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: KnowledgeBaseRoot_module_css_default.modelsSetBtn,
						onClick: onSetDefault,
						children: t("kb.modelSetDefault")
					})] }) : busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: KnowledgeBaseRoot_module_css_default.modelsBusyChip,
						children: t("kb.modelDownloading")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: KnowledgeBaseRoot_module_css_default.modelsDlBtn,
						onClick: onDownload,
						title: entry.device_note,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 12 }), t("kb.modelDownload")]
					})
				})]
			});
		}
		const IDX_PREFS_KEY = "dsh.kb." + MU_NS + "idxPrefs.v1";
		/** Persisted collapse preference of the KB panel's left browser column. */
		const SIDEBAR_STATE_KEY = "dsh.kb." + MU_NS + "sidebar.v1";
		const PERSONAL_OPEN_KEY = "dsh.kb." + MU_NS + "personalOpen.v1";
		const SHARED_OPEN_KEY = "dsh.kb." + MU_NS + "sharedOpen.v1";
		/** 侧栏分区（个人/共享知识库）折叠状态持久化（2026-09-13）。 */
		function loadSectionOpen(key) {
			try {
				const raw = window.localStorage.getItem(key);
				return raw === null ? true : raw === "1";
			} catch {
				return true;
			}
		}
		function saveSectionOpen(key, open) {
			try {
				window.localStorage.setItem(key, open ? "1" : "0");
			} catch {}
		}
		function loadSidebarCollapsed() {
			try {
				const raw = window.localStorage.getItem(SIDEBAR_STATE_KEY);
				return raw !== null && JSON.parse(raw) === true;
			} catch {
				return false;
			}
		}
		function saveSidebarCollapsed(collapsed) {
			try {
				window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(collapsed));
			} catch {}
		}
		/** Persisted collapse preference of the KB panel's right artifact rail. */
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
		/** Index-modal switch defaults (audio/video parsing off by default, per sidecar config). */
		function loadIdxPrefs() {
			const defaults = {
				sleep: true,
				ocr: true,
				semantic: true,
				audio: false,
				video: false
			};
			try {
				const raw = window.localStorage.getItem(IDX_PREFS_KEY);
				return raw ? {
					...defaults,
					...JSON.parse(raw)
				} : defaults;
			} catch {
				return defaults;
			}
		}
		/** Toggle switch in the 索引 modal; persisted locally as an index preference. */
		function IdxToggle({ prefKey }) {
			const [prefs, setPrefs] = (0, react.useState)(loadIdxPrefs);
			const set = (v) => {
				setPrefs((prev) => {
					const next = {
						...prev,
						[prefKey]: v
					};
					try {
						window.localStorage.setItem(IDX_PREFS_KEY, JSON.stringify(next));
					} catch {}
					return next;
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: KnowledgeBaseRoot_module_css_default.sw,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: prefs[prefKey],
					onChange: (e) => set(e.target.checked)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {})]
			});
		}
		/**
		* Toggle for「DSH产物 / 知识库产物 是否纳入全局检索」（默认关）。
		* 开关落在 sidecar 的 kb-prefs.json（GET/PUT /prefs），全局生效；
		* localStorage 只做首屏缓存，避免弹窗打开时闪一下默认值。
		* 关闭只影响「不加 @ 的全局问答」；@显式指定产物文件/文件夹不受影响。
		*/
		function ArtifactToggle({ prefKey }) {
			const [on, setOn] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let live = true;
				try {
					const cached = window.localStorage.getItem(`dsh.kb.${MU_NS}artpref.${prefKey}`);
					if (cached !== null) setOn(JSON.parse(cached) === true);
				} catch {}
				ragFetch("/prefs").then(async (res) => {
					if (!res.ok || !live) return;
					const data = await res.json().catch(() => null);
					if (live && data && typeof data[prefKey] === "boolean") setOn(data[prefKey]);
				}).catch(() => {});
				return () => {
					live = false;
				};
			}, [prefKey]);
			const set = (v) => {
				setOn(v);
				try {
					window.localStorage.setItem(`dsh.kb.${MU_NS}artpref.${prefKey}`, JSON.stringify(v));
				} catch {}
				ragFetch("/prefs", {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ [prefKey]: v })
				}).catch(() => {});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: KnowledgeBaseRoot_module_css_default.sw,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: on,
					onChange: (e) => set(e.target.checked)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {})]
			});
		}
		/**
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
		/** Total file count of a node including all descendants. */
		function countAllFiles(node) {
			return node.files.length + node.children.reduce((sum, c) => sum + countAllFiles(c), 0);
		}
		/**
		* Build a nested tree from flat folder paths (e.g. "a/b") so that sub-folders
		* render under their parent instead of as same-level entries distinguished
		* only by naming. Intermediate segments become empty nodes as needed.
		*/
		function buildFolderTree(folders) {
			const rootNode = {
				fullPath: "",
				name: "",
				depth: -1,
				files: [],
				children: []
			};
			const index = /* @__PURE__ */ new Map();
			const ensure = (fullPath) => {
				const hit = index.get(fullPath);
				if (hit) return hit;
				const segments = fullPath.split("/");
				const parentPath = segments.slice(0, -1).join("/");
				const parent = parentPath === "" ? rootNode : ensure(parentPath);
				const node = {
					fullPath,
					name: segments[segments.length - 1] ?? "",
					depth: parent.depth + 1,
					files: [],
					children: []
				};
				index.set(fullPath, node);
				parent.children.push(node);
				return node;
			};
			for (const f of folders) ensure(f.name).files.push(...f.files);
			const sortAll = (nodes) => {
				const rank = (n) => {
					const i = PIN_ORDER.indexOf(n.fullPath);
					return i === -1 ? PIN_ORDER.length : i;
				};
				nodes.sort((a, b) => {
					const ra = rank(a);
					const rb = rank(b);
					return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
				});
				nodes.forEach((n) => sortAll(n.children));
			};
			sortAll(rootNode.children);
			return rootNode.children;
		}
		/**
		* Position a popup menu near its anchor button using viewport-fixed
		* coordinates so it is never clipped by the sidebar's `overflow:hidden`.
		* Opens upward when there is not enough room below the anchor.
		*/
		function menuFixedStyle(anchor, estHeight) {
			const rect = anchor.getBoundingClientRect();
			const width = 172;
			let left = rect.right - width;
			if (left < 8) left = 8;
			if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
			let top = rect.bottom + 4;
			if (top + estHeight > window.innerHeight - 8) {
				top = rect.top - estHeight - 4;
				if (top < 8) top = 8;
			}
			return {
				position: "fixed",
				top,
				left,
				right: "auto",
				minWidth: width - 24,
				zIndex: 40
			};
		}
		function makeSession(title = "") {
			const now = Date.now();
			return {
				id: generateId(),
				title: title || "新对话",
				messages: [],
				createdAt: now,
				updatedAt: now
			};
		}
		/** Migrate old single-array history into the first session, if present.
		*  The transient `live` progress field is never persisted — strip it so a
		*  page reload cannot resurrect a half-finished query bubble. */
		function sanitizeMessage(m) {
			if (m.live === void 0) return m;
			const { live: _live, ...rest } = m;
			return rest;
		}
		/**
		* Operation-log messages (upload/parse/ingest lifecycle and sidecar notices)
		* that older builds persisted into the chat. The chat is 问答-only now, so
		* drop any surviving copies when history is loaded.
		*/
		const OPERATION_LOG_RE = /^(已提交|RAG-Anything 入库完成|已开始重建索引|索引重建已在进行中|索引失败：|已有索引任务在进行中|\d+ 个文件上传失败)/;
		function isOperationLog(m) {
			return m.role === "ai" && OPERATION_LOG_RE.test(m.text);
		}
		function loadSessions() {
			try {
				const raw = window.localStorage.getItem(HISTORY_KEY);
				if (raw) {
					const parsed = JSON.parse(raw);
					if (Array.isArray(parsed)) {
						const valid = parsed.filter((s) => {
							const ss = s;
							return typeof ss === "object" && ss !== null && typeof ss.id === "string" && Array.isArray(ss.messages);
						}).map((s) => ({
							...s,
							messages: s.messages.map(sanitizeMessage).filter((m) => !isOperationLog(m))
						}));
						if (valid.length > 0) return valid;
					}
				}
				const legacy = window.localStorage.getItem(LEGACY_HISTORY_KEY);
				if (legacy) {
					const parsed = JSON.parse(legacy);
					if (Array.isArray(parsed)) {
						const messages = parsed.filter((m) => {
							const mm = m;
							return typeof m === "object" && m !== null && (mm.role === "user" || mm.role === "ai") && typeof mm.text === "string";
						}).map(sanitizeMessage).filter((m) => !isOperationLog(m));
						if (messages.length > 0) {
							const session = makeSession(messages.find((m) => m.role === "user")?.text.slice(0, 24) || "历史对话");
							session.messages = messages;
							window.localStorage.setItem(HISTORY_KEY, JSON.stringify([session]));
							return [session];
						}
					}
				}
			} catch {}
			return [makeSession()];
		}
		function saveSessions(sessions) {
			try {
				window.localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
			} catch {}
		}
		function sessionTitleFromMessages(messages) {
			const first = messages.find((m) => m.role === "user");
			if (!first) return "新对话";
			const text = first.text.trim().replace(/\s+/g, " ");
			return text.length > 24 ? `${text.slice(0, 24)}…` : text;
		}
		function loadCustomFolders() {
			try {
				const raw = window.localStorage.getItem(CUSTOM_FOLDERS_KEY);
				if (!raw) return [];
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
			} catch {}
			return [];
		}
		function saveCustomFolders(folders) {
			try {
				window.localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(folders));
			} catch {}
		}
		const RENAMED_FILES_KEY = "dsh.kb." + MU_NS + "renamedfiles.v1";
		/** Map of docId → user-renamed display name (cosmetic; sidecar has no rename API). */
		function loadRenamedFiles() {
			try {
				const raw = window.localStorage.getItem(RENAMED_FILES_KEY);
				if (!raw) return {};
				const parsed = JSON.parse(raw);
				if (parsed && typeof parsed === "object") {
					const out = {};
					for (const [k, v] of Object.entries(parsed)) if (typeof v === "string") out[k] = v;
					return out;
				}
			} catch {}
			return {};
		}
		function saveRenamedFiles(map) {
			try {
				window.localStorage.setItem(RENAMED_FILES_KEY, JSON.stringify(map));
			} catch {}
		}
		/** Extensions whose ORIGINAL file is plain text (raw preview == original layout). */
		const TEXT_LIKE_EXTS = new Set([
			"txt",
			"md",
			"markdown",
			"csv",
			"json",
			"log",
			"xml",
			"yaml",
			"yml",
			"ini",
			"conf",
			"py",
			"js",
			"ts",
			"html",
			"css",
			"sh"
		]);
		/** Office/PDF extensions: original file must be opened externally (download). */
		const OFFICE_EXTS = new Set([
			"doc",
			"docx",
			"docm",
			"dot",
			"xls",
			"xlsx",
			"xlsm",
			"ppt",
			"pptx",
			"pptm",
			"pdf"
		]);
		function KnowledgeBaseRoot({ wide, t, loadModels }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [rag, setRag] = (0, react.useState)({ kind: "checking" });
			const [sessions, setSessions] = (0, react.useState)(loadSessions);
			const [activeSessionId, setActiveSessionId] = (0, react.useState)(() => sessions[0]?.id ?? makeSession().id);
			const [query, setQuery] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [filter, setFilter] = (0, react.useState)("");
			const [expanded, setExpanded] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [selectedDoc, setSelectedDoc] = (0, react.useState)(null);
			const [viewingDoc, setViewingDoc] = (0, react.useState)(null);
			const [mentionOpen, setMentionOpen] = (0, react.useState)(false);
			const [mentionFilter, setMentionFilter] = (0, react.useState)("");
			const [folderMenu, setFolderMenu] = (0, react.useState)(null);
			const [fileMenu, setFileMenu] = (0, react.useState)(null);
			const [sessionMenu, setSessionMenu] = (0, react.useState)(null);
			const [createFolder, setCreateFolder] = (0, react.useState)(null);
			const [renamingFolder, setRenamingFolder] = (0, react.useState)(null);
			const [renamingSession, setRenamingSession] = (0, react.useState)(null);
			const [customFolders, setCustomFolders] = (0, react.useState)(loadCustomFolders);
			const [renamingFile, setRenamingFile] = (0, react.useState)(null);
			const [renamedFiles, setRenamedFiles] = (0, react.useState)(loadRenamedFiles);
			/** Read-only mirror of the DSH workspace registry files (null = sidecar unreachable). */
			const [wsGroups, setWsGroups] = (0, react.useState)(null);
			const [chips, setChips] = (0, react.useState)([]);
			const [model, setModel] = (0, react.useState)(MODELS[0]);
			const [modelMenuOpen, setModelMenuOpen] = (0, react.useState)(false);
			/** Host model catalog state: flattened options + load lifecycle. */
			const [modelOptions, setModelOptions] = (0, react.useState)([]);
			const [modelsStatus, setModelsStatus] = (0, react.useState)("idle");
			const [modelsError, setModelsError] = (0, react.useState)("");
			const [plusMenu, setPlusMenu] = (0, react.useState)(null);
			/** ---- 共享知识库 state（2026-09-13）---- */
			const [personalOpen, setPersonalOpen] = (0, react.useState)(() => loadSectionOpen(PERSONAL_OPEN_KEY));
			const [sharedOpen, setSharedOpen] = (0, react.useState)(() => loadSectionOpen(SHARED_OPEN_KEY));
			const [sharedFolders, setSharedFolders] = (0, react.useState)([]);
			const [sharedUsers, setSharedUsers] = (0, react.useState)([]);
			const [sharedLoading, setSharedLoading] = (0, react.useState)(false);
			const [sharedExpanded, setSharedExpanded] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [sharedMenu, setSharedMenu] = (0, react.useState)(null);
			const [shareDialog, setShareDialog] = (0, react.useState)(null);
			const [sharedModal, setSharedModal] = (0, react.useState)(null);
			const [sharedBusy, setSharedBusy] = (0, react.useState)(false);
			const [sharedIsAdmin, setSharedIsAdmin] = (0, react.useState)(false);
			const [sharedTrash, setSharedTrash] = (0, react.useState)(null);
			const [sharedFileMenu, setSharedFileMenu] = (0, react.useState)(null);
			const [renamingShared, setRenamingShared] = (0, react.useState)(null);
			const sharedFileMenuRef = (0, react.useRef)(null);
			const sharedFileInputRef = (0, react.useRef)(null);
			const sharedFolderInputRef = (0, react.useRef)(null);
			const sharedUploadFolderRef = (0, react.useRef)(null);
			/** Target folder for the pending file/folder pick (null = KB root). */
			const [uploadTarget, setUploadTarget] = (0, react.useState)(null);
			/** Window chrome state of the KB panel: normal / maximized / minimized. */
			const [winState, setWinState] = (0, react.useState)("normal");
			/** Left browser column collapsed to a narrow rail (like the DSH main sidebar). */
			const [sideCollapsed, setSideCollapsed] = (0, react.useState)(loadSidebarCollapsed);
			/** 对话框右侧「对话产物」栏的折叠状态（本地持久化，与左侧浏览器栏同套路）。 */
			const [artRailCollapsed, setArtRailCollapsed] = (0, react.useState)(loadArtRailCollapsed);
			/** 索引 modal + its live stats. */
			const [indexModal, setIndexModal] = (0, react.useState)(false);
			const [indexStats, setIndexStats] = (0, react.useState)(null);
			/** Uploaded source files for the per-file 索引 actions. */
			const [idxFiles, setIdxFiles] = (0, react.useState)(null);
			/** Which file currently has a re-index in flight (button spinner). */
			const [reingesting, setReingesting] = (0, react.useState)(null);
			/** 日志 modal + its entries. */
			const [logsModal, setLogsModal] = (0, react.useState)(false);
			const [logs, setLogs] = (0, react.useState)(null);
			const [logsLoading, setLogsLoading] = (0, react.useState)(false);
			/** AI 模型 modal: default-model selection per category + local downloads. */
			const [modelsModal, setModelsModal] = (0, react.useState)(false);
			const [modelsSnap, setModelsSnap] = (0, react.useState)(null);
			const [modelsLoading, setModelsLoading] = (0, react.useState)(false);
			const [modelsRestartNeeded, setModelsRestartNeeded] = (0, react.useState)(false);
			const [modelsRestarting, setModelsRestarting] = (0, react.useState)(false);
			const [addModelOpen, setAddModelOpen] = (0, react.useState)(false);
			const [addModelBusy, setAddModelBusy] = (0, react.useState)(false);
			const [addModelForm, setAddModelForm] = (0, react.useState)({
				category: "llm",
				name: "",
				base_url: "",
				api_key: "",
				model: "",
				dims: ""
			});
			/** Transient in-panel notice (operation feedback that never enters the Q&A history). */
			const [notice, setNotice] = (0, react.useState)(null);
			const noticeTimer = (0, react.useRef)(null);
			const fileInput = (0, react.useRef)(null);
			const folderInput = (0, react.useRef)(null);
			const composerInput = (0, react.useRef)(null);
			const folderMenuRef = (0, react.useRef)(null);
			const sharedMenuRef = (0, react.useRef)(null);
			const fileMenuRef = (0, react.useRef)(null);
			const sessionMenuRef = (0, react.useRef)(null);
			const modelMenuRef = (0, react.useRef)(null);
			const plusMenuRef = (0, react.useRef)(null);
			const messagesRef = (0, react.useRef)(null);
			const markdownLabels = (0, react.useMemo)(() => kbMarkdownLabels(), []);
			const activeSession = (0, react.useMemo)(() => sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? makeSession(), [sessions, activeSessionId]);
			const lastMsg = activeSession.messages[activeSession.messages.length - 1];
			const liveLen = lastMsg?.live !== void 0 ? lastMsg.live.thinking.length + lastMsg.live.answer.length : (lastMsg?.text ?? "").length;
			(0, react.useEffect)(() => {
				const el = messagesRef.current;
				if (el === null) return;
				if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
			}, [activeSession.messages.length, liveLen]);
			const visibleSessions = (0, react.useMemo)(() => {
				return sessions.filter((s) => !s.archived).sort((a, b) => {
					if (a.pinned && !b.pinned) return -1;
					if (!a.pinned && b.pinned) return 1;
					return b.updatedAt - a.updatedAt;
				});
			}, [sessions]);
			const addMessage = (0, react.useCallback)((message) => {
				const stamped = message.ts !== void 0 ? message : {
					...message,
					ts: Date.now()
				};
				setSessions((prev) => {
					const next = prev.map((s) => {
						if (s.id !== activeSessionId) return s;
						const msgs = [...s.messages, stamped];
						return {
							...s,
							messages: msgs,
							updatedAt: Date.now(),
							title: s.customTitle ? s.title : sessionTitleFromMessages(msgs)
						};
					});
					saveSessions(next);
					return next;
				});
			}, [activeSessionId]);
			/** Show a transient in-panel notice (auto-dismissed, never persisted into the
			*  Q&A history — the chat stays 问答-only). */
			const showNotice = (0, react.useCallback)((text) => {
				setNotice({
					text,
					key: Date.now()
				});
				if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
				noticeTimer.current = window.setTimeout(() => setNotice(null), 4e3);
			}, []);
			const statusLabel = (0, react.useCallback)((status) => {
				const key = STATUS_KEYS[status];
				return key ? t(key) : status;
			}, [t]);
			/** Display name of a file, honoring any local rename override. */
			const displayName = (0, react.useCallback)((file) => renamedFiles[file.docId] ?? file.name, [renamedFiles]);
			/** Persist one user operation to the sidecar log (best-effort, never blocks). */
			const logAction = (0, react.useCallback)((action, detail) => {
				ragLogAppend(action, detail);
			}, []);
			/** Commit an inline file rename (cosmetic local override). */
			const commitRename = (0, react.useCallback)((docId, value) => {
				const trimmed = value.trim();
				if (trimmed) {
					setRenamedFiles((prev) => {
						const next = {
							...prev,
							[docId]: trimmed
						};
						saveRenamedFiles(next);
						return next;
					});
					logAction("重命名文件", `→ ${trimmed}`);
				}
				setRenamingFile(null);
			}, [logAction]);
			const refresh = (0, react.useCallback)(async () => {
				const health = await ragHealth();
				if (health === null) {
					setRag({ kind: "offline" });
					setWsGroups(null);
					return;
				}
				const docs = await ragDocuments();
				setRag({
					kind: "connected",
					initialized: health.initialized,
					docs: docs ?? []
				});
				ragWorkspaceArtifacts().then((groups) => setWsGroups(groups));
			}, []);
			/** ---- 共享知识库（2026-09-13）---- */
			const refreshShared = (0, react.useCallback)(async () => {
				setSharedLoading(true);
				const data = await ragSharedTree();
				setSharedLoading(false);
				if (data !== null) {
					setSharedFolders(Array.isArray(data.folders) ? data.folders : []);
					setSharedUsers(Array.isArray(data.users) ? data.users : []);
					setSharedIsAdmin(data.is_admin === true);
				}
			}, []);
			(0, react.useEffect)(() => {
				if (!open) return;
				refreshShared();
			}, [open, refreshShared]);
			const toggleSharedFolder = (0, react.useCallback)((name) => {
				setSharedExpanded((prev) => {
					const next = new Set(prev);
					if (next.has(name)) next.delete(name);
					else next.add(name);
					return next;
				});
			}, []);
			/** 执行共享：逐个文档取原文件 → POST /shared/publish（sidecar 转发宿主入库） */
			const executeShare = (0, react.useCallback)(async () => {
				const dlg = shareDialog;
				if (!dlg || sharedBusy) return;
				let target = dlg.target;
				if (target === "__new__") {
					target = dlg.newName.trim();
					if (!target) {
						showNotice("请输入新共享文件夹名称。");
						return;
					}
					const created = await ragSharedCreateFolder(target, dlg.members);
					if (created === null) {
						showNotice("创建共享文件夹失败：RAG-Anything 无响应。");
						return;
					}
					if (created.error) {
						showNotice(`创建共享文件夹失败：${created.error}`);
						return;
					}
				}
				setSharedBusy(true);
				let ok = 0;
				let fail = 0;
				for (const d of dlg.docs) {
					try {
						const res = await fetch(`${ragBaseUrl()}/documents/${encodeURIComponent(d.docId)}/file`);
						if (!res.ok) throw new Error("source file");
						const blob = await res.blob();
						const fname = (d.title || d.docId).replace(/\\/g, "/").split("/").pop() || "file";
						const fd = new FormData();
						fd.append("file", blob, fname);
						fd.append("folder", target);
						fd.append("user", MU_NS_RAW);
						const pr = await fetch(`${ragBaseUrl()}/shared/publish`, { method: "POST", body: fd });
						if (pr.ok) ok++;
						else fail++;
					} catch {
						fail++;
					}
				}
				setSharedBusy(false);
				setShareDialog(null);
				showNotice(fail === 0 ? `已共享 ${ok} 个文件到「${target}」。` : `共享完成：成功 ${ok} 个，失败 ${fail} 个。`);
				logAction("共享至共享知识库", `「${target}」成功 ${ok} / 失败 ${fail}`);
				refreshShared();
			}, [shareDialog, sharedBusy, showNotice, logAction, refreshShared]);
			/** 上传文件/文件夹到共享文件夹（webkitRelativePath 保留顶层目录名） */
			const uploadSharedFiles = (0, react.useCallback)(async (fileList, folder) => {
				const files = Array.from(fileList || []);
				if (!files.length || !folder) return;
				setSharedBusy(true);
				let ok = 0;
				let fail = 0;
				for (const file of files) {
					const rel = file.webkitRelativePath || "";
					const dir = rel ? rel.split("/").slice(0, -1).join("/") : "";
					const sub = dir ? `${folder}/${dir}` : folder;
					const fd = new FormData();
					fd.append("file", file);
					fd.append("folder", sub);
					fd.append("user", MU_NS_RAW);
					try {
						const pr = await fetch(`${ragBaseUrl()}/shared/publish`, { method: "POST", body: fd });
						if (pr.ok) ok++;
						else fail++;
					} catch {
						fail++;
					}
				}
				setSharedBusy(false);
				showNotice(fail === 0 ? `已上传 ${ok} 个文件到「${folder}」。` : `上传完成：成功 ${ok} 个，失败 ${fail} 个。`);
				logAction("上传到共享知识库", `「${folder}」成功 ${ok} / 失败 ${fail}`);
				refreshShared();
			}, [showNotice, logAction, refreshShared]);
			/** 共享文件夹打包下载（zip） */
			const downloadSharedFolder = (0, react.useCallback)(async (name) => {
				setSharedMenu(null);
				try {
					const res = await ragFetch(`/shared/download?folder=${encodeURIComponent(name)}&user=${encodeURIComponent(MU_NS_RAW)}`);
					if (!res.ok) {
						showNotice("下载失败：服务端拒绝。");
						return;
					}
					const blob = await res.blob();
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `${name.replace(/\//g, "_")}.zip`;
					document.body.appendChild(a);
					a.click();
					a.remove();
					URL.revokeObjectURL(url);
					logAction("下载共享文件夹", name);
				} catch {
					showNotice("下载失败：网络异常。");
				}
			}, [showNotice, logAction]);
			/** 下载共享文件 */
			const downloadSharedFile = (0, react.useCallback)((folder, doc) => {
				setSharedFileMenu(null);
				const a = document.createElement("a");
				a.href = ragSharedFileUrl(doc.doc_id, 1);
				a.download = (doc.title || doc.doc_id).replace(/\\/g, "/").split("/").pop() || doc.doc_id;
				document.body.appendChild(a);
				a.click();
				a.remove();
				logAction("下载共享文件", a.download);
			}, [logAction]);
			/** 回收箱 */
			const openSharedTrash = (0, react.useCallback)(async () => {
				setSharedMenu(null);
				setSharedTrash({ entries: null });
				const d = await ragSharedTrashList();
				if (d === null) {
					showNotice("无法获取回收箱：RAG-Anything 无响应。");
					setSharedTrash({ entries: [] });
					return;
				}
				if (d.error) {
					showNotice(`回收箱：${d.error}`);
					setSharedTrash({ entries: [] });
					return;
				}
				setSharedTrash({ entries: Array.isArray(d.trash) ? d.trash : [] });
			}, [showNotice]);
			const restoreSharedTrash = (0, react.useCallback)(async (id) => {
				const r = await ragSharedTrashRestore(id);
				if (r === null) showNotice("还原失败：RAG-Anything 无响应。");
				else if (r.error) showNotice(`还原失败：${r.error}`);
				else showNotice("已还原。");
				await openSharedTrash();
				refreshShared();
			}, [showNotice, openSharedTrash, refreshShared]);
			const purgeSharedTrash = (0, react.useCallback)(async (id) => {
				if (!window.confirm("彻底删除后文档及其索引数据将被永久移除，不可恢复。确认？")) return;
				const r = await ragSharedTrashPurge(id);
				if (r === null) showNotice("删除失败：RAG-Anything 无响应。");
				else if (r.error) showNotice(`删除失败：${r.error}`);
				else showNotice(`已彻底删除（${r.removed_docs ?? 0} 个文档）。`);
				await openSharedTrash();
				refreshShared();
			}, [showNotice, openSharedTrash, refreshShared]);
			/** 共享改名提交（文件夹=别名，文件=清单改名） */
			const commitRenameShared = (0, react.useCallback)(async () => {
				const job = renamingShared;
				if (!job || !job.value.trim()) return;
				const value = job.value.trim();
				setRenamingShared(null);
				if (job.kind === "folder") {
					const r = await ragSharedRenameFolder(job.folder, value);
					if (r === null) showNotice("重命名失败：RAG-Anything 无响应。");
					else if (r.error) showNotice(`重命名失败：${r.error}`);
					else {
						showNotice(`已重命名为「${value}」。`);
						logAction("重命名共享文件夹", `${job.folder} → ${value}`);
					}
				} else {
					const r = await ragSharedRenameFile(job.folder, job.docId, value);
					if (r === null) showNotice("重命名失败：RAG-Anything 无响应。");
					else if (r.error) showNotice(`重命名失败：${r.error}`);
					else {
						showNotice(`已重命名为「${value}」。`);
						logAction("重命名共享文件", `${job.folder}/${value}`);
					}
				}
				refreshShared();
			}, [renamingShared, showNotice, logAction, refreshShared]);
			/** 共享知识库文档预览（走 /shared 代理） */
			const viewSharedDoc = (0, react.useCallback)(async (doc) => {
				const sBase = (doc.title || doc.doc_id || "").replace(/\\/g, "/");
				const sMatch = /\.([A-Za-z0-9]+)$/.exec(sBase);
				const ext = (sMatch?.[1] ?? "txt").toLowerCase();
				const name = sBase.split("/").pop() || doc.doc_id;
				const file = {
					name,
					ext,
					docId: doc.doc_id,
					status: doc.status,
					hasFile: doc.has_file === true
				};
				setSelectedDoc(file);
				const originalUrl = ragSharedFileUrl(doc.doc_id, OFFICE_EXTS.has(ext));
				if (doc.has_file && TEXT_LIKE_EXTS.has(ext)) {
					const raw = await ragSharedFileText(doc.doc_id);
					if (raw !== null) {
						setViewingDoc({
							file,
							content: raw,
							originalUrl,
							ofvUrl: originalUrl,
							isOriginalText: true
						});
						return;
					}
				}
				const text = await ragSharedDocContent(doc.doc_id);
				setViewingDoc(text === null ? {
					file,
					content: "无法读取共享文档内容：RAG-Anything 无响应或该文档无内容。",
					originalUrl
				} : {
					file,
					content: text,
					originalUrl,
					ofvUrl: originalUrl
				});
			}, []);
			/** Load index statistics (and the per-file list) for the 索引 modal. */
			const loadIndexStats = (0, react.useCallback)(async () => {
				setIndexStats(await ragIndexStats());
				ragIndexFiles().then((files) => setIdxFiles(files));
			}, []);
			/** Load operation logs for the 日志 modal. */
			const loadLogs = (0, react.useCallback)(async () => {
				setLogsLoading(true);
				setLogs(await ragLogList(500));
				setLogsLoading(false);
			}, []);
			(0, react.useEffect)(() => {
				if (!indexModal) return;
				loadIndexStats();
				const timer = window.setInterval(() => {
					loadIndexStats();
				}, 4e3);
				return () => window.clearInterval(timer);
			}, [indexModal, loadIndexStats]);
			/** 归一化 sidecar 快照：字段缺失时绝不能让整块面板崩掉。DSH 的 slot 边界
			 *  捕获到异常会卸载整个知识库 UI（旧版 sidecar 缺 selections.index_llm 时，
			 *  点「AI 模型」即整块闪退）。缺字段一律补成空对象/空串，保证渲染安全。 */
			const normaliseModelsSnap = (raw) => {
			    if (!raw || typeof raw !== "object") return raw;
			    const sel = raw.selections && typeof raw.selections === "object"
			        ? raw.selections : (raw.selections = {});
			    for (const k of ["llm", "index_llm", "vision", "embedding", "rerank", "asr", "parser"]) {
			        if (!sel[k] || typeof sel[k] !== "object") sel[k] = {};
			    }
			    if (!sel.index_llm.model && sel.llm.model) sel.index_llm.model = sel.llm.model;
			    for (const k of ["device", "runtime", "catalog", "downloads", "custom_models"]) {
			        if (!raw[k] || typeof raw[k] !== "object") raw[k] = {};
			    }
			    return raw;
			};
			/** Load the AI 模型 panel snapshot from the sidecar. */
			const loadModelsSnapshot = (0, react.useCallback)(async () => {
				setModelsLoading(true);
				const snap = await ragModels();
				if (snap !== null) setModelsSnap(normaliseModelsSnap(snap));
				setModelsLoading(false);
			}, []);
			(0, react.useEffect)(() => {
				if (!modelsModal) return;
				loadModelsSnapshot();
				const timer = window.setInterval(() => {
					loadModelsSnapshot();
				}, 2500);
				return () => window.clearInterval(timer);
			}, [modelsModal, loadModelsSnapshot]);
			/** Start downloading one local model; UI polls via the snapshot timer. */
			const startModelDownload = (0, react.useCallback)(async (modelId) => {
				if (await ragModelDownload(modelId) === null) showNotice("下载失败：RAG-Anything 无响应。");
			}, [showNotice]);
			/** Persist the default model for one category. */
			const applyModelSelect = (0, react.useCallback)(async (category, payload) => {
				const res = await ragModelSelect(category, payload);
				if (res === null) {
					showNotice("保存失败：RAG-Anything 无响应。");
					return;
				}
				if (!res.ok) {
					showNotice(`保存失败：${res.error ?? "未知错误"}`);
					return;
				}
				showNotice("已保存默认模型");
				if (res.restart_required) {
					setModelsRestartNeeded(true);
					showNotice("已保存，重启知识库服务后生效。");
				}
				loadModelsSnapshot();
			}, [showNotice, loadModelsSnapshot]);
			/** Ask the sidecar to restart so build-time model config takes effect. */
			const restartSidecar = (0, react.useCallback)(async () => {
				setModelsRestarting(true);
				if (!await ragModelRestart()) {
					showNotice("重启失败：RAG-Anything 无响应。");
					setModelsRestarting(false);
					return;
				}
				showNotice("正在重启知识库服务…");
				setModelsRestartNeeded(false);
				window.setTimeout(async () => {
					for (let i = 0; i < 60; i++) {
						await new Promise((r) => window.setTimeout(r, 2e3));
						if (await ragHealth() !== null) break;
					}
					setModelsRestarting(false);
					loadModelsSnapshot();
				}, 1e3);
			}, [showNotice, loadModelsSnapshot]);
			/** Install the local GGUF embedding runtime for the detected GPU vendor. */
			const installRuntime = (0, react.useCallback)(async () => {
				const res = await ragModelInstallRuntime("auto");
				if (res === null) {
					showNotice("安装失败：RAG-Anything 无响应。");
					return;
				}
				if (res.already_installed) {
					showNotice(`已安装运行时 v${res.version ?? ""}。`);
					loadModelsSnapshot();
					return;
				}
				showNotice("开始安装 llama-cpp-python 运行时…");
				loadModelsSnapshot();
			}, [showNotice, loadModelsSnapshot]);
			/** Add a custom model config (参考 DSH-设置-模型). */
			const saveCustomModel = (0, react.useCallback)(async () => {
				const f = addModelForm;
				if (!f.name.trim() || !f.base_url.trim() || !f.model.trim()) {
					showNotice("请填写名称、Base URL 与模型 ID。");
					return;
				}
				setAddModelBusy(true);
				const apiKey = f.api_key.trim();
				const dims = f.dims.trim() ? Number(f.dims.trim()) : void 0;
				const res = await ragModelCustom({
					category: f.category,
					name: f.name.trim(),
					base_url: f.base_url.trim(),
					...apiKey ? { api_key: apiKey } : {},
					model: f.model.trim(),
					...dims !== void 0 ? { dims } : {}
				});
				setAddModelBusy(false);
				if (res === null) {
					showNotice("保存失败：RAG-Anything 无响应。");
					return;
				}
				if (!res.ok) {
					showNotice(`保存失败：${res.error ?? "未知错误"}`);
					return;
				}
				showNotice("已新增模型配置");
				setAddModelOpen(false);
				setAddModelForm({
					category: "llm",
					name: "",
					base_url: "",
					api_key: "",
					model: "",
					dims: ""
				});
				loadModelsSnapshot();
			}, [
				addModelForm,
				showNotice,
				loadModelsSnapshot
			]);
			/** DSH catalog (or fallback) flattened options for LLM/vision selects. */
			const catalogModelOptions = (0, react.useMemo)(() => {
				if (modelOptions.length > 0) return modelOptions;
				return MODELS.map((name) => ({
					provider: "",
					providerName: "",
					id: name,
					name
				}));
			}, [modelOptions]);
			/** Custom configs registered for a category (llm/vision/embedding). */
			const customOptionsFor = (0, react.useCallback)((category) => {
				return modelsSnap?.custom_models?.[category] ?? [];
			}, [modelsSnap]);
			/** Active download record for one model id (or undefined). */
			const activeDownloadFor = (0, react.useCallback)((modelId) => {
				if (!modelsSnap) return void 0;
				for (const dl of Object.values(modelsSnap.downloads)) if (dl.model_id === modelId && (dl.status === "queued" || dl.status === "downloading")) return dl;
			}, [modelsSnap]);
			(0, react.useEffect)(() => {
				if (!open || indexModal) return;
				const timer = window.setInterval(() => {
					loadIndexStats();
				}, 6e3);
				return () => window.clearInterval(timer);
			}, [
				open,
				indexModal,
				loadIndexStats
			]);
			/** Parse activity right now (rebuild or any per-file ingest task). */
			const idxBusy = indexStats?.rebuild?.running === true || (indexStats?.ingest_active ?? 0) > 0;
			/** Re-index exactly one uploaded source file from the 索引 modal. */
			const reingestOne = (0, react.useCallback)(async (file) => {
				setReingesting(file.name);
				logAction("索引资料", file.display);
				const res = await ragIndexReingest(file.name);
				if (res === null) showNotice("索引失败：RAG-Anything 无响应。");
				else if (!res.started) showNotice("已有索引任务在进行中，请稍后再试。");
				setReingesting(null);
				// The rebuild worker keeps running after the HTTP call returns;
				// refreshing once immediately would read the stale 失败 status
				// and leave the row (and the left nav) showing 失败 even after
				// the re-index succeeded. Poll until the rebuild finishes.
				loadIndexStats();
				let waited = 0;
				const poll = window.setInterval(async () => {
					waited += 3e3;
					const stats = await ragIndexStats();
					if (stats) setIndexStats(stats);
					const files = await ragIndexFiles();
					if (files) setIdxFiles(files);
					if (!(stats && stats.rebuild && stats.rebuild.running) || waited >= 3e5) {
						window.clearInterval(poll);
						loadIndexStats();
						if (stats && stats.rebuild && stats.rebuild.running === false) {
							const stillFailed = (files ?? []).some((f) => f.name === file.name && f.status === "failed");
							showNotice(stillFailed ? `「${file.display}」重新索引仍未成功，可在日志中查看原因。` : `「${file.display}」已重新索引成功。`);
						}
					}
				}, 3e3);
			}, [
				showNotice,
				logAction,
				loadIndexStats
			]);
			/** Confirm + start a full index rebuild. */
			const startRebuild = (0, react.useCallback)(async () => {
				if (!window.confirm(t("kb.indexRebuildConfirm"))) return;
				const res = await ragIndexRebuildStart();
				if (res === null) {
					showNotice("重建索引失败：RAG-Anything 无响应。");
					return;
				}
				logAction("重建索引", res.started ? `共 ${res.total ?? "?"} 个文件` : "已在进行中");
				showNotice(res.started ? `已开始重建索引（共 ${res.total ?? "?"} 个文件），可在「索引」中查看进度。` : "索引重建已在进行中，可在「索引」中查看进度。");
				loadIndexStats();
			}, [
				t,
				showNotice,
				logAction,
				loadIndexStats
			]);
			(0, react.useEffect)(() => {
				if (!open) return;
				refresh();
				const onKeyDown = (e) => {
					if (e.key === "Escape") setOpen(false);
				};
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open, refresh]);
			(0, react.useEffect)(() => () => {
				if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
			}, []);
			(0, react.useEffect)(() => {
				if (!folderMenu && !fileMenu && !sessionMenu && !plusMenu && !sharedMenu && !sharedFileMenu) return;
				const closeAll = () => {
					setFolderMenu(null);
					setFileMenu(null);
					setSessionMenu(null);
					setPlusMenu(null);
					setSharedMenu(null);
					setSharedFileMenu(null);
				};
				const onDown = (e) => {
					const target = e.target;
					if (folderMenuRef.current?.contains(target) || fileMenuRef.current?.contains(target) || sessionMenuRef.current?.contains(target) || plusMenuRef.current?.contains(target) || sharedMenuRef.current?.contains(target) || sharedFileMenuRef.current?.contains(target)) return;
					closeAll();
				};
				document.addEventListener("mousedown", onDown);
				document.addEventListener("scroll", onDown, true);
				return () => {
					document.removeEventListener("mousedown", onDown);
					document.removeEventListener("scroll", onDown, true);
				};
			}, [
				folderMenu,
				fileMenu,
				sessionMenu,
				plusMenu,
				sharedMenu,
				sharedFileMenu
			]);
			(0, react.useEffect)(() => {
				if (!modelMenuOpen) return;
				const onDown = (e) => {
					if (!modelMenuRef.current?.contains(e.target)) setModelMenuOpen(false);
				};
				document.addEventListener("mousedown", onDown);
				return () => {
					document.removeEventListener("mousedown", onDown);
				};
			}, [modelMenuOpen]);
			const loadModelCatalog = (0, react.useCallback)(() => {
				if (!loadModels) {
					setModelsStatus("error");
					setModelsError("no loader");
					return;
				}
				setModelsStatus("loading");
				setModelsError("");
				loadModels().then((catalog) => {
					const options = (catalog.groups ?? []).flatMap((group) => (group.models ?? []).map((m) => ({
						provider: group.id,
						providerName: group.name,
						id: m.id,
						name: m.name
					})));
					if (options.length === 0) throw new Error("empty model catalog");
					setModelOptions(options);
					setModelsStatus("ready");
					setModel((prev) => options.some((o) => o.name === prev) ? prev : options[0].name);
				}).catch((e) => {
					setModelsError(e instanceof Error ? e.message : String(e));
					setModelsStatus("error");
				});
			}, [loadModels]);
			(0, react.useEffect)(() => {
				if (open && modelsStatus === "idle") loadModelCatalog();
			}, [
				open,
				modelsStatus,
				loadModelCatalog
			]);
			/** Catalog options grouped by provider; falls back to the hardcoded list. */
			const modelGroups = (0, react.useMemo)(() => {
				if (modelOptions.length === 0) return [{
					name: "",
					options: MODELS.map((name) => ({
						id: name,
						name
					}))
				}];
				const groups = [];
				for (const option of modelOptions) {
					let group = groups.find((g) => g.name === option.providerName);
					if (group === void 0) {
						group = {
							name: option.providerName,
							options: []
						};
						groups.push(group);
					}
					group.options.push({
						id: option.id,
						name: option.name
					});
				}
				return groups;
			}, [modelOptions]);
			const connected = rag.kind === "connected";
			const docs = rag.kind === "connected" ? rag.docs : [];
			/** 打开「共享至」对话框（docs: [{docId,title}]） */
			const openShareDialog = (0, react.useCallback)((docs) => {
				if (!connected) {
					showNotice("RAG-Anything 未连接，无法共享。");
					return;
				}
				if (!docs.length) {
					showNotice("所选文件夹内没有可共享的文档。");
					return;
				}
				setShareDialog({ docs, target: sharedFolders[0]?.name ?? "__new__", newName: "", members: [] });
				setFolderMenu(null);
				setFileMenu(null);
			}, [connected, sharedFolders, showNotice]);
			(0, react.useEffect)(() => {
				if (!open || connected) return;
				const timer = window.setInterval(() => {
					refresh();
				}, 5e3);
				return () => window.clearInterval(timer);
			}, [
				open,
				connected,
				refresh
			]);
			const hasBusyDocs = docs.some((d) => d.status === "processing" || d.status === "pending" || d.status === "preprocessed");
			(0, react.useEffect)(() => {
				if (!open || !connected || !hasBusyDocs) return;
				const timer = window.setInterval(() => {
					refresh();
				}, 3e3);
				return () => window.clearInterval(timer);
			}, [
				open,
				connected,
				hasBusyDocs,
				refresh
			]);
			/** Product docs (知识库产物/…) surface only under the pinned mirror node. */
			const productDocs = (0, react.useMemo)(() => docs.filter((d) => (d.title || "").replace(/\\/g, "/").startsWith(`${PIN_KB}/`)), [docs]);
			const kbDocs = (0, react.useMemo)(() => docs.filter((d) => !isPinnedPrefix((d.title || "").replace(/\\/g, "/"))), [docs]);
			/** File-type distribution across KB docs (索引 modal bar). Mirrors (DSH产物/) and artifacts (知识库产物/) are excluded so this count matches the sidebar status and the KB tree. */
			const extDist = (0, react.useMemo)(() => {
				const counts = /* @__PURE__ */ new Map();
				for (const d of kbDocs) {
					const base = (d.title || d.id || "").replace(/\\/g, "/");
					const ext = (/\.([A-Za-z0-9]+)$/.exec(base)?.[1] ?? "txt").toUpperCase();
					counts.set(ext, (counts.get(ext) ?? 0) + 1);
				}
				const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
				return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([ext, n], i) => ({
					ext,
					n,
					pct: n / total * 100,
					color: IDX_COLORS[i % IDX_COLORS.length]
				}));
			}, [kbDocs]);
			const realFolders = connected ? groupDocsIntoFolders(kbDocs) : rag.kind === "offline" ? DEMO_FOLDERS : [];
			/**
			* 对话产物（问答导出为 Word/Excel/PPT/Markdown）按会话分组，供对话框
			* 右侧的「对话产物」栏使用。产物不再进入个人知识库目录树，也不参与
			* 全局问答检索（sidecar 恒定排除产物命名空间）；仅可通过「@文件」
			* 显式引用到当前对话做精确检索。
			*/
			const artifactGroups = (0, react.useMemo)(() => {
				const perDir = /* @__PURE__ */ new Map();
				for (const d of productDocs) {
					const parts = (d.title || d.id).replace(/\\/g, "/").split("/");
					const dir = parts.length >= 3 ? parts.slice(1, -1).map(sanitizeSeg).join("/") : "未命名会话";
					const base = parts[parts.length - 1] || d.id;
					const m = /\.([A-Za-z0-9]+)$/.exec(base);
					const ext = (m?.[1] ?? "md").toLowerCase();
					if (ext === "md") continue;
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
				})).filter((g) => g.files.length > 0).sort((a, b) => (b.files.length - a.files.length) || a.dir.localeCompare(b.dir));
			}, [productDocs]);
			const folders = (0, react.useMemo)(() => {
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
			]);
			const q = filter.trim().toLowerCase();
			/** Nested folder tree; sub-folders (path segments) nest under their parent. */
			const folderTree = (0, react.useMemo)(() => buildFolderTree(folders), [folders]);
			/** Search-filtered tree: keep nodes matching by path or file name, ancestors preserved. */
			const filteredTree = (0, react.useMemo)(() => {
				if (!q) return folderTree;
				const keep = (node) => {
					const selfMatch = node.fullPath.toLowerCase().includes(q) || node.files.some((x) => x.name.toLowerCase().includes(q));
					const children = node.children.map(keep).filter((n) => n !== null);
					if (!selfMatch && children.length === 0) return null;
					return {
						...node,
						children
					};
				};
				return folderTree.map(keep).filter((n) => n !== null);
			}, [folderTree, q]);
			/**
			* DFS flatten for rendering: a node appears only when all of its ancestors
			* are expanded. Order per folder: the folder row first, then (when expanded)
			* its sub-folders recursively, then its own file rows — so sub-folders
			* always rank above plain files.
			*/
			const visibleRows = (0, react.useMemo)(() => {
				const out = [];
				const walk = (nodes, ancestorsOpen) => {
					for (const node of nodes) {
						out.push({
							kind: "folder",
							node,
							totalFiles: countAllFiles(node)
						});
						if (ancestorsOpen && expanded.has(node.fullPath)) {
							walk(node.children, true);
							for (const f of node.files) out.push({
								kind: "file",
								file: f,
								folderPath: node.fullPath,
								depth: node.depth
							});
						}
					}
				};
				walk(filteredTree, true);
				return out;
			}, [filteredTree, expanded]);
			const toggleFolder = (0, react.useCallback)((name) => {
				setExpanded((prev) => {
					const next = new Set(prev);
					if (next.has(name)) next.delete(name);
					else next.add(name);
					return next;
				});
			}, []);
			/** Toggle the left browser column between full width and the collapsed rail. */
			const toggleSidebar = (0, react.useCallback)(() => {
				setSideCollapsed((prev) => {
					saveSidebarCollapsed(!prev);
					return !prev;
				});
				setFolderMenu(null);
				setFileMenu(null);
				setSessionMenu(null);
				setPlusMenu(null);
			}, []);
			const mentionItems = (0, react.useMemo)(() => {
				const items = [{ label: "知识库", kind: "all" }];
				for (const folder of folders) {
					items.push({
						label: folder.name,
						kind: "folder"
					});
					for (const file of folder.files) items.push({
						label: `${folder.name}/${file.name}`,
						kind: "file"
					});
				}
				const mf = mentionFilter.trim().toLowerCase();
				return mf ? items.filter((i) => i.label.toLowerCase().includes(mf)) : items;
			}, [folders, mentionFilter]);
			/** Attach a @-reference chip (deduped) above the composer input. */
			const addChip = (0, react.useCallback)((chip) => {
				setChips((prev) => {
					/**
					* @知识库 是全局搜索，与任何具体文件/文件夹互斥：选它清空其它，
					* 选具体范围也会把 @知识库 顶掉。
					*/
					if (chip.kind === "all") return [chip];
					const base = prev.filter((c) => c.kind !== "all");
					return base.some((c) => c.label === chip.label && c.kind === chip.kind) ? base : [...base, chip];
				});
			}, []);
			const removeChip = (0, react.useCallback)((label) => {
				setChips((prev) => prev.filter((c) => c.label !== label));
			}, []);
			const toggleArtRail = (0, react.useCallback)(() => {
				setArtRailCollapsed((prev) => {
					saveArtRailCollapsed(!prev);
					return !prev;
				});
			}, []);
			const onComposerChange = (0, react.useCallback)((value) => {
				setQuery(value);
				const at = value.lastIndexOf("@");
				if (at >= 0 && !value.slice(at + 1).includes(" ")) {
					setMentionOpen(true);
					setMentionFilter(value.slice(at + 1));
				} else setMentionOpen(false);
			}, []);
			const applyMention = (0, react.useCallback)((item) => {
				const at = query.lastIndexOf("@");
				setQuery(at >= 0 ? query.slice(0, at) : query);
				setMentionOpen(false);
				addChip(item);
				composerInput.current?.focus();
			}, [query, addChip]);
			const newConversation = (0, react.useCallback)(() => {
				setSessions((prev) => {
					const next = [makeSession(), ...prev];
					saveSessions(next);
					return next;
				});
				setActiveSessionId((prev) => {
					return loadSessions()[0]?.id ?? prev;
				});
				setQuery("");
				setMentionOpen(false);
				setChips([]);
				setSelectedDoc(null);
				setViewingDoc(null);
			}, []);
			const switchSession = (0, react.useCallback)((id) => {
				setActiveSessionId(id);
				setQuery("");
				setMentionOpen(false);
				setChips([]);
				setSelectedDoc(null);
				setViewingDoc(null);
			}, []);
			const deleteSession = (0, react.useCallback)((id) => {
				const target = sessions.find((s) => s.id === id);
				const title = target?.title || "该对话";
				if (!window.confirm(`确认删除对话「${title}」？\n删除后不可恢复。`)) return;
				setSessions((prev) => {
					let next = prev.filter((s) => s.id !== id);
					if (next.length === 0) next = [makeSession()];
					saveSessions(next);
					if (activeSessionId === id) setActiveSessionId(next[0]?.id ?? makeSession().id);
					return next;
				});
			}, [activeSessionId, sessions]);
			const clearCurrentChat = (0, react.useCallback)(() => {
				setSessions((prev) => {
					const next = prev.map((s) => s.id === activeSessionId ? {
						...s,
						messages: [],
						updatedAt: Date.now(),
						title: "新对话",
						customTitle: false
					} : s);
					saveSessions(next);
					return next;
				});
				setSelectedDoc(null);
				setViewingDoc(null);
			}, [activeSessionId]);
			const createFolderAction = (0, react.useCallback)((name, parent) => {
				const fullName = parent ? `${parent}/${name.trim()}` : name.trim();
				if (!fullName) return;
				if (fullName.startsWith(`${PIN_DSH}/`) || fullName === PIN_DSH) {
					showNotice(`"${PIN_DSH}" 的子文件夹与 DSH 工作区一一对应，为只读镜像，不能手动新建。`);
					setCreateFolder(null);
					return;
				}
				setCustomFolders((prev) => {
					if (prev.includes(fullName)) return prev;
					const next = [...prev, fullName];
					saveCustomFolders(next);
					return next;
				});
				setExpanded((prev) => {
					const next = new Set(prev);
					const segments = fullName.split("/");
					for (let i = 1; i <= segments.length; i++) next.add(segments.slice(0, i).join("/"));
					return next;
				});
				setCreateFolder(null);
			}, [showNotice]);
			/** Commit an inline folder rename (custom folders only; sidecar has no folder API). */
			const commitFolderRename = (0, react.useCallback)((oldName, value) => {
				setRenamingFolder(null);
				const trimmed = value.trim();
				if (!trimmed || trimmed === oldName) return;
				if (!customFolders.includes(oldName)) {
					showNotice(`文件夹 "${oldName}" 下已有入库文档，暂不支持重命名真实路径。如需整理，可删除旧文件夹后重新上传。`);
					return;
				}
				setCustomFolders((prev) => {
					const next = prev.map((f) => f === oldName ? trimmed : f);
					saveCustomFolders(next);
					return next;
				});
			}, [customFolders, showNotice]);
			/** Commit an inline session rename; marks the title as custom so it persists. */
			const commitSessionRename = (0, react.useCallback)((id, value) => {
				setRenamingSession(null);
				const trimmed = value.trim();
				if (!trimmed) return;
				setSessions((prev) => {
					const next = prev.map((s) => s.id === id ? {
						...s,
						title: trimmed,
						customTitle: true,
						updatedAt: Date.now()
					} : s);
					saveSessions(next);
					return next;
				});
			}, []);
			const deleteFolderAction = (0, react.useCallback)(async (folderName) => {
				if (folderName === PIN_DSH || folderName === PIN_KB) {
					showNotice(`"${folderName}" 是系统置顶镜像文件夹，暂不支持删除。`);
					setFolderMenu(null);
					return;
				}
				if (folderName.startsWith(`${PIN_DSH}/`)) {
					showNotice(`"${folderName}" 是 DSH 工作区产物的只读镜像，请到对应工作区内管理这些文件。`);
					setFolderMenu(null);
					return;
				}
			const targets = folders.filter((f) => f.name === folderName || f.name.startsWith(`${folderName}/`));
			if (targets.length === 0) return;
			const docCount = targets.reduce((n, folder) => n + folder.files.filter((file) => !file.docId.startsWith("demo-") && !file.docId.startsWith("wsfile:")).length, 0);
			if (!window.confirm(`确认删除文件夹「${folderName}」？\n将连同其子文件夹一起删除其中 ${docCount} 个入库文档，此操作不可恢复。`)) {
				setFolderMenu(null);
				return;
			}
			logAction("删除文件夹", folderName);
				for (const folder of targets) for (const file of folder.files) if (!file.docId.startsWith("demo-") && !file.docId.startsWith("wsfile:")) await ragDeleteDoc(file.docId);
				if (customFolders.includes(folderName)) setCustomFolders((prev) => {
					const next = prev.filter((f) => f !== folderName && !f.startsWith(`${folderName}/`));
					saveCustomFolders(next);
					return next;
				});
				setFolderMenu(null);
				await refresh();
			}, [
				folders,
				customFolders,
				refresh,
				showNotice,
				logAction
			]);
			const mentionFolder = (0, react.useCallback)((folderName) => {
				addChip({
					label: folderName,
					kind: "folder"
				});
				setFolderMenu(null);
				composerInput.current?.focus();
			}, [addChip]);
			const mentionFile = (0, react.useCallback)((folderName, file) => {
				addChip({
					label: `${folderName}/${displayName(file)}.${file.ext}`,
					kind: "file"
				});
				setFileMenu(null);
				composerInput.current?.focus();
			}, [displayName, addChip]);
			const deleteFileAction = (0, react.useCallback)(async (file) => {
				if (file.docId.startsWith("wsfile:")) {
					showNotice(`"${file.name}" 是 DSH 工作区产物的只读镜像，请到对应工作区内删除源文件。`);
					setFileMenu(null);
					return;
				}
			if (!file.docId.startsWith("demo-")) {
				if (!window.confirm(`确认删除文件「${file.name}.${file.ext}」？\n该文档及其索引数据将从知识库中移除，此操作不可恢复。`)) {
					setFileMenu(null);
					return;
				}
				await ragDeleteDoc(file.docId);
					logAction("删除文件", `${file.name}.${file.ext}`);
				}
				setFileMenu(null);
				await refresh();
			}, [
				refresh,
				showNotice,
				logAction
			]);
			const pinSession = (0, react.useCallback)((id) => {
				setSessions((prev) => {
					const next = prev.map((s) => s.id === id ? {
						...s,
						pinned: !s.pinned,
						updatedAt: Date.now()
					} : s);
					saveSessions(next);
					return next;
				});
				setSessionMenu(null);
			}, []);
			const archiveSession = (0, react.useCallback)((id) => {
				setSessions((prev) => {
					const next = prev.map((s) => s.id === id ? {
						...s,
						archived: true,
						updatedAt: Date.now()
					} : s);
					saveSessions(next);
					return next;
				});
				if (activeSessionId === id) setActiveSessionId(sessions.filter((s) => s.id !== id && !s.archived)[0]?.id ?? makeSession().id);
				setSessionMenu(null);
			}, [activeSessionId, sessions]);
			/**
			* 把 @ 引用翻译成真正会下发给检索的作用域。
			* @文件    -> files（精确全等匹配，只用它回答）
			* @文件夹  -> folders（前缀匹配，含所有子文件夹）
			* @知识库 / 未指定 -> undefined（全库检索）
			*/
			const scopeFromChips = (0, react.useCallback)((chipList) => {
				if (!chipList || chipList.length === 0) return void 0;
				if (chipList.some((c) => c.kind === "all")) return void 0;
				const files = [];
				const folders = [];
				for (const c of chipList) {
					if (c.kind === "file") files.push(c.label);
					else if (c.kind === "folder") folders.push(c.label);
				}
				if (files.length === 0 && folders.length === 0) return void 0;
				return { files, folders };
			}, []);
			const send = async () => {
				const text = query.trim();
				if (!text || busy) return;
				const sentMentions = chips.length > 0 ? [...chips] : void 0;
				const sentScope = scopeFromChips(chips);
				setQuery("");
				setMentionOpen(false);
				setChips([]);
				addMessage({
					role: "user",
					text,
					...sentMentions ? { mentions: sentMentions } : {}
				});
				logAction("知识库问答", text.slice(0, 200));
				setBusy(true);
				addMessage({
					role: "ai",
					text: ""
				});
				const session = activeSession;
				const aiIndex = session.messages.length + 1;
				/** Update only the in-flight AI bubble (live progress; nothing persisted). */
				const patchAi = (patch) => {
					setSessions((prev) => prev.map((s) => {
						if (s.id !== activeSessionId) return s;
						const msgs = s.messages.map((m, i) => i === aiIndex ? {
							...m,
							...patch
						} : m);
						return {
							...s,
							messages: msgs
						};
					}));
				};
				/** Finalize the AI bubble (strips the transient live state) and persist. */
				const finalizeAi = (patch) => {
					setSessions((prev) => {
						const next = prev.map((s) => {
							if (s.id !== activeSessionId) return s;
							const msgs = s.messages.map((m, i) => {
								if (i !== aiIndex) return m;
								const { live: _live, ...rest } = m;
								return {
									...rest,
									...patch
								};
							});
							return {
								...s,
								messages: msgs,
								updatedAt: Date.now(),
								title: s.customTitle ? s.title : sessionTitleFromMessages(msgs)
							};
						});
						saveSessions(next);
						return next;
					});
				};
				if (connected) {
					const res = await ragAskLive(text, "hybrid", (p) => {
						patchAi({ live: p });
					}, 9e5, sentScope);
					if (res === null) finalizeAi({
						text: "检索失败：RAG-Anything 无响应",
						ts: Date.now()
					});
					else {
						finalizeAi({
							text: res.answer,
							thinking: res.thinking,
							ts: Date.now()
						});
						const sessTitle = session.customTitle ? session.title : sessionTitleFromMessages([
							...session.messages,
							{
								role: "user",
								text
							},
							{
								role: "ai",
								text: res.answer
							}
						]);
						const now = /* @__PURE__ */ new Date();
						const hhmmss = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
						const qName = sanitizeSeg(text.replace(/\s+/g, " ").slice(0, 24));
						const sessSegs = sessTitle.split("/").map(sanitizeSeg).join("/");
						// 用户要求 word/excel/ppt 输出时，生成真正的 Office 文件产物
						// （知识库产物/<会话>/<问题>-<时间>.docx/.xlsx/.pptx），
						// 而不是只有 .md；未指定格式时保持原有 .md 问答记录。
						const officeFmt = detectOfficeFormat(text);
						const qaText = `# 问题\n\n${text}\n\n# 回答\n\n${res.answer}\n`;
						const baseTitle = `${PIN_KB}/${sessSegs}/${qName}-${hhmmss}`;
						// 退化回答不写产物：否则抽取原文会被再次入库，形成自我强化。
						const degenerate = res.degraded === true || isDegenerateAnswer(res.answer);
						if (degenerate) {
							console.warn("[kb] answer looks like LightRAG extraction; artifact skipped:", String(res.answer || "").slice(0, 120));
						} else if (officeFmt) {
							ragIngestOffice(qaText, `${baseTitle}.${officeFmt}`, officeFmt).then((r) => {
								if (r !== null) refresh();
							});
						} else {
							ragIngestText(qaText, `${baseTitle}.md`).then((docId) => {
								if (docId !== null) refresh();
							});
						}
					}
				} else {
					const full = DEMO_ANSWER;
					let i = 0;
					const timer = window.setInterval(() => {
						i += 3;
						const slice = full.slice(0, i);
						setSessions((prev) => prev.map((s) => {
							if (s.id !== activeSessionId) return s;
							const msgs = s.messages.map((m, idx) => idx === aiIndex ? {
								...m,
								text: slice
							} : m);
							return {
								...s,
								messages: msgs
							};
						}));
						if (i >= 170) {
							window.clearInterval(timer);
							finalizeAi({
								text: full,
								ts: Date.now()
							});
						}
					}, 24);
				}
				setBusy(false);
			};
			const viewDoc = async (file) => {
				setSelectedDoc(file);
				if (file.docId.startsWith("demo-")) {
					setViewingDoc({
						file,
						content: "（演示文件，无原始内容）"
					});
					return;
				}
				if (file.docId.startsWith("wsfile:")) {
					const data = await ragWorkspaceFile(file.docId.slice(7));
					setViewingDoc({
						file,
						content: data === null ? "无法读取工作区文件：RAG-Anything 无响应，或该文件为二进制格式（仅支持在 DSH 工作区中打开）。" : data.truncated ? `${data.content}\n\n…（文件较大，已截断显示前 200KB）` : data.content,
						ofvUrl: ragWorkspaceDownloadUrl(file.docId.slice(7))
					});
					return;
				}
				const ext = (file.ext || "").toLowerCase();
				if (file.hasFile) {
					const originalUrl = ragDocFileUrl(file.docId, OFFICE_EXTS.has(ext));
					if (TEXT_LIKE_EXTS.has(ext)) {
						const raw = await ragDocFileText(file.docId);
						if (raw !== null) {
							setViewingDoc({
								file,
								content: raw,
								originalUrl,
								ofvUrl: originalUrl,
								isOriginalText: true
							});
							return;
						}
					}
					const data = await ragDocContent(file.docId);
					if (data === null) setViewingDoc({
						file,
						content: "无法读取原始文件内容：RAG-Anything 无响应或该文档无内容。",
						originalUrl
					});
					else setViewingDoc({
						file,
						content: data.content,
						originalUrl,
						ofvUrl: originalUrl
					});
					return;
				}
				const data = await ragDocContent(file.docId);
				if (data === null) setViewingDoc({
					file,
					content: "无法读取原始文件内容：RAG-Anything 无响应或该文档无内容。"
				});
				else setViewingDoc({
					file,
					content: data.content
				});
			};
			/** 下载当前文件:原始上传文件强制附件下载;工作区镜像走 /workspace/download。 */
			const downloadFile = (0, react.useCallback)((file) => {
				if (file.docId.startsWith("demo-")) {
					showNotice("演示文件没有原始文件，连接 RAG-Anything 后可下载真实文档。");
					return;
				}
				if (!connected) {
					showNotice("RAG-Anything 未连接，无法下载文件。");
					return;
				}
				if (file.docId.startsWith("wsfile:")) {
					triggerDownload(ragWorkspaceDownloadUrl(file.docId.slice(7)));
					logAction("下载文件", `${displayName(file)}${file.ext ? `.${file.ext}` : ""}`);
					return;
				}
				if (!file.hasFile) {
					showNotice(`该文档没有可下载的原始文件（可能为粘贴文本入库）。${displayName(file)}${file.ext ? `.${file.ext}` : ""} 可先解析预览。`);
					return;
				}
				triggerDownload(ragDocFileUrl(file.docId, true));
				logAction("下载文件", `${displayName(file)}${file.ext ? `.${file.ext}` : ""}`);
			}, [
				connected,
				displayName,
				logAction,
				showNotice
			]);

			/** 将一条 AI 回答导出为 Word/Excel/PPT 产物（sidecar 生成后入库到 知识库产物）。 */
			const exportAnswerAs = (0, react.useCallback)(async (answerText, fmt) => {
				if (!connected) {
					showNotice("RAG-Anything 未连接，无法生成 Office 文件。");
					return;
				}
				if (!answerText || !answerText.trim()) {
					showNotice("该回答为空，无法导出。");
					return;
				}
				const now = /* @__PURE__ */ new Date();
				const hhmmss = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
				const titleBase = (activeSession.title || "导出").replace(/\s+/g, " ").slice(0, 24);
				const qName = sanitizeSeg(titleBase) || "导出";
				const sessSegs = (activeSession.title || "导出").split("/").map(sanitizeSeg).join("/");
				const title = `${PIN_KB}/${sessSegs}/${qName}-${hhmmss}.${fmt}`;
				logAction("生成Office文件", `${fmt.toUpperCase()} · ${title.split("/").pop()}`);
				const r = await ragIngestOffice(answerText, title, fmt);
				if (r !== null) {
					showNotice(`已生成 ${fmt.toUpperCase()} 文件并加入右侧「对话产物」：${title.split("/").pop()}${r.existing ? "（回答已存在，本次仅更新文件）" : ""}`);
					refresh();
				} else {
					showNotice("生成失败：RAG-Anything 无响应或生成出错。");
				}
			}, [
				connected,
				activeSession,
				showNotice,
				logAction,
				refresh
			]);
			/** 打包下载整个文件夹:枚举文件夹及其子文件夹的全部文件,交给 sidecar 打成 zip。 */
			const downloadFolder = (0, react.useCallback)(async (fullPath) => {
				if (!connected) {
					showNotice("RAG-Anything 未连接，无法打包下载文件夹。");
					return;
				}
				const entries = folders.filter((f) => f.name === fullPath || f.name.startsWith(`${fullPath}/`));
				const items = [];
				for (const f of entries) for (const file of f.files) {
					if (file.docId.startsWith("demo-")) continue;
					const relDir = f.name === fullPath ? "" : f.name.slice(fullPath.length + 1);
					const fileName = `${displayName(file)}${file.ext ? `.${file.ext}` : ""}`;
					const label = relDir ? `${relDir}/${fileName}` : fileName;
					if (file.docId.startsWith("wsfile:")) items.push({
						kind: "ws",
						ws_path: file.docId.slice(7),
						label
					});
					else if (file.hasFile) items.push({
						kind: "doc",
						doc_id: file.docId,
						label
					});
				}
				if (items.length === 0) {
					showNotice(`文件夹 "${fullPath}" 中没有可下载的原始文件。`);
					return;
				}
				const segs = fullPath.split("/").filter(Boolean);
				if (await ragFolderDownload(fullPath, `${(segs[segs.length - 1] ?? "知识库文件夹").replace(/[\\/:*?"<>|]+/g, "_") || "知识库文件夹"}.zip`, items)) logAction("下载文件夹", `${fullPath} · ${items.length} 个文件`);
				else showNotice("打包下载失败：RAG-Anything 无响应或文件夹中没有可下载的文件。");
			}, [
				connected,
				folders,
				displayName,
				logAction,
				showNotice
			]);
			const onPickFiles = async (files, target = null) => {
				if (!files || files.length === 0) return;
				if (target && (target === PIN_DSH || target.startsWith(`${PIN_DSH}/`))) {
					showNotice(`"${PIN_DSH}" 是 DSH 工作区产物的只读镜像，不支持向其上传文件。`);
					return;
				}
				if (!connected) {
					showNotice("RAG-Anything 未连接，无法入库。连接后 .txt/.md 文件将直接入库，PDF/Office 将交由解析器后台处理。");
					return;
				}
				const picked = Array.from(files);
				let ok = 0, fail = 0, removed = 0, skipped = 0, renamed = 0, versioned = 0;
				const submitted = [];
				const batch = { policy: null };
				for (const file of picked) try {
					const out = await ragUploadInteractive(file, target ?? void 0, batch);
					if (out.outcome === "submitted" || out.outcome === "renamed" || out.outcome === "versioned") {
						ok += 1;
						if (out.outcome === "renamed") renamed += 1;
						if (out.outcome === "versioned") versioned += 1;
						if (target) submitted.push({
							name: file.name,
							parent: target
						});
						else submitted.push({ name: file.name });
					} else if (out.outcome === "deleted_old") removed += 1;
					else if (out.outcome === "failed") fail += 1;
					else skipped += 1;
				} catch {
					fail += 1;
				}
				if (submitted.length > 0) {
					logAction("上传文件", `${target ?? "根目录"} · 已提交 ${submitted.length} 个文件，正在后台解析。`);
					showNotice(`已提交 ${submitted.length} 个文件，正在后台解析。解析完成后，文件状态会自动变为「已入库」。`);
				}
				if (renamed > 0) showNotice(`${renamed} 个重复文件已重命名为 _copy_N 副本入库。`);
				if (versioned > 0) showNotice(`${versioned} 个文件的旧版本已归档至 versions/，新文件作为最新版入库。`);
				if (removed > 0) {
					logAction("删除旧文件", `${target ?? "根目录"} · 上传时选择删除 ${removed} 个同名旧文件。`);
					showNotice(`已删除 ${removed} 个同名旧文件（未上传新文件）。`);
				}
				if (skipped > 0) showNotice(`已跳过 ${skipped} 个重复/取消的文件。`);
				if (fail > 0) showNotice(`${fail} 个文件上传失败（RAG-Anything 无响应或文件无效）。`);
				await refresh();
			};
			/**
			* Upload a picked directory (webkitdirectory input), preserving its internal
			* structure under `uploadTarget`. Every file's webkitRelativePath (relative
			* to the picked root) is appended to the target folder path; the resulting
			* directories are registered locally so the tree shows them right away.
			*/
			const onPickFolder = async (files) => {
				if (!files || files.length === 0) return;
				const target0 = uploadTarget;
				if (target0 && (target0 === PIN_DSH || target0.startsWith(`${PIN_DSH}/`))) {
					showNotice(`"${PIN_DSH}" 是 DSH 工作区产物的只读镜像，不支持向其上传文件夹。`);
					return;
				}
				if (!connected) {
					showNotice("RAG-Anything 未连接，无法入库。");
					return;
				}
				const target = target0;
				const entries = Array.from(files).map((f) => {
					const rel = f.webkitRelativePath || f.name;
					return {
						file: f,
						full: target ? `${target}/${rel}` : rel
					};
				});
				setCustomFolders((prev) => {
					const dirs = new Set(prev);
					for (const { full } of entries) {
						const segs = full.split("/");
						for (let i = 1; i < segs.length; i++) dirs.add(segs.slice(0, i).join("/"));
					}
					const next = [...dirs];
					saveCustomFolders(next);
					return next;
				});
				let ok = 0, fail = 0, removed = 0, skipped = 0, renamed = 0, versioned = 0;
				const submitted = [];
				const batch = { policy: null };
				for (const { file, full } of entries) {
					const parentDir = full.includes("/") ? full.slice(0, full.lastIndexOf("/")) : void 0;
					try {
						const out = await ragUploadInteractive(file, parentDir, batch);
						if (out.outcome === "submitted" || out.outcome === "renamed" || out.outcome === "versioned") {
							ok += 1;
							if (out.outcome === "renamed") renamed += 1;
							if (out.outcome === "versioned") versioned += 1;
							submitted.push(full);
						} else if (out.outcome === "deleted_old") removed += 1;
						else if (out.outcome === "failed") fail += 1;
						else skipped += 1;
					} catch {
						fail += 1;
					}
				}
				if (submitted.length > 0) {
					logAction("上传文件夹", `已提交文件夹上传（共 ${submitted.length} 个文件），正在后台解析…`);
					showNotice(`已提交文件夹 ${submitted.length} 个文件，正在后台解析。文件夹结构已按路径显示，解析完成后状态自动变为「已入库」。`);
				}
				if (renamed > 0) showNotice(`${renamed} 个重复文件已重命名为 _copy_N 副本入库。`);
				if (versioned > 0) showNotice(`${versioned} 个文件的旧版本已归档至 versions/。`);
				if (removed > 0) showNotice(`已删除 ${removed} 个同名旧文件（未上传新文件）。`);
				if (skipped > 0) showNotice(`已跳过 ${skipped} 个重复/取消的文件。`);
				if (fail > 0) showNotice(`${fail} 个文件上传失败（RAG-Anything 无响应或文件无效）。`);
				await refresh();
			};
			const statusText = rag.kind === "checking" ? "RAG-Anything · 检测中…" : connected ? `RAG-Anything · 已连接 · ${kbDocs.length} 篇文档` : "RAG-Anything · 未连接（演示数据）";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: clsx(KnowledgeBaseRoot_module_css_default.triggerRow, !wide && KnowledgeBaseRoot_module_css_default.railRow),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: clsx(KnowledgeBaseRoot_module_css_default.trigger, !wide && KnowledgeBaseRoot_module_css_default.rail),
						"aria-haspopup": "dialog",
						"aria-expanded": open,
						onClick: () => {
							setOpen(true);
							setWinState("max");
							logAction("打开知识库面板");
						},
						children: [wide ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutline16, { size: 16 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutline16, { size: 18 }), wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: KnowledgeBaseRoot_module_css_default.triggerLabel,
							children: t("kb.trigger")
						})]
					})
				}),
				open && winState === "min" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: KnowledgeBaseRoot_module_css_default.miniLayer,
					role: "presentation",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: KnowledgeBaseRoot_module_css_default.miniPill,
						onClick: () => setWinState("normal"),
						"aria-label": t("kb.title"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutline16, { size: 15 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("kb.title") })]
					})
				}),
				open && winState !== "min" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: KnowledgeBaseRoot_module_css_default.overlay,
					role: "presentation",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: KnowledgeBaseRoot_module_css_default.mask,
						"aria-hidden": "true",
						onClick: () => setOpen(false)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: clsx(KnowledgeBaseRoot_module_css_default.panel, winState === "max" && KnowledgeBaseRoot_module_css_default.panelMax),
						role: "dialog",
						"aria-modal": "true",
						"aria-label": t("kb.title"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
								className: clsx(KnowledgeBaseRoot_module_css_default.sidebar, sideCollapsed && KnowledgeBaseRoot_module_css_default.sidebarCollapsed),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.sidebarHead,
										children: [!sideCollapsed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: KnowledgeBaseRoot_module_css_default.sidebarTitle,
											children: t("kb.title")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.winControls,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.winBtn,
												onClick: toggleSidebar,
												"aria-label": sideCollapsed ? t("kb.expandSidebar") : t("kb.collapseSidebar"),
												title: sideCollapsed ? t("kb.expandSidebar") : t("kb.collapseSidebar"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, { size: sideCollapsed ? 18 : 16 })
											})
										})]
									}),
									!sideCollapsed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: clsx(KnowledgeBaseRoot_module_css_default.statusChip, connected ? KnowledgeBaseRoot_module_css_default.on : KnowledgeBaseRoot_module_css_default.off),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: KnowledgeBaseRoot_module_css_default.dot }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.statusText,
													children: statusText
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.syncBtn,
													title: t("kb.sync"),
													"aria-label": t("kb.sync"),
													onClick: () => {
														refresh();
													},
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, { size: 14 })
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: KnowledgeBaseRoot_module_css_default.search,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												value: filter,
												onChange: (e) => setFilter(e.target.value),
												placeholder: t("kb.search"),
												"aria-label": t("kb.search")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.sectionHead,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.sectionChev,
													title: personalOpen ? t("kb.collapseSection") : t("kb.expandSection"),
													"aria-expanded": personalOpen,
													onClick: () => {
														setPersonalOpen((v) => {
															saveSectionOpen(PERSONAL_OPEN_KEY, !v);
															return !v;
														});
													},
													children: personalOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 12 })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.sectionTitle,
													children: t("kb.personal")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.iconBtn,
													title: t("kb.moreActions"),
													"aria-label": t("kb.moreActions"),
													"aria-haspopup": "menu",
													"aria-expanded": !!plusMenu,
													onClick: (e) => {
														e.stopPropagation();
														if (plusMenu) setPlusMenu(null);
														else setPlusMenu({ anchor: e.currentTarget });
													},
													onMouseDown: (e) => e.stopPropagation(),
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 })
												}),
												plusMenu && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													ref: plusMenuRef,
													className: KnowledgeBaseRoot_module_css_default.folderMenu,
													style: menuFixedStyle(plusMenu.anchor, 108),
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.menuItem,
															onClick: () => {
																setCreateFolder({
																	parent: null,
																	value: ""
																});
																setPlusMenu(null);
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 13 }), t("kb.newFolder")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.menuItem,
															onClick: () => {
																setUploadTarget(null);
																setPlusMenu(null);
																fileInput.current?.click();
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UploadIcon, { size: 13 }), t("kb.uploadFile")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.menuItem,
															onClick: () => {
																setUploadTarget(null);
																setPlusMenu(null);
																folderInput.current?.click();
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }), t("kb.uploadFolder")]
														})
													]
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: clsx(KnowledgeBaseRoot_module_css_default.folderList, !personalOpen && KnowledgeBaseRoot_module_css_default.listHidden),
											children: visibleRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.empty,
												children: t("kb.noMatch")
											}) : visibleRows.map((entry) => {
												if (entry.kind === "file") {
													const file = entry.file;
													return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: KnowledgeBaseRoot_module_css_default.fileRowWrap,
														style: entry.depth >= 0 ? { marginLeft: 24 + entry.depth * 16 } : void 0,
														children: [
															renamingFile?.docId === file.docId ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																autoFocus: true,
																className: KnowledgeBaseRoot_module_css_default.renameInput,
																value: renamingFile.value,
																onChange: (e) => setRenamingFile({
																	docId: file.docId,
																	value: e.target.value
																}),
																onFocus: (e) => e.currentTarget.select(),
																onKeyDown: (e) => {
																	if (e.key === "Enter") {
																		e.preventDefault();
																		commitRename(file.docId, renamingFile.value);
																	}
																	if (e.key === "Escape") {
																		e.preventDefault();
																		setRenamingFile(null);
																	}
																},
																onBlur: () => commitRename(file.docId, renamingFile.value)
															}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.fileRow,
																onClick: () => viewDoc(file),
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: KnowledgeBaseRoot_module_css_default.fileName,
																	children: [displayName(file), file.ext ? `.${file.ext}` : ""]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: clsx(KnowledgeBaseRoot_module_css_default.fileStatus, KnowledgeBaseRoot_module_css_default[`st-${file.status}`]),
																	children: statusLabel(file.status)
																})]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.moreBtn,
																"aria-label": t("kb.moreActions"),
																title: t("kb.moreActions"),
																onClick: (e) => {
																	e.stopPropagation();
																	if (fileMenu?.file.docId === file.docId) setFileMenu(null);
																	else setFileMenu({
																		file,
																		folderName: entry.folderPath,
																		anchor: e.currentTarget
																	});
																},
																onMouseDown: (e) => e.stopPropagation(),
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, { size: 14 })
															}),
															fileMenu?.file.docId === file.docId && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																ref: fileMenuRef,
																className: KnowledgeBaseRoot_module_css_default.folderMenu,
																style: menuFixedStyle(fileMenu.anchor, 175),
																children: [
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => mentionFile(fileMenu.folderName, fileMenu.file),
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.atIcon,
																			children: "@"
																		}), t("kb.mentionFile")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			setRenamingFile({
																				docId: fileMenu.file.docId,
																				value: displayName(fileMenu.file)
																			});
																			setFileMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 13 }), t("kb.renameFile")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			downloadFile(fileMenu.file);
																			setFileMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 13 }), t("kb.downloadFile")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			viewDoc(fileMenu.file);
																			setFileMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 13 }), t("kb.previewInClient")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			openShareDialog([{
																				docId: fileMenu.file.docId,
																				title: displayName(fileMenu.file) + (fileMenu.file.ext ? `.${fileMenu.file.ext}` : "")
																			}]);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }), t("kb.shareTo")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: clsx(KnowledgeBaseRoot_module_css_default.menuItem, KnowledgeBaseRoot_module_css_default.menuItemDanger),
																		onClick: () => {
																			deleteFileAction(fileMenu.file);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 13 }), t("kb.deleteFile")]
																	})
																]
															})
														]
													}, `file-${file.docId}`);
												}
												const folder = entry.node;
												const isOpen = expanded.has(folder.fullPath);
												const isCustom = customFolders.includes(folder.fullPath);
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.folderGroup,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: clsx(KnowledgeBaseRoot_module_css_default.folderRow, isOpen && KnowledgeBaseRoot_module_css_default.folderRowOpen),
														style: folder.depth > 0 ? { marginLeft: folder.depth * 16 } : void 0,
														children: [
															renamingFolder?.folder === folder.fullPath ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																autoFocus: true,
																className: KnowledgeBaseRoot_module_css_default.renameInput,
																value: renamingFolder.value,
																onChange: (e) => setRenamingFolder({
																	folder: folder.fullPath,
																	value: e.target.value
																}),
																onKeyDown: (e) => {
																	if (e.key === "Enter") {
																		e.preventDefault();
																		commitFolderRename(folder.fullPath, renamingFolder.value);
																	}
																	if (e.key === "Escape") {
																		e.preventDefault();
																		setRenamingFolder(null);
																	}
																},
																onBlur: () => commitFolderRename(folder.fullPath, renamingFolder.value),
																onClick: (e) => e.stopPropagation()
															}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.folder,
																"aria-expanded": isOpen,
																onClick: () => toggleFolder(folder.fullPath),
																children: [
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.folderChevron,
																		children: isOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 12 })
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: clsx(KnowledgeBaseRoot_module_css_default.folderIcon, PIN_ORDER.includes(folder.fullPath) && (folder.fullPath === PIN_DSH ? KnowledgeBaseRoot_module_css_default.pinIconDsh : KnowledgeBaseRoot_module_css_default.pinIconKb)),
																		children: folder.fullPath === PIN_DSH ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutline16, { size: 14 }) : folder.fullPath === PIN_KB ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 14 })
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.folderName,
																		children: folder.name
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.folderCount,
																		children: entry.totalFiles
																	})
																]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.moreBtn,
																"aria-label": t("kb.moreActions"),
																title: t("kb.moreActions"),
																onClick: (e) => {
																	e.stopPropagation();
																	if (folderMenu?.folder === folder.fullPath) setFolderMenu(null);
																	else setFolderMenu({
																		folder: folder.fullPath,
																		anchor: e.currentTarget
																	});
																},
																onMouseDown: (e) => e.stopPropagation(),
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, { size: 14 })
															}),
															folderMenu?.folder === folder.fullPath && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																ref: folderMenuRef,
																className: KnowledgeBaseRoot_module_css_default.folderMenu,
																style: menuFixedStyle(folderMenu.anchor, 240),
																children: [
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => mentionFolder(folderMenu.folder),
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.atIcon,
																			children: "@"
																		}), t("kb.mentionFolder")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			setCreateFolder({
																				parent: folderMenu.folder,
																				value: ""
																			});
																			setFolderMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 13 }), t("kb.newFolder")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			setUploadTarget(folderMenu.folder);
																			setFolderMenu(null);
																			fileInput.current?.click();
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UploadIcon, { size: 13 }), t("kb.uploadFile")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			setUploadTarget(folderMenu.folder);
																			setFolderMenu(null);
																			folderInput.current?.click();
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }), t("kb.uploadFolder")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			downloadFolder(folderMenu.folder);
																			setFolderMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 13 }), t("kb.downloadFolder")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			const docs = [];
																			const walkShare = (node) => {
																				for (const f of node.files) docs.push({ docId: f.docId, title: renamedFiles[f.docId] ?? `${f.name}${f.ext ? `.${f.ext}` : ""}` });
																				for (const c of node.children) walkShare(c);
																			};
																			const findNode = (nodes) => {
																				for (const n of nodes) {
																					if (n.fullPath === folderMenu.folder) return n;
																					const r = findNode(n.children);
																					if (r) return r;
																				}
																				return null;
																			};
																			const rootNode = findNode(folderTree);
																			if (rootNode) walkShare(rootNode);
																			openShareDialog(docs);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }), t("kb.shareTo")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			setRenamingFolder({
																				folder: folderMenu.folder,
																				value: folderMenu.folder
																			});
																			setFolderMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 13 }), t("kb.renameFolder")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: clsx(KnowledgeBaseRoot_module_css_default.menuItem, KnowledgeBaseRoot_module_css_default.menuItemDanger),
																		onClick: () => {
																			deleteFolderAction(folderMenu.folder);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 13 }), t("kb.deleteFolder")]
																	})
																]
															})
														]
													}), isOpen && folder.files.length === 0 && folder.children.length === 0 && isCustom && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: KnowledgeBaseRoot_module_css_default.emptyFiles,
														style: folder.depth > 0 ? { marginLeft: folder.depth * 16 } : void 0,
														children: t("kb.emptyFolder")
													})]
												}, folder.fullPath);
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.sectionHead,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.sectionChev,
													title: sharedOpen ? t("kb.collapseSection") : t("kb.expandSection"),
													"aria-expanded": sharedOpen,
													onClick: () => {
														setSharedOpen((v) => {
															saveSectionOpen(SHARED_OPEN_KEY, !v);
															return !v;
														});
													},
													children: sharedOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 12 })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.sectionTitle,
													children: t("kb.shared")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.sectionCount,
													children: sharedFolders.length
												}),
												connected && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.iconBtn,
													title: t("kb.sharedCreate"),
													"aria-label": t("kb.sharedCreate"),
													onClick: (e) => {
														e.stopPropagation();
														setSharedModal({ mode: "create", name: "", members: [] });
													},
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 })
												}),
												sharedIsAdmin && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.iconBtn,
													title: t("kb.sharedTrash"),
													"aria-label": t("kb.sharedTrash"),
													onClick: (e) => {
														e.stopPropagation();
														openSharedTrash();
													},
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 })
												})
											]
										}),
										sharedOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.folderList,
											children: !connected ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.empty,
												children: t("kb.sharedOffline")
											}) : sharedFolders.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.empty,
												children: sharedLoading ? t("kb.sharedLoading") : t("kb.sharedEmpty")
											}) : sharedFolders.map((sf) => {
												const isOpenS = sharedExpanded.has(sf.name);
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.folderGroup,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: clsx(KnowledgeBaseRoot_module_css_default.folderRow, isOpenS && KnowledgeBaseRoot_module_css_default.folderRowOpen),
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																	type: "button",
																	className: KnowledgeBaseRoot_module_css_default.folder,
																	"aria-expanded": isOpenS,
																	onClick: () => toggleSharedFolder(sf.name),
																	children: [
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.folderChevron,
																			children: isOpenS ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 12 })
																		}),
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.folderIcon,
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 14 })
																		}),
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.folderName,
																			children: sf.name
																		}),
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.folderCount,
																			children: sf.docs.length
																		})
																	]
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																	type: "button",
																	className: KnowledgeBaseRoot_module_css_default.moreBtn,
																	"aria-label": t("kb.moreActions"),
																	title: t("kb.moreActions"),
																	onClick: (e) => {
																		e.stopPropagation();
																		if (sharedMenu?.folder === sf.name) setSharedMenu(null);
																		else setSharedMenu({ folder: sf.name, anchor: e.currentTarget, canManage: sf.can_manage });
																	},
																	onMouseDown: (e) => e.stopPropagation(),
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, { size: 14 })
																}),
																sharedMenu?.folder === sf.name && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	ref: sharedMenuRef,
																	className: KnowledgeBaseRoot_module_css_default.folderMenu,
																	style: menuFixedStyle(sharedMenu.anchor, 200),
																	children: [
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							mentionFolder(sf.name);
																							setSharedMenu(null);
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																							className: KnowledgeBaseRoot_module_css_default.atIcon,
																							children: "@"
																						}), t("kb.mentionFolder")]
																					}),
																					sf.can_manage && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							setSharedModal({ mode: "members", folder: sf.name, members: (sf.members || []).slice() });
																							setSharedMenu(null);
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 13 }), t("kb.sharedMembersEdit")]
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							setSharedModal({ mode: "create", name: `${sf.name}/`, members: (sf.members || []).slice() });
																							setSharedMenu(null);
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }), t("kb.sharedNewFolder")]
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							sharedUploadFolderRef.current = sf.name;
																							setSharedMenu(null);
																							sharedFileInputRef.current?.click();
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 13 }), t("kb.sharedUploadFiles")]
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							sharedUploadFolderRef.current = sf.name;
																							setSharedMenu(null);
																							sharedFolderInputRef.current?.click();
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }), t("kb.sharedUploadFolder")]
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							downloadSharedFolder(sf.name);
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }), t("kb.sharedDownload")]
																					}),
																					sf.can_manage && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							setRenamingShared({ kind: "folder", folder: sf.name, value: sf.display || sf.name });
																							setSharedMenu(null);
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 13 }), t("kb.sharedRename")]
																					}),
																					sf.can_manage && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: clsx(KnowledgeBaseRoot_module_css_default.menuItem, KnowledgeBaseRoot_module_css_default.menuItemDanger),
																						onClick: async () => {
																							setSharedMenu(null);
																							if (!window.confirm(t("kb.sharedDeleteConfirm"))) return;
																							const r = await ragSharedDeleteFolder(sf.name);
																							if (r === null) showNotice("删除失败：RAG-Anything 无响应。");
																							else if (r.error) showNotice(`删除失败：${r.error}`);
																							else {
																								showNotice(`已移入回收箱：「${sf.name}」（仅管理员可还原）。`);
																								logAction("删除共享文件夹", sf.name);
																								refreshShared();
																							}
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 13 }), t("kb.sharedDelete")]
																					}),
																					!sf.can_manage && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																						className: KnowledgeBaseRoot_module_css_default.menuNote,
																						children: `${t("kb.sharedCreatedBy")}${sf.created_by || "-"}`
																					})
																	]
																})
															]
														}),
																												isOpenS && sf.docs.map((doc) => {
																const sBase = (doc.title || doc.doc_id).replace(/\\/g, "/");
																const sName = sBase.split("/").pop() || doc.doc_id;
																const sMatch = /^(.*)\.([A-Za-z0-9]+)$/.exec(sName);
																const sBaseName = sMatch ? sMatch[1] : sName;
																const sExt = sMatch ? sMatch[2] : "";
																return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	className: KnowledgeBaseRoot_module_css_default.fileRowWrap,
																	style: { marginLeft: 18 },
																	children: [
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			className: KnowledgeBaseRoot_module_css_default.fileRow,
																			onClick: () => {
																				viewSharedDoc(doc);
																			},
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																				className: KnowledgeBaseRoot_module_css_default.fileName,
																				children: sName
																			})
																		}),
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																			type: "button",
																			className: KnowledgeBaseRoot_module_css_default.moreBtn,
																			"aria-label": t("kb.moreActions"),
																			title: t("kb.moreActions"),
																			onClick: (e) => {
																				e.stopPropagation();
																				if (sharedFileMenu?.doc.docId === doc.doc_id) setSharedFileMenu(null);
																				else setSharedFileMenu({ folder: sf.name, doc: { docId: doc.doc_id, doc_id: doc.doc_id, title: doc.title, name: sBaseName, ext: sExt, status: doc.status, has_file: doc.has_file === true }, anchor: e.currentTarget });
																			},
																			onMouseDown: (e) => e.stopPropagation(),
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, { size: 14 })
																		}),
																		sharedFileMenu?.doc.docId === doc.doc_id && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																			ref: sharedFileMenuRef,
																			className: KnowledgeBaseRoot_module_css_default.folderMenu,
																			style: menuFixedStyle(sharedFileMenu.anchor, 175),
																			children: [
																				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																					type: "button",
																					className: KnowledgeBaseRoot_module_css_default.menuItem,
																					onClick: () => {
																						mentionFile(sharedFileMenu.folder, sharedFileMenu.doc);
																						setSharedFileMenu(null);
																					},
																					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																						className: KnowledgeBaseRoot_module_css_default.atIcon,
																						children: "@"
																					}), t("kb.mentionFile")]
																				}),
																				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																					type: "button",
																					className: KnowledgeBaseRoot_module_css_default.menuItem,
																					onClick: () => {
																						setRenamingShared({ kind: "file", folder: sharedFileMenu.folder, docId: sharedFileMenu.doc.docId, value: sName });
																						setSharedFileMenu(null);
																					},
																					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 13 }), t("kb.sharedRename")]
																				}),
																				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																					type: "button",
																					className: KnowledgeBaseRoot_module_css_default.menuItem,
																					onClick: () => {
																						downloadSharedFile(sharedFileMenu.folder, sharedFileMenu.doc);
																					},
																					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }), t("kb.sharedDownload")]
																				}),
																				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																					type: "button",
																					className: KnowledgeBaseRoot_module_css_default.menuItem,
																					onClick: () => {
																						viewSharedDoc(sharedFileMenu.doc);
																						setSharedFileMenu(null);
																					},
																					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }), t("kb.sharedOpenPreview")]
																				}),
																				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																					type: "button",
																					className: clsx(KnowledgeBaseRoot_module_css_default.menuItem, KnowledgeBaseRoot_module_css_default.menuItemDanger),
																					onClick: async () => {
																						setSharedFileMenu(null);
																						if (!window.confirm(`确认删除共享文件「${sName}」？\n文件将移入回收箱，仅管理员可还原。`)) return;
																						const r = await ragSharedDeleteFile(sharedFileMenu.folder, sharedFileMenu.doc.docId);
																						if (r === null) showNotice("删除失败：RAG-Anything 无响应。");
																						else if (r.error) showNotice(`删除失败：${r.error}`);
																						else {
																							showNotice("已移入回收箱（仅管理员可还原）。");
																							logAction("删除共享文件", sName);
																							refreshShared();
																						}
																					},
																					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 13 }), t("kb.sharedDeleteFile")]
																				})
																			]
																		})
																	]
																}, doc.doc_id);
														})
													]
												}, sf.name);
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.sectionHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.sectionTitle,
												children: t("kb.history")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.newChatBtn,
												onClick: newConversation,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 13 }), t("kb.newChat")]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.historyList,
											children: visibleSessions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.empty,
												children: t("kb.noHistory")
											}) : visibleSessions.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.historyItemWrap,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: clsx(KnowledgeBaseRoot_module_css_default.historyItem, session.id === activeSessionId && KnowledgeBaseRoot_module_css_default.historyItemActive),
														onClick: () => switchSession(session.id),
														children: renamingSession?.id === session.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
															autoFocus: true,
															className: KnowledgeBaseRoot_module_css_default.renameInput,
															value: renamingSession.value,
															onChange: (e) => setRenamingSession({
																id: session.id,
																value: e.target.value
															}),
															onKeyDown: (e) => {
																if (e.key === "Enter") {
																	e.preventDefault();
																	commitSessionRename(session.id, renamingSession.value);
																}
																if (e.key === "Escape") {
																	e.preventDefault();
																	setRenamingSession(null);
																}
															},
															onBlur: () => commitSessionRename(session.id, renamingSession.value),
															onClick: (e) => e.stopPropagation()
														}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: KnowledgeBaseRoot_module_css_default.historyTitle,
															children: [session.pinned ? "📌 " : "", session.title]
														})
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.moreBtn,
														"aria-label": t("kb.moreActions"),
														title: t("kb.moreActions"),
														onClick: (e) => {
															e.stopPropagation();
															if (sessionMenu?.session.id === session.id) setSessionMenu(null);
															else setSessionMenu({
																session,
																anchor: e.currentTarget
															});
														},
														onMouseDown: (e) => e.stopPropagation(),
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, { size: 14 })
													}),
													sessionMenu?.session.id === session.id && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														ref: sessionMenuRef,
														className: KnowledgeBaseRoot_module_css_default.folderMenu,
														style: menuFixedStyle(sessionMenu.anchor, 152),
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.menuItem,
																onClick: () => pinSession(sessionMenu.session.id),
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, { size: 13 }), sessionMenu.session.pinned ? t("kb.unpinSession") : t("kb.pinSession")]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.menuItem,
																onClick: () => {
																	setRenamingSession({
																		id: sessionMenu.session.id,
																		value: sessionMenu.session.title
																	});
																	setSessionMenu(null);
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 13 }), t("kb.renameSession")]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.menuItem,
																onClick: () => archiveSession(sessionMenu.session.id),
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutline20, { size: 13 }), t("kb.archiveSession")]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: clsx(KnowledgeBaseRoot_module_css_default.menuItem, KnowledgeBaseRoot_module_css_default.menuItemDanger),
																onClick: () => {
																	deleteSession(sessionMenu.session.id);
																	setSessionMenu(null);
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 13 }), t("kb.deleteSession")]
															})
														]
													})
												]
											}, session.id))
										}),
										selectedDoc && !viewingDoc && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.docDetail,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.docDetailHead,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: KnowledgeBaseRoot_module_css_default.docDetailName,
														title: `${selectedDoc.name}.${selectedDoc.ext}`,
														children: [
															selectedDoc.name,
															".",
															selectedDoc.ext
														]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.docDetailClose,
														onClick: () => setSelectedDoc(null),
														"aria-label": t("close"),
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 12 })
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.docDetailMeta,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: clsx(KnowledgeBaseRoot_module_css_default.fileStatus, KnowledgeBaseRoot_module_css_default[`st-${selectedDoc.status}`]),
														children: statusLabel(selectedDoc.status)
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: KnowledgeBaseRoot_module_css_default.docDetailId,
														children: selectedDoc.docId
													})]
												}),
												selectedDoc.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.docDetailError,
													children: selectedDoc.error
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.uploadRow,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.footRow,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.footBtn,
															onClick: () => {
																setOpen(false);
																setWinState("normal");
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HomeIcon, { size: 13 }), t("kb.backHome")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: clsx(KnowledgeBaseRoot_module_css_default.footBtn, idxBusy && KnowledgeBaseRoot_module_css_default.footBtnBusy),
															onClick: () => {
																setIndexModal(true);
																loadIndexStats();
															},
															title: idxBusy ? t("kb.indexBusyHint") : void 0,
															children: [idxBusy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: KnowledgeBaseRoot_module_css_default.footSpin,
																"aria-hidden": "true"
															}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 13 }), idxBusy ? indexStats?.rebuild?.running ? `${t("kb.indexRebuilding")} ${indexStats.rebuild.done}/${indexStats.rebuild.total}` : t("kb.indexParsing") : t("kb.index")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.footBtn,
															onClick: () => {
																setModelsModal(true);
																loadModelsSnapshot();
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, { size: 13 }), t("kb.aiModels")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.footBtn,
															onClick: () => {
																setLogsModal(true);
																loadLogs();
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconListPenOutline16, { size: 13 }), t("kb.logs")]
														})
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													ref: fileInput,
													type: "file",
													multiple: true,
													accept: ".txt,.md,.markdown,.pdf,.docx,.pptx,.xlsx",
													style: { display: "none" },
													onChange: (e) => {
														onPickFiles(e.target.files, uploadTarget);
														e.target.value = "";
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													ref: folderInput,
													type: "file",
													multiple: true,
													style: { display: "none" },
													onChange: (e) => {
														onPickFolder(e.target.files);
														e.target.value = "";
													},
													webkitdirectory: "",
													directory: ""
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													ref: sharedFileInputRef,
													type: "file",
													multiple: true,
													style: { display: "none" },
													onChange: (e) => {
														if (e.target.files?.length && sharedUploadFolderRef.current) uploadSharedFiles(e.target.files, sharedUploadFolderRef.current);
														e.target.value = "";
													}
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													ref: sharedFolderInputRef,
													type: "file",
													multiple: true,
													style: { display: "none" },
													onChange: (e) => {
														if (e.target.files?.length && sharedUploadFolderRef.current) uploadSharedFiles(e.target.files, sharedUploadFolderRef.current);
														e.target.value = "";
													},
													webkitdirectory: "",
													directory: ""
												})
											]
										})
									] }),
									sideCollapsed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.railFoot,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.railFootBtn,
												title: t("kb.backHome"),
												"aria-label": t("kb.backHome"),
												onClick: () => {
													setOpen(false);
													setWinState("normal");
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HomeIcon, { size: 15 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.railFootBtn,
												title: idxBusy ? t("kb.indexBusyHint") : t("kb.index"),
												"aria-label": t("kb.index"),
												onClick: () => {
													setIndexModal(true);
													loadIndexStats();
												},
												children: idxBusy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.footSpin,
													"aria-hidden": "true"
												}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 15 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.railFootBtn,
												title: t("kb.aiModels"),
												"aria-label": t("kb.aiModels"),
												onClick: () => {
													setModelsModal(true);
													loadModelsSnapshot();
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, { size: 15 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.railFootBtn,
												title: t("kb.logs"),
												"aria-label": t("kb.logs"),
												onClick: () => {
													setLogsModal(true);
													loadLogs();
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconListPenOutline16, { size: 15 })
											})
										]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: clsx(KnowledgeBaseRoot_module_css_default.chat, KnowledgeBaseRoot_module_css_default.chatRow),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.chatLeft,
										children: [
									notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: KnowledgeBaseRoot_module_css_default.notice,
										role: "status",
										children: notice.text
									}, notice.key),
									activeSession.messages.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.hero,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.heroLogo,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutline16, { size: 24 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
												className: KnowledgeBaseRoot_module_css_default.heroTitle,
												children: t("kb.heroTitle")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: KnowledgeBaseRoot_module_css_default.heroSub,
												children: t("kb.heroSub")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.suggestions,
												children: SUGGESTIONS.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.suggestion,
													onClick: () => setQuery(s),
													children: s
												}, s))
											})
										]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.messagesWrap,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.messagesHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.messagesHeadTitle,
												children: activeSession.title
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.clearBtn,
												onClick: clearCurrentChat,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 13 }), t("kb.clear")]
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.messages,
											ref: messagesRef,
											children: activeSession.messages.map((m, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: clsx(KnowledgeBaseRoot_module_css_default.message, m.role === "user" ? KnowledgeBaseRoot_module_css_default.user : KnowledgeBaseRoot_module_css_default.ai),
												children: [m.role === "user" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.bubble,
													children: m.text
												}), m.mentions && m.mentions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.msgMentions,
													children: m.mentions.map((chip, ci) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: clsx(KnowledgeBaseRoot_module_css_default.chip, KnowledgeBaseRoot_module_css_default.chipReadOnly, chip.kind === "folder" ? KnowledgeBaseRoot_module_css_default.chipFolder : KnowledgeBaseRoot_module_css_default.chipFile),
														title: chip.label,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: clsx(KnowledgeBaseRoot_module_css_default.chipIcon, chip.kind === "folder" ? KnowledgeBaseRoot_module_css_default.chipFolder : KnowledgeBaseRoot_module_css_default.chipFile),
															children: chip.kind === "folder" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 12 })
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: KnowledgeBaseRoot_module_css_default.chipLabel,
															children: ["@", chip.label.split("/").pop()]
														})]
													}, ci))
												})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.markdownBubble,
													children: [(m.live !== void 0 || (m.thinking ?? "").trim() !== "") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KbThinking, {
														live: m.live,
														thinking: m.thinking,
														t
													}), m.live !== void 0 ? m.live.answer !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: KnowledgeBaseRoot_module_css_default.thinkLiveAnswer,
														children: m.live.answer
													}) : m.text !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
														text: m.text,
														labels: markdownLabels
													})]
												}), m.live === void 0 && m.text !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													style: { display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" },
													children: [["docx", "Word"], ["xlsx", "Excel"], ["pptx", "PPT"]].map(([fmt, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => exportAnswerAs(m.text, fmt),
														title: `将本条回答导出为 ${label} 文件`,
														style: { border: "1px solid var(--dsw-alias-divider)", background: "transparent", color: "var(--dsw-alias-label-secondary)", borderRadius: "7px", cursor: "pointer", height: "26px", padding: "0 10px", fontSize: "11.5px", fontFamily: "inherit" },
														children: label
													}, fmt))
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: clsx(KnowledgeBaseRoot_module_css_default.msgTime, m.role === "user" && KnowledgeBaseRoot_module_css_default.msgTimeUser),
													children: formatTs(m.ts ?? activeSession.updatedAt)
												})]
											}, i))
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.composer,
										children: [
											mentionOpen && mentionItems.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.mention,
												role: "listbox",
												"aria-label": t("kb.mention"),
												children: mentionItems.slice(0, 12).map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													role: "option",
													"aria-selected": "false",
													className: KnowledgeBaseRoot_module_css_default.mentionItem,
													onClick: () => applyMention(item),
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: clsx(KnowledgeBaseRoot_module_css_default.mentionIcon, item.kind === "folder" ? KnowledgeBaseRoot_module_css_default.mentionFolder : KnowledgeBaseRoot_module_css_default.mentionFile),
														children: item.kind === "folder" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 13 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 13 })
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: KnowledgeBaseRoot_module_css_default.mentionLabel,
														children: item.label
													})]
												}, `${item.kind}-${item.label}`))
											}),
											chips.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.chipsRow,
												children: chips.map((chip) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: clsx(KnowledgeBaseRoot_module_css_default.chip, chip.kind === "folder" ? KnowledgeBaseRoot_module_css_default.chipFolder : KnowledgeBaseRoot_module_css_default.chipFile),
													title: chip.label,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: clsx(KnowledgeBaseRoot_module_css_default.chipIcon, chip.kind === "folder" ? KnowledgeBaseRoot_module_css_default.chipFolder : KnowledgeBaseRoot_module_css_default.chipFile),
															children: chip.kind === "folder" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { size: 13 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 13 })
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: KnowledgeBaseRoot_module_css_default.chipLabel,
															children: ["@", chip.label.split("/").pop()]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.chipClose,
															"aria-label": `${t("kb.mention")} ${chip.label}`,
															onClick: () => removeChip(chip.label),
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 11 })
														})
													]
												}, chip.label))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
												ref: composerInput,
												className: KnowledgeBaseRoot_module_css_default.input,
												value: query,
												onChange: (e) => onComposerChange(e.target.value),
												placeholder: t("kb.placeholder"),
												rows: 1,
												onKeyDown: (e) => {
													if (e.key === "Enter" && !e.shiftKey) {
														e.preventDefault();
														send();
													}
													if (e.key === "Escape" && mentionOpen) {
														e.preventDefault();
														e.stopPropagation();
														setMentionOpen(false);
													}
													if (e.key === "Escape" && modelMenuOpen) {
														e.preventDefault();
														e.stopPropagation();
														setModelMenuOpen(false);
													}
												}
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.composerBar,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														ref: modelMenuRef,
														className: KnowledgeBaseRoot_module_css_default.modelWrap,
														children: [modelMenuOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: KnowledgeBaseRoot_module_css_default.modelMenu,
															role: "listbox",
															"aria-label": t("kb.model"),
															children: [
																modelsStatus === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	className: KnowledgeBaseRoot_module_css_default.modelStatus,
																	children: t("kb.modelLoading")
																}),
																modelsStatus === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	className: KnowledgeBaseRoot_module_css_default.modelStatusError,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [t("kb.modelLoadError"), modelsError ? `：${modelsError}` : ""] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.modelRetry,
																		onClick: loadModelCatalog,
																		children: t("kb.modelRetry")
																	})]
																}),
																modelGroups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	className: KnowledgeBaseRoot_module_css_default.modelGroup,
																	children: [group.name && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																		className: KnowledgeBaseRoot_module_css_default.modelGroupTitle,
																		children: group.name
																	}), group.options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																		type: "button",
																		role: "option",
																		"aria-selected": option.name === model,
																		className: clsx(KnowledgeBaseRoot_module_css_default.modelMenuItem, option.name === model && KnowledgeBaseRoot_module_css_default.modelMenuItemActive),
																		onClick: () => {
																			setModel(option.name);
																			setModelMenuOpen(false);
																		},
																		children: option.name
																	}, option.id))]
																}, group.name || "default"))
															]
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.modelBtn,
															"aria-haspopup": "listbox",
															"aria-expanded": modelMenuOpen,
															onClick: () => setModelMenuOpen((v) => !v),
															children: [model, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 })]
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.atBtn,
														title: t("kb.mention"),
														"aria-label": t("kb.mention"),
														onClick: () => {
															setMentionFilter("");
															setMentionOpen((v) => !v);
														},
														children: "@"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: KnowledgeBaseRoot_module_css_default.barSpacer }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.send,
														disabled: busy || query.trim() === "",
														onClick: () => {
															send();
														},
														"aria-label": t("kb.send"),
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
															width: "16",
															height: "16",
															viewBox: "0 0 24 24",
															fill: "none",
															stroke: "currentColor",
															strokeWidth: "2.2",
															strokeLinecap: "round",
															strokeLinejoin: "round",
															"aria-hidden": "true",
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 19V5" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 12l7-7 7 7" })]
														})
													})
												]
											})
										]
									})
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KbArtifactRail, {
									groups: artifactGroups,
									total: artifactGroups.reduce((n, g) => n + g.files.length, 0),
									collapsed: artRailCollapsed,
									onToggle: toggleArtRail,
									onMention: mentionFile,
									onOpen: viewDoc,
									t
								})
								]
							}),
							createFolder && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.modalOverlay,
								role: "presentation",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: KnowledgeBaseRoot_module_css_default.modal,
									role: "dialog",
									"aria-modal": "true",
									"aria-label": t("kb.newFolder"),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.modalTitle,
												children: t("kb.newFolder")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalClose,
												onClick: () => setCreateFolder(null),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalBody,
											children: [createFolder.parent && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalHint,
												children: t("kb.createIn").replace("{parent}", createFolder.parent)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												autoFocus: true,
												className: KnowledgeBaseRoot_module_css_default.modalInput,
												value: createFolder.value,
												onChange: (e) => setCreateFolder({
													...createFolder,
													value: e.target.value
												}),
												placeholder: t("kb.folderName"),
												onKeyDown: (e) => {
													if (e.key === "Enter") createFolderAction(createFolder.value, createFolder.parent);
												}
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalFoot,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalBtnSecondary,
												onClick: () => setCreateFolder(null),
												children: t("kb.cancel")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalBtnPrimary,
												onClick: () => createFolderAction(createFolder.value, createFolder.parent),
												children: t("kb.confirm")
											})]
										})
									]
								})
							}),
							viewingDoc && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.docViewerOverlay,
								role: "presentation",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: KnowledgeBaseRoot_module_css_default.docViewer,
									role: "dialog",
									"aria-modal": "true",
									"aria-label": t("kb.viewOriginal"),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.docViewerHead,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: KnowledgeBaseRoot_module_css_default.docViewerTitle,
												children: [
													viewingDoc.file.name,
													".",
													viewingDoc.file.ext,
													viewingDoc.isOriginalText && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", {
														className: KnowledgeBaseRoot_module_css_default.docViewerTag,
														children: t("kb.originalTag")
													})
												]
											}),
											viewingDoc.originalUrl && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
												className: KnowledgeBaseRoot_module_css_default.docViewerOpen,
												href: viewingDoc.originalUrl,
												target: "_blank",
												rel: "noreferrer",
												title: t("kb.openOriginal"),
												onClick: () => logAction("打开原始文件", `${viewingDoc.file.name}.${viewingDoc.file.ext}`),
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 }), t("kb.openOriginal")]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.docViewerClose,
												onClick: () => setViewingDoc(null),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.docViewerBody,
										children: [viewingDoc.originalUrl && !viewingDoc.isOriginalText && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.docViewerHint,
											children: t("kb.originalHint")
										}), /* @__PURE__ */ viewingDoc.ofvUrl ? (0, react_jsx_runtime.jsx)(OfvModalBody, { url: viewingDoc.ofvUrl, name: `${viewingDoc.file.name}.${viewingDoc.file.ext}`, fallback: viewingDoc.content }) : (0, react_jsx_runtime.jsx)("pre", { className: KnowledgeBaseRoot_module_css_default.docViewerContent, children: viewingDoc.content })]
									})]
								})
							}),
							indexModal && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.modalOverlay,
								role: "presentation",
								onClick: () => setIndexModal(false),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: clsx(KnowledgeBaseRoot_module_css_default.modal, KnowledgeBaseRoot_module_css_default.modalWide),
									role: "dialog",
									"aria-modal": "true",
									"aria-label": t("kb.index"),
									onClick: (e) => e.stopPropagation(),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.modalHead,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: KnowledgeBaseRoot_module_css_default.modalTitle,
											children: t("kb.index")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalSub,
											children: t("kb.indexSub")
										})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: KnowledgeBaseRoot_module_css_default.modalClose,
											onClick: () => setIndexModal(false),
											"aria-label": t("close"),
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
										})]
									}), !connected ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: KnowledgeBaseRoot_module_css_default.logsEmpty,
										children: "RAG-Anything 未连接，无法读取索引统计。"
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.modalScroll,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.idxCount,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: extDist.reduce((a, s) => a + s.n, 0) }),
													" ",
													t("kb.indexDocUnit")
												]
											}),
											extDist.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.idxBar,
												children: extDist.map((seg) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
													width: `${seg.pct}%`,
													background: seg.color
												} }, seg.ext))
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.idxLegend,
												children: extDist.map((seg) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: seg.color } }),
													seg.ext,
													" ",
													seg.n
												] }, seg.ext))
											})] }),
											indexStats?.rebuild && !indexStats.rebuild.running && indexStats.rebuild.total > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.idxLastRebuild,
												children: t("kb.indexRebuildDone").replace("{d}", String(indexStats.rebuild.done - indexStats.rebuild.failed.length)).replace("{t}", String(indexStats.rebuild.total)).replace("{f}", String(indexStats.rebuild.failed.length))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.idxFilesHead,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: KnowledgeBaseRoot_module_css_default.idxFilesTitle,
														children: t("kb.indexFiles")
													}),
													idxFiles && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: KnowledgeBaseRoot_module_css_default.idxFilesSub,
														children: [
															idxFiles.length,
															" ",
															t("kb.indexDocUnit")
														]
													}),
													idxBusy && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: KnowledgeBaseRoot_module_css_default.idxPill,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: KnowledgeBaseRoot_module_css_default.dotAmber }), indexStats?.rebuild?.running ? `${t("kb.indexRebuilding")} ${indexStats.rebuild.done}/${indexStats.rebuild.total}` : t("kb.indexParsing")]
													})
												]
											}),
											idxFiles !== null && idxFiles.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.logsEmpty,
												children: t("kb.indexFilesEmpty")
											}),
											(idxFiles ?? []).map((f) => {
												const fs = f.status ?? "";
												const fBusy = fs === "processing" || fs === "pending" || fs === "preprocessed";
												const fDone = fs === "processed";
												const fFailed = fs === "failed";
												const selfReindexing = reingesting === f.name;
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.idxFileRow,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: KnowledgeBaseRoot_module_css_default.idxFileExt,
															children: (f.display.split(".").pop() || "?").toUpperCase()
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: KnowledgeBaseRoot_module_css_default.idxFileInfo,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: KnowledgeBaseRoot_module_css_default.idxFileName,
																title: f.display,
																children: f.display
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: KnowledgeBaseRoot_module_css_default.idxFileMeta,
																children: [
																	formatSize(f.size),
																	" · ",
																	formatRel((/* @__PURE__ */ new Date(f.mtime * 1e3)).toISOString())
																]
															})]
														}),
														fDone ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: KnowledgeBaseRoot_module_css_default.idxDone,
															children: statusLabel("processed")
														}) : fBusy || selfReindexing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: KnowledgeBaseRoot_module_css_default.idxParsing,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: KnowledgeBaseRoot_module_css_default.footSpin,
																"aria-hidden": "true"
															}), selfReindexing ? t("kb.reindexing") : t("kb.indexParsing")]
														}) : fFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: KnowledgeBaseRoot_module_css_default.idxFailed,
															children: statusLabel("failed")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.reidxBtn,
															disabled: idxBusy,
															onClick: () => {
																reingestOne(f);
															},
															children: t("kb.reindex")
														})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.reidxBtn,
															disabled: idxBusy,
															onClick: () => {
																reingestOne(f);
															},
															children: t("kb.reindex")
														})
													]
												}, f.name);
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.setRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [t("kb.indexToggleSleep"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.setRowDesc,
													children: t("kb.indexToggleSleepDesc")
												})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IdxToggle, { prefKey: "sleep" })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.setRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [t("kb.indexToggleOcr"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.setRowDesc,
													children: t("kb.indexToggleOcrDesc")
												})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IdxToggle, { prefKey: "ocr" })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.setRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [t("kb.indexToggleSemantic"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.setRowDesc,
													children: t("kb.indexToggleSemanticDesc")
												})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IdxToggle, { prefKey: "semantic" })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.setRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [t("kb.indexToggleAudio"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.setRowDesc,
													children: t("kb.indexToggleAudioDesc")
												})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IdxToggle, { prefKey: "audio" })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.setRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [t("kb.indexToggleVideo"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.setRowDesc,
													children: t("kb.indexToggleVideoDesc")
												})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IdxToggle, { prefKey: "video" })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.setRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [t("kb.indexRebuild"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.setRowDesc,
													children: t("kb.indexRebuildDesc")
												})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.btnDanger,
													disabled: indexStats?.rebuild?.running === true,
													onClick: () => {
														startRebuild();
													},
													children: indexStats?.rebuild?.running ? `${t("kb.indexRebuilding")} ${indexStats.rebuild.done}/${indexStats.rebuild.total}` : t("kb.indexRebuildBtn")
												})]
											})
										]
									})]
								})
							}),
							modelsModal && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.modalOverlay,
								role: "presentation",
								onClick: () => setModelsModal(false),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: clsx(KnowledgeBaseRoot_module_css_default.modal, KnowledgeBaseRoot_module_css_default.modalWide, KnowledgeBaseRoot_module_css_default.modelsModal),
									role: "dialog",
									"aria-modal": "true",
									"aria-label": t("kb.aiModels"),
									onClick: (e) => e.stopPropagation(),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: KnowledgeBaseRoot_module_css_default.modalTitle,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.modelsHeadIcon,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, { size: 16 })
												}), t("kb.aiModels")]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalSub,
												children: t("kb.aiModelsSub")
											})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalClose,
												onClick: () => setModelsModal(false),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modelsDeviceRow,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.modelsDeviceLabel,
													children: t("kb.aiModelsDevice")
												}),
												modelsSnap === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.modelsDeviceChip,
													children: modelsLoading ? "…" : t("kb.aiModelsDeviceUnknown")
												}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: KnowledgeBaseRoot_module_css_default.modelsDeviceChip,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: KnowledgeBaseRoot_module_css_default.modelsDeviceDot,
															style: {
																background: modelsSnap.device.vendor === "nvidia" ? "#76b900" : modelsSnap.device.vendor === "amd" ? "#ed1c24" : modelsSnap.device.vendor === "cpu" ? "#3b82f6" : "#9ca3af",
																boxShadow: modelsSnap.device.vendor === "nvidia" ? "0 0 0 3px rgba(118,185,0,.2)" : modelsSnap.device.vendor === "amd" ? "0 0 0 3px rgba(237,28,36,.2)" : "0 0 0 3px rgba(59,130,246,.2)"
															}
														}),
														modelsSnap.device.vendor === "nvidia" && t("kb.aiModelsDeviceCuda"),
														modelsSnap.device.vendor === "amd" && t("kb.aiModelsDeviceRocm"),
														modelsSnap.device.vendor === "cpu" && t("kb.aiModelsDeviceCpu"),
														modelsSnap.device.vendor === "unknown" && t("kb.aiModelsDeviceUnknown"),
														modelsSnap.device.torch && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", {
															className: KnowledgeBaseRoot_module_css_default.modelsDeviceTorch,
															children: modelsSnap.device.torch
														})
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: KnowledgeBaseRoot_module_css_default.modelsCounts,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: countModelStatus(modelsSnap).ready }),
														" ",
														t("kb.modelReadyCount").replace("{n}", "")
													] }), countModelStatus(modelsSnap).missing > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
														"· ",
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: countModelStatus(modelsSnap).missing }),
														" ",
														t("kb.modelToDownload").replace("{n}", "")
													] })]
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalScroll,
											children: modelsSnap === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.logsEmpty,
												children: modelsLoading ? "…" : "RAG-Anything 未连接，无法读取模型信息。"
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.modelsGrid,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: KnowledgeBaseRoot_module_css_default.modelsCat,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatHead,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatTitle,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsCatIcon,
																		style: { ["--cat"]: "#0d9d97" },
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, { size: 14 })
																	}), t("kb.modelLlm")]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatHint,
																	children: t("kb.modelFromDsh")
																})]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatDesc,
																children: t("kb.modelLlmDesc")
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelCategorySelect, {
																t,
																options: catalogModelOptions,
																customs: customOptionsFor("llm"),
																current: modelsSnap.selections.llm.model,
																onSelect: (model, base_url, api_key) => {
																	applyModelSelect("llm", {
																		model,
																		...base_url ? { base_url } : {},
																		...api_key ? { api_key } : {}
																	});
																}
															})
														]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: KnowledgeBaseRoot_module_css_default.modelsCat,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatHead,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatTitle,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsCatIcon,
																		style: { ["--cat"]: "#e8590c" },
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 14 })
																	}), t("kb.modelIndexLlm")]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatHint,
																	children: t("kb.modelFromDsh")
																})]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatDesc,
																children: t("kb.modelIndexLlmDesc")
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelCategorySelect, {
																t,
																options: catalogModelOptions,
																customs: customOptionsFor("llm"),
																current: modelsSnap.selections.index_llm.model || catalogModelOptions[0]?.id || "",
																onSelect: (model, base_url, api_key) => {
																	applyModelSelect("index_llm", {
																		model,
																		...base_url ? { base_url } : {},
																		...api_key ? { api_key } : {}
																	});
																}
															})
														]
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: KnowledgeBaseRoot_module_css_default.modelsCat,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatHead,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatTitle,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsCatIcon,
																		style: { ["--cat"]: "#1266e3" },
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 })
																	}), t("kb.modelVision")]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatHint,
																	children: t("kb.modelFromDsh")
																})]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatDesc,
																children: t("kb.modelVisionDesc")
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelCategorySelect, {
																t,
																options: catalogModelOptions,
																customs: customOptionsFor("vision"),
																current: modelsSnap.selections.vision.model,
																onSelect: (model, base_url, api_key) => {
																	applyModelSelect("vision", {
																		model,
																		...base_url ? { base_url } : {},
																		...api_key ? { api_key } : {}
																	});
																}
															})
														]
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.modelsCat,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: KnowledgeBaseRoot_module_css_default.modelsCatHead,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatTitle,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatIcon,
																	style: { ["--cat"]: "#7c3aed" },
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutline16, { size: 14 })
																}), t("kb.modelEmbedding")]
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatHint,
																children: modelsSnap.selections.embedding.backend === "gguf" ? t("kb.modelCurrent") : ""
															})]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: KnowledgeBaseRoot_module_css_default.modelsCatDesc,
															children: t("kb.modelEmbeddingDesc")
														}),
														(modelsSnap.catalog.embedding ?? []).map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LocalModelRow, {
															t,
															entry,
															download: activeDownloadFor(entry.id),
															isCurrent: modelsSnap.selections.embedding.backend === "gguf" && (modelsSnap.selections.embedding.model ?? "").includes(entry.name),
															onDownload: () => {
																startModelDownload(entry.id);
															},
															onSetDefault: () => {
																applyModelSelect("embedding", { model: entry.id });
															}
														}, entry.id)),
														customOptionsFor("embedding").map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: KnowledgeBaseRoot_module_css_default.modelsEntry,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsEntryInfo,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	className: KnowledgeBaseRoot_module_css_default.modelsEntryName,
																	children: [
																		c.name,
																		" · ",
																		c.model
																	]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	className: KnowledgeBaseRoot_module_css_default.modelsEntryMeta,
																	children: [c.base_url, c.dims ? ` · ${c.dims}d` : ""]
																})]
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.modelsSetBtn,
																disabled: modelsSnap.selections.embedding.model === c.model && modelsSnap.selections.embedding.backend === "openai",
																onClick: () => {
																	applyModelSelect("embedding", {
																		model: c.model,
																		base_url: c.base_url,
																		...c.dims !== void 0 ? { dims: c.dims } : {}
																	});
																},
																children: modelsSnap.selections.embedding.model === c.model && modelsSnap.selections.embedding.backend === "openai" ? t("kb.modelCurrent") : t("kb.modelSetDefault")
															})]
														}, `emb-${c.model}`)),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: clsx(KnowledgeBaseRoot_module_css_default.modelsRuntimeRow, modelsSnap.runtime.llama_cpp && KnowledgeBaseRoot_module_css_default.modelsRuntimeOk),
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsEntryInfo,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	className: KnowledgeBaseRoot_module_css_default.modelsEntryName,
																	children: [
																		modelsSnap.runtime.llama_cpp ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			style: {
																				display: "grid",
																				placeItems: "center",
																				color: "#10b981"
																			},
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 13 })
																		}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			style: {
																				display: "grid",
																				placeItems: "center",
																				color: "#d97706"
																			},
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 13 })
																		}),
																		"llama-cpp-python",
																		modelsSnap.runtime.llama_cpp && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.modelsReadyChip,
																			children: t("kb.modelReady")
																		})
																	]
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																	className: KnowledgeBaseRoot_module_css_default.modelsEntryMeta,
																	children: modelsSnap.runtime.llama_cpp ? `v${modelsSnap.runtime.llama_cpp_version ?? ""} · ${modelsSnap.device.backend}` : t("kb.modelRuntimeMissing")
																})]
															}), !modelsSnap.runtime.llama_cpp && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.modelsDlBtn,
																onClick: () => {
																	installRuntime();
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 12 }), t("kb.modelInstallRuntime")]
															})]
														})
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.modelsGrid,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: KnowledgeBaseRoot_module_css_default.modelsCat,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatHead,
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatTitle,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsCatIcon,
																		style: { ["--cat"]: "#d97706" },
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 })
																	}), t("kb.modelRerank")]
																})
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatDesc,
																children: t("kb.modelRerankDesc")
															}),
															(modelsSnap.catalog.rerank ?? []).map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LocalModelRow, {
																t,
																entry,
																download: activeDownloadFor(entry.id),
																isCurrent: modelsSnap.selections.rerank.enabled === true && (modelsSnap.selections.rerank.model_path ?? "").includes(entry.id),
																onDownload: () => {
																	startModelDownload(entry.id);
																},
																onSetDefault: () => {
																	applyModelSelect("rerank", { model: entry.id });
																}
															}, entry.id))
														]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: KnowledgeBaseRoot_module_css_default.modelsCat,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatHead,
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatTitle,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsCatIcon,
																		style: { ["--cat"]: "#e11d48" },
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutline16, { size: 14 })
																	}), t("kb.modelAsr")]
																})
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatDesc,
																children: t("kb.modelAsrDesc")
															}),
															(modelsSnap.catalog.asr ?? []).map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LocalModelRow, {
																t,
																entry,
																download: activeDownloadFor(entry.id),
																isCurrent: (modelsSnap.selections.asr.model ?? "").includes(entry.id) || (modelsSnap.selections.asr.model ?? "").includes(entry.name),
																onDownload: () => {
																	startModelDownload(entry.id);
																},
																onSetDefault: () => {
																	applyModelSelect("asr", { model: entry.id });
																}
															}, entry.id))
														]
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.modelsCat,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: KnowledgeBaseRoot_module_css_default.modelsCatHead,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: KnowledgeBaseRoot_module_css_default.modelsCatTitle,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: KnowledgeBaseRoot_module_css_default.modelsCatIcon,
																	style: { ["--cat"]: "#059669" },
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, { size: 14 })
																}), t("kb.modelParser")]
															})
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: KnowledgeBaseRoot_module_css_default.modelsCatDesc,
															children: t("kb.modelParserDesc")
														}),
														(modelsSnap.catalog.parser ?? []).map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LocalModelRow, {
															t,
															entry,
															download: activeDownloadFor(entry.id),
															isCurrent: modelsSnap.selections.parser.parser === "mineru",
															onDownload: () => {
																startModelDownload(entry.id);
															},
															onSetDefault: () => {
																applyModelSelect("parser", {});
															}
														}, entry.id))
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.modelsAddBlock,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.modelsAddToggle,
														onClick: () => setAddModelOpen((o) => !o),
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 13 }), t("kb.modelAddConfig")]
													}), addModelOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: KnowledgeBaseRoot_module_css_default.modelsForm,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: KnowledgeBaseRoot_module_css_default.modelsFormGrid,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
																	className: KnowledgeBaseRoot_module_css_default.modelsField,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsFieldLabel,
																		children: t("kb.modelCategory")
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
																		className: KnowledgeBaseRoot_module_css_default.modelsInput,
																		value: addModelForm.category,
																		onChange: (e) => setAddModelForm((f) => ({
																			...f,
																			category: e.target.value
																		})),
																		children: [
																			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																				value: "llm",
																				children: t("kb.modelLlm")
																			}),
																			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																				value: "vision",
																				children: t("kb.modelVision")
																			}),
																			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																				value: "embedding",
																				children: t("kb.modelEmbedding")
																			})
																		]
																	})]
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
																	className: KnowledgeBaseRoot_module_css_default.modelsField,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsFieldLabel,
																		children: t("kb.modelName")
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																		className: KnowledgeBaseRoot_module_css_default.modelsInput,
																		type: "text",
																		value: addModelForm.name,
																		placeholder: "示例：我的本地网关",
																		onChange: (e) => setAddModelForm((f) => ({
																			...f,
																			name: e.target.value
																		}))
																	})]
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
																	className: KnowledgeBaseRoot_module_css_default.modelsField,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsFieldLabel,
																		children: t("kb.modelBaseUrl")
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																		className: KnowledgeBaseRoot_module_css_default.modelsInput,
																		type: "text",
																		value: addModelForm.base_url,
																		placeholder: "https://api.example.com/v1",
																		onChange: (e) => setAddModelForm((f) => ({
																			...f,
																			base_url: e.target.value
																		}))
																	})]
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
																	className: KnowledgeBaseRoot_module_css_default.modelsField,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsFieldLabel,
																		children: t("kb.modelApiKey")
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																		className: KnowledgeBaseRoot_module_css_default.modelsInput,
																		type: "password",
																		value: addModelForm.api_key,
																		placeholder: "sk-…",
																		onChange: (e) => setAddModelForm((f) => ({
																			...f,
																			api_key: e.target.value
																		}))
																	})]
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
																	className: KnowledgeBaseRoot_module_css_default.modelsField,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsFieldLabel,
																		children: t("kb.modelId")
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																		className: KnowledgeBaseRoot_module_css_default.modelsInput,
																		type: "text",
																		value: addModelForm.model,
																		placeholder: "model-id",
																		onChange: (e) => setAddModelForm((f) => ({
																			...f,
																			model: e.target.value
																		}))
																	})]
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
																	className: KnowledgeBaseRoot_module_css_default.modelsField,
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: KnowledgeBaseRoot_module_css_default.modelsFieldLabel,
																		children: t("kb.modelDims")
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																		className: KnowledgeBaseRoot_module_css_default.modelsInput,
																		type: "text",
																		inputMode: "numeric",
																		value: addModelForm.dims,
																		placeholder: "1024",
																		onChange: (e) => setAddModelForm((f) => ({
																			...f,
																			dims: e.target.value
																		}))
																	})]
																})
															]
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: KnowledgeBaseRoot_module_css_default.modelsFormFoot,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: KnowledgeBaseRoot_module_css_default.modelsAddDesc,
																children: t("kb.modelAddConfigDesc")
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.modelsSaveBtn,
																disabled: addModelBusy,
																onClick: () => {
																	saveCustomModel();
																},
																children: addModelBusy ? "…" : t("kb.modelSave")
															})]
														})]
													})]
												})
											] })
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modelsFoot,
											children: [
												modelsRestartNeeded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.modelsRestartBtn,
													disabled: modelsRestarting,
													onClick: () => {
														restartSidecar();
													},
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 13 }), modelsRestarting ? t("kb.modelRestarting") : t("kb.modelRestartNow")]
												}),
												modelsRestartNeeded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: KnowledgeBaseRoot_module_css_default.modelsRestartHint,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 13 }), t("kb.modelRestartNeeded")]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.modalBtnSecondary,
													onClick: () => setModelsModal(false),
													children: t("close")
												})
											]
										})
									]
								})
							}),
							logsModal && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.modalOverlay,
								role: "presentation",
								onClick: () => setLogsModal(false),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: clsx(KnowledgeBaseRoot_module_css_default.modal, KnowledgeBaseRoot_module_css_default.modalWide),
									role: "dialog",
									"aria-modal": "true",
									"aria-label": t("kb.logsTitle"),
									onClick: (e) => e.stopPropagation(),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.modalTitle,
												children: t("kb.logsTitle")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalSub,
												children: t("kb.logsSub")
											})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalClose,
												onClick: () => setLogsModal(false),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.logsList,
											children: logs === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.logsEmpty,
												children: logsLoading ? "…" : t("kb.logsLoadError")
											}) : logs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.logsEmpty,
												children: t("kb.logsEmpty")
											}) : logs.map((entry, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.logRow,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: KnowledgeBaseRoot_module_css_default.logTime,
														children: formatTs(entry.ts * 1e3)
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: KnowledgeBaseRoot_module_css_default.logAction,
														children: entry.action
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: KnowledgeBaseRoot_module_css_default.logDetail,
														children: entry.detail ?? ""
													})
												]
											}, i))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.logsFoot,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.logsCount,
													children: logs ? t("kb.logsCount").replace("{n}", String(logs.length)) : ""
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.logBtn,
													onClick: () => {
														loadLogs();
													},
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, { size: 12 }), t("kb.logsRefresh")]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.logBtn,
													onClick: () => {
														ragLogExport();
													},
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 12 }), t("kb.logsExport")]
												})
											]
										})
									]
								})
							}),
							shareDialog && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.modalOverlay,
								role: "presentation",
								onClick: () => {
									if (!sharedBusy) setShareDialog(null);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: KnowledgeBaseRoot_module_css_default.modal,
									role: "dialog",
									"aria-modal": "true",
									"aria-label": t("kb.shareTo"),
									onClick: (e) => e.stopPropagation(),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.modalTitle,
												children: t("kb.shareTo")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalSub,
												children: t("kb.shareToSub").replace("{n}", String(shareDialog.docs.length))
											})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalClose,
												onClick: () => setShareDialog(null),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalBody,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
													className: KnowledgeBaseRoot_module_css_default.modalHint,
													children: t("kb.shareTarget")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
													className: KnowledgeBaseRoot_module_css_default.modalInput,
													value: shareDialog.target,
													onChange: (e) => setShareDialog({ ...shareDialog, target: e.target.value }),
													children: [
														sharedFolders.map((sf) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: sf.name, children: sf.name }, sf.name)),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: "__new__", children: t("kb.shareNew") })
													]
												}),
												shareDialog.target === "__new__" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
														autoFocus: true,
														className: KnowledgeBaseRoot_module_css_default.modalInput,
														placeholder: t("kb.shareNewName"),
														value: shareDialog.newName,
														onChange: (e) => setShareDialog({ ...shareDialog, newName: e.target.value })
													}),
													sharedModal.mode !== "rename" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
														className: KnowledgeBaseRoot_module_css_default.modalHint,
														children: t("kb.sharedMembers")
													}),
													sharedModal.mode !== "rename" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: KnowledgeBaseRoot_module_css_default.memberList,
														children: sharedUsers.map((u) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
															className: KnowledgeBaseRoot_module_css_default.memberItem,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																	type: "checkbox",
																	checked: shareDialog.members.includes(u) || u === MU_NS_RAW,
																	disabled: u === MU_NS_RAW,
																	onChange: (e) => {
																		setShareDialog({ ...shareDialog, members: e.target.checked ? [...shareDialog.members, u] : shareDialog.members.filter((x) => x !== u) });
																	}
																}),
																u
															]
														}, u))
												})
												] })
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalFoot,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.modalBtnSecondary,
													onClick: () => setShareDialog(null),
													disabled: sharedBusy,
													children: t("close")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.modalBtnPrimary,
													onClick: () => {
														executeShare();
													},
													disabled: sharedBusy,
													children: sharedBusy ? t("kb.shareBusy") : t("kb.shareConfirm")
												})
											]
										})
									]
								})
							}),
							sharedModal && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.modalOverlay,
								role: "presentation",
								onClick: () => setSharedModal(null),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: KnowledgeBaseRoot_module_css_default.modal,
									role: "dialog",
									"aria-modal": "true",
									"aria-label": t("kb.sharedCreate"),
									onClick: (e) => e.stopPropagation(),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.modalTitle,
												children: sharedModal.mode === "create" ? t("kb.sharedCreate") : sharedModal.mode === "rename" ? t("kb.sharedRename") : `${t("kb.sharedMembersEdit")} · ${sharedModal.folder}`
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalSub,
												children: t("kb.sharedCreateSub")
											})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalClose,
												onClick: () => setSharedModal(null),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalBody,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
													className: KnowledgeBaseRoot_module_css_default.modalHint,
													children: t("kb.sharedName")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													autoFocus: true,
													className: KnowledgeBaseRoot_module_css_default.modalInput,
													placeholder: t("kb.sharedName"),
													value: sharedModal.mode === "create" ? sharedModal.name : sharedModal.mode === "rename" ? sharedModal.value : sharedModal.folder,
													disabled: sharedModal.mode === "members",
													onChange: (e) => setSharedModal({ ...sharedModal, name: e.target.value })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
													className: KnowledgeBaseRoot_module_css_default.modalHint,
													children: t("kb.sharedMembers")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.memberList,
													children: sharedUsers.map((u) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
														className: KnowledgeBaseRoot_module_css_default.memberItem,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
																type: "checkbox",
																checked: sharedModal.members.includes(u),
																onChange: (e) => {
																	setSharedModal({ ...sharedModal, members: e.target.checked ? [...sharedModal.members, u] : sharedModal.members.filter((x) => x !== u) });
																}
															}),
															u
															]
														}, u))
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalFoot,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.modalBtnSecondary,
													onClick: () => setSharedModal(null),
													children: t("close")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.modalBtnPrimary,
													onClick: async () => {
														if (sharedModal.mode === "rename") {
															const nv = sharedModal.value.trim();
															if (!nv) {
																showNotice(t("kb.sharedNameRequired"));
																return;
															}
															const r = await ragSharedRenameFolder(sharedModal.folder, nv);
															if (r === null) showNotice("重命名失败：RAG-Anything 无响应。");
															else if (r.error) showNotice(`重命名失败：${r.error}`);
															else {
																showNotice(`已重命名为「${nv}」。`);
																logAction("重命名共享文件夹", `${sharedModal.folder} → ${nv}`);
																setSharedModal(null);
																refreshShared();
															}
														} else if (sharedModal.mode === "create") {
															const nm = sharedModal.name.trim();
															if (!nm) {
																showNotice(t("kb.sharedNameRequired"));
																return;
															}
															const r = await ragSharedCreateFolder(nm, sharedModal.members);
															if (r === null) showNotice("创建失败：RAG-Anything 无响应。");
															else if (r.error) showNotice(`创建失败：${r.error}`);
															else {
																showNotice(t("kb.sharedCreated").replace("{n}", nm));
																logAction("创建共享文件夹", nm);
																setSharedModal(null);
																refreshShared();
															}
														} else {
															const r = await ragSharedSetMembers(sharedModal.folder, sharedModal.members);
															if (r === null) showNotice("保存失败：RAG-Anything 无响应。");
															else if (r.error) showNotice(`保存失败：${r.error}`);
															else {
																showNotice(t("kb.sharedMembersSaved"));
																logAction("共享文件夹成员更新", sharedModal.folder);
																setSharedModal(null);
																refreshShared();
															}
														}
													}
													,
													children: t("kb.save")
												})
											]
										})
									]
								})
							}),
							sharedTrash && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.modalOverlay,
								role: "presentation",
								onClick: () => setSharedTrash(null),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: KnowledgeBaseRoot_module_css_default.modal,
									role: "dialog",
									"aria-modal": "true",
									"aria-label": t("kb.sharedTrash"),
									onClick: (e) => e.stopPropagation(),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.modalTitle,
												children: t("kb.sharedTrash")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalSub,
												children: t("kb.sharedTrashSub")
											})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalClose,
												onClick: () => setSharedTrash(null),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalBody,
											children: !sharedTrash.entries ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.empty,
												children: t("kb.sharedLoading")
											}) : sharedTrash.entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.empty,
												children: t("kb.sharedTrashEmpty")
											}) : sharedTrash.entries.map((te) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.memberItem,
												style: { cursor: "default" },
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { style: { flex: 1, minWidth: 0 }, children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: te.name }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 11 }, children: [te.kind === "folder" ? " 文件夹" : " 文件", te.deleted_by ? ` · 由 ${te.deleted_by} 删除` : ""] })
													] }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.logBtn,
														onClick: () => restoreSharedTrash(te.id),
														children: t("kb.sharedRestore")
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: clsx(KnowledgeBaseRoot_module_css_default.logBtn, KnowledgeBaseRoot_module_css_default.footBtnBusy),
														onClick: () => purgeSharedTrash(te.id),
														children: t("kb.sharedPurge")
													})
												]
											}, te.id))
										})
									]
								})
							}),
							renamingShared && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: KnowledgeBaseRoot_module_css_default.modalOverlay,
								role: "presentation",
								onClick: () => setRenamingShared(null),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: KnowledgeBaseRoot_module_css_default.modal,
									role: "dialog",
									"aria-modal": "true",
									"aria-label": t("kb.sharedRename"),
									onClick: (e) => e.stopPropagation(),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalHead,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.modalTitle,
												children: renamingShared.kind === "folder" ? t("kb.sharedRename") : `${t("kb.sharedRename")} · ${renamingShared.folder}`
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalBody,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												autoFocus: true,
												className: KnowledgeBaseRoot_module_css_default.modalInput,
												placeholder: t("kb.sharedRenamePrompt"),
												value: renamingShared.value,
												onChange: (e) => setRenamingShared({ ...renamingShared, value: e.target.value }),
												onKeyDown: (e) => {
													if (e.key === "Enter") commitRenameShared();
												}
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.modalFoot,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalBtnSecondary,
												onClick: () => setRenamingShared(null),
												children: t("close")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalBtnPrimary,
												onClick: () => commitRenameShared(),
												children: t("kb.save")
											})]
										})
									]
								})
							}),
						]
					})]
				})
			] });
		}
		//#endregion
		//#region src/client/locales.ts
		/** Independent knowledge-base dictionary namespace (raganything).
		*  Extracted from the in-DSH KB panel copy (kb.* keys + the shared `close`
		*  vocabulary entry) so the plugin's client bundle owns its own locale. */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"close": "关闭",
			"kb.trigger": "知识库",
			"kb.title": "AI 知识库",
			"kb.search": "搜索知识库内容",
			"kb.personal": "个人知识库",
		"kb.shared": "共享知识库",
		"kb.sharedOffline": "未连接 RAG-Anything",
		"kb.sharedLoading": "加载中…",
		"kb.sharedEmpty": "暂无可查看的共享知识库",
		"kb.sharedCreate": "新建共享文件夹",
		"kb.sharedCreateSub": "共享文件夹对指定成员可见",
		"kb.sharedMembersEdit": "成员管理",
		"kb.sharedDelete": "删除共享文件夹",
		"kb.sharedDeleteConfirm": "将同时删除该文件夹内已共享的文档，确定删除？",
			"kb.sharedCreatedBy": "创建者：",
			"kb.sharedNewFolder": "新建文件夹",
			"kb.sharedUploadFiles": "上传文件",
			"kb.sharedUploadFolder": "上传文件夹",
			"kb.sharedDownload": "下载",
			"kb.sharedRename": "重命名",
			"kb.sharedTrash": "回收箱",
			"kb.sharedTrashSub": "仅管理员可还原或彻底删除",
			"kb.sharedTrashEmpty": "回收箱为空",
			"kb.sharedRestore": "还原",
			"kb.sharedPurge": "彻底删除",
			"kb.sharedOpenPreview": "打开预览",
			"kb.sharedDeleteFile": "删除共享文件",
			"kb.sharedRenamePrompt": "输入新名称",
		"kb.sharedName": "名称",
		"kb.sharedNameRequired": "请输入共享文件夹名称",
		"kb.sharedMembers": "可查看成员",
		"kb.sharedMembersSaved": "成员已更新",
		"kb.save": "保存",
		"kb.sharedCreated": "共享文件夹已创建：{n}",
		"kb.shareTo": "共享至…",
		"kb.shareToSub": "将 {n} 个文件共享到共享知识库的目标文件夹",
		"kb.shareTarget": "目标文件夹",
		"kb.shareNew": "＋ 新建共享文件夹…",
		"kb.shareNewName": "输入新共享文件夹名称",
		"kb.shareConfirm": "共享",
		"kb.shareBusy": "共享中…",
		"kb.collapseSection": "折叠",
		"kb.expandSection": "展开",
			"kb.noMatch": "没有匹配的知识库",
			"kb.sync": "同步",
			"kb.upload": "上传文件入库",
			"kb.uploadFile": "上传文件",
			"kb.uploadFolder": "上传文件夹",
			"kb.heroTitle": "璇玑AI Chat",
			"kb.heroSub": "基于你的知识库回答问题，来源可追溯",
			"kb.placeholder": "向璇玑AI发送消息，输入 @ 指定知识库、文件夹或文件",
			"kb.send": "发送",
			"kb.model": "选择模型",
			"kb.modelLoading": "正在加载模型列表…",
			"kb.modelLoadError": "模型列表加载失败",
			"kb.modelRetry": "重试",
			"kb.history": "历史对话",
			"kb.clear": "清空",
			"kb.mention": "引用文件夹或文件",
			"kb.artifacts": "对话产物",
			"kb.artifactsEmpty": "暂无对话产物",
			"kb.artifactsMention": "文件",
			"kb.artifactsMentionHint": "引用该产物文件到当前对话",
			"kb.artifactsCollapse": "收起产物栏",
			"kb.artifactsExpand": "展开产物栏",
			"kb.uploading": "正在解析 {name}… 已等待 {s} 秒",
			"kb.think": "思考过程",
			"kb.thinkSearching": "正在检索知识库…",
			"kb.thinkReasoning": "模型思考中…",
			"kb.thinkAnswering": "正在生成回答…",
			"kb.elapsedSec": "{s} 秒",
			"kb.elapsedMin": "{m} 分 {r} 秒",
			"kb.elapsedMinOnly": "{m} 分钟",
			"kb.openOriginal": "打开原始文件",
			"kb.originalTag": "原始文件",
			"kb.originalHint": "以下为解析出的文本预览；原始 Word/Excel/PPT/PDF 文件请点击右上角「打开原始文件」，将保留原始版式并下载到本地打开。",
			"kb.status.processed": "已入库",
			"kb.status.processing": "处理中",
			"kb.status.pending": "等待中",
			"kb.status.failed": "失败",
			"kb.status.preprocessed": "预处理",
			"kb.newFolder": "新建文件夹",
			"kb.moreActions": "更多操作",
			"kb.mentionFolder": "文件夹",
			"kb.renameFolder": "重命名",
			"kb.shareFolder": "共享至",
			"kb.downloadFolder": "下载",
			"kb.deleteFolder": "删除",
			"kb.mentionFile": "文件",
			"kb.renameFile": "重命名",
			"kb.downloadFile": "下载",
			"kb.previewInClient": "在客户端内打开预览",
			"kb.deleteFile": "删除文件",
			"kb.pinSession": "置顶",
			"kb.unpinSession": "取消置顶",
			"kb.renameSession": "重命名",
			"kb.archiveSession": "归档",
			"kb.deleteSession": "删除",
			"kb.folderName": "文件夹名称",
			"kb.cancel": "取消",
			"kb.confirm": "确认",
			"kb.createIn": "将在 {parent} 下新建文件夹",
			"kb.emptyFolder": "空文件夹",
			"kb.newChat": "新建对话",
			"kb.noHistory": "暂无历史对话",
			"kb.deleteHistory": "删除该对话",
			"kb.viewOriginal": "查看原始文件",
			"kb.backHome": "返回主页",
			"kb.index": "索引",
			"kb.logs": "日志",
			"kb.minimize": "最小化",
			"kb.maximize": "最大化",
			"kb.winRestore": "还原",
			"kb.collapseSidebar": "收起侧边栏",
			"kb.expandSidebar": "展开侧边栏",
			"kb.indexSub": "查看索引统计信息和管理搜索索引",
			"kb.indexDocUnit": "个文档",
			"kb.indexStatus": "状态",
			"kb.indexListening": "监听中",
			"kb.indexNameSearch": "文件名搜索",
			"kb.indexFulltext": "全文搜索",
			"kb.indexSemantic": "语义搜索",
			"kb.indexOcr": "从图片提取文本 (OCR)",
			"kb.indexReady": "就绪",
			"kb.indexLastUpdate": "最后更新",
			"kb.indexDataSize": "数据大小",
			"kb.indexRebuild": "重建索引",
			"kb.indexRebuildDesc": "当发现搜索异常等问题时，可以通过重建索引进行修复，耗时大概在 10 到几十分钟不等",
			"kb.indexRebuildBtn": "重建",
			"kb.indexRebuilding": "重建中",
			"kb.indexRebuildDone": "上次重建：完成 {d}/{t}，失败 {f}",
			"kb.indexRebuildConfirm": "确认重建索引？\n重建会重新解析并入库所有已上传文件，耗时可能长达数十分钟，期间请勿上传新文档。",
			"kb.indexToggleSleep": "空闲时模型自动休眠",
			"kb.indexToggleSleepDesc": "空闲 5 分钟后自动释放 AI 模型占用的内存（约 1GB），需要时自动重新加载",
			"kb.indexToggleOcr": "图片文字识别 (OCR)",
			"kb.indexToggleOcrDesc": "使用本地 OCR 识别图片中的文字",
			"kb.indexToggleSemantic": "语义搜索",
			"kb.indexToggleSemanticDesc": "关闭后仅可使用全文搜索",
			"kb.indexToggleAudio": "音频解析",
			"kb.indexToggleAudioDesc": "使用本地模型从音频中解析字幕、对话等",
			"kb.indexToggleVideo": "视频解析",
			"kb.indexToggleVideoDesc": "使用本地模型从视频中解析字幕、对话等",
			"kb.logsTitle": "操作日志",
			"kb.logsSub": "知识库用户操作记录（最近 500 条）",
			"kb.logsEmpty": "暂无日志",
			"kb.logsRefresh": "刷新",
			"kb.logsExport": "导出日志",
			"kb.logsCount": "共 {n} 条",
			"kb.logsLoadError": "日志加载失败",
			"kb.indexBusyHint": "资料正在解析/索引中",
			"kb.indexParsing": "解析中",
			"kb.indexFiles": "资料索引",
			"kb.indexFilesEmpty": "暂无可索引的资料文件，请先上传",
			"kb.reindex": "索引",
			"kb.reindexing": "索引中…",
			"kb.never": "从未",
			"kb.aiModels": "AI 模型",
			"kb.aiModelsSub": "为知识库各环节选择默认模型；本地模型可下载后使用，兼容 NVIDIA CUDA 与 AMD ROCm",
			"kb.aiModelsDevice": "运行设备",
			"kb.aiModelsDeviceCuda": "NVIDIA CUDA",
			"kb.aiModelsDeviceRocm": "AMD ROCm",
			"kb.aiModelsDeviceCpu": "CPU",
			"kb.aiModelsDeviceUnknown": "未检测到",
			"kb.modelLlm": "LLM 语言模型",
			"kb.modelLlmDesc": "问答生成与知识抽取，选项来自 DSH-设置-模型",
			"kb.modelIndexLlm": "索引模型",
			"kb.modelIndexLlmDesc": "入库解析时的实体/关系抽取与合并，选项来自 DSH-设置-模型",
			"kb.modelVision": "视觉模型",
			"kb.modelVisionDesc": "图片/多模态理解，选项来自 DSH-设置-模型",
			"kb.modelEmbedding": "Embedding 模型",
			"kb.modelEmbeddingDesc": "向量化检索；切换后建议重建索引",
			"kb.modelRerank": "Rerank 重排模型",
			"kb.modelRerankDesc": "检索结果重排，提升召回质量",
			"kb.modelAsr": "ASR 语音模型",
			"kb.modelAsrDesc": "音频/视频语音转写",
			"kb.modelParser": "文档解析模型",
			"kb.modelParserDesc": "PDF/Office/图片解析入库",
			"kb.modelDefault": "默认",
			"kb.modelDownload": "下载",
			"kb.modelDownloading": "下载中",
			"kb.modelReady": "已就绪",
			"kb.modelReadyCount": "{n} 个就绪",
			"kb.modelToDownload": "{n} 个待下载",
			"kb.modelMissing": "未下载",
			"kb.modelSetDefault": "设为默认",
			"kb.modelCurrent": "当前默认",
			"kb.modelFromDsh": "从 DSH 导入",
			"kb.modelAddConfig": "新增模型配置",
			"kb.modelAddConfigDesc": "参考 DSH-设置-模型：填写名称、Base URL、API Key 与模型 ID，保存后即可在对应类别中选择",
			"kb.modelName": "名称",
			"kb.modelBaseUrl": "Base URL",
			"kb.modelApiKey": "API Key（可留空）",
			"kb.modelId": "模型 ID",
			"kb.modelDims": "向量维度（Embedding 可选）",
			"kb.modelCategory": "类别",
			"kb.modelSave": "保存",
			"kb.modelCancel": "取消",
			"kb.modelSelectSaved": "已保存默认模型",
			"kb.modelSelectFail": "保存失败",
			"kb.modelRestartNeeded": "部分更改将在重启知识库服务后生效",
			"kb.modelRestartNow": "立即重启服务",
			"kb.modelRestarting": "正在重启…",
			"kb.modelRuntimeMissing": "本地 GGUF 嵌入需要 llama-cpp-python 运行时",
			"kb.modelInstallRuntime": "安装运行时",
			"kb.modelDownloadFail": "下载失败",
			"kb.modelCustomAdded": "已新增模型配置",
			"kb.modelNoModels": "（无可用模型）"
		};
		/** English dictionary. */
		const en = {
			"close": "Close",
			"kb.trigger": "Knowledge Base",
			"kb.title": "AI Knowledge Base",
			"kb.search": "Search knowledge base",
			"kb.personal": "Personal Knowledge Base",
		"kb.shared": "Shared Knowledge Base",
		"kb.sharedOffline": "RAG-Anything offline",
		"kb.sharedLoading": "Loading…",
		"kb.sharedEmpty": "No shared knowledge base yet",
		"kb.sharedCreate": "New shared folder",
		"kb.sharedCreateSub": "Shared folders are visible to selected members only",
		"kb.sharedMembersEdit": "Members",
		"kb.sharedDelete": "Delete shared folder",
		"kb.sharedDeleteConfirm": "Documents shared into it will be removed too. Delete?",
			"kb.sharedCreatedBy": "Created by: ",
			"kb.sharedNewFolder": "New sub-folder",
			"kb.sharedUploadFiles": "Upload files",
			"kb.sharedUploadFolder": "Upload folder",
			"kb.sharedDownload": "Download",
			"kb.sharedRename": "Rename",
			"kb.sharedTrash": "Trash",
			"kb.sharedTrashSub": "Only admins can restore or purge",
			"kb.sharedTrashEmpty": "Trash is empty",
			"kb.sharedRestore": "Restore",
			"kb.sharedPurge": "Delete forever",
			"kb.sharedOpenPreview": "Open preview",
			"kb.sharedDeleteFile": "Delete shared file",
			"kb.sharedRenamePrompt": "Enter new name",
		"kb.sharedName": "Name",
		"kb.sharedNameRequired": "Folder name is required",
		"kb.sharedMembers": "Members who can view",
		"kb.sharedMembersSaved": "Members updated",
		"kb.save": "Save",
		"kb.sharedCreated": "Shared folder created: {n}",
		"kb.shareTo": "Share to…",
		"kb.shareToSub": "Share {n} file(s) into a target shared folder",
		"kb.shareTarget": "Target folder",
		"kb.shareNew": "＋ New shared folder…",
		"kb.shareNewName": "Name of the new shared folder",
		"kb.shareConfirm": "Share",
		"kb.shareBusy": "Sharing…",
		"kb.collapseSection": "Collapse",
		"kb.expandSection": "Expand",
			"kb.noMatch": "No matching knowledge base",
			"kb.sync": "Sync",
			"kb.upload": "Upload files to ingest",
			"kb.uploadFile": "Upload files",
			"kb.uploadFolder": "Upload folder",
			"kb.heroTitle": "Xuanji AI Chat",
			"kb.heroSub": "Answer from your knowledge base, sources traceable",
			"kb.placeholder": "Message Xuanji AI, type @ to reference a knowledge base, folder or file",
			"kb.send": "Send",
			"kb.model": "Select model",
			"kb.modelLoading": "Loading models…",
			"kb.modelLoadError": "Failed to load models",
			"kb.modelRetry": "Retry",
			"kb.history": "Conversation",
			"kb.clear": "Clear",
			"kb.mention": "Reference a folder or file",
			"kb.artifacts": "Chat artifacts",
			"kb.artifactsEmpty": "No artifacts yet",
			"kb.artifactsMention": "File",
			"kb.artifactsMentionHint": "Reference this artifact in the current conversation",
			"kb.artifactsCollapse": "Collapse artifacts",
			"kb.artifactsExpand": "Expand artifacts",
			"kb.uploading": "Parsing {name}… waited {s}s",
			"kb.think": "Thinking",
			"kb.thinkSearching": "Searching the knowledge base…",
			"kb.thinkReasoning": "Model is thinking…",
			"kb.thinkAnswering": "Generating answer…",
			"kb.elapsedSec": "{s}s",
			"kb.elapsedMin": "{m}m {r}s",
			"kb.elapsedMinOnly": "{m} min",
			"kb.openOriginal": "Open original file",
			"kb.originalTag": "original",
			"kb.originalHint": "Below is the parsed text preview; for the original Word/Excel/PPT/PDF layout click \"Open original file\" in the top-right corner — it downloads the original file.",
			"kb.status.processed": "Ingested",
			"kb.status.processing": "Processing",
			"kb.status.pending": "Queued",
			"kb.status.failed": "Failed",
			"kb.status.preprocessed": "Preparing",
			"kb.newFolder": "New folder",
			"kb.moreActions": "More actions",
			"kb.mentionFolder": "Folder",
			"kb.renameFolder": "Rename",
			"kb.shareFolder": "Share to",
			"kb.downloadFolder": "Download",
			"kb.deleteFolder": "Delete",
			"kb.mentionFile": "File",
			"kb.renameFile": "Rename",
			"kb.downloadFile": "Download",
			"kb.previewInClient": "Preview in client",
			"kb.deleteFile": "Delete file",
			"kb.pinSession": "Pin",
			"kb.unpinSession": "Unpin",
			"kb.renameSession": "Rename",
			"kb.archiveSession": "Archive",
			"kb.deleteSession": "Delete",
			"kb.folderName": "Folder name",
			"kb.cancel": "Cancel",
			"kb.confirm": "Confirm",
			"kb.createIn": "Create folder under {parent}",
			"kb.emptyFolder": "Empty folder",
			"kb.newChat": "New chat",
			"kb.noHistory": "No conversation history",
			"kb.deleteHistory": "Delete conversation",
			"kb.viewOriginal": "View original file",
			"kb.backHome": "Back to home",
			"kb.index": "Index",
			"kb.logs": "Logs",
			"kb.minimize": "Minimize",
			"kb.maximize": "Maximize",
			"kb.winRestore": "Restore",
			"kb.collapseSidebar": "Collapse sidebar",
			"kb.expandSidebar": "Expand sidebar",
			"kb.indexSub": "View index statistics and manage the search index",
			"kb.indexDocUnit": "documents",
			"kb.indexStatus": "Status",
			"kb.indexListening": "Watching",
			"kb.indexNameSearch": "Filename search",
			"kb.indexFulltext": "Full-text search",
			"kb.indexSemantic": "Semantic search",
			"kb.indexOcr": "Extract text from images (OCR)",
			"kb.indexReady": "Ready",
			"kb.indexLastUpdate": "Last updated",
			"kb.indexDataSize": "Data size",
			"kb.indexRebuild": "Rebuild index",
			"kb.indexRebuildDesc": "When search behaves abnormally, rebuilding the index can fix it. This takes roughly 10 minutes to over an hour",
			"kb.indexRebuildBtn": "Rebuild",
			"kb.indexRebuilding": "Rebuilding",
			"kb.indexRebuildDone": "Last rebuild: {d}/{t} done, {f} failed",
			"kb.indexRebuildConfirm": "Rebuild the index?\nAll uploaded files will be re-parsed and re-ingested; this can take tens of minutes. Do not upload new documents meanwhile.",
			"kb.indexToggleSleep": "Auto-sleep models when idle",
			"kb.indexToggleSleepDesc": "Release ~1GB of model memory after 5 minutes idle; reload on demand",
			"kb.indexToggleOcr": "Image text recognition (OCR)",
			"kb.indexToggleOcrDesc": "Recognize text in images with local OCR",
			"kb.indexToggleSemantic": "Semantic search",
			"kb.indexToggleSemanticDesc": "When off, only full-text search is available",
			"kb.indexToggleAudio": "Audio parsing",
			"kb.indexToggleAudioDesc": "Parse subtitles and speech from audio with local models",
			"kb.indexToggleVideo": "Video parsing",
			"kb.indexToggleVideoDesc": "Parse subtitles and speech from video with local models",
			"kb.logsTitle": "Operation logs",
			"kb.logsSub": "User activity in the knowledge base (latest 500)",
			"kb.logsEmpty": "No logs yet",
			"kb.logsRefresh": "Refresh",
			"kb.logsExport": "Export logs",
			"kb.logsCount": "{n} entries",
			"kb.logsLoadError": "Failed to load logs",
			"kb.indexBusyHint": "Materials are being parsed / indexed",
			"kb.indexParsing": "Parsing",
			"kb.indexFiles": "Material indexing",
			"kb.indexFilesEmpty": "No source files to index yet — upload first",
			"kb.reindex": "Index",
			"kb.reindexing": "Indexing…",
			"kb.never": "Never",
			"kb.aiModels": "AI Models",
			"kb.aiModelsSub": "Choose the default model for each knowledge-base stage; local models can be downloaded and used right away, supporting NVIDIA CUDA and AMD ROCm",
			"kb.aiModelsDevice": "Device",
			"kb.aiModelsDeviceCuda": "NVIDIA CUDA",
			"kb.aiModelsDeviceRocm": "AMD ROCm",
			"kb.aiModelsDeviceCpu": "CPU",
			"kb.aiModelsDeviceUnknown": "Not detected",
			"kb.modelLlm": "LLM",
			"kb.modelLlmDesc": "Answering and knowledge extraction; options imported from DSH Settings → Models",
			"kb.modelIndexLlm": "Index model",
			"kb.modelIndexLlmDesc": "Entity/relation extraction & merge during ingest; options imported from DSH Settings → Models",
			"kb.modelVision": "Vision model",
			"kb.modelVisionDesc": "Image / multimodal understanding; options imported from DSH Settings → Models",
			"kb.modelEmbedding": "Embedding model",
			"kb.modelEmbeddingDesc": "Vector retrieval; rebuilding the index after switching is recommended",
			"kb.modelRerank": "Rerank model",
			"kb.modelRerankDesc": "Re-ranks retrieval results for better recall",
			"kb.modelAsr": "ASR model",
			"kb.modelAsrDesc": "Audio / video speech transcription",
			"kb.modelParser": "Document parser",
			"kb.modelParserDesc": "PDF / Office / image parsing into the knowledge base",
			"kb.modelDefault": "Default",
			"kb.modelDownload": "Download",
			"kb.modelDownloading": "Downloading",
			"kb.modelReady": "Ready",
			"kb.modelReadyCount": "{n} ready",
			"kb.modelToDownload": "{n} to download",
			"kb.modelMissing": "Not downloaded",
			"kb.modelSetDefault": "Set default",
			"kb.modelCurrent": "Current default",
			"kb.modelFromDsh": "From DSH",
			"kb.modelAddConfig": "Add model config",
			"kb.modelAddConfigDesc": "Following DSH Settings → Models: fill in name, Base URL, API key and model ID; it becomes selectable in its category once saved",
			"kb.modelName": "Name",
			"kb.modelBaseUrl": "Base URL",
			"kb.modelApiKey": "API key (optional)",
			"kb.modelId": "Model ID",
			"kb.modelDims": "Vector dims (embedding, optional)",
			"kb.modelCategory": "Category",
			"kb.modelSave": "Save",
			"kb.modelCancel": "Cancel",
			"kb.modelSelectSaved": "Default model saved",
			"kb.modelSelectFail": "Save failed",
			"kb.modelRestartNeeded": "Some changes take effect after restarting the knowledge-base service",
			"kb.modelRestartNow": "Restart service now",
			"kb.modelRestarting": "Restarting…",
			"kb.modelRuntimeMissing": "Local GGUF embedding needs the llama-cpp-python runtime",
			"kb.modelInstallRuntime": "Install runtime",
			"kb.modelDownloadFail": "Download failed",
			"kb.modelCustomAdded": "Model config added",
			"kb.modelNoModels": "(no models available)"
		};
		//#endregion
		//#region src/client/ofv.ts
		/** Extensions rendered through the Open File Viewer bundle (window.__OFV__). */
		const OFV_EXTS = "jpg jpeg jfif pjpe pjpeg png gif webp avif jxl svg bmp ico cur tif tiff apng heic heif dxf mp4 mpg mpeg mpe mpv webm ogv mov m4v avi mkv flv wmv 3gp 3g2 m2ts m3u8 mp3 wav aif aiff aifc ogg oga aac m4a flac opus weba amr mid midi caf au snd wma docx docm doc dotx dotm dot rtf odt fodt wps xlsx xls xlsm xlsb xlt xltx xltm csv tsv ods fods numbers et pptx pptm ppt pps ppsx ppsm potx potm odp fodp key dps zip rar 7z tar gz tgz bz2 xz eml msg mbox drawio dio excalidraw tldraw xmind epub dwg dwf step stp iges igs ifc sat sab x_t x_b 3dm skp sldprt sldasm gds gdsii oas oasis gltf glb obj stl fbx dae ply 3mf 3ds usd usda usdc usdz wrl vrml json txt md xml yaml yml js ts tsx jsx html css geojson topojson kml kmz gpx shp ttf otf woff woff2 eot psd psb ai eps ps webarchive sqlite sqlite3 db wasm parquet avro pdf".split(" ");
		const OFV_ID = "openFileViewer";
		/** In-flight <script> load of the self-contained OFV bundle. */
		let ofvScriptPromise = null;
		/** Load the OFV bundle once; resolves window.__OFV__ or rejects. */
		function ensureOfv() {
			if (window.__OFV__) return Promise.resolve(window.__OFV__);
			if (!ofvScriptPromise) {
				ofvScriptPromise = new Promise((resolve, reject) => {
					const el = document.createElement("script");
					el.src = `${ragBaseUrl()}/viewer/ofv.bundle.js`;
					el.async = true;
					el.onload = () => window.__OFV__ ? resolve(window.__OFV__) : (ofvScriptPromise = null, reject(new Error("ofv bundle evaluated without __OFV__")));
					el.onerror = () => {
						ofvScriptPromise = null;
						reject(new Error("ofv bundle fetch failed"));
					};
					document.head.append(el);
				});
			}
			return ofvScriptPromise;
		}
		/** Configure pdf.js asset paths, then mount one source into `container`. */
		async function ofvMount(container, source, fileName, extra) {
			const ofv = await ensureOfv();
			ofv.assetBase(`${ragBaseUrl()}/viewer`);
			return ofv.mount(container, {
				file: source,
				fileName,
				locale: "zh-CN",
				...extra
			});
		}
		/** Filename for extension detection out of a resource address or explicit name. */
		function ofvFileNameOf(address, fallback) {
			if (fallback) return fallback;
			try {
				return String(address || "").split(/[?#]/)[0].split("/").pop() || "file";
			} catch {
				return "file";
			}
		}
		/** Right-sidebar document body: render host bytes with Open File Viewer. */
		function OfvDocBody(props) {
			const { content, resourceAddress } = props;
			const hostRef = react.useRef(null);
			const fileName = react.useMemo(() => ofvFileNameOf(resourceAddress), [resourceAddress]);
			const hasBytes = !!content && content.kind === "bytes" && !!content.data;
			react.useEffect(() => {
				const el = hostRef.current;
				if (!el || !hasBytes) return;
				let destroyed = false;
				let viewer = null;
				ofvMount(el, new Blob([content.data]), fileName).then((v) => {
					if (destroyed) {
						try {
							v.destroy();
						} catch {}
						return;
					}
					viewer = v;
				}).catch(() => {
					if (!destroyed) el.textContent = "Open File Viewer 加载失败，请重试或下载文件查看。";
				});
				return () => {
					destroyed = true;
					try {
						if (viewer) viewer.destroy();
					} catch {}
				};
			}, [content, fileName, hasBytes]);
			if (!hasBytes) return (0, react_jsx_runtime.jsx)("p", {
				style: {
					padding: 16
				},
				children: "正在加载文件…"
			});
			return (0, react_jsx_runtime.jsx)("div", {
				ref: hostRef,
				style: {
					height: "100%",
					minHeight: 480
				}
			});
		}
		/** KB-panel modal body: render the original file by sidecar URL, fall back to extracted text. */
		function OfvModalBody(props) {
			const { url, name, fallback } = props;
			const hostRef = react.useRef(null);
			const [failed, setFailed] = react.useState(false);
			react.useEffect(() => {
				const el = hostRef.current;
				if (!el || failed || !url) return;
				let destroyed = false;
				let viewer = null;
				ofvMount(el, url, name, {
					onError: () => setFailed(true),
					onUnsupported: () => setFailed(true)
				}).then((v) => {
					if (destroyed) {
						try {
							v.destroy();
						} catch {}
						return;
					}
					viewer = v;
				}).catch(() => {
					if (!destroyed) setFailed(true);
				});
				return () => {
					destroyed = true;
					try {
						if (viewer) viewer.destroy();
					} catch {}
				};
			}, [url, name, failed]);
			if (failed || !url) return (0, react_jsx_runtime.jsx)("pre", {
				className: KnowledgeBaseRoot_module_css_default.docViewerContent,
				children: fallback ?? ""
			});
			return (0, react_jsx_runtime.jsx)("div", {
				ref: hostRef,
				style: {
					flex: 1,
					minHeight: 0
				}
			});
		}
		/** Register Open File Viewer as the highest-priority document preview. */
		function registerOfvPreview(ctx) {
			if (!ctx.documentPreviews || !ctx.slots) return;
			ctx.effect(() => ctx.documentPreviews.register({
				id: OFV_ID,
				extensions: OFV_EXTS,
				priority: "extension",
				title: () => "Open File Viewer",
				loading: "bytes-complete",
				wrap: false
			}), "dsh-raganything-kb: ofv preview registry");
			ctx.effect(() => ctx.slots.inject("sidebar.right.tab.document", () => ctx.slots.register({
				name: "sidebar.right.tab.document",
				key: OFV_ID,
				locale: NS
			}, OfvDocBody)), "dsh-raganything-kb: ofv preview slot");
		}
		//#endregion
				//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin (KB panel copy). */
		const NS = "raganything";
		/** Services required (cordis fiber inject). */
		const inject = [
			"slots",
			"documentPreviews",
			"locale",
			"remote",
			"remote.session"
		];
		/**
		* Register the raganything dictionary and the KB foot action.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-raganything-kb: dictionaries");
			const kbInjected = () => ({ loadModels: async () => {
				const response = await ctx.remote.session.modelCatalog();
				if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
				return response.value;
			} });
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "knowledge-base",
				order: 0,
				locale: NS,
				inject: kbInjected
			}, KnowledgeBaseRoot));
			registerOfvPreview(ctx);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
