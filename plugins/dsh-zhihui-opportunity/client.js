/**
 * @local/zhihui-opportunity — 智汇·商机（客户端半）
 *
 * 骨架固定：window.__ModuleLoader__.load({ id, factory })，纯 React.createElement，无构建步骤。
 * 注册：
 *   - main key 'cap:zhihui-opportunity'            → 商机工作台面板（同源 iframe）
 *   - sidebar.panellist id 'cap:zhihui-opportunity' → 左侧导航「智汇·商机」能力包行
 *   - 打开事件桥 'cappacks:open-zhihui-opportunity'
 */

window.__ModuleLoader__.load({
  id: '@local/zhihui-opportunity',
  factory(require) {
    const React = require('react')
    const { useState, useEffect, useRef, useCallback } = React
    const h = React.createElement

    const PANEL_ID = 'cap:zhihui-opportunity'
    const APP_URL = '/zhihui/opportunity/'
    const SSO_URL = '/zhihui-sso/session?app=opportunity'
    const OPEN_EVENT = 'cappacks:open-zhihui-opportunity'

    /** 续期节奏：智汇闲置 2h 滑动过期，25 分钟探一次足够稳。 */
    const KEEPALIVE_MS = 25 * 60 * 1000
    const RESUMED_PROBE_MS = 5 * 60 * 1000
    const STALE_RELOAD_MS = 30 * 60 * 1000

    const CSS = `
.zh-opp-panel{position:relative;flex:1 1 auto;min-height:0;width:100%;height:100%;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#fff);}
.zh-opp-body{position:relative;flex:1 1 auto;min-height:0;width:100%;}
.zh-opp-bar{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:7px 12px;background:#fef3c7;border-bottom:1px solid #fcd34d;color:#92400e;font:12.5px/1.5 system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;}
.zh-opp-bar span{flex:1 1 auto;}
.zh-opp-bar button,.zh-opp-bar a{flex:0 0 auto;padding:3px 10px;border:1px solid #f59e0b;border-radius:7px;background:#fff;color:#92400e;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;}
.zh-opp-bar button:hover,.zh-opp-bar a:hover{background:#fffbeb;}
.zh-opp-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;}
.zh-opp-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;color:#475569;font:14px/1.6 system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;}
.zh-opp-state b{font-size:15px;color:#0f172a;}
.zh-opp-state span{font-size:12.5px;color:#94a3b8;max-width:520px;text-align:center;}
.zh-opp-spin{width:22px;height:22px;border-radius:50%;border:2.5px solid #fef3c7;border-top-color:#f59e0b;animation:zhOppSpin .9s linear infinite;}
@keyframes zhOppSpin{to{transform:rotate(360deg)}}
.zh-opp-actions{display:flex;gap:8px;margin-top:6px;}
.zh-opp-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;color:#475569;font:inherit;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;}
.zh-opp-btn:hover{border-color:#cbd5e1;background:#f8fafc;}
.zh-opp-btn.primary{background:#f59e0b;border-color:#f59e0b;color:#fff;}
.zh-opp-msg{margin-top:4px;padding:8px 12px;border-radius:9px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:12px;max-width:640px;word-break:break-all;}
`

    function ensureStyle() {
      if (document.getElementById('zh-opp-style')) return () => {}
      const el = document.createElement('style')
      el.id = 'zh-opp-style'
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

    function ZhihuiOpportunityPanel() {
      const [phase, setPhase] = useState('sso') // sso | ready | error
      const [detail, setDetail] = useState('')
      const [needLogin, setNeedLogin] = useState(false)
      const [banner, setBanner] = useState('')
      const [nonce, setNonce] = useState(0)
      const alive = useRef(true)
      const lastOk = useRef(0)

      const handshake = useCallback(() => {
        setPhase('sso')
        setDetail('')
        setBanner('')
        setNeedLogin(false)
        fetch(SSO_URL, { credentials: 'same-origin', cache: 'no-store' })
          .then(async (response) => {
            const body = await response.json().catch(() => ({}))
            if (response.ok && body && body.ok) return body
            // 401 = DSH 登录态缺失/失效（dsh_mu_session 校验不通过），引导回工作台登录页
            if (response.status === 401) {
              const loginError = new Error((body && body.reason) || '未检测到有效的 DSH 登录态，请重新登录工作台')
              loginError.needLogin = true
              throw loginError
            }
            throw new Error((body && (body.reason || body.error)) || `HTTP ${response.status}`)
          })
          .then(() => {
            if (!alive.current) return
            lastOk.current = Date.now()
            setPhase('ready')
            setNonce((n) => n + 1)
          })
          .catch((error) => {
            if (!alive.current) return
            setPhase('error')
            setNeedLogin(!!(error && error.needLogin))
            setDetail(String((error && error.message) || error))
          })
      }, [])

      /** 静默保活：定期重换票滑动 session 过期时间；失败只在顶部挂提示条，不动 iframe。 */
      const keepalive = useCallback(() => {
        if (!alive.current) return
        fetch(SSO_URL, { credentials: 'same-origin', cache: 'no-store' })
          .then(async (response) => {
            const body = await response.json().catch(() => ({}))
            if (response.ok && body && body.ok) {
              const gap = lastOk.current ? Date.now() - lastOk.current : 0
              lastOk.current = Date.now()
              if (!alive.current) return
              setBanner('')
              setNeedLogin(false)
              if (gap > STALE_RELOAD_MS) setNonce((n) => n + 1)
              return
            }
            if (!alive.current) return
            if (response.status === 401) {
              setNeedLogin(true)
              setBanner((body && body.reason) || 'DSH 登录态已失效，请重新登录工作台')
            } else {
              setBanner((body && (body.reason || body.error)) || `会话续期失败（HTTP ${response.status}）`)
            }
          })
          .catch(() => {
            if (alive.current) setBanner('网络异常，会话续期失败')
          })
      }, [])

      useEffect(() => {
        alive.current = true
        handshake()
        const timer = setInterval(keepalive, KEEPALIVE_MS)
        const onWake = () => {
          if (document.visibilityState !== 'visible') return
          if (Date.now() - lastOk.current < RESUMED_PROBE_MS) return
          keepalive()
        }
        document.addEventListener('visibilitychange', onWake)
        window.addEventListener('focus', onWake)
        return () => {
          alive.current = false
          clearInterval(timer)
          document.removeEventListener('visibilitychange', onWake)
          window.removeEventListener('focus', onWake)
        }
      }, [handshake, keepalive])

      if (phase === 'ready') {
        return h(
          'div',
          { className: 'zh-opp-panel' },
          banner
            ? h(
                'div',
                { className: 'zh-opp-bar' },
                h('span', null, banner),
                h('button', { type: 'button', onClick: keepalive }, '重新连接'),
                needLogin
                  ? h('a', { href: `/login?next=${encodeURIComponent(location.pathname + location.search)}` }, '登录工作台')
                  : null,
              )
            : null,
          h(
            'div',
            { className: 'zh-opp-body' },
            h('iframe', {
              key: nonce,
              className: 'zh-opp-frame',
              src: APP_URL,
              title: '智汇·商机',
              allow: 'clipboard-write; clipboard-read; fullscreen',
            }),
          ),
        )
      }

      if (phase === 'sso') {
        return h(
          'div',
          { className: 'zh-opp-panel' },
          h(
            'div',
            { className: 'zh-opp-state' },
            h('span', { className: 'zh-opp-spin', 'aria-hidden': true }),
            h('b', null, '正在接入智汇·商机'),
            h('span', null, '使用当前 DSH 账号自动登录，无需再次输入密码…'),
          ),
        )
      }

      return h(
        'div',
        { className: 'zh-opp-panel' },
        h(
          'div',
          { className: 'zh-opp-state' },
            h('b', null, needLogin ? 'DSH 登录态已失效' : '智汇·商机暂时无法打开'),
            h(
              'span',
              null,
              needLogin
                ? '智汇·商机跟随 DSH 账号登录。请重新登录工作台后再打开本面板。'
                : '已登录工作台但未能换取智汇会话，通常是后端 sidecar 未就绪。',
            ),
            detail ? h('div', { className: 'zh-opp-msg' }, detail) : null,
            h(
              'div',
              { className: 'zh-opp-actions' },
              h('button', { className: 'zh-opp-btn primary', type: 'button', onClick: handshake }, '重试'),
              needLogin
                ? h(
                    'a',
                    {
                      className: 'zh-opp-btn',
                      href: `/login?next=${encodeURIComponent(location.pathname + location.search)}`,
                    },
                    '重新登录工作台',
                  )
                : h('a', { className: 'zh-opp-btn', href: APP_URL, target: '_blank', rel: 'noopener noreferrer' }, '在新窗口打开'),
            ),
          ),
      )
    }

    function PanelIcon(props) {
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
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('circle', { cx: 12, cy: 12, r: 5 }),
        h('circle', { cx: 12, cy: 12, r: 1.4, fill: 'currentColor', stroke: 'none' }),
        h('line', { x1: 12, y1: 12, x2: 19, y2: 5 }),
      )
    }

    return {
      inject: ['slots', 'layout'],
      apply(ctx) {
        const cleanups = []

        cleanups.push(
          ctx.slots.inject('main', () =>
            ctx.slots.register({ name: 'main', key: PANEL_ID }, ZhihuiOpportunityPanel),
          ),
        )

        cleanups.push(
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register(
              { name: 'sidebar.panellist', id: PANEL_ID, order: 31, label: '智汇·商机' },
              PanelIcon,
            ),
          ),
        )

        function onOpen() {
          const layout = ctx.layout || (ctx.get && ctx.get('layout'))
          if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_ID)
        }
        window.addEventListener(OPEN_EVENT, onOpen)
        cleanups.push(() => window.removeEventListener(OPEN_EVENT, onOpen))

        const removeStyle = ensureStyle()
        cleanups.push(removeStyle)

        return () => {
          for (const dispose of cleanups.reverse()) {
            try {
              if (typeof dispose === 'function') dispose()
            } catch (e) {
              /* ignore */
            }
          }
        }
      },
    }
  },
})
