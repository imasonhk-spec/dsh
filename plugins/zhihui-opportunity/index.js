/**
 * @local/zhihui-opportunity — 智汇·商机（宿主半）
 *
 * 职责：
 *   1. 按 CAPABILITY-PACK-API v1.0 向工作台注册能力包清单。
 *   2. 提供子前缀路由 /api/zhihui-opportunity（包身份探测 + sidecar 健康检查）。
 *
 * 同源反代：
 *   /zhihui/opportunity/   → 127.0.0.1:3210（静态 + /opp-api、/shared-api 反代）
 *   /opp-api/、/shared-api/ → 127.0.0.1:3210（商机前端硬编码的绝对路径）
 *   /zhihui-sso/session     → 127.0.0.1:3220
 *
 * 零第三方依赖：仅 Node 内置模块。
 */

export const MANIFEST = {
  id: 'zhihui-opportunity',
  title: '智汇·商机',
  description: '商机管理：商机列表与详情、AI 只读分析、Excel 导入变更比对、市场方案待办',
  entryKey: 'cap:zhihui-opportunity',
  order: 31,
  icon: '🎯',
  category: '市场经营',
  version: 'v0.1.0',
  tags: ['商机', '市场方案', 'AI 分析', '导入比对'],
  subs: ['商机列表', '商机详情', 'AI 分析', '导入变更', '方案待办'],
  openEvent: 'cappacks:open-zhihui-opportunity',
}

const APP_URL = '/zhihui/opportunity/'
const SSO_URL = '/zhihui-sso/session?app=opportunity'
const HEALTH_URL = 'http://127.0.0.1:3210/zhihui/opportunity/health'

import { installLicense } from './license-http.mjs'; /* PATCH:V5-o2pack-import */
export const inject = ['webServer']

function sendJson(res, status, body) {
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

async function probe(url, timeoutMs = 2500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return { ok: response.ok, status: response.status }
  } catch (error) {
    return { ok: false, status: 0, error: String((error && error.message) || error) }
  } finally {
    clearTimeout(timer)
  }
}

export function apply(ctx, _config) {
  const disposers = []

  /* PATCH:V5-o2pack-apply */
  // 授权门禁：本插件自带授权运行时，不依赖工作台；apply 阶段绝不 throw
  const __lic = installLicense(ctx, { pluginId: 'zhihui-opportunity', prefix: '/api/zhihui-opportunity' });
  try { disposers.push(() => { try { __lic.gate.flush(); } catch {} }); } catch {}

  try {
    const ws = ctx.webServer || (ctx.get && ctx.get('webServer'))
    if (ws && typeof ws.register === 'function') {
      disposers.push(
        ws.register({
          kind: 'prefix',
          path: '/api/zhihui-opportunity',
          handler(req, res) {
            if (__lic.intercept(req, res)) return; /* PATCH:V5-o2pack-guard */
            const url = new URL(req.url || '/', 'http://127.0.0.1')
            const rest = url.pathname.replace(/^\/api\/zhihui-opportunity/, '').replace(/\/$/, '')
            if (rest === '' || rest === '/health') {
              probe(HEALTH_URL)
                .then((upstream) => {
                  sendJson(res, upstream.ok ? 200 : 503, {
                    ok: upstream.ok,
                    package: MANIFEST.id,
                    entryKey: MANIFEST.entryKey,
                    appUrl: APP_URL,
                    ssoUrl: SSO_URL,
                    upstream,
                  })
                })
                .catch((error) => sendJson(res, 500, { ok: false, error: String(error) }))
              return
            }
            sendJson(res, 404, { ok: false, error: 'NOT_FOUND' })
          },
        }),
      )
    }
  } catch {
    /* webServer 不可用时仅保留能力注册 */
  }

  try {
    let registered = null
    const attempt = () => {
      let wc = null
      try {
        wc = ctx.get && ctx.get('workbenchCapabilities')
      } catch {
        wc = null
      }
      if (wc && typeof wc.register === 'function') {
        try {
          wc.register(MANIFEST)
          registered = wc
          return true
        } catch {
          return false
        }
      }
      return false
    }
    if (attempt()) {
      disposers.push(() => {
        try {
          if (registered && typeof registered.unregister === 'function') registered.unregister(MANIFEST.id)
        } catch {
          /* ignore */
        }
      })
    } else {
      let tries = 0
      const timer = setInterval(() => {
        tries += 1
        if (attempt() || tries >= 20) clearInterval(timer)
      }, 150)
      disposers.push(() => clearInterval(timer))
      disposers.push(() => {
        try {
          if (registered && typeof registered.unregister === 'function') registered.unregister(MANIFEST.id)
        } catch {
          /* ignore */
        }
      })
    }
  } catch {
    /* 工作台框架未启用时跳过注册 */
  }

  return () => {
    for (const dispose of disposers.reverse()) {
      try {
        if (typeof dispose === 'function') dispose()
      } catch {
        /* ignore */
      }
    }
  }
}

export default { inject, apply }
