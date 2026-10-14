/**
 * @local/dsh-workbench-bot —— 客户端半（Client half，DSH 契约版）
 *
 * 与 shell 同范式：window.__ModuleLoader__.load + React.createElement（无构建）。
 * 注册两处：
 *   - sidebar.panellist  id 'workbench-bot'  → 左侧导航「Bot 协作」
 *   - shell.overlay      id 'workbench-bot'  → 悬浮窗（760×620 两栏，可拖拽/折叠胶囊）
 *
 * 数据源：同源 fetch /api/workbench-bot/v1/*（host 半的 HTTP API）。
 * 渲染安全：Agent 文本一律作为 React 文本节点（非 dangerouslySetInnerHTML）。
 */
window.__ModuleLoader__.load({
  id: 'dsh-workbench-bot',

  factory(require) {
    const React = require('react')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = React

    const BASE = '/api/workbench-bot/v1'
    const AGENT_DEFS = [
      { agentId: 'chief',   title: '总 Agent',  color: '#4f46e5', icon: '◈' },
      { agentId: 'meeting', title: '会议助手',  color: '#0ea5e9', icon: '▣' },
      { agentId: 'policy',  title: '政策解读',  color: '#f59e0b', icon: '⚖' },
      { agentId: 'kb',      title: '知识库',    color: '#10b981', icon: '📚' },
      { agentId: 'ppt',     title: '汇文 PPT',  color: '#ef4444', icon: '▤' },
    ]
    const PANEL_ID = 'workbench-bot'
    const STORE_KEY = 'dsh.workbench.bot.v1'

    /* ------------------------------------------------------------------ */
    /* transport（host 半 HTTP API）                                       */
    /* ------------------------------------------------------------------ */
    const transport = {
      async _req(method, path, body) {
        const res = await fetch(BASE + path, {
          method,
          headers: body ? { 'content-type': 'application/json' } : {},
          credentials: 'same-origin',
          ...(body ? { body: JSON.stringify(body) } : {}),
        })
        if (!res.ok) {
          let err = null
          try { err = await res.json() } catch { /* ignore */ }
          throw new Error(err?.error?.message || `HTTP ${res.status}`)
        }
        return res.json()
      },
      bootstrap: () => transport._req('GET', ''),
      listConversations: () => transport._req('GET', '/conversations'),
      createConversation: (b) => transport._req('POST', '/conversations', b),
      listMessages: (id) => transport._req('GET', `/conversations/${id}/messages`),
      sendMessage: (id, b) => transport._req('POST', `/conversations/${id}/messages`, b),
    }

    /* ------------------------------------------------------------------ */
    /* 样式（单 <style> 常量，避免后写规则整段失效）                        */
    /* ------------------------------------------------------------------ */
    const CSS = `
.wbb-layer{position:fixed;inset:0;z-index:58;pointer-events:none}
.wbb-win{position:fixed;pointer-events:auto;display:flex;flex-direction:column;width:760px;height:620px;
  background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111827);
  border:1px solid var(--dsw-alias-divider,#e5e7eb);border-radius:16px;overflow:hidden;
  box-shadow:0 18px 48px rgba(15,23,42,.18),0 2px 8px rgba(15,23,42,.08);font:inherit}
.wbb-head{display:flex;align-items:center;gap:8px;padding:8px 12px;flex:none;
  background:var(--dsw-alias-bg-layer-2,#f8fafc);border-bottom:1px solid var(--dsw-alias-divider,#e5e7eb);
  cursor:grab;user-select:none}
.wbb-head.dragging{cursor:grabbing}
.wbb-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;white-space:nowrap}
.wbb-spacer{flex:1}
.wbb-btn{flex:none;display:inline-flex;align-items:center;justify-content:center;height:26px;padding:0 9px;
  border:1px solid var(--dsw-alias-divider,#e5e7eb);border-radius:8px;background:transparent;
  font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary,#475569);cursor:pointer;white-space:nowrap}
.wbb-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06));color:var(--dsw-alias-label-primary,#111827)}
.wbb-btn.primary{background:#4f46e5;border-color:#4f46e5;color:#fff}
.wbb-btn.primary:hover{background:#4338ca;color:#fff}
.wbb-body{display:flex;flex:1;min-height:0}
.wbb-list{width:200px;flex:none;display:flex;flex-direction:column;overflow-y:auto;background:var(--dsw-alias-bg-layer-2,#f8fafc);border-right:1px solid var(--dsw-alias-divider,#e5e7eb)}
.wbb-list-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-divider,#e5e7eb)}
.wbb-list-title{font-weight:600;font-size:13px}
.wbb-add{width:24px;height:24px;border-radius:6px;border:1px solid var(--dsw-alias-divider,#d1d5db);background:transparent;cursor:pointer;font-size:15px;line-height:1}
.wbb-add:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06))}
.wbb-sec{padding:8px 10px 2px;font-size:11px;color:var(--dsw-alias-label-secondary,#94a3b8);font-weight:600;letter-spacing:.5px}
.wbb-item{display:flex;align-items:center;gap:8px;padding:7px 12px;margin:2px 6px;border-radius:8px;cursor:pointer}
.wbb-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06))}
.wbb-item.active{background:var(--dsw-alias-interactive-bg-selected,rgba(79,70,229,.12));color:#4338ca;font-weight:600}
.wbb-item-icon{font-size:14px;width:18px;text-align:center}
.wbb-item-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wbb-chat{flex:1;display:flex;flex-direction:column;min-width:0}
.wbb-chat-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-divider,#e5e7eb);font-weight:600}
.wbb-chat-members{font-weight:400;color:var(--dsw-alias-label-secondary,#94a3b8);font-size:12px}
.wbb-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.wbb-msg{display:flex;justify-content:flex-start}
.wbb-msg.me{justify-content:flex-end}
.wbb-bubble{max-width:75%;padding:8px 12px;border-radius:12px;background:var(--dsw-alias-bg-layer-2,#f1f5f9);white-space:pre-wrap;word-break:break-word;font-size:13px}
.wbb-msg.me .wbb-bubble{background:#4f46e5;color:#fff}
.wbb-task{margin:8px 14px;padding:9px 12px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a}
.wbb-task-state{font-size:12px;font-weight:600;color:#92400e}
.wbb-task-steps{display:flex;align-items:center;gap:10px;margin-top:6px}
.wbb-task-count{font-size:11px;color:#b45309;white-space:nowrap}
.wbb-task-bar{flex:1;height:6px;border-radius:3px;background:#fde68a;overflow:hidden}
.wbb-task-fill{height:100%;background:#f59e0b;transition:width .3s}
.wbb-composer{display:flex;gap:8px;padding:12px;border-top:1px solid var(--dsw-alias-divider,#e5e7eb);align-items:flex-end}
.wbb-input{flex:1;border:1px solid var(--dsw-alias-divider,#d1d5db);border-radius:8px;padding:8px 10px;resize:none;font:inherit;outline:none;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111827)}
.wbb-input:focus{border-color:#6366f1}
.wbb-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary,#94a3b8);font-size:13px}
.wbb-menu{position:absolute;inset:0;background:rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;z-index:10}
.wbb-menu-box{background:var(--dsw-alias-bg-layer-1,#fff);border-radius:12px;padding:10px;min-width:220px;max-height:80%;overflow-y:auto;box-shadow:0 10px 30px rgba(0,0,0,.2)}
.wbb-menu-title{padding:6px 10px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px}
.wbb-menu-item{display:block;width:100%;text-align:left;padding:9px 12px;border:none;background:none;border-radius:8px;cursor:pointer;font:inherit}
.wbb-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06))}
.wbb-menu-item.primary{margin-top:8px;background:#4f46e5;color:#fff;text-align:center;font-weight:600}
.wbb-menu-item.primary:hover{background:#4338ca;color:#fff}
.wbb-capsule{pointer-events:auto;position:fixed;display:flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:999px;
  border:1px solid var(--dsw-alias-divider,#e5e7eb);background:var(--dsw-alias-bg-layer-1,#fff);
  color:var(--dsw-alias-label-primary,#111827);font:inherit;font-size:12px;font-weight:600;cursor:pointer;
  box-shadow:0 8px 24px rgba(15,23,42,.18)}
.wbb-capsule:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06))}
@media (max-width:600px){
  .wbb-win{width:100vw;height:100vh;border-radius:0}
  .wbb-body{flex-direction:column}
  .wbb-list{width:100%;max-height:40%;border-right:none;border-bottom:1px solid var(--dsw-alias-divider,#e5e7eb)}
}
`

    function ensureStyle() {
      const id = 'dsh-workbench-bot-style'
      let el = document.getElementById(id)
      if (el === null) {
        el = document.createElement('style')
        el.id = id
        document.head.append(el)
      }
      el.textContent = CSS
      return () => { el.remove() }
    }

    /* ------------------------------------------------------------------ */
    /* 跨组件状态                                                          */
    /* ------------------------------------------------------------------ */
    function readPersisted() {
      try {
        return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? '{}') || {}
      } catch { return {} }
    }
    function persist(s) {
      try { window.localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
    }

    /* ------------------------------------------------------------------ */
    /* 主窗口组件                                                          */
    /* ------------------------------------------------------------------ */
    function WorkbenchWindow({ onClose }) {
      const [agents, setAgents] = useState(AGENT_DEFS)
      const [conversations, setConversations] = useState([])
      const [activeId, setActiveId] = useState(null)
      const [messages, setMessages] = useState({})
      const [menu, setMenu] = useState(null)   // null | 'add' | 'at' | {type:'group',members:[]}
      const [draft, setDraft] = useState('')
      const inputRef = useRef(null)

      // bootstrap
      useEffect(() => {
        let alive = true
        ;(async () => {
          try {
            const boot = await transport.bootstrap()
            if (!alive) return
            if (boot.agents?.length) {
              setAgents(boot.agents.map(a => ({
                agentId: a.agentId, title: a.title,
                icon: AGENT_DEFS.find(d => d.agentId === a.agentId)?.icon || '◉',
                color: AGENT_DEFS.find(d => d.agentId === a.agentId)?.color || '#888',
              })))
            }
            await refreshConversations(setConversations)
          } catch (e) { /* 后端未就绪：空列表 */ }
        })()
        return () => { alive = false }
      }, [])

      // 默认激活第一个私聊
      useEffect(() => {
        if (!activeId && conversations.length) setActiveId(conversations[0].id)
      }, [conversations, activeId])

      // 激活会话时拉消息
      useEffect(() => {
        if (!activeId || messages[activeId]) return
        let alive = true
        transport.listMessages(activeId).then(r => {
          if (alive) setMessages(m => ({ ...m, [activeId]: r.items || [] }))
        }).catch(() => {
          if (alive) setMessages(m => ({ ...m, [activeId]: [] }))
        })
        return () => { alive = false }
      }, [activeId])

      const directs = conversations.filter(c => c.kind === 'direct')
      const groups = conversations.filter(c => c.kind === 'group')
      const active = conversations.find(c => c.id === activeId)

      async function refreshConversations(setter) {
        const r = await transport.listConversations()
        setter(r.items || [])
      }

      async function send() {
        const text = draft.trim()
        if (!text || !activeId) return
        setDraft('')
        const cmid = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
        setMessages(m => ({ ...m, [activeId]: [...(m[activeId] || []), { clientMessageId: cmid, text, sender: { type: 'user', id: 'user' } }] }))
        try { await transport.sendMessage(activeId, { text, clientMessageId: cmid }) }
        catch (e) { /* 保留乐观消息 */ }
      }

      async function createConversation(kind, agentId, agentIds, title) {
        setMenu(null)
        try {
          await transport.createConversation({ kind, ...(kind === 'direct' ? { agentId, title } : { agentIds, title: title || '群聊' }) })
          await refreshConversations(setConversations)
        } catch (e) { /* ignore */ }
      }

      function renderItem(c) {
        const agent = agents.find(a => a.agentId === c.directAgentId)
        return h('div', {
          className: 'wbb-item' + (c.id === activeId ? ' active' : ''),
          key: c.id,
          onClick: () => setActiveId(c.id),
        },
          h('span', { className: 'wbb-item-icon', style: { color: agent?.color || '#888' } }, agent?.icon || '◉'),
          h('span', { className: 'wbb-item-name' }, c.title || agent?.title || '会话'),
        )
      }

      function renderMenu() {
        if (!menu) return null
        let content
        if (menu === 'add') {
          content = h('div', { className: 'wbb-menu-box' },
            h('div', { className: 'wbb-menu-title' }, '新建'),
            h('button', { className: 'wbb-menu-item', onClick: () => setMenu('add-direct') }, '新建私聊'),
            h('button', { className: 'wbb-menu-item', onClick: () => setMenu({ type: 'group', members: [] }) }, '新建群聊'),
          )
        } else if (menu === 'add-direct') {
          content = h('div', { className: 'wbb-menu-box' },
            h('div', { className: 'wbb-menu-title' }, '选择 Agent'),
            agents.map(a => h('button', {
              className: 'wbb-menu-item', key: a.agentId,
              onClick: () => createConversation('direct', a.agentId, null, a.title),
            }, a.title)),
          )
        } else if (menu && menu.type === 'group') {
          content = h('div', { className: 'wbb-menu-box' },
            h('div', { className: 'wbb-menu-title' }, '选择成员'),
            agents.map(a => {
              const on = menu.members.includes(a.agentId)
              return h('button', {
                className: 'wbb-menu-item', key: a.agentId,
                onClick: () => setMenu({ type: 'group', members: on ? menu.members.filter(x => x !== a.agentId) : [...menu.members, a.agentId] }),
              }, (on ? '✓ ' : '') + a.title)
            }),
            h('button', {
              className: 'wbb-menu-item primary',
              onClick: () => createConversation('group', null, menu.members, '群聊'),
            }, '创建群聊'),
          )
        }
        return h('div', { className: 'wbb-menu', onClick: (e) => { if (e.target === e.currentTarget) setMenu(null) } }, content)
      }

      const msgs = messages[activeId] || []

      return h('div', { className: 'wbb-win' },
        // 头部（可拖拽）
        h('div', { className: 'wbb-head', onMouseDown: (e) => startDrag(e) },
          h('span', { className: 'wbb-title' }, 'Bot 协作'),
          h('span', { className: 'wbb-spacer' }),
          h('button', { className: 'wbb-btn', onClick: onClose }, '收起'),
        ),
        // 主体
        h('div', { className: 'wbb-body' },
          // 左栏
          h('div', { className: 'wbb-list' },
            h('div', { className: 'wbb-list-head' },
              h('span', { className: 'wbb-list-title' }, '会话'),
              h('button', { className: 'wbb-add', onClick: () => setMenu('add') }, '＋'),
            ),
            h('div', { className: 'wbb-sec' }, '私聊'),
            directs.map(renderItem),
            h('div', { className: 'wbb-sec' }, '群聊'),
            groups.map(renderItem),
          ),
          // 右栏
          h('div', { className: 'wbb-chat' },
            active
              ? h(React.Fragment, null,
                  h('div', { className: 'wbb-chat-head' },
                    h('span', null, active.title || '会话'),
                    active.kind === 'group' ? h('span', { className: 'wbb-chat-members' }, `· ${active.memberCount || 0} 成员`) : null,
                  ),
                  h('div', { className: 'wbb-msgs' },
                    msgs.map((m, i) => h('div', {
                      className: 'wbb-msg' + (m.sender?.type === 'user' ? ' me' : ''), key: m.id || i,
                    }, h('div', { className: 'wbb-bubble' }, m.text ?? m.content ?? ''))),
                  ),
                  h('div', { className: 'wbb-composer' },
                    h('textarea', {
                      className: 'wbb-input', ref: inputRef, rows: 1,
                      placeholder: active.kind === 'group' ? '输入消息…' : '发送消息…',
                      value: draft, onChange: (e) => setDraft(e.target.value),
                      onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } },
                    }),
                    h('button', { className: 'wbb-btn primary', onClick: send }, '发送'),
                  ),
                )
              : h('div', { className: 'wbb-empty' }, '选择或新建一个会话'),
          ),
        ),
        renderMenu(),
      )
    }

    function startDrag(e) {
      // 拖拽：通过父级 Overlay 处理定位（简化为 window 级 mousemove）
      const layer = e.currentTarget.closest('.wbb-win')
      if (!layer) return
      const rect = layer.getBoundingClientRect()
      const offX = e.clientX - rect.left
      const offY = e.clientY - rect.top
      e.currentTarget.classList.add('dragging')
      const move = (ev) => {
        layer.style.left = `${ev.clientX - offX}px`
        layer.style.top = `${ev.clientY - offY}px`
        layer.style.right = 'auto'
        layer.style.bottom = 'auto'
      }
      const up = () => {
        e.currentTarget.classList.remove('dragging')
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
      }
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
    }

    /* ------------------------------------------------------------------ */
    /* 悬浮层根（overlay）：悬浮窗 / 胶囊 双态                              */
    /* ------------------------------------------------------------------ */
    function OverlayRoot({ api }) {
      const persisted = readPersisted()
      const [visible, setVisible] = useState(persisted.visible !== false)
      const [collapsed, setCollapsed] = useState(persisted.collapsed === true)
      const [pos, setPos] = useState(persisted.pos || null)

      function toggle() {
        setVisible(v => {
          const nv = !v
          persist({ ...readPersisted(), visible: nv })
          return nv
        })
      }
      function toggleCollapsed() {
        setCollapsed(c => {
          const nc = !c
          persist({ ...readPersisted(), collapsed: nc })
          return nc
        })
      }

      const winStyle = pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
        : { right: 24, bottom: 24, left: 'auto', top: 'auto' }

      return h('div', { className: 'wbb-layer' },
        collapsed
          ? h('button', { className: 'wbb-capsule', style: winStyle, onClick: toggleCollapsed }, '◈ Bot 协作')
          : visible
            ? h('div', { className: 'wbb-win', style: winStyle },
                h('div', { className: 'wbb-head', onMouseDown: (e) => startDrag(e) },
                  h('span', { className: 'wbb-title' }, 'Bot 协作'),
                  h('span', { className: 'wbb-spacer' }),
                  h('button', { className: 'wbb-btn', onClick: toggleCollapsed }, '折叠'),
                  h('button', { className: 'wbb-btn', onClick: toggle }, '关闭'),
                ),
                h('div', { className: 'wbb-body' }, h(WorkbenchContent, {})),
              )
            : h('button', { className: 'wbb-capsule', style: { right: 24, bottom: 24 }, onClick: toggle }, '◈ Bot 协作'),
      )
    }

    // 拆分内容组件，避免拖拽事件重复绑定
    function WorkbenchContent() {
      return h(WorkbenchWindow, { onClose: () => {} })
    }

    function BotIcon({ size }) {
      const Glyph = primitives.IconAgentPresetOutlineRegular ?? primitives.IconPluginPinwheelOutlineRegular
      return h(Glyph, { size: size ?? 16 })
    }

    function MergedSeat() {
      return h('div', { className: 'wbb-empty' }, 'Bot 协作')
    }

    /* ------------------------------------------------------------------ */
    /* 注册                                                                */
    /* ------------------------------------------------------------------ */
    return {
      inject: ['slots'],

      apply(ctx) {
        const disposers = []
        let disposed = false

        disposers.push(ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 20, label: 'Bot 协作' },
          BotIcon,
        )))
        disposers.push(ctx.slots.inject('shell.overlay', () => ctx.slots.register(
          { name: 'shell.overlay', id: 'workbench-bot-overlay' },
          () => h(OverlayRoot, {}),
        )))
        disposers.push(ensureStyle())

        window.__workbenchBot = {
          open: () => { /* 通过 overlay 状态触发 */ },
        }

        return () => {
          disposed = true
          delete window.__workbenchBot
          for (const dispose of disposers) {
            try { if (typeof dispose === 'function') dispose() } catch { /* ignore */ }
          }
          disposers.length = 0
        }
      },
    }
  },
})
