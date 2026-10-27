'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ChevronDown, Menu, Search, X } from 'lucide-react'
import { useSearchContext } from 'fumadocs-ui/contexts/search'
import { manifest } from '@ondai/registry/manifest'
import { Glyph } from './Glyph'
import { gitConfig } from '@/lib/shared'

const groups: Array<{ id: string; title: string }> = [
  { id: 'agentic', title: 'Agentic' },
  { id: 'input', title: 'Input' },
  { id: 'text', title: 'Text' },
  { id: 'search', title: 'Search' },
  { id: 'organize', title: 'Organize' },
  { id: 'vision', title: 'Vision' },
  { id: 'primitive', title: 'Primitives' },
]

const links = [
  { href: '/docs', label: 'Docs', match: (p: string) => p.startsWith('/docs') && !p.startsWith('/docs/components') },
  { href: '/playground', label: 'Playground', match: (p: string) => p.startsWith('/playground') },
  { href: '/themes', label: 'Themes', match: (p: string) => p.startsWith('/themes') },
]

function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

/** The glass bar: progressive blur of whatever scrolls underneath, then a dim so text stays readable. */
function GlassBar() {
  return (
    <div aria-hidden className="glass-bar">
      <span className="gb-1" />
      <span className="gb-2" />
      <span className="gb-3" />
      <span className="gb-4" />
      <span className="gb-5" />
      <span className="gb-6" />
      <span className="gb-7" />
      <span className="glass-dim" />
    </div>
  )
}

function ComponentsMenu({ onNavigate }: { onNavigate: () => void }) {
  const items = manifest.filter((m) => m.hasPlayground)
  const featured = items.filter((m) => m.category !== 'primitive')
  const primitives = items.filter((m) => m.category === 'primitive')
  return (
    <div id="components-menu" className="glass-panel menu-enter mx-auto mt-2 w-[min(1040px,calc(100vw-32px))] overflow-hidden" role="group" aria-label="Components">
      <div className="grid gap-2 p-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="flex min-w-0 flex-col overflow-hidden p-2">
          <span className="label px-3 pt-2 pb-3">Features. Each one is a complete on-device AI flow.</span>
          <ul className="grid min-w-0 gap-0.5">
            {featured.map((m) => (
              <li key={m.name} className="min-w-0">
                <Link href={`/docs/components/${m.name}`} className="menu-row" onClick={onNavigate}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-[color:var(--ondai-text)]">{m.title}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-[color:var(--ondai-text-secondary)]">{m.description}</span>
                  </span>
                  <ArrowRight size={16} className="menu-arrow shrink-0 text-[color:var(--ondai-text-secondary)]" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-w-0 flex-col overflow-hidden rounded-[14px] bg-[color:var(--hover)] p-2">
          <span className="label px-3 pt-2 pb-3">Primitives. The building blocks the features share.</span>
          <ul className="grid min-w-0 grid-cols-2 gap-0.5">
            {primitives.map((m) => (
              <li key={m.name} className="min-w-0">
                <Link href={`/docs/components/${m.name}`} className="menu-row py-2" onClick={onNavigate}>
                  <span className="truncate text-[14px] text-[color:var(--ondai-text)]">{m.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-w-0 flex-col justify-between rounded-[14px] p-5" style={{ background: 'linear-gradient(160deg, color-mix(in oklab, var(--ion-b) 22%, transparent), transparent 60%)' }}>
          <div>
            <span className="block text-[17px] font-medium tracking-tight">Try every one in the browser</span>
            <span className="mt-2 block text-[14px] leading-6 text-[color:var(--ondai-text-secondary)]">
              The playground runs each component on a scripted mock, with every variant, state and theme. On a phone, the same code runs on the real model.
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/playground" className="btn btn-primary btn-sm" onClick={onNavigate}>
              Open the playground
            </Link>
            <Link href="/review" className="btn btn-secondary btn-sm" onClick={onNavigate}>
              Review grid
            </Link>
          </div>
        </div>
      </div>
      <span className="sr-only">{groups.length} groups</span>
    </div>
  )
}

export function SiteHeader() {
  const pathname = usePathname() ?? '/'
  const [menu, setMenu] = useState(false)
  const [mobile, setMobile] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const search = useSearchContext()

  const open = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMenu(true)
  }, [])
  const closeSoon = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMenu(false), 140)
  }, [])
  const close = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMenu(false)
    setMobile(false)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    close()
  }, [pathname, close])

  const componentsActive = pathname.startsWith('/docs/components')

  return (
    <header className="site-header">
      <GlassBar />
      <div className="wrap flex h-full items-center gap-1">
        <Link href="/" className="mr-3 flex shrink-0 items-center gap-2 rounded-[8px]" aria-label="Ondai home">
          <Glyph size={20} />
          <span className="text-[15px] font-semibold tracking-tight">ondai</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center lg:flex">
          <Link href="/docs" className="nav-item" data-active={links[0]!.match(pathname)}>
            Docs
          </Link>
          <div className="relative" onMouseEnter={open} onMouseLeave={closeSoon}>
            <button
              type="button"
              className="nav-item"
              aria-expanded={menu}
              aria-controls={menu ? 'components-menu' : undefined}
              data-active={componentsActive}
              onClick={() => (menu ? close() : open())}
            >
              Components
              <ChevronDown size={14} className="opacity-60" />
            </button>
          </div>
          {links.slice(1).map((l) => (
            <Link key={l.href} href={l.href} className="nav-item" data-active={l.match(pathname)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {search.enabled ? (
            <button type="button" className="nav-item gap-2 pr-2" onClick={() => search.setOpenSearch(true)}>
              <Search size={15} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded-[5px] bg-[color:var(--hover)] px-1.5 py-0.5 font-sans text-[11px] text-[color:var(--ondai-text-secondary)] sm:inline">⌘K</kbd>
            </button>
          ) : null}
          <a href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`} target="_blank" rel="noreferrer" className="icon-btn" aria-label="GitHub">
            <GitHubMark />
          </a>
          <button type="button" className="icon-btn lg:hidden" aria-label={mobile ? 'Close menu' : 'Open menu'} aria-expanded={mobile} onClick={() => setMobile((v) => !v)}>
            {mobile ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menu ? (
        <div className="absolute inset-x-0 top-full hidden px-4 lg:block" onMouseEnter={open} onMouseLeave={closeSoon}>
          <ComponentsMenu onNavigate={close} />
        </div>
      ) : null}

      {mobile ? (
        <div className="absolute inset-x-0 top-full px-4 lg:hidden">
          <div className="glass-panel menu-enter mx-auto flex flex-col gap-1 p-2">
            <Link href="/docs" className="menu-row text-[15px]" onClick={close}>
              Docs
            </Link>
            <Link href="/docs/components/command-bar" className="menu-row text-[15px]" onClick={close}>
              Components
            </Link>
            <Link href="/playground" className="menu-row text-[15px]" onClick={close}>
              Playground
            </Link>
            <Link href="/themes" className="menu-row text-[15px]" onClick={close}>
              Themes
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
