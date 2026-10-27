'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Wheel-driven smooth scrolling for the marketing pages.
 *
 * Each wheel event moves a target (clamped to the document range); a rAF loop lerps `window.scrollY`
 * toward it (factor 0.11, stops within 0.5 px). Anchor clicks (`a[href^="#"]`) animate with the same loop.
 *
 * It steps aside whenever something else should scroll: an inner scrollable under the pointer that can
 * still move in the wheel direction, pinch-zoom (`ctrlKey`), horizontal wheels, keyboard or scrollbar
 * scrolling (a `scroll` event we did not cause re-syncs the target), the Fumadocs search dialog
 * (`body[data-scroll-locked]`), the `disabled` prop, docs routes, coarse pointers and reduced motion.
 */

const FACTOR = 0.11
const EPSILON = 0.5
/** Anchor targets land this far below the top unless they set `scroll-margin-top`. The fixed nav is 68 px tall. */
const NAV_OFFSET = 88

/** True when an ancestor of `target` is user-scrollable and still has room in the wheel direction. */
function scrollsNatively(target: EventTarget | null, dy: number): boolean {
  let el: Element | null = target instanceof Element ? target : null
  const root = document.scrollingElement ?? document.documentElement
  while (el && el !== root && el !== document.body) {
    const { overflowY } = getComputedStyle(el)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      const room = el.scrollHeight - el.clientHeight
      if (room > 1 && (dy < 0 ? el.scrollTop > 0 : el.scrollTop < room - 1)) return true
    }
    el = el.parentElement
  }
  return false
}

export function SmoothScroll({ disabled = false }: { disabled?: boolean }) {
  const pathname = usePathname()
  // Re-evaluate the media queries when they change (a mouse plugged into a tablet, an OS setting).
  const [mediaTick, setMediaTick] = useState(0)

  useEffect(() => {
    const queries = [window.matchMedia('(pointer: coarse)'), window.matchMedia('(prefers-reduced-motion: reduce)')]
    const bump = () => setMediaTick((n) => n + 1)
    for (const q of queries) q.addEventListener('change', bump)
    return () => {
      for (const q of queries) q.removeEventListener('change', bump)
    }
  }, [])

  useEffect(() => {
    if (disabled || pathname.startsWith('/docs')) return
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const doc = document.documentElement
    let target = window.scrollY
    let current = target
    let raf = 0
    let lastSet = -1

    const maxScroll = () => Math.max(0, doc.scrollHeight - window.innerHeight)
    const clamp = (v: number) => Math.min(Math.max(v, 0), maxScroll())
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const step = () => {
      const diff = target - current
      if (Math.abs(diff) < EPSILON) {
        current = target
        lastSet = target
        window.scrollTo(0, target)
        raf = 0
        return
      }
      current += diff * FACTOR
      lastSet = current
      window.scrollTo(0, current)
      raf = requestAnimationFrame(step)
    }
    const run = () => {
      if (!raf) raf = requestAnimationFrame(step)
    }

    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey) return
      if (e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (document.body.hasAttribute('data-scroll-locked')) return
      if (scrollsNatively(e.target, e.deltaY)) return
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
      e.preventDefault()
      if (!raf) {
        current = window.scrollY
        target = current
      }
      target = clamp(target + dy)
      run()
    }

    const onScroll = () => {
      // Our own frames land within a pixel of what we set; anything else (keys, scrollbar, hash jumps,
      // programmatic scrolls) wins and becomes the new resting point.
      if (raf && Math.abs(window.scrollY - lastSet) < 1.5) return
      stop()
      current = target = window.scrollY
    }

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const origin = e.target instanceof Element ? e.target : null
      const a = origin?.closest<HTMLAnchorElement>('a[href^="#"]')
      if (!a) return
      const hash = a.getAttribute('href') ?? '#'
      const id = decodeURIComponent(hash.slice(1))
      const el = id ? document.getElementById(id) : null
      if (id && !el) return
      e.preventDefault()
      let top = 0
      if (el) {
        const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || NAV_OFFSET
        top = el.getBoundingClientRect().top + window.scrollY - margin
      }
      if (!raf) current = window.scrollY
      target = clamp(top)
      run()
      if (hash !== window.location.hash) history.pushState(null, '', hash)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', onClick)
    return () => {
      stop()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick)
    }
  }, [disabled, pathname, mediaTick])

  return null
}
