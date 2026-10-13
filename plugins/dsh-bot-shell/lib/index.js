/**
 * dsh-bot-shell — 宿主半（Host half）
 *
 * 职责：在**主实例自身的 web 服务器**上注册一个同源挂载点 `/bot`，把请求反向代理到
 * 一个**独立的 Bot 实例**（自己的 DSH_HOME，只装 ds-bot + 4 个领域插件）。
 *
 * 为什么这样做（而不是在 nginx 上挂）：
 *   浏览器只能经 dsh-multi-user 网关到达主实例，网关会（a）强制会话鉴权、
 *   （b）剥掉浏览器 cookie、（c）按会话路由到**本账号自己的**实例。
 *   因此把 `/bot` 注册在主实例上，天然获得「已登录 + 只能访问自己的 Bot 实例」，
 *   既不新增对外端口/域名/证书，也不需要修改 nginx 或 dsh-multi-user。
 *
 * 🔴 自门控（ownerHome）：
 *   本插件会随宿主 profile 被多用户网关镜像到**每一个账号**。若不加限制，
 *   其他账号会得到一个指向 owner 的 Bot 实例的 `/bot` 入口 —— 跨账号泄漏。
 *   所以只有在 `DSH_HOME` 恰好等于 `ownerHome` 的实例里才真正启用；
 *   其他实例只提供 `/bot/__status` 返回 `{enabled:false}`，`/bot/*` 一律 404。
 *   客户端半先探这个端点，未启用就什么都不注册（连导航入口都不会出现）。
 *
 * 上游鉴权：与网关对用户实例的做法完全一致 ——
 *   Bot 实例的 web 服务器要求一个按 authority 绑定、HMAC 签名的 `dsh-auth-*` cookie。
 *   用它的 `DSH_WEB_TOKEN` 做一次 `GET /?token=...`（Host 固定为 127.0.0.1:<port>）换回该
 *   cookie，**保存在服务端**，之后每个转发请求都带上；上游返回 401 时自动重换一次。
 *   cookie 不下发到浏览器（响应里的 set-cookie 一律剥掉）。
 *
 * 子路径可行性（已在 harness 0.1.7-alpha.2 源码中确认）：
 *   - 构建产物 index.html 用相对路径 `./assets/...`，且注入了 `<base href="./">`；
 *   - 客户端所有路径都经 `document.baseURI` 解析（`/api/remote.mux` 亦然）；
 *   - harness 自带 `apps/web/tests/prefix-proxy.ts` 就是官方的「前缀挂载代理」参考实现。
 */

import { readFileSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { connect as netConnect } from 'node:net'
import { join } from 'node:path'

/** Stable Cordis plugin name. */
export const name = 'dsh-bot-shell'

/** Services this plugin waits for: the host web server owns the route tables. */
export const inject = ['webServer']

/** Headers describing one hop; they must not reach the origin (or the client). */
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-connection', 'transfer-encoding',
  'upgrade', 'te', 'trailer', 'proxy-authenticate', 'proxy-authorization',
])

/** Default configuration values; a profile patch may override any of them. */
const DEFAULTS = {
  botPort: 31097,
  botToken: '',
  botHome: '',
  mount: '/bot',
  /* Only the instance whose DSH_HOME matches this turns the shell on. */
  ownerHome: '',
}

/** Read the Bot instance's web token from its DSH_HOME when config omits it. */
function tokenFromHome(botHome) {
  if (typeof botHome !== 'string' || botHome.length === 0) return ''
  try {
    return readFileSync(join(botHome, '.web-token'), 'utf8').trim()
  } catch {
    return ''
  }
}

/** Strip the mount prefix, keeping the query string. Returns undefined when the path is not ours. */
function routePath(rawUrl, mount) {
  const url = new URL(rawUrl, 'http://dsh.invalid')
  if (url.pathname !== mount && !url.pathname.startsWith(`${mount}/`)) return undefined
  const rest = url.pathname.slice(mount.length)
  return `${rest.startsWith('/') ? rest : `/${rest}`}${url.search}`
}

/** Copy request headers minus hop-by-hop ones. */
function forwardedHeaders(headers) {
  const copy = {}
  for (const [key, value] of Object.entries(headers)) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue
    copy[key] = value
  }
  return copy
}

