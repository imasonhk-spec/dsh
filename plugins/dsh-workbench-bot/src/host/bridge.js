// Bot Compatibility Bridge：对接 ds-bot 运行时（rt）与领域层
// 职责：5 Bot 初始化、私聊/群聊映射、消息投递（outbox）、@ 路由
// 关键：不复制 ds-bot 的群聊调度，通过 rt 的 deliver/createBot/createRoom 复用其能力。
import { DEFAULT_AGENTS, ensureDefaultConversations } from './state.js'

export class BotBridge {
  constructor({ ctx, store }) {
    this.ctx = ctx
    this.store = store
    this.rt = null // ds-bot 的运行时 rt，延迟获取
  }

  // 尝试从 ctx 获取 ds-bot 的 rt（ds-bot apply 时挂在 ctx 上）
  resolveRt() {
    if (this.rt) return this.rt
    // ds-bot 的 index.js 里 rt 是 apply 内部局部变量；此处通过约定挂载点获取
    // 实际接入时：ds-bot 定制分支在 apply 末尾 ctx.set('dsBotRt', rt)
    const rt = this.ctx?.get?.('dsBotRt')
    if (rt) this.rt = rt
    return rt
  }

  // 初始化：确保 5 个默认私聊 + 对应 Bot 存在
  async initBots(ownerId) {
    ensureDefaultConversations(this.store, ownerId)
    const rt = this.resolveRt()

    for (const def of DEFAULT_AGENTS) {
      this.store.state.agents[def.agentId] = {
        agentId: def.agentId,
        capabilityId: def.capabilityId,
        adapterId: def.adapterId,
        title: def.title,
        health: 'ready',
        operations: [],
        modelPolicy: { default: 'inherit', businessRoute: 'unchanged' },
      }
    }

    // 若 ds-bot rt 可用，确保 4 个业务 Bot（chief 复用 Main Bot）
    if (rt && typeof rt.createBot === 'function') {
      for (const def of DEFAULT_AGENTS.filter(a => a.agentId !== 'chief')) {
        const existing = rt.findBot?.(def.title)
        if (!existing) {
          try {
            await rt.createBot({
              name: def.title,
              role: this.roleFor(def.agentId),
              instructions: this.instructionsFor(def.agentId),
            })
          } catch (e) {
            // Bot 已存在或其他错误：不阻断初始化
          }
        }
      }
    }
    this.store.bump()
    await this.store.save()
  }

  roleFor(agentId) {
    return {
      meeting: '会议纪要助手：整理会议记录、提炼决策与行动项',
      policy: '政策解读助手：检索政策原文、比较版本、整理证据链',
      kb: '知识库助手：RAG 检索、来源引用、按需入库',
      ppt: '汇文 PPT 助手：模板、大纲、生成、渲染、导出与编辑',
    }[agentId] || '协作成员'
  }

  instructionsFor(agentId) {
    const m = {
      meeting: '从会议纪要中提取决策、行动项和风险点，输出结构化 brief 并附原文锚点。',
      policy: '执行 preflight → extract → evidence_check 门禁链，输出适用范围与 C/E 证据引用。',
      kb: '检索用户知识库，返回来源片段、文档名称与位置，无结果时如实说明。',
      ppt: '根据内容包生成 PPT 项目、大纲、页面，渲染后交付预览与编辑入口。',
    }
    return m[agentId] || ''
  }

  // 新建会话（私聊/群聊）
  async createConversation(body) {
    const ownerId = this.store.state.ownerId
    const id = `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const conv = {
      id,
      ownerId,
      kind: body.kind === 'group' ? 'group' : 'direct',
      title: body.title || (body.kind === 'group' ? '群聊' : '会话'),
      isDefault: false,
      ...(body.kind !== 'group' && body.agentId ? { directAgentId: body.agentId } : {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      revision: 1,
      lastSeq: 0,
      archived: false,
    }
    this.store.state.conversations[id] = conv
    // 成员
    this.store.state.memberships[`${id}:user`] = { conversationId: id, memberId: 'user', type: 'user', role: 'owner', joinedAt: Date.now() }
    const memberIds = body.kind === 'group' ? (body.agentIds || []) : (body.agentId ? [body.agentId] : [])
    for (const aid of ['chief', ...memberIds.filter(a => a !== 'chief')]) {
      this.store.state.memberships[`${id}:${aid}`] = { conversationId: id, memberId: aid, type: 'agent', role: aid === 'chief' ? 'coordinator' : 'member', joinedAt: Date.now() }
    }
    this.store.bump()
    await this.store.save()
    return conv
  }

  // 发送消息（outbox 对账投递）
  async sendMessage(conversationId, body) {
    const conv = this.store.state.conversations[conversationId]
    if (!conv) { const e = new Error('conversation not found'); e.code = 'SOURCE_NOT_FOUND'; throw e }

    const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const bridgeCommandId = `cmd_${messageId}`

    // 去重：同 clientMessageId 已存在则返回原 id
    if (body.clientMessageId) {
      const dup = this.store.state.outbox.find(o => o.payload?.clientMessageId === body.clientMessageId && o.conversationId === conversationId)
      if (dup && dup.upstreamMessageId) {
        return { messageId: dup.upstreamMessageId, conversationId, status: 'accepted' }
      }
    }

    // 写 outbox（pending）
    this.store.state.outbox.push({
      bridgeCommandId,
      conversationId,
      payload: {
        clientMessageId: body.clientMessageId,
        text: body.text,
        mentionAgentIds: body.mentionAgentIds || [],
        attachmentIds: body.attachmentIds || [],
        artifactRefs: body.artifactRefs || [],
        replyTo: body.replyTo,
        questionId: body.questionId,
      },
      state: 'pending',
      attempts: 0,
    })

    // 投递到 ds-bot（若 rt 可用）
    const rt = this.resolveRt()
    if (rt && typeof rt.deliver === 'function') {
      try {
        // 投递到会话对应的上游 chat/room
        // 简化：投递到 chief（总 Agent），由其调度
        const chiefId = Object.values(rt.state?.bots || {}).find(b => b.name === 'Chief')?.id
        if (chiefId) {
          await rt.deliver({ fromId: undefined, toId: chiefId, text: body.text, role: 'user' })
        }
        const entry = this.store.state.outbox[this.store.state.outbox.length - 1]
        entry.state = 'acked'
        entry.upstreamMessageId = messageId
      } catch (e) {
        const entry = this.store.state.outbox[this.store.state.outbox.length - 1]
        entry.state = 'failed'
      }
    }

    conv.lastSeq += 1
    conv.updatedAt = Date.now()
    this.store.bump()
    this.store.emit(conversationId, 'message.committed', messageId, { messageId, sender: { type: 'user', id: 'user' } })
    await this.store.save()
    return { messageId, conversationId, status: 'accepted' }
  }

  async listMessages(conversationId) {
    // 消息由 ds-bot 的 chat session 权威；此处返回 outbox + 事件投影
    const events = this.store.state.events.filter(e => e.conversationId === conversationId && e.type === 'message.committed')
    return events.map(e => ({ id: e.entityId, ...e.payload }))
  }
}
