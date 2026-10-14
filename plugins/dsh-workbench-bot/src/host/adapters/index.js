// 会议 / 政策 / 知识库适配器：复用业务插件已注册的 dsh 工具（ctx.tools）
// 这些能力已作为 tool 注册到 ctx.tools，适配器通过 ctx 拿到工具并代理调用。
// 若 ctx.tools 不可用（冷启动/未注入），health 返回 unavailable。
import { MANIFESTS, adapterError } from './base.js'
import { PptAdapter } from './ppt.js'

// 会议适配器：meeting_create（已有）+ 通过 HTTP 读纪要（meeting_read_minutes 需新增）
export class MeetingAdapter {
  constructor({ ctx, baseUrl = '/api/meeting-assistant', fetchImpl }) {
    this.ctx = ctx
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetch = fetchImpl || globalThis.fetch
  }

  manifest() { return MANIFESTS.meeting }

  async health() {
    // 纪要能力依赖 ctx.tools 有 meeting_create，或 HTTP 后端可达
    const tools = this.ctx?.get?.('tools')
    const hasTool = tools && typeof tools.register === 'function'
    return { status: hasTool ? 'ready' : 'unavailable', version: '1.0.0', reason: hasTool ? undefined : 'tools service not injected' }
  }

  async _http(method, pathname, body) {
    if (!this.fetch) throw adapterError('PLUGIN_UNAVAILABLE', 'no fetch')
    const res = await this.fetch(this.baseUrl + pathname, {
      method, headers: { 'content-type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) throw adapterError('PLUGIN_UNAVAILABLE', `HTTP ${res.status}`)
    return res.json()
  }

  async invoke({ operation, input }) {
    switch (operation) {
      case 'meeting.list_recent':
        return this._http('GET', '/meetings', undefined)
      case 'meeting.read_minutes':
        return this._http('GET', `/minutes/${input.artifactRef || input.minutesId}`, undefined)
      default:
        throw adapterError('PLUGIN_UNAVAILABLE', `operation ${operation} 需通过已注册 tool 执行（meeting_create）`)
    }
  }
}

// 政策适配器：policy_preflight / extract / evidence_check 三工具
export class PolicyAdapter {
  constructor({ ctx }) { this.ctx = ctx }

  manifest() { return MANIFESTS.policy }

  async health() {
    const tools = this.ctx?.get?.('tools')
    return { status: tools ? 'ready' : 'unavailable', version: '1.0.0' }
  }

  // 门禁链约束次序：preflight -> extract -> evidence_check，门禁失败不可绕过
  async invoke({ operation }) {
    // 实际执行由已注册的 policy_* 工具完成；这里返回结构化说明，供 Run Coordinator 编排
    const order = ['policy.preflight', 'policy.extract', 'policy.evidence_check']
    if (!order.includes(operation)) throw adapterError('PLUGIN_UNAVAILABLE', `unknown: ${operation}`)
    throw adapterError('PLUGIN_UNAVAILABLE', `${operation} 须经 ctx.tools 的 policy_* 工具执行，见 policy-analysis/index.js:4236`)
  }
}

// 知识库适配器：rag_* 六工具（经 ctx.effect 注册）
export class KbAdapter {
  constructor({ ctx }) { this.ctx = ctx }

  manifest() { return MANIFESTS.kb }

  async health() {
    const tools = this.ctx?.get?.('tools')
    return { status: tools ? 'ready' : 'unavailable', version: '1.0.0' }
  }

  async invoke({ operation }) {
    throw adapterError('PLUGIN_UNAVAILABLE', `${operation} 须经 ctx.tools 的 rag_* 工具执行，见 raganything-kb/lib/index.js:1220`)
  }
}

// 适配器工厂
export function createAdapter(kind, opts) {
  switch (kind) {
    case 'ppt': return new PptAdapter(opts)
    case 'meeting': return new MeetingAdapter(opts)
    case 'policy': return new PolicyAdapter(opts)
    case 'kb': return new KbAdapter(opts)
    default: throw adapterError('PLUGIN_UNAVAILABLE', `unknown adapter kind: ${kind}`)
  }
}
