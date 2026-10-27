'use client'
import type { PointerEvent, ReactNode } from 'react'

/** A `.card` with the pointer spotlight from global.css: sets `--mx/--my` and `data-hot` on move. */
export function SpotCard({ className = '', children }: { className?: string; children: ReactNode }) {
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
    el.dataset.hot = 'true'
  }
  const onLeave = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.dataset.hot = 'false'
  }
  return (
    <article className={`card ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      <span className="spot" aria-hidden />
      {children}
    </article>
  )
}
