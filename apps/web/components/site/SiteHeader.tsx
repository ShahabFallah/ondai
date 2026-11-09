'use client'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ArrowUpRight, ChevronDown, Cpu, Download, Menu, Palette, Plug, Route, Search, Smartphone, X, type LucideIcon } from 'lucide-react'
import { useSearchContext } from 'fumadocs-ui/contexts/search'
import { aiComponents, displayTitle, GROUPS, groupOf, membersLine } from '@/lib/ai-components'
import { LoopShot } from './LoopShot'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { SmoothScroll } from './SmoothScroll'
import { gitConfig } from '@/lib/shared'
import './nav.css'

/**
 * The bar. At the top of a page it is open and transparent across the full width: logo left, links
 * centred, tools right. Once the page scrolls it gathers into one compact glass bar in the middle.
 *
 * Docs opens the guides beside a picture of the one under the pointer, with the install command below. Components opens the reference's "Explore"
 * dropdown: a list of three doors on the left and a large picture on the right that cross-fades, with
 * a slight settle and blur, to the door under the pointer. A soft highlight slides between the rows.
 * The pictures are real components composited over our photograph (`scripts/render-stills.mjs`).
 * How it works is a plain link. Moving between the two triggers swaps the panels in place.
 *
 * Mouse: hover intent (open on enter, close 160 ms after leaving trigger and panel). Touch and keyboard:
 * click toggles; ArrowDown moves into the list; Escape closes and returns focus. Route change closes.
 * Below 860 px: logo, search, theme, a menu button and a full-screen sheet.
 * Renders `<SmoothScroll />` so every page with the nav gets the wheel glide.
 */

const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`
const SHEET_ID = 'site-menu'
const CLOSE_DELAY = 160

type MenuId = 'docs' | 'components'
const MENUS: MenuId[] = ['docs', 'components']
const MENU_LABEL: Record<MenuId, string> = { docs: 'Docs', components: 'Components' }
const menuDomId = (id: MenuId) => `nav-menu-${id}`

const GUIDES: { id: string; href: string; title: string; line: string; Icon: LucideIcon }[] = [
  { id: 'installation', href: '/docs/installation', title: 'Installation', line: 'Add Ondai to an Expo app.', Icon: Download },
  { id: 'how-it-works', href: '/docs/how-it-works', title: 'How it works', line: 'From install to an answer.', Icon: Route },
  { id: 'core', href: '/docs/core', title: 'Core runtime', line: 'The router, the hooks, availability.', Icon: Cpu },
  { id: 'providers', href: '/docs/providers', title: 'Providers', line: 'Apple, Gemini Nano, or a cloud model.', Icon: Plug },
  { id: 'theming', href: '/docs/theming', title: 'Theming', line: 'Light, dark, glass, your accent.', Icon: Palette },
  { id: 'device-support', href: '/docs/device-support', title: 'Device support', line: 'Which phones ship a model.', Icon: Smartphone },
]


// One door per group (lib/ai-components.ts), then the whole list. Each door shows its lead component.
const DOORS: { id: string; href: string; title: string; line: string; lead: string }[] = [
  ...GROUPS.map((g) => {
    const members = aiComponents.filter((m) => groupOf(m.category) === g.id)
    return { id: g.id, href: `/docs/components#ci-${g.id}`, title: g.title, line: membersLine(members.map((m) => displayTitle(m.title))), lead: g.lead }
  }),
  { id: 'all', href: '/docs/components', title: 'All components', line: 'Every component, grouped by what it does.', lead: 'summarize' },
]
type DoorId = string

type Section = 'docs' | 'components' | 'how' | null
function sectionOf(pathname: string): Section {
  if (pathname.startsWith('/docs/components')) return 'components'
  if (pathname.startsWith('/docs/how-it-works')) return 'how'
  if (pathname.startsWith('/docs')) return 'docs'
  return null
}

function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

/** One still per theme; CSS shows the one that matches. */
function Still({ name, className }: { name: string; className?: string }) {
  return (
    <>
      <img className={`${className ?? ''} only-light`} src={`/img/stills/${name}-light.webp`} alt="" draggable={false} decoding="async" />
      <img className={`${className ?? ''} only-dark`} src={`/img/stills/${name}-dark.webp`} alt="" draggable={false} decoding="async" />
    </>
  )
}

