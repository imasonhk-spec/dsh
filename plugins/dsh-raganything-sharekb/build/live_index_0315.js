/**
 * dsh-raganything-kb — RAG-Anything (HKUDS) multimodal RAG knowledge base for
 * DeepSeek Harness: a fresh, empty knowledge base per install.
 *
 * Same engine as dsh-raganything, plus first-run convenience: on a fresh
 * local install a first-run config.json is written from
 * kb/config.json.template so the sidecar starts out of the box. No knowledge
 * base data ships with the package — every host starts empty and builds its
 * own knowledge base with rag_ingest / rag_ingest_text. Each host is fully
 * independent.
 *
 * Pure host plugin, zero npm dependencies. Registers the `rag_*` model tools
 * on the global tools registry and talks to one FastAPI sidecar
 * (sidecar/server.py, wrapping RAGAnything / LightRAG):
 *
 *   rag_status       sidecar health, config summary, document/task counts
 *   rag_query        hybrid/local/global/naive/mix retrieval + answer
 *   rag_ingest       ingest a file (txt/md direct; PDF/Office via MinerU)
 *   rag_ingest_text  ingest raw text under a title
 *   rag_docs         list ingested documents
 *   rag_delete       delete one document by id
 *
 * Two deployment modes, decided by `sidecarHost`:
 *   local   (127.0.0.1/localhost, default) — the plugin owns a Python sidecar
 *           process: spawned lazily on first tool use, adopted across DSH
 *           restarts (health-first), SIGTERM'd with the plugin fiber. The LLM
 *           API key is resolved from the DSH credentials store at spawn time
 *           and passed through the environment only — never written to disk,
 *           config, or logs. The knowledge base starts empty (first-run
 *           config.json is generated when absent).
 *   remote  (any other host) — shared knowledge base: no process is spawned,
 *           every call goes over HTTP to the configured sidecar
 *           (autoStart defaults to false). `rag_ingest` uploads the local
 *           file to the remote sidecar's /upload endpoint (the remote host
 *           cannot read this machine's filesystem). Pass `apiToken` (or set
 *           the tokenEnv environment variable) when the sidecar requires one.
 *           First-run config is NOT generated in remote mode.
 *
 * Config (cordis.patch.yml insert row `config:`): sidecarPort, sidecarHost,
 * sidecarDir, sidecarConfig, pythonBin, ragHome, autoStart, startTimeoutMs,
 * requestTimeoutMs, apiKeyEnv, credentialsFile, credentialsRef, apiToken,
 * tokenEnv.
 * @module dsh-raganything-kb
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-raganything-kb'
export const inject = ['tools']

/** Plugin config defaults (the insert row may override any of these). */
const DEFAULTS = {
  sidecarHost: '127.0.0.1',
  sidecarPort: 17321,
  /** Directory holding sidecar/server.py; defaults to <packageDir>/sidecar. */
  sidecarDir: null,
  /** Sidecar JSON config path; defaults to <ragHome>/config.json. */
  sidecarConfig: null,
  /** Python interpreter for the sidecar; defaults to <ragHome>/venv/bin/python. */
  pythonBin: null,
  /** Data home: config, storage, logs; defaults to ~/.dsh/raganything. */
  ragHome: null,
  autoStart: true,
  startTimeoutMs: 45000,
  requestTimeoutMs: 15000,
  /** Environment variable checked first for the LLM API key. */
  apiKeyEnv: 'RAGANYTHING_LLM_API_KEY',
  /** DSH credentials store file scanned for the key (refs section). */
  credentialsFile: null,
  /** refs key inside the credentials store. */
  credentialsRef: 'TOKENSTORE_API_KEY',
  /** Access token sent as `Authorization: Bearer` on every sidecar request
   *  (remote shared knowledge base). Checked after tokenEnv. */
  apiToken: null,
  /** Environment variable checked first for the access token. */
  tokenEnv: 'RAGANYTHING_API_TOKEN',
}

/** Resolve the package directory from this module's URL (symlink-safe). */
const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url))

/**
 * Bundled first-run sidecar config template (<packageDir>/kb/config.json.template).
 * The plugin ships NO knowledge base data: every install starts with a fresh,
 * empty knowledge base that the deployer builds up with rag_ingest /
 * rag_ingest_text. This keeps each host fully independent.
 */
