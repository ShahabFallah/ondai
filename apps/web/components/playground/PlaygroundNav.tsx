'use client'
import { useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { useIndicator } from '../ui/useIndicator'
import type { CatalogGroup } from './catalog'
import '../ui/ui.css'
import './playground.css'

let savedScroll = 0

/** The component list. The highlight slides to the open page, even across navigations. */
export function PlaygroundNav({ current, groups }: { current?: string; groups: CatalogGroup[] }) {
  const { ref, style, animate } = useIndicator<HTMLElement>(current, 'playground-nav')
  const aside = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = aside.current
    if (!el) return
    el.scrollTop = savedScroll
    const active = el.querySelector<HTMLElement>('[data-active="true"]')
    if (active) {
      const top = active.offsetTop
      if (top < el.scrollTop + 40 || top > el.scrollTop + el.clientHeight - 80) el.scrollTop = Math.max(0, top - el.clientHeight / 3)
    }
  }, [current])

  return (
    <aside ref={aside} className="pg-aside" onScroll={(e) => (savedScroll = e.currentTarget.scrollTop)}>
      <nav ref={ref} aria-label="Components" className="pg-nav">
        <span aria-hidden className="ui-ind pg-nav-ind" data-animate={animate} style={style} />
        <div>
          <Link href="/playground" className="pg-nav-link" data-active={!current}>
            All components
          </Link>
        </div>
        {groups.map((g) => (
          <div key={g.id}>
            <div className="pg-nav-head">{g.title}</div>
            {g.items.map((m) => (
              <Link key={m.name} href={`/playground/${m.name}`} className="pg-nav-link" data-active={m.name === current} aria-current={m.name === current ? 'page' : undefined}>
                {m.title}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
