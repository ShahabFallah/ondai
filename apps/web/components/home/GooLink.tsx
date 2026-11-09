import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import './goo.css'

/**
 * A link in two joined pieces, a label and an arrow tile, drawn through a goo filter so they read as one
 * liquid shape. On hover the tile pulls away and the neck between them stretches and snaps; the arrow
 * turns from up-right to right. Only the shapes are filtered; the text and the arrow stay sharp.
 */
export function GooLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="goo">
      <svg className="goo-defs" aria-hidden="true" focusable="false">
        <filter id="goo-filter">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
        </filter>
      </svg>
      <span className="goo-shapes" aria-hidden="true">
        <span className="goo-body" />
        <span className="goo-tile" />
      </span>
      <span className="goo-label">{children}</span>
      <span className="goo-arrow" aria-hidden="true">
        <ArrowUpRight size={17} strokeWidth={2} />
      </span>
    </Link>
  )
}