const KB_DIR = join(PACKAGE_DIR, 'kb')

function resolveConfig(raw = {}) {
  const ragHome = raw.ragHome ?? join(homedir(), '.dsh', 'raganything')
  const sidecarHost = raw.sidecarHost ?? DEFAULTS.sidecarHost
  const isRemote = !['127.0.0.1', 'localhost', '::1'].includes(String(sidecarHost))
  const config = {
    ...DEFAULTS,
    ...raw,
    sidecarHost,
    isRemote,
    // Remote mode never spawns a local sidecar: autoStart only applies to a
    // locally hosted knowledge base (unless the deployer insists otherwise).
    autoStart: isRemote && raw.autoStart === undefined ? false : raw.autoStart,
    ragHome,
    sidecarDir: raw.sidecarDir ?? join(PACKAGE_DIR, 'sidecar'),
    sidecarConfig: raw.sidecarConfig ?? join(ragHome, 'config.json'),
    pythonBin: raw.pythonBin ?? join(ragHome, 'venv', 'bin', 'python'),
    credentialsFile: raw.credentialsFile ?? join(homedir(), '.dsh', '.credentials.yaml'),
  }
  config.startTimeoutMs = Number(config.startTimeoutMs) || DEFAULTS.startTimeoutMs
  config.requestTimeoutMs = Number(config.requestTimeoutMs) || DEFAULTS.requestTimeoutMs
  config.sidecarPort = Number(config.sidecarPort) || DEFAULTS.sidecarPort
  return config
}

/** Resolve the sidecar access token: tokenEnv variable first, then apiToken. */
function resolveToken(config) {
  const fromEnv = process.env[config.tokenEnv]
  if (fromEnv) return fromEnv
  if (config.apiToken) return config.apiToken
  return undefined
}

/**
 * Extract a refs entry from the DSH credentials store without pulling in a
 * YAML dependency. The file layout is stable: a top-level `refs:` block of
 * two-space-indented `NAME: value` scalar entries followed by the next
 * top-level key (e.g. `records:`). Values may be quoted.
 */
