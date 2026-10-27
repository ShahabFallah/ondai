'use client'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, X } from 'lucide-react'
import { useSearchContext } from 'fumadocs-ui/contexts/search'
import { manifest } from '@ondai/registry/manifest'
import { Glyph } from './Glyph'
import { SmoothScroll } from './SmoothScroll'
import { gitConfig } from '@/lib/shared'
import './nav.css'

/**
 * The floating glass pill: logo, Docs, Components (opens the image mega-menu), Playground, Themes,
 * Search (Fumadocs dialog, which already binds Meta/Ctrl+K) and GitHub. Below 1024 px the links move
 * into a full-screen glass sheet. One sliding highlight follows the pointer across the primary links.
 * Renders `<SmoothScroll />` so every page with the nav gets the wheel lerp.
 */

const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`
const MENU_ID = 'components-menu'
const SHEET_ID = 'site-menu'
const CLOSE_DELAY = 150
const DEFAULT_PREVIEW = 'command-bar'
const thumb = (name: string) => `/thumbs/${name}.png`

const components = manifest.filter((m) => m.hasPlayground)
const features = components.filter((m) => m.category !== 'primitive')
const primitives = components.filter((m) => m.category === 'primitive')
const titleOf = new Map(components.map((m) => [m.name, m.title] as const))
const componentsHref = `/docs/components/${features[0]?.name ?? DEFAULT_PREVIEW}`

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

/** The one highlight pill behind the primary links. It jumps to the first hovered item, then slides. */
interface Glow {
  x: number
  w: number
  visible: boolean
  instant: boolean
}
function useGlow() {
  const [glow, setGlow] = useState<Glow>({ x: 0, w: 0, visible: false, instant: true })
  const visible = useRef(false)
  const move = useCallback((el: HTMLElement) => {
    const x = el.offsetLeft
    const w = el.offsetWidth
    if (visible.current) {
      setGlow({ x, w, visible: true, instant: false })
      return
    }
    visible.current = true
    setGlow({ x, w, visible: true, instant: true })
    // Two frames later the slide transition is back on for the next move.
    requestAnimationFrame(() => requestAnimationFrame(() => setGlow((g) => (g.instant ? { ...g, instant: false } : g))))
  }, [])
  const hide = useCallback(() => {
    visible.current = false
    setGlow((g) => (g.visible ? { ...g, visible: false } : g))
  }, [])
  return { glow, move, hide }
}

/** Two stacked thumbnails; the hovered row's image loads, then the layers cross-fade. */
interface Layers {
  a: string
  b: string
  front: 'a' | 'b'
}
function usePreview() {
  const [layers, setLayers] = useState<Layers>({ a: DEFAULT_PREVIEW, b: DEFAULT_PREVIEW, front: 'a' })
  const [missing, setMissing] = useState<ReadonlySet<string>>(() => new Set())
  const wanted = useRef(DEFAULT_PREVIEW)
  const markMissing = useCallback((name: string) => setMissing((m) => (m.has(name) ? m : new Set(m).add(name))), [])
  const show = useCallback(
    (name: string) => {
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
      img.onerror = () => {
        markMissing(name)
        commit()
      }
      img.src = thumb(name)
      if (img.complete && img.naturalWidth > 0) commit()
    },
    [markMissing],
  )
  const shown = layers.front === 'a' ? layers.a : layers.b
  return { layers, shown, missing, show, markMissing }
}

export function SiteHeader() {
  const pathname = usePathname()
  const section = sectionOf(pathname)
  const search = useSearchContext()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)
  const { glow, move: moveGlow, hide: hideGlow } = useGlow()
  const preview = usePreview()

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])
  const openMenu = useCallback(() => {
    clearCloseTimer()
    setMenuOpen(true)
  }, [clearCloseTimer])
  const closeMenu = useCallback(() => {
    clearCloseTimer()
    setMenuOpen(false)
  }, [clearCloseTimer])
  const closeMenuSoon = useCallback(() => {
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), CLOSE_DELAY)
  }, [clearCloseTimer])
  const closeAll = useCallback(() => {
    closeMenu()
    setSheetOpen(false)
  }, [closeMenu])
  const focusFirstRow = useCallback(() => {
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('a[href]')?.focus())
  }, [])

  // Hover intent on fine pointers only; touch goes through click so it does not open and toggle at once.
  const onHoverIn = useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') openMenu()
    },
    [openMenu],
  )
  const onHoverOut = useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType === 'mouse') closeMenuSoon()
    },
    [closeMenuSoon],
  )
  const onTriggerKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        openMenu()
        focusFirstRow()
      }
    },
    [openMenu, focusFirstRow],
  )
  const onPanelBlur = useCallback(
    (e: ReactFocusEvent) => {
      const next = e.relatedTarget as Node | null
      if (next && !panelRef.current?.contains(next) && next !== triggerRef.current) closeMenu()
    },
    [closeMenu],
  )

  // Darker fill once the page has scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
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
    if (!menuOpen && !sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (menuOpen && panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus()
      closeAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, sheetOpen, closeAll])

  // Pointer down outside the panel and trigger closes the menu.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) closeMenu()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [menuOpen, closeMenu])

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

  const glowStyle: CSSProperties = { transform: `translateX(${glow.x}px)`, width: glow.w }
  const { layers, shown, missing } = preview
  const shownTitle = titleOf.get(shown) ?? shown

  const sheetLinks = [
    { href: '/docs', label: 'Docs', active: section === 'docs' },
    { href: componentsHref, label: 'Components', active: section === 'components' },
    { href: '/playground', label: 'Playground', active: section === 'playground' },
    { href: '/themes', label: 'Themes', active: section === 'themes' },
    { href: githubUrl, label: 'GitHub', active: false, external: true },
  ]

  return (
    <header className="nav-root">
      <SmoothScroll disabled={sheetOpen || search.open} />

      <div
        id={SHEET_ID}
        className="nav-sheet"
        data-state={sheetOpen ? 'open' : 'closed'}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSheetOpen(false)
        }}
      >
        <nav aria-label="Menu">
          <ul>
            {sheetLinks.map((l, i) => (
              <li key={l.label} style={{ '--i': i } as CSSProperties}>
                {l.external ? (
                  <a href={l.href} target="_blank" rel="noreferrer" className="nav-sheet-link" onClick={closeAll}>
                    {l.label}
                    <GitHubMark size={20} />
                  </a>
                ) : (
                  <Link href={l.href} className="nav-sheet-link" data-active={l.active} onClick={closeAll}>
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="nav-pill glass" data-scrolled={scrolled}>
        <Link href="/" className="nav-brand" aria-label="Ondai home">
          <Glyph size={20} />
          <span>ondai</span>
        </Link>

        <nav className="nav-links" aria-label="Main" data-glow={glow.visible} onPointerLeave={hideGlow}>
          <span className="nav-glow" aria-hidden="true" style={glowStyle} data-visible={glow.visible} data-instant={glow.instant} />
          <Link href="/docs" className="nav-link" data-active={section === 'docs'} onPointerEnter={(e) => moveGlow(e.currentTarget)}>
            Docs
          </Link>
          <button
            ref={triggerRef}
            type="button"
            className="nav-link"
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            data-active={section === 'components'}
            onPointerEnter={(e) => {
              moveGlow(e.currentTarget)
              onHoverIn(e)
            }}
            onPointerLeave={onHoverOut}
            onClick={(e) => {
              if (menuOpen) closeMenu()
              else {
                openMenu()
                if (e.detail === 0) focusFirstRow()
              }
            }}
            onKeyDown={onTriggerKeyDown}
          >
            Components
          </button>
          <Link href="/playground" className="nav-link" data-active={section === 'playground'} onPointerEnter={(e) => moveGlow(e.currentTarget)}>
            Playground
          </Link>
          <Link href="/themes" className="nav-link" data-active={section === 'themes'} onPointerEnter={(e) => moveGlow(e.currentTarget)}>
            Themes
          </Link>
        </nav>

        <div className="nav-right">
          {search.enabled ? (
            <button type="button" className="nav-link nav-search" onClick={() => search.setOpenSearch(true)}>
              <Search size={16} aria-hidden="true" />
              <span>Search</span>
              <kbd className="key" aria-hidden="true">
                ⌘K
              </kbd>
            </button>
          ) : null}
          <a href={githubUrl} target="_blank" rel="noreferrer" className="icon-btn" aria-label="GitHub">
            <GitHubMark />
          </a>
          <button
            type="button"
            className="icon-btn nav-burger"
            aria-label={sheetOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sheetOpen}
            aria-controls={SHEET_ID}
            onClick={() => setSheetOpen((v) => !v)}
          >
            {sheetOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        ref={panelRef}
        id={MENU_ID}
        className="nav-menu glass"
        data-state={menuOpen ? 'open' : 'closed'}
        aria-label="Components"
        role="group"
        onPointerEnter={onHoverIn}
        onPointerLeave={onHoverOut}
        onBlur={onPanelBlur}
      >
        <div className="nav-menu-grid">
          <div className="nav-menu-list">
            <span className="nav-menu-heading">Features</span>
            <ul className="nav-feats">
              {features.map((m) => (
                <li key={m.name}>
                  <Link
                    href={`/docs/components/${m.name}`}
                    className="nav-row"
                    data-hot={shown === m.name}
                    onPointerEnter={() => preview.show(m.name)}
                    onFocus={() => preview.show(m.name)}
                    onClick={closeAll}
                  >
                    <span className="nav-row-title">{m.title}</span>
                    <span className="nav-row-desc">{m.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <span className="nav-menu-heading">Primitives</span>
            <ul className="nav-prims">
              {primitives.map((m) => (
                <li key={m.name}>
                  <Link
                    href={`/docs/components/${m.name}`}
                    className="nav-row"
                    data-hot={shown === m.name}
                    title={m.description}
                    onPointerEnter={() => preview.show(m.name)}
                    onFocus={() => preview.show(m.name)}
                    onClick={closeAll}
                  >
                    <span className="nav-row-title">{m.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="nav-preview">
            <Link href={`/playground/${shown}`} className="nav-tile" onClick={closeAll}>
              <span className="stage nav-tile-media">
                <img className="nav-tile-img" src={thumb(layers.a)} alt="" data-active={layers.front === 'a' && !missing.has(layers.a)} onError={() => preview.markMissing(layers.a)} />
                <img className="nav-tile-img" src={thumb(layers.b)} alt="" data-active={layers.front === 'b' && !missing.has(layers.b)} onError={() => preview.markMissing(layers.b)} />
                {missing.has(shown) ? <span className="nav-tile-fallback">{shownTitle}</span> : null}
              </span>
              <span className="nav-tile-caption">
                <span className="nav-tile-title">{shownTitle}</span>
                <span className="nav-tile-hint">Open in the playground</span>
              </span>
            </Link>
            <div className="nav-menu-actions">
              <Link href="/playground" className="btn btn-secondary btn-sm" onClick={closeAll}>
                Playground
              </Link>
              <Link href="/review" className="btn btn-secondary btn-sm" onClick={closeAll}>
                Review grid
              </Link>
              <Link href={componentsHref} className="btn btn-secondary btn-sm" onClick={closeAll}>
                Docs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
