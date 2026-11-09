'use client'
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FocusEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { SidebarItem, SidebarSeparator } from 'fumadocs-ui/components/sidebar/base'
import type * as PageTree from 'fumadocs-core/page-tree'

/**
 * The docs sidebar as the component index.
 *
 * Fumadocs renders the page tree; `sidebar.components` in app/docs/layout.tsx swaps in `SidebarIndexItem`
 * and `SidebarIndexSeparator`. Component pages (/docs/components/<name>) become rows in larger type:
 * hovering one dims the others (CSS, `:has()` in docs.css) and a preview card springs along beside the
 * pointer, floating just right of the sidebar over the page. Every other page keeps the plain item.
 *
 * The card is one fixed element portalled to <body>, so the sidebar's scroll area never clips it. Its
 * position is a spring (x and y, integrated in a rAF loop and written straight to `transform`, so React
 * never re-renders on pointer move); its tilt follows the spring's velocity, clamped. Each new
 * component's picture mounts as a layer on top of the last and fades in, so moving between rows
 * cross-fades without a gap. Leaving a row hides the card after a short grace, so the hairline gaps
 * between rows never blink it.
 *
 * Pointer: only `(hover: hover) and (pointer: fine)`, only in the desktop sidebar, and only when the
 * card fits beside it. Keyboard: a focused row anchors the card level with the row, without travel.
 * Reduced motion: anchored like keyboard focus, fade only. Touch and the mobile drawer: no card.
 */

export type SidebarEntry = { title: string; line: string; thumb: boolean; loop: boolean }

type Ctx = {
  entries: Record<string, SidebarEntry>
  counts: Record<string, number>
  onEnter: (e: PointerEvent<HTMLElement>) => void
  onLeave: (e: PointerEvent<HTMLElement>) => void
  onFocus: (e: FocusEvent<HTMLElement>) => void
  onBlur: (e: FocusEvent<HTMLElement>) => void
}

const IndexContext = createContext<Ctx | null>(null)

const FINE = '(hover: hover) and (pointer: fine)'
const REDUCED = '(prefers-reduced-motion: reduce)'
const GAP = 20 // sidebar edge to card
const DRIFT = 28 // how far the card leans with the pointer across the sidebar
const TOP = 88 // clear of the floating nav
const EDGE = 16
const STIFFNESS = 140
const DAMPING = 20
const TILT_X = 0.012 // degrees per px/s
const TILT_Y = 0.005
const MAX_TILT = 5
const MAX_LAYERS = 3
const GRACE = 90 // ms between leaving a row and hiding the card

const noop = () => () => {}
const src = (name: string, dark: boolean) => `/thumbs/${dark ? 'dark' : 'light'}/${name}.webp`
const loopSrc = (name: string, dark: boolean) => `/loops/${dark ? 'dark' : 'light'}/${name}.mp4`
const matches = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches
const PREFIX = '/docs/components/'
const nameOf = (url: string) => (url.startsWith(PREFIX) ? url.slice(PREFIX.length).replace(/\/$/, '') : null)
const trim = (url: string) => (url.length > 1 ? url.replace(/\/$/, '') : url)
const rowOf = (el: EventTarget | Element | null) => (el instanceof Element ? el.closest<HTMLElement>('#nd-sidebar [data-sbx]') : null)

// Where the card may sit: right of the desktop sidebar, if it fits there.
function frame(card: HTMLElement | null) {
  const sidebar = document.getElementById('nd-sidebar')
  if (!sidebar || !card) return null
  const sr = sidebar.getBoundingClientRect()
  const w = card.offsetWidth
  const h = card.offsetHeight
  if (sr.width === 0 || sr.right + GAP + DRIFT + w > window.innerWidth - EDGE) return null
  return { sr, w, h, vh: window.innerHeight }
}
const clampY = (y: number, h: number, vh: number) => Math.max(TOP, Math.min(vh - h - EDGE, y))

type Layer = { key: number; name: string }

