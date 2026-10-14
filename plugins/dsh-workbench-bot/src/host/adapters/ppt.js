// PPT 适配器：进程内直驱 @local/huiwen-ppt 后端（不走网络、不过鉴权门禁）
// 路由映射见 docs/api-map.md；真实路由表见 huiwen-ppt/server/router.js。
import { MANIFESTS, adapterError } from './base.js'
import { ensureReady, core, callApi } from './inproc.js'

export class PptAdapter {
  constructor({ fetchImpl } = {}) {
    // 保留参数兼容（fetchImpl 不再使用，进程内直驱无需 fetch）
    this._fetchImpl = fetchImpl
  }

  manifest() {
    return MANIFESTS.ppt
  }

  // 进程内直驱的通用请求包装：把 {status,json} 转成业务返回或抛 adapterError
  async _call(routePath, { method = 'GET', body } = {}) {
    let r
    try {
      r = await callApi(routePath, { method, body })
    } catch (e) {
      throw adapterError('PLUGIN_UNAVAILABLE', `huiwen 进程内直驱失败: ${e.message}`)
    }
    const j = r.json || {}
    if (r.status >= 400) {
      // BOOTING / recoverable 标记 → 映射为可重试错误
      const code = j.recoverable ? 'TIMEOUT'
        : r.status === 404 ? 'SOURCE_NOT_FOUND'
        : 'PLUGIN_UNAVAILABLE'
      throw adapterError(code, `huiwen HTTP ${r.status}: ${j.code || ''} ${j.message || j.raw || ''}`, {
        status: r.status, details: j,
      })
    }
    return j
  }

  async health() {
    try {
      const state = await ensureReady()
      const boot = (await core()).bootState()
      return {
        status: state === 'ready' || state === 'degraded' ? 'ready' : 'unavailable',
        version: state,
        detail: boot,
      }
    } catch (e) {
      return { status: 'unavailable', version: 'unknown', reason: e.message }
    }
  }

  async invoke({ operation, input, signal, expectedArtifactVersion }) {
    await ensureReady()
    switch (operation) {
      case 'ppt.list_templates':
        return this._call('/api/templates')
      case 'ppt.create_project': {
        const r = await this._call('/api/projects/new', { method: 'POST', body: { title: input.title } })
        return { projectId: r.project?.id || r.project_id || r.id, ...r }
      }
      case 'ppt.generate': {
        const r = await this._call(`/api/projects/${input.projectId}/generate`, {
          method: 'POST', body: { phase: input.phase || 'final' },
        })
        return { jobId: r.jobId || r.job_id, projectId: input.projectId, ...r }
      }
      case 'ppt.render': {
        const r = await this._call(`/api/projects/${input.projectId}/render`, { method: 'POST' })
        return { jobId: r.jobId || r.job_id, ...r }
      }
      case 'ppt.status': {
        const r = await this._call(`/api/jobs/${input.jobId}`)
        return r
      }
      case 'ppt.export': {
        const r = await this._call(`/api/projects/${input.projectId}/versions`)
        return r
      }
      default:
        throw adapterError('PLUGIN_UNAVAILABLE', `unknown operation: ${operation}`)
    }
  }

  async reconcile({ stepId, externalJobId }) {
    await ensureReady()
    if (!externalJobId) throw adapterError('OUTCOME_UNKNOWN', 'no externalJobId to reconcile')
    const r = await this._call(`/api/jobs/${externalJobId}`)
    return { state: r.state || r.status, rawStatus: r, ...r }
  }

  async cancel({ stepId, externalJobId }) {
    await ensureReady()
    if (!externalJobId) throw adapterError('CANCEL_UNSUPPORTED', 'no job id')
    return this._call(`/api/jobs/${externalJobId}/cancel`, { method: 'POST' })
  }
}
