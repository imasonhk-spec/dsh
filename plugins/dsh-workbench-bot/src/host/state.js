// workbench-bot 领域状态层（D1 合同实现）
// 持久化：$DSH_HOME/workbench-bot/state.json，复用 ds-bot 的 home-lock + revision 模式。
// 零第三方依赖：仅 node: 内置模块。
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { randomUUID } from 'node:crypto'

const EMPTY_STATE = () => ({
  version: 1,
  revision: 0,
  agents: {},            // agentId -> AgentDefinition
  conversations: {},     // id -> Conversation
  memberships: {},       // id -> Membership
  sessionBindings: {},   // id -> SessionBinding
  runs: {},              // id -> Run
  steps: {},             // id -> Step
  questions: {},         // id -> Question
  artifacts: {},         // id -> Artifact
  attachments: {},       // id -> Attachment
  outbox: [],            // OutboxEntry[]
  events: [],            // EventRecord[]
  readCursors: {},       // conversationId -> ReadCursor
  conversationModels: {},// id -> ConversationModel
  contextSelections: {}, // id -> ContextSelection
})

export function createStateHome(dshHome) {
  return path.join(dshHome || process.env.DSH_HOME || path.join(process.env.HOME || '', '.dsh'), 'workbench-bot')
}

export class StateStore {
  constructor(home) {
    this.home = home
    this.statePath = path.join(home, 'state.json')
    this.state = EMPTY_STATE()
    this._writing = Promise.resolve()
    this._seq = 0
  }

  async ensure() {
    await fsp.mkdir(this.home, { recursive: true })
    try {
      const raw = await fsp.readFile(this.statePath, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed?.version === 1) {
        this.state = { ...EMPTY_STATE(), ...parsed }
        this._seq = (this.state.events?.length) || 0
      }
    } catch (e) {
      if (e?.code !== 'ENOENT') {
        // 可读但损坏：保留旧文件，从空状态启动（不静默覆盖）
        this.state = EMPTY_STATE()
      }
    }
  }

  // 乐观锁：任何有效状态修改递增 revision
  bump() {
    this.state.revision += 1
  }

  // 追加事件并递增 seq
  emit(conversationId, type, entityId, payload, extra = {}) {
    this._seq += 1
    this.state.events.push({
      id: randomUUID(),
      ownerId: extra.ownerId || this.state.ownerId || '',
      conversationId,
      seq: this._seq,
      type,
      entityId,
      runId: extra.runId,
      revision: this.state.revision,
      payload,
      occurredAt: Date.now(),
    })
    // 事件日志上限，避免无限增长（保留最近 5000 条）
    if (this.state.events.length > 5000) {
      this.state.events = this.state.events.slice(-5000)
    }
    return this._seq
  }

  // 原子写（串行写锁）
  async save() {
    const write = this._writing.then(async () => {
      const tmp = this.statePath + '.tmp'
      await fsp.mkdir(this.home, { recursive: true })
      await fsp.writeFile(tmp, JSON.stringify(this.state, null, 2), 'utf8')
      await fsp.rename(tmp, this.statePath)
    })
    this._writing = write.catch(() => {})
    return write
  }

  highWatermark() {
    return this._seq
  }
}

// —— 默认五个私聊定义 ——
export const DEFAULT_AGENTS = [
  { agentId: 'chief',   capabilityId: 'chief',          title: '总 Agent',  adapterId: 'chief',   order: 0 },
  { agentId: 'meeting', capabilityId: 'cap:meeting',    title: '会议助手',  adapterId: 'meeting', order: 1 },
  { agentId: 'policy',  capabilityId: 'cap:policy-analysis', title: '政策解读', adapterId: 'policy', order: 2 },
  { agentId: 'kb',      capabilityId: 'kb',             title: '知识库',    adapterId: 'kb',      order: 3 },
  { agentId: 'ppt',     capabilityId: 'cap:huiwen-ppt', title: '汇文 PPT',  adapterId: 'ppt',     order: 4 },
]

export function ensureDefaultConversations(store, ownerId) {
  store.state.ownerId = ownerId
  for (const def of DEFAULT_AGENTS) {
    const existing = Object.values(store.state.conversations).find(
      c => c.ownerId === ownerId && c.isDefault && c.directAgentId === def.agentId
    )
    if (existing) continue
    // conversation id 含 ownerId，避免跨账号 id 冲突（A25 隔离要求）
    const id = `conv-${ownerId}-${def.agentId}`
    store.state.conversations[id] = {
      id,
      ownerId,
      kind: 'direct',
      title: def.title,
      isDefault: true,
      directAgentId: def.agentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      revision: 1,
      lastSeq: 0,
      archived: false,
    }
    store.state.memberships[`${id}:${ownerId}`] = {
      conversationId: id, memberId: 'user', type: 'user', role: 'owner', joinedAt: Date.now(),
    }
    store.state.memberships[`${id}:${def.agentId}`] = {
      conversationId: id, memberId: def.agentId, type: 'agent', role: 'member', joinedAt: Date.now(),
    }
  }
}
