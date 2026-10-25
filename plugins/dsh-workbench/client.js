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
.wb-hero-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.wb-sync-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:12px;border:1px solid var(--wb-border);background:rgba(255,255,255,.92);box-shadow:var(--wb-sh-card);font:inherit;font-size:12.5px;font-weight:650;color:#334155;cursor:pointer;transition:all .15s;white-space:nowrap;}
.wb-sync-btn:hover{border-color:var(--wb-accent);color:var(--wb-accent);transform:translateY(-1px);}
.wb-sync-btn:active{transform:translateY(0);}
.wb-sync-btn.busy{color:var(--wb-accent);border-color:var(--wb-accent);cursor:wait;}
.wb-sync-btn.busy .ic{animation:wbSpin 1s linear infinite;display:inline-block;}
@keyframes wbSpin{to{transform:rotate(360deg)}}
.wb-sync-time{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:550;color:var(--wb-muted);white-space:nowrap;}
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
.wb-sync-btn{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:#cddcf5;}
.wb-sync-btn:hover{border-color:#60a5fa;color:#93c5fd;}
.wb-sync-btn.busy{color:#93c5fd;border-color:rgba(96,165,250,.4);}
.wb-sync-time{color:#8fa3c4;}
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
.wb-tag.ver{background:rgba(99,102,241,.16);border-color:rgba(129,140,248,.32);color:#a5b4fc;}
.wb-tag.upgrade{background:rgba(249,115,22,.13);border-color:rgba(251,146,60,.34);color:#fdba74;}
.wb-ver-pill{color:#8fa3c4;}
.wb-button.upgrade{background:rgba(249,115,22,.13);border-color:rgba(251,146,60,.38);color:#fdba74;}
.wb-button.upgrade:hover{background:rgba(249,115,22,.22);border-color:rgba(251,146,60,.55);color:#fed7aa;}
}
@media (max-width:650px){.wb-root{padding:16px 12px 40px}.wb-hero{padding:24px 20px}.wb-hero h2{font-size:22px}.wb-grid{grid-template-columns:1fr}.wb-sec-hint{display:none}}

/* ===== 三区 Tab（我的工作台 / 我的收藏 / 工作台市场） ===== */
.wb-zone-tabs{display:flex;gap:6px;margin-bottom:18px;border-bottom:1px solid var(--wb-border);}
.wb-zone-tab{padding:10px 16px;cursor:pointer;color:var(--wb-muted);font-weight:600;font-size:13.5px;border-bottom:2px solid transparent;transition:.15s;display:flex;align-items:center;gap:8px;user-select:none;}
.wb-zone-tab:hover{color:var(--wb-fg);}
.wb-zone-tab.active{color:var(--wb-accent);border-bottom-color:var(--wb-accent);}
.wb-zone-tab .zt-count{font-size:11px;background:#f1f5f9;color:#94a3b8;padding:1px 8px;border-radius:10px;font-weight:700;}
.wb-zone-tab.active .zt-count{background:#dbeafe;color:#1d4ed8;}
.wb-mkt-hero{position:relative;overflow:hidden;border:1px solid rgba(191,219,254,.8);border-radius:18px;background:linear-gradient(135deg,#eff6ff,#f5f3ff);padding:26px 28px;margin-bottom:18px;}
.wb-mkt-hero h2{margin:0 0 6px;font-size:21px;font-weight:800;}
.wb-mkt-hero p{margin:0 0 14px;color:var(--wb-muted);font-size:13px;max-width:560px;}
.wb-mkt-hero code{color:var(--wb-accent);}
.wb-mkt-stats{display:flex;gap:26px;flex-wrap:wrap;}
.wb-mkt-stats .m{font-size:20px;font-weight:800;color:var(--wb-fg);}
.wb-mkt-stats .m span{font-size:12px;color:var(--wb-muted);font-weight:500;margin-left:4px;}
.wb-cat-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
.wb-cat-chip{padding:6px 14px;border-radius:20px;border:1px solid var(--wb-border);background:var(--wb-card);cursor:pointer;font-size:12.5px;font-weight:500;color:var(--wb-muted);transition:.15s;user-select:none;}
.wb-cat-chip:hover{border-color:var(--wb-accent);color:var(--wb-fg);}
.wb-cat-chip.active{background:var(--wb-accent);border-color:var(--wb-accent);color:#fff;}
.wb-mkt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;}
.wb-mkt-card{display:flex;flex-direction:column;background:var(--wb-card);border:1px solid var(--wb-border);border-radius:14px;overflow:hidden;cursor:pointer;transition:.18s;animation:wbEnter .28s cubic-bezier(.16,1,.3,1) both;}
.wb-mkt-card:hover{transform:translateY(-3px);border-color:#bfdbfe;box-shadow:var(--wb-sh-hover);}
.wb-mkt-cover{height:104px;display:grid;place-items:center;font-size:36px;position:relative;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);}
.wb-mkt-cover .cat-ribbon{position:absolute;top:8px;left:8px;font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,.9);color:#475569;}
.wb-mkt-body{padding:12px 13px;display:flex;flex-direction:column;gap:6px;flex:1;}
.wb-mkt-body h3{margin:0;font-size:14px;font-weight:700;}
.wb-mkt-author{font-size:11.5px;color:var(--wb-muted);}
.wb-mkt-desc{font-size:12px;color:var(--wb-muted);height:32px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.wb-mkt-foot{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:2px;}
.wb-mkt-foot .dl{margin-left:auto;font-size:11px;color:#94a3b8;}
.wb-mkt-actions{display:flex;gap:8px;margin-top:10px;}
.wb-mkt-actions .wb-button{flex:1;justify-content:center;}
.wb-tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap;}
.wb-tag.installed{background:#ecfdf5;color:#047857;border:1px solid rgba(167,243,208,.7);}
.wb-tag.favorited{background:#fffbeb;color:#b45309;border:1px solid rgba(253,230,138,.6);}
.wb-tag.cat{background:#f1f5f9;color:var(--wb-muted);}
.wb-tag.ver{background:#eef2ff;color:#4338ca;border:1px solid rgba(199,210,254,.85);font-family:ui-monospace,SFMono-Regular,monospace;}
.wb-tag.upgrade{background:#fff7ed;color:#c2410c;border:1px solid rgba(253,186,116,.75);font-weight:650;}
.wb-card-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:-3px;}
.wb-ver-pill{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-family:ui-monospace,SFMono-Regular,monospace;color:#94a3b8;}
.wb-button.upgrade{background:#fff7ed;border-color:#fdba74;color:#c2410c;}
.wb-button.upgrade:hover{background:#ffedd5;border-color:#fb923c;color:#9a3412;}
.wb-inst-row{display:flex;align-items:center;gap:14px;background:var(--wb-card);border:1px solid var(--wb-border);border-radius:12px;padding:14px 16px;margin-bottom:10px;transition:.15s;cursor:pointer;}
.wb-inst-row:hover{border-color:#bfdbfe;}
.wb-inst-row .ir-ic{width:44px;height:44px;border-radius:11px;display:grid;place-items:center;color:#fff;font-size:20px;flex-shrink:0;}
.wb-inst-row .ir-info{flex:1;min-width:0;}
.wb-inst-row .ir-name{font-weight:700;font-size:14px;}
.wb-inst-row .ir-desc{font-size:12px;color:var(--wb-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.wb-inst-row .ir-meta{display:flex;gap:8px;font-size:11px;color:#94a3b8;margin-top:4px;flex-wrap:wrap;align-items:center;}
.wb-inst-row .ir-actions{display:flex;gap:8px;flex-shrink:0;}
.wb-view-toggle{display:inline-flex;border:1px solid var(--wb-border);border-radius:9px;overflow:hidden;background:var(--wb-card);}
.wb-view-toggle .vt-btn{width:34px;height:32px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;cursor:pointer;color:#94a3b8;font-size:15px;transition:.15s;}
.wb-view-toggle .vt-btn.active{color:#fff;background:var(--wb-accent);}

/* ===== 弹窗 ===== */
.wb-modal-mask{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(3px);z-index:1000;display:flex;align-items:center;justify-content:center;animation:wbFade .18s;}
@keyframes wbFade{from{opacity:0}}
@keyframes wbPop{from{opacity:0;transform:translateY(14px) scale(.97)}}
.wb-modal{background:var(--wb-card);border:1px solid #cbd5e1;border-radius:18px;width:640px;max-width:94vw;max-height:90vh;display:flex;flex-direction:column;animation:wbPop .2s;box-shadow:0 24px 60px rgba(15,23,42,.25);}
.wb-modal.lg{width:780px;}
.wb-modal-head{display:flex;align-items:center;padding:18px 22px;border-bottom:1px solid var(--wb-border);}
.wb-modal-head h2{margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:9px;}
.wb-modal-head .close{margin-left:auto;color:#94a3b8;cursor:pointer;font-size:20px;padding:2px 6px;border-radius:6px;background:none;border:none;}
.wb-modal-head .close:hover{color:var(--wb-fg);background:#f1f5f9;}
.wb-modal-body{padding:22px;overflow-y:auto;}
.wb-modal-foot{padding:16px 22px;border-top:1px solid var(--wb-border);display:flex;justify-content:flex-end;gap:10px;align-items:center;}
.wb-modal-foot .foot-left{margin-right:auto;color:var(--wb-muted);font-size:12px;}

/* ===== 详情 ===== */
.wb-detail-hero{display:flex;gap:16px;margin-bottom:16px;}
.wb-dh-cover{width:96px;height:96px;border-radius:14px;display:grid;place-items:center;font-size:44px;flex-shrink:0;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);}
.wb-dh-info h2{margin:0 0 4px;font-size:18px;}
.wb-dh-meta{color:var(--wb-muted);font-size:12px;margin-bottom:8px;}
.wb-dh-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
.wb-kv{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:13px;}
.wb-kv .k{color:var(--wb-muted);}
.wb-kv .v{color:var(--wb-fg);font-weight:500;font-family:ui-monospace,monospace;font-size:12px;}
.wb-detail-sec{margin-bottom:16px;}
.wb-ds-t{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;}

/* ===== 安装流水线 ===== */
.wb-pipeline{display:flex;flex-direction:column;gap:0;margin:6px 0 4px;}
.wb-pipe-step{display:flex;align-items:flex-start;gap:13px;position:relative;padding-bottom:18px;}
.wb-pipe-step:last-child{padding-bottom:0;}
.wb-pipe-step::before{content:"";position:absolute;left:13px;top:28px;bottom:0;width:2px;background:var(--wb-border);}
.wb-pipe-step:last-child::before{display:none;}
.wb-pipe-node{width:26px;height:26px;border-radius:50%;background:#f1f5f9;border:2px solid #cbd5e1;display:grid;place-items:center;font-size:12px;flex-shrink:0;position:relative;z-index:1;color:#64748b;transition:.2s;}
.wb-pipe-step .pipe-body{flex:1;padding-top:2px;}
.wb-pipe-step .pipe-title{font-weight:600;font-size:13px;display:flex;align-items:center;gap:8px;}
.wb-pipe-step .pipe-sub{font-size:12px;color:var(--wb-muted);margin-top:3px;}
.wb-pipe-step.done .wb-pipe-node{background:#10b981;border-color:#10b981;color:#fff;}
.wb-pipe-step.done::before{background:#10b981;}
.wb-pipe-step.doing .wb-pipe-node{background:var(--wb-accent);border-color:var(--wb-accent);color:#fff;animation:wbPulse 1s infinite;}
.wb-pipe-step.fail .wb-pipe-node{background:#ef4444;border-color:#ef4444;color:#fff;}
.wb-pipe-log{font-family:ui-monospace,monospace;font-size:11px;color:var(--wb-muted);background:#f8fafc;border-radius:8px;padding:6px 10px;margin-top:5px;white-space:pre-wrap;line-height:1.6;}

/* ===== AI 制作对话 ===== */
.wb-chat-box{background:#f8fafc;border:1px solid var(--wb-border);border-radius:12px;padding:14px;max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;}
.wb-chat-msg{display:flex;gap:9px;max-width:88%;}
.wb-chat-msg.ai{align-self:flex-start;}
.wb-chat-msg.user{align-self:flex-end;flex-direction:row-reverse;}
.wb-chat-msg .bubble{padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.6;white-space:pre-wrap;}
.wb-chat-msg.ai .bubble{background:var(--wb-card);border:1px solid var(--wb-border);border-top-left-radius:4px;}
.wb-chat-msg.user .bubble{background:var(--wb-accent);color:#fff;border-top-right-radius:4px;}
.wb-chat-msg .who{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:14px;flex-shrink:0;}
.wb-chat-msg.ai .who{background:linear-gradient(135deg,#7c3aed,#a855f7);}
.wb-chat-msg.user .who{background:linear-gradient(135deg,#f59e0b,#ef4444);}
.wb-chat-input-row{display:flex;gap:10px;margin-top:14px;}
.wb-chat-input-row .wb-search{flex:1;}
.wb-opt-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
.wb-opt-chip{padding:6px 13px;border-radius:20px;border:1px solid var(--wb-accent);color:var(--wb-accent);font-size:12px;cursor:pointer;transition:.15s;background:transparent;}
.wb-opt-chip:hover{background:rgba(37,99,235,.08);}
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

    /* 语义化版本比较：返回 -1 / 0 / 1（a 相对 b）。支持 "1.2.3"、"v1.2.3"、"1.2"、"1.2.3-beta" 等。 */
    function parseVersionParts(v) {
      const s = String(v == null ? '' : v).trim().replace(/^v/i, '')
      const m = s.match(/^\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?/)
      if (!m) return null
      const nums = [m[1], m[2], m[3]].map((x) => (x == null ? 0 : parseInt(x, 10)))
      // 预发布（带 "-"）视为低于正式版；带 "+" 构建元数据不影响比较
      const pre = s.includes('-') ? -1 : 0
      return { nums, pre }
    }
    function compareVersions(a, b) {
      const pa = parseVersionParts(a)
      const pb = parseVersionParts(b)
      if (!pa && !pb) return 0
      if (!pa) return -1
      if (!pb) return 1
      for (let i = 0; i < 3; i++) {
        if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] > pb.nums[i] ? 1 : -1
      }
      if (pa.pre !== pb.pre) return pa.pre > pb.pre ? 1 : -1
      return 0
    }

    /* 规范化版本号展示：无论输入 "1.5.2" 还是 "v1.5.2"，统一输出 "v1.5.2"，避免 "vv" 重复。 */
    function fmtVersion(v) {
      const s = String(v == null ? '' : v).trim()
      return s ? ('v' + s.replace(/^v/i, '')) : ''
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
      const [caps, setCaps] = useState([])         // 已安装能力（我的工作台数据源）
      const [favorites, setFavorites] = useState([]) // 收藏清单
      const [market, setMarket] = useState(null)    // 市场数据 {workbenches, categories, meta}
      const [marketCats, setMarketCats] = useState([])
      const [marketList, setMarketList] = useState([])
      const [error, setError] = useState('')
      const [loading, setLoading] = useState(true)
      const [zone, setZone] = useState('mine')       // mine | fav | mkt
      const [marketCat, setMarketCat] = useState('all')
      const [search, setSearch] = useState('')
      const [mineSearch, setMineSearch] = useState('')
      const [mineView, setMineView] = useState('grid') // list | grid
      const [toasts, setToasts] = useState([])
      const [modal, setModal] = useState(null)       // 弹窗状态
      const [syncing, setSyncing] = useState(false)  // 市场同步中
      const toastSeq = useRef(0)

      const showToast = useCallback((message, type) => {
        const id = ++toastSeq.current
        setToasts((list) => [...list, { id, message, type: type || 'info' }])
        window.setTimeout(() => {
          setToasts((list) => list.map((t) => (t.id === id ? { ...t, out: true } : t)))
          window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 320)
        }, 3000)
      }, [])

      const loadCaps = useCallback(() => {
        return fetchWithTimeout(API + '/capabilities', { cache: 'no-store' }, 15000)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => (data && Array.isArray(data.capabilities) ? data.capabilities.filter((c) => c && c.id !== 'workbench') : []))
          .catch(() => [])
      }, [])

      const loadFavorites = useCallback(() => {
        return fetchWithTimeout(API + '/favorites', { cache: 'no-store' }, 8000)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => (data && Array.isArray(data.favorites) ? data.favorites : []))
          .catch(() => [])
      }, [])

      const loadMarket = useCallback((force) => {
        return fetchWithTimeout(API + '/market' + (force ? '?force=1' : ''), { cache: 'no-store' }, 15000)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data || data.ok === false) return null
            return data
          })
          .catch(() => null)
      }, [])

      useEffect(() => {
        let alive = true
        setLoading(true)
        Promise.all([loadCaps(), loadFavorites(), loadMarket(false)]).then(([c, f, m]) => {
          if (!alive) return
          setCaps(c)
          setFavorites(f)
          if (m) {
            setMarket(m)
            setMarketCats(m.categories || [])
            setMarketList(m.workbenches || [])
          }
          setError('')
          setLoading(false)
        })
        return () => { alive = false }
      }, [loadCaps, loadFavorites, loadMarket])

      // 能力清单变更监听
      useEffect(() => {
        const sync = () => loadCaps().then((c) => setCaps(c))
        window.addEventListener('dsh:workbench-capabilities-change', sync)
        return () => window.removeEventListener('dsh:workbench-capabilities-change', sync)
      }, [loadCaps])

      /* ---------------- 收藏切换 ---------------- */
      function toggleFav(item) {
        const mid = item.market_id != null ? item.market_id : item.id
        const body = {
          action: 'toggle',
          market_id: mid,
          name: item.name, icon: item.icon, author: item.author,
          category: item.category, version: item.version, desc: item.desc || item.description,
        }
        fetch(API + '/favorites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
          .then((r) => r.json())
          .then((data) => {
            if (data && data.ok) {
              setFavorites(data.favorites || [])
              showToast(data.favorited ? `已收藏「${item.name}」` : `已取消收藏「${item.name}」`, data.favorited ? 'success' : 'info')
            }
          })
          .catch(() => showToast('收藏操作失败', 'error'))
      }

      function isFavorited(item) {
        const mid = item.market_id != null ? item.market_id : item.id
        return favorites.some((f) => f.market_id === mid)
      }
      function isInstalled(item) {
        const name = item.name || item.title
        return caps.some((c) => (c.title || c.id) === name || c.id === (item.entryKey || ''))
      }

      /* 为已安装能力（我的工作台项）匹配市场上的对应工作台，用于版本比对。 */
      function findMarketForCap(c) {
        const key = c.title || c.id
        if (!key) return null
        return (marketList || []).find((w) => (w.name || '') === key) || null
      }
      /* 返回 { market, current, latest }，仅当市场版本高于已安装版本时。 */
      function upgradeInfoFor(c) {
        const cur = c.version
        if (!cur) return null
        const m = findMarketForCap(c)
        const latest = m && m.version
        if (!m || !latest) return null
        return compareVersions(latest, cur) > 0 ? { market: m, current: cur, latest } : null
      }

      /* ---------------- 市场同步（hero 与市场区共用） ---------------- */
      function manualSync() {
        if (syncing) return
        setSyncing(true)
        loadMarket(true).then((m) => {
          setSyncing(false)
          if (m) {
            setMarket(m)
            setMarketCats(m.categories || [])
            setMarketList(m.workbenches || [])
            showToast('市场已同步', 'success')
          } else showToast('同步失败', 'error')
        })
      }
      function fmtSyncTime(iso) {
        if (!iso) return ''
        try {
          const d = new Date(iso)
          if (isNaN(d.getTime())) return ''
          const p = (n) => String(n).padStart(2, '0')
          return p(d.getHours()) + ':' + p(d.getMinutes())
        } catch (e) { return '' }
      }

      /* ---------------- 打开应用 ---------------- */
      function openInstalled(c) {
        if (c.entryKey && openPanel) openPanel(c.entryKey)
        else showToast('该能力包暂无可打开入口', 'info')
      }

      /* ---------------- 安装流水线 ---------------- */
      function startInstall(item, action) {
        setModal({ type: 'install', item, steps: installSteps(), cur: 0, status: 'running', logs: [] })
        const body = {
          name: item.name, author: item.author, category: item.category,
          version: item.version, desc: item.desc || item.description,
          package_url: item.package_url || item.download_url || '',
          package_type: item.package_type || 'release',
          icon: item.icon,
          market_id: item.market_id != null ? item.market_id : item.id,
          action: action || 'install',
        }
        fetch(API + '/install', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
          .then((r) => r.json())
          .then((data) => {
            setModal((m) => {
              if (!m || m.type !== 'install') return m
              if (data && data.ok) {
                return { ...m, status: 'done', cur: installSteps().length, logs: data.logs || [] }
              }
              return { ...m, status: 'fail', logs: data.logs || [], errMsg: data.error || '安装失败' }
            })
            if (data && data.ok) {
              loadCaps().then(setCaps)
              showToast(`「${item.name}」安装完成，待重载生效`, 'success')
            } else {
              showToast('安装失败：' + (data && data.error ? data.error : '未知错误'), 'error')
            }
          })
          .catch((e) => {
            setModal((m) => (m && m.type === 'install' ? { ...m, status: 'fail', errMsg: String((e && e.message) || e) } : m))
            showToast('安装请求失败', 'error')
          })
      }

      function confirmReload(item) {
        setModal({ type: 'reload', item })
      }
      function doReload(item) {
        setModal(null)
        loadCaps().then(setCaps)
        showToast(`「${item.name}」已热重载生效，可立即调用`, 'success')
      }

      /* ---------------- AI 制作 ---------------- */
      function openMaker() {
        setModal({ type: 'maker', messages: [{ who: 'ai', text: '你好！我来帮你「制作一个工作台」。请告诉我：这个工作台叫什么名字？主要用来做什么？' }], busy: false })
      }
      function sendMakerMsg(text) {
        setModal((m) => {
          if (!m || m.type !== 'maker') return m
          const msgs = m.messages.concat([{ who: 'user', text }])
          return { ...m, messages: msgs, busy: true }
        })
        const body = { prompt: text }
        fetch(API + '/maker', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
          .then((r) => r.json())
          .then((data) => {
            setModal((m) => {
              if (!m || m.type !== 'maker') return m
              const msgs = m.messages.slice()
              if (data && data.ok) {
                msgs.push({ who: 'ai', text: '正在通过 DSH 内置模型生成能力包源码（会话 ' + (data.sessionId || '').slice(0, 8) + '…）。生成结果将出现在主对话区，完成后本地打包安装即可在「我的工作台」调用。' })
              } else {
                msgs.push({ who: 'ai', text: '生成启动失败：' + (data && data.message ? data.message : '未知错误') })
              }
              return { ...m, messages: msgs, busy: false }
            })
          })
          .catch((e) => {
            setModal((m) => (m && m.type === 'maker' ? { ...m, messages: m.messages.concat([{ who: 'ai', text: '请求失败：' + String((e && e.message) || e) }]), busy: false } : m))
          })
      }

      /* ---------------- 渲染 ---------------- */
      const q = search.trim().toLowerCase()
      const mq = mineSearch.trim().toLowerCase()

      const filteredCaps = mq ? caps.filter((c) => ((c.title || '') + ' ' + (c.description || '') + ' ' + (c.category || '')).toLowerCase().includes(mq)) : caps
      const filteredMkt = (marketList || []).filter((w) => {
        if (marketCat !== 'all' && w.category !== marketCat) return false
        if (q) {
          const hay = ((w.name || '') + ' ' + (w.author || '') + ' ' + (w.desc || w.description || '') + ' ' + (w.category || '')).toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })

      const totalDl = (marketList || []).reduce((a, b) => a + (Number(b.downloads) || 0), 0)

      /* ---- 顶部三区 Tab ---- */
      function zoneTabs() {
        const tabs = [
          { key: 'mine', label: '我的工作台', count: caps.length, ic: '📦' },
          { key: 'fav', label: '我的收藏', count: favorites.length, ic: '⭐' },
          { key: 'mkt', label: '工作台市场', count: (marketList || []).length, ic: '🏪' },
        ]
        return h('div', { className: 'wb-zone-tabs' },
          tabs.map((t) => h('div', {
            key: t.key, className: 'wb-zone-tab' + (zone === t.key ? ' active' : ''),
            onClick: () => setZone(t.key),
          }, t.ic + ' ' + t.label, h('span', { className: 'zt-count' }, String(t.count)))),
        )
      }

      /* ---- 我的工作台 ---- */
      function renderMine() {
        const toolbar = h('div', { className: 'wb-toolbar' },
          h('div', { style: { fontWeight: 700, fontSize: '14px' } }, '已安装工作台（' + caps.length + '）'),
          h('div', { style: { flex: 1 } }),
          h('label', { className: 'wb-search', style: { maxWidth: 260 } },
            svgSearch(),
            h('input', { value: mineSearch, placeholder: '搜索名称 / 描述 / 类别', onChange: (e) => setMineSearch(e.target.value) }),
          ),
          h('div', { className: 'wb-view-toggle', role: 'tablist' },
            h('button', { className: 'vt-btn' + (mineView === 'list' ? ' active' : ''), title: '列表视图', onClick: () => setMineView('list') }, '☰'),
            h('button', { className: 'vt-btn' + (mineView === 'grid' ? ' active' : ''), title: '图标视图', onClick: () => setMineView('grid') }, '▦'),
          ),
          h('button', { className: 'wb-button primary', type: 'button', onClick: openMaker }, svgSparkle(), '制作我的工作台'),
        )

        if (filteredCaps.length === 0) {
          return h('div', null, toolbar, h('div', { className: 'wb-empty' },
            h('span', { className: 'wb-empty-ic' }, '🔍'),
            h('b', null, mq ? '没有匹配的工作台' : '还没有已安装的工作台'),
            h('span', null, mq ? '换个关键词试试，或去「工作台市场」安装更多。' : '去「工作台市场」安装第一个工作台吧。'),
          ))
        }

        let body
        if (mineView === 'grid') {
          body = h('div', { className: 'wb-grid' }, filteredCaps.map((c, i) => {
            const up = upgradeInfoFor(c)
            return h('article', { key: c.id, className: 'wb-card', style: { animationDelay: Math.min(i * 40, 240) + 'ms' } },
              h('div', { className: 'wb-card-top' },
                h('span', { className: 'wb-icon', style: { background: gradientFor(c.id) } }, c.icon || '✦'),
                h('span', { className: 't' }, c.title || c.id),
                h('span', { className: 'wb-tag installed' }, '● 已安装'),
              ),
              h('div', { className: 'd' }, c.description || ''),
              h('div', { className: 'wb-card-meta' },
                c.version ? h('span', { className: 'wb-tag ver' }, fmtVersion(c.version)) : null,
                up ? h('span', { className: 'wb-tag upgrade' }, '↑ 可升级 ' + fmtVersion(up.latest)) : null,
              ),
              h('div', { className: 'wb-actions' },
                h('button', { className: 'wb-button primary', type: 'button', onClick: () => openInstalled(c) }, '打开'),
                up ? h('button', { className: 'wb-button upgrade', type: 'button', onClick: () => startInstall(up.market, 'upgrade') }, '⬆ 升级') : null,
                h('button', { className: 'wb-button danger', type: 'button', onClick: () => showToast('卸载功能待接入', 'info') }, '卸载'),
              ),
            )
          }))
        } else {
          body = h('div', null, filteredCaps.map((c) => {
            const up = upgradeInfoFor(c)
            return h('div', { key: c.id, className: 'wb-inst-row', onClick: () => openInstalled(c) },
              h('span', { className: 'ir-ic', style: { background: gradientFor(c.id) } }, c.icon || '✦'),
              h('div', { className: 'ir-info' },
                h('div', { className: 'ir-name' }, c.title || c.id),
                h('div', { className: 'ir-desc' }, c.description || ''),
                h('div', { className: 'ir-meta' },
                  c.category ? h('span', { className: 'wb-tag cat' }, c.category) : null,
                  c.version ? h('span', { className: 'wb-tag ver' }, fmtVersion(c.version)) : null,
                  up ? h('span', { className: 'wb-tag upgrade' }, '↑ 可升级 ' + fmtVersion(up.latest)) : null,
                  h('span', { className: 'wb-tag installed' }, '● 已安装可用'),
                ),
              ),
              h('div', { className: 'ir-actions' },
                up ? h('button', { className: 'wb-button upgrade', type: 'button', onClick: (e) => { e.stopPropagation(); startInstall(up.market, 'upgrade') } }, '⬆ 升级') : null,
                h('button', { className: 'wb-button primary', type: 'button', onClick: (e) => { e.stopPropagation(); openInstalled(c) } }, '打开'),
                h('button', { className: 'wb-button danger', type: 'button', onClick: (e) => { e.stopPropagation(); showToast('卸载功能待接入', 'info') } }, '卸载'),
              ),
            )
          }))
        }
        return h('div', null, toolbar, body)
      }

      /* ---- 我的收藏 ---- */
      function renderFav() {
        if (favorites.length === 0) {
          return h('div', { className: 'wb-empty' },
            h('span', { className: 'wb-empty-ic' }, '⭐'),
            h('b', null, '还没有收藏任何工作台'),
            h('span', null, '在市场卡片上点击「收藏」即可加入这里。'),
          )
        }
        return h('div', { className: 'wb-mkt-grid' }, favorites.map((f, i) => {
          const installed = caps.some((c) => (c.title || c.id) === f.name)
          return h('article', { key: f.market_id, className: 'wb-mkt-card', style: { animationDelay: Math.min(i * 40, 240) + 'ms' } },
            h('div', { className: 'wb-mkt-cover' }, f.icon || '📦', h('span', { className: 'cat-ribbon' }, f.category || '未分类')),
            h('div', { className: 'wb-mkt-body' },
              h('h3', null, f.name),
              h('div', { className: 'wb-mkt-author' }, '👤 ' + (f.author || '') + (f.version ? ' · ' + fmtVersion(f.version) : '')),
              h('div', { className: 'wb-mkt-desc' }, f.desc || ''),
              h('div', { className: 'wb-mkt-foot' },
                h('span', { className: 'wb-tag favorited' }, '⭐ 已收藏'),
                installed ? h('span', { className: 'wb-tag installed' }, '已安装') : null,
                h('span', { className: 'dl' }, f.added_at || ''),
              ),
              h('div', { className: 'wb-mkt-actions' },
                installed
                  ? h('button', { className: 'wb-button', type: 'button', onClick: () => showToast('已安装，可在「我的工作台」打开', 'info') }, '已安装')
                  : h('button', { className: 'wb-button primary', type: 'button', onClick: () => startInstall(f) }, '⬇ 安装'),
                h('button', { className: 'wb-button', type: 'button', onClick: () => toggleFav(f) }, '取消收藏'),
              ),
            ),
          )
        }))
      }

      /* ---- 工作台市场 ---- */
      function renderMkt() {
        const hero = h('div', { className: 'wb-mkt-hero' },
          h('h2', null, 'DSH 工作台市场'),
          h('p', null, '工作台市场源：', h('code', null, 'https://wmk.ilica.cn'), h('br', null), '按类别浏览、收藏、一键半自动安装。每 30 分钟自动同步。'),
          h('div', { className: 'wb-mkt-stats' },
            h('div', { className: 'm' }, String((marketList || []).length), h('span', null, '个可用工作台')),
            h('div', { className: 'm' }, String(marketCats.length), h('span', null, '个类别')),
            h('div', { className: 'm' }, totalDl.toLocaleString(), h('span', null, '累计下载')),
            h('div', { className: 'm' }, String(caps.length), h('span', null, '已安装')),
          ),
        )
        const cats = ['all'].concat(marketCats.map((c) => c.name))
        const chips = h('div', { className: 'wb-cat-chips' },
          cats.map((c) => h('div', { key: c, className: 'wb-cat-chip' + (marketCat === c ? ' active' : ''), onClick: () => setMarketCat(c) }, c === 'all' ? '全部' : c)),
        )
        const toolbar = h('div', { className: 'wb-toolbar' },
          h('label', { className: 'wb-search' },
            svgSearch(),
            h('input', { value: search, placeholder: '搜索名称 / 作者 / 描述', onChange: (e) => setSearch(e.target.value) }),
          ),
          h('div', { style: { flex: 1 } }),
          h('button', {
            className: 'wb-sync-btn' + (syncing ? ' busy' : ''), type: 'button',
            onClick: manualSync, disabled: syncing, title: '从 HAN 市场重新同步',
          },
            h('span', { className: 'ic', 'aria-hidden': true }, '🔄'),
            syncing ? '同步中…' : '同步市场',
          ),
          h('span', { className: 'wb-sync-time' },
            market && market.synced_at ? '上次同步 ' + fmtSyncTime(market.synced_at) : '尚未同步',
          ),
        )

        let grid
        if (filteredMkt.length === 0) {
          grid = h('div', { className: 'wb-empty' },
            h('span', { className: 'wb-empty-ic' }, '🔍'),
            h('b', null, '没有匹配的工作台'),
            h('span', null, '市场暂无工作台，或换个关键词试试。'),
          )
        } else {
          grid = h('div', { className: 'wb-mkt-grid' }, filteredMkt.map((w, i) => {
            const installed = isInstalled(w)
            const fav = isFavorited(w)
            return h('article', { key: w.id, className: 'wb-mkt-card', style: { animationDelay: Math.min(i * 40, 240) + 'ms' }, onClick: () => setModal({ type: 'detail', item: w }) },
              h('div', { className: 'wb-mkt-cover' }, w.icon || '📦', h('span', { className: 'cat-ribbon' }, w.category || '未分类')),
              h('div', { className: 'wb-mkt-body' },
                h('h3', null, w.name),
                h('div', { className: 'wb-mkt-author' }, '👤 ' + (w.author || '') + (w.version ? ' · ' + fmtVersion(w.version) : '')),
                h('div', { className: 'wb-mkt-desc' }, w.desc || w.description || ''),
                h('div', { className: 'wb-mkt-foot' },
                  installed ? h('span', { className: 'wb-tag installed' }, '已安装') : null,
                  h('span', { className: 'dl' }, '⬇ ' + (Number(w.downloads) || 0).toLocaleString()),
                ),
                h('div', { className: 'wb-mkt-actions' },
                  installed
                    ? h('button', { className: 'wb-button', type: 'button', onClick: (e) => { e.stopPropagation(); showToast('已安装，可在「我的工作台」打开', 'info') } }, '已安装')
                    : h('button', { className: 'wb-button primary', type: 'button', onClick: (e) => { e.stopPropagation(); startInstall(w) } }, '⬇ 安装'),
                  h('button', { className: 'wb-button', type: 'button', onClick: (e) => { e.stopPropagation(); toggleFav(w) } }, fav ? '★ 已收藏' : '☆ 收藏'),
                ),
              ),
            )
          }))
        }
        return h('div', null, hero, chips, toolbar, grid)
      }

      /* ---- 弹窗渲染 ---- */
      function renderModal() {
        if (!modal) return null
        if (modal.type === 'detail') {
          const w = modal.item
          const installed = isInstalled(w)
          const fav = isFavorited(w)
          return h('div', { className: 'wb-modal-mask', onClick: (e) => { if (e.target === e.currentTarget) setModal(null) } },
            h('div', { className: 'wb-modal' },
              h('div', { className: 'wb-modal-head' }, h('h2', null, w.name), h('button', { className: 'close', onClick: () => setModal(null) }, '×')),
              h('div', { className: 'wb-modal-body' },
                h('div', { className: 'wb-detail-hero' },
                  h('div', { className: 'wb-dh-cover' }, w.icon || '📦'),
                  h('div', { className: 'wb-dh-info' },
                    h('h2', null, w.name),
                    h('div', { className: 'wb-dh-meta' }, '👤 ' + (w.author || '') + ' · 🏷 ' + (w.category || '') + (w.version ? ' · ' + fmtVersion(w.version) : '')),
                    h('div', { className: 'wb-dh-tags' },
                      w.category ? h('span', { className: 'wb-tag cat' }, w.category) : null,
                      installed ? h('span', { className: 'wb-tag installed' }, '已安装') : null,
                    ),
                    h('div', { style: { fontSize: 13, color: 'var(--wb-muted)' } }, w.desc || w.description || ''),
                  ),
                ),
                h('div', { className: 'wb-detail-sec' },
                  h('div', { className: 'wb-ds-t' }, '包信息'),
                  h('div', { className: 'wb-kv' },
                    h('div', { className: 'k' }, '能力 Key'), h('div', { className: 'v' }, 'cap:' + String(w.name || '').toLowerCase().replace(/[^\w]/g, '-')),
                    h('div', { className: 'k' }, '下载量'), h('div', { className: 'v' }, (Number(w.downloads) || 0).toLocaleString()),
                    h('div', { className: 'k' }, '包格式'), h('div', { className: 'v' }, 'npm .tgz'),
                    h('div', { className: 'k' }, '来源'), h('div', { className: 'v' }, 'HAN 市场 · release'),
                  ),
                ),
              ),
              h('div', { className: 'wb-modal-foot' },
                h('button', { className: 'wb-button', onClick: () => { toggleFav(w); setModal(null) } }, fav ? '★ 取消收藏' : '☆ 收藏'),
                h('button', { className: 'wb-button', onClick: () => setModal(null) }, '关闭'),
                installed
                  ? h('button', { className: 'wb-button primary', onClick: () => { setModal(null); showToast('已安装，可在「我的工作台」打开', 'info') } }, '已安装')
                  : h('button', { className: 'wb-button primary', onClick: () => { setModal(null); startInstall(w) } }, '⬇ 半自动安装'),
              ),
            ),
          )
        }
        if (modal.type === 'install') {
          const w = modal.item
          const steps = modal.steps
          const cur = modal.cur
          const status = modal.status
          return h('div', { className: 'wb-modal-mask' },
            h('div', { className: 'wb-modal lg' },
              h('div', { className: 'wb-modal-head' }, h('h2', null, '⬇ 安装「' + w.name + '」'), h('button', { className: 'close', onClick: () => setModal(null) }, '×')),
              h('div', { className: 'wb-modal-body' },
                h('div', { className: 'wb-pipeline' },
                  steps.map((s, i) => {
                    let cls = 'idle', node = String(i + 1)
                    if (status === 'done' || i < cur) { cls = 'done'; node = '✓' }
                    else if (status === 'fail' && i === cur) { cls = 'fail'; node = '✕' }
                    else if (status === 'running' && i === cur) { cls = 'doing'; node = String(i + 1) }
                    else if (status === 'running' && i < cur) { cls = 'done'; node = '✓' }
                    return h('div', { key: s.key, className: 'wb-pipe-step ' + cls },
                      h('div', { className: 'wb-pipe-node' }, node),
                      h('div', { className: 'pipe-body' },
                        h('div', { className: 'pipe-title' }, s.title),
                        h('div', { className: 'pipe-sub' }, s.desc),
                        i === cur && modal.logs && modal.logs.length ? h('div', { className: 'wb-pipe-log' }, modal.logs.map((l) => l.message).join('\n')) : null,
                      ),
                    )
                  }),
                ),
                status === 'fail' ? h('div', { className: 'wb-error', role: 'alert' }, modal.errMsg || '安装失败') : null,
              ),
              h('div', { className: 'wb-modal-foot' },
                h('div', { className: 'foot-left' }, status === 'done' ? '✓ 安装完成' : status === 'fail' ? '安装失败' : '安装中…'),
                h('button', { className: 'wb-button', onClick: () => setModal(null) }, status === 'done' ? '稍后' : '取消'),
                status === 'done'
                  ? h('button', { className: 'wb-button primary', onClick: () => confirmReload(w) }, '⚡ 重载生效')
                  : null,
              ),
            ),
          )
        }
        if (modal.type === 'reload') {
          const w = modal.item
          return h('div', { className: 'wb-modal-mask' },
            h('div', { className: 'wb-modal' },
              h('div', { className: 'wb-modal-head' }, h('h2', null, '重载生效'), h('button', { className: 'close', onClick: () => setModal(null) }, '×')),
              h('div', { className: 'wb-modal-body' },
                h('div', { style: { fontSize: 13, marginBottom: 12 } }, '安装已完成，将触发 DSH bundle 热重载（无需重启服务，不打断进行中的对话）。'),
                h('div', { style: { background: 'rgba(37,99,235,.08)', border: '1px solid var(--wb-accent)', borderRadius: 10, padding: '12px 16px', fontSize: 13 } },
                  '🔄 热重载后「', h('b', null, w.name), '」将出现在左侧导航「工作台」下方能力分组，可立即调用。'),
              ),
              h('div', { className: 'wb-modal-foot' },
                h('button', { className: 'wb-button', onClick: () => setModal(null) }, '稍后'),
                h('button', { className: 'wb-button primary', onClick: () => doReload(w) }, '⚡ 重载生效'),
              ),
            ),
          )
        }
        if (modal.type === 'maker') {
          return h('div', { className: 'wb-modal-mask' },
            h('div', { className: 'wb-modal lg' },
              h('div', { className: 'wb-modal-head' }, h('h2', null, '✨ 制作我的工作台'), h('button', { className: 'close', onClick: () => setModal(null) }, '×')),
              h('div', { className: 'wb-modal-body' },
                h('div', { className: 'wb-chat-box' },
                  modal.messages.map((m, i) => h('div', { key: i, className: 'wb-chat-msg ' + m.who },
                    h('div', { className: 'who' }, m.who === 'ai' ? '🤖' : '👤'),
                    h('div', { className: 'bubble' }, m.text),
                  )),
                ),
                h('div', { className: 'wb-opt-chips' },
                  ['📝 写周报', '📅 排日程', '📊 数据看板', '🧠 知识问答'].map((o) => h('div', { key: o, className: 'wb-opt-chip', onClick: () => sendMakerMsg(o) }, o)),
                ),
                h('div', { className: 'wb-chat-input-row' },
                  h('label', { className: 'wb-search' }, h('input', { id: 'wb-maker-input', placeholder: '描述你的工作台，或点击上方快捷选项…' })),
                  h('button', { className: 'wb-button primary', disabled: modal.busy, onClick: () => {
                    const el = document.getElementById('wb-maker-input')
                    const v = el && el.value ? el.value.trim() : ''
                    if (v) { if (el) el.value = ''; sendMakerMsg(v) }
                  } }, modal.busy ? '生成中…' : '发送'),
                ),
              ),
            ),
          )
        }
        return null
      }

      return h('div', { className: 'wb-root' },
        error ? h('div', { className: 'wb-error', role: 'alert' }, error) : null,
        h('section', { className: 'wb-hero' },
          h('span', { className: 'wb-glow a', 'aria-hidden': true }),
          h('span', { className: 'wb-glow b', 'aria-hidden': true }),
          h('div', { className: 'wb-hero-in' },
            h('div', { style: { minWidth: 0, flex: '1 1 420px' } },
              h('span', { className: 'wb-eyebrow' },
                h('span', { className: 'wb-ping', 'aria-hidden': true }, h('i'), h('b')),
                'YOUR WORKSPACE · CAPABILITIES',
              ),
              h('h2', null, '工作台',
                h('span', { className: 'wb-tag' }, '即时热插拔'),
              ),
              h('p', null, '把高频核心场景能力放在手边。已安装能力常驻显示在左侧导航「工作台」下方，支持折叠与拖拽排序，随时调用。'),
            ),
          ),
        ),
        zoneTabs(),
        zone === 'mine' ? renderMine() : zone === 'fav' ? renderFav() : renderMkt(),
        h('div', { className: 'wb-footer' },
          h('span', { className: 'wb-bulb', 'aria-hidden': true }, svgBulb()),
          h('div', null,
            h('b', null, '配置规则提示'),
            h('div', null, '已安装能力常驻左侧导航「工作台」下方，支持折叠与拖拽排序。新增能力包请前往「插件」统一管理，或通过市场安装。'),
          ),
        ),
        h('div', { className: 'wb-toasts', role: 'status' },
          toasts.map((t) => h('div', { key: t.id, className: 'wb-toast' + (t.type === 'success' ? ' success' : '') + (t.out ? ' out' : '') },
            t.type === 'success' ? svgCheck() : svgSparkle(),
            h('span', null, t.message),
          )),
        ),
        renderModal(),
      )
    }

    function installSteps() {
      return [
        { key: 'download', title: '下载', desc: '从 HAN 下载 release 包' },
        { key: 'extract', title: '解包', desc: '解压 .tgz 到 bundle 目录' },
        { key: 'inject', title: '注入', desc: 'package.json 依赖 + cordis.patch.yml bundle 声明' },
        { key: 'deps', title: '安装依赖', desc: '检查依赖齐全' },
        { key: 'smoke', title: '自测', desc: '运行 scripts/smoke.mjs + 结构检查' },
        { key: 'verify', title: '依赖完整性校验', desc: '核对模块是否在 node_modules' },
        { key: 'record', title: '更新能力清单', desc: '写入 capabilities.json' },
      ]
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
