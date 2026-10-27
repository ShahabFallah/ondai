'use client'
import { useEffect, useState, type RefObject } from 'react'

export interface UseVisibleOptions {
  /** Margin around the viewport that still counts as on screen (IntersectionObserver `rootMargin`). */
  rootMargin?: string
}

export interface VisibleState {
  /** The element intersects the viewport (plus margin) and the tab is in the foreground. */
  visible: boolean
  /** The user asked for reduced motion: draw one still frame instead of animating. */
  reduced: boolean
}

/**
 * Whether an element is on screen and the page is in the foreground, plus `prefers-reduced-motion`.
 * State only changes on those transitions (never per frame), so a rAF loop can key off it safely.
 */
export function useVisible<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = '160px' }: UseVisibleOptions = {},
): VisibleState {
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let onScreen = false
    let tabShown = document.visibilityState !== 'hidden'
    const sync = () => setVisible(onScreen && tabShown)
    let io: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const last = entries[entries.length - 1]
          if (last) onScreen = last.isIntersecting
          sync()
        },
        { rootMargin },
      )
      io.observe(el)
    } else {
      onScreen = true
      sync()
    }
    const onVisibility = () => {
      tabShown = document.visibilityState !== 'hidden'
      sync()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [ref, rootMargin])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return { visible, reduced }
}
