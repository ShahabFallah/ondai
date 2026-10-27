'use client'
import dynamic from 'next/dynamic'
import type { FigureKind } from './FigureInner'

const Inner = dynamic(() => import('./FigureInner'), {
  ssr: false,
  loading: () => <div className="figure" aria-hidden />,
})

/** An isometric line figure from `@lucasmarkes/hairline`, themed to the card surface. */
export function Figure({ kind, label }: { kind: FigureKind; label: string }) {
  return (
    <div className="figure">
      <Inner kind={kind} label={label} />
    </div>
  )
}