/** Answer with a small JSON body. */
function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

/**
 * Build the mounted reverse proxy. The transport mirrors harness'
 * `apps/web/tests/prefix-proxy.ts`, plus the gateway's upstream-cookie handling.
 *
 * @param options - resolved configuration for one Bot instance.
 * @returns `{ handler, upgradeHandler, exchange }`.
 */
function createBotProxy(options) {
  const { botPort, botToken, mount } = options
  const authority = `127.0.0.1:${botPort}`
  let cookie
  let exchanging

  const ready = () => cookie !== undefined

  /**
   * Exchange the launch token for the authority-bound browser cookie, exactly
   * once at a time. Resolves to the cookie string, or undefined on failure.
   */
  function exchange() {
    if (exchanging !== undefined) return exchanging
    exchanging = new Promise((resolve) => {
      const request = httpRequest({
        host: '127.0.0.1',
        port: botPort,
        method: 'GET',
        path: `/?token=${encodeURIComponent(botToken)}`,
        headers: { host: authority, accept: 'text/html', 'accept-encoding': 'identity' },
      }, (response) => {
        response.resume()
        const raw = response.headers['set-cookie']
        const list = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
        const hit = list.find((entry) => entry.startsWith('dsh-auth-'))
        cookie = hit === undefined ? undefined : hit.split(';')[0]
        resolve(cookie)
      })
      request.setTimeout(5000, () => request.destroy(new Error('token exchange timed out')))
      request.on('error', () => resolve(undefined))
      request.end()
    }).finally(() => { exchanging = undefined })
    return exchanging
  }

  /** One upstream HTTP request carrying the Bot instance's cookie. */
  function send(req, res, target, retried) {
    const headers = forwardedHeaders(req.headers)
    // The Bot instance enforces its own DNS-rebinding fence on authority, so it
    // must see the loopback authority its cookie was minted for — never the
    // browser's Host (which the gateway already rewrote one hop above).
    headers.host = authority
    // The browser origin is public and cannot match that loopback authority, so
    // it must be suppressed (the same measure the gateway applies upstream).
    // `sec-fetch-site` travels untouched and keeps the cross-site defence.
    delete headers.origin
    if (cookie !== undefined) headers.cookie = cookie

    const upstream = httpRequest({
      host: '127.0.0.1', port: botPort, method: req.method, path: target, headers, agent: false,
    }, (result) => {
      const status = result.statusCode ?? 502
      if (status === 401 && retried !== true) {
        result.resume()
        cookie = undefined
        void exchange().then(() => { send(req, res, target, true) })
        return
      }
      const outHeaders = {}
      for (const [key, value] of Object.entries(result.headers)) {
        const lower = key.toLowerCase()
        if (HOP_BY_HOP.has(lower)) continue
        // The upstream's browser-session cookie is authority-bound to loopback
        // and meaningless in the browser; it stays server-side.
        if (lower === 'set-cookie') continue
        if (lower === 'content-length' || lower === 'content-encoding') continue
        outHeaders[key] = value
      }
      outHeaders['cache-control'] = outHeaders['cache-control'] ?? 'no-store'
      res.writeHead(status, outHeaders)
      result.pipe(res)
    })
    upstream.once('error', (error) => {
      if (res.headersSent) { res.destroy(error); return }
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
      res.end(`dsh-bot-shell: Bot 实例不可达（127.0.0.1:${botPort}）：${error.message}`)
    })
    res.once('close', () => { upstream.destroy() })
    req.pipe(upstream)
  }

  /** HTTP handler: ensure the cookie exists, then proxy. */
  async function handler(req, res) {
    const target = routePath(req.url ?? '/', mount)
    if (target === undefined) {
      res.writeHead(404, { 'cache-control': 'no-store' })
      res.end()
      return
    }
    if (!ready()) await exchange()
    if (!ready()) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
      res.end('dsh-bot-shell: 无法与 Bot 实例完成鉴权握手（检查 botToken / botHome/.web-token 与 botPort）')
      return
    }
    send(req, res, target, false)
  }

  /**
   * WebSocket upgrade handler: replay the request line + raw headers at the
   * origin after stripping the mount, then pipe both directions raw. The
   * api-gateway mux lives at `/api/remote.mux`, which the page resolves against
   * its own base href, so it arrives as `<mount>/api/remote.mux`.
   */
  function upgradeHandler(req, socket, head) {
    const target = routePath(req.url ?? '/', mount)
    if (target === undefined) { socket.destroy(); return }
    const upstream = netConnect(botPort, '127.0.0.1')
    upstream.once('connect', () => {
      upstream.write(`${req.method} ${target} HTTP/1.1\r\n`)
      for (let index = 0; index < req.rawHeaders.length; index += 2) {
        const key = req.rawHeaders[index]
        const lower = String(key).toLowerCase()
        if (lower === 'host' || lower === 'cookie' || lower === 'origin') continue
        upstream.write(`${key}: ${req.rawHeaders[index + 1]}\r\n`)
      }
      upstream.write(`Host: ${authority}\r\n`)
      if (cookie !== undefined) upstream.write(`Cookie: ${cookie}\r\n`)
      upstream.write('\r\n')
      if (head.length > 0) upstream.write(head)
      socket.pipe(upstream).pipe(socket)
    })
    upstream.once('error', () => { socket.destroy() })
    socket.once('error', () => { upstream.destroy() })
    upstream.once('close', () => { socket.destroy() })
    socket.once('close', () => { upstream.destroy() })
  }

  return { handler, upgradeHandler, exchange }
}