function readCredentialRef(config) {
  const file = config.credentialsFile
  try {
    if (!existsSync(file)) return undefined
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    let inRefs = false
    for (const line of lines) {
      if (/^refs:\s*(#.*)?$/.test(line)) {
        inRefs = true
        continue
      }
      if (!inRefs) continue
      if (/^\S/.test(line)) break // next top-level key ends the refs block
      const match = /^ {2}([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line)
      if (match && match[1] === config.credentialsRef) {
        const value = match[2].trim()
        const unquoted = /^(["'])(.*)\1$/.exec(value)
        const candidate = unquoted ? unquoted[2] : value
        if (candidate && !candidate.startsWith('#')) return candidate
      }
    }
  } catch {
    // fall through: the sidecar reports a clear config error on use
  }
  return undefined
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

/**
 * First-run convenience (local mode only): when the deployment has no
 * <ragHome>/config.json yet, write one from the bundled
 * kb/config.json.template so the sidecar starts out of the box with an
 * empty knowledge base (working_dir/output_dir point at ragHome). Never
 * touches an existing config or any knowledge base data — each host starts
 * fresh and builds its own knowledge base via rag_ingest / rag_ingest_text.
 */
function ensureFirstRunConfig(config) {
  if (config.isRemote) return
  const template = join(KB_DIR, 'config.json.template')
  if (!existsSync(config.sidecarConfig) && existsSync(template)) {
    try {
      let text = readFileSync(template, 'utf8')
      text = text.replaceAll('__RAG_HOME__', config.ragHome)
      mkdirSync(dirname(config.sidecarConfig), { recursive: true })
      writeFileSync(config.sidecarConfig, text)
      console.log(`[dsh-raganything-kb] wrote first-run sidecar config → ${config.sidecarConfig}`)
    } catch (error) {
      console.warn(`[dsh-raganything-kb] config write failed: ${error.message}`)
    }
  }
}

/** Tail the sidecar log so startup failures surface their actual cause. */
function tailFile(file, maxBytes = 2000) {
  try {
    if (!existsSync(file)) return ''
    const content = readFileSync(file, 'utf8')
    return content.length > maxBytes ? `…${content.slice(-maxBytes)}` : content
  } catch {
    return ''
  }
}

/**
 * Sidecar process manager. One instance per plugin fiber; `stop()` is the
 * effect disposer. A sidecar left running from a previous plugin life is
 * adopted (health-first) instead of spawned twice.
 */
function createSidecarManager(ctx, config) {
  let child = null
  let starting = null
  const baseUrl = () => `http://${config.sidecarHost}:${config.sidecarPort}`
  const logPath = () => join(config.ragHome, 'logs', 'sidecar.log')
  const authHeaders = () => {
    const token = resolveToken(config)
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  async function request(pathname, { method = 'GET', body, timeoutMs, signal } = {}) {
    const ac = new AbortController()
    const timer = setTimeout(
      () => ac.abort(new Error(`sidecar request timeout after ${timeoutMs ?? config.requestTimeoutMs}ms`)),
      timeoutMs ?? config.requestTimeoutMs,
    )
    const onOuterAbort = () => ac.abort(signal.reason ?? new Error('aborted'))
    if (signal) {
      if (signal.aborted) ac.abort(signal.reason ?? new Error('aborted'))
      else signal.addEventListener('abort', onOuterAbort, { once: true })
    }
    try {
      const response = await fetch(baseUrl() + pathname, {
        method,
        headers: { ...authHeaders(), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ac.signal,
      })
      const text = await response.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = { raw: text.slice(0, 2000) }
      }
      if (!response.ok) {
        const detail = data && (data.detail ?? data.error ?? data.raw)
        const message = typeof detail === 'string' ? detail : JSON.stringify(detail)
        throw new Error(`sidecar ${response.status}: ${message}`)
      }
      return data
    } finally {
      clearTimeout(timer)
      if (signal) signal.removeEventListener('abort', onOuterAbort)
    }
  }

  /**
   * Upload a local file to the sidecar's /upload endpoint (multipart) and
   * return the submitted ingest task. Used by rag_ingest in remote mode: the
   * remote host cannot read this machine's filesystem, so the file must be
   * transferred before the ingest task can touch it.
   */
  async function uploadAndIngest(filePath, { doc_id: docId, parse_method: parseMethod, signal } = {}) {
    const { readFile } = await import('node:fs/promises')
    const buffer = await readFile(filePath)
    const form = new FormData()
    form.append('file', new Blob([buffer]), basename(filePath))
    if (docId) form.append('doc_id', docId)
    if (parseMethod) form.append('parse_method', parseMethod)
    const ac = new AbortController()
    const timer = setTimeout(
      () => ac.abort(new Error(`sidecar upload timeout after ${config.requestTimeoutMs}ms`)),
      config.requestTimeoutMs,
    )
    const onOuterAbort = () => ac.abort(signal.reason ?? new Error('aborted'))
    if (signal) {
      if (signal.aborted) ac.abort(signal.reason ?? new Error('aborted'))
      else signal.addEventListener('abort', onOuterAbort, { once: true })
    }
    try {
      const response = await fetch(baseUrl() + '/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: form,
        signal: ac.signal,
      })
      const text = await response.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = { raw: text.slice(0, 2000) }
      }
      if (!response.ok) {
        const detail = data && (data.detail ?? data.error ?? data.raw)
        const message = typeof detail === 'string' ? detail : JSON.stringify(detail)
        throw new Error(`sidecar upload ${response.status}: ${message}`)
      }
      return data
    } finally {
      clearTimeout(timer)
      if (signal) signal.removeEventListener('abort', onOuterAbort)
    }
  }

  async function health(timeoutMs) {
    return request('/health', { timeoutMs: timeoutMs ?? 3000 })
  }

  function isAlive() {
    return child !== null && child.exitCode === null && child.signalCode === null
  }

  function spawnSidecar() {
    if (!existsSync(config.sidecarConfig)) {
      return Promise.reject(new Error(`sidecar config missing: ${config.sidecarConfig}`))
    }
    if (!existsSync(config.sidecarDir)) {
      return Promise.reject(new Error(`sidecar directory missing: ${config.sidecarDir}`))
    }
    let pythonBin = config.pythonBin
    if (!existsSync(pythonBin)) {
      return Promise.reject(
        new Error(
          `python interpreter not found at ${pythonBin} — create the venv first: ` +
            `python3 -m venv ${config.ragHome}/venv && ${config.ragHome}/venv/bin/pip install 'raganything[text]' fastapi 'uvicorn[standard]' 'mineru[core]'`,
        ),
      )
    }
    const apiKey = process.env[config.apiKeyEnv] || readCredentialRef(config)
    mkdirSync(dirname(logPath()), { recursive: true })
    const logFile = openSync(logPath(), 'a')
    const env = {
      ...process.env,
      // RAG-Anything shells out to parser CLIs (mineru, libreoffice, …) that
      // live in the venv's bin directory next to the interpreter.
      PATH: `${dirname(pythonBin)}:${process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin'}`,
      RAG_SIDECAR_CONFIG: config.sidecarConfig,
      RAG_SIDECAR_HOST: config.sidecarHost,
      RAG_SIDECAR_PORT: String(config.sidecarPort),
      PYTHONUNBUFFERED: '1',
    }
    if (apiKey) env.RAG_LLM_API_KEY = apiKey

    child = spawn(pythonBin, ['server.py'], { cwd: config.sidecarDir, env, stdio: ['ignore', logFile, logFile] })
    child.unref()

    return new Promise((resolvePromise, rejectPromise) => {
      let settled = false
      const deadline = Date.now() + config.startTimeoutMs
      child.once('exit', (code, signalName) => {
        if (settled) return
        settled = true
        rejectPromise(
          new Error(
            `sidecar exited during startup (code ${code}${signalName ? `, signal ${signalName}` : ''}). ` +
              `log tail:\n${tailFile(logPath()) || '(empty log)'}`,
          ),
        )
      })
      const poll = async () => {
        while (!settled) {
          if (Date.now() > deadline) {
            settled = true
            rejectPromise(new Error(`sidecar did not become healthy within ${config.startTimeoutMs}ms; log: ${logPath()}`))
            return
          }
          try {
            const h = await health(2500)
            if (h && h.ok) {
              settled = true
              resolvePromise({ ...h, spawnedByPlugin: true })
              return
            }
          } catch {
            // not healthy yet — keep polling until the deadline
          }
          await sleep(500)
        }
      }
      void poll()
    })
  }

  /** Ensure the sidecar is reachable, adopting or spawning it as needed. */
  async function ensureRunning() {
    if (isAlive()) {
      try {
        return { ...(await health(2500)), spawnedByPlugin: true }
      } catch {
        // our child is alive but unhealthy — fall through and adopt/spawn
      }
    }
    try {
      const h = await health(2500)
      return { ...h, spawnedByPlugin: false, adopted: true }
    } catch {
      // not running
    }
    if (!config.autoStart) {
      throw new Error(
        config.isRemote
          ? `远程 RAG sidecar 不可达（${baseUrl()}）。检查：sidecarHost/sidecarPort 是否指向知识库服务器、服务器 sidecar 是否已启动（curl ${baseUrl()}/health）、apiToken 是否与服务器一致。`
          : 'RAG sidecar is not running and autoStart is disabled',
      )
    }
    if (!starting) {
      starting = spawnSidecar().finally(() => {
        starting = null
      })
    }
    return starting
  }

  function stop() {
    if (child && child.exitCode === null && child.signalCode === null) {
      try {
        child.kill('SIGTERM')
        setTimeout(() => {
          if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
        }, 5000).unref()
      } catch {
        // already gone
      }
    }
    child = null
  }

  return { request, uploadAndIngest, health, ensureRunning, stop, baseUrl, logPath, config }
}

// ---------------------------------------------------------------------------
// Sidecar task helpers
// ---------------------------------------------------------------------------

async function submitTask(manager, op, params) {
  const { task_id: taskId } = await manager.request('/tasks', { method: 'POST', body: { op, params } })
  return taskId
}

/** Map a sidecar task record onto one short human-readable status line. */
function describeTask(task) {
  const elapsed = task.finished_at
    ? `${Math.round(task.finished_at - task.submitted_at)}s`
    : `${Math.round((Date.now() / 1000 - task.submitted_at) * 1)}s`
  const head = `${task.op} ${task.status} (${elapsed})`
  if (task.status === 'error') return `${head}: ${task.error}`
  if (task.status === 'done') return `${head}: ${summarizeResult(task.result)}`
  return head
}

function summarizeResult(result) {
  if (!result) return ''
  if (typeof result.answer === 'string') return `${result.answer.length} chars answer`
  if (result.doc_id) return `doc ${result.doc_id}`
  if (result.path) return result.path
  if (result.deleted) return `deleted ${result.deleted}`
  if (result.items !== undefined) return `${result.items} items`
  return JSON.stringify(result).slice(0, 120)
}

/**
 * Poll a sidecar task until it settles. Abort (exec.signal or job cancel)
 * deletes the task so the Python work stops too.
 */
async function waitTask(manager, taskId, { signal, pollMs = 1200 } = {}) {
  const onAbort = () => {
    manager.request(`/tasks/${taskId}`, { method: 'DELETE', timeoutMs: 5000 }).catch(() => {})
  }
  if (signal) {
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  try {
    for (;;) {
      if (signal?.aborted) {
        const error = new Error('aborted')
        error.name = 'AbortError'
        throw error
      }
      const task = await manager.request(`/tasks/${taskId}`, { signal })
      if (task.status === 'done') return task.result
      if (task.status === 'error') throw new Error(task.error || 'sidecar task failed')
      if (task.status === 'cancelled') {
        const error = new Error('sidecar task cancelled')
        error.name = 'AbortError'
        throw error
      }
      await sleep(pollMs)
    }
  } finally {
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

/** JobHooks producer for `ctx.jobs.start` around one sidecar task. */
function makeTaskJobHooks(manager, taskId) {
  let readCursor = ''
  let resolveDone
  const done = new Promise((resolvePromise) => {
    resolveDone = resolvePromise
  })
  void (async () => {
    for (;;) {
      await sleep(1000)
      try {
        const task = await manager.request(`/tasks/${taskId}`, { timeoutMs: 5000 })
        readCursor = describeTask(task)
        if (task.status === 'done') {
          resolveDone({ status: 'completed', detail: readCursor, output: renderTaskResultText(task) })
          return
        }
        if (task.status === 'error') {
          resolveDone({ status: 'failed', detail: String(task.error).slice(0, 500), output: `failed: ${task.error}` })
          return
        }
        if (task.status === 'cancelled') {
          resolveDone({ status: 'killed', detail: 'cancelled' })
          return
        }
      } catch (error) {
        resolveDone({ status: 'failed', detail: `poll failed: ${error.message}` })
        return
      }
    }
  })()
  return {
    cancel: (reason) => {
      manager.request(`/tasks/${taskId}`, { method: 'DELETE', timeoutMs: 5000 }).catch(() => {})
      void reason
    },
    done,
    readOutput: () => readCursor || `task ${taskId} pending`,
  }
}

function renderTaskResultText(task) {
  const result = task.result
  if (result && typeof result.answer === 'string') return result.answer
  return describeTask(task)
}

/** Start one background job around a sidecar task; returns the job id. */
function startBackgroundJob(ctx, exec, manager, op, label, taskId) {
  const jobs = ctx.get('jobs')
  if (jobs === undefined) {
    throw new Error('background jobs unavailable: the jobs service is not mounted in this deployment')
  }
  return jobs.start({
    kind: 'raganything',
    label,
    ...(exec.agent ? { owner: exec.agent } : {}),
    outputLimitBytes: 65536,
    run: () => makeTaskJobHooks(manager, taskId),
  })
}

async function startTask(manager, op, params, { signal } = {}) {
  await manager.ensureRunning()
  return submitTask(manager, op, params)
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

function ragStatusTool(manager) {
  const config = manager.config
  return {
    name: 'rag_status',
    description:
      'RAG 知识库（RAG-Anything）状态诊断：sidecar 进程健康、初始化状态、各状态文档数、LLM/embedding/解析器配置摘要、任务计数。排查 RAG 工具报错或确认服务可用时调用。',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      try {
        const status = await manager.request('/status', { timeoutMs: 8000 })
        const lines = [
          `sidecar: ${manager.baseUrl()} (${manager.config.isRemote ? '远程共享模式' : '本地托管模式'}, uptime ${status.uptime_s}s, ${status.spawnedByPlugin ? 'spawned by plugin' : 'external'})`,
          `init: ${status.initialized ? 'ready' : `not initialized${status.init_error ? ` — ${status.init_error}` : ''}`}`,
        ]
        if (status.config) {
          lines.push(
            `llm: ${status.config.llm.model} @ ${status.config.llm.base_url} (key: ${status.config.llm.key_present ? 'present' : 'MISSING'})`,
          )
          if (status.config.vision?.model) lines.push(`vision: ${status.config.vision.model}`)
          lines.push(
            `embedding: ${status.config.embedding.backend} ${status.config.embedding.model} (${status.config.embedding.dims}d)`,
          )
          lines.push(`parser: ${status.config.parser}; storage: ${status.config.working_dir}`)
        }
        if (status.docs) lines.push(`docs: ${JSON.stringify(status.docs)}`)
        if (status.tasks) lines.push(`tasks: ${JSON.stringify(status.tasks)}`)
        return lines.join('\n')
      } catch (error) {
        return [
          `sidecar 不可达（${error.message}）。`,
          manager.config.isRemote
            ? `远程共享模式：检查 sidecarHost/sidecarPort/apiToken 配置（服务器 ${manager.baseUrl()} 的 /health 是否可达）。`
            : `下次调用任何 rag_* 工具时会自动尝试拉起（autoStart=${manager.config.autoStart}）。`,
          manager.config.isRemote
            ? null
            : `如持续失败，检查：venv 是否已创建（${manager.config.pythonBin}）、sidecar 配置（${manager.config.sidecarConfig}）、日志（${manager.logPath()}）。`,
        ]
          .filter(Boolean)
          .join('\n')
      }
    },
  }
}

function ragQueryTool(ctx, manager) {
  return {
    name: 'rag_query',
    description:
      '在 RAG-Anything 知识库中检索并生成回答（支持文本/表格/图像多模态索引）。用户问题可能已被入库文档覆盖、或明确要求"查知识库"时使用。可先用 rag_docs 看已入库文档。耗时通常数秒到一分钟；长查询可 run_in_background。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', required: true, description: '用户问题（面向检索的自然语言）' },
        mode: {
          type: 'string',
          enum: ['hybrid', 'local', 'global', 'mix', 'naive'],
          description: '检索模式：hybrid=向量+图谱混合（缺省）、local=实体邻域、global=全局主题、naive=纯向量、mix=多路融合',
        },
        only_need_context: { type: 'boolean', description: '只返回检索到的证据片段，不生成回答' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: '精确制导：只在这些文档内检索，值为知识库里的完整路径（如 01-资料/员工手册.pdf），精确全等匹配。建议先用 rag_docs 确认路径。',
        },
        folders: {
          type: 'array',
          items: { type: 'string' },
          description: '区域聚焦：只在这些文件夹内检索（如 01-资料），包含其下所有子文件夹和文件。',
        },
        run_in_background: {
          type: 'boolean',
          description: '后台执行并立即返回 job id（用 job_output 读取、job_kill 停止）',
        },
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const scope = {
        ...(Array.isArray(args.files) && args.files.length ? { files: args.files } : {}),
        ...(Array.isArray(args.folders) && args.folders.length ? { folders: args.folders } : {}),
      }
      const params = {
        query: args.query,
        ...(args.mode ? { mode: args.mode } : {}),
        ...(args.only_need_context ? { only_need_context: true } : {}),
        ...(Object.keys(scope).length ? { scope } : {}),
      }
      const label = `rag_query: ${args.query.slice(0, 80)}`
      if (args.run_in_background === true) {
        const taskId = await startTask(manager, 'query', params)
        const jobId = startBackgroundJob(ctx, exec, manager, 'query', label, taskId)
        return { kind: 'background', jobId, taskId }
      }
      const taskId = await startTask(manager, 'query', params, { signal: exec.signal })
      const started = Date.now()
      const result = await waitTask(manager, taskId, { signal: exec.signal })
      const seconds = ((Date.now() - started) / 1000).toFixed(1)
      const header = `[rag_query ${result.mode ?? args.mode ?? 'hybrid'} · ${seconds}s]`
      return `${header}\n${typeof result.answer === 'string' ? result.answer : JSON.stringify(result)}`
    },
  }
}

function ragIngestTool(ctx, manager) {
  return {
    name: 'rag_ingest',
    description:
      '把本地文件 ingested 到 RAG-Anything 知识库：.txt/.md 直接写入；PDF/Office/图片经 MinerU 解析（首次使用会下载数 GB 模型，耗时可达数分钟到数十分钟——建议 run_in_background: true）。path 必须是绝对路径。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', required: true, description: '文件的绝对路径' },
        doc_id: { type: 'string', description: '可选自定义文档 ID（缺省自动生成）' },
        parse_method: { type: 'string', enum: ['auto', 'ocr', 'txt'], description: '解析方法（缺省 auto）' },
        run_in_background: {
          type: 'boolean',
          description: '后台执行并立即返回 job id（用 job_output 读取、job_kill 停止）',
        },
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      if (!isAbsolute(args.path)) {
        throw new Error(`path 必须是绝对路径，收到：${args.path}`)
      }
      const params = {
        path: resolve(args.path),
        ...(args.doc_id ? { doc_id: args.doc_id } : {}),
        ...(args.parse_method ? { parse_method: args.parse_method } : {}),
      }
      const label = `rag_ingest: ${basename(args.path)}`
      if (args.run_in_background === true) {
        const taskId = manager.config.isRemote
          ? (await manager.uploadAndIngest(params.path, params)).task_id
          : await startTask(manager, 'ingest', params)
        const jobId = startBackgroundJob(ctx, exec, manager, 'ingest', label, taskId)
        return { kind: 'background', jobId, taskId }
      }
      const taskId = manager.config.isRemote
        ? (await manager.uploadAndIngest(params.path, params, { signal: exec.signal })).task_id
        : await startTask(manager, 'ingest', params, { signal: exec.signal })
      const result = await waitTask(manager, taskId, { signal: exec.signal })
      return [
        'ingested:',
        `  path: ${result.path ?? args.path}`,
        result.doc_id ? `  doc_id: ${result.doc_id}` : null,
        result.chars !== undefined ? `  chars: ${result.chars}` : null,
        `  via: ${result.how ?? 'parser'}`,
      ]
        .filter(Boolean)
        .join('\n')
    },
    presentCall: (args) => ({
      card: 'generic',
      title: `rag_ingest ${basename(String(args.path ?? ''))}`,
      locations: isAbsolute(String(args.path ?? '')) ? [{ path: String(args.path) }] : undefined,
    }),
  }
}

function ragIngestTextTool(ctx, manager) {
  return {
    name: 'rag_ingest_text',
    description:
      '把一段原始文本（笔记、结论、网页摘录、对话要点等）写入 RAG-Anything 知识库供日后检索。适合快速沉淀零散知识；成段的文档文件请用 rag_ingest。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', required: true, description: '知识条目标题（作为来源引用名）' },
        text: { type: 'string', required: true, description: '要入库的正文文本' },
        run_in_background: {
          type: 'boolean',
          description: '后台执行并立即返回 job id（用 job_output 读取、job_kill 停止）',
        },
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const params = { title: args.title, text: args.text }
      const label = `rag_ingest_text: ${args.title.slice(0, 80)}`
      if (args.run_in_background === true) {
        const taskId = await startTask(manager, 'ingest_text', params)
        const jobId = startBackgroundJob(ctx, exec, manager, 'ingest_text', label, taskId)
        return { kind: 'background', jobId, taskId }
      }
      const taskId = await startTask(manager, 'ingest_text', params, { signal: exec.signal })
      const result = await waitTask(manager, taskId, { signal: exec.signal })
      return `ingested "${result.title}" → doc_id ${result.doc_id} (${result.chars} chars)`
    },
  }
}

function ragDocsTool(manager) {
  return {
    name: 'rag_docs',
    description: '列出 RAG-Anything 知识库中已入库的全部文档（ID、标题、状态、分块数、入库时间）。回答前用来确认知识库覆盖范围。',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      const data = await manager.request('/documents', { timeoutMs: 20000 })
      const docs = data.documents ?? []
      if (docs.length === 0) return '知识库为空（尚无入库文档）。'
      const lines = [`共 ${data.total} 篇：`]
      for (const doc of docs) {
        lines.push(
          `- ${doc.id} | ${doc.status} | ${doc.title || '(无标题)'} | ${doc.content_length ?? '?'} chars | ${doc.chunks_count ?? '?'} chunks | ${doc.updated_at ?? ''}${doc.error ? ` | error: ${doc.error}` : ''}`,
        )
      }
      return lines.join('\n')
    },
  }
}

