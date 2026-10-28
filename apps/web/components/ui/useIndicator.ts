'use client'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

export type Box = { x: number; y: number; w: number; h: number }

/** Remembered positions, so an indicator that remounts (a new route) can slide from where it was. */
const memory = new Map<string, Box>()

/**
 * Measures the `[data-active="true"]` child of a positioned container and returns a style that
 * puts an absolutely positioned indicator on top of it. The first placement is instant; later
 * moves animate through the `.ui-ind` transition.
 */
export function useIndicator<T extends HTMLElement>(active: unknown, rememberAs?: string) {
  const ref = useRef<T>(null)
  const [box, setBox] = useState<Box | null>(() => (rememberAs ? (memory.get(rememberAs) ?? null) : null))
  const [animate, setAnimate] = useState(false)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const measure = () => {
      const el = root.querySelector<HTMLElement>('[data-active="true"]')
      if (!el) return setBox(null)
      const next = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
      if (rememberAs) memory.set(rememberAs, next)
      setBox((b) => (b && b.x === next.x && b.y === next.y && b.w === next.w && b.h === next.h ? b : next))
    }
    let raf = 0
    if (!animate && rememberAs && memory.has(rememberAs)) {
      // Paint at the remembered spot first, then slide to the new one.
      raf = requestAnimationFrame(() => {
        setAnimate(true)
        raf = requestAnimationFrame(measure)
      })
    } else {
      measure()
      if (!animate) raf = requestAnimationFrame(() => setAnimate(true))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, rememberAs])

  const style: CSSProperties = box ? { width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)`, opacity: 1 } : { opacity: 0 }
  return { ref, style, animate }
}
