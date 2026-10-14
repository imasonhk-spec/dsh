// @local/dsh-workbench-bot —— 宿主半入口（cordis 插件）
//
// 职责：
//   1. 初始化领域状态（$DSH_HOME/workbench-bot/state.json）
//   2. 确保 5 个默认私聊 + 对应 ds-bot Bot
//   3. 注册业务适配器（meeting/policy/kb/ppt）
//   4. 挂载 HTTP API /api/workbench-bot/v1/*
//   5. Run Coordinator 调度
//
// 零第三方 import：仅 node: 内置模块。
// 声明依赖：webServer（HTTP 路由）、tools（业务工具探测）。
import * as path from 'node:path'
import { StateStore, createStateHome, DEFAULT_AGENTS } from './src/host/state.js'
import { BotBridge } from './src/host/bridge.js'
import { RunCoordinator } from './src/host/runs/coordinator.js'
import { createAdapter } from './src/host/adapters/index.js'
import { createApi } from './src/host/api.js'

export const inject = ['webServer', 'tools']

let store = null
let coordinator = null
let bridge = null
let adapters = {}
let disposeHttp = null

export function apply(ctx, config = {}) {
  const home = config.home || createStateHome(process.env.DSH_HOME)

  // 1. 领域状态
  store = new StateStore(home)

  // 2. 兼容桥
  bridge = new BotBridge({ ctx, store })

  // 3. 调度器
  coordinator = new RunCoordinator(store)

  // 4. 业务适配器
  // ppt 走进程内直驱（inproc.js），无需 baseUrl/fetch
  adapters = {
    meeting: createAdapter('meeting', { ctx }),
    policy: createAdapter('policy', { ctx }),
    kb: createAdapter('kb', { ctx }),
    ppt: createAdapter('ppt', {}),
  }

  // 5. HTTP API
  const api = createApi({ store, coordinator, adapters, bridge })
  const webServer = ctx.get('webServer')
  if (webServer && typeof webServer.register === 'function') {
    disposeHttp = webServer.register({
      kind: 'prefix',
      path: '/api/workbench-bot/v1',
      handler: (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        api.handle(req, res, url.pathname, req.method)
      },
    })
  }

  // 6. 异步初始化（幂等）
  // 多用户隔离说明：dsh-multi-user 网关为每个账号独立启动一个 DSH 实例（各自 DSH_HOME），
  // 故 workbench-bot/state.json 天然落到各账号 home 下，跨账号不串。ownerId 仅作兜底标识，
  // 优先取 connection 服务暴露的 operator/账号，取不到则回退 config.ownerId / DSH_HOME 基名。
  const ownerId = resolveOwnerId(ctx, config)
  store.ensure().then(() => bridge.initBots(ownerId)).catch(err => {
    // 初始化失败不阻塞 apply，记录后下次重试
    console.error('[workbench-bot] init failed:', err.message)
  })

  // 7. 卸载清理
  ctx.effect(() => {
    return () => {
      if (typeof disposeHttp === 'function') disposeHttp()
    }
  }, 'workbench-bot: cleanup')
}

export const name = 'dsh-workbench-bot'
export { DEFAULT_AGENTS }

// 解析当前账号标识（多用户隔离的兜底键）。优先级：
//   config.ownerId > connection 服务暴露的 operator 账号 > DSH_HOME 路径中的账号名 > 'default'
// dsh-multi-user 网关下每账号独立 DSH 实例，DSH_HOME = .../users/<username>/home，
// 故从路径倒数第二段取 username（home 段本身无区分度）。
function resolveOwnerId(ctx, config = {}) {
  if (config.ownerId) return config.ownerId
  try {
    const conn = ctx.get && ctx.get('connection')
    const cand = conn?.operator?.account
      ?? conn?.operator?.ownerId
      ?? conn?.operator?.id
      ?? conn?.operator?.name
    if (typeof cand === 'string' && cand.length > 0) return cand
  } catch { /* connection 服务可能未注入 */ }
  const homeBase = process.env.DSH_HOME
  if (typeof homeBase === 'string' && homeBase.length > 0) {
    const segs = homeBase.split(/[\\/]/).filter(Boolean)
    // 形如 .../users/<username>/home → username 在倒数第二段
    if (segs.length >= 2 && segs[segs.length - 1] === 'home') {
      const acct = segs[segs.length - 2]
      if (acct && acct !== 'users') return acct
    }
    const last = segs[segs.length - 1]
    if (last && last !== 'home') return last
  }
  return 'default'
}
