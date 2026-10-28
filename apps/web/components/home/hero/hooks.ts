'use client'
import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react'

function subscribeDark(onChange: () => void) {
  const mo = new MutationObserver(onChange)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => mo.disconnect()
}

/** True while the site is in dark mode (the `.dark` class on `<html>`). */
export function useSiteDark(): boolean {
  return useSyncExternalStore(
    subscribeDark,
    () => document.documentElement.classList.contains('dark'),
    () => false,
  )
}

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/** The visitor asked for reduced motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

/** The element's content-box height in CSS px, rounded (0 before mount). */
export function useBoxHeight<T extends HTMLElement>(ref: RefObject<T | null>): number {
  const [h, setH] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      if (e) setH(Math.round(e.contentRect.height))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return h
}
