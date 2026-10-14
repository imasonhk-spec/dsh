// 进程内直驱：把 @local/huiwen-ppt 的后端能力在本进程内直接调用，
// 不走网络、不过 connection.requestRejection 鉴权门禁。
//
// 为什么需要它
//   @local/huiwen-ppt 的 inject 只有 ['webServer']，只注册 HTTP 前缀路由
//   /api/huiwen-ppt/* 与一张工作台能力清单，没有任何 tools。
//   它自己的 handlePackHttpRequest 会先过 connection.requestRejection（401/403 门禁），
//   而门禁要求浏览器 session 鉴权——后端插件（如本适配器）无法自带该凭证。
//
// 做法（与已验证的 dsh-huiwen-bridge 同源）
//   本插件与 huiwen-ppt 跑在同一宿主进程，直接动态 import 它的组合根
//   server/server.js，用合成 req/res 调 handlePackRequest()。
//   - 用 realpath 解析保证同一模块实例，否则 boot 状态不是同一份 → 永远 503 BOOTING。
//   - 因此不需要 HTTP 端口、cookie 交换、connection.requestRejection。
//
// 后端同一份
//   huiwen 的 dataDir 是全局绝对路径，所有实例共用 ⇒ Bot 建的项目，
//   用户在 DSH 的「汇文 PPT」面板里能直接看到并继续编辑。
import { createRequire } from 'node:module'
import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { Readable } from 'node:stream'

const PKG = '@local/huiwen-ppt'

let corePromise

/** 解析并加载 huiwen 的 server/server.js（确保与插件本体同一模块实例）。 */
export function core() {
  corePromise ??= (async () => {
    const require_ = createRequire(import.meta.url)
    let base
    try {
      base = path.dirname(realpathSync(require_.resolve(PKG + '/package.json')))
    } catch {
      base = path.dirname(realpathSync(require_.resolve(PKG)))
    }
    const href = pathToFileURL(path.join(base, 'server', 'server.js')).href
    return await import(href)
  })()
  return corePromise
}

// 惰性 initCore 保护：只有从未初始化（idle）时才触发，避免与 huiwen-ppt 插件自身的
// apply→initCore 重复竞争；boot 处于 booting/indexing 时等待其就绪。
export async function ensureReady() {
  const mod = await core()
  const boot = mod.bootState()
  if (boot.state === 'ready' || boot.state === 'degraded') return boot.state
  if (boot.state === 'idle') {
    await mod.initCore()
    return mod.bootState().state
  }
  // booting / indexing：轮询等待（最多 ~30s）
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    const s = mod.bootState().state
    if (s === 'ready' || s === 'degraded') return s
    await new Promise(r => setTimeout(r, 300))
  }
  return mod.bootState().state
}

/**
 * 用合成 req/res 调 huiwen 的 handlePackRequest。
 * @param {string} routePath 去掉 /api/huiwen-ppt 前缀后的路径，如 '/api/projects/new'
 */
export async function callApi(routePath, { method = 'GET', body } = {}) {
  const mod = await core()
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8')
  const req = Readable.from(payload ? [payload] : [])
  req.method = method
  req.headers = { host: '127.0.0.1', 'content-type': 'application/json' }

  const url = new URL('http://127.0.0.1/api/huiwen-ppt' + routePath)
  const chunks = []
  let status = 200
  const res = {
    writeHead(code, headers) { status = code; this.headers = headers || {} },
    setHeader() {},
    end(chunk) {
      if (chunk !== undefined && chunk !== null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
      }
    },
    headers: {},
  }

  const handled = await mod.handlePackRequest(req, res, url, routePath)
  if (!handled) {
    return { status: 404, json: { ok: false, code: 'NOT_ROUTED', message: '不是 huiwen 的 API 路径：' + routePath } }
  }
  const text = Buffer.concat(chunks).toString('utf8')
  let json
  try { json = JSON.parse(text) } catch { json = { ok: status < 400, raw: text.slice(0, 4000) } }
  return { status, json }
}
