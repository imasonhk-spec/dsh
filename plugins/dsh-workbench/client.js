/**
 * @local/dsh-workbench — 工作台能力包框架（客户端半）v2
 *
 * 单文件实现，纯 React.createElement（无 JSX/构建步骤）。
 * 注册：
 *   - main key 'workbench'         → 工作台首页（能力包网格，含搜索）
 *   - sidebar.panellist id 'workbench' → 左侧导航「工作台」图标
 *   - main key 'cap:kb'            → 知识库桥接页（挂到能力包体系，自动打开原生知识库面板）
 *   - sidebar.panellist id 'cap:kb'    → 左侧导航「知识库」能力包行（随原生能力包列表：
 *                                          工作台下方、可折叠、可拖拽排序）
 *   - 隐藏 kb 插件自带底部触发器，避免入口重复
 *
 * 2026-09-25：唯一工作台入口（右侧直显、无弹窗），能力包行统一由 ui-sidebar
 * 原生能力包列表渲染（挂 workbench 分组）。
 * 2026-09-25(晚)：视觉层参考 workspace_capability_management.html 重设计——
 * 渐变光晕 Hero、脉冲状态徽标、Ctrl+K 搜索、渐变能力图标、卡片入场动效、
 * Toast 反馈与配置规则提示卡。数据与交互逻辑保持不变。
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-workbench',
  factory(require) {
    const React = require('react')
    const { useState, useEffect, useCallback, useRef } = React
    const h = React.createElement

    const API = '/api/workbench'

    /* ------------------------------- 样式 ------------------------------- */

    const CSS = `
.wb-root{--wb-fg:var(--dsw-alias-label-primary,#0f172a);--wb-muted:var(--dsw-alias-label-secondary,#64748b);--wb-border:var(--dsw-alias-divider,#e2e8f0);--wb-card:var(--dsw-alias-bg-layer-2,#fff);--wb-accent:var(--dsw-alias-interactive-bg-primary,#2563eb);--wb-ring:0 0 0 3px rgba(37,99,235,.13);--wb-sh-card:0 1px 3px rgba(15,23,42,.04),0 4px 12px rgba(15,23,42,.03);--wb-sh-hover:0 10px 28px -6px rgba(15,23,42,.1),0 2px 6px -1px rgba(15,23,42,.04);font-family:system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:var(--wb-fg);font-size:14px;line-height:1.6;max-width:1080px;margin:0 auto;padding:22px 24px 56px;flex:1 1 auto;min-height:0;width:100%;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent;}
.wb-root::-webkit-scrollbar{width:6px;height:6px;}
.wb-root::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:9999px;}
.wb-root::-webkit-scrollbar-thumb:hover{background:#94a3b8;}
.wb-root::-webkit-scrollbar-track{background:transparent;}
@keyframes wbEnter{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes wbPing{75%,100%{transform:scale(2.2);opacity:0}}
@keyframes wbPulse{0%,100%{opacity:1}50%{opacity:.4}}
.wb-hero{position:relative;overflow:hidden;border:1px solid rgba(191,219,254,.8);border-radius:20px;background:linear-gradient(135deg,rgba(239,246,255,.8),rgba(238,242,255,.35) 45%,rgba(255,255,255,.92));padding:30px 32px;margin-bottom:20px;}
.wb-glow{position:absolute;border-radius:50%;filter:blur(46px);pointer-events:none;}
.wb-glow.a{top:-70px;right:-70px;width:220px;height:220px;background:rgba(96,165,250,.18);}
.wb-glow.b{bottom:-80px;left:30%;width:240px;height:240px;background:rgba(165,180,252,.14);}
.wb-hero-in{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;}
.wb-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:4px 11px;border-radius:999px;background:rgba(239,246,255,.92);border:1px solid rgba(191,219,254,.7);color:#1d4ed8;font-size:11px;font-weight:700;letter-spacing:.12em;margin-bottom:12px;}
.wb-ping{position:relative;width:8px;height:8px;flex:none;}
.wb-ping i{position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:.75;animation:wbPing 1.6s cubic-bezier(0,0,.2,1) infinite;}
.wb-ping b{position:relative;display:block;width:8px;height:8px;border-radius:50%;background:#2563eb;}
.wb-hero h2{margin:0 0 8px;font-size:26px;font-weight:750;letter-spacing:-.025em;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.wb-tag{font-size:11px;font-weight:400;padding:2px 9px;border-radius:999px;background:#f1f5f9;border:1px solid var(--wb-border);color:#475569;}
.wb-hero p{margin:0;max-width:640px;color:#475569;font-size:13.5px;}
.wb-stat{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:12px;background:rgba(255,255,255,.92);border:1px solid var(--wb-border);box-shadow:var(--wb-sh-card);font-size:12px;font-weight:600;color:#334155;white-space:nowrap;}
.wb-dot{width:8px;height:8px;border-radius:50%;background:#10b981;flex:none;}
.wb-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 6px;flex-wrap:wrap;}
.wb-search{position:relative;display:flex;align-items:center;gap:8px;flex:1;max-width:400px;border:1px solid var(--wb-border);border-radius:12px;padding:8px 12px;background:var(--wb-card);color:#94a3b8;box-shadow:var(--wb-sh-card);transition:border-color .15s,box-shadow .15s;}
.wb-search:focus-within{border-color:var(--wb-accent);box-shadow:var(--wb-ring);}
.wb-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;color:var(--wb-fg);font:inherit;font-size:13px;}
.wb-search input::placeholder{color:#94a3b8;}
.wb-kbd{font-size:10px;font-family:ui-monospace,SFMono-Regular,monospace;color:#94a3b8;background:#f1f5f9;border:1px solid var(--wb-border);border-radius:5px;padding:1px 6px;flex:none;}
.wb-section{margin:26px 0 0;}
.wb-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px;flex-wrap:wrap;}
.wb-section h3{display:flex;align-items:center;gap:8px;font-size:15.5px;font-weight:700;letter-spacing:-.02em;margin:0;}
.wb-count{min-width:20px;text-align:center;font-size:11.5px;font-weight:650;padding:1px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;}
.wb-count.gray{background:#f1f5f9;color:#475569;}
.wb-sec-hint{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:#94a3b8;}
.wb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
.wb-card{position:relative;display:flex;flex-direction:column;gap:10px;background:var(--wb-card);border:1px solid var(--wb-border);border-radius:16px;padding:18px;min-height:164px;box-shadow:var(--wb-sh-card);transition:transform .2s,box-shadow .2s,border-color .2s;animation:wbEnter .28s cubic-bezier(.16,1,.3,1) both;}
.wb-card:hover{transform:translateY(-2px);box-shadow:var(--wb-sh-hover);border-color:#bfdbfe;}
.wb-card-top{display:flex;align-items:flex-start;gap:11px;}
.wb-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;color:#fff;font-size:18px;flex:none;box-shadow:0 2px 6px rgba(15,23,42,.16);transition:transform .2s;}
.wb-card:hover .wb-icon{transform:scale(1.06);}
.wb-card .t{font-weight:650;font-size:14.5px;letter-spacing:-.01em;line-height:1.35;padding-top:1px;}
.wb-badge{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:550;border-radius:999px;padding:3px 9px;background:#ecfdf5;color:#047857;border:1px solid rgba(167,243,208,.7);white-space:nowrap;}
.wb-badge i{width:6px;height:6px;border-radius:50%;background:#10b981;animation:wbPulse 2s infinite;}
.wb-badge.off{background:#f1f5f9;color:#64748b;border-color:var(--wb-border);}
.wb-badge.off i{display:none;}
.wb-card .d{color:var(--wb-muted);font-size:12.5px;flex:1;min-height:34px;}
.wb-actions{display:flex;gap:8px;align-items:center;margin-top:2px;padding-top:12px;border-top:1px solid rgba(226,232,240,.75);flex-wrap:wrap;}
.wb-ver{margin-right:auto;font-size:10.5px;font-family:ui-monospace,SFMono-Regular,monospace;color:#94a3b8;}
.wb-button{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border:1px solid var(--wb-border);background:var(--wb-card);color:#475569;border-radius:9px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;}
.wb-button:hover{border-color:#cbd5e1;background:#f8fafc;}
.wb-button:active{transform:scale(.96);}
.wb-button.primary{background:var(--wb-accent);border-color:var(--wb-accent);color:#fff;box-shadow:0 1px 4px rgba(37,99,235,.3);}
.wb-button.primary:hover{filter:brightness(1.08);background:var(--wb-accent);border-color:var(--wb-accent);}
.wb-button.danger:hover{border-color:#fecdd3;background:#fff1f2;color:#e11d48;}
.wb-empty{display:flex;flex-direction:column;align-items:center;gap:5px;border:1px dashed var(--wb-border);border-radius:16px;padding:32px 24px;color:var(--wb-muted);background:rgba(255,255,255,.5);font-size:13px;text-align:center;grid-column:1/-1;}
.wb-empty-ic{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:#f1f5f9;color:#94a3b8;margin-bottom:3px;}
.wb-empty b{font-size:13px;color:#334155;font-weight:600;}
.wb-empty span{font-size:11.5px;color:#94a3b8;}
.wb-error{display:flex;align-items:center;gap:10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:10px 14px;border-radius:12px;margin-bottom:4px;font-size:13px;animation:wbEnter .25s both;}
.wb-error .wb-button{margin-left:auto;flex:none;}
.wb-footer{display:flex;gap:11px;align-items:flex-start;margin-top:26px;padding:14px 16px;border:1px solid var(--wb-border);border-radius:14px;background:rgba(255,255,255,.7);font-size:12px;color:var(--wb-muted);line-height:1.7;}
.wb-bulb{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#fffbeb;border:1px solid rgba(253,230,138,.6);color:#d97706;flex:none;margin-top:2px;}
.wb-footer b{color:#334155;font-weight:600;}
.wb-toasts{position:fixed;right:20px;bottom:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;}
.wb-toast{display:flex;align-items:center;gap:9px;padding:10px 15px;border-radius:12px;border:1px solid var(--wb-border);background:rgba(255,255,255,.96);backdrop-filter:blur(8px);box-shadow:0 10px 30px -8px rgba(15,23,42,.2);font-size:12.5px;font-weight:550;color:#1e293b;animation:wbEnter .25s cubic-bezier(.16,1,.3,1) both;transition:opacity .3s,transform .3s;}
.wb-toast.success{border-color:rgba(167,243,208,.8);background:rgba(236,253,245,.96);}
.wb-toast.out{opacity:0;transform:translateY(8px) scale(.95);}
.wb-toast svg{flex:none;}
.wb-kb-page{display:flex;flex-direction:column;align-items:flex-start;gap:14px;margin-top:8vh;}
.wb-kb-page p{margin:0;color:var(--wb-muted);font-size:13px;max-width:560px;}
@media (prefers-color-scheme:dark){
.wb-root{scrollbar-color:#475569 transparent;}
.wb-root::-webkit-scrollbar-thumb{background:#475569;}
.wb-root::-webkit-scrollbar-thumb:hover{background:#64748b;}
.wb-hero{background:linear-gradient(130deg,#16263f,#182338 55%,#14312e);border-color:#2a3b57;}
.wb-glow.a{background:rgba(59,130,246,.14);}.wb-glow.b{background:rgba(129,140,248,.1);}
.wb-eyebrow{background:rgba(59,130,246,.12);border-color:rgba(96,165,250,.3);color:#93c5fd;}
.wb-hero p{color:#a8b8d4;}
.wb-tag{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.13);color:#b6c4dc;}
.wb-stat{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:#cddcf5;}
.wb-kbd{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);}
.wb-icon{box-shadow:none;}
.wb-badge{background:rgba(16,185,129,.14);border-color:rgba(52,211,153,.3);color:#6ee7b7;}
.wb-badge.off{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1);color:#94a3b8;}
.wb-actions{border-top-color:rgba(255,255,255,.07);}
.wb-card:hover{border-color:#3b5a8a;}
.wb-button{background:transparent;color:#cbd5e1;}
.wb-button:hover{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15);}
.wb-button.primary{background:var(--wb-accent);color:#fff;}
.wb-button.danger:hover{border-color:rgba(244,63,94,.4);background:rgba(244,63,94,.1);color:#fb7185;}
.wb-count{background:rgba(59,130,246,.2);color:#93c5fd;}
.wb-count.gray{background:rgba(255,255,255,.06);color:#94a3b8;}
.wb-empty{background:rgba(255,255,255,.03);}
.wb-empty b{color:#cbd5e1;}
.wb-empty-ic{background:rgba(255,255,255,.05);}
.wb-error{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.3);color:#fca5a5;}
.wb-footer{background:rgba(255,255,255,.04);}
.wb-footer b{color:#cbd5e1;}
.wb-bulb{background:rgba(217,119,6,.12);border-color:rgba(217,119,6,.3);}
.wb-toast{background:rgba(23,32,51,.96);border-color:#2a3b57;color:#dbe6f8;}
.wb-toast.success{background:rgba(9,48,39,.96);border-color:#1d5a49;}
.wb-search{background:rgba(255,255,255,.04);}
}
@media (max-width:650px){.wb-root{padding:16px 12px 40px}.wb-hero{padding:24px 20px}.wb-hero h2{font-size:22px}.wb-grid{grid-template-columns:1fr}.wb-sec-hint{display:none}}
`

    function ensureStyle() {
      if (document.getElementById('wb-style')) return () => {}
      const el = document.createElement('style')
      el.id = 'wb-style'
      el.textContent = CSS
      document.head.appendChild(el)
      return () => {
        try {
          if (el.parentNode) el.parentNode.removeChild(el)
        } catch (e) {
          /* ignore */
        }
      }
    }

    // 知识库页面由RAG插件直接注册main cap:kb。
    // 工作台仅保留能力入口；不读取其他插件DOM、不隐藏footer、不自动点击弹窗。

    /** RAG sidecar 基址（与 dsh-raganything-kb 的 ragBaseUrl 对齐，含 /mu 前缀）。 */
    function kbApiBase() {
      const m = String(location.pathname || '').match(/^(\/mu\/[^/]+)/)
      return `${location.origin}${m ? m[1] : ''}/rag`
    }
    /** 带超时的 fetch：工作台加载不允许被探活请求无限期挂住（新账号 RAG sidecar 未就绪时 /rag/* 会挂起很久）。 */
    function fetchWithTimeout(url, options, timeoutMs) {
      const opts = Object.assign({}, options || {})
      const controller = typeof AbortController === 'function' ? new AbortController() : null
      if (controller) opts.signal = controller.signal
      const timer = window.setTimeout(() => { try { if (controller) controller.abort() } catch (_) {} }, timeoutMs)
      return fetch(url, opts).then(
        (response) => { window.clearTimeout(timer); return response },
        (error) => { window.clearTimeout(timer); throw error },
      )
    }

    /** 探活：sidecar 有任意 HTTP 响应即视为已安装；超时视为未安装（不再拖住能力包清单）。 */
    function probeKbInstalled() {
      return fetchWithTimeout(kbApiBase() + '/health', { cache: 'no-store' }, 3500)
        .then(() => true)
        .catch(() => fetchWithTimeout(kbApiBase() + '/', { cache: 'no-store' }, 2500).then(() => true).catch(() => false))
    }

    /* ----------------------------- 小工具/图标 ----------------------------- */

    /* 能力图标渐变色板：已知 id 固定配色，其余按 id 哈希轮转。 */
    const WB_GRADIENTS = [
      'linear-gradient(135deg,#3b82f6,#6366f1)',
      'linear-gradient(135deg,#8b5cf6,#a855f7)',
      'linear-gradient(135deg,#f59e0b,#f97316)',
      'linear-gradient(135deg,#14b8a6,#059669)',
      'linear-gradient(135deg,#f43f5e,#ec4899)',
      'linear-gradient(135deg,#0ea5e9,#2563eb)',
    ]
    const WB_GRADIENT_FIX = { meeting: 0, kb: 1 }
    function gradientFor(id) {
      const fixed = WB_GRADIENT_FIX[String(id || '')]
      if (fixed != null) return WB_GRADIENTS[fixed % WB_GRADIENTS.length]
      let n = 0
      for (const ch of String(id || 'wb')) n = (n * 31 + ch.charCodeAt(0)) >>> 0
      return WB_GRADIENTS[n % WB_GRADIENTS.length]
    }

    function svgSearch() {
      return h('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
        h('circle', { cx: 11, cy: 11, r: 7 }),
        h('line', { x1: 20, y1: 20, x2: 16.2, y2: 16.2 }))
    }
    function svgInfo() {
      return h('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('line', { x1: 12, y1: 10.5, x2: 12, y2: 16 }),
        h('circle', { cx: 12, cy: 7.5, r: 0.6, fill: 'currentColor', stroke: 'none' }))
    }
    function svgExternal() {
      return h('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M14 4h6v6' }),
        h('path', { d: 'M20 4 11 13' }),
        h('path', { d: 'M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6' }))
    }
    function svgPlus() {
      return h('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', 'aria-hidden': true },
        h('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
        h('line', { x1: 5, y1: 12, x2: 19, y2: 12 }))
    }
    function svgCheck() {
      return h('svg', { viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: '#059669', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('path', { d: 'm8.5 12.2 2.4 2.4 4.6-5' }))
    }
    function svgSparkle() {
      return h('svg', { viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: '#2563eb', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18' }))
    }
    function svgBulb() {
      return h('svg', { viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M9 18h6M10 21h4' }),
        h('path', { d: 'M12 3a6 6 0 0 0-3.5 10.9c.7.5 1 1.3 1 2.1h5c0-.8.3-1.6 1-2.1A6 6 0 0 0 12 3z' }))
    }

    /* ----------------------------- 首页组件 ----------------------------- */

    // 与应用侧栏共享同一用户命名空间；这里只管理工作台入口，不卸载插件进程。
    function loadedStorageKey() {
      const match = document.cookie.match(/(?:^|;\s*)dsh_mu_user=([^;]*)/)
      let user = ''
      try {
        user = decodeURIComponent(match ? match[1] : '')
      } catch (_) { /* 未启用多用户 */ }
      return 'dsh.workbench.loaded.' + (/^[A-Za-z0-9_-]{1,64}$/.test(user) ? user + '.' : '') + 'v1'
    }

    function readLoaded() {
      try {
        const value = JSON.parse(localStorage.getItem(loadedStorageKey()) || '{}')
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
      } catch (_) {
        return {}
      }
    }

    /** @param {object} props 由 slots.register 的 inject 注入：{openPanel} */
    function WorkbenchHome(props) {
      const { openPanel } = props
      const [caps, setCaps] = useState(null) // null=加载中
      const [loaded, setLoaded] = useState(readLoaded)
      const [error, setError] = useState('')
      const [search, setSearch] = useState('')
      const [toasts, setToasts] = useState([])
      const searchRef = useRef(null)
      const toastSeq = useRef(0)

      const showToast = useCallback((message, type) => {
        const id = ++toastSeq.current
        setToasts((list) => [...list, { id, message, type: type || 'info' }])
        window.setTimeout(() => {
          setToasts((list) => list.map((t) => (t.id === id ? { ...t, out: true } : t)))
          window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 320)
        }, 3000)
      }, [])

      const load = useCallback(() => {
        // 能力包清单先在拿到时立即渲染；kb / meeting 探活只做增量补充，且各有超时，
        // 任何一侧挂住都不会让页面永久停留在「正在获取能力包…」。
        const capabilitiesPromise = fetchWithTimeout(API + '/capabilities', { cache: 'no-store' }, 15000)
          .then((r) => {
            if (!r.ok) throw new Error('HTTP ' + r.status)
            return r.json()
          })
          .then((data) => {
            if (!data || !Array.isArray(data.capabilities)) throw new Error('返回数据格式不正确')
            setError('')
            setCaps(data.capabilities.slice())
            return data.capabilities.slice()
          })
          .catch((e) => {
            setError('无法加载能力包清单：' + String((e && e.message) || e))
            setCaps([])
            return []
          })
        const meeting = fetchWithTimeout('/api/meeting-assistant/templates', { cache: 'no-store' }, 5000)
          .then((response) => response.ok ? response.json() : null)
          .then((data) => data && Array.isArray(data.templates) ? {
            id: 'meeting', title: '会议助手', description: '录音与上传、模板生成纪要，按日期整理并支持纪要问答', entryKey: 'cap:meeting', order: 10,
          } : null)
          .catch(() => null)
        const kb = probeKbInstalled().then((ok) => ok ? {
          id: 'kb', title: '知识库', description: '多模态 RAG 知识库：文档上传解析、@ 引用问答、共享协作与回收站。', entryKey: 'cap:kb', order: 5,
        } : null).catch(() => null)
        Promise.all([capabilitiesPromise, meeting, kb]).then(([base, installedMeeting, installedKb]) => {
          if (!base || base.length === 0) return
          const capabilities = base.slice()
          for (const extra of [installedMeeting, installedKb]) {
            if (extra && !capabilities.some((item) => item && item.id === extra.id)) capabilities.push(extra)
          }
          setCaps(capabilities)
        })
      }, [])

      useEffect(() => {
        load()
        const sync = () => setLoaded(readLoaded())
        window.addEventListener('storage', sync)
        window.addEventListener('dsh:workbench-capabilities-change', sync)
        return () => {
          window.removeEventListener('storage', sync)
          window.removeEventListener('dsh:workbench-capabilities-change', sync)
        }
      }, [load])

      // Ctrl/⌘+K 聚焦搜索（对齐参考稿的 ⌘K 快捷键提示）
      useEffect(() => {
        const onKey = (e) => {
          if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault()
            const input = searchRef.current
            if (input) { input.focus(); input.select && input.select() }
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      function setActive(id, active) {
        const next = { ...readLoaded(), [id]: active }
        try {
          localStorage.setItem(loadedStorageKey(), JSON.stringify(next))
          setLoaded(next)
          setError('')
          window.dispatchEvent(new CustomEvent('dsh:workbench-capabilities-change', { detail: { id, loaded: active } }))
          const item = rows.find((c) => c.id === id)
          const title = (item && (item.title || item.id)) || id
          if (active) showToast(`已将「${title}」挂载到工作台快捷栏`, 'success')
          else showToast(`已将「${title}」从工作台快捷栏移出`, 'info')
        } catch (_) {
          setError('无法保存此工作台的能力包设置。请检查浏览器存储权限。')
        }
      }

      const q = search.trim().toLowerCase()
      const rows = (caps || []).filter((c) => c && c.id && c.id !== 'workbench')
      const matchQ = (c) => !q || ((c.title || '') + ' ' + (c.description || '')).toLowerCase().includes(q)
      const active = rows.filter((c) => loaded[c.id] !== false && matchQ(c))
      const available = rows.filter((c) => loaded[c.id] === false && matchQ(c))
      const loadedTotal = rows.filter((c) => loaded[c.id] !== false).length

      function card(c, isActive, idx) {
        return h('article', { key: c.id, className: 'wb-card', style: { animationDelay: Math.min(idx * 40, 240) + 'ms' } },
          h('div', { className: 'wb-card-top' },
            h('span', { className: 'wb-icon', 'aria-hidden': true, style: { background: gradientFor(c.id) } }, c.icon || '✦'),
            h('span', { className: 't' }, c.title || c.id),
            h('span', { className: 'wb-badge' + (isActive ? '' : ' off') },
              h('i', { 'aria-hidden': true }),
              isActive ? '已加载' : '未挂载',
            ),
          ),
          h('div', { className: 'd' }, c.description || '场景能力包'),
          h('div', { className: 'wb-actions' },
            h('span', { className: 'wb-ver' }, c.entryKey || c.id),
            isActive && c.entryKey ? h('button', { className: 'wb-button primary', type: 'button', onClick: () => openPanel && openPanel(c.entryKey) }, svgExternal(), '打开') : null,
            h('button', { className: 'wb-button' + (isActive ? ' danger' : ''), type: 'button', onClick: () => setActive(c.id, !isActive) },
              isActive ? '从工作台移除' : h(React.Fragment, null, svgPlus(), '加载到工作台'),
            ),
          ),
        )
      }

      function sectionHead(title, count, gray, hint) {
        return h('div', { className: 'wb-section-head' },
          h('h3', null, title, h('span', { className: 'wb-count' + (gray ? ' gray' : '') }, String(count))),
          hint ? h('span', { className: 'wb-sec-hint' }, svgInfo(), hint) : null,
        )
      }

      return h('div', { className: 'wb-root' },
        // Hero：光晕 + 脉冲标签 + 标题 + 统计徽标
        h('div', { className: 'wb-hero' },
          h('div', { className: 'wb-glow a', 'aria-hidden': true }),
          h('div', { className: 'wb-glow b', 'aria-hidden': true }),
          h('div', { className: 'wb-hero-in' },
            h('div', null,
              h('div', { className: 'wb-eyebrow' },
                h('span', { className: 'wb-ping', 'aria-hidden': true }, h('i'), h('b')),
                'YOUR WORKSPACE · CAPABILITIES',
              ),
              h('h2', null, '工作台能力管理', h('span', { className: 'wb-tag' }, '即时热插拔')),
              h('p', null, '把高频核心场景能力放在手边。已加载能力常驻显示在左侧导航「工作台」下方，支持折叠与拖拽排序，随时调用。'),
            ),
            h('span', { className: 'wb-stat' }, h('span', { className: 'wb-dot', 'aria-hidden': true }), loadedTotal + ' 个已加载能力'),
          ),
        ),
        error ? h('div', { className: 'wb-error', role: 'alert' }, error,
          h('button', { className: 'wb-button', type: 'button', onClick: load }, '重试')) : null,
        // 搜索工具栏（Ctrl/⌘+K 聚焦）
        h('div', { className: 'wb-toolbar' },
          h('label', { className: 'wb-search' },
            svgSearch(),
            h('input', {
              ref: searchRef,
              value: search,
              placeholder: '搜索能力包名称、场景描述或关键词…',
              onChange: (e) => setSearch(e.target && e.target.value || ''),
            }),
            h('kbd', { className: 'wb-kbd' }, 'Ctrl K'),
          ),
        ),
        caps === null ? h('div', { className: 'wb-empty' }, '正在获取能力包…') :
          h(React.Fragment, null,
            h('section', { className: 'wb-section', 'aria-label': '已加载能力包' },
              sectionHead('已加载能力包', active.length, false, '点击「打开」可在主区直接呼出'),
              active.length ? h('div', { className: 'wb-grid' }, active.map((c, i) => card(c, true, i))) :
                h('div', { className: 'wb-empty' },
                  h('span', { className: 'wb-empty-ic', 'aria-hidden': true }, svgSearch()),
                  h('b', null, q ? '没有匹配的已加载能力包' : '工作台还没有已加载的能力包'),
                  h('span', null, q ? '换个关键词试试，或从下方重新挂载。' : '从下方「可用能力包」一键挂载即可。'),
                ),
            ),
            h('section', { className: 'wb-section', 'aria-label': '可用能力包' },
              sectionHead('可用能力包', available.length, true, '点击「加载到工作台」一键挂载'),
              available.length ? h('div', { className: 'wb-grid' }, available.map((c, i) => card(c, false, i))) :
                h('div', { className: 'wb-empty' },
                  h('span', { className: 'wb-empty-ic', 'aria-hidden': true }, svgCheck()),
                  h('b', null, rows.length ? (q ? '没有匹配的可加载能力包' : '已安装的能力包都已加载') : '当前 Profile 尚无可用场景能力包'),
                  h('span', null, rows.length
                    ? (q ? '换个关键词试试。' : '所有常用能力均已在左侧导航常驻。')
                    : '新增能力包请前往「插件」安装。'),
                ),
            ),
            h('div', { className: 'wb-footer' },
              h('span', { className: 'wb-bulb', 'aria-hidden': true }, svgBulb()),
              h('div', null,
                h('b', null, '配置规则提示'),
                h('div', null, '这里的加载与移除只控制工作台快捷入口，不会安装、卸载或停用插件底层数据。新增能力包请前往「插件」统一管理。'),
              ),
            ),
          ),
        // Toast 反馈
        h('div', { className: 'wb-toasts', role: 'status' },
          toasts.map((t) => h('div', { key: t.id, className: 'wb-toast' + (t.type === 'success' ? ' success' : '') + (t.out ? ' out' : '') },
            t.type === 'success' ? svgCheck() : svgSparkle(),
            h('span', null, t.message),
          )),
        ),
      )
    }

    /* --------------------------- 知识库桥接页 --------------------------- */

    function KbIcon(props) {
      const size = (props && props.size) || 18
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { display: 'block', opacity: props && props.active ? 1 : 0.75 },
      },
        h('path', { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }),
        h('path', { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' }),
      )
    }

    /** 侧栏图标：接收 {size, active}。 */
    function WorkbenchIcon(props) {
      const size = (props && props.size) || 18
      const active = !!(props && props.active)
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block', opacity: active ? 1 : 0.75 },
        },
        h('rect', { x: 3, y: 3, width: 7, height: 7, rx: 1.5 }),
        h('rect', { x: 14, y: 3, width: 7, height: 7, rx: 1.5 }),
        h('rect', { x: 3, y: 14, width: 7, height: 7, rx: 1.5 }),
        h('rect', { x: 14, y: 14, width: 7, height: 7, rx: 1.5 }),
      )
    }

    /* --------------------- wbAutoCollapse-20261005 ---------------------
       进入能力包「全屏应用」页（知识库/会议助手/政策解读）时，自动把 DSH 左侧导航栏
       收起为 56px 图标条，把宽度让给插件自身的左侧导航；离开这些页面时恢复原展开态。
       挂在 shell.overlay（list 槽，常驻挂载、additive），不抢任何既有占用者。
       判定用槽位标准 hook usePanelInfo 订阅激活主面板；仅宽屏动作（窄屏由框架自动收起）；
       真实收起态以框架发布的 [data-sidebar-collapsed] / 「收起侧边栏」按钮为准，只在状态
       确实不符时 toggle。新增同类全屏应用能力包时，把它的 main key 加进下面的列表即可。 */
    const WB_FULLSCREEN_PANELS = ['cap:kb', 'cap:meeting', 'cap:policy-analysis', 'cap:huiwen-ppt']
    const WB_SIDEBAR_AUTO_COLLAPSE_PX = 1024

    /** @param {object} props 由 slots.register 的 inject 注入：
     *  {usePanelInfo, collapseHostSidebar, restoreHostSidebar}（usePanelInfo 为槽位标准 prop） */
    function PanelSidebarObserver(props) {
      const injected = props || {}
      const { usePanelInfo, collapseHostSidebar, restoreHostSidebar } = injected
      const activePanelId = typeof usePanelInfo === 'function'
        ? usePanelInfo((sel) => (sel ? sel.activePanelId : null))
        : null
      const collapsedByUs = useRef(false)
      useEffect(() => {
        if (typeof window === 'undefined') return
        if (window.innerWidth < WB_SIDEBAR_AUTO_COLLAPSE_PX) return
        if (WB_FULLSCREEN_PANELS.indexOf(activePanelId) >= 0) {
          // 已经是收起态时 collapse 返回 false，不会把「别人收起的」记成我们做的。
          if (collapseHostSidebar()) collapsedByUs.current = true
        } else if (collapsedByUs.current) {
          collapsedByUs.current = false
          restoreHostSidebar()
        }
      }, [activePanelId, collapseHostSidebar, restoreHostSidebar])
      return null
    }

    /* ------------------------------- 入口 ------------------------------- */

    return {
      inject: ['slots'],
      apply(ctx) {
        let ctxRef = ctx
        /** 打开某个 main 面板（能力包 entryKey 即 main key）。 */
        function openPanel(key) {
          if (!key) return
          try {
            const layout = ctxRef.get ? ctxRef.get('layout') : ctxRef.layout
            if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(key)
          } catch (e) {
            /* 打开面板失败不阻塞 UI */
          }
        }

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: 'workbench',
              inject: () => ({ openPanel }),
            },
            WorkbenchHome,
          ),
        )
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'workbench',
              order: 0,
              label: '工作台',
            },
            WorkbenchIcon,
          ),
        )

        // 知识库能力入口保持原ID与排序；main cap:kb由RAG插件唯一拥有。
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: 'cap:kb', order: 5, label: '知识库' },
            KbIcon,
          ),
        )

        /* wbAutoCollapse-20261005：宿主侧栏收起/恢复（供 shell.overlay 观测器调用）。
           返回值 = 本次是否真的执行了 toggle；只有「我们收起的」才在离开时恢复。 */
        function hostSidebarCollapsed() {
          try {
            if (typeof document === 'undefined') return true
            const expandedBtn = document.querySelector('button[aria-label="收起侧边栏"], button[aria-label="Collapse sidebar"]')
            return !expandedBtn || Boolean(document.querySelector('[data-sidebar-collapsed]'))
          } catch (e) {
            return true
          }
        }
        function hostLayout() {
          return ctxRef.get ? ctxRef.get('layout') : ctxRef.layout
        }
        function collapseHostSidebar() {
          try {
            const layout = hostLayout()
            if (!layout || typeof layout.toggleSidebar !== 'function') return false
            if (hostSidebarCollapsed()) return false
            layout.toggleSidebar()
            return true
          } catch (e) {
            return false
          }
        }
        function restoreHostSidebar() {
          try {
            const layout = hostLayout()
            if (!layout || typeof layout.toggleSidebar !== 'function') return false
            if (!hostSidebarCollapsed()) return false
            layout.toggleSidebar()
            return true
          } catch (e) {
            return false
          }
        }

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'workbench:auto-collapse',
              inject: () => ({ collapseHostSidebar, restoreHostSidebar }),
            },
            PanelSidebarObserver,
          ),
        )

        const removeStyle = ensureStyle()
        return () => {
          removeStyle()
        }
      },
    }
  },
})
