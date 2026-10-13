/**
 * dsh-bot-shell — 客户端半（Client half）
 *
 * 单文件实现，纯 React.createElement（无构建步骤）。
 *
 * 注册三处：
 *   - sidebar.panellist  id 'bot-chat'  → 左侧导航「Bot对话」（「插件」下方）
 *   - main               key 'bot-chat' → 融入态落点（窗口铺到主内容区）
 *   - shell.overlay      id 'bot-shell' → 悬浮层（默认右下角悬浮，可拖拽/折叠成胶囊）
 *
 * 窗口内容是 `/bot/` 的**同源 iframe**，即那个独立的 Bot 实例：DS Bot 的原生界面
 * （Bot 列表 / 会话 / 群聊 / 记忆 / 用量 / 设置）零改造地跑在里面。
 *
 * 🔴 v0.1.2：**删掉了窗口顶部的一排领域标签**。
 *    总 Agent / 知识库Bot / 会议助手Bot / 政策解读Bot / 汇文PPT Bot 现在是 DS Bot
 *    自己「新建的 Bot」（各自一条 DSH 会话、各自带对应插件的工具），直接出现在
 *    DS Bot 左侧的 Bot 列表里 —— 不再需要外壳再做一个菜单去切插件面板。
 *
 * v0.1.3：融入态侧栏联动 —— 进 Bot对话 页用原生 layout.toggleSidebar() 收起 DSH
 *    左侧导航栏，切回会话/其他页（seat 卸载）时恢复展开。
 */

