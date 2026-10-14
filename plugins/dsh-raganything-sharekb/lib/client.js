/* kbIcons071 -- DSH 0.1.7 renamed @deepseek-ai/dsh-client-ui-primitives icon
   exports from a size suffix to a weight suffix (...16 -> ...Regular).
   Remove with tools/patch_kbicons86.py --revert. */
// kbSessionId86Hoist
/* kbSessionId86 */
/* kbFeat86 */
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
		/** 冷启动兜底：sidecar 是账号 DSH 实例的子进程，首次同步 profile 依赖要
		 *  60s+，网关侧最多等 120s。原值 20s 会让首个请求必然超时、面板显示
		 *  "未连接（演示数据）"。正常情况有网关后台预热，只有直接刷新页面时才会
		 *  走到这个上限。 */
		const RAG_TIMEOUT_MS = 9e4;
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
			// kbFeat86-delfolderq — 嵌套名（含 /）必须走 query 形式：
			// 路径参数路由 /shared/folders/{name} 是单段匹配，%2F 会在路由前被解码成 /，
			// 导致 /shared/folders/A%2FB 落到 /shared/folders/A/B 而 404 Not Found。
			try {
				const _q = `/shared/folders?name=${encodeURIComponent(name)}&user=${encodeURIComponent(MU_NS_RAW)}`;
				let res = await ragFetch(_q, { method: "DELETE" });
				let data = await res.json().catch(() => ({}));
				// 兼容回退：万一该部署没有 query 路由，再试一次路径形式（仅单段名有效）
				if (!res.ok && res.status === 404 && data && data.detail === "Not Found" && !String(name).includes("/")) {
					res = await ragFetch(`/shared/folders/${encodeURIComponent(name)}?user=${encodeURIComponent(MU_NS_RAW)}`, { method: "DELETE" });
					data = await res.json().catch(() => ({}));
				}
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
		/** kbFeat86-sharesrcroot — 共享到共享知识库时，保留源文件夹自身名字作为一层。 */
		const SHARE_KEEP_SRC_ROOT = true;
		/** kbFeat86-trashall — 全部还原 / 全部删除（仅管理员）。 */
		async function ragSharedTrashRestoreAll() {
			try {
				const res = await ragFetch("/shared/trash/restore-all", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ user: MU_NS_RAW })
				});
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		async function ragSharedTrashPurgeAll() {
			try {
				const res = await ragFetch("/shared/trash/purge-all", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ user: MU_NS_RAW })
				});
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
				if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(typeof error.detail === 'string' ? error.detail : `任务提交失败（HTTP ${res.status}）`);
                }
				return (await res.json()).task_id ?? null;
			} catch (error) {
                    if (op !== 'query') return null;
                throw new Error(error && error.name === 'AbortError' ? '知识库任务提交超时，请稍后重试' : String(error && error.message || '无法连接知识库服务'));
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
		async function ragAskLive(query, mode = "hybrid", onProgress, deadlineMs = 9e5, scope, onTaskId, modelSelection, extra) {
			const taskId = await ragSubmit("query", {
				answerStyle: "humanizer-zh-qa-v1",
				/* P0-20260707：面板提问开启「模型优先」分流（闲聊/身份/能力直答，不检索）。
				   模型工具链（rag_query）不传该参数，保持缺省 kb 行为不变。 */
				router: "auto",
				query,
				mode,
				...scope ? { scope } : {},
				...modelSelection ? { modelSelection: { provider: modelSelection.provider, model: modelSelection.model } } : {},
				/* kbTask-20261003：受控扩展参数（intent / deep / history），sidecar 侧白名单校验 */
				...(extra && typeof extra === "object" ? extra : {})
			});
			if (taskId === null) return null;
			onTaskId?.(taskId);
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
			if (task?.status === "cancelled") return { status: "cancelled", answer: "（已停止生成）", sources: [] };
			if (task === null || task.status !== "done" || typeof task.result?.answer !== "string") return null;
			return {
				answer: task.result.answer,
				thinking: task.result.thinking ?? "",
				mode: task.result.mode ?? mode,
				/* kbTask-20261003：任务型回答分流标记（fast=快稿 → 可继续深挖；deep=深挖版） */
				intent: typeof task.result.intent === "string" ? task.result.intent : void 0,
				stage: typeof task.result.stage === "string" ? task.result.stage : void 0,
				// 注（KT-03/R-E6）：退化成 LightRAG 抽取原文的判定与纠正已完全由 sidecar
				// 承担（server.py 重试一次并在仍退化时打 degraded 标记，且不再写产物），
				// 客户端已无任何消费点，故这里不再透传 degraded 字段。
				sources: Array.isArray(task.result.sources) ? task.result.sources : [],
				generationModel: task.result.generationModel,
                generationModels: Array.isArray(task.result.generationModels) ? task.result.generationModels : [],
                sourcesStatus: typeof task.result.sourcesStatus === 'string' ? task.result.sourcesStatus : undefined,
                sourcesReason: typeof task.result.sourcesReason === 'string' ? task.result.sourcesReason : undefined,
				status: task.status
			};
		}
		/**
		* KT-03/R-E6 死代码清理：`ragIngestText`（文本入库）、`detectOfficeFormat`
		* （按问题关键词猜 Office 格式）、`isDegenerateAnswer`（客户端退化回答闸门）
		* 三个辅助函数随 KT-02 删除「问答自动写产物」链路后已无任何调用点，一并移除。
		* 退化回答的判定/纠正改由 sidecar 唯一承担；文本产物入库不再由客户端发起。
		* 用户显式导出仍走下方 ragIngestOffice（回答气泡的导出按钮）。
		*/
		/**
		* Ask the sidecar to generate an Office file (.docx/.xlsx/.pptx) from
		* markdown text, store it as a KB artifact (知识库产物), and ingest it.
		* Resolves {doc_id, existing} — `existing: true` means the text was
		* already in the KB (content dedup) but the file is still generated and
		* downloadable; null on failure.
		*/
		async function ragIngestOffice(text, title, format, sessionId) {
			const taskId = await ragSubmit("ingest_office", {
				text,
				title,
				format,
				session_id: sessionId || ""
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
				const ok = window.confirm(
					`检测到重复文件（${dupLabel}）：\n「${info.display_path || file.name}」\n\n` +
					`是否覆盖？覆盖后旧文件将移入回收站（保留 7 天）。\n\n` +
					`「确定」= 覆盖　「取消」= 跳过该文件`);
				if (!ok) return { outcome: "skipped" };
				policy = "overwrite";
				if (batch && window.confirm("本次批量上传中的其他重复文件也一律覆盖？")) batch.policy = policy;
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
		/** ---- 仅文件产物（对话产物栏的「更多操作」）2026-09-14 ----
		* 产物不再入库，只落盘 + 登记 manifest；下面三个接口负责改名、删除、
		* 复制一份到个人知识库（走正常解析入库）。doc_id 形如 art-<dest_name>。
		*/
		async function ragArtifactRename(docId, name) {
			try {
				const res = await ragFetch("/artifacts", {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ doc_id: docId, name })
				});
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		async function ragArtifactDelete(docId) {
			try {
				const res = await ragFetch(`/artifacts?doc_id=${encodeURIComponent(docId)}`, { method: "DELETE" });
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		/**
		* KT-03/T-03a 产物 provenance 判定（消费服务端 KT-04 新增字段）。
		* 服务端在产物/镜像记录上新增 origin ∈ generated（本对话生成的交付物）
		*   | workspace_mirror（DSH 工作区只读镜像文件）| legacy（历史数据，无 origin）。
		* 向后兼容：字段缺失或取值未知一律按 legacy 处理 —— 绝不隐藏既有产物、绝不抛错，
		* 旧数据继续沿用原「标题前缀」判定，保证老库不白屏（只做增量判定，不改既有字段消费）。
		*/
		function artifactOriginOf(rec) {
			const raw = rec && typeof rec.origin === "string" ? rec.origin.trim().toLowerCase() : "";
			if (raw === "generated") return "generated";
			if (raw === "workspace_mirror") return "workspace_mirror";
			return "legacy";
		}
		/** 是否工作区镜像：优先按 origin 判定；无 origin 的旧数据回退到既有 DSH产物/ 前缀约定。 */
		function isWorkspaceMirrorRecord(rec, title) {
			const origin = artifactOriginOf(rec);
			if (origin === "workspace_mirror") return true;
			if (origin !== "legacy") return false;
			const t = String((title ?? (rec && rec.title)) || "").replace(/\\/g, "/");
			return t === PIN_DSH || t.startsWith(`${PIN_DSH}/`);
		}
		/** 是否属于「本对话产物」：generated 与 legacy 都算（legacy 维持既有展示）。 */
		function isConversationArtifactRecord(rec, title) {
			return !isWorkspaceMirrorRecord(rec, title);
		}
		async function ragArtifactPromote(docId, folder) {
			try {
				const res = await ragFetch("/artifacts/promote", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ doc_id: docId, folder })
				});
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
			} catch {
				return null;
			}
		}
		/** 方案 B：把会话名下的产物重绑/搬迁到新目录段。 */
		async function ragArtifactSession(sessionId, dir, docIds) {
			try {
				const body = { session_id: sessionId, dir: dir || "" };
				if (Array.isArray(docIds) && docIds.length > 0) body.doc_ids = docIds;
				const res = await ragFetch("/artifacts/session", {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body)
				});
				const data = await res.json().catch(() => ({}));
				return res.ok ? data : { error: data.detail ?? `HTTP ${res.status}` };
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
					hasFile: doc.has_file === true,
					// kbFeat86-copyto-v3 —— 必须透传失败账本字段，
					// 才能精确命中账本（/failures/retry）；否则只能按文件名猜。
					...doc.failure_id ? { failureId: doc.failure_id } : {},
					...doc.error_code ? { errorCode: doc.error_code } : {},
					...doc.lifecycle ? { lifecycle: doc.lifecycle } : {}
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
		// Offline state has no sample documents or generated answers.
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
		const css = ".Y4cvAW_triggerRow{flex:none;align-items:center;gap:8px;width:calc(100% + 4px);margin:4px -2px;display:flex}.Y4cvAW_triggerRow.Y4cvAW_railRow{width:36px;margin:8px 0 10px}.Y4cvAW_trigger{box-sizing:border-box;cursor:pointer;width:auto;min-width:0;height:42px;color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:12px;flex:1;align-items:center;gap:8px;margin:0;padding:0 10px 0 8px;font-family:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden}.Y4cvAW_trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_trigger.Y4cvAW_rail{corner-shape:round;border-radius:50%;flex:none;justify-content:center;gap:0;width:36px;height:36px;margin:0;padding:0}.Y4cvAW_triggerLabel{white-space:nowrap;overflow:hidden}.Y4cvAW_overlay{z-index:1000;justify-content:center;align-items:center;display:flex;position:fixed;inset:0;left:var(--dsh-kb-left,0px);transition:left .28s var(--ds-ease-in-out,ease)}.Y4cvAW_mask{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);position:absolute;inset:0}.Y4cvAW_panel{z-index:1;background:var(--dsw-alias-bg-layer-2);width:1100px;max-width:calc(100vw - 48px);height:min(760px,100vh - 48px);box-shadow:var(--dsw-elevation-prominent);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:24px;display:flex;position:relative;overflow:hidden}.Y4cvAW_sidebar{box-sizing:border-box;border-right:1px solid var(--dsw-alias-divider-strong,var(--dsw-alias-divider));background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));flex-direction:column;flex:none;width:280px;padding:18px 14px 14px;display:flex;overflow:hidden}.Y4cvAW_sidebarHead{justify-content:space-between;align-items:center;margin-bottom:12px;display:flex}.Y4cvAW_sidebarTitle{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:600;line-height:24px}.Y4cvAW_close{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;place-items:center;display:grid}.Y4cvAW_close:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_statusChip{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-secondary);border-radius:10px;align-items:center;gap:7px;margin-bottom:10px;padding:6px 8px;font-size:12px;line-height:18px;display:flex}.Y4cvAW_statusChip.Y4cvAW_on .Y4cvAW_dot{background:var(--dsw-alias-ok,#2f9e6e)}.Y4cvAW_statusChip.Y4cvAW_off .Y4cvAW_dot{background:var(--dsw-alias-danger,#e5484d)}.Y4cvAW_dot{background:var(--dsw-alias-label-disabled);border-radius:50%;flex:none;width:7px;height:7px}.Y4cvAW_statusText{white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;overflow:hidden}.Y4cvAW_syncBtn{cursor:pointer;width:22px;height:22px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;flex:none;place-items:center;display:grid}.Y4cvAW_syncBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_search{border:1px solid var(--dsw-alias-divider);height:32px;color:var(--dsw-alias-label-disabled);border-radius:10px;align-items:center;gap:7px;margin-bottom:14px;padding:0 9px;display:flex}.Y4cvAW_search input{min-width:0;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1;font-family:inherit;font-size:13px}.Y4cvAW_folderLabel{letter-spacing:.6px;color:var(--dsw-alias-label-disabled);padding:2px 4px 6px;font-size:11px}.Y4cvAW_folderList{flex-direction:column;flex:2 1 0;gap:2px;min-height:0;max-height:60%;display:flex;overflow-y:auto}.Y4cvAW_folderGroup{flex-direction:column;display:flex}.Y4cvAW_folder{cursor:pointer;width:100%;height:32px;color:var(--dsw-alias-label-secondary);text-align:left;box-sizing:border-box;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:0 8px;font-family:inherit;font-size:13px;display:flex}.Y4cvAW_folder:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_folderChevron{width:14px;height:14px;color:var(--dsw-alias-label-disabled);flex:none;place-items:center;transition:transform .12s;display:grid}.Y4cvAW_folderIcon{color:var(--dsw-alias-accent,#0d9d97);flex:none}.Y4cvAW_folderName{white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;overflow:hidden}.Y4cvAW_pinIconDsh{color:#2f6bff}.Y4cvAW_pinIconKb{color:#8b5cf6}.Y4cvAW_folderCount{color:var(--dsw-alias-label-disabled);font-size:11px}.Y4cvAW_files{flex-direction:column;gap:1px;padding:2px 0 4px 24px;display:flex}.Y4cvAW_fileRowWrap{border-radius:7px;align-items:center;gap:2px;display:flex;position:relative}.Y4cvAW_fileRowWrap:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_fileRow{cursor:pointer;text-align:left;box-sizing:border-box;background:0 0;border:none;border-radius:7px;flex:1;align-items:center;gap:8px;min-width:0;min-height:28px;padding:0 2px 0 18px;font-family:inherit;display:flex}.Y4cvAW_fileName{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-secondary);flex:1;font-size:12.5px;overflow:hidden}.Y4cvAW_fileStatus{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:999px;flex:none;padding:0 6px;font-size:10.5px;line-height:16px}.Y4cvAW_st-processed{color:var(--dsw-alias-ok,#2f9e6e)}.Y4cvAW_st-processing,.Y4cvAW_st-preprocessed{color:var(--dsw-alias-warning,#c98a1b)}.Y4cvAW_st-pending{color:var(--dsw-alias-label-disabled)}.Y4cvAW_st-failed{color:var(--dsw-alias-danger,#e5484d)}.Y4cvAW_docDetail{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:10px;flex:none;margin:10px 0 2px;padding:8px 10px}.Y4cvAW_docDetailHead{align-items:center;gap:6px;display:flex}.Y4cvAW_docDetailName{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:12.5px;font-weight:600;overflow:hidden}.Y4cvAW_docDetailClose{cursor:pointer;width:20px;height:20px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;flex:none;place-items:center;display:grid}.Y4cvAW_docDetailClose:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_docDetailMeta{align-items:center;gap:8px;margin-top:6px;display:flex}.Y4cvAW_docDetailId{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-disabled);flex:1;font-size:10.5px;overflow:hidden}.Y4cvAW_docDetailError{color:var(--dsw-alias-danger,#e5484d);word-break:break-word;margin-top:6px;font-size:11px;line-height:1.5}.Y4cvAW_uploading{align-items:center;gap:7px;margin-top:8px;padding:0 4px;display:flex}.Y4cvAW_uploadingDot{background:var(--dsw-alias-accent,#0d9d97);border-radius:50%;flex:none;width:6px;height:6px;animation:1.1s ease-in-out infinite Y4cvAW_kbPulse}.Y4cvAW_uploadingText{min-width:0;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;flex:1;font-size:11.5px;overflow:hidden}@keyframes Y4cvAW_kbPulse{0%,to{opacity:1}50%{opacity:.35}}.Y4cvAW_empty{color:var(--dsw-alias-label-disabled);padding:14px 8px;font-size:12px}.Y4cvAW_uploadRow{border-top:1px solid var(--dsw-alias-divider);margin-top:10px;padding-top:10px}.Y4cvAW_uploadBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;width:100%;height:34px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:10px;font-family:inherit;font-size:13px}.Y4cvAW_uploadBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_chat{background:var(--dsw-alias-bg-layer-2);flex-direction:column;flex:1;min-width:0;display:flex;position:relative}.Y4cvAW_notice{text-align:center;max-width:86%;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border:1px solid var(--dsw-alias-divider);z-index:30;pointer-events:none;border-radius:10px;padding:8px 14px;font-size:12.5px;line-height:1.45;animation:.18s Y4cvAW_dshKbNoticeIn;position:absolute;bottom:98px;left:50%;transform:translate(-50%);box-shadow:0 4px 18px #00000029}@keyframes Y4cvAW_dshKbNoticeIn{0%{opacity:0;transform:translate(-50%,4px)}to{opacity:1;transform:translate(-50%)}}.Y4cvAW_hero{flex-direction:column;flex:1;justify-content:center;align-items:center;gap:6px;padding:0 28px;display:flex}.Y4cvAW_heroLogo{width:52px;height:52px;color:var(--dsw-alias-accent,#0d9d97);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:16px;place-items:center;margin-bottom:10px;display:grid}.Y4cvAW_heroTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:24px;font-weight:600}.Y4cvAW_heroSub{color:var(--dsw-alias-label-secondary);margin:0 0 20px;font-size:13px}.Y4cvAW_suggestions{grid-template-columns:1fr;gap:10px;width:min(620px,100%);display:grid}.Y4cvAW_suggestion{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-secondary);text-align:left;cursor:pointer;border-radius:12px;padding:12px 14px;font-family:inherit;font-size:12.5px;line-height:1.5;transition:border-color .15s,background .15s,transform .15s,box-shadow .15s;position:relative}.Y4cvAW_suggestion:hover{border-color:var(--dsw-alias-accent,#0d9d97);background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-3));color:var(--dsw-alias-label-primary);transform:translateY(-1px);box-shadow:0 2px 8px #00000014}.Y4cvAW_suggestion:focus-visible{outline:2px solid var(--dsw-alias-accent,#0d9d97);outline-offset:2px}.Y4cvAW_suggestion:after{content:\"\";border-right:1.5px solid var(--dsw-alias-label-disabled);border-bottom:1.5px solid var(--dsw-alias-label-disabled);width:6px;height:6px;transition:border-color .15s;position:absolute;bottom:8px;right:10px;transform:rotate(-45deg)}.Y4cvAW_suggestion:hover:after{border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_messagesWrap{flex-direction:column;flex:1;min-height:0;display:flex}.Y4cvAW_messagesHead{flex:none;justify-content:space-between;align-items:center;padding:10px 22px 0;display:flex}.Y4cvAW_messagesHeadTitle{letter-spacing:.6px;color:var(--dsw-alias-label-disabled);font-size:11px}.Y4cvAW_clearBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;height:24px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:7px;align-items:center;gap:4px;padding:0 8px;font-family:inherit;font-size:11.5px;display:inline-flex}.Y4cvAW_clearBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-danger,#e5484d);border-color:var(--dsw-alias-danger,#e5484d)}.Y4cvAW_messages{flex-direction:column;flex:1;gap:14px;min-height:0;padding:12px 9%;display:flex;overflow-y:auto}.Y4cvAW_message{max-width:78%}.Y4cvAW_message.Y4cvAW_user{align-self:flex-end}.Y4cvAW_message.Y4cvAW_ai{align-self:flex-start}.Y4cvAW_msgTime{color:var(--dsw-alias-label-disabled);user-select:none;margin-top:4px;font-size:10.5px;line-height:14px}.Y4cvAW_msgTimeUser{text-align:right}.Y4cvAW_bubble{white-space:pre-wrap;word-break:break-word;border-radius:14px;padding:10px 14px;font-size:13.5px;line-height:1.7}.Y4cvAW_message.Y4cvAW_user .Y4cvAW_bubble{color:#182026;background:#95ec69;border-top-right-radius:4px}.Y4cvAW_message.Y4cvAW_ai .Y4cvAW_bubble{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-primary);border-top-left-radius:4px}.Y4cvAW_markdownBubble{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-primary);word-break:break-word;border-radius:4px 14px 14px;padding:10px 14px;font-size:13.5px;line-height:1.7}.Y4cvAW_markdownBubble h1,.Y4cvAW_markdownBubble h2,.Y4cvAW_markdownBubble h3{color:var(--dsw-alias-label-primary);margin:10px 0 6px;font-size:15px;font-weight:600;line-height:1.4}.Y4cvAW_markdownBubble h1{font-size:17px}.Y4cvAW_markdownBubble p{margin:6px 0}.Y4cvAW_markdownBubble ul,.Y4cvAW_markdownBubble ol{margin:6px 0;padding-left:20px}.Y4cvAW_markdownBubble li{margin:3px 0}.Y4cvAW_markdownBubble code{background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1));border-radius:5px;padding:1px 5px;font-family:ui-monospace,monospace;font-size:12.5px}.Y4cvAW_markdownBubble pre{background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1));border-radius:10px;margin:8px 0;padding:10px 12px;overflow-x:auto}.Y4cvAW_markdownBubble a{color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_think{background:color-mix(in srgb, var(--dsw-alias-bg-base,#fff) 55%, transparent);border-radius:10px;flex-direction:column;margin:0 0 6px;display:flex;overflow:hidden}.Y4cvAW_thinkHead{box-sizing:border-box;cursor:default;width:100%;min-width:0;color:var(--dsw-alias-label-primary);text-align:start;background:0 0;border:none;align-items:center;gap:6px;padding:6px 10px;font-family:inherit;font-size:12.5px;line-height:18px;display:flex}button.Y4cvAW_thinkHead{cursor:pointer}.Y4cvAW_thinkHead:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_thinkChevron,.Y4cvAW_thinkIcon{color:var(--dsw-alias-label-secondary);flex:none;display:inline-flex}.Y4cvAW_thinkTitle{color:var(--dsw-alias-label-primary);flex:none;font-weight:500}.Y4cvAW_thinkStage{color:var(--dsw-alias-label-tertiary);flex:none;font-size:12px}.Y4cvAW_thinkElapsed{color:var(--dsw-alias-label-disabled);font-variant-numeric:tabular-nums;flex:none;font-size:11px}.Y4cvAW_thinkSummary{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:auto;font-size:12.5px;overflow:hidden}.Y4cvAW_thinkSpin{width:12px;height:12px;color:var(--dsw-alias-label-tertiary);border:2px solid;border-top-color:#0000;border-radius:50%;flex:none;animation:.8s linear infinite Y4cvAW_kb-spin}.Y4cvAW_thinkBody{color:var(--dsw-alias-label-tertiary);white-space:pre-wrap;word-break:break-word;max-height:240px;padding:2px 10px 8px 40px;font-size:12.5px;line-height:1.65;overflow-y:auto}.Y4cvAW_thinkLiveAnswer{white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary);margin-top:4px}.Y4cvAW_think[data-state=running] .Y4cvAW_thinkHead:after{content:\"\";inset-block:0;background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);pointer-events:none;width:220px;animation:2.6s ease-out infinite Y4cvAW_kb-think-sweep;position:absolute;left:0}.Y4cvAW_think[data-state=running] .Y4cvAW_thinkHead{position:relative;overflow:hidden}@keyframes Y4cvAW_kb-think-sweep{0%{left:-220px}90%,to{left:100%}}@media (prefers-reduced-motion:reduce){.Y4cvAW_think[data-state=running] .Y4cvAW_thinkHead:after{animation:none}}.Y4cvAW_composer{box-sizing:border-box;border:1px solid var(--dsw-alias-border-strong,#0f172a29);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));border-radius:16px;flex-direction:column;flex:none;align-items:stretch;gap:2px;margin:0 18px 16px;padding:10px 12px 8px;display:flex;position:relative;box-shadow:0 1px 2px #0f172a0a,0 6px 20px #0f172a12}.Y4cvAW_composer:focus-within{border-color:var(--dsw-alias-accent,#0d9d97);box-shadow:0 1px 2px #0d9d9714,0 6px 20px #0d9d971f}.Y4cvAW_chipsRow{flex-wrap:wrap;gap:6px;padding:2px 2px 4px;display:flex}.Y4cvAW_msgMentions{flex-wrap:wrap;justify-content:flex-end;gap:5px;margin-top:6px;display:flex}.Y4cvAW_chipReadOnly{cursor:default;opacity:.85;height:22px;padding:0 8px;font-size:11.5px}.Y4cvAW_chip{box-sizing:border-box;background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:8px;align-items:center;gap:5px;max-width:240px;height:26px;padding:0 3px 0 8px;display:inline-flex}.Y4cvAW_chipIcon{flex:none;place-items:center;display:grid}.Y4cvAW_chipFolder{color:var(--dsw-alias-interactive-bg-primary,#1266e3);background:#1266e317;border:1px solid #1266e347}.Y4cvAW_chipFolder .Y4cvAW_chipIcon{color:var(--dsw-alias-interactive-bg-primary,#1266e3)}.Y4cvAW_chipFolder .Y4cvAW_chipLabel{color:#1a56c4}.Y4cvAW_chipFolder .Y4cvAW_chipClose{color:#1266e38c}.Y4cvAW_chipFolder .Y4cvAW_chipClose:hover{color:#1266e3;background:#1266e31f}.Y4cvAW_chipFile{color:var(--dsw-alias-accent,#0d9d97);background:#0d9d9717;border:1px solid #0d9d974d}.Y4cvAW_chipFile .Y4cvAW_chipIcon{color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_chipFile .Y4cvAW_chipLabel{color:#0b7d78}.Y4cvAW_chipFile .Y4cvAW_chipClose{color:#0d9d978c}.Y4cvAW_chipFile .Y4cvAW_chipClose:hover{color:#0d9d97;background:#0d9d971f}.Y4cvAW_chipLabel{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-primary);font-size:12.5px;overflow:hidden}.Y4cvAW_chipClose{cursor:pointer;width:18px;height:18px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:5px;flex:none;place-items:center;display:grid}.Y4cvAW_chipClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_composerBar{align-items:center;gap:8px;padding:4px 2px 2px;display:flex}.Y4cvAW_modelWrap{display:inline-flex;position:relative}.Y4cvAW_modelMenu{z-index:30;border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);min-width:200px;max-height:340px;box-shadow:var(--dsw-elevation-prominent);border-radius:12px;flex-direction:column;padding:6px;display:flex;position:absolute;bottom:calc(100% + 8px);left:0;overflow-y:auto}.Y4cvAW_modelGroup{flex-direction:column;display:flex}.Y4cvAW_modelGroup+.Y4cvAW_modelGroup{border-top:1px dashed var(--dsw-alias-divider);margin-top:4px;padding-top:4px}.Y4cvAW_modelGroupTitle{letter-spacing:.02em;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;padding:4px 10px 2px;font-size:11px;font-weight:600;overflow:hidden}.Y4cvAW_modelStatus{color:var(--dsw-alias-label-secondary);padding:6px 10px;font-size:12px}.Y4cvAW_modelStatusError{color:#c2410c;align-items:center;gap:8px;padding:6px 10px;font-size:12px;display:flex}.Y4cvAW_modelRetry{cursor:pointer;color:var(--dsw-alias-interactive-bg-primary,#1266e3);background:0 0;border:none;border-radius:6px;flex:none;padding:2px 6px;font-family:inherit;font-size:12px}.Y4cvAW_modelRetry:hover{background:#1266e31a}.Y4cvAW_modelMenuItem{cursor:pointer;width:100%;min-height:30px;color:var(--dsw-alias-label-primary);text-align:left;white-space:nowrap;background:0 0;border:none;border-radius:7px;align-items:center;padding:0 10px;font-family:inherit;font-size:12.5px;display:flex}.Y4cvAW_modelMenuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modelMenuItemActive{color:var(--dsw-alias-accent,#0d9d97);font-weight:600}.Y4cvAW_modelBtn{cursor:pointer;height:26px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;align-items:center;gap:4px;padding:0 8px;font-family:inherit;font-size:12.5px;display:inline-flex}.Y4cvAW_modelBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_atBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;width:26px;height:26px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:50%;flex:none;place-items:center;padding:0;font-size:13px;font-weight:600;line-height:1;display:grid}.Y4cvAW_atBtn:hover{border-color:var(--dsw-alias-accent,#0d9d97);color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_barSpacer{flex:1}.Y4cvAW_send{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff;cursor:pointer;border:none;border-radius:50%;flex:none;place-items:center;width:32px;height:32px;display:grid}.Y4cvAW_send:disabled{opacity:.45;cursor:default}.Y4cvAW_mention{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);max-height:260px;box-shadow:var(--dsw-elevation-prominent);border-radius:12px;flex-direction:column;padding:6px;display:flex;position:absolute;bottom:calc(100% - 6px);left:18px;right:18px;overflow-y:auto}.Y4cvAW_mentionItem{cursor:pointer;text-align:left;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;width:100%;min-height:32px;padding:0 8px;font-family:inherit;display:flex}.Y4cvAW_mentionItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_mentionIcon{border-radius:5px;flex:none;place-items:center;width:18px;height:18px;display:grid}.Y4cvAW_mentionFolder{color:var(--dsw-alias-interactive-bg-primary,#1266e3);background:#1266e317}.Y4cvAW_mentionFile{color:var(--dsw-alias-accent,#0d9d97);background:#0d9d9717}.Y4cvAW_mentionLabel{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:12.5px;overflow:hidden}.Y4cvAW_input{resize:none;min-width:0;color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:0;outline:none;flex:1;max-height:140px;padding:6px 4px 2px;font-family:inherit;font-size:13.5px;line-height:1.5}.Y4cvAW_input::placeholder{color:#9ca3af}.Y4cvAW_sectionHead{justify-content:space-between;align-items:center;padding:2px 4px 6px;display:flex}.Y4cvAW_sectionTitle{letter-spacing:.6px;color:var(--dsw-alias-label-disabled);font-size:11px}.Y4cvAW_iconBtn{cursor:pointer;width:22px;height:22px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;place-items:center;display:grid}.Y4cvAW_iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_folderRow{border-radius:8px;align-items:center;gap:2px;display:flex;position:relative}.Y4cvAW_folderRow:hover,.Y4cvAW_folderRowOpen{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_folder{flex:1;min-width:0}.Y4cvAW_moreBtn{cursor:pointer;width:24px;height:24px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;flex:none;place-items:center;margin-right:2px;display:grid}.Y4cvAW_moreBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_emptyFiles{color:var(--dsw-alias-label-disabled);padding:6px 8px 6px 18px;font-size:11.5px}.Y4cvAW_folderMenu{z-index:10;border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);min-width:148px;box-shadow:var(--dsw-elevation-prominent);border-radius:12px;flex-direction:column;padding:6px;display:flex;position:absolute;right:0}.Y4cvAW_menuItem{cursor:pointer;width:100%;min-height:30px;color:var(--dsw-alias-label-primary);text-align:left;background:0 0;border:none;border-radius:7px;align-items:center;gap:8px;padding:0 8px;font-family:inherit;font-size:12.5px;display:flex}.Y4cvAW_menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_menuItemDanger{color:var(--dsw-alias-danger,#e5484d)}.Y4cvAW_menuItemDanger:hover{background:var(--dsw-alias-danger-bg,#e5484d1a)}.Y4cvAW_atIcon{width:16px;height:16px;color:var(--dsw-alias-accent,#0d9d97);flex:none;place-items:center;font-size:12px;font-weight:600;display:grid}.Y4cvAW_historyList{border-top:1px dashed var(--dsw-alias-divider);flex-direction:column;flex:1 1 0;gap:2px;min-height:0;margin-bottom:10px;padding-top:6px;display:flex;overflow-y:auto}.Y4cvAW_renameInput{border:1px solid var(--dsw-alias-accent,#0d9d97);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));min-width:0;min-height:26px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:6px;outline:none;flex:1;padding:0 8px;font-family:inherit;font-size:12.5px}.Y4cvAW_renameInput:focus{box-shadow:0 0 0 2px #0d9d9726}.Y4cvAW_historyItemWrap{border-radius:8px;align-items:center;gap:2px;display:flex;position:relative}.Y4cvAW_historyItemWrap:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_historyItem{cursor:pointer;min-width:0;min-height:30px;color:var(--dsw-alias-label-secondary);border-radius:8px;flex:1;align-items:center;gap:6px;padding:0 2px 0 8px;display:flex}.Y4cvAW_historyItemActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_historyTitle{white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;font-size:12.5px;overflow:hidden}.Y4cvAW_newChatBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;height:24px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:7px;align-items:center;gap:4px;padding:0 8px;font-family:inherit;font-size:11.5px;display:inline-flex}.Y4cvAW_newChatBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-accent,#0d9d97);border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modalOverlay{z-index:20;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.Y4cvAW_modal{background:var(--dsw-alias-bg-layer-2);width:360px;max-width:calc(100% - 48px);box-shadow:var(--dsw-elevation-prominent);border-radius:16px;padding:18px}.Y4cvAW_modalHead{justify-content:space-between;align-items:center;margin-bottom:10px;display:flex}.Y4cvAW_modalTitle{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600}.Y4cvAW_modalClose{cursor:pointer;width:26px;height:26px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:7px;place-items:center;display:grid}.Y4cvAW_modalClose:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modalBody{margin-bottom:16px}.Y4cvAW_modalHint{color:var(--dsw-alias-label-secondary);margin-bottom:8px;font-size:12px}.Y4cvAW_modalInput{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));width:100%;height:36px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:10px;outline:none;padding:0 10px;font-family:inherit;font-size:13.5px}.Y4cvAW_modalInput:focus{border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modalFoot{justify-content:flex-end;gap:10px;display:flex}.Y4cvAW_modalBtnSecondary,.Y4cvAW_modalBtnPrimary{cursor:pointer;border-radius:9px;height:34px;padding:0 14px;font-family:inherit;font-size:13px}.Y4cvAW_modalBtnSecondary{border:1px solid var(--dsw-alias-divider);color:var(--dsw-alias-label-secondary);background:0 0}.Y4cvAW_modalBtnSecondary:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modalBtnPrimary{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff;border:none}.Y4cvAW_modalBtnPrimary:hover{opacity:.9}.Y4cvAW_docViewerOverlay{z-index:20;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.Y4cvAW_docViewer{background:var(--dsw-alias-bg-layer-2);width:720px;max-width:calc(100% - 48px);height:min(560px,100% - 48px);box-shadow:var(--dsw-elevation-prominent);border-radius:16px;flex-direction:column;display:flex;overflow:hidden}.Y4cvAW_docViewerHead{border-bottom:1px solid var(--dsw-alias-divider);flex:none;justify-content:space-between;align-items:center;padding:14px 16px;display:flex}.Y4cvAW_docViewerTitle{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:14px;font-weight:600;overflow:hidden}.Y4cvAW_docViewerTag{color:var(--dsw-alias-brand-6,#7c5cff);border:1px solid var(--dsw-alias-divider);vertical-align:1px;border-radius:999px;margin-left:8px;padding:1px 8px;font-size:11px;font-style:normal;font-weight:500}.Y4cvAW_docViewerOpen{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-divider);cursor:pointer;border-radius:7px;flex:none;align-items:center;gap:5px;margin-right:10px;padding:5px 10px;font-size:12px;text-decoration:none;display:inline-flex}.Y4cvAW_docViewerOpen:hover{opacity:.88}.Y4cvAW_docViewerHint{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-divider);border-radius:8px;margin-bottom:12px;padding:8px 12px;font-size:12px;line-height:1.6}.Y4cvAW_docViewerClose{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:7px;place-items:center;display:grid}.Y4cvAW_docViewerClose:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_docViewerBody{flex:1;min-height:0;padding:16px;overflow-y:auto}.Y4cvAW_docViewerContent{white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary);background:0 0;margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12.5px;line-height:1.7}.Y4cvAW_winControls{align-items:center;gap:2px;display:flex}.Y4cvAW_winBtn{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;place-items:center;display:grid}.Y4cvAW_winBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_winClose:hover{color:#e81123;background:#e811231f}.Y4cvAW_panelMax{border-radius:0;width:100vw;max-width:none;height:100vh}.Y4cvAW_miniLayer{z-index:1000;pointer-events:none;position:fixed;inset:0}.Y4cvAW_miniPill{pointer-events:auto;border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent);cursor:pointer;color:var(--dsw-alias-label-primary);border-radius:999px;align-items:center;gap:8px;padding:10px 18px;font-family:inherit;font-size:13px;font-weight:600;display:flex;position:absolute;bottom:24px;right:24px}.Y4cvAW_miniPill:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_footRow{gap:6px;display:flex}.Y4cvAW_footBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;min-width:0;height:34px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:10px;flex:1;justify-content:center;align-items:center;gap:5px;padding:0 4px;font-family:inherit;font-size:12px;display:flex}.Y4cvAW_footBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_modalWide{flex-direction:column;width:620px;max-height:calc(100% - 48px);display:flex}.Y4cvAW_modalSub{color:var(--dsw-alias-label-secondary);margin-top:2px;font-size:12px}.Y4cvAW_modalScroll{min-height:0;overflow-y:auto}.Y4cvAW_idxCount{color:var(--dsw-alias-label-secondary);margin:4px 0 10px;font-size:13px}.Y4cvAW_idxCount b{color:var(--dsw-alias-label-primary);font-size:22px}.Y4cvAW_idxBar{border-radius:999px;height:14px;display:flex;overflow:hidden}.Y4cvAW_idxBar i{height:100%}.Y4cvAW_idxLegend{flex-wrap:wrap;gap:10px;margin:10px 0 2px;display:flex}.Y4cvAW_idxLegend span{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;font-size:11.5px;display:flex}.Y4cvAW_idxLegend i{border-radius:50%;width:8px;height:8px}.Y4cvAW_idxCard{background:var(--dsw-alias-interactive-bg-hover,#7f7f7f14);border-radius:14px;margin:14px 0;padding:4px 16px}.Y4cvAW_idxRow{border-bottom:1px solid var(--dsw-alias-divider);color:var(--dsw-alias-label-primary);align-items:center;gap:10px;padding:11px 2px;font-size:13px;display:flex}.Y4cvAW_idxVal{color:var(--dsw-alias-label-secondary);margin-left:auto}.Y4cvAW_idxPill{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary);border-radius:999px;align-items:center;gap:6px;margin-left:auto;padding:2px 10px;font-size:11.5px;display:flex}.Y4cvAW_dotGreen{background:#22c55e;border-radius:50%;width:7px;height:7px}.Y4cvAW_dotAmber{background:#f59e0b;border-radius:50%;width:7px;height:7px}.Y4cvAW_idxLastRebuild{color:var(--dsw-alias-label-secondary);margin:-6px 0 8px;font-size:12px}.Y4cvAW_setRow{border-bottom:1px solid var(--dsw-alias-divider);color:var(--dsw-alias-label-primary);justify-content:space-between;align-items:center;gap:16px;padding:11px 2px;font-size:13px;display:flex}.Y4cvAW_setRow:last-child{border-bottom:none}.Y4cvAW_setRowDesc{color:var(--dsw-alias-label-secondary);margin-top:2px;font-size:12px}.Y4cvAW_sw{vertical-align:middle;flex:none;width:44px;height:24px;display:inline-block;position:relative}.Y4cvAW_sw input{opacity:0;cursor:pointer;margin:0;position:absolute;inset:0}.Y4cvAW_sw i{background:#7f7f7f59;border-radius:999px;transition:background .18s;position:absolute;inset:0}.Y4cvAW_sw i:after{content:\"\";background:#fff;border-radius:50%;width:18px;height:18px;transition:left .18s,background .18s;position:absolute;top:3px;left:3px;box-shadow:0 1px 2px #0000004d}.Y4cvAW_sw input:checked+i{background:var(--dsw-alias-interactive-bg-primary,#1266e3)}.Y4cvAW_sw input:checked+i:after{left:23px}.Y4cvAW_btnDanger{color:#fff;cursor:pointer;background:#dc2626;border:none;border-radius:9px;flex:none;height:32px;padding:0 16px;font-family:inherit;font-size:12.5px;font-weight:500}.Y4cvAW_btnDanger:hover{background:#b91c1c}.Y4cvAW_btnDanger:disabled{opacity:.55;cursor:default}.Y4cvAW_logsList{border:1px solid var(--dsw-alias-divider);border-radius:12px;min-height:120px;max-height:52vh;padding:4px 12px;overflow-y:auto}.Y4cvAW_logsEmpty{text-align:center;color:var(--dsw-alias-label-secondary);padding:28px 0;font-size:13px}.Y4cvAW_logRow{border-bottom:1px dashed var(--dsw-alias-divider);align-items:baseline;gap:10px;padding:8px 0;font-size:12.5px;display:flex}.Y4cvAW_logRow:last-child{border-bottom:none}.Y4cvAW_logTime{width:88px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;flex:none}.Y4cvAW_logAction{min-width:84px;color:var(--dsw-alias-label-primary);flex:none;font-weight:600}.Y4cvAW_logDetail{color:var(--dsw-alias-label-secondary);word-break:break-all}.Y4cvAW_logsFoot{justify-content:flex-end;align-items:center;gap:8px;margin-top:12px;display:flex}.Y4cvAW_logsCount{color:var(--dsw-alias-label-secondary);margin-right:auto;font-size:12px}.Y4cvAW_logBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;height:30px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:9px;align-items:center;gap:5px;padding:0 12px;font-family:inherit;font-size:12px;display:inline-flex}.Y4cvAW_logBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_trashRestoreAllBtn{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-divider);margin-left:auto;margin-right:8px}.Y4cvAW_trashRestoreAllBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_trashPurgeAllBtn{color:#e5484d;border-color:#e5484d59;margin-right:8px}.Y4cvAW_trashPurgeAllBtn:hover{background:#e5484d14;color:#e5484d}.Y4cvAW_footBtnBusy{color:#f59e0b;background:#f59e0b14;border-color:#f59e0b73}.Y4cvAW_footSpin{border:2px solid;border-top-color:#0000;border-radius:50%;flex:none;width:12px;height:12px;animation:.8s linear infinite Y4cvAW_kb-spin}@keyframes Y4cvAW_kb-spin{to{transform:rotate(360deg)}}.Y4cvAW_idxFilesHead{align-items:center;gap:10px;margin:16px 0 4px;display:flex}.Y4cvAW_idxFilesTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600}.Y4cvAW_idxFilesSub{color:var(--dsw-alias-label-secondary);font-size:12px}.Y4cvAW_idxFileRow{border-bottom:1px dashed var(--dsw-alias-divider);align-items:center;gap:10px;padding:8px 2px;display:flex}.Y4cvAW_idxFileRow:last-of-type{border-bottom:none}.Y4cvAW_idxFileExt{text-align:center;background:var(--dsw-alias-interactive-bg-hover,#7f7f7f1a);letter-spacing:.02em;width:44px;color:var(--dsw-alias-label-secondary);border-radius:6px;flex:none;padding:3px 0;font-size:10px;font-weight:700}.Y4cvAW_idxFileInfo{flex:1;min-width:0}.Y4cvAW_idxFileName{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;font-size:12.5px;overflow:hidden}.Y4cvAW_idxFileMeta{color:var(--dsw-alias-label-secondary);margin-top:1px;font-size:11.5px}.Y4cvAW_reidxBtn{border:1px solid var(--dsw-alias-divider);cursor:pointer;height:26px;color:var(--dsw-alias-label-primary);background:0 0;border-radius:8px;flex:none;align-items:center;gap:5px;padding:0 12px;font-family:inherit;font-size:11.5px;display:inline-flex}.Y4cvAW_reidxBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_reidxBtn:disabled{opacity:.6;cursor:default;color:#f59e0b;border-color:#f59e0b73}.Y4cvAW_idxDone{color:var(--dsw-alias-ok,#2f9e6e);flex:none;font-size:11.5px}.Y4cvAW_idxParsing{color:var(--dsw-alias-warning,#c98a1b);flex:none;align-items:center;gap:5px;font-size:11.5px;display:inline-flex}.Y4cvAW_idxFailed{color:var(--dsw-alias-danger,#e5484d);flex:none;font-size:11.5px}.Y4cvAW_sidebarCollapsed{align-items:center;width:52px;padding:14px 6px}.Y4cvAW_sidebarCollapsed .Y4cvAW_sidebarHead{flex-direction:column;justify-content:flex-start;align-items:center;gap:8px;width:100%;margin-bottom:0}.Y4cvAW_sidebarCollapsed .Y4cvAW_winControls{flex-direction:column;align-items:center;gap:4px}.Y4cvAW_railFoot{border-top:1px solid var(--dsw-alias-divider);flex-direction:column;align-items:center;gap:4px;width:100%;margin-top:auto;padding-top:10px;display:flex}.Y4cvAW_railFootBtn{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;flex:none;place-items:center;display:grid}.Y4cvAW_railFootBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_modelsModal{width:720px}.Y4cvAW_modelsDeviceRow{align-items:center;gap:10px;margin:2px 0 10px;display:flex}.Y4cvAW_modelsDeviceLabel{color:var(--dsw-alias-label-secondary);font-size:12px}.Y4cvAW_modelsDeviceChip{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));height:24px;color:var(--dsw-alias-label-primary);border-radius:999px;align-items:center;gap:6px;padding:0 10px;font-size:12px;display:inline-flex}.Y4cvAW_modelsDeviceTorch{color:var(--dsw-alias-label-secondary);font-size:11px;font-style:normal}.Y4cvAW_modelsCat{border-bottom:1px solid var(--dsw-alias-divider);padding:12px 2px}.Y4cvAW_modelsCatHead{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.Y4cvAW_modelsCatTitle{color:var(--dsw-alias-label-primary);font-size:13.5px;font-weight:600}.Y4cvAW_modelsCatHint{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:11px}.Y4cvAW_modelsCatDesc{color:var(--dsw-alias-label-secondary);margin:3px 0 8px;font-size:12px}.Y4cvAW_modelsCatNote{color:#dc2626;background:#dc262614;border-radius:8px;margin-top:8px;padding:8px 10px;font-size:12px}.Y4cvAW_modelsSelect{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));width:100%;height:34px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:9px;outline:none;padding:0 10px;font-family:inherit;font-size:13px}.Y4cvAW_modelsSelect:focus{border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modelsEntry{justify-content:space-between;align-items:center;gap:14px;padding:8px 2px;display:flex}.Y4cvAW_modelsEntryName{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;font-size:13px;display:flex}.Y4cvAW_modelsCurrentTag{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff;border-radius:999px;padding:1px 7px;font-size:10.5px}.Y4cvAW_modelsReadyChip{color:#0d9d97;background:#14b8a61f;border-radius:999px;padding:3px 9px;font-size:11.5px}.Y4cvAW_modelsBusyChip{color:#b45309;background:#f59e0b24;border-radius:999px;padding:3px 9px;font-size:11.5px}.Y4cvAW_modelsDlBtn,.Y4cvAW_modelsSetBtn,.Y4cvAW_modelsSaveBtn,.Y4cvAW_modelsRestartBtn{cursor:pointer;border:none;border-radius:8px;align-items:center;gap:5px;height:30px;padding:0 12px;font-family:inherit;font-size:12px;display:inline-flex}.Y4cvAW_modelsDlBtn{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff}.Y4cvAW_modelsDlBtn:hover{opacity:.9}.Y4cvAW_modelsSetBtn{border:1px solid var(--dsw-alias-divider);color:var(--dsw-alias-label-primary);background:0 0}.Y4cvAW_modelsSetBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modelsProgressBar{background:var(--dsw-alias-interactive-bg-primary,#1266e3);opacity:.75;border-radius:8px;width:0;transition:width .3s;position:absolute;inset:0 auto 0 0}.Y4cvAW_modelsProgressText{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;align-items:center;padding:0 8px;font-size:10.5px;display:flex;position:absolute;inset:0;overflow:hidden}.Y4cvAW_modelsAddToggle{border:1px dashed var(--dsw-alias-divider);height:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:9px;align-items:center;gap:6px;padding:0 12px;font-family:inherit;font-size:12.5px;display:inline-flex}.Y4cvAW_modelsAddToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_modelsFieldLabel{color:var(--dsw-alias-label-secondary);font-size:11.5px}.Y4cvAW_modelsInput{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);height:32px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:8px;outline:none;padding:0 9px;font-family:inherit;font-size:12.5px}.Y4cvAW_modelsInput:focus{border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modelsSaveBtn{background:var(--dsw-alias-interactive-bg-primary,#1266e3);color:#fff}.Y4cvAW_modelsSaveBtn:hover:not(:disabled){opacity:.9}.Y4cvAW_modelsFoot{justify-content:flex-end;align-items:center;gap:10px;margin-top:12px;display:flex}.Y4cvAW_modelsRestartBtn{color:#fff;background:#dc2626}.Y4cvAW_modelsRestartBtn:hover:not(:disabled){opacity:.9}.Y4cvAW_modelsRestartHint{color:#dc2626;margin-right:auto;font-size:11.5px}.Y4cvAW_modelsRuntimeRow{border-top:1px dashed var(--dsw-alias-divider);justify-content:space-between;align-items:center;gap:14px;margin-top:4px;padding:8px 2px;display:flex}.Y4cvAW_modelsModal{border-radius:18px;width:780px;padding:20px 22px}.Y4cvAW_modelsModal .Y4cvAW_modalHead{margin-bottom:14px}.Y4cvAW_modelsModal .Y4cvAW_modalTitle{letter-spacing:.1px;align-items:center;gap:9px;font-size:17px;display:flex}.Y4cvAW_modelsHeadIcon{color:#0d9d97;background:#0d9d9721;border-radius:9px;flex:none;place-items:center;width:30px;height:30px;display:grid}.Y4cvAW_modelsDeviceRow{border:1px solid var(--dsw-alias-divider);background:linear-gradient(90deg,#0d9d9717,#0000 65%);border-radius:13px;align-items:center;gap:10px;margin:2px 0 14px;padding:10px 14px;display:flex}.Y4cvAW_modelsDeviceLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:550}.Y4cvAW_modelsDeviceChip{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));height:26px;color:var(--dsw-alias-label-primary);border-radius:999px;align-items:center;gap:7px;padding:0 12px;font-size:12px;font-weight:600;display:inline-flex}.Y4cvAW_modelsDeviceDot{background:#10b981;border-radius:50%;width:8px;height:8px;box-shadow:0 0 0 3px #10b9812e}.Y4cvAW_modelsDeviceTorch{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover,#7f7f7f1f);border-radius:999px;padding:2px 8px;font-size:11px;font-style:normal;font-weight:400}.Y4cvAW_modelsCounts{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;margin-left:auto;font-size:11px;display:inline-flex}.Y4cvAW_modelsCounts b{color:#0d9d97;font-weight:650}.Y4cvAW_modelsGrid{grid-template-columns:1fr 1fr;gap:12px;display:grid}@media (width<=640px){.Y4cvAW_modelsGrid{grid-template-columns:1fr}}.Y4cvAW_modelsCat{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));border-radius:14px;margin-bottom:12px;padding:14px 16px 12px;box-shadow:0 1px 2px #0000000a}.Y4cvAW_modelsGrid .Y4cvAW_modelsCat{margin-bottom:0}.Y4cvAW_modelsCatHead{justify-content:space-between;align-items:center;gap:12px;margin-bottom:2px;display:flex}.Y4cvAW_modelsCatTitle{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;font-size:14px;font-weight:650;display:flex}.Y4cvAW_modelsCatIcon{width:26px;height:26px;color:var(--cat,#0d9d97);background:#0d9d971f;background:color-mix(in srgb, var(--cat,#0d9d97) 13%, transparent);border-radius:8px;flex:none;place-items:center;display:grid}.Y4cvAW_modelsCatHint{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover,#7f7f7f1a);white-space:nowrap;border-radius:999px;padding:2px 9px;font-size:11px}.Y4cvAW_modelsCatDesc{color:var(--dsw-alias-label-secondary);margin:4px 0 8px;padding-left:34px;font-size:12px}.Y4cvAW_modelsCatNote{color:#dc2626;background:#dc262612;border:1px solid #dc262640;border-radius:10px;margin-top:8px;padding:9px 12px;font-size:12px}.Y4cvAW_modelsSelect{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);width:100%;height:36px;color:var(--dsw-alias-label-primary);box-sizing:border-box;cursor:pointer;border-radius:10px;outline:none;padding:0 11px;font-family:inherit;font-size:13px;transition:border-color .15s,box-shadow .15s}.Y4cvAW_modelsSelect:focus{border-color:var(--dsw-alias-accent,#0d9d97);box-shadow:0 0 0 3px #0d9d9724}.Y4cvAW_modelsEntry{border-radius:10px;justify-content:space-between;align-items:center;gap:14px;margin:0 -6px;padding:8px 10px;transition:background .15s;display:flex}.Y4cvAW_modelsEntry:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_modelsEntryInfo{flex:1;min-width:0}.Y4cvAW_modelsEntryName{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;font-size:13px;font-weight:550;display:flex}.Y4cvAW_modelsCurrentTag{background:linear-gradient(135deg, var(--dsw-alias-interactive-bg-primary,#1266e3), #0d9d97);color:#fff;letter-spacing:.2px;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:600}.Y4cvAW_modelsEntryMeta{color:var(--dsw-alias-label-secondary);margin-top:2px;font-size:11.5px}.Y4cvAW_modelsEntryNote{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));margin-top:2px;font-size:11px}.Y4cvAW_modelsEntryError{color:#dc2626;word-break:break-all;margin-top:3px;font-size:11.5px}.Y4cvAW_modelsEntryActions{flex:none;align-items:center;gap:8px;display:flex}.Y4cvAW_modelsReadyChip,.Y4cvAW_modelsBusyChip{border-radius:999px;align-items:center;gap:5px;padding:3px 10px;font-size:11.5px;font-weight:550;display:inline-flex}.Y4cvAW_modelsReadyChip:before,.Y4cvAW_modelsBusyChip:before{content:\"\";border-radius:50%;width:6px;height:6px}.Y4cvAW_modelsReadyChip{color:#059669;background:#10b9811f}.Y4cvAW_modelsReadyChip:before{background:#10b981;box-shadow:0 0 0 2px #10b9812e}.Y4cvAW_modelsBusyChip{color:#b45309;background:#f59e0b24}.Y4cvAW_modelsBusyChip:before{background:#f59e0b;animation:1.1s ease-in-out infinite Y4cvAW_modelsPulse}@keyframes Y4cvAW_modelsPulse{0%,to{opacity:1}50%{opacity:.35}}.Y4cvAW_modelsDlBtn,.Y4cvAW_modelsSetBtn,.Y4cvAW_modelsSaveBtn,.Y4cvAW_modelsRestartBtn{cursor:pointer;border:none;border-radius:9px;align-items:center;gap:5px;height:30px;padding:0 13px;font-family:inherit;font-size:12px;font-weight:550;transition:filter .15s,background .15s,box-shadow .15s,opacity .15s;display:inline-flex}.Y4cvAW_modelsDlBtn{background:linear-gradient(135deg, var(--dsw-alias-interactive-bg-primary,#1266e3), #0d9d97);color:#fff;box-shadow:0 1px 3px #0d9d974d}.Y4cvAW_modelsDlBtn:hover{filter:brightness(1.07);box-shadow:0 2px 6px #0d9d9759}.Y4cvAW_modelsSetBtn{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.Y4cvAW_modelsSetBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-divider-strong,var(--dsw-alias-divider))}.Y4cvAW_modelsSetBtn:disabled{opacity:.45;cursor:default}.Y4cvAW_modelsProgress{background:#7f7f7f26;border-radius:9px;height:18px;margin-top:7px;position:relative;overflow:hidden}.Y4cvAW_modelsProgressBar{background:linear-gradient(90deg, var(--dsw-alias-interactive-bg-primary,#1266e3), #0d9d97);opacity:.85;background-image:linear-gradient(45deg,#ffffff2e 25%,#0000 25% 50%,#ffffff2e 50% 75%,#0000 75%);background-size:22px 22px;border-radius:9px;width:0;transition:width .3s;animation:.8s linear infinite Y4cvAW_modelsStripes;position:absolute;inset:0 auto 0 0}@keyframes Y4cvAW_modelsStripes{0%{background-position:0 0}to{background-position:22px 0}}.Y4cvAW_modelsProgressText{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;align-items:center;padding:0 9px;font-size:10.5px;font-weight:550;display:flex;position:absolute;inset:0;overflow:hidden}.Y4cvAW_modelsRuntimeRow{background:#d9770612;border:1px solid #d9770652;border-radius:11px;justify-content:space-between;align-items:center;gap:14px;margin:8px -6px 0;padding:10px 12px;display:flex}.Y4cvAW_modelsRuntimeOk{background:#10b98112;border-color:#10b9814d}.Y4cvAW_modelsAddBlock{padding:2px}.Y4cvAW_modelsAddToggle{border:1px dashed var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));height:34px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:10px;align-items:center;gap:6px;padding:0 14px;font-family:inherit;font-size:12.5px;font-weight:550;transition:color .15s,background .15s,border-color .15s;display:inline-flex}.Y4cvAW_modelsAddToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_modelsForm{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));border-radius:14px;margin-top:10px;padding:14px}.Y4cvAW_modelsFormGrid{grid-template-columns:1fr 1fr;gap:11px 13px;display:grid}.Y4cvAW_modelsField{flex-direction:column;gap:5px;display:flex}.Y4cvAW_modelsFieldLabel{color:var(--dsw-alias-label-secondary);font-size:11.5px;font-weight:550}.Y4cvAW_modelsInput{border:1px solid var(--dsw-alias-divider);background:var(--dsw-alias-bg-layer-2);height:34px;color:var(--dsw-alias-label-primary);box-sizing:border-box;border-radius:9px;outline:none;padding:0 10px;font-family:inherit;font-size:12.5px;transition:border-color .15s,box-shadow .15s}.Y4cvAW_modelsInput:focus{border-color:var(--dsw-alias-accent,#0d9d97);box-shadow:0 0 0 3px #0d9d9724}.Y4cvAW_modelsFormFoot{justify-content:space-between;align-items:center;gap:12px;margin-top:13px;display:flex}.Y4cvAW_modelsAddDesc{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:11px}.Y4cvAW_modelsSaveBtn{background:linear-gradient(135deg, var(--dsw-alias-interactive-bg-primary,#1266e3), #0d9d97);color:#fff;box-shadow:0 1px 3px #0d9d974d}.Y4cvAW_modelsSaveBtn:hover:not(:disabled){filter:brightness(1.07)}.Y4cvAW_modelsSaveBtn:disabled{opacity:.5;cursor:default}.Y4cvAW_modelsFoot{border-top:1px solid var(--dsw-alias-divider);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 90%, transparent);backdrop-filter:blur(8px);border-radius:0 0 18px 18px;justify-content:flex-end;align-items:center;gap:10px;margin:16px -22px -20px;padding:13px 22px;display:flex;position:sticky;bottom:-20px}.Y4cvAW_modelsRestartBtn{color:#fff;background:linear-gradient(135deg,#dc2626,#b91c1c);box-shadow:0 1px 3px #dc26264d}.Y4cvAW_modelsRestartBtn:hover:not(:disabled){filter:brightness(1.08)}.Y4cvAW_modelsRestartBtn:disabled{opacity:.5;cursor:default}.Y4cvAW_modelsRestartHint{color:#dc2626;align-items:center;gap:6px;margin-right:auto;font-size:11.5px;display:inline-flex}.Y4cvAW_chatRow{flex-direction:row}.Y4cvAW_chatLeft{position:relative;flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}.Y4cvAW_artRail{box-sizing:border-box;flex:none;display:flex;flex-direction:column;width:268px;border-left:1px solid var(--dsw-alias-divider-strong,var(--dsw-alias-divider));background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2));overflow:hidden;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}.Y4cvAW_artRail.Y4cvAW_artRailCollapsed{width:40px}.Y4cvAW_artRailRail{flex:1;width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0;cursor:pointer;background:0 0;border:none;font-family:inherit;color:var(--dsw-alias-label-secondary)}.Y4cvAW_artRailRail:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_artRailVert{writing-mode:vertical-rl;font-size:11.5px;line-height:16px;letter-spacing:2px;white-space:nowrap}.Y4cvAW_artRailHead{flex:none;display:flex;align-items:center;gap:6px;min-height:46px;padding:10px 8px 6px 12px}.Y4cvAW_artRailTitle{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:12.5px;font-weight:600;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.Y4cvAW_artRailCount{flex:none;box-sizing:border-box;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px;text-align:center}.Y4cvAW_artRailToggle{flex:none;box-sizing:border-box;cursor:pointer;width:24px;height:24px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:7px;padding:0;font-family:inherit}.Y4cvAW_artRailToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_artRailBody{flex:1;min-height:0;overflow-y:auto;padding:0 8px 14px}.Y4cvAW_artRailGroup{margin-bottom:12px}.Y4cvAW_artRailGroupHead{display:flex;align-items:center;gap:6px;padding:4px 6px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;overflow:hidden}.Y4cvAW_artRailGroupName{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.Y4cvAW_artRailGroupCount{flex:none;opacity:.7}.Y4cvAW_artRailFile{display:flex;align-items:center;gap:4px;border-radius:8px;padding:1px 2px 1px 6px}.Y4cvAW_artRailFile:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_artRailFileMain{flex:1;min-width:0;display:flex;align-items:center;gap:6px;cursor:pointer;background:0 0;border:none;padding:5px 0;font-family:inherit;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary);text-align:left}.Y4cvAW_artRailExt{flex:none;box-sizing:border-box;padding:0 4px;border-radius:5px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px;text-transform:uppercase}.Y4cvAW_artRailName{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.Y4cvAW_artRailAt{flex:none;box-sizing:border-box;cursor:pointer;height:22px;padding:0 7px;border-radius:7px;border:1px solid var(--dsw-alias-border-strong,var(--dsw-alias-divider));background:0 0;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:11px;line-height:20px;white-space:nowrap}.Y4cvAW_artRailAt:hover{border-color:var(--dsw-alias-accent,#0d9d97);color:var(--dsw-alias-accent,#0d9d97)}.Y4cvAW_artRailEmpty{padding:18px 10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;text-align:center;opacity:.8}.Y4cvAW_sectionChev{cursor:pointer;display:inline-grid;place-items:center;width:18px;height:18px;margin-right:2px;border:none;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);flex:none;padding:0}.Y4cvAW_sectionChev:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_sectionCount{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-interactive-bg-hover));border-radius:999px;flex:none;padding:0 6px;font-size:10.5px;line-height:16px}.Y4cvAW_listHidden{display:none!important}.Y4cvAW_menuNote{display:block;padding:6px 10px;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}.Y4cvAW_memberList{display:flex;flex-direction:column;gap:2px;max-height:180px;overflow-y:auto;margin:4px 0 10px;border:1px solid var(--dsw-alias-divider);border-radius:9px;padding:5px}.Y4cvAW_trashList{display:flex;flex-direction:column;gap:2px;max-height:min(52vh,420px);overflow-y:auto;overscroll-behavior:contain;border:1px solid var(--dsw-alias-divider);border-radius:9px;padding:5px}.Y4cvAW_memberItem{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--dsw-alias-label-primary);padding:4px 6px;border-radius:6px;cursor:pointer}.Y4cvAW_memberItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_artRailMore{flex:none;box-sizing:border-box;cursor:pointer;width:22px;height:22px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;padding:0;font-family:inherit}.Y4cvAW_artRailMore:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.Y4cvAW_artMenu{z-index:60}.Y4cvAW_st-stored{color:var(--dsw-alias-label-secondary)}.Y4cvAW_fileRetryBtn{display:inline-flex;align-items:center;flex:0 0 auto;margin-left:6px;padding:1px 6px;border-radius:4px;border:1px solid currentColor;background:transparent;color:var(--dsw-alias-label-error,#c62828);font-family:inherit;font-size:11px;line-height:16px;cursor:pointer}.Y4cvAW_fileRetryBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.Y4cvAW_fileRetryBtn:disabled{opacity:.55;cursor:default}/* kbModelsLay86: 统一全宽卡片 + 12px 节奏 */.Y4cvAW_modalScroll{flex-direction:column;display:flex;gap:12px}.Y4cvAW_modalScroll>.Y4cvAW_modelsGrid,.Y4cvAW_modalScroll>.Y4cvAW_modelsCat,.Y4cvAW_modalScroll>.Y4cvAW_modelsAddBlock{margin-bottom:0}.Y4cvAW_modelsGrid .Y4cvAW_modelsCat{grid-column:1/-1}.Y4cvAW_modelsSelect{max-width:460px}.Y4cvAW_modelsCat{transition:border-color .15s,box-shadow .15s}.Y4cvAW_modelsCat:hover{border-color:var(--dsw-alias-divider-strong,var(--dsw-alias-divider))}";
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
			"memberList": "Y4cvAW_memberList", "trashList": "Y4cvAW_trashList",
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
			"artMenu": "Y4cvAW_artMenu",
			"artRailMore": "Y4cvAW_artRailMore",
			"st-stored": "Y4cvAW_st-stored",
	"fileRetryBtn": "Y4cvAW_fileRetryBtn",
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
			"trashRestoreAllBtn": "Y4cvAW_trashRestoreAllBtn", /* kbFeat86-trashall */
			"trashPurgeAllBtn": "Y4cvAW_trashPurgeAllBtn", /* kbFeat86-trashall */
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
		/* kbSuggest-20261003 —— 快捷标签文案（用户给定，逐字）：*/
		const SUGGESTIONS = [
			"帮我盘点最近一星期新增的内容，按类型和重要性整理一份清单。",
			"从我的个人知识库中寻找资料，然后写一篇关于我的履历介绍",
			"对我的个人知识库进行分析，帮我理清他们都是关于什么主题的",
			"介绍个人知识库上有关创业、科技和个人提升的书籍的主要内容和亮点"
		];
		/** Composer options come exclusively from the authenticated model catalogue. */
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
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutlineRegular, { size: 14 })
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
							children: open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: KnowledgeBaseRoot_module_css_default.thinkIcon,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutlineRegular, { size: 14 })
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

	/** KT-14/T-04b：服务端 /conversations 是唯一真源；以下是**只读缓存/迁移**专用键。
	*  旧真源键（上面三个）自本版起只允许 readLegacyLocalState() 读、migrateLegacyKeys()
	*  一次性迁移；任何其它路径写旧键都会被 kbSetItem() 写保护拒绝。 */
	const CONV_CACHE_KEY = "dsh.kb." + MU_NS + "conversations.cache.v1";
	const FOLDERS_CACHE_KEY = "dsh.kb." + MU_NS + "folders.cache.v1";
	const MIGRATED_KEY = "dsh.kb." + MU_NS + "migrated.v1";
	const ACTIVE_CONV_KEY = "dsh.kb." + MU_NS + "activeconv.v1";
	const LEGACY_TRUTH_KEYS = [HISTORY_KEY, LEGACY_HISTORY_KEY, CUSTOM_FOLDERS_KEY];
	/** 会话层运行态：serverMode=服务端为真源；offline=只读离线；onOffline 由组件注入。 */
	const convRuntime = {
	serverMode: false,
	offline: true,
	activeId: "",
	onOffline: null
	};
	/** 旧键写保护：命中旧真源键一律拒绝写入（返回 false），开发期可用
	*  window.__KB_LEGACY_WRITE_STRICT__ = true 让其直接抛错。 */
	function kbSetItem(op, key, value) {
	if (LEGACY_TRUTH_KEYS.indexOf(key) !== -1) {
	if (window.__KB_LEGACY_WRITE_STRICT__) throw new Error("[kb] 旧键已冻结，拒绝写入 " + key + "（" + op + "）");
	return false;
	}
	try {
	window.localStorage.setItem(key, value);
	return true;
	} catch {
	return false;
	}
	}
	/** 迁移标记（服务端版本号/时间/续传台账）。 */
	function loadMigrationMark() {
	try {
	const raw = window.localStorage.getItem(MIGRATED_KEY);
	const parsed = raw ? JSON.parse(raw) : null;
	return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
	return null;
	}
	}
	/** 唯一允许读旧键的入口：纯读，绝不写回。 */
	function readLegacyLocalState() {
	const out = { sessions: [], history: [], folders: [] };
	try {
	const raw = window.localStorage.getItem(HISTORY_KEY);
	const parsed = raw ? JSON.parse(raw) : null;
	if (Array.isArray(parsed)) out.sessions = parsed;
	} catch {}
	try {
	const raw = window.localStorage.getItem(LEGACY_HISTORY_KEY);
	const parsed = raw ? JSON.parse(raw) : null;
	if (Array.isArray(parsed)) out.history = parsed;
	} catch {}
	try {
	const raw = window.localStorage.getItem(CUSTOM_FOLDERS_KEY);
	const parsed = raw ? JSON.parse(raw) : null;
	if (Array.isArray(parsed)) out.folders = parsed.filter((x) => typeof x === "string");
	} catch {}
	return out;
	}
	/** 进入只读离线态：convRuntime.offline=true 后 saveSessions() 不再写缓存。 */
	function kbSignalOffline(reason) {
	convRuntime.offline = true;
	if (typeof convRuntime.onOffline === "function") convRuntime.onOffline(reason);
	}
		/** Pinned mirror folders rendered at the top of the personal KB tree. */
		const PIN_DSH = "DSH产物";
		const PIN_KB = "知识库产物";
		const PIN_ORDER = [PIN_DSH, PIN_KB];
		/**
		 * 「同步文件夹」：桌面客户端同步进来的目录，排在个人库最前。
		 * 刻意**不放进 PIN_ORDER** —— PIN_ORDER 经 isPinnedPrefix() 喂给
		 * isPersonalFolder()，进去就会被当成只读镜像排除出个人库树。
		 */
		const PIN_SYNC = "同步文件夹";
		const TOP_ORDER = [PIN_SYNC, ...PIN_ORDER];
		/** True when a folder path lives inside one of the pinned mirror subtrees. */
		function isPinnedPrefix(name) {
			return PIN_ORDER.some((p) => name === p || name.startsWith(`${p}/`));
		}
		/** 共享知识库命名空间：共享文档在宿主实例里的 display_path 前缀。个人
		 *  知识库只放本人上传/生成的文件，共享内容一律在「共享知识库」分区里按
		 *  成员权限呈现，绝不能在这里长出一个「共享」文件夹。 */
		const SHARED_NS = "共享";
		/** True when a folder path belongs to the personal tree at all. */
		function isPersonalFolder(name) {
			return !isPinnedPrefix(name) && name !== SHARED_NS && !name.startsWith(`${SHARED_NS}/`);
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
			preprocessed: "kb.status.preprocessed",
			stored: "kb.status.stored"
		};
/** 会话在「知识库产物」下的目录段（方案 B）。
 *  目录名只由会话 id 决定，不含标题 ⇒ ① 永远唯一（同名会话不串台）；
 *  ② 改标题时目录不变（产物不丢），需要跟随时由重命名逻辑显式搬迁。 */
function sessionDirOf(session) {
	const sid = String(session?.id || "").replace(/[^A-Za-z0-9]/g, "");
	return "会话-" + (sid.slice(-6) || "unknown");
}
/** 目录段 → 会话：老数据只有目录、没有账本时用来兜底认领。
 *  KT-03/R-E6：该函数全库无调用点（artifactGroups 用 dir === sessionDirOf(activeSession)
 *  直接兜底，且老目录段只含会话 id 后 6 位，无法反查完整 id），故删除。 */

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
					// F1（task-20）：新契约不再返回明文 api_key；快照一旦出现 key_present（= 服务端已升级），
					// 就不把 key 传进前端流程（选中即"保持不变"，由服务端保留原 key）。
					// 未升级服务端（无 key_present）保持现状，不误伤。
					onSelect(val, custom?.base_url, custom && custom.key_present === void 0 ? custom.api_key : void 0);
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
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { size: 12 }), t("kb.modelDownload")]
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
		* KT-03/T-18（R-E6）删除 ArtifactToggle：该组件全文件无任何渲染点，且服务端
		* `_excluded_prefixes()`（sidecar/server.py）已恒定排除 DSH产物/知识库产物 两个
		* 命名空间、不再读取 /prefs 的 include_*_artifacts 开关 ⇒ 接到界面上也是无效开关。
		* 按「不留半死状态」原则移除组件与其文案（/prefs 接口保留，供其它用途）。
		*/
		/**
		* 对话框右侧的「对话产物」栏：收纳知识库问答生成的产物文件，可折叠。
		* 产物只落盘、不入库，所以既不占向量库也不进实体图谱；「@文件」把产物
		* 正文直接注入当前对话，「更多操作」可添加到个人/共享知识库、重命名、
		* 下载、删除。产物不再出现在个人知识库目录树里。
		*/
		/** kbProtoMSG-20261004c —— 产物 chip 的展示名。
		 *  服务端会话消息是冻结六字段 schema，客户端另挂的 `artifact` 字段写盘时会被剥掉
		 *  ⇒ 刷新/换端后 chip 会消失。故优先用即时字段，没有时按 `artifactIds` 在右侧产物
		 *  列表里反查真实展示名（服务端按内容做语义命名，客户端拼的名字对不上）。
		 *  id 形态若不一致，退回「id 里含该文件名」的宽松匹配，避免因前缀差异整块失效。 */
		function kbArtifactNameOf(m, groups) {
			if (m && typeof m.artifact === "string" && m.artifact) return m.artifact;
			const ids = m && Array.isArray(m.artifactIds) ? m.artifactIds : [];
			if (!ids.length || !Array.isArray(groups)) return "";
			for (const g of groups) for (const f of (g.files || [])) {
				const did = f.docId || f.doc_id;
				if (!did) continue;
				if (ids.includes(did) || ids.some((x) => String(x).includes(f.name))) return `${f.name}${f.ext ? "." + f.ext : ""}`;
			}
			return "";
		}
		function KbArtifactRail({ groups, total, collapsed, onToggle, onMention, onOpen, onMenu, onMore, t }) {
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
									children: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [t("kb.artifacts"),
                                        onMore && (0, react_jsx_runtime.jsx)("button", { type: "button", onClick: onMore, className: "kbp-link", children: "更多产物" })] })
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
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 })
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
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: cssMod.artRailMore,
												title: t("kb.artifactsMore"),
												"aria-label": t("kb.artifactsMore"),
												onClick: (e) => {
													e.stopPropagation();
													onMenu(file, e.currentTarget);
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, { size: 14 })
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
					const i = TOP_ORDER.indexOf(n.fullPath);
					return i === -1 ? TOP_ORDER.length : i;
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

		/** kbFeat86-sharedtree — 由扁平 folders+带路径 docs 重建共享知识库真树（需求：分级展开）。 */
		/** kbFeat86-sharedtree + kbFeat86-treeview2 — 由扁平 folders+带路径 docs 重建共享知识库真树。
		 * 需求：呈现方式与个人知识库一致 —— 根目录只显示顶层文件夹，子目录逐层展开。
		 * 实现：建**单一虚拟根**（depth -1，与 buildFolderTree 同语义），按 "/" 分段挂载；
		 *       所有真实文件夹都作为其子孙，只把顶层（depth 0）交给渲染。 */
		function buildSharedTree(sharedFolders) {
			const rootNode = { fullPath: "", name: "", depth: -1, files: [], children: [], node: null };
			const index = /* @__PURE__ */ new Map();
			// name -> 该文件夹的 sharedFolder 元数据（可能多次出现，保留首见，兼容历史重复条目）
			const metaByName = /* @__PURE__ */ new Map();
			for (const sf of (sharedFolders || [])) {
				const nm = String(sf.name || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
				if (!nm) continue;
				if (!metaByName.has(nm)) metaByName.set(nm, sf);
			}
			const ensure = (fullPath) => {
				const hit = index.get(fullPath);
				if (hit) return hit;
				const segs = fullPath.split("/");
				const parentPath = segs.slice(0, -1).join("/");
				const parent = parentPath === "" ? rootNode : ensure(parentPath);
				const sfm = metaByName.get(fullPath) || null;
				const node = {
				fullPath,
				name: segs[segs.length - 1] || "",
				depth: parent.depth + 1,
				files: [],
				children: [],
				node: sfm
				};
				index.set(fullPath, node);
				// 保持与 buildFolderTree 一致：兄弟按名字排序，展开后顺序稳定可预期
				(parent.children = parent.children.concat([node])),
				parent.children.sort((x, y) => x.name.localeCompare(y.name));
				return node;
			};
			// 1) 先把所有文件夹条目建成树（含中间层补空节点，与个人库一致）
			for (const nm of metaByName.keys()) ensure(nm);
			// 2) 再把文档按 title 挂到「最长匹配」的文件夹节点下
			for (const sf of (sharedFolders || [])) {
				const sfName = String(sf.name || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
				if (!sfName) continue;
				for (const doc of (sf.docs || [])) {
					const t2 = String(doc.title || doc.doc_id || "").replace(/\\/g, "/");
					const segs = t2.split("/");
					const segs0 = segs[0] === "共享" ? segs.slice(1) : segs;  // kbFeat86-sharedpathstrip
						const _sfSegs = String(sfName || "").split("/").filter(Boolean);
						// 只有 cand 确实以 sfName 整段开头时才剥掉它，否则退回全段交给 ensure() 补中间层，
						// 避免把「完整嵌套路径」当成相对路径再拼一次（那会产出重复多重目录）。
						const rel = (_sfSegs.length && segs0.slice(0, _sfSegs.length).join("/") === _sfSegs.join("/"))
							? segs0.slice(_sfSegs.length)
							: segs0;
					const base = rel[rel.length - 1] || doc.doc_id;
					const relDir = rel.slice(0, -1).join("/");
					const parentPath = relDir ? sfName + "/" + relDir : sfName;
					const parent = ensure(parentPath);
					parent.files.push({ doc: { ...doc, docId: doc.doc_id || doc.docId }, name: base });  // kbFeat86-shareddocid
				}
			}
			return rootNode.children;
		}
		/** kbFeat86-sharedtree — DFS 扁平化：仅输出祖先全展开的节点（folder 行在前，文件行在后）。 */
		function flattenSharedRows(tree, expandedSet) {
			const out = [];
			const walk = (nodes) => {
				for (const n of nodes) {
					const isOpen = expandedSet.has(n.fullPath);
					out.push({ kind: "folder", node: n, isOpen });
					if (isOpen) {
						if (n.children.length) walk(n.children);
						for (const f of n.files) out.push({ kind: "file", node: n, file: f });
					}
				}
			};
			walk(tree);
			return out;
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
	/** KT-14/T-04b：本地读取只降级为**只读缓存**（离线展示用）。
	*  读取顺序：新缓存键 → 旧键（只读，等迁移）→ 空会话。本函数绝不写任何 localStorage 键。 */
	function loadSessions() {
	try {
	const raw = window.localStorage.getItem(CONV_CACHE_KEY);
	const parsed = raw ? JSON.parse(raw) : null;
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
	} catch {}
	const legacy = readLegacyLocalState();
	if (legacy.sessions.length > 0) {
	const valid = legacy.sessions.filter((s) => {
	const ss = s;
	return typeof ss === "object" && ss !== null && typeof ss.id === "string" && Array.isArray(ss.messages);
	}).map((s) => ({
	...s,
	messages: s.messages.map(sanitizeMessage).filter((m) => !isOperationLog(m))
	}));
	if (valid.length > 0) return valid;
	}
	if (legacy.history.length > 0) {
	const messages = legacy.history.filter((m) => {
	const mm = m;
	return typeof m === "object" && m !== null && (mm.role === "user" || mm.role === "ai") && typeof mm.text === "string";
	}).map(sanitizeMessage).filter((m) => !isOperationLog(m));
	if (messages.length > 0) {
	const session = makeSession(messages.find((m) => m.role === "user")?.text.slice(0, 24) || "历史对话");
	session.messages = messages;
	return [session];
	}
	}
	return [makeSession()];
	}
	/** KT-14/T-04b：localStorage 已降级为**只读缓存**（新键 CONV_CACHE_KEY，仅供离线展示）。
	*  - 只在 server 模式且非离线时写：真源是服务端 /conversations*；
	*  - 离线/只读态**不写**（由 UI 显式提示），绝不"静默写回再假装成功"；
	*  - 永不写旧真源键（kbSetItem 写保护旧键）。 */
	function saveSessions(sessions) {
	if (!convRuntime.serverMode || convRuntime.offline) return;
	kbSetItem("conversation-cache", CONV_CACHE_KEY, JSON.stringify(sessions));
	}
	/* ================= kbBg-20261005:registry =================
	   后台问答续跑注册表（模块作用域，跨面板卸载存活）。
	   背景：DSH 的 main 是 keyed 槽，切到别的页面会卸载知识库面板 → React state 全丢；
	   原实现把「定稿写回」放在 setSessions 的 updater 回调里，卸载后 updater 不再执行，
	   localStorage 缓存永远拿不到回答（服务端可能已落库，但客户端缓存/气泡不更新）。
	   本注册表把进行中的生成搬到模块作用域：
	     - runner（ragAskLive 的轮询 promise）只读写注册表，不依赖任何 React state；
	     - 定稿经 kbPersistFinalMessage() 直接 loadSessions→合并→saveSessions（脱离 React）；
	     - 面板挂载时订阅本表：生成中恢复 live 进度、定稿后合并进 React state。
	   条目 key = `${sessionId}:${aiIndex}`；定稿后保留 KB_BG_LINGER_MS 供刚切回的面板续看。 */
	const KB_BG_LINGER_MS = 6e4;
	const kbBgTasks = new Map();
	const kbBgUiSinks = new Set();
	function kbBgKey(sessionId, aiIndex) {
		return String(sessionId) + ":" + String(aiIndex);
	}
	/** 把 sidecar 的 progress 规整成 KbThinking 需要的形状（thinking/answer 必须是字符串）。 */
	function kbBgNormalizeLive(progress, entry) {
		const p = progress && typeof progress === "object" ? progress : {};
		const fallback = entry ? Math.max(0, Math.round((Date.now() - entry.startedAt) / 1000)) : 0;
		return {
			...p,
			stage: typeof p.stage === "string" && p.stage ? p.stage : "retrieval",
			message: typeof p.message === "string" ? p.message : "",
			elapsed: Number.isFinite(p.elapsed) ? Number(p.elapsed) : fallback,
			thinking: typeof p.thinking === "string" ? p.thinking : "",
			answer: typeof p.answer === "string" ? p.answer : ""
		};
	}
	/** 生成中气泡的 live patch：已用时按本地时钟保活（切页期间 sidecar 进度可能不再推）。 */
	function kbBgLivePatch(entry) {
		const live = kbBgNormalizeLive(entry.live, entry);
		const local = Math.max(0, Math.round((Date.now() - entry.startedAt) / 1000));
		if (!Number.isFinite(live.elapsed) || live.elapsed < local) live.elapsed = local;
		return { live };
	}
	function kbBgRegister(meta) {
		const sessionId = String(meta && meta.sessionId || "");
		const aiIndex = meta && Number.isFinite(meta.aiIndex) ? meta.aiIndex : -1;
		const entry = {
			key: kbBgKey(sessionId, aiIndex),
			sessionId,
			convId: String(meta && meta.convId || ""),
			aiIndex,
			askText: String(meta && meta.askText || ""),
			startedAt: Date.now(),
			taskId: null,
			stopRequested: false,
			phase: "running",
			live: null,
			patch: null,
			promise: null,
			settlePromise: null
		};
		/* 条目形状：{taskId, live, promise, phase}。promise 在定稿时 resolve，便于外部（含测试）等待。 */
		entry.promise = new Promise((resolve) => { entry.settlePromise = resolve; });
		kbBgTasks.set(entry.key, entry);
		kbBgNotifyUi("start", entry);
		return entry;
	}
	function kbBgSetLive(entry, progress) {
		if (!entry || entry.phase !== "running") return;
		entry.live = kbBgNormalizeLive(progress, entry);
		kbBgNotifyUi("live", entry);
	}
	function kbBgSetTaskId(entry, taskId) {
		if (!entry || !taskId) return;
		entry.taskId = taskId;
		/* 点过「停止」但当时还没拿到 task_id：拿到后立刻补发取消（停止语义保持有效）。 */
		if (entry.stopRequested) void kbCancelTask(taskId, ragFetch);
		kbBgNotifyUi("task", entry);
	}
	function kbBgMarkStopped(entry) {
		if (!entry) return;
		entry.stopRequested = true;
		if (entry.taskId) void kbCancelTask(entry.taskId, ragFetch);
	}
	function kbBgRunningEntries(sessionId) {
		const out = [];
		for (const entry of kbBgTasks.values()) {
			if (!entry || entry.phase !== "running") continue;
			if (sessionId !== void 0 && entry.sessionId !== sessionId) continue;
			out.push(entry);
		}
		return out;
	}
	function kbBgSubscribeUi(handlers) {
		kbBgUiSinks.add(handlers);
		return () => { kbBgUiSinks.delete(handlers); };
	}
	function kbBgNotifyUi(kind, entry) {
		const patch = kind === "final" && entry ? entry.patch : null;
		for (const handlers of Array.from(kbBgUiSinks)) {
			try {
				if (patch && typeof handlers.apply === "function") handlers.apply(entry, patch);
				if (typeof handlers.changed === "function") handlers.changed();
			} catch {}
		}
	}
	/** 定位目标气泡：优先按 askText 认领（同一问题可复用），其次 aiIndex，最后认唯一一条在生成的气泡。 */
	function kbBgResolveIndex(messages, aiIndex, askText) {
		const list = Array.isArray(messages) ? messages : [];
		const exact = Number.isFinite(aiIndex) ? aiIndex : -1;
		const hasAsk = typeof askText === "string" && askText !== "";
		if (hasAsk) {
			let fallback = -1;
			for (let i = list.length - 1; i >= 0; i -= 1) {
				const m = list[i];
				if (!m || m.role !== "ai" || m.askText !== askText) continue;
				if (m.text === "" || m.text === void 0) return i;
				if (fallback < 0) fallback = i;
			}
			if (fallback >= 0) return fallback;
		}
		if (exact >= 0 && exact < list.length) {
			const m = list[exact];
			if (m && m.role === "ai" && (!hasAsk || m.askText === void 0 || m.askText === "" || m.askText === askText)) return exact;
		}
		for (let i = list.length - 1; i >= 0; i -= 1) {
			const m = list[i];
			if (m && m.role === "ai" && m.live !== void 0) return i;
		}
		const last = list.length - 1;
		if (last >= 0 && list[last] && list[last].role === "ai" && !hasAsk) return last;
		return -1;
	}
	function kbBgHasMessageId(messages, messageId) {
		if (!messageId || !Array.isArray(messages)) return false;
		return messages.some((m) => Boolean(m) && m.messageId === messageId);
	}
	function kbBgMergeMessage(prevMsg, patch, clearLive) {
		const out = { ...(prevMsg || {}), ...(patch || {}) };
		if (clearLive) delete out.live;
		return out;
	}
	/**
	* 定稿能否合并进这条气泡：只认「还是空的占位气泡」，或「同一条回答（messageId + 正文都一致）
	* 的幂等重复合并」。正文已被改写（深挖 deepDive 版 / 同问题复用的另一条回答）一律不覆盖。
	*/
	function kbBgCanApplyFinal(cur, patch) {
		if (!cur) return false;
		const curText = cur.text === void 0 ? "" : String(cur.text);
		if (curText === "") return true;
		const patchText = patch && patch.text === void 0 ? "" : String(patch.text);
		if (patch && patch.messageId && cur.messageId === patch.messageId && curText === patchText) return true;
		return false;
	}
	/** 合并 patch 到目标气泡；找不到目标且 messageId 尚未出现时追加一条，避免丢回答。 */
	function kbBgMergeIntoMessages(messages, aiIndex, askText, patch, clearLive) {
		const list = Array.isArray(messages) ? messages : [];
		const at = kbBgResolveIndex(list, aiIndex, askText);
		if (at < 0) {
			if (patch && patch.messageId && kbBgHasMessageId(list, patch.messageId)) return list;
			return [...list, kbBgMergeMessage({ role: "ai", text: "", ...(askText ? { askText } : {}) }, patch, clearLive)];
		}
		if (!kbBgCanApplyFinal(list[at], patch)) return list;
		return list.map((m, i) => i === at ? kbBgMergeMessage(m, patch, clearLive) : m);
	}
	/**
	* kbBg-20261005 —— 脱离 React 的定稿落库：自己 loadSessions() → 定位会话/气泡 → 合并 patch
	* → saveSessions()。面板已被卸载（setSessions updater 不再执行）时，localStorage 缓存仍能
	* 拿到回答；服务端落库由调用方继续走 kbPersistMessage()。
	*/
	function kbPersistFinalMessage(sessionId, aiIndex, patch, askText) {
		if (!sessionId) return null;
		try {
			const sessions = loadSessions();
			const idx = sessions.findIndex((s) => s && s.id === sessionId);
			if (idx < 0) return null;
			const target = sessions[idx];
			const messages = kbBgMergeIntoMessages(target.messages, aiIndex, askText, patch, true);
			if (messages === target.messages) return { sessions, session: target, index: -1, skipped: true };
			const next = sessions.map((s, k) => k === idx ? {
				...s,
				messages,
				updatedAt: Date.now(),
				title: s.customTitle ? s.title : sessionTitleFromMessages(messages)
			} : s);
			saveSessions(next);
			return { sessions: next, session: next[idx] };
		} catch {
			return null;
		}
	}
	/** 定稿：① 本地缓存（脱离 React）② 服务端 ③ 挂载中的 UI ④ 保留一小段时间供续看。 */
	function kbBgFinalize(entry, patch) {
		if (!entry) return null;
		/* 幂等：一次生成只定稿一次（重复调用不再重复落库/落缓存）。 */
		if (entry.phase === "final") return null;
		/* kbProtoMSG-20261004c —— 本地写回与服务端落库共用同一个 message_id。 */
		const _patch = {
			...(patch || {}),
			messageId: patch && patch.messageId || `msg-${generateId()}`
		};
		entry.phase = "final";
		entry.live = null;
		entry.patch = _patch;
		if (typeof entry.settlePromise === "function") {
			try { entry.settlePromise({ phase: "final", patch: _patch }); } catch {}
			entry.settlePromise = null;
		}
		const persisted = kbPersistFinalMessage(entry.sessionId, entry.aiIndex, _patch, entry.askText);
		// KT-14/T-04b：AI 回答定稿后才落服务端（流式占位气泡不落历史）。
		const _aiText = String(_patch.text || "");
		if (entry.convId && _aiText) void kbPersistMessage(entry.convId, {
			role: "ai",
			text: _aiText,
			...Number.isFinite(_patch.ts) ? { ts: _patch.ts } : {},
			..._patch.sources ? { sources: _patch.sources } : {},
			...typeof _patch.thinking === "string" && _patch.thinking.trim() !== "" ? { thinking: _patch.thinking } : {},
			messageId: _patch.messageId
		});
		kbBgNotifyUi("final", entry);
		const key = entry.key;
		window.setTimeout(() => {
			if (kbBgTasks.get(key) !== entry) return;
			/* 清理前再兜一次（幂等）：此后气泡完全由 React state / 缓存承载。 */
			kbBgNotifyUi("final", entry);
			kbBgTasks.delete(key);
			kbBgNotifyUi("drop", entry);
		}, KB_BG_LINGER_MS);
		return persisted;
	}
	/** 渲染用叠加层：把注册表里的「生成中 live / 刚定稿 patch」合并到会话消息上（幂等）。 */
	function kbBgApplyOverlay(session, tick) {
		const list = session && Array.isArray(session.messages) ? session.messages : [];
		if (!session || kbBgTasks.size === 0) return list;
		let touched = false;
		const out = list.slice();
		for (const entry of kbBgTasks.values()) {
			if (!entry || entry.sessionId !== session.id) continue;
			const at = kbBgResolveIndex(list, entry.aiIndex, entry.askText);
			const cur = at < 0 ? null : out[at];
			/* 只认「还是空的占位气泡」：绝不动已有正文的消息（深挖 deepDive / 同问题复用的旧回答）。 */
			const isPlaceholder = Boolean(cur) && (cur.text === "" || cur.text === void 0);
			if (entry.phase === "running") {
				if (isPlaceholder) out[at] = { ...cur, ...kbBgLivePatch(entry) };
				/* 占位气泡缺失或已被别人占用（极少见）：补一条纯前端的「生成中」气泡，不落库。 */
				else out.push({ role: "ai", text: "", ...(entry.askText ? { askText: entry.askText } : {}), ...kbBgLivePatch(entry) });
				touched = true;
				continue;
			}
			if (!kbBgCanApplyFinal(cur, entry.patch)) continue;
			out[at] = kbBgMergeMessage(cur, entry.patch, true);
			touched = true;
		}
		void tick;
		return touched ? out : list;
	}
	/* ================= /kbBg-20261005:registry ================= */
	/** ---- KT-14/T-04b 服务端对话 API（真源；按 Lead 冻结契约） ---- */
	/** 人话错误：404/401 不泄漏存在性。 */
	function kbConvHumanError(status, detail) {
	if (status === 400) return "对话请求参数不合法，请刷新后重试。";
	if (status === 401) return "登录状态已失效，请重新登录后再试。";
	if (status === 403) return "没有权限访问该对话。";
	if (status === 404) return "对话不存在或已被删除（不会自动新建）。";
	if (status === 409) return "对话状态冲突，请刷新后重试。";
	if (status >= 500) return "对话服务暂时不可用，请稍后重试。";
	return typeof detail === "string" && detail && detail.length < 120 ? detail : "对话请求失败（HTTP " + status + "）";
	}
	/** 统一请求：ok → JSON；非 ok → {error,status}；网络异常 → null（触发只读离线）。 */
	async function kbConvFetch(path, options) {
	try {
	const res = await ragFetch(path, options);
	if (res.ok) {
	const data = await res.json().catch(() => null);
	return data === null ? { error: "对话服务返回了无法解析的数据。" } : data;
	}
	const detail = await res.json().catch(() => ({}));
	return { error: kbConvHumanError(res.status, detail && detail.detail), status: res.status };
	} catch {
	return null;
	}
	}
	/** GET /conversations → {items}；null = 服务端不可用（进入离线只读）。 */
	async function ragConversationList() {
	const data = await kbConvFetch("/conversations");
	if (data === null) return null;
	if (data.error) return data;
	const items = Array.isArray(data.items) ? data.items : [];
	return { items: items.filter((x) => x && typeof x.conversation_id === "string" && x.conversation_id) };
	}
	async function ragConversationCreate(titleOrRecord) {
	/** 传字符串 = 新对话标题；传对象 = 迁移导入记录（确定性 conversation_id + messages + 原时间戳）。 */
	const payload = titleOrRecord === void 0 || titleOrRecord === null || typeof titleOrRecord === "string"
	? { title: titleOrRecord || "新对话" }
	: { ...titleOrRecord };
	return kbConvFetch("/conversations", {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify(payload)
	});
	}
	
	async function ragConversationGet(cid) {
	return kbConvFetch("/conversations/" + encodeURIComponent(cid));
	}
	async function ragConversationPatch(cid, patch) {
	return kbConvFetch("/conversations/" + encodeURIComponent(cid), {
	method: "PATCH",
	headers: { "content-type": "application/json" },
	body: JSON.stringify(patch || {})
	});
	}
	async function ragConversationAppend(cid, message) {
	return kbConvFetch("/conversations/" + encodeURIComponent(cid) + "/messages", {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify(message)
	});
	}
	async function ragConversationDelete(cid) {
	return kbConvFetch("/conversations/" + encodeURIComponent(cid), { method: "DELETE" });
	}
	/** 批量导入（迁移专用）；路由缺失/不支持 → {unsupported:true}。 */
	async function ragConversationImport(records) {
	const data = await kbConvFetch("/conversations/import", {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ conversations: records })
	});
	if (data === null) return null;
	if (data.status === 404 || data.status === 405) return { unsupported: true };
	return data;
	}
	/** 本地 role（user/ai）↔ 服务端 role（user/assistant）；未知值原样透传，不猜。 */
	function kbRoleToServer(role) {
	return role === "ai" ? "assistant" : role === "user" ? "user" : String(role || "assistant");
	}
	function kbRoleFromServer(role) {
	return role === "user" ? "user" : "ai";
	}
	function kbMessageFromServer(m) {
	const out = { role: kbRoleFromServer(m && m.role), text: typeof (m && m.text) === "string" ? m.text : "" };
	const ts = Date.parse(String((m && m.created_at) || ""));
	if (Number.isFinite(ts)) out.ts = ts;
	if (Array.isArray(m && m.references) && m.references.length) out.sources = normalizeKbSources(m.references);
	/* kbThinkPersist-20261005 —— 读回落库的思考过程（旧消息无此键 ⇒ 行为不变）。 */
	if (typeof (m && m.thinking) === "string" && m.thinking.trim() !== "") out.thinking = m.thinking;
	/* kbProtoMSG-20261004c —— 消息身份与产物归属（服务端冻结 schema 的 message_id / artifact_ids）。 */
	if (m && typeof m.message_id === "string" && m.message_id) out.messageId = m.message_id;
	if (Array.isArray(m && m.artifact_ids) && m.artifact_ids.length) out.artifactIds = m.artifact_ids.map((x) => String(x));
	return out;
	}
	function kbMessageToServer(m) {
	const body = { role: kbRoleToServer(m.role), text: String(m.text || "") };
	const created = Number.isFinite(m.ts) ? new Date(m.ts).toISOString() : "";
	if (created) body.created_at = created;
	if (Array.isArray(m.sources) && m.sources.length) body.references = m.sources;
	/* kbThinkPersist-20261005 —— 把本条回答的「深度思考」一起落库，刷新/换端后仍可见。 */
	if (typeof m.thinking === "string" && m.thinking.trim() !== "") body.thinking = m.thinking;
	/* kbProtoMSG-20261004c —— 带上消息身份与产物归属，落库后仍是同一条消息。 */
	if (typeof m.messageId === "string" && m.messageId) body.message_id = m.messageId;
	if (Array.isArray(m.artifactIds) && m.artifactIds.length) body.artifact_ids = m.artifactIds;
	return body;
	}
	/** 列表项 → 会话骨架（正文按需 GET；id 用不可变 conversation_id，不拿标题当键）。 */
	function kbSessionFromListItem(item) {
	const cid = String(item.conversation_id);
	const ts = Date.parse(String(item.updated_at || ""));
	return {
	id: cid,
	convId: cid,
	title: typeof item.title === "string" && item.title ? item.title : "新对话",
	messages: [],
	convLoaded: false,
	createdAt: Number.isFinite(ts) ? ts : Date.now(),
	updatedAt: Number.isFinite(ts) ? ts : Date.now()
	};
	}
	function kbSessionFromEntity(ent, prev) {
	const cid = String(ent.conversation_id);
	const messages = Array.isArray(ent.messages) ? ent.messages.map(kbMessageFromServer) : [];
	const created = Date.parse(String(ent.created_at || ""));
	const updated = Date.parse(String(ent.updated_at || ""));
	return {
	...(prev || {}),
	id: cid,
	convId: cid,
	title: typeof ent.title === "string" && ent.title ? ent.title : (prev && prev.title) || "新对话",
	messages,
	convLoaded: true,
	createdAt: Number.isFinite(created) ? created : (prev && prev.createdAt) || Date.now(),
	updatedAt: Number.isFinite(updated) ? updated : Date.now()
	};
	}
	/** 把一条消息推到服务端（真源）；失败 ⇒ 显式进入只读离线态。 */
	async function kbPersistMessage(cid, message) {
	if (!cid) return null;
	const r = await ragConversationAppend(cid, kbMessageToServer(message));
	if (r === null || r.error) kbSignalOffline((r && r.error) || "对话服务不可用：消息未保存（当前为只读离线视图）。");
	return r;
	}
	/** 旧 folders.v1 搬到新缓存键（冻结契约没有文件夹资源，只搬本地键）。 */
	function syncFoldersCacheFromLegacy(folders) {
	if (!Array.isArray(folders) || folders.length === 0) return;
	let prev = [];
	try {
	const raw = window.localStorage.getItem(FOLDERS_CACHE_KEY);
	const parsed = raw ? JSON.parse(raw) : null;
	if (Array.isArray(parsed)) prev = parsed;
	} catch {}
	const merged = [...new Set([...prev, ...folders.filter((x) => typeof x === "string")])];
	kbSetItem("folders-cache", FOLDERS_CACHE_KEY, JSON.stringify(merged));
	}
	function kbMigrationSave(mark) {
	kbSetItem("migration-mark", MIGRATED_KEY, JSON.stringify(mark));
	}
	/** 迁移用确定性 cid：同一 legacyId 永远映射到同一 cid（长度 ≥8、符合服务端 CONV_ID_RE），
	*  于是重跑迁移由服务端按 cid 去重（已存在则 skipped），天然幂等、不依赖响应形状。 */
	function kbLegacyCid(legacyId) {
	let h1 = 2166136261;
	let h2 = 16777619;
	const text = String(legacyId);
	for (let i = 0; i < text.length; i += 1) {
	const code = text.charCodeAt(i);
	h1 = Math.imul(h1 ^ code, 16777619) >>> 0;
	h2 = Math.imul(h2 ^ code, 2166136261) >>> 0;
	}
	const part = (n) => ("0000000" + (n >>> 0).toString(16)).slice(-8);
	return "conv-l" + part(h1) + part(h2);
	}
	/**
	* KT-14/T-04b 旧键一次性迁移（幂等 + 可续传 + 不丢数据）。
	*  - 幂等：迁移用确定性 cid（kbLegacyCid：同一 legacyId → 同一 cid），服务端按 cid 去重，
	*    重复运行绝不重复创建；mapping 只记录成功项，失败前不写。
	*  - 可续传/不丢数据：失败项进制 pending，下次打开自动重试；迁移成功前旧键一直保持
	*    只读原样，绝不因迁移失败而丢数据（本函数也绝不写旧键）。
	*  - 保留原时间戳：优先 /conversations/import（服务端保留 created_at/updated_at）；该路由
	*    缺失时退化为逐个 POST /conversations（同样带确定性 cid + 原时间戳，服务端按 cid 去重）。
	*  - 完成后写 MIGRATED_KEY；旧键此后永久只读（kbSetItem 写保护）。
	*/
	async function kbRunLegacyMigration() {
	const prevMark = loadMigrationMark();
	if (prevMark && prevMark.done === true) return { done: true, migrated: 0, pending: 0, skipped: true };
	const legacy = readLegacyLocalState();
	const folders = legacy.folders;
	const legacySessions = legacy.sessions.filter((s) => s && typeof s === "object" && typeof s.id === "string" && Array.isArray(s.messages));
	const historyMsgs = legacy.history.filter((m) => m && typeof m === "object" && (m.role === "user" || m.role === "ai") && typeof m.text === "string");
	if (legacySessions.length === 0 && historyMsgs.length === 0 && folders.length === 0) {
	kbMigrationSave({ schema_version: 1, done: true, migrated_at: new Date().toISOString(), mapping: {}, pending: [] });
	return { done: true, migrated: 0, pending: 0 };
	}
	if (folders.length > 0) syncFoldersCacheFromLegacy(folders);
	const mapping = prevMark && prevMark.mapping && typeof prevMark.mapping === "object" ? { ...prevMark.mapping } : {};
	const queue = [];
	for (const s of legacySessions) {
	const key = String(s.id);
	if (mapping[key]) continue;
	queue.push({
	legacy_id: key,
	cid: kbLegacyCid(key),
	title: typeof s.title === "string" && s.title ? s.title : sessionTitleFromMessages(s.messages),
	created_at: Number.isFinite(s.createdAt) ? new Date(s.createdAt).toISOString() : "",
	updated_at: Number.isFinite(s.updatedAt) ? new Date(s.updatedAt).toISOString() : "",
	messages: s.messages.filter((m) => !isOperationLog(m) && typeof m.text === "string").map(kbMessageToServer)
	});
	}
	
	if (historyMsgs.length > 0 && !mapping["__history__"]) {
	const firstTs = Number.isFinite(historyMsgs[0].ts) ? historyMsgs[0].ts : 0;
	const lastTs = Number.isFinite(historyMsgs[historyMsgs.length - 1].ts) ? historyMsgs[historyMsgs.length - 1].ts : 0;
	queue.push({
	legacy_id: "__history__",
	cid: kbLegacyCid("__history__"),
	title: historyMsgs.find((m) => m.role === "user")?.text.slice(0, 24) || "历史对话",
	created_at: firstTs ? new Date(firstTs).toISOString() : "",
	updated_at: lastTs ? new Date(lastTs).toISOString() : "",
	messages: historyMsgs.map(kbMessageToServer)
	});
	}
	
	if (queue.length === 0) {
	kbMigrationSave({ schema_version: 1, done: true, migrated_at: new Date().toISOString(), mapping, pending: [] });
	return { done: true, migrated: 0, pending: 0 };
	}
	// 服务端不可用时不落任何台账（旧键保持只读原样，下次打开再迁）。
	const probe = await ragConversationList();
	if (probe === null) return { done: false, migrated: 0, pending: queue.length, offline: true };
	const pending = [];
	const records = queue.map((q) => ({
	conversation_id: q.cid,
	legacy_id: q.legacy_id,
	title: q.title,
	...(q.created_at ? { created_at: q.created_at } : {}),
	...(q.updated_at ? { updated_at: q.updated_at } : {}),
	messages: q.messages
	}));
	// 1) 优先批量导入（服务端保留原 created_at/updated_at；确定性 cid 让重跑自动 skipped）。
	const imported = await ragConversationImport(records);
	if (imported !== null && !imported.unsupported && !imported.error) {
	for (const rec of records) mapping[rec.legacy_id] = rec.conversation_id;
	} else {
	// 2) 退化路径：逐个 POST /conversations（带 messages + 确定性 cid + 原时间戳；服务端按 cid 去重）。
	for (const rec of records) {
	const created = await ragConversationCreate(rec);
	if (created === null || created.error || typeof created.conversation_id !== "string") {
	pending.push({ legacy_id: rec.legacy_id, reason: (created && created.error) || "create-failed" });
	continue;
	}
	mapping[rec.legacy_id] = created.conversation_id;
	}
	}
	const done = pending.length === 0;
	kbMigrationSave({ schema_version: 1, done, migrated_at: new Date().toISOString(), mapping, pending });
	return { done, migrated: Object.keys(mapping).length, pending: pending.length };
	}
	
	/** 并发保护：同一时刻只跑一次迁移。 */
	let kbMigrationPromise = null;
	function migrateLegacyKeys() {
	if (kbMigrationPromise) return kbMigrationPromise;
	kbMigrationPromise = kbRunLegacyMigration().then((r) => r, () => ({ done: false, migrated: 0, pending: 0, error: true })).then((r) => {
	kbMigrationPromise = null;
	return r;
	});
	return kbMigrationPromise;
	}
		function sessionTitleFromMessages(messages) {
			const first = messages.find((m) => m.role === "user");
			if (!first) return "新对话";
			const text = first.text.trim().replace(/\s+/g, " ");
			return text.length > 24 ? `${text.slice(0, 24)}…` : text;
		}
	function loadCustomFolders() {
	try {
	const raw = window.localStorage.getItem(FOLDERS_CACHE_KEY);
	if (raw) {
	const parsed = JSON.parse(raw);
	if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
	}
	} catch {}
	// 旧键只读：等迁移把它搬到 FOLDERS_CACHE_KEY；旧键此后不再写。
	return readLegacyLocalState().folders;
	}
	function saveCustomFolders(folders) {
	kbSetItem("custom-folders-cache", FOLDERS_CACHE_KEY, JSON.stringify(folders));
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
		// Pure contracts: strings are genuine legacy source paths, never invented IDs.
		function normalizeKbSources(sources) {
			if (!Array.isArray(sources)) return [];
			return sources.map((value) => {
				const s = typeof value === "string" ? { file_path: value } : value;
				if (!s || typeof s.file_path !== "string" || !s.file_path.trim()) return null;
				return { file_path: s.file_path, doc_id: typeof s.doc_id === "string" && s.doc_id ? s.doc_id : null,
					title: typeof s.title === "string" ? s.title : s.file_path.split("/").pop(),
					excerpt: typeof s.excerpt === "string" ? s.excerpt : "",
					location: typeof s.location === "string" ? s.location : null,
					shared: s.shared === true || s.file_path.startsWith("共享/") };
			}).filter(Boolean);
		}
		function kbTaskModel(selectedKey, options) {
			if (!selectedKey) return undefined;
			const option = options.find((o) => JSON.stringify([o.provider, o.id]) === selectedKey);
			if (!option) throw new Error("所选模型已不可用，请重新选择。");
			return { provider: option.provider, model: option.id };
		}
		function kbResolveSource(source, documents) {
			// The caller supplies only its current authorized personal or shared list.
			return documents.find((d) => (source.doc_id && (d.id || d.doc_id) === source.doc_id) ||
				String(d.title || "").replace(/\\/g, "/") === source.file_path ||
				(source.shared && `共享/${String(d.title || "").replace(/\\/g, "/")}` === source.file_path)) || null;
		}
		function kbProvenanceText(message) {
            const models = Array.isArray(message.generationModels) && message.generationModels.length
                ? message.generationModels : message.generationModel ? [message.generationModel] : [];
            const modelText = models.filter((m) => m && typeof m === 'object').map((m) => {
                if (typeof m.model !== 'string' || !m.model) return '系统默认（实际模型未报告）';
                return (typeof m.provider === 'string' && m.provider ? m.provider : '系统默认') + ' / ' + m.model;
            });
            const unavailable = message.sourcesStatus === 'unavailable';
            const reason = message.sourcesReason === 'vlm-query-does-not-expose-retrieved-source-data'
                ? '多模态检索未提供来源数据，无法展示引用' : message.sourcesReason;
            return { models: modelText.length ? '实际生成模型：' + modelText.join(' · ') : '',
                sources: unavailable ? '来源不可得' + (reason ? '：' + reason : '') : '', unavailable };
        }
        function kbCanonicalFilePath(file, personalDocs, sharedDocs) {
            const id = file.docId || file.doc_id;
            const shared = file.shared === true || typeof file.doc_id === 'string';
            const doc = shared ? sharedDocs.find((d) => id && d.doc_id === id) : personalDocs.find((d) => id && d.id === id);
            if (!doc || typeof doc.title !== 'string' || !doc.title) return null;
            const path = doc.title.replace(/\\/g, '/');
            return shared && !path.startsWith('共享/') ? '共享/' + path : path;
        }
        function kbScopeFromChips(chips) {
            if (!chips || chips.length === 0 || chips.some((c) => c.kind === 'all')) return undefined;
            const files = [], folders = [];
            for (const chip of chips) {
                if (typeof chip.path !== 'string' || !chip.path) throw new Error('引用缺少原始路径，请重新选择。');
                if (chip.kind === 'file') files.push(chip.path);
                else if (chip.kind === 'folder') folders.push(chip.path);
            }
            return files.length || folders.length ? { files: [...new Set(files)], folders: [...new Set(folders)] } : undefined;
        }
        function kbChipIdentity(chip) {
            if (chip?.kind === 'all') return 'all';
            const path = typeof chip?.path === 'string' ? chip.path.replace(/\\/g, '/') : '';
            return `${chip?.kind || ''}:${path}`;
        }
        function kbAddChip(chips, chip) {
            if (chip.kind === 'all') return [chip];
            const base = (chips || []).filter((item) => item.kind !== 'all');
            const identity = kbChipIdentity(chip);
            return base.some((item) => kbChipIdentity(item) === identity) ? base : [...base, chip];
        }
        function kbRemoveChip(chips, chip) {
            const identity = kbChipIdentity(chip);
            return (chips || []).filter((item) => kbChipIdentity(item) !== identity);
        }
        function kbFolderReference(folderName, shared = false) {
            if (!shared && folderName === '全部文档') return null;
            return shared && !folderName.startsWith('共享/') ? `共享/${folderName}` : folderName;
        }
        function kbSessionMutationBlocked(inFlightSessionId, targetSessionId) {
            return Boolean(inFlightSessionId && inFlightSessionId === targetSessionId);
        }
        async function kbCancelTask(taskId, fetchTask) {
            if (!taskId) return false;
            try {
                const response = await fetchTask(`/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
                return response.ok === true;
            } catch {
                return false;
            }
        }
        function kbEnsureActiveSession(sessions, activeId, createSession) {
            const next = sessions.slice();
            if (!next.some((item) => !item.archived)) next.unshift(createSession());
            const selected = next.find((item) => item.id === activeId && !item.archived) || next.find((item) => !item.archived);
            return { sessions: next, activeId: selected.id };
        }
        function kbArchiveSessions(sessions, id, activeId, createSession, now) {
            return kbEnsureActiveSession(sessions.map((item) => item.id === id ? { ...item, archived: true, updatedAt: now } : item), activeId, createSession);
        }
        function kbReadState(health, documents) {
            if (!health || health.ok === false) return { kind: 'offline', error: '知识库连接失败，文档数量未知' };
            if (!Array.isArray(documents)) return { kind: 'error', error: '文档清单读取失败，文档数量未知' };
            return { kind: 'connected', initialized: health.initialized, docs: documents };
        }
        function kbDialogBoundary(key, shift, activeIndex, count) {
            if (key === 'Escape') return { close: true };
            if (key !== 'Tab') return null;
            return { focus: count ? (shift ? (activeIndex <= 0 ? count - 1 : activeIndex - 1) : (activeIndex < 0 || activeIndex >= count - 1 ? 0 : activeIndex + 1)) : -1 };
        }
        // Scope prototype tokens and legacy management controls to this main page only.
		const KB_PROTOTYPE_CSS = `
/* kbZhi-20261003 —— 导航栏品牌字标「知」。声明与会议助手侧栏品牌字标「会」
   （dsh-meetai .mt-brandicon）逐项一致：34px 圆角方块 / 蓝→浅蓝渐变底 /
   白字 17px / 同款投影；仅换字与宿主类名，不改视觉。
   渐变两端为「会」的实际计算值 #2563eb→#38bdf8（见本补丁 GRADIENT 注释）。 */
.kbp-headbrand{display:flex;align-items:center;gap:8px;min-width:0}
.kbp-brandicon{width:34px;height:34px;flex:none;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;background:linear-gradient(45deg,#2563eb,#38bdf8);box-shadow:0 4px 12px rgba(37,99,235,.28)}
.kbp-root{--bg:#f4f6f9;--card:#fff;--border:#e6eaf1;--border-strong:#d3dae5;--text:#2a3342;--muted:#5f6b7e;--faint:#94a0b2;--accent:#2563eb;--accent-soft:#eaf1fe;--grad:linear-gradient(135deg,#2563eb,#38bdf8);--ok:#16803c;--ok-soft:#e4f4ea;--shadow-card:0 1px 3px rgba(30,50,80,.06),0 6px 18px rgba(30,50,80,.05);--dsw-alias-label-primary:var(--text);--dsw-alias-label-secondary:var(--muted);--dsw-alias-label-tertiary:var(--faint);--dsw-alias-bg-layer-1:var(--bg);--dsw-alias-bg-layer-2:var(--card);--dsw-alias-bg-layer-3:var(--card);--dsw-alias-divider:var(--border);--dsw-alias-divider-strong:var(--border-strong);--dsw-alias-interactive-bg-hover:var(--accent-soft);--dsw-alias-brand-primary:var(--accent);--dsw-alias-bg-mask-1:rgba(30,50,80,.35);--dsw-elevation-prominent:0 10px 30px rgba(30,50,80,.15);height:100%;overflow:auto;background:var(--bg);color:var(--text);font:14px/1.6 'PingFang SC','Microsoft YaHei','Segoe UI',system-ui,sans-serif;position:relative;isolation:isolate}
.kbp-root *{box-sizing:border-box}.kbp-root button,.kbp-root input,.kbp-root textarea,.kbp-root select{font-family:inherit}.kbp-root button{cursor:pointer}.kbp-root button:disabled{cursor:not-allowed;opacity:.45}.kbp-root :focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.kbp-topbar{padding:20px 30px 16px;background:linear-gradient(180deg,#fff,#f7f9fc);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:18px;position:sticky;top:0;z-index:10}.kbp-topbar:after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--grad)}.kbp-kicker{font-size:10px;letter-spacing:2.5px;color:var(--faint)}.kbp-topbar h2{font-size:21px;font-weight:700;margin:4px 0}.kbp-topbar p{font-size:12.5px;color:var(--muted);margin:0}.kbp-pills{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.kbp-pill,.kbp-art-entry{padding:4px 10px;border:1px solid var(--border);border-radius:20px;font-size:11.5px;background:var(--card);color:var(--muted)}.kbp-ok{background:var(--ok-soft);color:var(--ok)}.kbp-art-entry{display:none}.kbp-content{max-width:1400px;margin:0 auto;padding:22px 30px 44px}
.kbp-root .Y4cvAW_panel{width:100%;max-width:none;height:auto;max-height:none;min-height:640px;display:grid;grid-template-columns:235px minmax(0,1fr) auto;gap:18px;border-radius:0;overflow:visible;background:transparent;box-shadow:none;position:relative;inset:auto;margin:0}.kbp-root .Y4cvAW_sidebar{width:235px;padding:0;background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-card);overflow:hidden}.kbp-root .Y4cvAW_sidebarHead{padding:15px 15px 11px;margin:0;border-bottom:1px solid var(--border)}.kbp-root .Y4cvAW_sidebarTitle{font-size:14px}.kbp-root .Y4cvAW_winControls{display:none}.kbp-root .Y4cvAW_sideBody{padding:11px;overflow:visible}.kbp-root .Y4cvAW_status{font-size:11.5px;padding:6px 10px;margin:9px 0;background:var(--ok-soft);color:var(--ok);border-radius:8px}.kbp-root .Y4cvAW_search{margin-bottom:9px;padding:8px 12px;border:1px solid var(--border-strong);border-radius:9px}.kbp-root .Y4cvAW_sectionHead{padding:9px 6px 5px}.kbp-root .Y4cvAW_sectionTitle{font-size:10.5px;letter-spacing:1.5px;color:var(--faint)}.kbp-root .Y4cvAW_folder,.kbp-root .Y4cvAW_folderRow,.kbp-root .Y4cvAW_fileRow,.kbp-root .Y4cvAW_sessionItem{font-size:12.5px;padding:7px 9px;border-radius:8px;min-height:0;margin-bottom:2px}.kbp-root .Y4cvAW_folderList,.kbp-root .Y4cvAW_sessionList{overflow:visible;flex:none}.kbp-root .Y4cvAW_fileRow{font-size:12px;padding:5px 9px}.kbp-root .Y4cvAW_uploadRow{margin-top:9px}.kbp-root .Y4cvAW_footRow{display:grid;grid-template-columns:1fr 1fr;gap:7px}.kbp-root .Y4cvAW_footBtn{font-size:11.5px;border:1px solid var(--border);border-radius:8px;padding:6px 8px}
.kbp-root .Y4cvAW_chat.Y4cvAW_chatRow{display:contents}.kbp-root .Y4cvAW_chatLeft{min-width:0;min-height:640px;background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-card);overflow:hidden;display:flex;flex-direction:column}.kbp-root .Y4cvAW_hero{padding:54px 22px 22px;flex:1;text-align:center}.kbp-root .Y4cvAW_heroLogo{width:64px;height:64px;border-radius:18px;background:var(--grad);color:white;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(29,95,209,.35)}.kbp-root .Y4cvAW_heroTitle{font-size:22px;font-weight:800;letter-spacing:.5px}.kbp-root .Y4cvAW_heroSub{font-size:13px;color:var(--muted);margin:5px 0 20px}/* kbSuggest-20261003 —— 快捷标签改 4 行 × 1 列：纵向排列、按钮等宽撑满 620px。 */
.kbp-root .Y4cvAW_suggestions{display:flex;flex-direction:column;flex-wrap:nowrap;align-items:stretch;justify-content:center;width:100%;max-width:620px;gap:9px;margin:0 auto}.kbp-root .Y4cvAW_suggestion{padding:9px 15px;border:1px solid var(--border-strong);border-radius:11px;background:var(--card);font-size:12.5px;color:var(--muted);text-align:left}.kbp-root .Y4cvAW_messagesWrap{flex:1;min-height:0}.kbp-root .Y4cvAW_messages{padding:20px 22px;max-height:calc(100vh - 320px);overflow:auto}.kbp-root .Y4cvAW_messagesHead{padding:10px 22px;border-bottom:1px solid var(--border);font-size:12px}.kbp-root .Y4cvAW_bubble,.kbp-root .Y4cvAW_markdownBubble{max-width:100%;width:max-content;padding:11px 15px;border-radius:14px;border:1px solid var(--border);font-size:13.5px;line-height:1.7;background:var(--card)/*kbMsgWidth-20261004b:气泡按自身内容自适应，上限=父内容盒。原来的 82% 会与父盒 fit-content 互相收缩，既让 6 字短消息换行（需 113px 只拿到 93px），又把气泡右缘缩进 18% 导致与头像间距从 10px 撑到 30px*/}.kbp-root .Y4cvAW_user .Y4cvAW_bubble{background:var(--accent-soft);color:var(--text);border-bottom-right-radius:4px}.kbp-root .Y4cvAW_ai .Y4cvAW_markdownBubble{border-bottom-left-radius:4px}.kbp-root .Y4cvAW_composer{border-top:1px solid var(--border);padding:13px 16px;position:relative}/* kbInput-20261003 —— 默认高度 78px→156px（再调高一倍），长文本自动增高（上限 360px） */
.kbp-root .Y4cvAW_input{background:var(--card);border:1px solid var(--border-strong);border-radius:11px;padding:10px 102px 32px 13px;width:100%;min-height:156px;max-height:360px;height:auto;box-sizing:border-box;overflow-y:auto;flex:none;font-size:13.5px;line-height:1.5;resize:none;color:var(--text)}.kbp-root .Y4cvAW_composerBar{position:absolute;left:28px;right:28px;bottom:22px;display:flex;align-items:end;gap:9px}.kbp-root .Y4cvAW_modelBtn{font-size:11.5px;padding:3px 9px;max-width:210px;border:1px solid var(--border-strong);border-radius:8px;background:var(--card);color:var(--muted)}.kbp-root .Y4cvAW_modelMenu{width:240px;max-height:320px;bottom:calc(100% + 8px);border:1px solid var(--border-strong);border-radius:12px;background:var(--card);box-shadow:0 14px 34px rgba(0,0,0,.22);overflow:auto}.kbp-root .Y4cvAW_atBtn,.kbp-root .Y4cvAW_send{width:38px;height:38px;flex:none;border-radius:10px}.kbp-root .Y4cvAW_send{background:var(--grad);color:#fff}.kbp-root .Y4cvAW_atBtn{background:var(--card);border:1px solid var(--border-strong)}
.kbp-root .Y4cvAW_artRail{width:258px;min-width:0;background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-card);overflow:hidden}.kbp-root .Y4cvAW_artRailHead{padding:15px 15px 11px;border-bottom:1px solid var(--border)}.kbp-root .Y4cvAW_artRailBody{padding:11px}.kbp-root .Y4cvAW_artRailFile{padding:10px 11px;border:1px solid var(--border);border-radius:10px;font-size:12.5px;margin-bottom:8px}.kbp-root .Y4cvAW_artRailCollapsed{width:38px}.kbp-root .Y4cvAW_artRailRail{width:38px;background:var(--accent-soft);color:var(--accent)}.kbp-root .kbp-no-art{grid-template-columns:235px minmax(0,1fr) 38px}.kbp-root .Y4cvAW_notice{position:fixed;right:22px;bottom:22px;z-index:1100;padding:10px 18px;border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:11px;background:var(--card);color:var(--text);box-shadow:var(--dsw-elevation-prominent)}.kbp-root .Y4cvAW_modalOverlay{position:fixed;inset:0;z-index:1000;background:rgba(30,50,80,.35)}.kbp-root .Y4cvAW_modal{background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:14px;max-height:calc(100vh - 48px);overflow:auto}.kbp-root .Y4cvAW_folderMenu,.kbp-root .Y4cvAW_fileMenu,.kbp-root .Y4cvAW_artMenu{z-index:1050;background:var(--card);border:1px solid var(--border-strong);border-radius:10px}.kbp-refs{margin-top:9px;max-width:82%}.kbp-refs-toggle{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border:1px solid var(--border);border-radius:999px;background:var(--card);color:var(--muted);font-size:12px;font-family:inherit;cursor:pointer}.kbp-refs-toggle:hover{color:var(--text);border-color:var(--border-strong)}.kbp-refs-caret{display:inline-block;color:var(--faint);transition:transform .15s ease}.kbp-refs--open .kbp-refs-caret{transform:rotate(90deg)}.kbp-refs-body{display:flex;flex-direction:column;align-items:flex-start;margin-top:2px}.kbp-refs-body .kbp-source{margin-top:7px}.kbp-refs-model{font-size:10.5px;color:var(--faint);margin-top:6px}.kbp-refs-status{margin:6px 0 0;font-size:11px;color:var(--faint)}.kbp-source{display:flex;align-items:center;gap:10px;padding:9px 13px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--muted);font-size:12px;margin-top:9px;max-width:82%;text-align:left}.kbp-source b{color:var(--text)}.kbp-source small{display:block;font-size:10.5px;color:var(--faint);overflow-wrap:anywhere}.kbp-link{border:0;background:none;color:var(--accent);font-size:10.5px;margin-left:6px}.kbp-modal{position:fixed;inset:0;z-index:1000;background:rgba(30,50,80,.35);display:flex;align-items:center;justify-content:center;padding:24px}.kbp-dialog{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;width:min(900px,100%);max-height:85vh;overflow:auto;box-shadow:var(--dsw-elevation-prominent)}.kbp-dialog>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.kbp-action{padding:6px 9px;border:1px solid var(--border-strong);border-radius:8px;background:var(--card);color:var(--muted);font-size:12px}.kbp-action:hover{background:var(--accent-soft);color:var(--accent)}.kbp-manager-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:9px 0;border-bottom:1px solid var(--border)}.kbp-manager-row>span{flex:1}.kbp-root .Y4cvAW_statusChip{margin:9px 11px;background:var(--ok-soft);color:var(--ok);font-size:11.5px;border-radius:8px;padding:6px 10px}.kbp-root .Y4cvAW_statusChip.Y4cvAW_off{background:#fdecea;color:#c0392b}.kbp-root .Y4cvAW_search,.kbp-root .Y4cvAW_sectionHead,.kbp-root .Y4cvAW_folderList,.kbp-root .Y4cvAW_historyList,.kbp-root .Y4cvAW_uploadRow{margin-left:11px;margin-right:11px}
.kbp-art-tabs{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}.kbp-art-tabs [aria-pressed="true"]{background:var(--accent-soft);color:var(--accent);border-color:var(--accent)}
@media(max-width:1200px){.kbp-modal:has(.kbp-art-drawer){padding:0;justify-content:flex-end}.kbp-art-drawer{width:min(420px,100%);height:100%;max-height:100%;border-radius:14px 0 0 14px}.kbp-art-tabs{position:sticky;top:0;background:var(--card);padding:8px 0;z-index:1}.kbp-root .Y4cvAW_panel,.kbp-root .kbp-no-art{grid-template-columns:220px minmax(0,1fr)}.kbp-root .Y4cvAW_sidebar{width:220px}.kbp-root .Y4cvAW_artRail{display:none}.kbp-art-entry{display:block}}@media(max-width:860px){.kbp-content{padding:16px}.kbp-topbar{padding:16px;align-items:start;flex-direction:column}.kbp-root .Y4cvAW_panel,.kbp-root .kbp-no-art{grid-template-columns:1fr}.kbp-root .Y4cvAW_sidebar{width:auto}.kbp-root .Y4cvAW_chatLeft{min-height:640px}}


/* ============================================================================
   kbDock-20261002 —— 知识库插件导航栏停靠到 DSH 导航栏右侧
   导航栏 264px 整列通高贴边（去卡片圆角/阴影/外边距，只留 1px 右分隔线）；
   主内容区去居中留白随之前移；右侧「对话产物」栏贴边。
   「返回主页 / 索引 / AI 模型 / 日志」维持原有弹层（.kbp-modal / .Y4cvAW_modalOverlay）。
   回滚：还原同目录 client.js.bak-dock-20261003-045747。
   ============================================================================ */
.kbp-root{height:100%;min-height:0;flex:1 1 auto;display:flex;flex-direction:column;overflow:hidden;background:var(--card)}
.kbp-topbar{display:none}
.kbp-content{flex:1 1 auto;min-height:0;display:flex;max-width:none;width:100%;margin:0;padding:0}
.kbp-root .Y4cvAW_panel{width:100%;max-width:none;height:100%;min-height:0;display:grid;grid-template-columns:264px minmax(0,1fr) auto;gap:0;margin:0;border-radius:0;background:transparent;box-shadow:none;overflow:hidden}
.kbp-root .Y4cvAW_panel.kbp-no-art{grid-template-columns:264px minmax(0,1fr) 38px}
/* ① 知识库插件导航栏：整列通高、去卡片，仅保留 1px 右分隔线 */
.kbp-root .Y4cvAW_sidebar{width:264px;height:100%;min-height:0;padding:14px 12px 12px;background:var(--card);border:0;border-right:1px solid var(--border-strong);border-radius:0;box-shadow:none}
.kbp-root .Y4cvAW_sidebar.Y4cvAW_sidebarCollapsed{width:52px;padding:14px 6px;align-items:center}
.kbp-root .Y4cvAW_panel:has(.Y4cvAW_sidebarCollapsed){grid-template-columns:52px minmax(0,1fr) auto}
.kbp-root .Y4cvAW_panel.kbp-no-art:has(.Y4cvAW_sidebarCollapsed){grid-template-columns:52px minmax(0,1fr) 38px}
.kbp-root .Y4cvAW_sidebarHead{padding:0 2px;margin:0 0 10px;border-bottom:0}
.kbp-root .Y4cvAW_sidebarTitle{font-size:16px;font-weight:600}
.kbp-root .Y4cvAW_statusChip{margin:0 0 10px;padding:6px 8px;font-size:12px;border-radius:10px}
.kbp-root .Y4cvAW_search,.kbp-root .Y4cvAW_sectionHead,.kbp-root .Y4cvAW_folderList,.kbp-root .Y4cvAW_historyList,.kbp-root .Y4cvAW_uploadRow{margin-left:0;margin-right:0}
.kbp-root .Y4cvAW_search{height:32px;margin:0 0 12px;padding:0 9px;border:1px solid var(--border-strong);border-radius:10px}
.kbp-root .Y4cvAW_sectionHead{padding:2px 4px 6px}
.kbp-root .Y4cvAW_sectionTitle{font-size:12.5px;letter-spacing:.6px}
.kbp-root .Y4cvAW_folderList{flex:0 1 auto;min-height:0;max-height:none;overflow-y:auto}
.kbp-root .Y4cvAW_historyList{flex:1 1 0;min-height:0;overflow-y:auto}
.kbp-root .Y4cvAW_uploadRow{margin:auto 0 0;padding-top:10px;border-top:1px solid var(--border)}
.kbp-root .Y4cvAW_footRow{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.kbp-root .Y4cvAW_footBtn{height:32px;padding:0 8px;font-size:11.5px;border:1px solid var(--border-strong);border-radius:8px}
/* ② 主内容区：随导航栏一起左移，布满剩余宽度，不再居中留白 */
.kbp-root .Y4cvAW_chat.Y4cvAW_chatRow{display:contents}
.kbp-root .Y4cvAW_chatLeft{min-width:0;min-height:0;height:100%;background:var(--card);border:0;border-radius:0;box-shadow:none}
.kbp-root .Y4cvAW_messagesWrap{flex:1 1 auto;min-height:0}
.kbp-root .Y4cvAW_messages{max-height:none;flex:1 1 auto;min-height:0}
.kbp-root .Y4cvAW_hero{flex:1 1 auto;min-height:0}
/* ③ 右侧「对话产物」栏贴边：去卡片，仅保留 1px 左分隔线 */
.kbp-root .Y4cvAW_artRail{width:262px;height:100%;min-height:0;background:var(--card);border:0;border-left:1px solid var(--border-strong);border-radius:0;box-shadow:none}
.kbp-root .Y4cvAW_artRail.Y4cvAW_artRailCollapsed{width:38px}
.kbp-root .Y4cvAW_artRailHead{padding:12px 8px 6px 12px;border-bottom:1px solid var(--border)}
.kbp-root .Y4cvAW_artRailBody{padding:10px 8px 14px}
@media(max-width:1200px){.kbp-root .Y4cvAW_panel{grid-template-columns:264px minmax(0,1fr) 234px}.kbp-root .Y4cvAW_panel.kbp-no-art{grid-template-columns:264px minmax(0,1fr) 38px}.kbp-root .Y4cvAW_artRail{display:flex}}
@media(max-width:980px){.kbp-root .Y4cvAW_panel{grid-template-columns:248px minmax(0,1fr) 200px}.kbp-root .Y4cvAW_panel.kbp-no-art{grid-template-columns:248px minmax(0,1fr) 38px}}
@media(max-width:860px){.kbp-root{overflow-y:auto}.kbp-root .Y4cvAW_panel,.kbp-root .Y4cvAW_panel.kbp-no-art{grid-template-columns:1fr}.kbp-root .Y4cvAW_sidebar{width:auto;height:auto;border-right:0;border-bottom:1px solid var(--border-strong)}.kbp-root .Y4cvAW_artRail{width:auto;border-left:0;border-top:1px solid var(--border-strong)}.kbp-root .Y4cvAW_chatLeft{min-height:520px}}


/* ============================================================================
   kbDock2-20261003 —— 知识库导航栏「收起/展开」按钮 + 分组左对齐与分界线
   ① 原 .Y4cvAW_winControls 被 display:none 隐藏，收起按钮组件与 toggleSidebar
      逻辑都已存在，只需重新显形，不改 JSX。
   ② .Y4cvAW_sectionHead 原为 justify-content:space-between，三个子元素
      （箭头 / 标题 / 加号）被拉开，标题浮到中间；改为 flex-start + 标题占满，
      使「个人知识库」「共享知识库」左对齐到同一 x。
   ③ 「共享知识库」标题行是唯一带 .Y4cvAW_sectionCount 的 sectionHead，
      用它作为「个人知识库 / 共享知识库」之间的分界线锚点。
   回滚：还原同目录 client.js.bak-dock-20261003-050136 或删除本段。
   ============================================================================ */
.kbp-root .Y4cvAW_winControls{display:flex;flex-direction:row;align-items:center;gap:4px;margin-left:auto}
.kbp-root .Y4cvAW_winBtn{display:grid;place-items:center;flex:none;width:28px;height:28px;padding:0;cursor:pointer;color:var(--muted);background:0 0;border:0;border-radius:8px;font-family:inherit}
.kbp-root .Y4cvAW_winBtn:hover{background:var(--accent-soft);color:var(--accent)}
.kbp-root .Y4cvAW_winBtn:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.kbp-root .Y4cvAW_sidebar.Y4cvAW_sidebarCollapsed .Y4cvAW_sidebarHead{justify-content:center;margin:0 0 6px}
.kbp-root .Y4cvAW_sidebar.Y4cvAW_sidebarCollapsed .Y4cvAW_winControls{margin-left:0}
.kbp-root .Y4cvAW_sectionHead{justify-content:flex-start;gap:6px;padding:4px 4px 6px}
.kbp-root .Y4cvAW_sectionHead>.Y4cvAW_sectionTitle{flex:1 1 auto;min-width:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kbp-root .Y4cvAW_sectionHead>.Y4cvAW_sectionChev,
.kbp-root .Y4cvAW_sectionHead>.Y4cvAW_sectionCount,
.kbp-root .Y4cvAW_sectionHead>.Y4cvAW_iconBtn,
.kbp-root .Y4cvAW_sectionHead>.Y4cvAW_newChatBtn{flex:none}
.kbp-root .Y4cvAW_sidebar>.Y4cvAW_sectionHead:has(.Y4cvAW_sectionCount){margin-top:14px;padding:12px 4px 6px;border-top:1px solid var(--border-strong)}
@media(max-width:860px){.kbp-root .Y4cvAW_winControls{margin-left:auto}}


/* ============================================================================
   kbDock3-20261003 —— 共享知识库/历史对话分界线 + 收起态图标 + 分组标题字号
   ① 「历史对话」行是唯一含 .Y4cvAW_newChatBtn 的 sectionHead，用它加第二道分界线，
      使 个人知识库 / 共享知识库 / 历史对话 三段之间各有 1px 分隔线。
   ② 收起（52px 窄栏）时显示 个人知识库 / 共享知识库 / 新建对话 三个图标按钮，
      对应新增的 .Y4cvAW_railNav（JSX 见同文件 sideCollapsed 分支）。
      前两个点击后展开侧栏并展开对应分组，第三个直接新建对话。
   ③ 分组标题字号 11px → 12.5px（三个 sectionHead 同步，保持层级一致）。
   回滚：删除本段并还原同目录 client.js.bak-dock3-*。
   ============================================================================ */
.kbp-root .Y4cvAW_sidebar>.Y4cvAW_sectionHead:has(.Y4cvAW_newChatBtn){margin-top:14px;padding:12px 4px 6px;border-top:1px solid var(--border-strong)}
.kbp-root .kbp-rail-nav{display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;margin-top:2px;flex:none}
.kbp-root .kbp-rail-nav-btn{display:grid;place-items:center;flex:none;width:32px;height:32px;padding:0;cursor:pointer;color:var(--muted);background:0 0;border:0;border-radius:9px;font-family:inherit;transition:background .15s,color .15s}
.kbp-root .kbp-rail-nav-btn:hover{background:var(--accent-soft);color:var(--accent)}
.kbp-root .kbp-rail-nav-btn:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

/* ============================================================================
   kbInputDSH-20261004 —— 输入框借鉴 DSH 真实 InputBar
   （packages/client/ui-conversation/src/client/skeleton/InputBar.module.css）
   卡片 22px 圆角 / 8px 顶内边距 / 12px 行距 / soft 阴影（0.5px l2 描边）；
   文本区 min-height 36px、行高 24px、字号 14px；底排 padding 2px 8px 6px；
   左「@」28px 圆形；右模型芯片 28px + 发送 34px 圆形（上移 2px）。
   配色在 .kbp-root 内**显式钉住**：本面板是恒浅色皮肤（.kbp-root 自定义 --bg/--card，
   全文无 data-ds-dark-theme 规则），若直接引用 --dsw-specific-input-major 这类主题令牌，
   宿主切深色时会得到深色值 ⇒ 深色卡片浮在浅色面板上。钉值均取 DSH 浅色主题实测值：
     --kb-input-major     = #fff        （= --dsw-specific-input-major）
     --kb-input-selector  = #f5f6f7     （= --dsw-specific-selector）
     --kb-send-fill       = #4176e6     （= --dsw-alias-button-info-fill）
     --kb-send-hover      = #7aaaff     （= --dsw-alias-button-info-hover）
     --kb-input-stroke    = rgba(0,0,0,.1)（= --dsw-alias-border-l2）
     --kb-caret           = #4176e6     （= --dsw-alias-state-business-primary）
   文字/悬停色沿用面板皮肤自身的 --text/--muted/--faint/--accent-soft。
   本段追加在 KB_PROTOTYPE_CSS 末尾，以同选择器后置覆盖旧规则；整段删除即回滚。
   ============================================================================ */
.kbp-root{--kb-input-major:#fff;--kb-input-selector:#f5f6f7;--kb-send-fill:#4176e6;--kb-send-hover:#7aaaff;--kb-input-stroke:rgba(0,0,0,.1);--kb-caret:#4176e6}
.kbp-root .Y4cvAW_composer{box-sizing:border-box;border:0;position:relative;width:min(952px,calc(100% - 32px));max-width:952px;margin:0 auto 14px;padding:8px 0 0;display:flex;flex-direction:column;gap:12px;border-radius:22px;background:var(--kb-input-major);box-shadow:0 0 0 .5px var(--kb-input-stroke),0 4px 16px 0 rgba(0,0,0,.03),0 0 24px 0 rgba(0,0,0,.03)}
.kbp-root .Y4cvAW_chipsRow{padding:2px 12px 0}
.kbp-root .Y4cvAW_input{box-sizing:border-box;width:100%;flex:none;min-height:36px;max-height:200px;height:auto;margin:0;padding:4px 12px 0 14px;background:transparent;border:0;border-radius:0;color:var(--text);caret-color:var(--kb-caret);font-size:14px;line-height:24px}
.kbp-root .Y4cvAW_input::placeholder{color:var(--faint)}
.kbp-root .Y4cvAW_composerBar{position:static;left:auto;right:auto;bottom:auto;display:flex;align-items:center;gap:12px;min-width:0;padding:2px 8px 6px}
.kbp-root .Y4cvAW_composerBar .Y4cvAW_atBtn{order:1}
.kbp-root .Y4cvAW_composerBar .Y4cvAW_barSpacer{order:2;flex:1 1 auto}
.kbp-root .Y4cvAW_composerBar .Y4cvAW_modelWrap{order:3;flex:none}
.kbp-root .Y4cvAW_composerBar .Y4cvAW_send{order:4}
.kbp-root .Y4cvAW_atBtn{width:28px;height:28px;flex:none;border:0;border-radius:999px;background:var(--kb-input-selector);color:var(--text);font-size:12px;font-weight:600}
.kbp-root .Y4cvAW_atBtn:hover{background:var(--accent-soft)}
.kbp-root .Y4cvAW_modelBtn{height:28px;max-width:210px;padding:0 4px 0 8px;border:0;border-radius:8px;background:transparent;color:var(--muted);font-size:13px;line-height:20px;font-weight:500}
.kbp-root .Y4cvAW_modelBtn:hover{background:var(--accent-soft)}
.kbp-root .Y4cvAW_send{width:34px;height:34px;flex:none;border-radius:999px;background:var(--kb-send-fill);color:#fff;transform:translateY(-2px)}
.kbp-root .Y4cvAW_send:hover:not(:disabled){background:var(--kb-send-hover)}
.kbp-root .Y4cvAW_send:disabled{opacity:.4;cursor:default}

/* ============================================================================
   kbProtoMSG-20261004 —— 消息行拉齐原型
   ① 用户气泡改回微信绿：基类 .Y4cvAW_message.Y4cvAW_user .Y4cvAW_bubble 里是 #95ec69，
      但 .kbp-root .Y4cvAW_user .Y4cvAW_bubble 同权重且后置，把它盖成了 --accent-soft（浅蓝）。
   ② 头像用 ::before 实现（用户「我」/ 助手「知」），不改 JSX 结构。
   ③ hover 工具栏：默认 opacity:0，悬停/聚焦时才显出（对齐原型「气泡下方 hover 工具栏」）。
   ============================================================================ */
.kbp-root .Y4cvAW_user .Y4cvAW_bubble{background:#95ec69;color:#182026;border-radius:14px 4px 4px 14px}
.kbp-root .Y4cvAW_message{position:relative;padding-left:38px;max-width:calc(90% + 38px)}.kbp-root .Y4cvAW_message.Y4cvAW_user{max-width:calc(80% + 38px)}/*kbMsgWidth-20261004b:AI 回复靠右铺开占 9/10；自己 8/10 保持左右不对称*/
.kbp-root .Y4cvAW_message::before{content:"知";position:absolute;left:0;top:0;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;background:linear-gradient(135deg,#2563eb,#38bdf8);box-shadow:0 2px 6px rgba(37,99,235,.28)}
.kbp-root .Y4cvAW_user{padding-left:0;padding-right:38px}
.kbp-root .Y4cvAW_user::before{content:"我";left:auto;right:0;background:#95ec69;color:#182026;box-shadow:none}
.kbp-root .kbp-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;opacity:0;transition:opacity .15s ease}
.kbp-root .Y4cvAW_message:hover .kbp-actions,.kbp-root .kbp-actions:focus-within{opacity:1}
.kbp-root .kbp-tool{height:24px;padding:0 8px;font-family:inherit;font-size:11.5px;line-height:1;color:var(--muted);background:transparent;border:0;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center}
.kbp-root .kbp-tool:hover{background:var(--accent-soft);color:var(--accent)}
.kbp-root .kbp-tool:disabled{opacity:.45;cursor:not-allowed}
.kbp-root .kbp-tool--on{color:var(--accent);background:var(--accent-soft)}
.kbp-root .kbp-tool-sep{width:1px;height:14px;background:var(--border-strong);margin:0 2px;flex:none}
.kbp-root .kbp-artifact{height:24px;padding:0 9px;font-family:inherit;font-size:11.5px;border:1px solid var(--border-strong);border-radius:999px;background:#fff;color:var(--muted);cursor:pointer;display:inline-flex;align-items:center}
.kbp-root .kbp-artifact b{color:var(--text);font-weight:600;margin-left:2px}
.kbp-root .kbp-artifact:hover{border-color:var(--accent);color:var(--accent)}
/* kbAttach-20261004c —— 去掉输入框聚焦蓝框：.kbp-root :focus-visible{outline:2px solid var(--accent)}
   （--accent:#2563eb 纯蓝）会套到 textarea 上；只豁免输入框，按钮等交互控件的键盘焦点环保留。 */
.kbp-root .Y4cvAW_input:focus,.kbp-root .Y4cvAW_input:focus-visible{outline:none;box-shadow:none}
/* 附件按钮：与 @ 按钮同尺寸同底色，只换图标 */
.kbp-root .kbp-attach{display:grid;place-items:center;font-size:15px;font-weight:600;line-height:1}
/* 拖拽落点反馈（仅拖拽过程中出现，用知识库自身的 --ok 绿，避免与刚去掉的蓝框观感冲突） */
.kbp-root .kbp-drop{outline:2px dashed var(--ok);outline-offset:-6px;border-radius:14px}
.kbp-root .kbp-dropHint{position:absolute;left:50%;top:-30px;transform:translateX(-50%);z-index:9;padding:6px 12px;border-radius:999px;background:var(--ok);color:#0f1115;font-size:12px;font-weight:600;white-space:nowrap;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.12)}
`;

		function KnowledgeBaseRoot({ wide, t, loadModels, dshLayout }) {
			// Main-slot lifetime owns this page, never a global overlay.
			const open = true;
			const [rag, setRag] = (0, react.useState)({ kind: "checking" });
			const [sessions, setSessions] = (0, react.useState)(loadSessions);
			const [activeSessionId, setActiveSessionId] = (0, react.useState)(() => sessions[0]?.id ?? makeSession().id);
	/** KT-14/T-04b：非 null = 只读离线视图（原因文案，用于顶栏常驻提示）。 */
	const [convReadOnly, setConvReadOnly] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			/** kbRefs-20261005 —— 「引用文件」分组折叠态：仅本次会话记忆，刷新即回到默认折叠。 */
			const [kbpOpenRefs, setKbpOpenRefs] = (0, react.useState)({});
			const kbpToggleRefs = (0, react.useCallback)((key) => {
				setKbpOpenRefs((prev) => ({ ...prev, [key]: prev[key] !== true }));
			}, []);
			/* kbAttach-20261004c —— 输入区附件：①回形针按钮 ②把文件/文件夹直接拖进对话框即入库。
			   上传复用工作台同一条链路 ragUploadInteractive()（内部用 window.confirm 解决重名冲突），
			   文件夹靠 DataTransferItem.webkitGetAsEntry() 递归展开并保留相对目录结构。 */
			const [kbpDrop, setKbpDrop] = (0, react.useState)(false);
			const kbpAttachInput = (0, react.useRef)(null);
			const kbpDragDepth = (0, react.useRef)(0);
			const kbpCollectEntry = async (entry, dir, out) => {
				if (!entry) return;
				if (entry.isFile) {
					try {
						const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
						if (file) out.push({ file, dir });
					} catch {}
					return;
				}
				if (!entry.isDirectory) return;
				const next = dir ? `${dir}/${entry.name}` : entry.name;
				const reader = entry.createReader();
				for (;;) {
					let kids = [];
					try { kids = await new Promise((resolve, reject) => reader.readEntries(resolve, reject)); } catch { break; }
					if (!kids.length) break;   /* readEntries 每次最多 100 条，必须循环读到空 */
					for (const kid of kids) await kbpCollectEntry(kid, next, out);
				}
			};
			const kbpUploadFiles = async (items) => {
				if (!items.length) return;
				if (!connected) { showNotice("RAG-Anything 未连接，无法入库。连接后 .txt/.md 直接入库，PDF/Office 交给解析器后台处理。"); return; }
				const batch = { policy: null };   /* 同一批重名文件只问一次覆盖策略 */
				let ok = 0, fail = 0, skipped = 0;
				const dirs = new Set();
				for (const item of items) {
					try {
						const out = await ragUploadInteractive(item.file, item.dir || void 0, batch);
						if (out.outcome === "submitted" || out.outcome === "renamed" || out.outcome === "versioned") { ok += 1; if (item.dir) dirs.add(item.dir); }
						else if (out.outcome === "failed") fail += 1;
						else skipped += 1;
					} catch { fail += 1; }
				}
				if (ok > 0) {
					showNotice(`已提交 ${ok} 个文件${dirs.size ? `（含 ${dirs.size} 个文件夹）` : ""}，正在后台解析；解析完成后状态变为「已入库」，即可直接提问。`);
					logAction("附件入库", `输入区提交 ${ok} 个文件${dirs.size ? ` · ${[...dirs].slice(0, 3).join("、")}` : ""}`);
					await refresh();
				}
				if (skipped > 0) showNotice(`已跳过 ${skipped} 个重复文件。`);
				if (fail > 0) showNotice(`${fail} 个文件上传失败（RAG-Anything 无响应或文件类型不支持）。`);
			};
			const kbpAttachChange = async (event) => {
				const input = event.target;
				const picked = Array.from(input.files || []);
				/* kbAttach-20261004c —— 必须先把文件传完再清空 input：Chromium 里 input.value = ""
				   会释放文件引用，若在 await 之前清空，随后 POST 出去的 File 内容是空的
				   （侧车会回 400 {"detail":"uploaded file is empty"}）。 */
				try {
					await kbpUploadFiles(picked.map((file) => ({ file, dir: "" })));
				} finally {
					input.value = "";   /* 传完再清空，否则连续两次选同一个文件不会再触发 change */
				}
			};
			const kbpDropProps = {
				onDragEnter: (event) => {
					if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) return;
					event.preventDefault(); event.stopPropagation();
					kbpDragDepth.current += 1; setKbpDrop(true);
				},
				onDragOver: (event) => {
					if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) return;
					event.preventDefault(); event.stopPropagation();
					event.dataTransfer.dropEffect = "copy";
					setKbpDrop(true);
				},
				onDragLeave: (event) => {
					event.preventDefault();
					kbpDragDepth.current = Math.max(0, kbpDragDepth.current - 1);
					if (kbpDragDepth.current === 0) setKbpDrop(false);
				},
				onDrop: async (event) => {
					event.preventDefault(); event.stopPropagation();
					kbpDragDepth.current = 0; setKbpDrop(false);
					const dt = event.dataTransfer;
					if (!dt) return;
					const entries = [];
					if (dt.items && dt.items.length) {
						for (const item of Array.from(dt.items)) {
							if (item.kind !== "file") continue;
							const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
							if (entry) entries.push(entry);   /* 必须在本轮事件里同步取出，await 之后 items 即失效 */
						}
					}
					const collected = [];
					for (const entry of entries) await kbpCollectEntry(entry, "", collected);
					if (!collected.length && dt.files) for (const file of Array.from(dt.files)) collected.push({ file, dir: "" });
					await kbpUploadFiles(collected);
				}
			};
			const [busy, setBusy] = (0, react.useState)(false);
            const busyRef = (0, react.useRef)(false);
            const stopRequested = (0, react.useRef)(false);
			/* kbBg-20261005:state —— 订阅模块级注册表所需的本地状态（tick 驱动重渲染/已用时保活）。 */
			const [kbBgTick, setKbBgTick] = (0, react.useState)(0);
			const [kbBgActive, setKbBgActive] = (0, react.useState)(() => kbBgRunningEntries().length);
			/** 本面板「接管」的后台条目（切页回来时恢复 busy 与停止按钮）。 */
			const kbBgAdoptedRef = (0, react.useRef)(null);
            const [supplement, setSupplement] = (0, react.useState)(null);
            const supplementRef = (0, react.useRef)(null);
            const supplementTrigger = (0, react.useRef)(null);
            const supplementOpen = Boolean(supplement);
            (0, react.useEffect)(() => {
                if (!supplementOpen) return;
                supplementTrigger.current = document.activeElement;
                const frame = window.requestAnimationFrame(() => {
                    const panel = supplementRef.current;
                    (panel?.querySelector('button:not(:disabled)') || panel)?.focus();
                });
                return () => {
                    window.cancelAnimationFrame(frame);
                    if (supplementTrigger.current?.isConnected) supplementTrigger.current.focus();
                    supplementTrigger.current = null;
                };
            }, [supplementOpen]);
            const onSupplementKey = (event) => {
                if (event.defaultPrevented || !supplementRef.current?.contains(event.target)) return;
                const panel = supplementRef.current;
                const elements = [...panel.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter((element) => element.getClientRects().length && element.getAttribute('aria-hidden') !== 'true');
                const boundary = kbDialogBoundary(event.key, event.shiftKey, elements.indexOf(document.activeElement), elements.length);
                if (!boundary) return;
                event.preventDefault(); event.stopPropagation();
                if (boundary.close) setSupplement(null);
                else (elements[boundary.focus] || panel).focus();
            };
            const [syncState, setSyncState] = (0, react.useState)(null);
            const [syncBusy, setSyncBusy] = (0, react.useState)(false);
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
			const [model, setModel] = (0, react.useState)("");
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
            const [sharedError, setSharedError] = (0, react.useState)(null);
			const [sharedExpanded, setSharedExpanded] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [sharedMenu, setSharedMenu] = (0, react.useState)(null);
			const [shareDialog, setShareDialog] = (0, react.useState)(null);
			const [sharedModal, setSharedModal] = (0, react.useState)(null);
			const [sharedBusy, setSharedBusy] = (0, react.useState)(false);
			const [sharedIsAdmin, setSharedIsAdmin] = (0, react.useState)(false);
			/** KT-04 契约：is_admin 与 can_list_users 分离——后者才决定能否拉全站账号清单。 */
			const [sharedCanListUsers, setSharedCanListUsers] = (0, react.useState)(false);
			const [sharedTrash, setSharedTrash] = (0, react.useState)(null);
			const [sharedFileMenu, setSharedFileMenu] = (0, react.useState)(null);
			const [renamingShared, setRenamingShared] = (0, react.useState)(null);
			/** kbFeat86-copyto-v3 ks — 「复制到…」目标文件夹选择弹窗状态。 */
			const [copyTo, setCopyTo] = (0, react.useState)(null);
			const sharedFileMenuRef = (0, react.useRef)(null);
			const sharedFileInputRef = (0, react.useRef)(null);
			const sharedFolderInputRef = (0, react.useRef)(null);
			const sharedUploadFolderRef = (0, react.useRef)(null);
			/** 产物行「更多操作」菜单 / 「添加到个人知识库」弹窗的状态与锚点。 */
			const [artFileMenu, setArtFileMenu] = (0, react.useState)(null);
			const [artPromote, setArtPromote] = (0, react.useState)(null);
			const [artBusy, setArtBusy] = (0, react.useState)(false);
			const artFileMenuRef = (0, react.useRef)(null);
			/** Target folder for the pending file/folder pick (null = KB root). */
			const [uploadTarget, setUploadTarget] = (0, react.useState)(null);
			/** Left browser column collapsed to a narrow rail (like the DSH main sidebar). */
			const [sideCollapsed, setSideCollapsed] = (0, react.useState)(false);
			/** 窄屏导航抽屉（kbNavDrawer-20261004）：≤860px 时侧栏为屏外抽屉，与政策解读同款。 */
			const [kbNavOpen, setKbNavOpen] = (0, react.useState)(false);
			/** 是否窄屏（≤860px）：窄屏忽略桌面端持久化的「收起」态，抽屉始终展示完整导航。 */
			const [kbNarrow, setKbNarrow] = (0, react.useState)(typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(max-width:860px)").matches : false);
			(0, react.useEffect)(() => {
				if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
				const mq = window.matchMedia("(max-width:860px)");
				const onChange = () => setKbNarrow(mq.matches);
				onChange();
				if (mq.addEventListener) mq.addEventListener("change", onChange); else mq.addListener(onChange);
				return () => { if (mq.removeEventListener) mq.removeEventListener("change", onChange); else mq.removeListener(onChange); };
			}, []);
			(0, react.useEffect)(() => {
				if (!kbNavOpen) return undefined;
				const onKey = (e) => { if (e && e.key === "Escape") setKbNavOpen(false); };
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [kbNavOpen]);
			/** 窄屏抽屉左滑关闭 + 锁定背景滚动（kbNavDrawerV2-20261004）：横向位移 ≥60px 关闭；
			 *  纵向优先的滑动交还给抽屉内滚动，避免"想翻列表却把抽屉划走"。 */
			const kbNavSwipe = (0, react.useRef)({ id: null, x: 0, y: 0, dx: 0, tracking: false, decided: false, moved: false });
			const kbNavSwipeDown = (e) => {
				if (!kbNarrow || !kbNavOpen || !e) return;
				if (e.pointerType === "mouse" && e.buttons === 0) return;
				const s = kbNavSwipe.current;
				s.id = e.pointerId; s.x = e.clientX; s.y = e.clientY;
				s.dx = 0; s.tracking = true; s.decided = false; s.moved = false;
			};
			const kbNavSwipeMove = (e) => {
				const s = kbNavSwipe.current;
				if (!s.tracking || !e || e.pointerId !== s.id) return;
				const mx = e.clientX - s.x;
				const my = e.clientY - s.y;
				if (!s.decided) {
					if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
					s.decided = true;
					if (Math.abs(my) > Math.abs(mx)) { s.tracking = false; return; }
					const node = e.currentTarget;
					if (node && node.setPointerCapture) { try { node.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ } }
				}
				s.dx = Math.min(0, mx);
				s.moved = true;
				const el = e.currentTarget;
				if (el && el.style) { el.style.transition = "none"; el.style.transform = "translateX(" + s.dx + "px)"; }
			};
			const kbNavSwipeEnd = (e) => {
				const s = kbNavSwipe.current;
				if (!s.tracking || !e || e.pointerId !== s.id) { s.tracking = false; return; }
				s.tracking = false;
				const el = e.currentTarget;
				const shouldClose = s.moved && s.dx <= -60;
				if (el && el.style) el.style.transition = "";
				if (shouldClose) setKbNavOpen(false);
				if (typeof window !== "undefined" && window.requestAnimationFrame) {
					window.requestAnimationFrame(() => { if (el && el.style) el.style.transform = ""; });
				}
				s.dx = 0; s.moved = false;
			};
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
			/**
			* P13/D-11（R-D16、R-G11）：模型是全站共享资产，**只有管理员能配置**，
			* 其他用户只有使用权。服务端是权限落点（/models 写接口 403），此处仅做
			* UI 门禁与友好提示；`can_configure_models` 缺失时按"管理员"渲染，保证
			* 旧服务端（尚未返回该字段）不被误伤。
			*/
			const [modelsCanConfigure, setModelsCanConfigure] = (0, react.useState)(true);
			/** 与 state 同源，但用 ref 读取——避免 useCallback 闭包捕获陈旧值。 */
			const modelsCanConfigureRef = (0, react.useRef)(true);
			const modelsCfgBlocked = modelsCanConfigure === false;
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
			const stickBottomRef = (0, react.useRef)(true);
			const abortTaskRef = (0, react.useRef)(null);
            const inFlightSessionIdRef = (0, react.useRef)(null);
			/**
			 * kbInput-20261003：对话输入框随内容自动增高。
			 * 高度下限/上限由 CSS（min-height 156px / max-height 360px）给出，这里只按
			 * scrollHeight 回写内联高度；超出上限时由 max-height + overflow-y:auto 接管滚动。
			 * offsetHeight-clientHeight = 上下边框，补上它才算 border-box 下的整高。
			 */
			(0, react.useEffect)(() => {
				const el = composerInput.current;
				if (el === null) return;
				el.style.height = "auto";
				el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
			}, [query]);
			(0, react.useEffect)(() => {
				const fit = () => {
					const el = composerInput.current;
					if (el === null) return;
					el.style.height = "auto";
					el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
				};
				window.addEventListener("resize", fit);
				return () => window.removeEventListener("resize", fit);
			}, []);
			const onMessagesScroll = (0, react.useCallback)(() => {
				const el = messagesRef.current;
				if (el === null) return;
				stickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
			}, []);
			const markdownLabels = (0, react.useMemo)(() => kbMarkdownLabels(), []);
			const activeSession = (0, react.useMemo)(() => sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? makeSession(), [sessions, activeSessionId]);
			/* kbBg-20261005:view —— 渲染叠加后台注册表（生成中 live / 刚定稿 patch），
			   气泡本体仍来自 React state / 缓存，叠加层只负责「续看」。 */
			const kbBgMessages = (0, react.useMemo)(() => kbBgApplyOverlay(activeSession, kbBgTick), [activeSession, kbBgTick]);
			const lastMsg = kbBgMessages[kbBgMessages.length - 1];
			const liveLen = lastMsg?.live !== void 0 ? lastMsg.live.thinking.length + lastMsg.live.answer.length : (lastMsg?.text ?? "").length;
			(0, react.useEffect)(() => {
				const el = messagesRef.current;
				if (el === null) return;
				el.addEventListener("scroll", onMessagesScroll, { passive: true });
				return () => el.removeEventListener("scroll", onMessagesScroll);
			}, [onMessagesScroll]);
			(0, react.useEffect)(() => {
				const el = messagesRef.current;
				if (el === null) return;
				if (stickBottomRef.current) el.scrollTop = el.scrollHeight;
			}, [activeSession.messages.length, liveLen]);
			/* kbBg-20261005:effects —— 模块级后台问答注册表：挂载即续看 + 定稿合并 + 停止能力恢复。 */
			const kbBgSyncBusy = (0, react.useCallback)(() => {
				const adopted = kbBgAdoptedRef.current;
				if (adopted) {
					const still = kbBgTasks.get(adopted.key);
					if (!still || still.phase !== "running") {
						/* 后台任务已定稿/已被停止：交还 busy（本实例只是「接管者」）。 */
						kbBgAdoptedRef.current = null;
						busyRef.current = false;
						abortTaskRef.current = null;
						inFlightSessionIdRef.current = null;
						setBusy(false);
						return;
					}
					if (still.taskId && abortTaskRef.current !== still.taskId) abortTaskRef.current = still.taskId;
					if (still.stopRequested && still.taskId) void kbCancelTask(still.taskId, ragFetch);
					return;
				}
				const running = kbBgRunningEntries();
				if (running.length === 0 || busyRef.current) return;
				/* 面板重新挂载后有在跑的问答 → 恢复「生成中」与停止按钮（busy/abortTaskRef）。 */
				const entry = running[0];
				kbBgAdoptedRef.current = entry;
				busyRef.current = true;
				setBusy(true);
				inFlightSessionIdRef.current = entry.sessionId;
				if (entry.taskId) abortTaskRef.current = entry.taskId;
				if (entry.stopRequested && entry.taskId) void kbCancelTask(entry.taskId, ragFetch);
			}, []);
			(0, react.useEffect)(() => {
				const sink = {
					/* 定稿合并进 React state（挂载中的 UI 更新不能少；落库已由 kbBgFinalize 独立完成）。 */
					apply: (entry, patch) => {
						setSessions((prev) => {
							const idx = prev.findIndex((s) => s && s.id === entry.sessionId);
							if (idx < 0) return prev;
							const target = prev[idx];
							const messages = kbBgMergeIntoMessages(target.messages, entry.aiIndex, entry.askText, patch, true);
							if (messages === target.messages) return prev;
							const next = prev.map((s, k) => k === idx ? {
								...s,
								messages,
								updatedAt: Date.now(),
								title: s.customTitle ? s.title : sessionTitleFromMessages(messages)
							} : s);
							saveSessions(next);
							return next;
						});
					},
					changed: () => {
						setKbBgActive(kbBgRunningEntries().length);
						kbBgSyncBusy();
						setKbBgTick((v) => v + 1);
					}
				};
				const unsubscribe = kbBgSubscribeUi(sink);
				/* 挂载即续看：已定稿但还没进 React state 的条目先补一次（幂等）。 */
				for (const entry of Array.from(kbBgTasks.values())) {
					if (entry.phase === "final" && entry.patch) sink.apply(entry, entry.patch);
				}
				sink.changed();
				return unsubscribe;
			}, [kbBgSyncBusy]);
			(0, react.useEffect)(() => {
				if (kbBgActive <= 0) {
					kbBgSyncBusy();
					return;
				}
				/* 生成中：每秒刷新一次「已用时」，并同步 busy / 停止按钮。 */
				const timer = window.setInterval(() => {
					kbBgSyncBusy();
					setKbBgTick((v) => v + 1);
				}, 1e3);
				return () => window.clearInterval(timer);
			}, [kbBgActive, kbBgSyncBusy]);
			const visibleSessions = (0, react.useMemo)(() => {
				return sessions.filter((s) => !s.archived).sort((a, b) => {
					if (a.pinned && !b.pinned) return -1;
					if (!a.pinned && b.pinned) return 1;
					return b.updatedAt - a.updatedAt;
				});
			}, [sessions]);
	const addMessage = (0, react.useCallback)((message) => {
	const stamped = {
	...(message.ts !== void 0 ? message : {
	...message,
	ts: Date.now()
	}),
	/* kbProtoMSG-20261004c —— 盖上稳定 message_id：服务端 _conv_message 会沿用调用方给的值，
	   本地与落库因此是同一条身份（否则导出后无法按 id 回填产物归属）。 */
	messageId: message.messageId || `msg-${generateId()}`
	};
	setSessions((prev) => {
	// 选中项失效时（例如迁移把本地 legacy id 换成 conversation_id）兜底写到当前展示的会话，
	// 否则用户消息会落进"不存在的会话"，表现为消息凭空消失。
	const targetId = prev.some((s) => s.id === activeSessionId) ? activeSessionId : activeSession.id;
	const next = prev.map((s) => {
	if (s.id !== targetId) return s;
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
	// KT-14/T-04b：真源在服务端；只落「用户消息」，AI 空占位气泡等 finalizeAi 定稿后再落。
	const cid = activeSession?.convId || "";
	if (cid && stamped.role === "user") {
	void kbPersistMessage(cid, stamped);
	// KT-14/T-04b：首条用户消息决定标题，同步给服务端；否则刷新后标题会回退成「新对话」。
	if (!activeSession.customTitle && activeSession.messages.length === 0) {
	void ragConversationPatch(cid, { title: sessionTitleFromMessages([stamped]) }).then((r) => {
	if (r === null || r.error) kbSignalOffline((r && r.error) || "对话服务不可用：标题未同步。");
	});
	}
	}
	}, [activeSessionId, activeSession]);
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
	/** KT-14/T-04b：只读离线态由组件显式呈现（顶栏提示 + 一次性通知）。 */
	(0, react.useEffect)(() => {
	convRuntime.onOffline = (reason) => {
	const text = reason || "对话服务不可用：当前为只读离线视图，新消息不会保存。";
	setConvReadOnly((prev) => (prev === text ? prev : text));
	showNotice(text);
	};
	return () => {
	convRuntime.onOffline = null;
	};
	}, [showNotice]);
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
                const documents = health && health.ok !== false ? await ragDocuments() : null;
                const state = kbReadState(health, documents);
                setRag(state);
                setWsGroups(state.kind === 'connected' ? await ragWorkspaceArtifacts() : null);
            }, []);
			/** ---- 共享知识库（2026-09-13）---- */
			const refreshShared = (0, react.useCallback)(async () => {
				setSharedLoading(true);
				const data = await ragSharedTree();
				setSharedLoading(false);
				if (data !== null) {
                    setSharedError(null);
					setSharedFolders(Array.isArray(data.folders) ? data.folders : []);
					setSharedUsers(Array.isArray(data.users) ? data.users : []);
					setSharedIsAdmin(data.is_admin === true);
					setSharedCanListUsers(typeof data.can_list_users === "boolean"
						? data.can_list_users
						: (data.is_admin === true || (Array.isArray(data.users) && data.users.length > 0)));
                } else {
                    setSharedFolders([]); setSharedUsers([]); setSharedIsAdmin(false); setSharedCanListUsers(false);
                    setSharedError('共享清单读取失败或无权限，数量未知，请刷新重试。');
                }
            }, []);
			(0, react.useEffect)(() => {
				if (!open) return;
				refreshShared();
			}, [open, refreshShared]);
			/**
			* KT-04 契约：普通用户不再随 /shared/tree 收到全站账号清单，只有管理员
			* 能按需拉 GET /shared/users。非管理员保持空清单，仅影响"选人"，不影响共享库可用性。
			*/
			const loadSharedUsers = (0, react.useCallback)(async () => {
				try {
					const res = await ragFetch("/shared/users");
					if (!res.ok) return;
					const data = await res.json().catch(() => ({}));
					setSharedUsers(Array.isArray(data.users) ? data.users : []);
				} catch {
					/* 拉取失败保持空清单：不阻塞共享库其它功能 */
				}
			}, []);
			(0, react.useEffect)(() => {
				if (sharedCanListUsers) loadSharedUsers();
			}, [sharedCanListUsers, loadSharedUsers]);
			const toggleSharedFolder = (0, react.useCallback)((name) => {
				setSharedExpanded((prev) => {
					const next = new Set(prev);
					if (next.has(name)) next.delete(name);
					else next.add(name);
					return next;
				});
			}, []);
			const sharedTree = (0, react.useMemo)(() => buildSharedTree(sharedFolders), [sharedFolders]);
			const sharedVisibleRows = (0, react.useMemo)(() => flattenSharedRows(sharedTree, sharedExpanded), [sharedTree, sharedExpanded]);
			/** kbFeat86-copyto — 共享文件/文件夹「复制到...」：选择个人 KB 目标文件夹并逐个复制。
			 *  同名由 /upload 的 on_duplicate=ask 兜底 → 409 → 询问是否覆盖。 */
			/** kbFeat86-copyto-v3 —— 去掉「共享/」前缀，得到可落到个人 KB 的相对路径。 */
			const copyTargetPath = (title) => String(title || "").replace(/^共享\//, "").split("/").slice(0, -1).join("/");

			/** kbFeat86-copyto-v3 —— 打开「复制到…」弹窗（共享 → 个人）。 */
			const openCopyTo = (0, react.useCallback)((items) => {
				const list = (Array.isArray(items) ? items : []).filter(Boolean);
				if (list.length === 0) return;
				setCopyTo({ items: list, folder: "", busy: false });
			}, []);

			/** kbFeat86-copyto-v3 —— 执行复制：逐个抓共享文件 → ragUploadInteractive，
			 *  同名由 /upload 的 on_duplicate=ask 兜底 → 409 → 询问是否覆盖（复用同一批策略）。 */
			const executeCopyTo = (0, react.useCallback)(async () => {
				const st = copyTo;
				if (!st || st.busy) return;
				setCopyTo({ items: st.items, folder: st.folder, busy: true });
				const dst = String(st.folder || "").trim().replace(/^\/+|\/+$/g, "");
				setSharedBusy(true);
				let ok = 0, fail = 0, skipped = 0;
				let batchPolicy = null;
				for (const d of st.items) {
					const fname = String(d.title || d.docId || "file").replace(/\\/g, "/").split("/").pop() || "file";
					const sub = copyTargetPath(d.title || "");
					const targetDir = [dst, sub].filter(Boolean).join("/");
					try {
						const res = await fetch(ragSharedFileUrl(d.docId || d.doc_id, 0));  // kbFeat86-shareddocid
						if (!res.ok) { fail++; continue; }
						const blob = await res.blob();
						const f = new File([blob], fname, { type: blob.type || "application/octet-stream" });
						const out = await ragUploadInteractive(f, targetDir, {
							get policy() { return batchPolicy; },
							set policy(v) { batchPolicy = v; }
						});
						if (!out || out.outcome === "failed") { fail++; continue; }
						if (out.outcome === "skipped") { skipped++; continue; }
						ok++;
					} catch { fail++; }
				}
				setSharedBusy(false);
				setCopyTo(null);
				showNotice(
					fail === 0
						? `已复制 ${ok} 个文件到个人知识库${skipped ? `（跳过 ${skipped} 个）` : ""}。`
						: `复制完成：成功 ${ok} 个，跳过 ${skipped} 个，失败 ${fail} 个。`);
				logAction("复制到个人知识库", `目标「${dst || "根目录"}」成功 ${ok} / 失败 ${fail}`);
				if (ok > 0) refresh();
			}, [copyTo, showNotice, logAction, refresh]);

			const copySharedToPersonal = (0, react.useCallback)(async (items, docs) => {
				const list = (items && items.length ? items : docs || []).filter(Boolean);
				if (!list.length) return;
				openCopyTo(list);
			}, [openCopyTo]);
			/** kbFeat86-copyto — 收集一个共享文件夹（含子层级）下的全部文件，供「复制到...」使用。 */
			const collectSharedFolderDocs = (0, react.useCallback)((node) => {
				const out = [];
				const walk = (n) => { for (const f of n.files) out.push(f.doc); for (const c of n.children) walk(c); };
				if (node) walk(node);
				return out;
			}, []);

			/** kbFeat86-retry — 重新解析一个失败的个人 KB 文件。
			 *  优先走 /index/reingest（按 manifest dest name 重跑入库）；
			 *  若匹配不上（例如仅存在于 failures 账本），回退 /failures/retry。 */
			const retryParseFile = (0, react.useCallback)(async (file) => {
				const label = displayName(file) + (file.ext ? `.${file.ext}` : "");
				const name = file.name || file.docId || label;
				let started = false, note = "";
				// kbFeat86-copyto-v3 —— 服务器补出的失败行带 failure_id（账本 id），
				// 精确命中比按文件名猜 /index/reingest 可靠得多。
				const fid0 = file.failureId || file.failure_id || file.fid;
				if (fid0) {
					try {
						const r0 = await ragFetch("/failures/retry", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ id: fid0 })
						});
						if (r0.ok) {
							const d0 = await r0.json().catch(() => ({}));
							started = d0.started === true || !!d0.id;
							if (!started) note = d0.detail || "";
						} else if (r0.status === 404) {
							note = "账本条目已失效";
						} else {
							note = `HTTP ${r0.status}`;
						}
					} catch { note = "无响应"; }
				}
				try {
					const res = await ragFetch("/index/reingest", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ name })
					});
					if (res.ok) {
						const d = await res.json().catch(() => ({}));
						started = d.started === true || d.total === 1;
						if (!started) note = d.note || d.detail || "";
					} else {
						note = `HTTP ${res.status}`;
					}
				} catch { note = "无响应"; }
				if (!started) {
					const fid = file.failureId || file.fid || file.docId;
					if (fid) {
						try {
							const r2 = await ragFetch("/failures/retry", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ id: fid })
							});
							if (r2.ok) { const d2 = await r2.json().catch(() => ({})); started = d2.started === true || !!d2.id; }
						} catch { /* ignore */ }
					}
				}
				showNotice(started ? `已开始重新解析「${label}」。` : `重新解析失败：${note || "RAG-Anything 未受理"}`);
				logAction("重新解析", `${label} → ${started ? "已受理" : "失败"}`);
				if (started) {
					// kbFeat86-retryimmediate — 受理后立刻刷新，让「解析中」马上可见；
					// 否则首次刷新在 +4s，快速失败的重试会错过整个解析中窗口。
					refresh();
					const t0 = Date.now();
					const tick = async () => {
						await refresh();
						if (Date.now() - t0 < 9e4) window.setTimeout(tick, 5000);
					};
					window.setTimeout(tick, 4000);
				}
			}, [showNotice, logAction, refresh]);

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
				let skipped = 0;
				let covered = 0;  // kbFeat86-sharedtrash — 覆盖替换计数
				/** kbFeat86-sharedup-client — 同名/同内容命中时提示是否覆盖。 */
				const publishOne = async (blob, fname, destFolder, policy) => {
					const fd = new FormData();
					fd.append("file", blob, fname);
					fd.append("folder", destFolder);
					fd.append("user", MU_NS_RAW);
					if (policy) fd.append("on_duplicate", policy);
					return fetch(`${ragBaseUrl()}/shared/publish`, { method: "POST", body: fd });
				};
				for (const d of dlg.docs) {
					try {
						const res = await fetch(`${ragBaseUrl()}/documents/${encodeURIComponent(d.docId)}/file`);
						if (!res.ok) throw new Error("source file");
						const blob = await res.blob();
						const fname = (d.title || d.docId).replace(/\\/g, "/").split("/").pop() || "file";
						// kbFeat86-sharesrcroot — 保留源文件夹名作为一层，避免在目标下新建零散子目录
						const _relClean = String(d.rel || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
						const _relDir2 = _relClean.split("/").slice(0, -1).filter(Boolean).join("/");
						const _srcRoot2 = SHARE_KEEP_SRC_ROOT ? String(d.srcRoot || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "") : "";
						const _dp = [];
						if (_srcRoot2) _dp.push(_srcRoot2);
						if (_relDir2) _dp.push(_relDir2);
						const _tgt = String(target || "").replace(/\/+$/, "");
						const destFolder = _dp.length ? `${_tgt}/${_dp.join("/")}` : _tgt;
						let pr = await publishOne(blob, fname, destFolder, void 0);
						if (pr.status === 409) {
							let info = {};
							try { info = (await pr.json()).detail || {}; } catch {}
							const why = info.match_type === "quick" ? "已存在同名且内容相同的文件" : "已存在同名文件";
							// kbFeat86-sharedtrash — 覆盖只替换这一个文件，目录树结构保持不变。
							const ok2 = window.confirm(`「${destFolder}」下${why}：\n「${fname}」\n\n是否覆盖？\n覆盖后目录树保持不变，仅替换该文件（旧文件移入回收箱）。\n\n「确定」= 覆盖　「取消」= 跳过该文件`);
							pr = await publishOne(blob, fname, destFolder, ok2 ? "overwrite" : "skip");
							if (ok2 && pr.ok) covered++;  // kbFeat86-sharedtrash
						}
						if (pr.ok) {
							let d2 = {};
							try { d2 = await pr.clone().json(); } catch {}
							if (d2 && d2.skipped) skipped++;
							else ok++;
						} else fail++;
					} catch {
						fail++;
					}
				}
				setSharedBusy(false);
				setShareDialog(null);
				showNotice(
					fail === 0
						? `已共享 ${ok} 个文件到「${target}」${covered ? `（其中覆盖替换 ${covered} 个，目录树未变）` : ""}${skipped ? `（跳过 ${skipped} 个）` : ""}。`
						: `共享完成：成功 ${ok} 个（覆盖 ${covered} 个），跳过 ${skipped} 个，失败 ${fail} 个。`);
				logAction("共享至共享知识库", `「${target}」成功 ${ok} / 覆盖 ${covered} / 跳过 ${skipped} / 失败 ${fail}`);
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
			/** kbFeat86-trashall — 全部还原（仅管理员）。 */
			const restoreAllSharedTrash = (0, react.useCallback)(async () => {
				if (!window.confirm("将把回收箱内全部条目还原回共享知识库。确认全部还原？")) return;
				const r = await ragSharedTrashRestoreAll();
				if (r === null) showNotice("全部还原失败：RAG-Anything 无响应。");
				else if (r.error) showNotice(`全部还原失败：${r.error}`);
				else showNotice(`已全部还原（${r.restored ?? 0} 个文件夹${r.skipped ? `，跳过 ${r.skipped} 个同名` : ""}）。`);
				await openSharedTrash();
				refreshShared();
			}, [showNotice, openSharedTrash, refreshShared]);
			/** kbFeat86-trashall — 全部删除（仅管理员）。 */
			const purgeAllSharedTrash = (0, react.useCallback)(async () => {
				if (!window.confirm("将彻底删除回收箱内全部条目，其文档与索引数据会被永久移除，不可恢复。确认全部删除？")) return;
				const r = await ragSharedTrashPurgeAll();
				if (r === null) showNotice("全部删除失败：RAG-Anything 无响应。");
				else if (r.error) showNotice(`全部删除失败：${r.error}`);
				else {
					const errN = Array.isArray(r.errors) ? r.errors.length : 0;
					showNotice(`已全部删除（${r.purged ?? 0} 条，移除 ${r.removed_docs ?? 0} 个文档${errN ? `，${errN} 个失败` : ""}）。`);
				}
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
				if (snap !== null) {
					setModelsSnap(normaliseModelsSnap(snap));
					const canCfg = typeof snap.can_configure_models === "boolean" ? snap.can_configure_models : true;
					setModelsCanConfigure(canCfg);
					modelsCanConfigureRef.current = canCfg;
				}
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
				if (modelsCanConfigureRef.current === false) {
					showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
					return;
				}
				if (await ragModelDownload(modelId) === null) showNotice("下载失败：RAG-Anything 无响应。");
			}, [showNotice]);
			/** Persist the default model for one category. */
			const applyModelSelect = (0, react.useCallback)(async (category, payload) => {
				const res = await ragModelSelect(category, payload);
				if (modelsCanConfigureRef.current === false) {
					showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
					return;
				}
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
				if (modelsCanConfigureRef.current === false) {
					showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
					return;
				}
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
				if (modelsCanConfigureRef.current === false) {
					showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
					return;
				}
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
				if (modelsCanConfigureRef.current === false) {
					showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
					return;
				}
				if (!f.name.trim() || !f.base_url.trim() || !f.model.trim()) {
					showNotice("请填写名称、Base URL 与模型 ID。");
					return;
				}
				setAddModelBusy(true);
				// F1（task-20）：空值 = 保持不变（绝不提交空字符串清空已存 key）；只有用户新输入才带 api_key。
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
			/** Never manufacture available model IDs when discovery fails. */
			const catalogModelOptions = modelOptions;
			/** Custom configs registered for a category (llm/vision/embedding). */
			const customOptionsFor = (0, react.useCallback)((category) => {
			return modelsSnap?.custom_models?.[category] ?? [];
			}, [modelsSnap]);
			/** F1（task-20）：当前表单指向的已有自定义配置（只用于「已配置」提示，绝不回填明文 key）。 */
			const addModelExisting = (0, react.useMemo)(() => {
			const modelId = addModelForm.model.trim();
			if (!modelId) return null;
			return customOptionsFor(addModelForm.category).find((c) => String(c?.model || "") === modelId) || null;
			}, [customOptionsFor, addModelForm.category, addModelForm.model]);
			/** key_present=true → 已配置；未升级服务端仍返回真值 api_key 时同样按「已配置」处理（不误伤）。 */
			const addModelKeyPresent = addModelExisting !== null && (addModelExisting.key_present === true || (addModelExisting.key_present === void 0 && typeof addModelExisting.api_key === "string" && addModelExisting.api_key !== ""));
			const addModelKeyHint = addModelExisting === null ? "" : addModelKeyPresent ? "该模型已配置 API Key（留空 = 保持不变）。" : "该模型尚未配置 API Key。";
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
			/** Formal main page navigation never changes the global sidebar. */
			const closeKbPanel = (0, react.useCallback)(() => {
				dshLayout?.goHome?.();
			}, [dshLayout]);
			(0, react.useEffect)(() => { refresh(); }, [refresh]);
	/** KT-14/T-04b：会话态镜像 ref（异步合并时需要读到最新列表，避免闭包旧值）。 */
	const sessionsStateRef = (0, react.useRef)(sessions);
	(0, react.useEffect)(() => {
	sessionsStateRef.current = sessions;
	}, [sessions]);
	/** KT-14/T-04b：记住当前对话 id（本标签页 sessionStorage；刷新后据此恢复选中项）。 */
	(0, react.useEffect)(() => {
	convRuntime.activeId = activeSessionId;
	try {
	window.sessionStorage.setItem(ACTIVE_CONV_KEY, activeSessionId || "");
	} catch {}
	}, [activeSessionId]);
	/**
	* KT-14/T-04b：连接后从服务端拉对话清单，并做一次性旧键迁移。
	* 服务端不可用（含尚未部署 /conversations 的旧服务端）⇒ 显式只读离线：
	* 仍旧展示本地缓存供查看，但不写回 localStorage、不假装保存成功。
	*/
	(0, react.useEffect)(() => {
	if (!open) return;
	let live = true;
	const pullList = async () => {
	const list = await ragConversationList();
	if (!live) return null;
	if (list === null || list.error) return null;
	convRuntime.serverMode = true;
	convRuntime.offline = false;
	setConvReadOnly(null);
	const items = list.items;
	const prev = sessionsStateRef.current;
	const byId = new Map(prev.map((s) => [s.id, s]));
	const merged = items.map((it) => {
	const cid = String(it.conversation_id);
	const cached = byId.get(cid);
	const ts = Date.parse(String(it.updated_at || ""));
	if (cached) return {
	...cached,
	title: typeof it.title === "string" && it.title ? it.title : cached.title,
	updatedAt: Number.isFinite(ts) ? ts : cached.updatedAt
	};
	return kbSessionFromListItem(it);
	});
	for (const s of prev) if (s.localOnly && !merged.some((m) => m.id === s.id)) merged.unshift(s);
	const next = merged.length > 0 ? merged : [makeSession()];
	sessionsStateRef.current = next;
	setSessions(next);
	saveSessions(next);
	setActiveSessionId((prevId) => (next.some((s) => s.id === prevId) ? prevId : next[0].id));
	return list;
	};
	(async () => {
	const first = await pullList();
	if (!live) return;
	if (!first) {
	kbSignalOffline("对话服务不可用（服务端未提供 /conversations）：当前为只读离线视图，新消息不会保存。");
	return;
	}
	const mark = await migrateLegacyKeys();
	if (!live) return;
	if (mark && mark.pending > 0) showNotice("旧数据迁移未完成：" + mark.pending + " 条待续传，下次打开自动继续。");
	// 迁移进来的旧对话要立刻出现在侧栏（否则用户在首屏会以为旧对话丢了）。
	if (mark && mark.migrated > 0) await pullList();
	const savedActive = (() => {
	try { return window.sessionStorage.getItem(ACTIVE_CONV_KEY) || ""; } catch { return ""; }
	})();
	if (savedActive) setActiveSessionId((prevId) => (sessionsStateRef.current.some((s) => s.id === savedActive) ? savedActive : prevId));
	await refresh();
	})();
	return () => { live = false; };
	}, [open, refresh, showNotice]);
	/** 激活的对话若只有骨架（正文未加载），按 conversation_id 补拉一次完整实体。 */
	(0, react.useEffect)(() => {
	const cur = sessions.find((s) => s.id === activeSessionId);
	if (!cur || !cur.convId || cur.convLoaded || convRuntime.offline) return;
	let live = true;
	ragConversationGet(cur.convId).then((ent) => {
	if (!live || ent === null) return;
	if (ent.error) { showNotice(ent.error); return; }
	setSessions((prev) => prev.map((s) => (s.id === cur.id ? kbSessionFromEntity(ent, s) : s)));
	});
	return () => { live = false; };
	}, [activeSessionId, sessions, showNotice]);
			(0, react.useEffect)(() => () => {
				if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
			}, []);
			(0, react.useEffect)(() => {
				if (!folderMenu && !fileMenu && !sessionMenu && !plusMenu && !sharedMenu && !sharedFileMenu && !artFileMenu) return;
				const closeAll = () => {
					setFolderMenu(null);
					setFileMenu(null);
					setSessionMenu(null);
					setPlusMenu(null);
					setSharedMenu(null);
					setSharedFileMenu(null);
					setArtFileMenu(null);
				};
				const onDown = (e) => {
					const target = e.target;
					if (folderMenuRef.current?.contains(target) || fileMenuRef.current?.contains(target) || sessionMenuRef.current?.contains(target) || plusMenuRef.current?.contains(target) || sharedMenuRef.current?.contains(target) || sharedFileMenuRef.current?.contains(target) || artFileMenuRef.current?.contains(target)) return;
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
				sharedFileMenu,
				artFileMenu
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
					setModel((prev) => !prev || options.some((o) => JSON.stringify([o.provider, o.id]) === prev) ? prev : "");
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
			/** Real catalogue options only; a failed catalogue has no invented options. */
			const modelGroups = (0, react.useMemo)(() => {
				if (modelOptions.length === 0) return [];
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
					group.options.push({ ...option, key: JSON.stringify([option.provider, option.id]) });
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
			/** KT-03/D-3②：本对话产物 = 知识库产物/ 前缀 **且** 不是工作区镜像（优先按服务端 origin）。 */
			const productDocs = (0, react.useMemo)(() => docs.filter((d) => {
				const t = (d.title || "").replace(/\\/g, "/");
				return t.startsWith(`${PIN_KB}/`) && isConversationArtifactRecord(d, t);
			}), [docs]);
			const kbDocs = (0, react.useMemo)(() => docs.filter((d) => isPersonalFolder((d.title || "").replace(/\\/g, "/"))), [docs]);
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
			const realFolders = connected ? groupDocsIntoFolders(kbDocs) : [];
			/**
			* 对话产物（**仅用户显式导出**生成：Word/Excel/PPT/Markdown；已按 origin 排除
			* 工作区镜像与 legacy 之外的非本对话文件）按会话分组，供对话框
			* 右侧的「对话产物」栏使用。产物只落盘、不入库（不解析/不向量化/不进
			* 实体图谱），因此不会污染知识库；需要用它的内容时，在产物行点
			* 「更多操作 → 添加到个人知识库」，或「@文件」直接引用其正文。
			*/
			const artifactGroups = (0, react.useMemo)(() => {
				const activeDir = (activeSession?.title || "").replace(/\\/g, "/").split("/").map(sanitizeSeg).join("/");
				const activeSessDir = sessionDirOf(activeSession);
				const activeSessId = String(activeSession?.id || "");
	// KT-14/T-04b：产物归属主键 = conversation_id（服务端 provenance 字段）。
	// P1-1（2026-10-03 修复）：本地会话（makeSession 造的会话**没有** convId）的
	// 产物归属键 = activeSession.id；服务端会话 id === convId，行为不变。
	// 原实现恒与 "" 比较 ⇒ 导出产物的 conversation_id 永不等于 ""，产物从右侧
	// 「对话产物」栏消失（只在「历史产物 / 更多产物」里可见）。
	const activeConvId = String(activeSession?.convId || activeSessId);
				const perDir = /* @__PURE__ */ new Map();
				for (const d of productDocs) {
					const parts = (d.title || d.id).replace(/\\/g, "/").split("/");
					const dir = parts.length >= 3 ? parts.slice(1, -1).map(sanitizeSeg).join("/") : "未命名会话";
	// KT-14/T-04b：优先按 conversation_id 归属（服务端 provenance）；旧数据无该字段时
	// 回退 session_id / 目录段（legacy 兼容，行为与 KT-03 一致）。
	const convId = String(d.conversation_id || "");
	const sid = String(d.session_id || "");
	const owned = convId
	? convId === activeConvId
	: sid
	? sid === activeSessId
	: dir === activeSessDir;
					if (!owned) continue;
					const base = parts[parts.length - 1] || d.id;
					const m = /\.([A-Za-z0-9]+)$/.exec(base);
					const ext = (m?.[1] ?? "md").toLowerCase();
					// Markdown is a genuine artifact too; do not hide it.
					const name = m && m[1] ? base.slice(0, -(m[1].length + 1)) : base;
					const list = perDir.get(dir) ?? [];
					list.push({
						name,
						ext,
						dir,
						docId: d.id,
						origin: artifactOriginOf(d),
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
}, [productDocs, activeSession]);
			const folders = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map();
				const put = (name, files) => {
					const list = map.get(name);
					if (list) list.push(...files);
					else map.set(name, files.slice());
				};
				for (const f of realFolders) {
					if (!isPersonalFolder(f.name)) continue;
					put(f.name, f.files);
				}
				for (const name of customFolders) if (!map.has(name) && isPersonalFolder(name)) map.set(name, []);
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
                    const folderPath = kbFolderReference(folder.name, false);
                    if (folderPath) items.push({
                        label: folder.name, path: folderPath,
                        kind: "folder"
                    });
					for (const file of folder.files) {
                        const path = kbCanonicalFilePath(file, docs, []);
                        if (path) items.push({ label: displayName(file), path, kind: 'file' });
                    }
				}
				const mf = mentionFilter.trim().toLowerCase();
				return mf ? items.filter((i) => i.label.toLowerCase().includes(mf)) : items;
			}, [folders, docs, renamedFiles, mentionFilter]);
			/** Attach a @-reference chip (deduped) above the composer input. */
			const addChip = (0, react.useCallback)((chip) => {
				setChips((prev) => kbAddChip(prev, chip));
			}, []);
			const removeChip = (0, react.useCallback)((chip) => {
				setChips((prev) => kbRemoveChip(prev, chip));
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
	setQuery("");
	setMentionOpen(false);
	setChips([]);
	setSelectedDoc(null);
	setViewingDoc(null);
	// KT-14/T-04b：新对话先 POST /conversations 拿不可变 conversation_id。
	if (convRuntime.offline) {
	const local = { ...makeSession(), localOnly: true };
	kbSignalOffline("离线只读：新对话不会保存，服务恢复后请重新发起。");
	setSessions((prev) => [local, ...prev]);
	setActiveSessionId(local.id);
	return;
	}
	ragConversationCreate("新对话").then((ent) => {
	if (ent === null) { kbSignalOffline("对话服务不可用：新对话未创建（未写入本地缓存）。"); return; }
	if (ent.error) { showNotice(ent.error); return; }
	const created = kbSessionFromEntity(ent, null);
	created.messages = [];
	setSessions((prev) => {
	const next = [created, ...prev];
	saveSessions(next);
	return next;
	});
	setActiveSessionId(created.id);
	});
	}, [showNotice]);
			const switchSession = (0, react.useCallback)((id) => {
				setActiveSessionId(id);
				setQuery("");
				setMentionOpen(false);
				setChips([]);
				setSelectedDoc(null);
				setViewingDoc(null);
			}, []);
	const deleteSession = (0, react.useCallback)(async (id) => {
	if (kbSessionMutationBlocked(inFlightSessionIdRef.current, id)) { showNotice('请等待当前回答结束后再删除该对话。'); return; }
	const target = sessions.find((s) => s.id === id);
	const title = target?.title || "该对话";
	if (!window.confirm("确认删除对话「" + title + "」？\n删除后不可恢复。")) return;
	// KT-14/T-04b：服务端对话先软删，成功后再改本地；失败绝不动本地（不假装成功）。
	if (target?.convId) {
	if (convRuntime.offline) { showNotice("离线只读：无法删除服务端对话，请恢复连接后重试。"); return; }
	const r = await ragConversationDelete(target.convId);
	if (r === null) { kbSignalOffline("对话服务不可用：删除未执行（本地未改动）。"); return; }
	if (r.error) { showNotice(r.error); return; }
	}
	setSessions((prev) => {
	const result = kbEnsureActiveSession(prev.filter((s) => s.id !== id), activeSessionId, makeSession);
	saveSessions(result.sessions); setActiveSessionId(result.activeId); return result.sessions;
	});
	}, [activeSessionId, sessions, showNotice]);
	const clearCurrentChat = (0, react.useCallback)(() => {
	if (kbSessionMutationBlocked(inFlightSessionIdRef.current, activeSessionId)) { showNotice('请等待当前回答结束后再清空该对话。'); return; }
	// KT-14/T-04b：服务端是唯一真源，冻结契约没有"清空消息"路由 ⇒ 不假装清空。
	// 离线本地会话（localOnly）可以本地清空，因为它本来就不落服务端。
	const cur = sessions.find((s) => s.id === activeSessionId);
	if (cur?.convId && !cur.localOnly) {
	showNotice("对话真源在服务端：本版暂不支持清空历史消息（如需请删除并新建对话）。");
	return;
	}
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
	}, [activeSessionId, sessions, showNotice]);
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
	const target = sessions.find((s) => s.id === id);
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
	// KT-14/T-04b：标题真源在服务端；离线只读时只做本次显示并显式提示。
	if (target?.convId && !target.localOnly) {
	if (convRuntime.offline) showNotice("离线只读：标题改动仅本次显示，未同步到服务端。");
	else void ragConversationPatch(target.convId, { title: trimmed }).then((r) => {
	if (r === null || r.error) kbSignalOffline((r && r.error) || "对话服务不可用：标题未同步到服务端。");
	});
	}
	// 方案 B：目录名由会话 id 决定，改名不会让产物失联；这里只是把
	// 该会话名下的产物目录段刷成新标题，让左侧文件夹名跟着走。
	ragArtifactSession(target?.convId || id, trimmed).then((r) => {
	if (r !== null && !r.error) refresh();
	});
	}, [refresh, sessions, showNotice]);
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
			const docCount = targets.reduce((n, folder) => n + folder.files.filter((file) => !file.docId.startsWith("wsfile:")).length, 0);
			if (!window.confirm(`确认删除文件夹「${folderName}」？\n将连同其子文件夹一起删除其中 ${docCount} 个入库文档，此操作不可恢复。`)) {
				setFolderMenu(null);
				return;
			}
			logAction("删除文件夹", folderName);
				for (const folder of targets) for (const file of folder.files) if (!file.docId.startsWith("wsfile:")) await ragDeleteDoc(file.docId);
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
			const mentionFolder = (0, react.useCallback)((folderName, shared = false) => {
                const path = kbFolderReference(folderName, shared);
                if (!path) { showNotice('“全部文档”是虚拟分组，不能作为文件夹范围引用；请选择具体文件。'); setFolderMenu(null); return; }
                addChip({ label: folderName, path, kind: 'folder' });
				setFolderMenu(null);
				composerInput.current?.focus();
			}, [addChip, showNotice]);
			const mentionFile = (0, react.useCallback)((folderName, file) => {
                const path = kbCanonicalFilePath(file, docs, sharedFolders.flatMap((folder) => folder.docs || []));
                if (!path) { showNotice('引用原始路径不可用，请刷新文档清单后重新选择。'); return; }
                addChip({ label: displayName(file) + (file.ext ? '.' + file.ext : ''), path, kind: 'file' });
				setFileMenu(null);
				composerInput.current?.focus();
			}, [displayName, addChip, docs, sharedFolders, showNotice]);
			const deleteFileAction = (0, react.useCallback)(async (file) => {
				if (file.docId.startsWith("wsfile:")) {
					showNotice(`"${file.name}" 是 DSH 工作区产物的只读镜像，请到对应工作区内删除源文件。`);
					setFileMenu(null);
					return;
				}

				if (!window.confirm(`确认删除文件「${file.name}.${file.ext}」？\n该文档及其索引数据将从知识库中移除，此操作不可恢复。`)) {
					setFileMenu(null);
					return;
				}
				await ragDeleteDoc(file.docId);
					logAction("删除文件", `${file.name}.${file.ext}`);
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
                if (kbSessionMutationBlocked(inFlightSessionIdRef.current, id)) { showNotice('请等待当前回答结束后再归档该对话。'); return; }
                setSessions((prev) => {
                    const result = kbArchiveSessions(prev, id, activeSessionId, makeSession, Date.now());
                    saveSessions(result.sessions); setActiveSessionId(result.activeId); return result.sessions;
                });
                setSessionMenu(null);
            }, [activeSessionId, showNotice]);
			/**
			* 把 @ 引用翻译成真正会下发给检索的作用域。
			* @文件    -> files（精确全等匹配，只用它回答）
			* @文件夹  -> folders（前缀匹配，含所有子文件夹）
			* @知识库 / 未指定 -> undefined（全库检索）
			*/
            const scopeFromChips = kbScopeFromChips;
            const requestTaskStop = (0, react.useCallback)(async (taskId = abortTaskRef.current) => {
                if (!taskId) return false;
                const stopped = await kbCancelTask(taskId, ragFetch);
                if (!stopped) showNotice('停止请求失败，请重试。');
                return stopped;
            }, [showNotice]);
			/* ================= kbTask-20261003 =================
			   多轮上下文（最近 3 轮 / ≤6 条）与「继续深挖」执行体。
			   history 只取纯文本并截断，避免把来源卡等重数据重复上送。 */
			const kbHistoryFor = (session, uptoIndex) => {
				const out = [];
				for (let i = Math.max(0, uptoIndex - 6); i < uptoIndex; i += 1) {
					const mm = session.messages[i];
					if (!mm || typeof mm.text !== "string" || !mm.text.trim()) continue;
					if (mm.role !== "user" && mm.role !== "ai") continue;
					out.push({ role: mm.role === "ai" ? "assistant" : "user", text: mm.text.slice(0, 2e3) });
				}
				return out.slice(-6);
			};
			/** 快稿 → 深挖：同一气泡内换成深挖版，旧稿留档 variants。 */
			const deepDive = async (m, index) => {
				const q = String(m && m.askText || "").trim();
				if (!q || busyRef.current) return;
				busyRef.current = true;
				setBusy(true);
				const session = activeSession;
				const patchMsg = (patch) => setSessions((prev) => prev.map((s) => {
					if (s.id !== session.id) return s;
					return {...s, messages: s.messages.map((mm, i) => i === index ? {...mm, ...patch} : mm)};
				}));
				patchMsg({ deepBusy: true, deepError: void 0 });
				try {
					const res = await ragAskLive(q, "hybrid", (p) => patchMsg({ live: p }), 9e5,
						void 0, void 0, void 0,
						{ deep: true, intent: m.intent, history: kbHistoryFor(session, index) });
					if (res && typeof res.answer === "string" && res.answer.trim() && res.mode !== "error") {
						patchMsg({
							live: void 0, deepBusy: false, text: res.answer,
							thinking: res.thinking ?? m.thinking,
							sources: normalizeKbSources(res.sources),
							stage: res.stage || "deep",
							variants: [...(m.variants || []), { text: m.text, ts: m.ts }]
						});
					} else {
						patchMsg({ live: void 0, deepBusy: false, deepError: "深挖失败，请稍后重试" });
					}
				} catch (err) {
					patchMsg({ live: void 0, deepBusy: false,
						deepError: String(err && err.message || err).slice(0, 120) });
				} finally {
					busyRef.current = false;
					setBusy(false);
				}
			};
			const send = async (overrideText) => {
				const text = String(overrideText ?? query).trim();
				if (!text || busyRef.current) return;
				const sentMentions = chips.length > 0 ? [...chips] : void 0;
				let sentScope, sentModel;
                try { sentScope = scopeFromChips(chips); sentModel = kbTaskModel(model, modelOptions); } catch (err) { showNotice(err.message); return; }
                busyRef.current = true; stopRequested.current = false;
				setQuery("");
				setMentionOpen(false);
				setChips([]);
				addMessage({
					role: "user",
					text,
					...sentMentions ? { mentions: sentMentions } : {}
				});
				stickBottomRef.current = true;
				logAction("知识库问答", text.slice(0, 200));
				setBusy(true);
				addMessage({
					role: "ai",
					text: "",
					/* kbTask-20261003：深挖要用原问题重新检索，故在气泡上留档 */
					askText: text
				});
				const session = activeSession;
                inFlightSessionIdRef.current = session.id;
				const aiIndex = session.messages.length + 1;
				/* kbBg-20261005:send1 —— 把本次生成登记到模块级注册表：面板卸载后 runner 继续跑，
				   回来后按 key 续看（live 进度 / 定稿结果）；不再依赖 React state。 */
				const bgEntry = kbBgRegister({
					sessionId: session.id,
					convId: session.convId || "",
					aiIndex,
					askText: text
				});
				/* kbBg-20261005:send2 —— 定稿脱离 React：kbBgFinalize 内部先写 localStorage 缓存
				   （kbPersistFinalMessage：loadSessions→合并→saveSessions），再落服务端，最后通知
				   已挂载的 UI 订阅者把结果合并回 React state（挂载中照常更新，二者都不少）。
				   live 进度改由注册表驱动渲染（kbBgSetLive → 订阅者 → 叠加层）。 */
				const finalizeAi = (patch) => {
					kbBgFinalize(bgEntry, patch);
				};
	try {
				if (connected) {
					const res = await ragAskLive(text, "hybrid", (p) => {
						/* kbBg-20261005:send3 —— 进度写注册表（卸载后也保留），由订阅者驱动渲染。 */
						kbBgSetLive(bgEntry, p);
					}, 9e5, sentScope, (id) => {
                        abortTaskRef.current = id;
                        kbBgSetTaskId(bgEntry, id);
                        if (stopRequested.current) void requestTaskStop(id);
                    }, sentModel, {
						/* P2-20260707：普通提问也上送多轮上文（此前只有「继续深挖」上送），
						   否则「它 / 这个 / 继续」这类追问在服务端看不到任何上下文。 */
						history: kbHistoryFor(session, session.messages.length)
					});
					if (res && res.status === "cancelled") finalizeAi({
						text: "\uFF08\u5DF2\u505C\u6B62\u751F\u6210\uFF09",
						ts: Date.now()
					});
					else if (res === null) finalizeAi({
						text: "检索失败：RAG-Anything 无响应",
						ts: Date.now()
					});
					else {
						finalizeAi({
							text: res.answer,
							thinking: res.thinking,
							/* kbTask-20261003：快稿标记 → 前端据此显示「继续深挖」 */
							intent: res.intent, stage: res.stage, askText: text,
                            sources: normalizeKbSources(res.sources), generationModel: res.generationModel,
                            generationModels: res.generationModels, sourcesStatus: res.sourcesStatus, sourcesReason: res.sourcesReason, status: res.mode === "error" ? "error" : "done",
							ts: Date.now()
						});
						// KT-02：问答结束不再把「问答记录」写成产物（原则 P1：产物只包含
						// 生成的文件，每次对话不应作为产物）。此前的自动 .md / Office 分支
						// 整条删除；对话消息本身由上面的 finalizeAi() 落服务端对话实体（KT-14/T-04b），
						// 用户显式导出仍走回答气泡上的 exportAnswerAs()。
					}
				} else {
					finalizeAi({ text: "知识库未连接，无法检索。请同步后重试。", status: "error", ts: Date.now() });
				}
                } catch (err) { finalizeAi({ text: '检索失败：' + err.message, status: 'error', ts: Date.now() }); }
                finally { busyRef.current = false; abortTaskRef.current = null; inFlightSessionIdRef.current = null; setBusy(false); }
            };
            const viewDoc = async (file) => {
				setSelectedDoc(file);
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

			/** 打开一行产物的「更多操作」菜单。 */
			const openArtFileMenu = (0, react.useCallback)((file, anchor) => {
				setArtFileMenu((prev) => prev && prev.file.docId === file.docId ? null : { file, anchor });
			}, []);
			/** 「添加到个人知识库」：默认落点「对话产物」文件夹。 */
			const openArtPromote = (0, react.useCallback)((file) => {
				if (!connected) {
					showNotice("RAG-Anything 未连接，无法加入知识库。");
					return;
				}
				const def = folders.some((f) => f.name === "对话产物") ? "对话产物" : "__new__";
				setArtPromote({ file, folder: def, newFolder: "对话产物" });
			}, [connected, folders, showNotice]);
			const executeArtPromote = (0, react.useCallback)(async () => {
				const dlg = artPromote;
				if (!dlg || artBusy) return;
				const raw = dlg.folder === "__new__" ? dlg.newFolder : dlg.folder;
				const folder = String(raw || "").trim().replace(/^\/+|\/+$/g, "");
				setArtBusy(true);
				const r = await ragArtifactPromote(dlg.file.docId, folder);
				setArtBusy(false);
				if (r === null) {
					showNotice("添加失败：RAG-Anything 无响应。");
					return;
				}
				if (r.error) {
					showNotice(`添加失败：${r.error}`);
					return;
				}
				setArtPromote(null);
				showNotice(`已复制到个人知识库「${folder || "根目录"}」，后台解析入库中。`);
				logAction("产物加入个人知识库", r.display_path);
				refresh();
			}, [artPromote, artBusy, showNotice, logAction, refresh]);
			/** 重命名（只改显示名，扩展名由服务端保留）。 */
			const renameArtifact = (0, react.useCallback)(async (file) => {
				const next = window.prompt(t("kb.artifactsRenamePrompt"), file.name);
				if (next === null) return;
				const name = next.trim();
if (!name || name === file.name) return;
				const r = await ragArtifactRename(file.docId, name);
				if (r === null) showNotice("重命名失败：RAG-Anything 无响应。");
				else if (r.error) showNotice(`重命名失败：${r.error}`);
				else {
					showNotice(`已重命名为「${r.name}」。`);
					logAction("重命名产物", `${file.name}.${file.ext} → ${r.name}`);
					refresh();
				}
			}, [t, showNotice, logAction, refresh]);
			/** 下载产物原始文件。 */
			const downloadArtifact = (0, react.useCallback)(async (file) => {
				try {
					const res = await ragFetch(`/documents/${encodeURIComponent(file.docId)}/file?download=1`);
					if (!res.ok) {
						showNotice("下载失败：服务端拒绝。");
						return;
					}
					const blob = await res.blob();
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `${displayName(file)}${file.ext ? `.${file.ext}` : ""}`;
					document.body.appendChild(a);
					a.click();
					a.remove();
					window.setTimeout(() => URL.revokeObjectURL(url), 4e3);
					logAction("下载产物", `${file.name}.${file.ext}`);
				} catch {
					showNotice("下载失败：RAG-Anything 无响应。");
				}
			}, [displayName, showNotice, logAction]);
			/** 删除产物（文件入回收站 7 天）。 */
			const deleteArtifact = (0, react.useCallback)(async (file) => {
				const label = `${file.name}.${file.ext}`;
				if (!window.confirm(t("kb.artifactsDeleteConfirm").replace("{name}", label))) return;
				const r = await ragArtifactDelete(file.docId);
				if (r === null) showNotice("删除失败：RAG-Anything 无响应。");
				else if (r.error) showNotice(`删除失败：${r.error}`);
				else {
					showNotice(`已删除「${label}」，文件在回收站保留 ${r.retention_days ?? 7} 天。`);
					logAction("删除产物", label);
					refresh();
				}
			}, [t, showNotice, logAction, refresh]);
			/** 将一条 AI 回答导出为 Word/Excel/PPT 产物（sidecar 生成后入库到 知识库产物）。 */
			const exportAnswerAs = (0, react.useCallback)(async (answerText, fmt, index) => {
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
				const sessSegs = sessionDirOf(activeSession);
				const title = `${PIN_KB}/${sessSegs}/${qName}-${hhmmss}.${fmt}`;
				logAction("生成Office文件", `${fmt.toUpperCase()} · ${title.split("/").pop()}`);
				const r = await ragIngestOffice(answerText, title, fmt, activeSession?.id || "");
				if (r !== null) {
					/* kbProtoMSG-20261004b —— sidecar 会按内容做语义命名（_semantic_artifact_title），
					   客户端拼的 title 只是建议路径。必须用返回的真实文件名，否则 chip/提示
					   显示的名字与右侧「对话产物」里的实际文件对不上。 */
					const artName = (r && r.file ? String(r.file).split("/").pop() : "") || title.split("/").pop();
					if (typeof index === "number") {
						const sid = activeSession && activeSession.id;
						/* kbProtoMSG-20261004c —— 产物挂到该条消息。
						   本地 `artifact` 只服务本次会话的即时显示；跨刷新靠 `artifactIds`，
						   因为服务端冻结 schema 会剥掉自造字段，只认 artifact_ids。 */
						const _m = (activeSession && Array.isArray(activeSession.messages) && activeSession.messages[index]) || null;
						const _prevIds = _m && Array.isArray(_m.artifactIds) ? _m.artifactIds : [];
						const _newIds = r && r.doc_id ? Array.from(new Set([..._prevIds, String(r.doc_id)])) : _prevIds;
						if (sid) setSessions((prev) => {
							const next = prev.map((s) => s.id !== sid ? s : {...s, messages: s.messages.map((mm, i) => i === index ? {...mm, artifact: artName, artifactIds: _newIds} : mm)});
							/* 必须写回本地缓存：面板刷新后对「已加载」的会话（convLoaded=true）直接信任缓存，
							   只改内存的话 chip 会随刷新消失——真实使用路径（刚提问完就导出）必现，
							   而种子验收因缓存只是空桩、会回源取详情，反而测不出来。 */
							saveSessions(next);
							return next;
						});
						const _cid = (activeSession && activeSession.convId) || "";
						const _mid = _m && _m.messageId;
						if (_cid && _mid && _newIds.length) void ragConversationPatch(_cid, {
							message_artifacts: [{
								message_id: _mid,
								artifact_ids: _newIds
							}]
						}).then((res) => {
							if (res === null || res.error) showNotice("产物已生成，但归属未同步到服务端：刷新后本条的产物标记可能不再显示。");
						});
					}
					showNotice(`已生成 ${fmt.toUpperCase()} 文件并加入右侧「对话产物」：${artName}（仅文件，不进入知识库索引）`);
					refresh();
				} else {
					showNotice("生成失败：RAG-Anything 无响应或生成出错。");
				}
			}, [
				connected,
				activeSession,
				showNotice,
				logAction,
				refresh,
				setSessions
			]);
			/** kbProtoMSG-20261004 —— 复制本条回答到剪贴板。 */
			const copyAnswer = (0, react.useCallback)(async (text) => {
				try {
					await navigator.clipboard.writeText(String(text ?? ""));
					showNotice("已复制本条回答。");
				} catch (err) {
					showNotice("复制失败：" + (err && err.message || err));
				}
			}, [showNotice]);
			/** kbProtoMSG-20261004 —— 有用 / 没用（同值再点取消）。 */
			const markFeedback = (0, react.useCallback)((index, value) => {
				const sid = activeSession && activeSession.id;
				if (!sid) return;
				setSessions((prev) => prev.map((s) => s.id !== sid ? s : {...s, messages: s.messages.map((mm, i) => i === index ? {...mm, feedback: mm.feedback === value ? void 0 : value} : mm)}));
			}, [activeSession, setSessions]);
			/** kbProtoMSG-20261004 —— 用同一条提问重新生成（走既有 send 管线，追加一轮）。 */
			const regenerate = (0, react.useCallback)(async (index) => {
				const msgs = activeSession && activeSession.messages || [];
				const m = msgs[index];
				let q = String(m && m.askText || "").trim();
				if (q === "") for (let k = index - 1; k >= 0; k--) {
					const mm = msgs[k];
					if (mm && mm.role === "user") { q = String(mm.text || "").trim(); break; }
				}
				if (q === "") { showNotice("找不到对应的提问，无法重新生成。"); return; }
				if (busyRef.current) { showNotice("正在生成中，请稍后再试。"); return; }
				await send(q);
			}, [activeSession, showNotice, send]);

			/** 打包下载整个文件夹:枚举文件夹及其子文件夹的全部文件,交给 sidecar 打成 zip。 */
			const downloadFolder = (0, react.useCallback)(async (fullPath) => {
				if (!connected) {
					showNotice("RAG-Anything 未连接，无法打包下载文件夹。");
					return;
				}
				const entries = folders.filter((f) => f.name === fullPath || f.name.startsWith(`${fullPath}/`));
				const items = [];
				for (const f of entries) for (const file of f.files) {
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
            const openSource = async (source) => {
                const authorized = source.shared ? sharedFolders.flatMap((f) => f.docs || []) : docs;
                const doc = kbResolveSource(source, authorized);
                if (!doc) { showNotice('来源原文当前不可用或无权限：' + source.file_path); return; }
                if (source.shared) return viewSharedDoc(doc);
                const base = (doc.title || '').split('/').pop();
                const ext = base.includes('.') ? base.split('.').pop() : '';
                return viewDoc({ name: ext ? base.slice(0, -(ext.length + 1)) : base, ext, docId: doc.id, hasFile: doc.has_file === true, status: doc.status });
            };
            const readSync = async () => {
                try { const res = await ragFetch('/workspace/sync'); if (!res.ok) throw new Error('HTTP ' + res.status); setSyncState(await res.json()); }
                catch (err) { setSyncState({ error: err.message }); }
            };
            const syncWorkspace = async () => {
                if (syncBusy || !window.confirm('同步工作区文件会更新知识库索引，确认执行？')) return;
                setSyncBusy(true);
                try { const res = await ragFetch('/workspace/sync', { method: 'POST' }); if (!res.ok) throw new Error('HTTP ' + res.status); setSyncState(await res.json()); await refresh(); }
                catch (err) { setSyncState({ error: err.message }); }
                finally { setSyncBusy(false); }
            };
            const e = react.createElement;
            const action = (label, onClick, disabled = false) => e('button', { type: 'button', className: 'kbp-action', disabled, onClick }, label);
            const currentArtifactIds = new Set(artifactGroups.flatMap((g) => g.files.map((file) => file.docId)));
            const artifactRows = (supplement === 'current-artifacts' ? artifactGroups.flatMap((g) => g.files) : productDocs.filter((doc) => supplement !== 'history-artifacts' || !currentArtifactIds.has(doc.id)).map((d) => {
                const parts = d.title.split('/'); const base = parts.pop(); const ext = base.includes('.') ? base.split('.').pop() : '';
                return { docId: d.id, dir: parts.slice(1).join('/'), name: ext ? base.slice(0, -(ext.length+1)) : base, ext, hasFile: d.has_file === true, status: d.status };
            }));
            const supplementalBody = supplement === 'archives' ? e('div', null,
                sessions.filter((s) => s.archived).length === 0 && e('p', null, '暂无归档对话'),
                sessions.filter((s) => s.archived).map((s) => e('div', { key: s.id, className: 'kbp-manager-row' }, e('span', null, s.title),
                    action('恢复并打开', () => { setSessions((prev) => { const next = prev.map((item) => item.id === s.id ? { ...item, archived: false } : item); saveSessions(next); return next; }); setActiveSessionId(s.id); setSupplement(null); }),
                    action('删除', () => deleteSession(s.id), busy)))) : supplement === 'sync' ? e('div', null,
                e('p', null, '刷新清单仅检查连接与读取个人、共享和产物；工作区同步入库将更新索引。'),
                action('刷新全部清单（GET）', async () => { await Promise.all([refresh(), refreshShared()]); showNotice('清单刷新已结束，请查看真实连接状态。'); }),
                action('工作区同步入库（POST）', syncWorkspace, syncBusy), action('读取同步进度', readSync),
                syncState && e('pre', null, JSON.stringify(syncState, null, 2))) : e('div', null,
                !connected ? e('p', { role: 'status' }, '产物清单暂不可用，数量未知') : artifactRows.length === 0 && e('p', null, '暂无产物'),
                artifactRows.map((file) => e('div', { key: file.docId, className: 'kbp-manager-row' },
                    action(file.name + (file.ext ? '.' + file.ext : ''), () => { setSupplement(null); viewDoc(file); }),
                    action('引用', () => { mentionFile(PIN_KB + '/' + file.dir, file); setSupplement(null); }),
                    action('下载', () => downloadArtifact(file)), action('加入个人库', () => { setSupplement(null); openArtPromote(file); }),
                    action('加入共享库', () => { setSupplement(null); openShareDialog([{ docId: file.docId, title: `${PIN_KB}/${file.dir}/${file.name}${file.ext ? '.' + file.ext : ''}` }]); }),
                    action('改名', () => renameArtifact(file)), action('删除', () => deleteArtifact(file)))),
                supplement === 'artifacts' && e('section', null, e('h3', null, '工作区文件（DSH 工作区只读镜像 · 非本对话产物）'),
                    wsGroups === null ? e('p', null, '工作区镜像暂不可用') : wsGroups.map((group) => e('div', { key: group.path }, e('h4', null, group.title),
                        group.files.map((f) => e('div', { key: f.path, className: 'kbp-manager-row' },
                            action(f.rel || f.name, () => { setSupplement(null); viewDoc({ docId: 'wsfile:' + f.path, name: f.name, ext: f.ext, hasFile: true }); }),
                            action('下载', () => triggerDownload(ragWorkspaceDownloadUrl(f.path)))))))));
            const supplementalDialog = supplement && e('div', { className: 'kbp-modal', onClick: () => setSupplement(null) },
                e('section', { ref: supplementRef, role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'kbp-dialog-title', tabIndex: -1,
                    className: 'kbp-dialog' + (supplement.endsWith('artifacts') ? ' kbp-art-drawer' : ''), onKeyDown: onSupplementKey,
                    onClick: (event) => event.stopPropagation() },
                    e('header', null, e('b', { id: 'kbp-dialog-title' }, supplement === 'archives' ? '归档对话' : supplement === 'sync' ? '同步知识库' : supplement === 'artifacts' ? '更多产物' : supplement === 'history-artifacts' ? '历史产物' : '对话产物'),
                        action('关闭', () => setSupplement(null))),
                    supplement.endsWith('artifacts') && e('nav', { 'aria-label': '产物范围', className: 'kbp-art-tabs' },
                        ['current-artifacts', 'history-artifacts', 'artifacts'].map((mode, index) => e('button', {
                            key: mode, type: 'button', className: 'kbp-action', 'aria-pressed': supplement === mode,
                            onClick: () => setSupplement(mode) }, ['当前对话', '历史产物', '更多产物'][index]))),
                    supplementalBody));
            const statusText = rag.kind === "checking" ? "RAG-Anything · 检测中…" : connected ? `RAG-Anything · ${rag.initialized ? "已连接" : "初始化中"} · ${kbDocs.length} 篇文档` : (rag.error || "RAG-Anything · 未连接，数量未知");
			const KB_NAV_DRAWER_CSS = `
/* ============================================================================
   kbNavDrawer-20261004 —— 窄屏导航栏改为屏外抽屉（对齐政策解读 @local/policy-analysis 1.5.3）
   ① ≤860px：侧栏脱离文档流 = 左侧抽屉（默认屏外 translateX(-110%)），不再以 126px
      横条占据主内容区顶部；对话区左上角出现 .kbp-navmenu 汉堡入口；
   ② 抽屉展开时渲染 .kbp-navscrim 遮罩，点遮罩 / Esc / 抽屉内「收起侧边栏」均可关闭；
   ③ 修 :has(.Y4cvAW_sidebarCollapsed) 特异性(0,3,0) 压过 ≤860px 单列规则(0,2,0)
      导致「窄屏收起后对话区被挤成 98px」：窄屏显式复写为单列（带 !important）；
   ④ ≥861px 完全不受影响，新增规则全部包在媒体查询内（.kbp-navmenu/.kbp-navscrim
      基态 display:none）。
   回滚：删除本段 + 还原同目录 client.js.bak-kbnavdrawer-<ts>。
   ============================================================================ */
.kbp-root .kbp-navmenu{display:none}
.kbp-root .kbp-navscrim{display:none}
/* kbNavDrawerV2-20261004 ② 抽屉展开时锁住背景滚动（类只在窄屏+抽屉打开时挂上） */
.kbp-root.kbp-nav-lock{overflow:hidden}
@media(max-width:860px){
  .kbp-root .Y4cvAW_panel,
  .kbp-root .Y4cvAW_panel.kbp-no-art,
  .kbp-root .Y4cvAW_panel:has(.Y4cvAW_sidebarCollapsed),
  .kbp-root .Y4cvAW_panel.kbp-no-art:has(.Y4cvAW_sidebarCollapsed){grid-template-columns:1fr!important}
  .kbp-root .kbp-navmenu{display:grid;place-items:center;flex:none;width:32px;height:32px;margin:10px 10px 0;padding:0;border:1px solid var(--border-strong);border-radius:9px;background:var(--card);color:var(--text);font-size:15px;line-height:1;cursor:pointer;position:relative;z-index:30}
  .kbp-root .kbp-navmenu:hover{background:var(--accent-soft);color:var(--accent)}
  .kbp-root .kbp-navmenu:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .kbp-root .Y4cvAW_sidebar,
  .kbp-root .Y4cvAW_sidebar.Y4cvAW_sidebarCollapsed{position:absolute;left:0;top:0;bottom:0;z-index:1202;width:min(280px,86vw)!important;max-width:none;height:auto;min-height:0;padding:14px 12px 12px;align-items:stretch;background:var(--card);border:0;border-right:1px solid var(--border-strong);border-bottom:0;border-radius:0;box-shadow:8px 0 24px rgba(16,28,48,.18);transform:translateX(-110%);transition:transform .16s ease;overflow:hidden}
  .kbp-root .Y4cvAW_sidebar.kbp-nav-open{transform:translateX(0)}
  /* kbNavDrawerV2-20261004 ① 抽屉用 pan-y：纵向交还滚动，横向留给手势 */
  .kbp-root .Y4cvAW_sidebar{touch-action:pan-y;overscroll-behavior:contain}
  /* kbNavDrawerV2-20261004 ③ 抽屉内当前项高亮加强（仅在窄屏抽屉内，桌面侧栏不受影响） */
  .kbp-root .Y4cvAW_sidebar .Y4cvAW_historyItemActive{background:var(--accent-soft);color:var(--accent);font-weight:650;box-shadow:inset 3px 0 0 var(--accent)}
  .kbp-root .Y4cvAW_sidebar .Y4cvAW_historyItemActive .Y4cvAW_historyTitle{color:var(--accent)}
  /* kbNavDrawerV3-20261004 ⑤ 弹层必须盖住抽屉（抽屉 z-index:1202；弹窗默认只有 1000） */
  .kbp-root .Y4cvAW_modalOverlay{z-index:1300}
  .kbp-root .kbp-modal{z-index:1400}
  .kbp-root .Y4cvAW_notice{z-index:1350}
  .kbp-root .kbp-navscrim{display:block;position:absolute;inset:0;z-index:1201;margin:0;padding:0;border:0;background:rgba(16,28,48,.32);cursor:pointer}
}
`;
			return (0, react_jsx_runtime.jsxs)("div", { className: kbNarrow && kbNavOpen ? "kbp-root kbp-nav-lock" : "kbp-root", children: [
				(0, react_jsx_runtime.jsx)("style", { children: KB_PROTOTYPE_CSS + KB_NAV_DRAWER_CSS }),
                supplementalDialog,
				(0, react_jsx_runtime.jsxs)("header", { className: "kbp-topbar", children: [
					(0, react_jsx_runtime.jsxs)("div", { children: [
						(0, react_jsx_runtime.jsx)("div", { className: "kbp-kicker", children: "Xuanji AI Chat" }),
						(0, react_jsx_runtime.jsx)("h2", { children: "本地构建 · AI 知识库" }),
						(0, react_jsx_runtime.jsx)("p", { children: "本地私有知识库与共享知识协同，支持文件精确引用与来源追溯" })
					]}),
					(0, react_jsx_runtime.jsxs)("div", { className: "kbp-pills", children: [
						(0, react_jsx_runtime.jsx)("span", { className: connected ? "kbp-pill kbp-ok" : "kbp-pill", children: statusText }),
						(0, react_jsx_runtime.jsx)("span", { className: "kbp-pill", children: connected ? `${kbDocs.length} 篇文档 · ${realFolders.length} 个文件夹` : "文档数量未知 · 文件夹数量未知" }),
	(0, react_jsx_runtime.jsx)("span", { className: "kbp-pill", title: convReadOnly || "", children: "只读 · 离线（对话不保存）" }),
						(0, react_jsx_runtime.jsx)("button", { className: "kbp-art-entry", onClick: () => setSupplement("current-artifacts"), children: connected ? `对话产物 ${artifactGroups.reduce((n, g) => n + g.files.length, 0)}` : "对话产物 · 数量未知" })
					]})
				]}),
				(0, react_jsx_runtime.jsxs)("div", {
					className: "kbp-content",
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: clsx(KnowledgeBaseRoot_module_css_default.panel, artRailCollapsed && "kbp-no-art"),
						"aria-label": t("kb.title"),
						children: [
							kbNavOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { type: "button", className: "kbp-navscrim", "aria-label": t("kb.collapseSidebar"), onClick: () => setKbNavOpen(false) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
								className: clsx(KnowledgeBaseRoot_module_css_default.sidebar, sideCollapsed && !kbNarrow && KnowledgeBaseRoot_module_css_default.sidebarCollapsed, kbNavOpen && "kbp-nav-open"),
								onPointerDown: kbNavSwipeDown,
								onPointerMove: kbNavSwipeMove,
								onPointerUp: kbNavSwipeEnd,
								onPointerCancel: kbNavSwipeEnd,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.sidebarHead,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "kbp-headbrand",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "kbp-brandicon",
												"aria-hidden": true,
												children: "知"
											}), (!sideCollapsed || kbNarrow) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.sidebarTitle,
												children: t("kb.title")
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.winControls,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.winBtn,
												onClick: kbNarrow ? () => setKbNavOpen(false) : toggleSidebar,
												"aria-label": kbNarrow ? t("kb.collapseSidebar") : sideCollapsed ? t("kb.expandSidebar") : t("kb.collapseSidebar"),
												title: kbNarrow ? t("kb.collapseSidebar") : sideCollapsed ? t("kb.expandSidebar") : t("kb.collapseSidebar"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutlineRegular, { size: sideCollapsed ? 18 : 16 })
											})
										})]
									}),
									(!sideCollapsed || kbNarrow) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
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
													onClick: () => { setKbNavOpen(false); setSupplement("sync"); },
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 })
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: KnowledgeBaseRoot_module_css_default.search,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
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
													children: personalOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12 })
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
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 })
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
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 13 }), t("kb.newFolder")]
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
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.uploadFolder")]
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
																																}), file.status === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: clsx(KnowledgeBaseRoot_module_css_default.fileStatus, KnowledgeBaseRoot_module_css_default[`st-${file.status}`]),
																	children: statusLabel(file.status)
																}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: clsx(KnowledgeBaseRoot_module_css_default.fileStatus, KnowledgeBaseRoot_module_css_default[`st-${file.status}`]),
																	children: statusLabel(file.status)
																})]
															}),
															file.status === "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.fileRetryBtn,
																title: t("kb.retryParse"),
																"aria-label": t("kb.retryParse"),
																onClick: (e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	retryParseFile(file);
																},
																onMouseDown: (e) => e.stopPropagation(),
																children: t("kb.retryParse")
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
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, { size: 14 })
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
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 13 }), t("kb.renameFile")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			downloadFile(fileMenu.file);
																			setFileMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { size: 13 }), t("kb.downloadFile")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			viewDoc(fileMenu.file);
																			setFileMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutlineRegular, { size: 13 }), t("kb.previewInClient")]
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
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.shareTo")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: clsx(KnowledgeBaseRoot_module_css_default.menuItem, KnowledgeBaseRoot_module_css_default.menuItemDanger),
																		onClick: () => {
																			deleteFileAction(fileMenu.file);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 13 }), t("kb.deleteFile")]
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
																		children: isOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12 })
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: clsx(KnowledgeBaseRoot_module_css_default.folderIcon, (PIN_ORDER.includes(folder.fullPath) || folder.fullPath === PIN_SYNC) && (folder.fullPath === PIN_DSH ? KnowledgeBaseRoot_module_css_default.pinIconDsh : KnowledgeBaseRoot_module_css_default.pinIconKb)),
																		children: folder.fullPath === PIN_DSH ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutlineRegular, { size: 14 }) : folder.fullPath === PIN_KB ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkleRegular, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 14 })
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
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, { size: 14 })
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
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 13 }), t("kb.newFolder")]
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
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.uploadFolder")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			downloadFolder(folderMenu.folder);
																			setFolderMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { size: 13 }), t("kb.downloadFolder")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			const docs = [];
																			const walkShare = (node) => {
																				const relDir = node.fullPath === folderMenu.folder ? "" : node.fullPath.slice(folderMenu.folder.length + 1);
																				// kbFeat86-sharesrcroot — 源文件夹自身名字（共享时作为目标下的一层保留）
																				const _srcRoot = String(folderMenu.folder || "").replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() || "";
																				for (const f of node.files) {
																					const base = renamedFiles[f.docId] ?? `${f.name}${f.ext ? `.${f.ext}` : ""}`;
																					const rel = relDir ? `${relDir}/${base}` : base;
																					docs.push({ docId: f.docId, title: base, rel, srcRoot: _srcRoot });
																				}
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
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.shareTo")]
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
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 13 }), t("kb.renameFolder")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: clsx(KnowledgeBaseRoot_module_css_default.menuItem, KnowledgeBaseRoot_module_css_default.menuItemDanger),
																		onClick: () => {
																			deleteFolderAction(folderMenu.folder);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 13 }), t("kb.deleteFolder")]
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
													children: sharedOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12 })
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
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 })
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
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 14 })
												})
											]
										}),
										sharedOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: KnowledgeBaseRoot_module_css_default.folderList,
											children: !connected || sharedError ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
                                                className: KnowledgeBaseRoot_module_css_default.empty,
                                                children: sharedError || t("kb.sharedOffline")
											}) : sharedFolders.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.empty,
												children: sharedLoading ? t("kb.sharedLoading") : t("kb.sharedEmpty")
											}) : sharedVisibleRows.map((entry) => {
												if (entry.kind === "file") {
													const doc = entry.file.doc;
													const sBase = (doc.title || doc.doc_id).replace(/\\/g, "/");
													const sMatch = /^.*\.([A-Za-z0-9]+)$/.exec(entry.file.name);
													const sName = entry.file.name;
													const sBaseName = sMatch ? sName.slice(0, -(sMatch[1].length + 1)) : sName;
													const sExt = sMatch ? sMatch[1] : "";
													return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: KnowledgeBaseRoot_module_css_default.fileRowWrap,
														style: { marginLeft: 18 + entry.node.depth * 16 },
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
																	else setSharedFileMenu({ folder: entry.node.fullPath, doc: { docId: doc.doc_id, doc_id: doc.doc_id, title: doc.title, name: sBaseName, ext: sExt, status: doc.status, has_file: doc.has_file === true }, anchor: e.currentTarget });
																},
																onMouseDown: (e) => e.stopPropagation(),
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, { size: 14 })
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
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 13 }), t("kb.sharedRename")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			downloadSharedFile(sharedFileMenu.folder, sharedFileMenu.doc);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.sharedDownload")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: () => {
																			viewSharedDoc(sharedFileMenu.doc);
																			setSharedFileMenu(null);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.sharedOpenPreview")]
																	}),
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																		type: "button",
																		className: KnowledgeBaseRoot_module_css_default.menuItem,
																		onClick: async () => {
																			const _doc = sharedFileMenu.doc;
																			setSharedFileMenu(null);
																			await copySharedToPersonal([{ docId: _doc.docId, title: _doc.title }]);
																		},
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.copyTo")]
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
																		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 13 }), t("kb.sharedDeleteFile")]
																	})
																]
															})
														]
													}, doc.doc_id);
												}
												const node = entry.node;
												const sf = node.node;
												const isRootNode = node.depth === 0;
												const isOpenS = entry.isOpen;
												const _countFiles = (n) => n.files.length + n.children.reduce((s, c) => s + _countFiles(c), 0); const _childCount = _countFiles(node);
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: KnowledgeBaseRoot_module_css_default.folderGroup,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: clsx(KnowledgeBaseRoot_module_css_default.folderRow, isOpenS && KnowledgeBaseRoot_module_css_default.folderRowOpen),
															style: node.depth > 0 ? { marginLeft: node.depth * 16 } : void 0,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																	type: "button",
																	className: KnowledgeBaseRoot_module_css_default.folder,
																	"aria-expanded": isOpenS,
																	onClick: () => toggleSharedFolder(node.fullPath),
																	children: [
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.folderChevron,
																			children: isOpenS ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 12 })
																		}),
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.folderIcon,
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 14 })
																		}),
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.folderName,
																			children: isRootNode ? (sf.display || sf.name) : node.name
																		}),
																		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			className: KnowledgeBaseRoot_module_css_default.folderCount,
																			children: _childCount
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
																		if (sharedMenu?.folder === node.fullPath) setSharedMenu(null);
																		else setSharedMenu({ folder: node.fullPath, anchor: e.currentTarget, canManage: sf.can_manage, isRoot: isRootNode });
																	},
																	onMouseDown: (e) => e.stopPropagation(),
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, { size: 14 })
																}),
																sharedMenu?.folder === node.fullPath && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	ref: sharedMenuRef,
																	className: KnowledgeBaseRoot_module_css_default.folderMenu,
																	style: menuFixedStyle(sharedMenu.anchor, 200),
																	children: [
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							mentionFolder(sf.name, true);
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
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 13 }), t("kb.sharedMembersEdit")]
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							setSharedModal({ mode: "create", name: `${node.fullPath}/`, members: (sf.members || []).slice() });
																							setSharedMenu(null);
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.sharedNewFolder")]
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							sharedUploadFolderRef.current = node.fullPath;
																							setSharedMenu(null);
																							sharedFileInputRef.current?.click();
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 13 }), t("kb.sharedUploadFiles")]
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							sharedUploadFolderRef.current = node.fullPath;
																							setSharedMenu(null);
																							sharedFolderInputRef.current?.click();
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.sharedUploadFolder")]
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							downloadSharedFolder(node.fullPath);
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.sharedDownload")]
																					}),
																					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: async () => {
																							setSharedMenu(null);
																							const _docs = collectSharedFolderDocs(node);
																							if (!_docs.length) { showNotice("该文件夹下没有可复制的文件。"); return; }
																							await copySharedToPersonal(_docs);
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.copyTo")]
																					}),
																					sf.can_manage && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																						type: "button",
																						className: KnowledgeBaseRoot_module_css_default.menuItem,
																						onClick: () => {
																							setRenamingShared({ kind: "folder", folder: sf.name, value: sf.display || sf.name });
																							setSharedMenu(null);
																						},
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 13 }), t("kb.sharedRename")]
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
																						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 13 }), t("kb.sharedDelete")]
																					}),
																					!sf.can_manage && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																						className: KnowledgeBaseRoot_module_css_default.menuNote,
																						children: `${t("kb.sharedCreatedBy")}${sf.created_by || "-"}`
																					})
																	]
																})
															]
														})
													]
												}, node.fullPath);
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: KnowledgeBaseRoot_module_css_default.sectionHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: KnowledgeBaseRoot_module_css_default.sectionTitle,
												children: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [t("kb.history"), (0, react_jsx_runtime.jsx)("button", { type: "button", className: "kbp-link", onClick: () => { setKbNavOpen(false); setSupplement("archives"); }, children: "归档对话" })] })
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.newChatBtn,
												onClick: () => { newConversation(); if (kbNarrow) setKbNavOpen(false); },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 13 }), t("kb.newChat")]
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
														onClick: () => { switchSession(session.id); if (kbNarrow) setKbNavOpen(false); },
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
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, { size: 14 })
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
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 13 }), t("kb.renameSession")]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.menuItem,
																onClick: () => archiveSession(sessionMenu.session.id),
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutlineRegular, { size: 13 }), t("kb.archiveSession")]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: clsx(KnowledgeBaseRoot_module_css_default.menuItem, KnowledgeBaseRoot_module_css_default.menuItemDanger),
																onClick: () => {
																	deleteSession(sessionMenu.session.id);
																	setSessionMenu(null);
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 13 }), t("kb.deleteSession")]
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
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })
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
															onClick: closeKbPanel,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HomeIcon, { size: 13 }), t("kb.backHome")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: clsx(KnowledgeBaseRoot_module_css_default.footBtn, idxBusy && KnowledgeBaseRoot_module_css_default.footBtnBusy),
															onClick: () => {
																setKbNavOpen(false);
																setIndexModal(true);
																loadIndexStats();
															},
															title: idxBusy ? t("kb.indexBusyHint") : void 0,
															children: [idxBusy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: KnowledgeBaseRoot_module_css_default.footSpin,
																"aria-hidden": "true"
															}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 13 }), idxBusy ? indexStats?.rebuild?.running ? `${t("kb.indexRebuilding")} ${indexStats.rebuild.done}/${indexStats.rebuild.total}` : t("kb.indexParsing") : t("kb.index")]
														}),
														/* @__PURE__ */ sharedIsAdmin && (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.footBtn,
															onClick: () => {
																setKbNavOpen(false);
																setModelsModal(true);
																loadModelsSnapshot();
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutlineRegular, { size: 13 }), t("kb.aiModels")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.footBtn,
															onClick: () => {
																setKbNavOpen(false);
																setLogsModal(true);
																loadLogs();
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconListPenOutlineRegular, { size: 13 }), t("kb.logs")]
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
									(sideCollapsed && !kbNarrow) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "kbp-rail-nav",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "kbp-rail-nav-btn",
												title: t("kb.personal"),
												"aria-label": t("kb.personal"),
												onClick: () => { setPersonalOpen(true); saveSectionOpen(PERSONAL_OPEN_KEY, true); toggleSidebar(); },
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 16 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "kbp-rail-nav-btn",
												title: t("kb.shared"),
												"aria-label": t("kb.shared"),
												onClick: () => { setSharedOpen(true); saveSectionOpen(SHARED_OPEN_KEY, true); toggleSidebar(); },
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutlineRegular, { size: 16 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "kbp-rail-nav-btn",
												title: t("kb.newChat"),
												"aria-label": t("kb.newChat"),
												onClick: () => { newConversation(); if (kbNarrow) setKbNavOpen(false); },
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 16 })
											}),
										]
									}),
									(sideCollapsed && !kbNarrow) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.railFoot,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.railFootBtn,
												title: t("kb.backHome"),
												"aria-label": t("kb.backHome"),
												onClick: closeKbPanel,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HomeIcon, { size: 15 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.railFootBtn,
												title: idxBusy ? t("kb.indexBusyHint") : t("kb.index"),
												"aria-label": t("kb.index"),
												onClick: () => {
													setKbNavOpen(false);
													setIndexModal(true);
													loadIndexStats();
												},
												children: idxBusy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.footSpin,
													"aria-hidden": "true"
												}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 15 })
											}),
											/* @__PURE__ */ sharedIsAdmin && (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.railFootBtn,
												title: t("kb.aiModels"),
												"aria-label": t("kb.aiModels"),
												onClick: () => {
													setKbNavOpen(false);
													setModelsModal(true);
													loadModelsSnapshot();
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutlineRegular, { size: 15 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.railFootBtn,
												title: t("kb.logs"),
												"aria-label": t("kb.logs"),
												onClick: () => {
													setKbNavOpen(false);
													setLogsModal(true);
													loadLogs();
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconListPenOutlineRegular, { size: 15 })
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
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { type: "button", className: "kbp-navmenu", "aria-label": t("kb.expandSidebar"), "aria-expanded": kbNavOpen, onClick: () => setKbNavOpen(true), children: "☰" }),
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
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutlineRegular, { size: 24 })
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
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 13 }), t("kb.clear")]
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: clsx(KnowledgeBaseRoot_module_css_default.messages, kbpDrop && "kbp-drop"),
											onDragEnter: kbpDropProps.onDragEnter,
											onDragOver: kbpDropProps.onDragOver,
											onDragLeave: kbpDropProps.onDragLeave,
											onDrop: kbpDropProps.onDrop,
											ref: messagesRef,
											children: /* kbBg-20261005:render */ kbBgMessages.map((m, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
															children: chip.kind === "folder" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderCloseRegular, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutlineRegular, { size: 12 })
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
												}), m.role === "ai" && m.live === void 0 && (() => {
                                                    const kbpProv = kbProvenanceText(m);
                                                    const kbpRefs = kbpProv.unavailable ? [] : normalizeKbSources(m.sources);
                                                    if (!kbpRefs.length) return (!kbpProv.models && !kbpProv.sources) ? null : (0, react_jsx_runtime.jsxs)("div", {
                                                        className: "kbp-provenance", children: [
                                                            kbpProv.models && (0, react_jsx_runtime.jsx)("small", { children: kbpProv.models }),
                                                            kbpProv.sources && (0, react_jsx_runtime.jsx)("p", { role: "status", children: kbpProv.sources })]
                                                    });
                                                    const kbpKey = typeof m.messageId === "string" && m.messageId ? m.messageId : "ts:" + String(m.ts ?? i);
                                                    const kbpShown = kbpOpenRefs[kbpKey] === true;
                                                    return (0, react_jsx_runtime.jsxs)("div", {
                                                        className: "kbp-refs" + (kbpShown ? " kbp-refs--open" : ""), "data-kbp-refs": "1",
                                                        children: [
                                                            (0, react_jsx_runtime.jsxs)("button", { type: "button", className: "kbp-refs-toggle",
                                                                "data-kbp-refs-toggle": "1", "aria-expanded": kbpShown ? "true" : "false",
                                                                title: kbpShown ? "收起引用的文件" : "展开引用的文件",
                                                                onClick: () => kbpToggleRefs(kbpKey),
                                                                children: [
                                                                    (0, react_jsx_runtime.jsx)("span", { className: "kbp-refs-caret", "aria-hidden": "true", children: "▸" }),
                                                                    "引用文件（" + kbpRefs.length + "）"] }),
                                                            kbpShown && (0, react_jsx_runtime.jsxs)("div", { className: "kbp-refs-body", "data-kbp-refs-body": "1",
                                                                children: [
                                                                    kbpProv.models ? (0, react_jsx_runtime.jsx)("small", { className: "kbp-refs-model", children: kbpProv.models }) : null,
                                                                    kbpProv.sources ? (0, react_jsx_runtime.jsx)("p", { className: "kbp-refs-status", role: "status", children: kbpProv.sources }) : null,
                                                                    kbpRefs.map((source, si) => (0, react_jsx_runtime.jsxs)("button", { type: "button", className: "kbp-source", title: source.file_path,
                                                                        onClick: () => openSource(source), children: ["📄", (0, react_jsx_runtime.jsxs)("span", { children: [
                                                                            (0, react_jsx_runtime.jsx)("b", { children: source.title }), source.location ? " · " + source.location : "",
                                                                            (0, react_jsx_runtime.jsx)("small", { children: source.file_path })] })]
                                                                    }, source.file_path + si))] })
                                                        ]
                                                    });
                                                })(), m.live === void 0 && m.text !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: "kbp-actions",
												style: { display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" },
													children: [
														...(/* kbTask-20261003 深挖按钮 */ m.role === "ai" && m.live === void 0 && ["inventory", "profile", "themes", "books"].includes(m.intent) && m.stage !== "deep" ? [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { key: "kbp-deepbtn", className: "kbp-deepbtn", disabled: busy || m.deepBusy === true, onClick: () => deepDive(m, i), title: "按正文深挖：给出要点、依据与判断（多花 30~60 秒）", style: { border: "1px solid var(--dsw-alias-brand-primary, #2563eb)", background: "transparent", color: "var(--dsw-alias-brand-primary, #2563eb)", borderRadius: "7px", cursor: m.deepBusy ? "default" : "pointer", height: "26px", padding: "0 10px", fontSize: "11.5px", fontFamily: "inherit" }, children: m.deepBusy ? "深挖中…" : "继续深挖" })] : []),
														...(/* kbTask-20261003 深挖版徽标 */ m.role === "ai" && m.stage === "deep" ? [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { key: "kbp-deepbadge", className: "kbp-deepbadge", style: { border: "1px solid var(--dsw-alias-divider)", background: "var(--dsw-alias-bg-layer-3, transparent)", color: "var(--dsw-alias-label-secondary)", borderRadius: "7px", height: "26px", padding: "0 10px", fontSize: "11.5px", display: "inline-flex", alignItems: "center" }, children: "深挖版" })] : []),
														...(/* kbTask-20261003 深挖失败提示 */ m.role === "ai" && m.deepError ? [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { key: "kbp-deeperror", className: "kbp-deeperror", style: { color: "var(--dsw-alias-label-error, #c62828)", fontSize: "11.5px", display: "inline-flex", alignItems: "center" }, children: m.deepError })] : []),
													...(m.role === "ai" ? [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { key: "kbp-copy", type: "button", className: "kbp-tool", title: "复制本条回答", onClick: () => copyAnswer(m.text), children: "复制" }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { key: "kbp-regen", type: "button", className: "kbp-tool", disabled: busy, title: "用同一条提问重新生成", onClick: () => regenerate(i), children: "重新生成" }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { key: "kbp-up", type: "button", className: clsx("kbp-tool", m.feedback === "up" && "kbp-tool--on"), title: "这条回答有用", onClick: () => markFeedback(i, "up"), children: "有用" }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", { key: "kbp-down", type: "button", className: clsx("kbp-tool", m.feedback === "down" && "kbp-tool--on"), title: "这条回答没用", onClick: () => markFeedback(i, "down"), children: "没用" }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { key: "kbp-sep", className: "kbp-tool-sep" })
													] : []),
													...(m.role === "ai" ? [["docx", "Word"], ["pdf", "PDF"], ["md", "MD"]].map(([fmt, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														key: "kbp-exp-" + fmt,
														type: "button",
														className: "kbp-tool",
														title: `将本条回答导出为 ${label} 文件（落在右侧「对话产物」）`,
														onClick: () => exportAnswerAs(m.text, fmt, i),
														children: label
													}, fmt)) : []),
													...((artChip) => artChip ? [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
														key: "kbp-art",
														type: "button",
														className: "kbp-artifact",
														title: "本条回答生成的对话产物（右侧「对话产物」栏可打开）",
														onClick: () => showNotice("产物在右侧「对话产物」栏：" + artChip),
														children: ["对话产物/", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: artChip })]
													})] : [])(kbArtifactNameOf(m, artifactGroups))]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: clsx(KnowledgeBaseRoot_module_css_default.msgTime, m.role === "user" && KnowledgeBaseRoot_module_css_default.msgTimeUser),
													children: formatTs(m.ts ?? activeSession.updatedAt)
												})]
											}, i))
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: clsx(KnowledgeBaseRoot_module_css_default.composer, kbpDrop && "kbp-drop"),
										onDragEnter: kbpDropProps.onDragEnter,
										onDragOver: kbpDropProps.onDragOver,
										onDragLeave: kbpDropProps.onDragLeave,
										onDrop: kbpDropProps.onDrop,
										children: [
											kbpDrop && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "kbp-dropHint", children: "松开即入库：支持文件与文件夹" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												ref: kbpAttachInput,
												type: "file",
												multiple: true,
												style: { display: "none" },
												onChange: kbpAttachChange
											}),
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
														children: item.kind === "folder" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 13 })
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
															children: chip.kind === "folder" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderCloseRegular, { size: 13 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutlineRegular, { size: 13 })
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: KnowledgeBaseRoot_module_css_default.chipLabel,
															children: ["@", chip.label.split("/").pop()]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: KnowledgeBaseRoot_module_css_default.chipClose,
															"aria-label": `${t("kb.mention")} ${chip.label}`,
															onClick: () => removeChip(chip),
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 11 })
														})
													]
												}, kbChipIdentity(chip)))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
												ref: composerInput,
												className: KnowledgeBaseRoot_module_css_default.input,
												value: query,
												onChange: (e) => onComposerChange(e.target.value),
												placeholder: t("kb.placeholder"),
												rows: 1,
												onKeyDown: (e) => {
													/* kbIME-20261004 —— 组字保护：中文输入法选词时回车是「确认候选」而非「发送」，
													   缺这一条会把半截中文直接发出去（原型 kb-wechat-prototype.html:1072 有，
													   DSH InputBar 同样处理）。isComposing 是原生键盘事件属性，React 合成事件
													   不保证透传，故优先读 nativeEvent，取不到时退回合成事件上的同名值。 */
													if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent?.isComposing ?? e.isComposing)) {
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
																(0, react_jsx_runtime.jsx)("button", { type: "button", role: "option", "aria-selected": !model,
                                                                    className: KnowledgeBaseRoot_module_css_default.modelMenuItem,
                                                                    onClick: () => { setModel(""); setModelMenuOpen(false); }, children: "跟随系统默认" }),
                                                                modelGroups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																	className: KnowledgeBaseRoot_module_css_default.modelGroup,
																	children: [group.name && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																		className: KnowledgeBaseRoot_module_css_default.modelGroupTitle,
																		children: group.name
																	}), group.options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																		type: "button",
																		role: "option",
																		"aria-selected": option.key === model,
																		className: clsx(KnowledgeBaseRoot_module_css_default.modelMenuItem, option.key === model && KnowledgeBaseRoot_module_css_default.modelMenuItemActive),
																		onClick: () => {
																			setModel(option.key);
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
															children: [modelOptions.find((o) => JSON.stringify([o.provider, o.id]) === model)?.name || "跟随系统默认", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 })]
														})]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: clsx(KnowledgeBaseRoot_module_css_default.atBtn, "kbp-attach"),
														title: "添加附件（也可把文件或文件夹直接拖进对话框）",
														"aria-label": "添加附件",
														onClick: () => kbpAttachInput.current && kbpAttachInput.current.click(),
														/* 与 @ 按钮同款：纯文本 + 号（不走图标包，两份 ui-primitives checkout 命名不一致） */
														children: "+"													}),
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
														style: busy ? { color: "#e5484d" } : void 0,
														disabled: !busy && query.trim() === "",
														onClick: busy ? () => {
                                                            stopRequested.current = true;
                                                            /* kbBg-20261005:stop —— 接管的后台任务同样可停：先记到注册表，
                                                               拿到 task_id 前就点了停止也不会丢（kbBgSetTaskId 会补发取消）。 */
                                                            kbBgMarkStopped(kbBgAdoptedRef.current);
                                                            void requestTaskStop();
                                                        } : () => { send(); },
														"aria-label": busy ? t("kb.stop") : t("kb.send"),
														title: busy ? t("kb.stop") : t("kb.send"),
														children: busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
															width: "16",
															height: "16",
															viewBox: "0 0 24 24",
															fill: "none",
															stroke: "currentColor",
															strokeWidth: "2.2",
															strokeLinecap: "round",
															strokeLinejoin: "round",
															"aria-hidden": "true",
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", { x: "7", y: "7", width: "10", height: "10", rx: "2" })
														}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
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
                                    onMore: () => setSupplement("artifacts"),
									total: artifactGroups.reduce((n, g) => n + g.files.length, 0),
									collapsed: artRailCollapsed,
									onToggle: toggleArtRail,
									onMention: mentionFile,
									onOpen: viewDoc,
									onMenu: openArtFileMenu,
									t
								}),
								artFileMenu && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									ref: artFileMenuRef,
									className: clsx(KnowledgeBaseRoot_module_css_default.folderMenu, KnowledgeBaseRoot_module_css_default.artMenu),
									style: menuFixedStyle(artFileMenu.anchor, 214),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: KnowledgeBaseRoot_module_css_default.menuItem,
											onClick: () => {
												const f = artFileMenu.file;
												setArtFileMenu(null);
												openArtPromote(f);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, { size: 13 }), t("kb.artifactsAddPersonal")]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: KnowledgeBaseRoot_module_css_default.menuItem,
											onClick: () => {
												const f = artFileMenu.file;
												setArtFileMenu(null);
												openShareDialog([{
													docId: f.docId,
													title: `${PIN_KB}/${f.dir}/${f.name}.${f.ext}`
												}]);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutlineRegular, { size: 13 }), t("kb.artifactsAddShared")]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: KnowledgeBaseRoot_module_css_default.menuItem,
											onClick: () => {
												const f = artFileMenu.file;
												setArtFileMenu(null);
												renameArtifact(f);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 13 }), t("kb.artifactsRename")]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: KnowledgeBaseRoot_module_css_default.menuItem,
											onClick: () => {
												const f = artFileMenu.file;
												setArtFileMenu(null);
												downloadArtifact(f);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { size: 13 }), t("kb.artifactsDownload")]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: clsx(KnowledgeBaseRoot_module_css_default.menuItem, KnowledgeBaseRoot_module_css_default.menuItemDanger),
											onClick: () => {
												const f = artFileMenu.file;
												setArtFileMenu(null);
												deleteArtifact(f);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 13 }), t("kb.artifactsDelete")]
										})
									]
								}),
								copyTo && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: KnowledgeBaseRoot_module_css_default.modalOverlay,
									onClick: () => { if (!copyTo.busy) setCopyTo(null); },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.modal,
										onClick: (e) => e.stopPropagation(),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalHead,
												children: t("kb.copyTo")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalBody,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: KnowledgeBaseRoot_module_css_default.shareHint,
														children: `将 ${copyTo.items.length} 个文件复制到个人知识库`
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: KnowledgeBaseRoot_module_css_default.shareHint,
														children: "选择目标文件夹（留空 = 个人知识库根目录）"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
														className: KnowledgeBaseRoot_module_css_default.shareInput,
														value: copyTo.folder,
														onChange: (e) => setCopyTo({ ...copyTo, folder: e.target.value }),
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
															value: "",
															children: "（根目录）"
														}), (() => {
															const rows = [];
															const seen = new Set();
															const looksFs = (p) => /^(home|users|root|var|tmp|mnt|opt|srv|etc|usr|Volumes)(\/|$)/i.test(p) || /(^|\/)\.dsh(\/|$)/.test(p) || p.includes("raganything") || /(^|\/)storage(\/|$)/.test(p);
															const walk = (nodes) => {
																for (const c of (nodes || [])) {
																	const p = String((c && c.fullPath) || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
																	if (p && !seen.has(p) && !p.startsWith("/") && !/^[A-Za-z]:/.test(p) && !looksFs(p)) {
																		seen.add(p);
																		rows.push({ path: p, n: countAllFiles(c) });
																	}
																	walk(c && c.children);
																}
															};
															walk(folderTree);
															rows.sort((a, b) => a.path.localeCompare(b.path, "zh"));
															return rows.map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																value: r.path,
																children: `${r.path}（${r.n} 个文件）`
															}, r.path));
														})()]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: KnowledgeBaseRoot_module_css_default.shareHint,
														children: "同目标路径下若已有同名文件，将提示是否覆盖；覆盖后旧文件进入回收箱（保留 7 天）。"
													})
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalFoot,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.btnGhost,
														disabled: copyTo.busy,
														onClick: () => setCopyTo(null),
														children: t("kb.cancel")
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.btnPrimary,
														disabled: copyTo.busy,
														onClick: executeCopyTo,
														children: copyTo.busy ? "复制中…" : "开始复制"
													})
												]
											})
										]
									})]
								}),
								artPromote && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: KnowledgeBaseRoot_module_css_default.modalOverlay,
									role: "presentation",
									onClick: () => {
										if (!artBusy) setArtPromote(null);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: KnowledgeBaseRoot_module_css_default.modal,
										role: "dialog",
										"aria-modal": "true",
										"aria-label": t("kb.artifactsPromoteTitle"),
										onClick: (e) => e.stopPropagation(),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.modalTitle,
													children: t("kb.artifactsPromoteTitle")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: KnowledgeBaseRoot_module_css_default.modalSub,
													children: t("kb.artifactsPromoteSub").replace("{name}", `${artPromote.file.name}.${artPromote.file.ext}`)
												})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.modalClose,
													onClick: () => setArtPromote(null),
													"aria-label": t("close"),
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalBody,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
														className: KnowledgeBaseRoot_module_css_default.modalHint,
														children: t("kb.artifactsPromoteTarget")
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
														className: KnowledgeBaseRoot_module_css_default.modalInput,
														value: artPromote.folder,
														onChange: (e) => setArtPromote({ ...artPromote, folder: e.target.value }),
														children: [
															folders.map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: f.name, children: f.name }, f.name)),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: "__new__", children: t("kb.artifactsPromoteNew") })
														]
													}),
													artPromote.folder === "__new__" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
														autoFocus: true,
														className: KnowledgeBaseRoot_module_css_default.modalInput,
														placeholder: t("kb.artifactsPromoteNewName"),
														value: artPromote.newFolder,
														onChange: (e) => setArtPromote({ ...artPromote, newFolder: e.target.value })
													})
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalFoot,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.modalBtnSecondary,
														onClick: () => setArtPromote(null),
														disabled: artBusy,
														children: t("close")
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: KnowledgeBaseRoot_module_css_default.modalBtnPrimary,
														onClick: () => {
															executeArtPromote();
														},
														disabled: artBusy,
														children: artBusy ? t("kb.artifactsPromoteBusy") : t("kb.artifactsPromoteConfirm")
													})
												]
											})
										]
									})
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
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
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
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutlineRegular, { size: 14 }), t("kb.openOriginal")]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.docViewerClose,
												onClick: () => setViewingDoc(null),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
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
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
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
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutlineRegular, { size: 16 })
												}), t("kb.aiModels")]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.modalSub,
												children: t("kb.aiModelsSub")
											})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalClose,
												onClick: () => setModelsModal(false),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
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
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutlineRegular, { size: 14 })
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
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkleRegular, { size: 14 })
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
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutlineRegular, { size: 14 })
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
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutlineRegular, { size: 14 })
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
														if (modelsCanConfigureRef.current === false) {
															showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
															return;
														}
																startModelDownload(entry.id);
															},
															onSetDefault: () => {
														if (modelsCanConfigureRef.current === false) {
															showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
															return;
														}
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
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { size: 13 })
																		}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																			style: {
																				display: "grid",
																				placeItems: "center",
																				color: "#d97706"
																			},
																			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 13 })
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
															}), !modelsCfgBlocked && !modelsSnap.runtime.llama_cpp && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: KnowledgeBaseRoot_module_css_default.modelsDlBtn,
																onClick: () => {
																	installRuntime();
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { size: 12 }), t("kb.modelInstallRuntime")]
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
																		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 14 })
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
														if (modelsCanConfigureRef.current === false) {
															showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
															return;
														}
																	startModelDownload(entry.id);
																},
																onSetDefault: () => {
														if (modelsCanConfigureRef.current === false) {
															showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
															return;
														}
																	applyModelSelect("rerank", { model: entry.id });
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
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutlineRegular, { size: 14 })
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
														if (modelsCanConfigureRef.current === false) {
															showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
															return;
														}
																startModelDownload(entry.id);
															},
															onSetDefault: () => {
														if (modelsCanConfigureRef.current === false) {
															showNotice("仅管理员可配置模型；当前账号只有模型使用权，可使用已配置的模型。");
															return;
														}
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
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 13 }), t("kb.modelAddConfig")]
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
																		placeholder: addModelExisting !== null ? "留空 = 保持不变" : "sk-…",
																		onChange: (e) => setAddModelForm((f) => ({
																			...f,
																			// F1（task-20）：只接受用户新输入；服务端不再下发明文 key，绝不回填输入框。
																			api_key: e.target.value
																		})),
																		}), addModelKeyHint !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
																			style: { fontSize: 11, color: "var(--muted)" },
																			children: addModelKeyHint
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
																disabled: addModelBusy || modelsCfgBlocked,
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
													disabled: modelsRestarting || modelsCfgBlocked,
													onClick: () => {
														restartSidecar();
													},
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 13 }), modelsRestarting ? t("kb.modelRestarting") : t("kb.modelRestartNow")]
												}),
												modelsRestartNeeded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: KnowledgeBaseRoot_module_css_default.modelsRestartHint,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 13 }), t("kb.modelRestartNeeded")]
												}),
												modelsCfgBlocked && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: KnowledgeBaseRoot_module_css_default.modelsRestartHint,
													children: "当前账号只有模型使用权，配置入口已停用（仅管理员可配置）。"
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
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
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
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 12 }), t("kb.logsRefresh")]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: KnowledgeBaseRoot_module_css_default.logBtn,
													onClick: () => {
														ragLogExport();
													},
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { size: 12 }), t("kb.logsExport")]
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
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
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
													sharedModal?.mode !== "rename" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
														className: KnowledgeBaseRoot_module_css_default.modalHint,
														children: t("kb.sharedMembers")
													}),
													sharedModal?.mode !== "rename" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: KnowledgeBaseRoot_module_css_default.memberList,
														children: sharedUsers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: KnowledgeBaseRoot_module_css_default.modalHint,
												children: sharedCanListUsers ? "正在加载账号清单…" : "成员名单仅管理员可查看；文件夹创建后由管理员添加成员。"
											}) : sharedUsers.map((u) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
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
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
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
													children: sharedUsers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: KnowledgeBaseRoot_module_css_default.modalHint,
												children: sharedCanListUsers ? "正在加载账号清单…" : "成员名单仅管理员可查看；文件夹创建后由管理员添加成员。"
											}) : sharedUsers.map((u) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
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
											})] }), sharedTrash.entries && sharedTrash.entries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: clsx(KnowledgeBaseRoot_module_css_default.logBtn, KnowledgeBaseRoot_module_css_default.trashRestoreAllBtn),
												onClick: () => restoreAllSharedTrash(),
												title: t("kb.sharedTrashRestoreAll"),
												children: t("kb.sharedTrashRestoreAll")
											}), sharedTrash.entries && sharedTrash.entries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: clsx(KnowledgeBaseRoot_module_css_default.logBtn, KnowledgeBaseRoot_module_css_default.trashPurgeAllBtn),
												onClick: () => purgeAllSharedTrash(),
												title: t("kb.sharedTrashPurgeAll"),
												children: t("kb.sharedTrashPurgeAll")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: KnowledgeBaseRoot_module_css_default.modalClose,
												onClick: () => setSharedTrash(null),
												"aria-label": t("close"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
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
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: KnowledgeBaseRoot_module_css_default.trashList, // kbFeat86-trashscroll
												children: sharedTrash.entries.map((te) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
			"kb.sharedTrashSub": "可还原 / 彻底删除自己删除的项；管理员可管理全部",
			"kb.sharedTrashEmpty": "回收箱为空",
			"kb.sharedTrashRestoreAll": "全部还原", /* kbFeat86-trashall */
			"kb.sharedTrashPurgeAll": "全部删除", /* kbFeat86-trashall */


			"kb.sharedRestore": "还原",
			"kb.sharedPurge": "彻底删除",
			"kb.sharedOpenPreview": "打开预览",
			"kb.copyTo": "复制到…",
			"kb.retryParse": "重新解析",
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
			"kb.heroTitle": "AI知识库 Chat",
			"kb.heroSub": "基于你的知识库回答问题，来源可追溯",
			"kb.placeholder": "向璇玑AI发送消息，输入 @ 指定知识库、文件夹或文件",
			"kb.send": "发送",
			"kb.stop": "\u505C\u6B62",
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
			"kb.artifactsMore": "更多操作",
			"kb.artifactsAddPersonal": "添加到个人知识库",
			"kb.artifactsAddShared": "添加到共享知识库",
			"kb.artifactsRename": "重命名",
			"kb.artifactsRenamePrompt": "新的文件名（不需要写扩展名）",
			"kb.artifactsDownload": "下载",
			"kb.artifactsDelete": "删除",
			"kb.artifactsDeleteConfirm": "删除「{name}」？\n文件会移入回收站保留 7 天，索引/检索数据一并移除。",
			"kb.artifactsPromoteTitle": "添加到个人知识库",
			"kb.artifactsPromoteSub": "「{name}」将复制一份到所选文件夹并解析入库；原产物仍留在右侧「对话产物」栏。",
			"kb.artifactsPromoteTarget": "目标文件夹",
			"kb.artifactsPromoteNew": "新建文件夹…",
			"kb.artifactsPromoteNewName": "新文件夹名称",
			"kb.artifactsPromoteConfirm": "添加",
			"kb.artifactsPromoteBusy": "添加中…",
			"kb.uploading": "正在解析 {name}… 已等待 {s} 秒",
			"kb.think": "深度思考",
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
			"kb.status.processing": "解析中", /* kbFeat86-retrylabel —— 按用户措辞，处理中=解析中 */
			"kb.status.pending": "等待中",
			"kb.status.failed": "失败",
			"kb.status.preprocessed": "预处理",
			"kb.status.stored": "仅文件",
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
			"kb.sharedTrashSub": "Restore or purge your own items; admin can manage all",
			"kb.sharedTrashEmpty": "Trash is empty",
			"kb.sharedTrashRestoreAll": "Restore all", /* kbFeat86-trashall */
			"kb.sharedTrashPurgeAll": "Delete all", /* kbFeat86-trashall */


			"kb.sharedRestore": "Restore",
			"kb.sharedPurge": "Delete forever",
			"kb.sharedOpenPreview": "Open preview",
			"kb.copyTo": "Copy to…",
			"kb.retryParse": "Retry",
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
			"kb.stop": "Stop",
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
			"kb.artifactsMore": "More actions",
			"kb.artifactsAddPersonal": "Add to my knowledge base",
			"kb.artifactsAddShared": "Add to shared knowledge base",
			"kb.artifactsRename": "Rename",
			"kb.artifactsRenamePrompt": "New file name (extension not needed)",
			"kb.artifactsDownload": "Download",
			"kb.artifactsDelete": "Delete",
			"kb.artifactsDeleteConfirm": "Delete \"{name}\"?\nThe file moves to the recycle bin for 7 days; its index data is removed.",
			"kb.artifactsPromoteTitle": "Add to my knowledge base",
			"kb.artifactsPromoteSub": "A copy of \"{name}\" is added to the chosen folder and parsed into the index; the artifact stays in the rail.",
			"kb.artifactsPromoteTarget": "Target folder",
			"kb.artifactsPromoteNew": "New folder…",
			"kb.artifactsPromoteNewName": "New folder name",
			"kb.artifactsPromoteConfirm": "Add",
			"kb.artifactsPromoteBusy": "Adding…",
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
			"kb.status.stored": "File only",
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
				const raw = String(address || "").split(/[?#]/)[0].split("/").pop() || "file";
				/* ofvNameDecode-20261006：资源地址每个路径段都是 encodeURIComponent 编码的
				   （dsh-util-workspace-path），不解码会把中文名下载成 
				   `01-%E5%8A%9F%E8%83%BD...md`。与内置预览 basenameOf 同口径：
				   解码失败则保留原样。 */
				try {
					return decodeURIComponent(raw) || "file";
				} catch {
					return raw;
				}
			} catch {
				return "file";
			}
		}
		/** Right-sidebar document body: render host bytes with Open File Viewer. */
		function OfvDocBody(props) {
			const { content, resourceAddress } = props;
			const hostRef = react.useRef(null);
			const fileName = react.useMemo(() => ofvFileNameOf(resourceAddress), [resourceAddress]);
			/* ofvMountRace-20261010：按字节身份而不是 content 包装对象判断，父级因元数据版本帧
			   重建 content 时不重启查看器。 */
			const data = content && content.kind === "bytes" ? content.data : null;
			const hasBytes = !!data && data.byteLength > 0;
			/* ofvMountRace-20261010：每个宿主一条挂载链。ofvMount 要先等 11MB 的
			   /viewer/ofv.bundle.js 加载完；这期间父级一旦重渲染，旧实现会并发发起第二次
			   ofv.mount 并在事后 destroy 旧 viewer —— 两次挂载共用同一容器，旧的那次
			   destroy 会把新 viewer 的 DOM 一并清空，于是右侧面板空白、刷新后才显示。
			   现在：同一文件不重复挂载；换文件先销毁旧的再挂载；被取代的那次只销毁自己的
			   副本；卸载时销毁最后一个。 */
			const run = react.useRef({
				seq: 0,
				data: null,
				fileName: null,
				viewer: null,
				chain: Promise.resolve()
			});
			react.useEffect(() => {
				const el = hostRef.current;
				const state = run.current;
				if (!el || !hasBytes) return;
				if (state.data === data && state.fileName === fileName) return;
				state.data = data;
				state.fileName = fileName;
				const seq = ++state.seq;
				state.chain = state.chain.then(async () => {
					if (state.viewer) {
						try {
							state.viewer.destroy();
						} catch {}
						state.viewer = null;
					}
					if (seq !== state.seq) return;
					el.textContent = "";
					let viewer = null;
					try {
						viewer = await ofvMount(el, new Blob([data]), fileName);
					} catch {
						if (seq === state.seq) el.textContent = "Open File Viewer 加载失败，请重试或下载文件查看。";
						return;
					}
					if (seq !== state.seq) {
						try {
							viewer.destroy();
						} catch {}
						return;
					}
					state.viewer = viewer;
				}).catch(() => {});
			}, [data, fileName, hasBytes]);
			react.useEffect(() => () => {
				const state = run.current;
				state.seq++;
				state.data = null;
				state.fileName = null;
				if (state.viewer) {
					try {
						state.viewer.destroy();
					} catch {}
					state.viewer = null;
				}
			}, []);
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
			"layout",
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
			const dshLayout = { goHome: () => ctx.layout.selectPanel(null) };
			const kbInjected = () => ({ loadModels: async () => {
				const response = await ctx.remote.session.modelCatalog();
				if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
				return response.value;
			}, dshLayout });
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main", key: "cap:kb", locale: NS, inject: kbInjected
			}, KnowledgeBaseRoot));
			function KnowledgeBaseLaunch({ wide, t }) {
				return (0, react_jsx_runtime.jsxs)("button", {
					type: "button", className: KnowledgeBaseRoot_module_css_default.trigger,
					"aria-label": t("kb.trigger"), onClick: () => ctx.layout.selectPanel("cap:kb"),
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDatabaseOutlineRegular, { size: 18 }), wide && t("kb.trigger")]
				});
			}
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action", id: "knowledge-base", order: 0, locale: NS
			}, KnowledgeBaseLaunch));
			registerOfvPreview(ctx);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map

/* kbFeat86-stamp-20260920145443 */
/* kbFeat86-r5-rev-20260920151953 */

/* kbAsrRm86-stamp-20261011-094954 */

/* kbModelsLay86-stamp-20261011-101156 */
