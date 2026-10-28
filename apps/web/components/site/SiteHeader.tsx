'use client'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ArrowUpRight, ChevronDown, Cpu, Download, Feather, Menu, Palette, Plug, Search, Smartphone, X } from 'lucide-react'
import { useSearchContext } from 'fumadocs-ui/contexts/search'
import { manifest, type ManifestEntry } from '@ondai/registry/manifest'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { SmoothScroll } from './SmoothScroll'
import { gitConfig } from '@/lib/shared'
import './nav.css'

/**
 * The floating capsule: logo, Docs, Components, Playground, Themes, then Search (Fumadocs dialog, which
 * binds ⌘K), GitHub and the theme toggle. One highlight springs between items under the pointer.
 *
 * Docs, Components and Playground share ONE dropdown (the Stripe / Vercel morphing menu). The panel stays
 * mounted while the pointer moves between triggers: its x, width and height spring to fit the next
 * content, a caret slides to the trigger, and the contents cross-fade while sliding in the direction of
 * travel (each content sits left or right of the active one by its order, so direction falls out of it).
 * Opening from closed snaps the geometry first and only fades the panel in, so it never flies in.
 *
 * Mouse: hover intent (open on enter, close 150 ms after leaving trigger and panel). Touch and keyboard:
 * click toggles; ArrowDown or Tab moves into the panel; Escape closes and returns focus. Route change
 * closes. Below 1024 px: logo, search, theme, menu button and a full-screen sheet.
 * Renders `<SmoothScroll />` so every page with the nav gets the wheel lerp.
 */