window.__ModuleLoader__.load({
  id: 'dsh-bot-shell',

  factory(require) {
    const React = require('react')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback } = React

    const PANEL_ID = 'bot-chat'
    const STORE_KEY = 'dsh.bot.shell.v1'
    const MOUNT = '/bot/'

    /* ------------------------------------------------------------------ */
    /* 跨组件状态（悬浮窗与融入面板共用同一份）                            */
    /* ------------------------------------------------------------------ */

    const DEFAULT_STATE = {
      /* 'floating' 悬浮 | 'merged' 融入 */
      mode: 'floating',
      collapsed: false,
      visible: true,
      x: null,
      y: null,
      archive: [],
    }

    function readState() {
      try {
        const raw = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? '{}')
        return { ...DEFAULT_STATE, ...(raw && typeof raw === 'object' ? raw : {}) }
      } catch {
        return { ...DEFAULT_STATE }
      }
    }

    let state = readState()
    const subscribers = new Set()

    function persist() {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify({
          mode: state.mode, collapsed: state.collapsed, visible: state.visible,
          x: state.x, y: state.y, archive: state.archive,
        }))
      } catch { /* storage disabled */ }
    }

    function setState(patch) {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
      persist()
      for (const notify of [...subscribers]) {
        try { notify() } catch { /* a subscriber's problem is its own */ }
      }
    }

    function subscribe(notify) {
      subscribers.add(notify)
      return () => { subscribers.delete(notify) }
    }

    function useShellState() {
      const [, bump] = useState(0)
      useEffect(() => subscribe(() => { bump(value => value + 1) }), [])
      return state
    }

    /* ------------------------------------------------------------------ */
    /* 样式（全部常量拼进同一个 <style>，否则后写的规则整段失效）           */
    /* ------------------------------------------------------------------ */

    const CSS = `
.bs-layer{position:fixed;inset:0;z-index:60;pointer-events:none}
.bs-win{position:fixed;pointer-events:auto;display:flex;flex-direction:column;
  background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111827);
  border:1px solid var(--dsw-alias-divider,#e5e7eb);border-radius:16px;overflow:hidden;
  box-shadow:0 18px 48px rgba(15,23,42,.18),0 2px 8px rgba(15,23,42,.08);
  font:inherit}
.bs-win.bs-merged{border-radius:0;border:none;box-shadow:none}
.bs-head{display:flex;align-items:center;gap:8px;padding:8px 10px;flex:none;
  background:var(--dsw-alias-bg-layer-2,#f8fafc);border-bottom:1px solid var(--dsw-alias-divider,#e5e7eb);
  cursor:grab;user-select:none}
.bs-win.bs-merged .bs-head{cursor:default}
.bs-head.bs-dragging{cursor:grabbing}
.bs-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;white-space:nowrap}
.bs-title svg{display:block}
.bs-spacer{flex:1}
.bs-sub{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary,#94a3b8);white-space:nowrap}
.bs-btn{flex:none;display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 9px;
  border:1px solid var(--dsw-alias-divider,#e5e7eb);border-radius:8px;background:transparent;
  font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary,#475569);cursor:pointer;white-space:nowrap}
.bs-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06));
  color:var(--dsw-alias-label-primary,#111827)}
.bs-icon-btn{width:26px;padding:0;justify-content:center}
.bs-body{position:relative;flex:1;min-height:0;background:var(--dsw-alias-bg-layer-1,#fff)}
.bs-frame{display:block;width:100%;height:100%;border:0}
.bs-note{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);
  background:rgba(15,23,42,.86);color:#fff;font-size:12px;padding:5px 12px;border-radius:999px;
  pointer-events:none;opacity:0;transition:opacity .18s}
.bs-note[data-on="1"]{opacity:1}
.bs-capsule{pointer-events:auto;position:fixed;display:flex;align-items:center;gap:6px;
  height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--dsw-alias-divider,#e5e7eb);
  background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111827);
  font:inherit;font-size:12px;font-weight:600;cursor:pointer;
  box-shadow:0 8px 24px rgba(15,23,42,.18)}
.bs-capsule:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06))}
.bs-seat{height:100%;display:flex;align-items:center;justify-content:center;
  color:var(--dsw-alias-label-secondary,#94a3b8);font-size:13px}
`

    function ensureStyle() {
      const id = 'dsh-bot-shell-style'
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
    /* 图标                                                                */
    /* ------------------------------------------------------------------ */

    function BotIcon({ size }) {
      const Glyph = primitives.IconAgentPresetOutlineRegular ?? primitives.IconPluginPinwheelOutlineRegular
      return h(Glyph, { size: size ?? 16 })
    }

    /* ------------------------------------------------------------------ */
    /* 融入态的定位：跟随主内容区                                          */
    /* ------------------------------------------------------------------ */

    /**
     * 融入态的定位：跟随主内容区。
     *
     * 🔴 `[data-slot="main"]` 是插槽宿主，computed `display: contents` ⇒ 自身盒模型恒为 0×0，
     *    拿不到尺寸。真正的盒模型在它的父元素（`T1DcKW_centerCol`）上，所以取 parentElement。
     */
    function mainAnchor() {
      const host = document.querySelector('[data-slot="main"]')
      if (host === null) return null
      return host.parentElement ?? host
    }

    function useMainRect(active) {
      const [rect, setRect] = useState(null)
      useEffect(() => {
        if (!active) { setRect(null); return undefined }
        const measure = () => {
          const el = mainAnchor()
          if (el === null) { setRect(null); return }
          const box = el.getBoundingClientRect()
          if (box.width < 2 || box.height < 2) { setRect(null); return }
          setRect(previous => (
            previous !== null
            && Math.abs(previous.left - box.left) < 0.5 && Math.abs(previous.top - box.top) < 0.5
            && Math.abs(previous.width - box.width) < 0.5 && Math.abs(previous.height - box.height) < 0.5
          ) ? previous : { left: box.left, top: box.top, width: box.width, height: box.height })
        }
        measure()
        const timer = window.setInterval(measure, 250)
        window.addEventListener('resize', measure)
        return () => { window.clearInterval(timer); window.removeEventListener('resize', measure) }
      }, [active])
      return rect
    }

    /* ------------------------------------------------------------------ */
    /* 悬浮窗 / 融入窗                                                     */
    /* ------------------------------------------------------------------ */

    const WIN_WIDTH = 420
    const WIN_HEIGHT = 560
    const EDGE = 20

    function defaultPos() {
      return {
        x: Math.max(EDGE, window.innerWidth - WIN_WIDTH - EDGE),
        y: Math.max(EDGE, window.innerHeight - WIN_HEIGHT - EDGE),
      }
    }

    function WindowRoot({ onArchive, onMerge, onDetach, onCollapse, onClose }) {
      const shell = useShellState()
      const merged = shell.mode === 'merged'
      const rect = useMainRect(merged)
      const [dragging, setDragging] = useState(false)
      const [note, setNote] = useState('')
      const dragRef = useRef(null)
      const noteTimer = useRef(0)

      useEffect(() => {
        if (merged) return undefined
        const onMove = (event) => {
          const drag = dragRef.current
          if (drag === null) return
          const width = drag.width
          const height = drag.height
          const x = Math.min(Math.max(4, drag.startX + (event.clientX - drag.pointerX)), window.innerWidth - 80)
          const y = Math.min(Math.max(4, drag.startY + (event.clientY - drag.pointerY)), window.innerHeight - 40)
          setState({ x, y })
        }
        const onUp = () => {
          if (dragRef.current === null) return
          dragRef.current = null
          setDragging(false)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        return () => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
        }
      }, [merged])

      const onPointerDown = useCallback((event) => {
        if (merged) return
        if (event.target.closest('button') !== null) return
        const shell2 = state
        const pending = shell2.x === null ? defaultPos() : { x: shell2.x, y: shell2.y }
        if (shell2.x === null) setState(pending)
        dragRef.current = {
          pointerX: event.clientX, pointerY: event.clientY,
          startX: pending.x, startY: pending.y,
          width: WIN_WIDTH, height: WIN_HEIGHT,
        }
        setDragging(true)
      }, [merged])

      const flash = useCallback((text) => {
        setNote(text)
        window.clearTimeout(noteTimer.current)
        noteTimer.current = window.setTimeout(() => { setNote('') }, 1600)
      }, [])

      const style = merged
        ? { left: rect?.left ?? 0, top: rect?.top ?? 0, width: rect?.width ?? '100vw', height: rect?.height ?? '100vh' }
        : (() => {
            const pos = shell.x === null || shell.y === null ? defaultPos() : { x: shell.x, y: shell.y }
            return { left: pos.x, top: pos.y, width: WIN_WIDTH, height: WIN_HEIGHT }
          })()

      return h('div', { className: `bs-win${merged ? ' bs-merged' : ''}`, style },
        h('div', {
          className: `bs-head${dragging ? ' bs-dragging' : ''}`,
          onPointerDown,
        },
          h('span', { className: 'bs-title' }, h(BotIcon, { size: 15 }), 'Bot对话'),
          h('span', { className: 'bs-sub' }, '团队在左侧 Bot 列表'),
          h('span', { className: 'bs-spacer' }),
          h('button', {
            type: 'button', className: 'bs-btn',
            onClick: () => { onArchive(); flash('已归档，摘要接力将在能力打通阶段接入') },
            title: '归档当前对话并新建（摘要接力在能力打通阶段接入）',
          }, '归档'),
          merged
            ? h('button', { type: 'button', className: 'bs-btn', onClick: onDetach, title: '脱离：回到悬浮' }, '脱离')
            : h(React.Fragment, null,
                h('button', { type: 'button', className: 'bs-btn', onClick: onMerge, title: '融入：铺到 DSH 主内容区' }, '融入'),
                h('button', { type: 'button', className: 'bs-btn bs-icon-btn', onClick: onCollapse, title: '折叠成胶囊' }, '—'),
                h('button', { type: 'button', className: 'bs-btn bs-icon-btn', onClick: onClose, title: '关闭' }, '✕'),
              ),
        ),
        h('div', { className: 'bs-body' },
          h('iframe', {
            className: 'bs-frame',
            src: MOUNT,
            title: 'DS Bot',
            allow: 'clipboard-read; clipboard-write; microphone',
          }),
          h('div', { className: 'bs-note', 'data-on': note === '' ? '0' : '1' }, note),
        ),
      )
    }

    function OverlayRoot({ api }) {
      const shell = useShellState()
      const [, bump] = useState(0)
      useEffect(() => {
        const id = window.setInterval(() => { bump(value => value + 1) }, 30000)
        return () => { window.clearInterval(id) }
      }, [])

      if (!shell.visible) {
        return h('button', {
          type: 'button', className: 'bs-capsule',
          style: { right: EDGE, bottom: EDGE },
          onClick: () => { setState({ visible: true, collapsed: false }) },
          title: '打开 Bot对话',
        }, h(BotIcon, { size: 14 }), 'Bot')
      }
      if (shell.collapsed) {
        return h('button', {
          type: 'button', className: 'bs-capsule',
          style: { right: EDGE, bottom: EDGE },
          onClick: () => { setState({ collapsed: false }) },
          title: '展开 Bot对话',
        }, h(BotIcon, { size: 14 }), 'Bot对话')
      }
      return h(WindowRoot, {
        onArchive: () => {
          const entry = { id: `arc-${Date.now()}`, at: new Date().toISOString() }
          setState(current => ({ archive: [entry, ...current.archive].slice(0, 50) }))
        },
        onMerge: () => {
          setState({ mode: 'merged', visible: true, collapsed: false })
          /* 切到 bot-chat 面板 ⇒ 主内容区挂上 MergedSeat（脱离时再切回会话面板释放它） */
          try { api.selectPanel(PANEL_ID) } catch { /* 布局服务不可用时仍保持窗口 */ }
        },
        onDetach: () => {
          setState({ mode: 'floating' })
          try { api.selectPanel('conversation') } catch { /* 同上 */ }
        },
        onCollapse: () => { setState({ collapsed: true }) },
        onClose: () => { setState({ visible: false }) },
      })
    }

    /**
     * 融入态的落点面板：窗口是悬浮层覆盖上来的，这里只占位。
     *
     * 语义：`main` 槽里存在本 seat ⇔ 当前激活面板就是 `bot-chat` ⇔ 应当处于融入态。
     * - 挂载（含点左侧「Bot对话」/ 点「融入」）→ 置 merged（**只在挂载时**，否则会把「脱离」覆盖回去）
     * - 卸载（切走面板 / 点「脱离」）→ 回到悬浮
     *
     * v0.1.3 侧栏联动：挂载时若 DSH 侧栏是展开的，用原生 `layout.toggleSidebar()` 收起；
     * 卸载时若仍是我们收起的状态，恢复展开。用户手动开合过就不再插手。
     */
    function sidebarCollapsed() {
      /* AppFrame 根元素只在收起时带 data-sidebar-collapsed（展开时该属性缺席） */
      return document.querySelector('[data-sidebar-collapsed]') !== null
    }

    function MergedSeat({ api }) {
      useEffect(() => {
        setState({ mode: 'merged', visible: true, collapsed: false })
        let weCollapsed = false
        if (api && typeof api.toggleSidebar === 'function' && !sidebarCollapsed()) {
          api.toggleSidebar()
          weCollapsed = true
        }
        return () => {
          if (state.mode === 'merged') setState({ mode: 'floating' })
          if (weCollapsed && sidebarCollapsed()) api.toggleSidebar()
        }
      }, [])
      return h('div', { className: 'bs-seat' })
    }

    return {
      /* 🔴 必须声明：Cordis 里不声明 inject ⇒ 访问 ctx.slots 抛
       * "cannot get property \"slots\" without inject"，整个客户端 bootstrap 崩掉。 */
      inject: ['slots'],

      apply(ctx) {
        const disposers = []
        let disposed = false
        const api = {
          selectPanel: (id) => { try { ctx.get('layout').selectPanel(id) } catch { /* ignore */ } },
          toggleSidebar: () => { try { ctx.get('layout').toggleSidebar() } catch { /* ignore */ } },
        }

        /**
         * Self-gating: this bundle is mirrored to every account by the
         * multi-user gateway, so the UI must only appear where the host half
         * says the shell is enabled (the owner's own instance). Nothing is
         * registered until that probe answers `{ enabled: true }`.
         */
        const enable = async () => {
          let enabled = false
          try {
            const response = await fetch(`${MOUNT}__status`, { credentials: 'same-origin' })
            if (response.ok) {
              const body = await response.json()
              enabled = body !== null && typeof body === 'object' && body.enabled === true
            }
          } catch {
            enabled = false
          }
          if (disposed || !enabled) return

          disposers.push(ctx.slots.inject('main', () => ctx.slots.register(
            { name: 'main', key: PANEL_ID, inject: () => ({ api }) },
            MergedSeat,
          )))
          disposers.push(ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            { name: 'sidebar.panellist', id: PANEL_ID, order: 20, label: 'Bot对话' },
            BotIcon,
          )))
          disposers.push(ctx.slots.inject('shell.overlay', () => ctx.slots.register(
            { name: 'shell.overlay', id: 'bot-shell' },
            () => h(OverlayRoot, { api }),
          )))
          disposers.push(ensureStyle())
          /* 供 E2E 探针驱动：状态读写 + 定位。 */
          window.__dshBotShell = {
            get state() { return { ...state } },
            set: (patch) => setState(patch),
          }
        }
        void enable()

        return () => {
          disposed = true
          delete window.__dshBotShell
          for (const dispose of disposers) {
            try { if (typeof dispose === 'function') dispose() } catch { /* already released */ }
          }
          disposers.length = 0
        }
      },
    }
  },
})
