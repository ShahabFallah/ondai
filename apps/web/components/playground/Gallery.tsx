'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Search } from 'lucide-react'
import { useIndicator } from '../ui/useIndicator'
import type { CatalogGroup, CatalogItem } from './catalog'
import '../ui/ui.css'
import './playground.css'

function Card({ m, thumb, i }: { m: CatalogItem; thumb: boolean; i: number }) {
  return (
    <Link
      href={`/playground/${m.name}`}
      className="pg-card"
      style={{ ['--i' as string]: Math.min(i, 12) }}
      aria-label={`${m.title} playground`}
    >
      <div className="pg-thumb">
        {thumb ? (
          <img
            src={`/thumbs/${m.name}.png`}
            alt=""
            width={960}
            height={600}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span>{m.title}</span>
        )}
      </div>
      <div className="pg-card-body">
        <div className="min-w-0">
          <h3>{m.title}</h3>
          <p>{m.line}</p>
        </div>
        <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden />
      </div>
    </Link>
  )
}

const norm = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '')

/** Category chips with a sliding highlight, a name search, and the cards. */
export function Gallery({ groups, thumbs }: { groups: CatalogGroup[]; thumbs: string[] }) {
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const { ref, style, animate } = useIndicator<HTMLDivElement>(cat)
  const has = useMemo(() => new Set(thumbs), [thumbs])
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        e.key === '/' &&
        !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))
      ) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const needle = norm(q)
  const shown = groups
    .filter((g) => cat === 'all' || g.id === cat)
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (m) => !needle || norm(m.title).includes(needle) || norm(m.name).includes(needle),
      ),
    }))
    .filter((g) => g.items.length)
  let i = 0

  return (
    <div>
      <div className="pg-bar">
        <div ref={ref} className="pg-filters" role="tablist" aria-label="Category">
          <span aria-hidden className="ui-ind pg-filter-ind" data-animate={animate} style={style} />
          {[
            { id: 'all', title: 'All', n: total },
            ...groups.map((g) => ({ id: g.id, title: g.title, n: g.items.length })),
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cat === c.id}
              data-active={cat === c.id}
              className="pg-filter"
              onClick={() => setCat(c.id)}
            >
              {c.title}
              <small>{c.n}</small>
            </button>
          ))}
        </div>
        <label className="pg-search">
          <Search size={15} strokeWidth={1.75} aria-hidden />
          <input
            ref={input}
            className="ui-input"
            type="search"
            placeholder="Search components"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search components"
          />
          {q ? null : <kbd className="ui-kbd">/</kbd>}
        </label>
      </div>

      <div className="mt-8" key={cat}>
        {shown.length ? (
          <div className="pg-groups">
            {shown.map((g) => (
              <section
                key={g.id}
                className="pg-group"
                data-n={g.items.length}
                aria-labelledby={`cat-${g.id}`}
              >
                <div className="pg-group-head">
                  <h2 id={`cat-${g.id}`}>{g.title}</h2>
                  <span>{g.items.length}</span>
                </div>
                {g.items.map((m) => (
                  <Card key={m.name} m={m} thumb={has.has(m.name)} i={i++} />
                ))}
              </section>
            ))}
          </div>
        ) : (
          <p className="pg-empty">Nothing called &ldquo;{q}&rdquo;. Yet.</p>
        )}
      </div>
    </div>
  )
}