const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`
const SHEET_ID = 'site-menu'
const CLOSE_DELAY = 150
const EDGE = 12
const thumb = (name: string) => `/thumbs/${name}.png`

type MenuId = 'docs' | 'components' | 'playground'
const MENUS: MenuId[] = ['docs', 'components', 'playground']
const MENU_LABEL: Record<MenuId, string> = { docs: 'Docs', components: 'Components', playground: 'Playground' }
const menuDomId = (id: MenuId) => `nav-menu-${id}`

// Same order as the docs sidebar (content/docs/components/meta.json).
const ORDER = [
  'command-bar', 'smart-input', 'scan-to-data', 'summarize', 'rewrite', 'smart-reply', 'auto-tag', 'semantic-search', 'natural-filter', 'tool-confirm-card', 'voice-input',
  'availability-gate', 'on-device-badge', 'ion-border', 'streaming-text', 'thinking-indicator', 'skeleton', 'key-hint', 'latency-chip', 'model-download', 'chip', 'button', 'sheet', 'field', 'agent-avatar', 'image-reveal',
]
const rank = (name: string) => {
  const i = ORDER.indexOf(name)
  return i === -1 ? ORDER.length : i
}
const components = manifest.filter((m) => m.hasPlayground).sort((a, b) => rank(a.name) - rank(b.name))
const features = components.filter((m) => m.category !== 'primitive')
const primitives = components.filter((m) => m.category === 'primitive')
const byName = new Map(components.map((m) => [m.name, m] as const))
const CATEGORY: Record<string, string> = { agentic: 'Agent', input: 'Input', vision: 'Vision', text: 'Text', search: 'Search', organize: 'Organize', voice: 'Voice', primitive: 'Primitive' }
const DEFAULT_PREVIEW = features[0]?.name ?? 'command-bar'
const componentsHref = `/docs/components/${DEFAULT_PREVIEW}`

const DOCS = [
  { href: '/docs/installation', title: 'Installation', line: 'Add Ondai to an Expo app.', Icon: Download },
  { href: '/docs/core', title: 'Core', line: 'Router, hooks, availability.', Icon: Cpu },
  { href: '/docs/providers', title: 'Providers', line: 'Apple, Gemini Nano, llama.rn.', Icon: Plug },
  { href: '/docs/theming', title: 'Theming', line: 'Void, Paper, Glass, your accent.', Icon: Palette },
  { href: '/docs/device-support', title: 'Device support', line: 'Which phones ship a model.', Icon: Smartphone },
  { href: '/docs/small-models', title: 'Small models', line: 'Built for 3B and 4K context.', Icon: Feather },
]

const PLAY = [
  { name: 'command-bar', line: 'Say it, the app does it.' },
  { name: 'smart-reply', line: 'Three replies, one tap.' },
  { name: 'voice-input', line: 'Talk. It types, offline.' },
]

type Section = 'docs' | 'components' | 'playground' | 'themes' | null
function sectionOf(pathname: string): Section {
  if (pathname.startsWith('/docs/components')) return 'components'
  if (pathname.startsWith('/docs')) return 'docs'
  if (pathname.startsWith('/playground')) return 'playground'
  if (pathname.startsWith('/themes')) return 'themes'
  return null
}

function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

/** A dark render in a dark frame: intentional in light mode, native in dark. */
function Thumb({ name, zoom = false, className }: { name: string; zoom?: boolean; className?: string }) {
  return (
    <span className={`nav-thumb${zoom ? ' nav-thumb-zoom' : ''}${className ? ` ${className}` : ''}`}>
      <img src={thumb(name)} alt="" loading="lazy" decoding="async" draggable={false} />
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Highlight: one capsule-relative pill that springs between items.     */
/* ------------------------------------------------------------------ */
interface Glow {
  x: number
  w: number
  visible: boolean
  instant: boolean
}
function useGlow(host: React.RefObject<HTMLElement | null>) {
  const [glow, setGlow] = useState<Glow>({ x: 0, w: 0, visible: false, instant: true })
  const visible = useRef(false)
  const move = useCallback(
    (el: HTMLElement | null) => {
      const h = host.current
      if (!el || !h) return
      const x = el.getBoundingClientRect().left - h.getBoundingClientRect().left
      const w = el.offsetWidth
      if (visible.current) {
        setGlow({ x, w, visible: true, instant: false })
        return
      }
      visible.current = true
      setGlow({ x, w, visible: true, instant: true })
      requestAnimationFrame(() => requestAnimationFrame(() => setGlow((g) => (g.instant ? { ...g, instant: false } : g))))
    },
    [host],
  )
  const hide = useCallback(() => {
    visible.current = false
    setGlow((g) => (g.visible ? { ...g, visible: false } : g))
  }, [])
  return { glow, move, hide }
}

/* ------------------------------------------------------------------ */
/* Components preview: two stacked images that cross-fade on hover.      */
/* ------------------------------------------------------------------ */
interface Layers {
  a: string
  b: string
  front: 'a' | 'b'
}
function usePreview() {
  const [layers, setLayers] = useState<Layers>({ a: DEFAULT_PREVIEW, b: DEFAULT_PREVIEW, front: 'a' })
  const wanted = useRef(DEFAULT_PREVIEW)
  const show = useCallback((name: string) => {
    if (wanted.current === name) return
    wanted.current = name
    const commit = () => {
      if (wanted.current !== name) return
      setLayers((l) => {
        if ((l.front === 'a' ? l.a : l.b) === name) return l
        return l.front === 'a' ? { ...l, b: name, front: 'b' } : { ...l, a: name, front: 'a' }
      })
    }
    const img = new Image()
    img.onload = commit
    img.onerror = commit
    img.src = thumb(name)
    if (img.complete && img.naturalWidth > 0) commit()
  }, [])
  const shown = layers.front === 'a' ? layers.a : layers.b
  return { layers, shown, show }
}

/* ------------------------------------------------------------------ */
/* Panel contents                                                       */
/* ------------------------------------------------------------------ */
function ComponentsMenu({ onNavigate }: { onNavigate: () => void }) {
  const { layers, shown, show } = usePreview()
  const current: ManifestEntry | undefined = byName.get(shown)
  const variantGroup = current ? Object.entries(current.variants)[0] : undefined
  return (
    <div className="mm-components">
      <div className="mm-col">
        <p className="mm-heading">Features</p>
        <ul className="mm-feats">
          {features.map((m) => (
            <li key={m.name}>
              <Link
                href={`/docs/components/${m.name}`}
                className="mm-feat"
                data-hot={shown === m.name}
                onPointerEnter={() => show(m.name)}
                onFocus={() => show(m.name)}
                onClick={onNavigate}
              >
                <Thumb name={m.name} zoom />
                <span className="mm-feat-text">
                  <span className="mm-title">{m.title}</span>
                  <span className="mm-sub">{CATEGORY[m.category] ?? m.category}</span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={componentsHref} className="mm-feat mm-feat-all" onClick={onNavigate}>
              <span className="mm-feat-all-icon" aria-hidden="true">
                <ArrowRight size={15} />
              </span>
              <span className="mm-feat-text">
                <span className="mm-title">All components</span>
                <span className="mm-sub">{components.length} and counting</span>
              </span>
            </Link>
          </li>
        </ul>
        <p className="mm-heading">Primitives</p>
        <ul className="mm-prims">
          {primitives.map((m) => (
            <li key={m.name}>
              <Link
                href={`/docs/components/${m.name}`}
                className="mm-prim"
                data-hot={shown === m.name}
                onPointerEnter={() => show(m.name)}
                onFocus={() => show(m.name)}
                onClick={onNavigate}
              >
                {m.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="mm-preview">
        <span className="nav-thumb mm-preview-media">
          <img src={thumb(layers.a)} alt="" data-front={layers.front === 'a'} draggable={false} />
          <img src={thumb(layers.b)} alt="" data-front={layers.front === 'b'} draggable={false} />
        </span>
        <div className="mm-preview-text" key={shown}>
          <p className="mm-preview-title">
            {current?.title ?? shown}
            <span className="mm-tag">{CATEGORY[current?.category ?? ''] ?? ''}</span>
          </p>
          <p className="mm-preview-desc">{current?.description}</p>
          {variantGroup ? (
            <ul className="mm-variants" aria-label={`${variantGroup[0]} options`}>
              {variantGroup[1].slice(0, 5).map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="mm-preview-actions">
          <Link href={`/playground/${shown}`} className="mm-cta" onClick={onNavigate}>
            Try it live
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <Link href={`/docs/components/${shown}`} className="mm-ghost" onClick={onNavigate}>
            Docs
          </Link>
        </div>
      </div>
    </div>
  )
}

function DocsMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mm-docs">
      <ul className="mm-docs-grid">
        {DOCS.map(({ href, title, line, Icon }) => (
          <li key={href}>
            <Link href={href} className="mm-doc" onClick={onNavigate}>
              <span className="mm-doc-icon" aria-hidden="true">
                <Icon size={17} strokeWidth={1.75} />
              </span>
              <span className="mm-feat-text">
                <span className="mm-title">{title}</span>
                <span className="mm-sub">{line}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mm-foot">
        <code className="mm-cmd">
          <span aria-hidden="true">$ </span>npx ondai init
        </code>
        <Link href="/docs" className="mm-cta" onClick={onNavigate}>
          Read the docs
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function PlaygroundMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mm-play">
      <ul className="mm-play-grid">
        {PLAY.map(({ name, line }) => (
          <li key={name}>
            <Link href={`/playground/${name}`} className="mm-play-card" onClick={onNavigate}>
              <Thumb name={name} />
              <span className="mm-title">{byName.get(name)?.title ?? name}</span>
              <span className="mm-sub">{line}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mm-foot">
        <span className="mm-foot-note">Every prop, live in the browser.</span>
        <Link href="/playground" className="mm-cta" onClick={onNavigate}>
          Open the playground
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Header                                                               */
/* ------------------------------------------------------------------ */
interface Geo {
  x: number
  w: number
  h: number
  caret: number
}

export function SiteHeader() {
  const pathname = usePathname()
  const section = sectionOf(pathname)
  const search = useSearchContext()
  const [scrolled, setScrolled] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Which menu is open, which one the panel shows (kept while it fades out), and its geometry.
  const [open, setOpen] = useState<MenuId | null>(null)
  const [shown, setShown] = useState<MenuId>('components')
  const [geo, setGeo] = useState<Geo>({ x: 0, w: 0, h: 0, caret: 0 })
  const [instant, setInstant] = useState(true)

  const capsuleRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef<Record<MenuId, HTMLButtonElement | null>>({ docs: null, components: null, playground: null })
  const contentRefs = useRef<Record<MenuId, HTMLDivElement | null>>({ docs: null, components: null, playground: null })
  const closeTimer = useRef<number | null>(null)
  const pointerType = useRef<string>('mouse')
  const openRef = useRef<MenuId | null>(null)
  const { glow, move: moveGlow, hide: hideGlow } = useGlow(capsuleRef)

  /** Panel geometry for a menu: centred under its trigger, clamped to the viewport, caret on the trigger. */
  const measure = useCallback((id: MenuId): Geo | null => {
    const t = triggerRefs.current[id]
    const c = contentRefs.current[id]
    if (!t || !c) return null
    const r = t.getBoundingClientRect()
    const w = c.offsetWidth
    const h = c.offsetHeight
    const centre = r.left + r.width / 2
    const x = Math.round(Math.max(EDGE, Math.min(window.innerWidth - EDGE - w, centre - w / 2)))
    return { x, w, h, caret: Math.round(centre - x) }
  }, [])

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const openMenu = useCallback(
    (id: MenuId) => {
      clearCloseTimer()
      const g = measure(id)
      if (g) setGeo(g)
      if (openRef.current === null) {
        // From closed: place the panel without animating, then let the next move morph.
        setInstant(true)
        requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)))
      }
      openRef.current = id
      setShown(id)
      setOpen(id)
    },
    [clearCloseTimer, measure],
  )
  const closeMenu = useCallback(() => {
    clearCloseTimer()
    openRef.current = null
    setOpen(null)
  }, [clearCloseTimer])
  const closeSoon = useCallback(() => {
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => {
      openRef.current = null
      setOpen(null)
    }, CLOSE_DELAY)
  }, [clearCloseTimer])
  const closeAll = useCallback(() => {
    closeMenu()
    setSheetOpen(false)
  }, [closeMenu])

  const focusables = (id: MenuId) => Array.from(contentRefs.current[id]?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
  const focusInto = useCallback((id: MenuId) => {
    requestAnimationFrame(() => focusables(id)[0]?.focus())
  }, [])

  // Keep the open panel fitted when its content or the viewport changes size.
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      const id = openRef.current
      if (!id) return
      const g = measure(id)
      if (g) setGeo((p) => (p.x === g.x && p.w === g.w && p.h === g.h && p.caret === g.caret ? p : g))
    })
    for (const id of MENUS) {
      const c = contentRefs.current[id]
      if (c) ro.observe(c)
    }
    const onResize = () => {
      const id = openRef.current
      if (id) {
        const g = measure(id)
        if (g) setGeo(g)
      }
    }
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [measure])

  // Slightly denser glass once the page has scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Route change closes everything.
  useEffect(() => {
    closeAll()
  }, [pathname, closeAll])

  // Escape closes; focus returns to the trigger when it was inside the panel.
  useEffect(() => {
    if (!open && !sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (open) {
        const t = triggerRefs.current[open]
        if (panelRef.current?.contains(document.activeElement) || document.activeElement === t) t?.focus()
      }
      closeAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, sheetOpen, closeAll])

  // Pointer down outside the capsule and the panel closes the menu.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !capsuleRef.current?.contains(t)) closeMenu()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, closeMenu])

  // The sheet locks page scroll and gives up when the viewport grows past the breakpoint.
  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (mq.matches) setSheetOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => {
      document.body.style.overflow = prev
      mq.removeEventListener('change', onChange)
    }
  }, [sheetOpen])

  useEffect(() => clearCloseTimer, [clearCloseTimer])

  // While a menu is open the highlight rests on its trigger, wherever the pointer is.
  useEffect(() => {
    if (open) moveGlow(triggerRefs.current[open])
    else if (!capsuleRef.current?.matches(':hover')) hideGlow()
  }, [open, moveGlow, hideGlow])

  /* Trigger handlers ------------------------------------------------- */
  const triggerProps = (id: MenuId) => ({
    ref: (el: HTMLButtonElement | null) => {
      triggerRefs.current[id] = el
    },
    type: 'button' as const,
    className: 'nav-item nav-trigger',
    'aria-expanded': open === id,
    'aria-controls': menuDomId(id),
    'data-active': section === id,
    onPointerDown: (e: ReactPointerEvent) => {
      pointerType.current = e.pointerType
    },
    onPointerEnter: (e: ReactPointerEvent<HTMLButtonElement>) => {
      moveGlow(e.currentTarget)
      if (e.pointerType === 'mouse') openMenu(id)
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') closeSoon()
    },
    onClick: (e: React.MouseEvent) => {
      // A mouse already opened it on hover; a click must not close it again.
      if (e.detail > 0 && pointerType.current === 'mouse') {
        openMenu(id)
        return
      }
      if (open === id) closeMenu()
      else openMenu(id)
    },
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        openMenu(id)
        focusInto(id)
      } else if (e.key === 'Tab' && !e.shiftKey && open === id) {
        e.preventDefault()
        focusInto(id)
      }
    },
  })

  /** Tab off either end of the panel goes back into the bar in reading order. */
  const onPanelKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab' || !open) return
    const list = focusables(open)
    if (!list.length) return
    const trigger = triggerRefs.current[open]
    if (e.shiftKey && document.activeElement === list[0]) {
      e.preventDefault()
      trigger?.focus()
    } else if (!e.shiftKey && document.activeElement === list[list.length - 1]) {
      e.preventDefault()
      const items = Array.from(capsuleRef.current?.querySelectorAll<HTMLElement>('.nav-links .nav-item') ?? [])
      const next = items[items.indexOf(trigger as HTMLElement) + 1]
      closeMenu()
      next?.focus()
    }
  }
  const onPanelBlur = (e: ReactFocusEvent) => {
    const next = e.relatedTarget as Node | null
    if (next && !panelRef.current?.contains(next) && !Object.values(triggerRefs.current).includes(next as HTMLButtonElement)) closeMenu()
  }

  const shownIndex = MENUS.indexOf(shown)
  const panelStyle = {
    '--mm-x': `${geo.x}px`,
    '--mm-w': `${geo.w}px`,
    '--mm-h': `${geo.h}px`,
    '--mm-caret': `${geo.caret}px`,
  } as CSSProperties
  const glowStyle: CSSProperties = { transform: `translateX(${glow.x}px)`, width: glow.w }

  const contents: Record<MenuId, ReactNode> = {
    docs: <DocsMenu onNavigate={closeAll} />,
    components: <ComponentsMenu onNavigate={closeAll} />,
    playground: <PlaygroundMenu onNavigate={closeAll} />,
  }

  const sheetLinks = [
    { href: '/docs', label: 'Docs', note: 'Install, core, providers', active: section === 'docs' },
    { href: componentsHref, label: 'Components', note: `${components.length} on-device features`, active: section === 'components' },
    { href: '/playground', label: 'Playground', note: 'Every prop, live', active: section === 'playground' },
    { href: '/themes', label: 'Themes', note: 'Make it yours', active: section === 'themes' },
  ]

  return (
    <header className="nav-root">
      <SmoothScroll disabled={sheetOpen || search.open} />

      {/* Mobile sheet ---------------------------------------------------- */}
      <div id={SHEET_ID} className="nav-sheet" data-state={sheetOpen ? 'open' : 'closed'} inert={!sheetOpen}>
        <nav aria-label="Menu" className="nav-sheet-inner">
          <ul className="nav-sheet-list">
            {sheetLinks.map((l, i) => (
              <li key={l.label} style={{ '--i': i } as CSSProperties}>
                <Link href={l.href} className="nav-sheet-link" data-active={l.active} onClick={closeAll}>
                  <span className="nav-sheet-label">{l.label}</span>
                  <span className="nav-sheet-note">{l.note}</span>
                  <ArrowRight className="nav-sheet-arrow" size={20} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="nav-sheet-try" style={{ '--i': sheetLinks.length } as CSSProperties}>
            <p className="nav-sheet-kicker">Try one</p>
            <div className="nav-sheet-strip">
              {PLAY.map(({ name }) => (
                <Link key={name} href={`/playground/${name}`} className="nav-sheet-card" onClick={closeAll}>
                  <Thumb name={name} />
                  <span>{byName.get(name)?.title ?? name}</span>
                </Link>
              ))}
            </div>
          </div>
          <a href={githubUrl} target="_blank" rel="noreferrer" className="nav-sheet-gh" style={{ '--i': sheetLinks.length + 1 } as CSSProperties} onClick={closeAll}>
            <GitHubMark size={18} />
            Star on GitHub
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </nav>
      </div>

      {/* Capsule ---------------------------------------------------------- */}
      <div ref={capsuleRef} className="nav-capsule" data-scrolled={scrolled} data-sheet={sheetOpen}
        onPointerLeave={() => {
          if (openRef.current) moveGlow(triggerRefs.current[openRef.current])
          else hideGlow()
        }}
      >
        <span className="nav-glow" aria-hidden="true" style={glowStyle} data-visible={glow.visible} data-instant={glow.instant} />

        <Link href="/" className="nav-brand" onPointerEnter={(e) => moveGlow(e.currentTarget)} onClick={() => setSheetOpen(false)}>
          <Logo size={19} />
          <span className="nav-sr"> home</span>
        </Link>

        <nav className="nav-links" aria-label="Main">
          {MENUS.map((id) => (
            <button key={id} {...triggerProps(id)}>
              {MENU_LABEL[id]}
              <ChevronDown className="nav-chevron" size={13} strokeWidth={2.25} aria-hidden="true" />
            </button>
          ))}
          <Link href="/themes" className="nav-item" data-active={section === 'themes'} onPointerEnter={(e) => moveGlow(e.currentTarget)}>
            Themes
          </Link>
        </nav>

        <div className="nav-right">
          {search.enabled ? (
            <button type="button" className="nav-item nav-search" onPointerEnter={(e) => moveGlow(e.currentTarget)} onClick={() => search.setOpenSearch(true)}>
              <Search size={15} strokeWidth={2} aria-hidden="true" />
              <span className="nav-search-label">Search</span>
              <kbd aria-hidden="true">⌘K</kbd>
            </button>
          ) : null}
          <a href={githubUrl} target="_blank" rel="noreferrer" className="nav-item nav-icon nav-gh" aria-label="GitHub" onPointerEnter={(e) => moveGlow(e.currentTarget)}>
            <GitHubMark size={17} />
          </a>
          <span className="nav-theme" onPointerEnter={(e) => moveGlow(e.currentTarget.firstElementChild as HTMLElement)}>
            <ThemeToggle className="nav-item nav-icon" />
          </span>
          <button
            type="button"
            className="nav-item nav-icon nav-burger"
            aria-label={sheetOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sheetOpen}
            aria-controls={SHEET_ID}
            onClick={() => setSheetOpen((v) => !v)}
          >
            <span className="nav-burger-icon" data-open={sheetOpen}>
              <Menu size={18} aria-hidden="true" />
              <X size={18} aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>

      {/* The one morphing panel ------------------------------------------ */}
      <div
        ref={panelRef}
        className="mm"
        data-state={open ? 'open' : 'closed'}
        data-instant={instant}
        style={panelStyle}
        inert={!open}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') clearCloseTimer()
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') closeSoon()
        }}
        onKeyDown={onPanelKeyDown}
        onBlur={onPanelBlur}
      >
        <div className="mm-pop">
          <span className="mm-caret" aria-hidden="true" />
          <div className="mm-panel">
            {MENUS.map((id, i) => {
              const pos = i === shownIndex ? 'active' : i < shownIndex ? 'before' : 'after'
              return (
                <div
                  key={id}
                  id={menuDomId(id)}
                  ref={(el) => {
                    contentRefs.current[id] = el
                  }}
                  role="region"
                  aria-label={MENU_LABEL[id]}
                  className="mm-content"
                  data-pos={pos}
                  inert={pos !== 'active'}
                >
                  {contents[id]}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}
