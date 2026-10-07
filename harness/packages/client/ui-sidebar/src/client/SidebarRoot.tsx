/**
 * Sidebar shell: column geometry and global panel navigation.
 * Collapse is a slide plus crossfade:
 * content freezes at its expanded width (inline style) and fades out in place
 * while the sliding column (AppFrame grid tracks) clips it — nothing reflows
 * mid-slide. At settle the wide-only content unmounts and the upper
 * controls enter the 56px rail from the same horizontal offset (one icon each,
 * same top-down order) on one fade that ends with the slide. The bottom-pinned
 * settings control only fades. The workspace/session browsing region between
 * global panel rows and the foot is the `sidebar.workspaces` registrant's,
 * and the foot holds `sidebar.settings` plus `sidebar.footer.action`; the shell
 * hands them the wide flag (plus an expand request callback for the browser).
 *
 * The column also owns whether the scroll regions nested in it draw a
 * scrollbar at all: the shell tracks the pointer and rebinds ui-theme's
 * scrollbar indirection away while it is elsewhere, so a list the user is not
 * pointing at carries no bar.
 */
import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import clsx from 'clsx'
import {
  FishLogo, IconNewChatOutlineMedium, IconNewChatOutlineRegular, IconPanelLeftOutlineRegular, isDarwinDesktop, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  SidebarPanelMetadata, SidebarRootComponentProps, SidebarRootInjected, SidebarSectionOwnerProps,
} from './contract/slots.ts'
import css from './SidebarRoot.module.css'

/** Wide-content unmount delay; matches the 150ms wide-content fade-out. */
const COLLAPSE_SETTLE_MS = 150

/**
 * How long the column's scrollbars stay drawn after the pointer leaves it.
 * The bar is a pointer affordance here, and hiding it on the leave event
 * itself makes it blink out while the pointer is only crossing the column's
 * edge — on the way to the conversation, or around a portalled menu.
 */
const SCROLLBAR_LINGER_MS = 2000

/** Capability navigation is scoped to the signed-in browser user, not a session. */
function capabilityUserNamespace(): string {
  const user = document.cookie.match(/(?:^|;\s*)dsh_mu_user=([^;]*)/)
  let name = ''
  try { name = decodeURIComponent(user?.[1] ?? '') } catch { /* invalid cookie */ }
  return /^[A-Za-z0-9_-]{1,64}$/.test(name) ? `${name}.` : ''
}
function capabilityNavKey(): string { return `dsh.sidebar.capabilities.${capabilityUserNamespace()}v1` }
function loadedCapabilityKey(): string { return `dsh.workbench.loaded.${capabilityUserNamespace()}v1` }
function readLoadedCapabilities(): Record<string, boolean> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(loadedCapabilityKey()) ?? '{}')
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, boolean>
  } catch { /* storage unavailable or malformed */ }
  return {}
}

interface CapabilityNavState { expanded: boolean; order: string[] }
function readCapabilityNav(): CapabilityNavState {
  try {
    const saved = JSON.parse(window.localStorage.getItem(capabilityNavKey()) ?? '{}') as Partial<CapabilityNavState>
    return {
      expanded: saved.expanded !== false,
      order: Array.isArray(saved.order) ? saved.order.filter((id): id is string => typeof id === 'string' && id.startsWith('cap:')) : [],
    }
  } catch {
    return { expanded: true, order: [] }
  }
}

/** Format complete-build metadata for the local brand badge. */
function localBuildVersion(): string | undefined {
  const version = process.env.DSH_CLIENT_VERSION
  if (version === undefined) return undefined
  const commit = process.env.DSH_CLIENT_COMMIT_HASH
  return version
    + (commit === undefined ? '' : `-${commit}`)
    + (process.env.DSH_CLIENT_GIT_DIRTY === 'true' ? '-dirty' : '')
}

type PanelRowProps =
  Pick<SidebarPanelMetadata, 'id' | 'label'>
  & Pick<SidebarSectionOwnerProps, 'wide'>
  & Pick<PropsRuntime<'sidebar'>, 'usePanelInfo'>
  & Pick<InjectFace<SidebarRootInjected>, 'selectPanel'>
  & PropsRenderSlots<'sidebar.panellist'>
  & { capability?: boolean }

