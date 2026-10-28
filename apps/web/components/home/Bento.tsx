import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

export type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>

/** An app screen fragment: a tiny title bar and the live component, cut off by the card's bottom edge. */
export function Screen({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bento-screen ${className}`}>
      <div className="bento-bar" aria-hidden>
        <span className="bento-bar-label">{label}</span>
        <span className="bento-bar-dot" />
      </div>
      <div className="bento-demo">{children}</div>
    </div>
  )
}

/** The name row under every card: icon tile, title, a short line, and an Open affordance. */
export function CardMeta({ name, title, line, icon: Icon }: { name: string; title: string; line: string; icon: Icon }) {
  return (
    <Link href={`/playground/${name}`} className="bento-meta" aria-label={`Open ${title} in the playground`}>
      <span className="bento-icon" aria-hidden>
        <Icon size={17} strokeWidth={1.6} />
      </span>
      <span className="bento-text">
        <span className="bento-title">{title}</span>
        <span className="bento-line">{line}</span>
      </span>
      <span className="bento-open" aria-hidden>
        Open
        <ArrowUpRight size={14} strokeWidth={1.75} />
      </span>
    </Link>
  )
}

export function BentoCard({ area, className = '', children }: { area: string; className?: string; children: ReactNode }) {
  return (
    <article className={`bento-card ${className}`} data-area={area}>
      {children}
    </article>
  )
}
