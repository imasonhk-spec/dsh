/**
 * @local/dsh-workbench — 工作台能力包框架（宿主半）
 *
 * 职责：
 *   1. 提供服务 `workbenchCapabilities`（register / unregister / list / reconcile），
 *      供各能力包宿主半在 apply 时注册自身 manifest（可选依赖，ctx.get 即可）。
 *   2. 提供 HTTP 路由 prefix `/api/workbench`（GET capabilities / POST register /
 *      POST unregister），作为服务通道之外的兜底注册通道。
 *   3. 运行期 Map 为注册表权威；capabilities.json 仅作缓存，list()/GET 时 reconcile
 *      以运行期集合重写缓存（自动清除停机期间被卸载的能力包残留）。
 *
 * 零第三方 import：仅 Node 内置模块。
 */

import * as fsp from 'node:fs/promises'
import * as path from 'node:path'

/** 声明依赖：cordis 等待并注入 webServer（未声明时 ctx.get 拿不到实例）。 */
export const inject = ['webServer']

/* ------------------------------------------------------------------ */
/* 持久化（缓存）                                                       */
/* ------------------------------------------------------------------ */

function dataFile() {
  const home = process.env.DSH_HOME || (process.env.HOME ? path.join(process.env.HOME, '.dsh') : process.cwd())
  return path.join(home, 'workbench', 'capabilities.json')
}

async function persist(list) {
  await fsp.mkdir(path.dirname(dataFile()), { recursive: true })
  await fsp.writeFile(dataFile(), JSON.stringify(list, null, 2), 'utf8')
}

/* ------------------------------------------------------------------ */
/* HTTP 工具                                                           */
/* ------------------------------------------------------------------ */

function sendJson(res, body, status = 200) {
  const payload = JSON.stringify(body)
  try {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(payload)
  } catch {
    /* 连接已关闭 */
  }
}

function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let done = false
    req.on('data', (c) => {
      if (done) return
      size += c.length
      if (size > maxBytes) {
        done = true
        req.destroy()
        reject(new Error('请求体过大'))
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (done) return
      done = true
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', (e) => {
      if (done) return
      done = true
      reject(e)
    })
  })
}

/* ------------------------------------------------------------------ */
/* 能力包 manifest 规范化                                               */
/* ------------------------------------------------------------------ */

function normalizeManifest(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null
  if (!id) return null
  return {
    id,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : id,
    description: typeof raw.description === 'string' ? raw.description : '',
    entryKey: typeof raw.entryKey === 'string' && raw.entryKey.trim() ? raw.entryKey.trim() : `cap:${id}`,
    order: typeof raw.order === 'number' ? raw.order : 99,
    icon: typeof raw.icon === 'string' ? raw.icon : '',
  }
}

/* ------------------------------------------------------------------ */
/* 插件入口                                                            */
/* ------------------------------------------------------------------ */

export function apply(ctx) {
  /** 注册表权威：运行期 Map。 */
  const byId = new Map()
  const disposers = []

  /** 以当前运行期集合重写缓存（reconcile）。 */
  function reconcile() {
    persist([...byId.values()].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))).catch(() => {
      /* 缓存写失败不影响运行期注册表 */
    })
  }

  const service = {
    register(rawManifest) {
      const manifest = normalizeManifest(rawManifest)
      if (!manifest) return
      byId.set(manifest.id, manifest)
      reconcile()
    },
    unregister(id) {
      if (typeof id !== 'string' || !id) return
      byId.delete(id)
      reconcile()
    },
    list() {
      reconcile()
      return [...byId.values()].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    },
  }

  // 服务通道：能力包宿主半可 ctx.get('workbenchCapabilities') 注册/注销。
  try {
    ctx.provide('workbenchCapabilities', service)
  } catch {
    /* provide 失败时仍保留 HTTP 通道 */
  }

  // HTTP 通道：兜底注册 + 首页数据源。
  try {
    const ws = ctx.webServer || (ctx.get && ctx.get('webServer'))
    if (ws && typeof ws.register === 'function') {
      disposers.push(
        ws.register({
          kind: 'prefix',
          path: '/api/workbench',
          handler: (req, res) => {
            let url
            try {
              url = new URL(req.url || '/', 'http://127.0.0.1')
            } catch {
              sendJson(res, { error: 'BAD_REQUEST', reason: 'URL 解析失败' })
              return
            }
            const method = req.method || 'GET'
            const base = '/api/workbench'
            const rest = url.pathname === base ? '' : url.pathname.slice(base.length + 1)
            const seg = rest.split('/').filter(Boolean)

            if (seg.length === 1 && seg[0] === 'capabilities' && method === 'GET') {
              sendJson(res, { capabilities: service.list() })
              return
            }
            if (seg.length === 2 && seg[0] === 'capabilities' && seg[1] === 'register' && method === 'POST') {
              readBody(req)
                .then((body) => {
                  let parsed = null
                  try {
                    parsed = JSON.parse(body)
                  } catch {
                    /* 非法 JSON */
                  }
                  const manifest = normalizeManifest(parsed)
                  if (!manifest) {
                    sendJson(res, { error: 'BAD_REQUEST', reason: '缺少合法 manifest（需要 id）' })
                    return
                  }
                  service.register(manifest)
                  sendJson(res, { ok: true, manifest })
                })
                .catch((err) => sendJson(res, { error: 'BAD_REQUEST', reason: String((err && err.message) || err) }))
              return
            }
            if (seg.length === 2 && seg[0] === 'capabilities' && seg[1] === 'unregister' && method === 'POST') {
              readBody(req)
                .then((body) => {
                  let parsed = null
                  try {
                    parsed = JSON.parse(body)
                  } catch {
                    /* 非法 JSON */
                  }
                  const id = parsed && typeof parsed.id === 'string' ? parsed.id : ''
                  if (!id) {
                    sendJson(res, { error: 'BAD_REQUEST', reason: '缺少 id' })
                    return
                  }
                  service.unregister(id)
                  sendJson(res, { ok: true })
                })
                .catch((err) => sendJson(res, { error: 'BAD_REQUEST', reason: String((err && err.message) || err) }))
              return
            }
            sendJson(res, { error: 'NOT_FOUND', reason: '接口不存在' })
          },
        }),
      )
    }
  } catch {
    /* webServer 不可用时仅服务通道可用 */
  }

  // 框架自身也是一个能力包（首页网格可展示）。
  service.register({
    id: 'workbench',
    title: '工作台',
    description: '能力包框架首页：查看与打开已加载的场景能力包。',
    entryKey: 'workbench',
    order: 0,
  })

  return () => {
    for (const d of disposers) {
      try {
        if (typeof d === 'function') d()
      } catch {
        /* ignore */
      }
    }
  }
}

export default { inject: ["webServer"], apply }