/** Each panel row subscribes only to its own selection state. */
function PanelRow({ id, label, wide, usePanelInfo, selectPanel, renderSlot, capability = false }: PanelRowProps) {
  const active = usePanelInfo(info => info.activePanelId === id)
  return (
    <Tooltip label={label} delayMs={500} disabled={wide}>
      <button
        type="button"
        className={clsx(css.panelRow, capability && css.capabilityRow, active && css.panelActive)}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        onClick={() => { selectPanel(id) }}
      >
        <span className={css.panelGlyph} aria-hidden="true">
          {renderSlot('sidebar.panellist', { size: wide ? 16 : 18, active }, { only: id })}
        </span>
        {wide && (
          <span className={clsx(css.panelTitle, css.wide)}>
            {label}
          </span>
        )}
      </button>
    </Tooltip>
  )
}

/**
 * Render the sidebar column shell.
 * @param props - composed slot props (runtime share + injected callbacks, contract/slots.ts).
 * @returns the sidebar element tree.
 */
export function SidebarRoot({
  collapsed,
  width,
  startSession,
  toggleSidebar,
  selectPanel,
  usePanels,
  usePanelInfo,
  t,
  renderSlot,
}: SidebarRootComponentProps) {
  const panels = usePanels(snapshot => snapshot)
  const [capabilityNav, setCapabilityNav] = useState(readCapabilityNav)
  const [loadedCapabilities, setLoadedCapabilities] = useState(readLoadedCapabilities)
  const [draggedCapability, setDraggedCapability] = useState<string | null>(null)
  const [dropCapability, setDropCapability] = useState<string | null>(null)
  const capabilities = panels.filter(panel => panel.id.startsWith('cap:') && loadedCapabilities[panel.id.slice(4)] !== false)
  const capabilityIndex = new Map(capabilityNav.order.map((id, index) => [id, index]))
  const sortedCapabilities = [...capabilities].sort((left, right) => {
    const a = capabilityIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER
    const b = capabilityIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER
    return a - b
  })
  const hasPlugins = panels.some(panel => panel.id === 'plugins')
  const normalPanels = hasPlugins ? panels.filter(panel => !panel.id.startsWith('cap:')) : panels
  const updateCapabilityNav = (next: CapabilityNavState): void => {
    setCapabilityNav(next)
    try { window.localStorage.setItem(capabilityNavKey(), JSON.stringify(next)) } catch { /* storage disabled */ }
  }
  const reorderCapability = (source: string, target: string): void => {
    if (source === target) return
    const ids: string[] = sortedCapabilities.map(item => item.id)
    const from = ids.indexOf(source)
    const to = ids.indexOf(target)
    if (from < 0 || to < 0) return
    ids.splice(from, 1)
    ids.splice(to, 0, source)
    updateCapabilityNav({ ...capabilityNav, order: ids })
  }
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key === capabilityNavKey()) setCapabilityNav(readCapabilityNav())
      if (event.key === loadedCapabilityKey()) setLoadedCapabilities(readLoadedCapabilities())
    }
    const onLoadedChange = (): void => { setLoadedCapabilities(readLoadedCapabilities()) }
    window.addEventListener('storage', onStorage)
    window.addEventListener('dsh:workbench-capabilities-change', onLoadedChange)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('dsh:workbench-capabilities-change', onLoadedChange)
    }
  }, [])
  // Wide content stays mounted while the collapse animates (fading via
  // .collapsed .wide), unmounts at settle, and remounts right away on expand.
  const [settled, setSettled] = useState(collapsed)
  useEffect(() => {
    if (!collapsed) { setSettled(false); return }
    const timer = window.setTimeout(() => { setSettled(true) }, COLLAPSE_SETTLE_MS)
    return () => { window.clearTimeout(timer) }
  }, [collapsed])
  const windowsTitlebar = document.documentElement.hasAttribute('data-windows-titlebar')
  const wide = windowsTitlebar ? !collapsed : !collapsed || !settled
  // The Windows caption menus occupy the strip to the right of these controls
  // (that is what --dsh-windows-menu-start reserves), so a right-side bubble
  // lands under their text. Below the caption is the only clear side.
  const captionTooltipSide = windowsTitlebar ? 'bottom' : 'right'

  // Freeze the content at its expanded width while it fades out (collapsed
  // && wide): the sliding column then clips it instead of reflowing it. The
  // rail layout (.collapsed styles) only applies once the fade settles.
  const lastWideWidth = useRef(width)
  if (!collapsed) lastWideWidth.current = width

  // Rail-in only crossfades a live collapse: a refresh straight into the
  // collapsed state renders the rail statically (no delay-hidden icons).
  const everWide = useRef(!collapsed)
  if (!collapsed) everWide.current = true

  // Scrollbars in the column follow the pointer (.quietBars rebinds them
  // away): drawn while it is inside, and for SCROLLBAR_LINGER_MS after it
  // leaves. A pointer that returns within that window cancels the pending
  // hide rather than restarting from a hidden bar.
  const column = useRef<HTMLDivElement>(null)
  const [pointerInside, setPointerInside] = useState(false)
  const lingerTimer = useRef<number | undefined>(undefined)
  const armLinger = (): void => {
    if (lingerTimer.current !== undefined) return
    lingerTimer.current = window.setTimeout(() => {
      lingerTimer.current = undefined
      setPointerInside(false)
    }, SCROLLBAR_LINGER_MS)
  }
  const cancelLinger = (): void => {
    window.clearTimeout(lingerTimer.current)
    lingerTimer.current = undefined
  }
  // Leaving is decided by the column's BOX, not by DOM containment, and only
  // while the bars are drawn. ui-settings renders its full-viewport panel as a
  // fixed-position DESCENDANT of this column, so a pointer moved onto that
  // panel — or onto the conversation once it closes — fires no `pointerleave`
  // here, and the bars would stay drawn over a column nobody is pointing at.
  // The element's own leave stays as the one signal geometry cannot give: a
  // pointer that leaves the window emits no further moves.
  useEffect(() => {
    if (!pointerInside) return
    const onMove = (event: PointerEvent): void => {
      const rect = column.current?.getBoundingClientRect()
      /* v8 ignore next -- the listener only exists while the column is mounted and revealed. */
      if (rect === undefined) return
      const inside = event.clientX >= rect.left && event.clientX < rect.right
        && event.clientY >= rect.top && event.clientY < rect.bottom
      if (inside) cancelLinger()
      else armLinger()
    }
    document.addEventListener('pointermove', onMove)
    return () => {
      document.removeEventListener('pointermove', onMove)
      cancelLinger()
    }
  }, [pointerInside])

  const buildVersion = localBuildVersion()

  const darwinDesktop = isDarwinDesktop()
  // Rail resting state is the whale mark; hovering swaps in the panel icon
  // (the expand affordance, figma sidebar-hover flow). Expanded it is a plain
  // panel icon.
  const toggle = (
    <Tooltip label={collapsed ? t('toggle.open') : t('toggle.collapse')} delayMs={500} side={captionTooltipSide}>
      <button
        type="button"
        className={clsx(css.iconButton, css.toggle)}
        aria-label={collapsed ? t('toggle.open') : t('toggle.collapse')}
        onClick={() => { toggleSidebar() }}
      >
        {!wide && !windowsTitlebar && (
          <span className={css.railMark} aria-hidden="true">
            {renderSlot('sidebar.brand.mark', { size: 24 }, { fallback: <FishLogo size={24} /> })}
          </span>
        )}
        {/* Rail icons render at 18 (figma rail spec); expanded keeps the glyph-native sizes. */}
        <IconPanelLeftOutlineRegular className={css.panelIcon} size={wide || windowsTitlebar ? 16 : 18} />
        {!wide && renderSlot('sidebar.toggle.badge', {})}
      </button>
    </Tooltip>
  )

  return (
    <div
      ref={column}
      className={clsx(
        css.root, !wide && css.collapsed, !wide && everWide.current && css.railIn,
        collapsed && wide && css.fading, !pointerInside && css.quietBars,
      )}
      style={wide ? { width: collapsed ? lastWideWidth.current : width } : undefined}
      onPointerEnter={() => {
        cancelLinger()
        setPointerInside(true)
      }}
      onPointerLeave={() => { armLinger() }}
    >
      {/* macOS hiddenInset titlebar: the strip shares the row with the
          traffic lights and keeps the toggle at the sidebar's top-right. */}
      {darwinDesktop && <div className={css.topStrip}>{toggle}</div>}
      <div className={css.logoRow}>
        {/* Expanded, the brand doubles as a New Session shortcut — except on
            macOS, where it stays part of the logo row's window-drag surface
            (a button would subtract itself through the global no-drag rule);
            the collapsed rail's logo is the expand toggle below instead. */}
        {wide && (() => {
          const identity = (
            <span className={css.brandIdentity} aria-hidden="true">
              <span className={css.brandMark}>
                {renderSlot('sidebar.brand.mark', { size: 24 }, { fallback: <FishLogo size={24} /> })}
              </span>
              <span className={css.brandName}>
                {renderSlot('sidebar.brand.name', {}, {
                  fallback: buildVersion === undefined
                    ? <span className={css.fallbackBrandName}>{t('brand.localBuild')}</span>
                    : (
                      <span className={css.localBuildBrand}>
                        <span className={css.localBuildTitle}>{t('brand.localBuild')}</span>
                        <span className={css.buildVersion}>{buildVersion}</span>
                      </span>
                    ),
                })}
              </span>
            </span>
          )
          return darwinDesktop
            ? <span className={clsx(css.brand, css.wide)}>{identity}</span>
            : (
              <button
                type="button"
                className={clsx(css.brand, css.wide)}
                aria-label={t('session.new.label')}
                onClick={() => { startSession() }}
              >
                {identity}
              </button>
            )
        })()}
        {!darwinDesktop && toggle}
      </div>

      {/* Expanded, the button carries its own label — tooltip only on the rail. */}
      <Tooltip label={t('session.new.label')} delayMs={500} disabled={wide} side={captionTooltipSide}>
        <button
          type="button"
          className={css.newSession}
          aria-label={t('session.new.label')}
          onClick={() => { startSession() }}
        >
          {/* The rail draws Regular: Medium's 1.3px stroke scaled to the rail's
              larger glyph reads visibly heavier than the neighboring 1px icons. */}
          {wide
            ? <IconNewChatOutlineMedium size={14} />
            : <IconNewChatOutlineRegular size={windowsTitlebar ? 16 : 18} />}
          {wide && <span className={clsx(css.newSessionLabel, css.wide)}>{t('session.new')}</span>}
        </button>
      </Tooltip>

      {panels.length > 0 && (
        <nav className={css.panelList} aria-label={t('panels.label')}>
          {normalPanels.map(({ id, label }) => (
            <div key={id} className={css.panelGroup}>
              <div className={css.panelGroupHead}>
                <PanelRow
                  id={id}
                  label={label}
                  wide={wide}
                  usePanelInfo={usePanelInfo}
                  selectPanel={selectPanel}
                  renderSlot={renderSlot}
                />
                {id === 'workbench' && wide && sortedCapabilities.length > 0 && (
                  <button
                    type="button"
                    className={css.capabilityToggle}
                    aria-label={capabilityNav.expanded ? '收起能力包' : '展开能力包'}
                    aria-expanded={capabilityNav.expanded}
                    onClick={() => { updateCapabilityNav({ ...capabilityNav, expanded: !capabilityNav.expanded }) }}
                  >{capabilityNav.expanded ? '⌄' : '›'}</button>
                )}
              </div>
              {id === 'workbench' && (capabilityNav.expanded || !wide) && sortedCapabilities.length > 0 && (
                <div className={css.capabilityList} aria-label="已加载能力包">
                  {sortedCapabilities.map(capability => (
                    <div
                      key={capability.id}
                      className={clsx(css.capabilityItem, dropCapability === capability.id && css.capabilityDrop)}
                      draggable={wide}
                      onDragStart={(event: DragEvent<HTMLDivElement>) => {
                        setDraggedCapability(capability.id)
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', capability.id)
                      }}
                      onDragOver={(event: DragEvent<HTMLDivElement>) => {
                        if (!draggedCapability || draggedCapability === capability.id) return
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                        setDropCapability(capability.id)
                      }}
                      onDrop={(event: DragEvent<HTMLDivElement>) => {
                        event.preventDefault()
                        const source = draggedCapability ?? event.dataTransfer.getData('text/plain')
                        reorderCapability(source, capability.id)
                        setDraggedCapability(null)
                        setDropCapability(null)
                      }}
                      onDragEnd={() => { setDraggedCapability(null); setDropCapability(null) }}
                    >
                      <PanelRow
                        id={capability.id}
                        label={capability.label}
                        wide={wide}
                        capability
                        usePanelInfo={usePanelInfo}
                        selectPanel={selectPanel}
                        renderSlot={renderSlot}
                      />
                      {wide && <span className={css.capabilityGrip} aria-hidden="true">⋮⋮</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* The browsing region fills the column between the controls and the
          foot in both states; its rail icon column rides the same slot. */}
      <div className={css.regionArea}>
        {renderSlot('sidebar.workspaces', {
          wide,
          expandSidebar: () => { if (collapsed) toggleSidebar() },
        })}
      </div>

      {/* Footer actions stack above Settings in both sidebar widths. */}
      <div className={css.footArea}>
        <div className={css.footerActions}>
          {renderSlot('sidebar.footer.action', { wide })}
        </div>
        <div className={css.settingsArea}>
          {renderSlot('sidebar.settings', { wide })}
        </div>
      </div>
    </div>
  )
}