export function SidebarIndexProvider({ entries, counts, children }: { entries: Record<string, SidebarEntry>; counts: Record<string, number>; children: ReactNode }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  const cardRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const [layers, setLayers] = useState<Layer[]>([])
  const [line, setLine] = useState<{ key: number; text: string } | null>(null)
  const current = useRef<string | null>(null)
  const layerKey = useRef(0)
  const preloaded = useRef<string | null>(null)
  const hideTimer = useRef(0)

  const pos = useRef({ x: 0, y: 0, vx: 0, vy: 0, r: 0 })
  const target = useRef({ x: 0, y: 0 })
  const mode = useRef<'pointer' | 'anchor'>('pointer')
  const visible = useRef(false)
  const pointer = useRef({ x: 0, y: 0, inside: false })
  const raf = useRef(0)
  const last = useRef(0)

  const write = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    const p = pos.current
    el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) rotate(${p.r.toFixed(3)}deg)`
  }, [])

  // One spring step. Returns false once settled.
  const step = useCallback(
    (now: number) => {
      const p = pos.current
      const t = target.current
      const dt = Math.min(0.032, (now - (last.current || now)) / 1000) || 1 / 60
      last.current = now
      p.vx += (STIFFNESS * (t.x - p.x) - DAMPING * p.vx) * dt
      p.vy += (STIFFNESS * (t.y - p.y) - DAMPING * p.vy) * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      // The card hangs off the pointer by its left edge: dragged down, its far side trails up.
      const tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, p.vx * TILT_X - p.vy * TILT_Y))
      p.r += (tilt - p.r) * Math.min(1, dt * 14)
      write()
      const settled = Math.abs(t.x - p.x) < 0.3 && Math.abs(t.y - p.y) < 0.3 && Math.abs(p.vx) < 2 && Math.abs(p.vy) < 2 && Math.abs(p.r) < 0.02
      if (!settled) return true
      p.x = t.x
      p.y = t.y
      p.vx = p.vy = p.r = 0
      write()
      last.current = 0
      return false
    },
    [write],
  )

  const kick = useCallback(() => {
    if (raf.current) return
    function loop(now: number) {
      raf.current = step(now) ? requestAnimationFrame(loop) : 0
    }
    raf.current = requestAnimationFrame(loop)
  }, [step])

  const snap = useCallback(() => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
    last.current = 0
    const p = pos.current
    p.x = target.current.x
    p.y = target.current.y
    p.vx = p.vy = p.r = 0
    write()
  }, [write])

  const show = useCallback(
    (name: string) => {
      window.clearTimeout(hideTimer.current)
      if (current.current !== name) {
        current.current = name
        layerKey.current += 1
        const key = layerKey.current
        setLayers((ls) => [...ls.filter((l) => l.name !== name), { key, name }].slice(-MAX_LAYERS))
        setLine({ key, text: entries[name]?.line ?? '' })
      }
      if (!visible.current) {
        visible.current = true
        setShown(true)
      }
    },
    [entries],
  )

  const hideNow = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    if (!visible.current) return
    visible.current = false
    current.current = null
    setShown(false)
  }, [])

  const hideSoon = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(hideNow, GRACE)
  }, [hideNow])

  const aimAtPointer = useCallback((x: number, y: number) => {
    const f = frame(cardRef.current)
    if (!f) return false
    const across = Math.max(0, Math.min(1, (x - f.sr.left) / f.sr.width))
    target.current = { x: f.sr.right + GAP + across * DRIFT, y: clampY(y - f.h / 2, f.h, f.vh) }
    return true
  }, [])

  const aimAtRow = useCallback((row: HTMLElement) => {
    const f = frame(cardRef.current)
    if (!f) return false
    const rr = row.getBoundingClientRect()
    target.current = { x: f.sr.right + GAP, y: clampY(rr.top + rr.height / 2 - f.h / 2, f.h, f.vh) }
    return true
  }, [])

  const preload = useCallback(() => {
    const key = dark ? 'dark' : 'light'
    if (preloaded.current === key) return
    preloaded.current = key
    for (const [name, e] of Object.entries(entries)) if (e.thumb) new Image().src = src(name, dark)
  }, [dark, entries])

  const pointAt = useCallback(
    (row: HTMLElement, x: number, y: number) => {
      const name = row.dataset.sbx!
      if (!entries[name]?.thumb) return hideNow()
      preload()
      const first = !visible.current
      if (matches(REDUCED)) {
        mode.current = 'anchor'
        if (!aimAtRow(row)) return hideNow()
        snap()
      } else {
        mode.current = 'pointer'
        if (!aimAtPointer(x, y)) return hideNow()
        if (first) snap()
        else kick()
      }
      show(name)
    },
    [entries, preload, aimAtRow, aimAtPointer, snap, kick, show, hideNow],
  )

  const onEnter = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse' || !matches(FINE)) return
      const row = rowOf(e.currentTarget)
      if (!row) return
      pointer.current = { x: e.clientX, y: e.clientY, inside: true }
      pointAt(row, e.clientX, e.clientY)
    },
    [pointAt],
  )

  const onLeave = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse') return
      pointer.current.inside = false
      if (mode.current === 'pointer' || !rowOf(document.activeElement)) hideSoon()
    },
    [hideSoon],
  )

  const onFocus = useCallback(
    (e: FocusEvent<HTMLElement>) => {
      const row = rowOf(e.currentTarget)
      if (!row || !row.matches(':focus-visible')) return
      const name = row.dataset.sbx!
      if (!entries[name]?.thumb || !aimAtRow(row)) return hideNow()
      preload()
      mode.current = 'anchor'
      snap()
      show(name)
    },
    [entries, aimAtRow, preload, snap, show, hideNow],
  )

  const onBlur = useCallback(() => {
    if (mode.current === 'anchor' && !pointer.current.inside) hideSoon()
  }, [hideSoon])

  // The pointer stays put while the sidebar scrolls under it (or the page scrolls a focused row away):
  // follow along. Scroll events do not bubble, so listen in the capture phase.
  useEffect(() => {
    const onMove = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== 'mouse' || !visible.current || mode.current !== 'pointer') return
      const row = rowOf(e.target)
      if (!row) return
      pointer.current = { x: e.clientX, y: e.clientY, inside: true }
      pointAt(row, e.clientX, e.clientY)
    }
    const onScroll = () => {
      if (!visible.current) return
      if (mode.current === 'anchor') {
        const row = rowOf(document.activeElement)
        if (row && aimAtRow(row)) snap()
        return
      }
      const { x, y, inside } = pointer.current
      const row = inside ? rowOf(document.elementFromPoint(x, y)) : null
      if (!row) return hideNow()
      pointAt(row, x, y)
    }
    const onResize = () => hideNow()
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [pointAt, aimAtRow, snap, hideNow])

  // The caption can take one line or two, so the card's height changes between components: keep its
  // bottom inside the viewport when it grows.
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (!visible.current) return
      const y = clampY(target.current.y, el.offsetHeight, window.innerHeight)
      if (y === target.current.y) return
      target.current = { ...target.current, y }
      if (mode.current === 'anchor') snap()
      else kick()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [mounted, snap, kick])

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      window.clearTimeout(hideTimer.current)
    },
    [],
  )

  const value = useMemo<Ctx>(() => ({ entries, counts, onEnter, onLeave, onFocus, onBlur }), [entries, counts, onEnter, onLeave, onFocus, onBlur])

  return (
    <IndexContext value={value}>
      {children}
      {mounted
        ? createPortal(
            <div ref={cardRef} className="sbx-card" aria-hidden="true">
              <div className="sbx-card-body" data-shown={shown}>
                <div className="sbx-card-media">
                  {resolvedTheme
                    ? layers.map((l) =>
                        entries[l.name]?.loop && !matches(REDUCED) ? (
                          // The component at work, from the top each time its row is entered.
                          <video key={l.key} className="sbx-card-img" src={loopSrc(l.name, dark)} poster={src(l.name, dark)} muted loop autoPlay playsInline disablePictureInPicture />
                        ) : (
                          <img key={l.key} className="sbx-card-img" src={src(l.name, dark)} alt="" decoding="async" draggable={false} />
                        ),
                      )
                    : null}
                </div>
                {line ? (
                  <p key={line.key} className="sbx-card-line">
                    {line.text}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </IndexContext>
  )
}

const PLAIN = 'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0'

/** `sidebar.components.Item`: a component row for component pages, the plain item for the rest. */
export function SidebarIndexItem({ item }: { item: PageTree.Item }) {
  const ctx = use(IndexContext)
  const pathname = usePathname()
  const active = trim(item.url) === trim(pathname)
  const name = nameOf(item.url)
  const entry = name ? ctx?.entries[name] : undefined

  if (!entry || !ctx) {
    return (
      <SidebarItem href={item.url} external={item.external} active={active} icon={item.icon} className={PLAIN}>
        {item.name}
      </SidebarItem>
    )
  }

  return (
    <SidebarItem
      href={item.url}
      active={active}
      className="sbx-row"
      data-sbx={name}
      onPointerEnter={ctx.onEnter}
      onPointerLeave={ctx.onLeave}
      onFocus={ctx.onFocus}
      onBlur={ctx.onBlur}
    >
      <span className="sbx-name">{item.name}</span>
      {active ? <span className="sbx-line">{entry.line}</span> : null}
    </SidebarItem>
  )
}

/** `sidebar.components.Separator`: the group headings, with a count on AI components. */
export function SidebarIndexSeparator({ item }: { item: PageTree.Separator }) {
  const ctx = use(IndexContext)
  const n = typeof item.name === 'string' ? ctx?.counts[item.name] : undefined
  return (
    <SidebarSeparator className={n == null ? undefined : 'sbx-sep'}>
      {item.icon}
      {item.name}
      {n == null ? null : <span className="sbx-sep-n">{n}</span>}
    </SidebarSeparator>
  )
}
