// HTTP API 层：/api/workbench-bot/v1/*（设计文档 9 节合同）
// 失败统一格式：{"error":{"code","message","retryable","requestId","details"}}
import { randomUUID } from 'node:crypto'

function sendJson(res, body, status = 200) {
  const payload = JSON.stringify(body)
  try {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(payload)
  } catch { /* 连接关闭 */ }
}

function sendError(res, code, message, status, details) {
  sendJson(res, { error: { code, message, retryable: status >= 500, requestId: randomUUID(), details } }, status)
}

function readBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0; let done = false
    req.on('data', c => {
      if (done) return
      size += c.length
      if (size > maxBytes) { done = true; req.destroy(); reject(new Error('请求体过大')); return }
      chunks.push(c)
    })
    req.on('end', () => { if (done) return; done = true; resolve(Buffer.concat(chunks).toString('utf8')) })
    req.on('error', e => { if (done) return; done = true; reject(e) })
  })
}

export function createApi({ store, coordinator, adapters, bridge }) {
  const ownerId = () => store.state.ownerId || ''

  async function handle(req, res, pathname, method) {
    const seg = pathname.replace(/^\/api\/workbench-bot\/v1\/?/, '').split('/').filter(Boolean)

    try {
      // GET /bootstrap
      if (seg.length === 0 && method === 'GET') {
        return sendJson(res, {
          agents: Object.values(store.state.agents),
          conversations: Object.values(store.state.conversations).filter(c => c.ownerId === ownerId()),
          highWatermark: store.highWatermark(),
        })
      }

      // GET /conversations
      if (seg[0] === 'conversations' && seg.length === 1 && method === 'GET') {
        return sendJson(res, {
          items: Object.values(store.state.conversations).filter(c => c.ownerId === ownerId()),
          nextCursor: null,
        })
      }

      // POST /conversations （新建私聊/群聊）
      if (seg[0] === 'conversations' && seg.length === 1 && method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}')
        const conv = await bridge.createConversation(body)
        return sendJson(res, conv, 201)
      }

      // GET /conversations/:id/messages
      if (seg[0] === 'conversations' && seg[2] === 'messages' && method === 'GET') {
        const msgs = await bridge.listMessages(seg[1])
        return sendJson(res, { items: msgs, nextBeforeSeq: null, lastSeq: store.state.conversations[seg[1]]?.lastSeq || 0 })
      }

      // POST /conversations/:id/messages （发送消息）
      if (seg[0] === 'conversations' && seg[2] === 'messages' && method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}')
        const r = await bridge.sendMessage(seg[1], body)
        return sendJson(res, r, 202)
      }

      // POST /runs （手动创建 run）
      if (seg[0] === 'runs' && seg.length === 1 && method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}')
        const run = coordinator.createRun({
          ownerId: ownerId(), conversationId: body.conversationId,
          triggerMessageId: body.triggerMessageId, taskSpec: body.taskSpec,
          inputRefs: body.inputRefs,
        })
        await store.save()
        return sendJson(res, run, 202)
      }

      // GET /runs/:id
      if (seg[0] === 'runs' && seg.length === 2 && method === 'GET') {
        const run = store.state.runs[seg[1]]
        if (!run) return sendError(res, 'SOURCE_NOT_FOUND', 'run not found', 404)
        const steps = Object.values(store.state.steps).filter(s => s.runId === run.id)
        const questions = Object.values(store.state.questions).filter(q => q.runId === run.id)
        const artifacts = Object.values(store.state.artifacts).filter(a => a.runId === run.id)
        return sendJson(res, { run, steps, questions, artifacts })
      }

      // GET /artifacts/:id
      if (seg[0] === 'artifacts' && seg.length === 2 && method === 'GET') {
        const art = store.state.artifacts[seg[1]]
        if (!art) return sendError(res, 'SOURCE_NOT_FOUND', 'artifact not found', 404)
        return sendJson(res, art)
      }

      // GET /health（适配器健康）
      if (seg[0] === 'health' && method === 'GET') {
        const out = {}
        for (const [kind, adapter] of Object.entries(adapters)) {
          out[kind] = await adapter.health()
        }
        return sendJson(res, out)
      }

      return sendError(res, 'PLUGIN_UNAVAILABLE', `no route: ${method} ${pathname}`, 404)
    } catch (e) {
      if (e.code && e.code !== 'PLUGIN_UNAVAILABLE') {
        return sendError(res, e.code, e.message, e.status || 500, e.details)
      }
      return sendError(res, 'PLUGIN_UNAVAILABLE', e.message, 500)
    }
  }

  return { handle }
}