function ComponentsMenu({ onNavigate }: { onNavigate: () => void }) {
  const [hot, setHot] = useState<DoorId>(DOORS[0]!.id)
  const listRef = useRef<HTMLUListElement>(null)
  const [mark, setMark] = useState<{ y: number; h: number } | null>(null)

  const point = (id: DoorId, el: HTMLElement) => {
    setHot(id)
    const list = listRef.current
    if (!list) return
    setMark({ y: el.offsetTop, h: el.offsetHeight })
  }

  // Rest the highlight on the first door when the menu mounts.
  useEffect(() => {
    const first = listRef.current?.querySelector<HTMLElement>('.mm-door')
    if (first) setMark({ y: first.offsetTop, h: first.offsetHeight })
  }, [])

  return (
    <div className="mm-grid">
      <ul ref={listRef} className="mm-doors">
        <span className="mm-mark" aria-hidden="true" style={mark ? ({ '--y': `${mark.y}px`, '--h': `${mark.h}px` } as CSSProperties) : undefined} data-on={!!mark} />
        {DOORS.map((d) => (
          <li key={d.id}>
            <Link
              href={d.href}
              className="mm-door"
              data-hot={hot === d.id}
              onPointerEnter={(e) => point(d.id, e.currentTarget)}
              onFocus={(e) => point(d.id, e.currentTarget)}
              onClick={onNavigate}
            >
              <span className="mm-door-title">
                {d.title}
                {d.id === 'all' ? <ArrowRight size={14} strokeWidth={2} aria-hidden="true" /> : null}
              </span>
              <span className="mm-door-line">{d.line}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mm-pic mm-pic-loop" aria-hidden="true">
        {DOORS.map((d) => (
          <span key={d.id} className="mm-pic-layer" data-on={hot === d.id}>
            {/* The lead component's still, shown whole on the same ground as the picture. */}
            <LoopShot name={d.lead} loop={false} />
          </span>
        ))}
      </div>
    </div>
  )
}

function DocsMenu({ onNavigate }: { onNavigate: () => void }) {
  const [hot, setHot] = useState(GUIDES[0]!.id)
  const listRef = useRef<HTMLUListElement>(null)
  const [mark, setMark] = useState<{ y: number; h: number } | null>(null)

  const point = (id: string, el: HTMLElement) => {
    setHot(id)
    setMark({ y: el.offsetTop, h: el.offsetHeight })
  }

  useEffect(() => {
    const first = listRef.current?.querySelector<HTMLElement>('.mm-guide')
    if (first) setMark({ y: first.offsetTop, h: first.offsetHeight })
  }, [])

  return (
    <div className="mm-docs">
      <div className="mm-grid mm-grid-docs">
        <ul ref={listRef} className="mm-guides">
          <span className="mm-mark" aria-hidden="true" style={mark ? ({ '--y': `${mark.y}px`, '--h': `${mark.h}px` } as CSSProperties) : undefined} data-on={!!mark} />
          {GUIDES.map(({ id, href, title, line, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="mm-guide"
                data-hot={hot === id}
                onPointerEnter={(e) => point(id, e.currentTarget)}
                onFocus={(e) => point(id, e.currentTarget)}
                onClick={onNavigate}
              >
                <span className="mm-guide-icon" aria-hidden="true">
                  <Icon size={16} strokeWidth={1.6} />
                </span>
                <span className="mm-guide-text">
                  <span className="mm-door-title">{title}</span>
                  <span className="mm-door-line">{line}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mm-pic" aria-hidden="true">
          {GUIDES.map((g) => (
            <span key={g.id} className="mm-pic-layer" data-on={hot === g.id}>
              <Still name={`docs-${g.id}`} />
            </span>
          ))}
        </div>
      </div>
      <div className="mm-foot">
        <code className="mm-cmd">
          <span aria-hidden="true">$ </span>npx ondai init
        </code>
        <Link href="/docs" className="mm-cta" onClick={onNavigate}>
          Read the docs
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const section = sectionOf(pathname)
  const search = useSearchContext()
  const [scrolled, setScrolled] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [open, setOpen] = useState<MenuId | null>(null)
  const [anchor, setAnchor] = useState<Record<MenuId, number>>({ docs: 0, components: 0 })

  const barRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<Record<MenuId, HTMLDivElement | null>>({ docs: null, components: null })
  const triggerRefs = useRef<Record<MenuId, HTMLButtonElement | null>>({ docs: null, components: null })
  const openRef = useRef<MenuId | null>(null)
  const closeTimer = useRef<number | null>(null)
  const pointerType = useRef('mouse')

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])
  const openMenu = useCallback(
    (id: MenuId) => {
      clearCloseTimer()
      const r = triggerRefs.current[id]?.getBoundingClientRect()
      if (r) setAnchor((a) => ({ ...a, [id]: Math.round(r.left + r.width / 2) }))
      openRef.current = id
      setOpen(id)
    },
    [clearCloseTimer],
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    closeAll()
  }, [pathname, closeAll])

  useEffect(() => {
    if (!open && !sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (open && (panelRefs.current[open]?.contains(document.activeElement) || document.activeElement === triggerRefs.current[open])) triggerRefs.current[open]?.focus()
      closeAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, sheetOpen, closeAll])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!MENUS.some((id) => panelRefs.current[id]?.contains(t)) && !barRef.current?.contains(t)) closeMenu()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, closeMenu])

  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const mq = window.matchMedia('(min-width: 860px)')
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

  const focusFirst = (id: MenuId) => requestAnimationFrame(() => panelRefs.current[id]?.querySelector<HTMLElement>('a[href]')?.focus())

  const onTriggerKey = (id: MenuId) => (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey && open === id)) {
      e.preventDefault()
      openMenu(id)
      focusFirst(id)
    }
  }
  const onPanelKey = (id: MenuId) => (e: ReactKeyboardEvent) => {
    const links = Array.from(panelRefs.current[id]?.querySelectorAll<HTMLElement>('a[href]') ?? [])
    const i = links.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      links[(i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus()
    } else if (e.key === 'Tab') {
      if (e.shiftKey && i === 0) {
        e.preventDefault()
        triggerRefs.current[id]?.focus()
      } else if (!e.shiftKey && i === links.length - 1) {
        closeMenu()
      }
    }
  }

  const sheetLinks = [
    { href: '/docs', label: 'Docs', note: 'Install, providers, theming', active: section === 'docs' },
    { href: '/docs/components', label: 'Components', note: 'Grouped by what they do', active: section === 'components' },
    { id: 'how-it-works', href: '/docs/how-it-works', label: 'How it works', note: 'From install to an answer on the phone', active: section === 'how' },
  ]

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
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') openMenu(id)
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') closeSoon()
    },
    onClick: (e: React.MouseEvent) => {
      if (e.detail > 0 && pointerType.current === 'mouse') return openMenu(id)
      if (open === id) closeMenu()
      else openMenu(id)
    },
    onKeyDown: onTriggerKey(id),
  })

  return (
    <header className="nav-root" data-scrolled={scrolled} data-open={open}>
      <SmoothScroll disabled={sheetOpen || search.open} />

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
          <a href={githubUrl} target="_blank" rel="noreferrer" className="nav-sheet-gh" style={{ '--i': sheetLinks.length } as CSSProperties} onClick={closeAll}>
            <GitHubMark size={18} />
            Star on GitHub
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </nav>
      </div>

      <div ref={barRef} className="nav-bar" data-sheet={sheetOpen}>
        <Link href="/" className="nav-brand" onClick={() => setSheetOpen(false)}>
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
          <Link href="/docs/how-it-works" className="nav-item" data-active={section === 'how'}>
            How it works
          </Link>
        </nav>

        <div className="nav-tools">
          {search.enabled ? (
            <button type="button" className="nav-item nav-search" onClick={() => search.setOpenSearch(true)}>
              <Search size={15} strokeWidth={2} aria-hidden="true" />
              <span className="nav-search-label">Search</span>
              <kbd aria-hidden="true">⌘K</kbd>
            </button>
          ) : null}
          <a href={githubUrl} target="_blank" rel="noreferrer" className="nav-item nav-icon nav-gh" aria-label="GitHub">
            <GitHubMark size={17} />
          </a>
          <ThemeToggle className="nav-item nav-icon" />
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

      {MENUS.map((id) => (
        <div
          key={id}
          ref={(el) => {
            panelRefs.current[id] = el
          }}
          id={menuDomId(id)}
          role="region"
          aria-label={MENU_LABEL[id]}
          className="mm"
          data-menu={id}
          data-state={open === id ? 'open' : 'closed'}
          style={{ '--mm-anchor': `${anchor[id]}px` } as CSSProperties}
          inert={open !== id}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') clearCloseTimer()
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') closeSoon()
          }}
          onKeyDown={onPanelKey(id)}
        >
          <div className="mm-panel">{id === 'docs' ? <DocsMenu onNavigate={closeAll} /> : <ComponentsMenu onNavigate={closeAll} />}</div>
        </div>
      ))}
    </header>
  )
}