function ragDeleteTool(ctx, manager) {
  return {
    name: 'rag_delete',
    description:
      '从 RAG-Anything 知识库删除一篇文档（按 rag_docs 列出的文档 ID）。用于清理失败/重复的入库条目后重试，或移除过时内容。删除是异步管线操作，通常数秒完成。',
    parameters: {
      type: 'object',
      properties: {
        doc_id: { type: 'string', required: true, description: 'rag_docs 返回的文档 ID' },
        run_in_background: {
          type: 'boolean',
          description: '后台执行并立即返回 job id（用 job_output 读取、job_kill 停止）',
        },
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const params = { doc_id: args.doc_id }
      if (args.run_in_background === true) {
        const taskId = await startTask(manager, 'delete_document', params)
        const jobId = startBackgroundJob(ctx, exec, manager, 'delete_document', `rag_delete: ${args.doc_id}`, taskId)
        return { kind: 'background', jobId, taskId }
      }
      const taskId = await startTask(manager, 'delete_document', params, { signal: exec.signal })
      const result = await waitTask(manager, taskId, { signal: exec.signal })
      return `deleted ${result.deleted}`
    },
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export function apply(ctx, rawConfig = {}) {
  const config = resolveConfig(rawConfig)
  const manager = createSidecarManager(ctx, config)

  // First run: materialize the first-run sidecar config before any rag_* tool
  // can reach the sidecar. No knowledge base data is bundled — each host
  // starts with a fresh, empty knowledge base.
  ensureFirstRunConfig(config)

  // Sidecar lifecycle bound to the plugin fiber: spawned lazily on first use,
  // SIGTERM'd on dispose. A running sidecar is also stopped here so plugin
  // updates restart it with fresh config/credentials.
  ctx.effect(() => () => manager.stop(), 'dsh-raganything: sidecar owner')


  // dsh-multi-user: bring the account's OWN sidecar up with the instance.
  // Without this the panel stays "disconnected" until the first rag_* call,
  // because the plugin only spawns lazily inside startTask().
  if (config.autoStart && !config.isRemote) {
    ctx.effect(() => {
      const timer = setTimeout(() => {
        manager.ensureRunning().catch(() => {})
      }, 5000)
      return () => clearTimeout(timer)
    }, 'dsh-raganything: autostart sidecar')
  }

  ctx.effect(() => ctx.tools.register(ragStatusTool(manager)), 'dsh-raganything: status tool')
  ctx.effect(() => ctx.tools.register(ragQueryTool(ctx, manager)), 'dsh-raganything: query tool')
  ctx.effect(() => ctx.tools.register(ragIngestTool(ctx, manager)), 'dsh-raganything: ingest tool')
  ctx.effect(() => ctx.tools.register(ragIngestTextTool(ctx, manager)), 'dsh-raganything: ingest-text tool')
  ctx.effect(() => ctx.tools.register(ragDocsTool(manager)), 'dsh-raganything: docs tool')
  ctx.effect(() => ctx.tools.register(ragDeleteTool(ctx, manager)), 'dsh-raganything: delete tool')

  const systemPrompt = ctx.get('systemPrompt')
  if (systemPrompt !== undefined) {
    const modeText = config.isRemote
      ? `本部署通过 dsh-raganything 远程共享模式挂载了 ${config.sidecarHost}:${config.sidecarPort} 上的 RAG-Anything 知识库（rag_* 工具）`
      : '本部署挂载了 RAG-Anything 本地知识库（rag_* 工具）'
    ctx.effect(
      () =>
        systemPrompt.section({
          name: 'raganything',
          order: 2950,
          text:
            `${modeText}：rag_docs 查看已入库文档，rag_query 检索回答（长任务用 run_in_background），` +
            'rag_ingest 入库文件、rag_ingest_text 沉淀零散知识，rag_status 诊断。用户提到「知识库 / RAG / 入库 / 查资料」或问题可能已有索引时优先使用。',
        }),
      'dsh-raganything: prompt section',
    )
  }
}