/**
 * Plugin entry. `webServer` is required (`inject`), so a missing instance means
 * the loader did not honour the default export — log loudly instead of failing
 * silently with a 404 on `/bot`.
 *
 * @param ctx - Cordis host context.
 * @param rawConfig - the insert row's `config` object.
 * @returns disposer removing the routes.
 */
export function apply(ctx, rawConfig = {}) {
  const webServer = ctx.get('webServer')
  if (webServer === undefined || typeof webServer.register !== 'function') {
    ctx.logger?.error?.('dsh-bot-shell: webServer 服务不可用，/bot 挂载未注册')
    return () => {}
  }
  const config = { ...DEFAULTS, ...(rawConfig ?? {}) }
  const mount = (() => {
    const value = String(config.mount ?? '/bot').trim()
    const withSlash = value.startsWith('/') ? value : `/${value}`
    return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
  })()
  const botPort = Number.isInteger(config.botPort) ? config.botPort : DEFAULTS.botPort
  const ownerHome = String(config.ownerHome ?? '').trim()
  const instanceHome = String(process.env.DSH_HOME ?? '').trim()
  /* Self-gating: the shell may only exist in the owner's own instance. */
  const enabled = ownerHome.length > 0 && instanceHome === ownerHome
  const botToken = String(config.botToken ?? '').trim() || tokenFromHome(config.botHome)

  const disposers = []
  const status = { enabled, mount, botPort, ownerHome, instanceHome }
  disposers.push(webServer.register({
    kind: 'exact', path: `${mount}/__status`, handler: (req, res) => { sendJson(res, 200, status) },
  }))

  if (!enabled) {
    disposers.push(webServer.register({
      kind: 'prefix', path: mount, handler: (req, res) => {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
        res.end('dsh-bot-shell: 未在本实例启用')
      },
    }))
    ctx.logger?.info?.(`dsh-bot-shell: disabled (DSH_HOME=${instanceHome || '(unset)'} != ownerHome=${ownerHome || '(unset)'})`)
    return () => {
      for (const dispose of disposers) {
        try { dispose() } catch { /* already released */ }
      }
    }
  }

  if (botToken.length === 0) {
    ctx.logger?.warn?.('dsh-bot-shell: 未配置 botToken 且未能从 botHome/.web-token 读取，/bot 会返回 503')
  }
  const proxy = createBotProxy({ botPort, botToken, mount })
  disposers.push(webServer.register({ kind: 'prefix', path: mount, handler: proxy.handler }))
  if (typeof webServer.registerUpgrade === 'function') {
    disposers.push(webServer.registerUpgrade({ path: `${mount}/api/remote.mux`, handler: proxy.upgradeHandler }))
  }
  ctx.logger?.info?.(`dsh-bot-shell: mounted ${mount}/ -> http://127.0.0.1:${botPort}`)

  return () => {
    for (const dispose of disposers) {
      try { dispose() } catch { /* already released */ }
    }
  }
}

export default { inject, apply }
