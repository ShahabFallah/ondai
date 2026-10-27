'use client'
import { Hub, Laptop, Phone, Router } from '@lucasmarkes/hairline/react'

export type FigureKind = 'phone' | 'laptop' | 'hub' | 'router'

const figures = { phone: Phone, laptop: Laptop, hub: Hub, router: Router } as const

/** One hairline figure. Loaded client-only (the figures draw into the DOM in a layout effect). */
export default function FigureInner({ kind, label }: { kind: FigureKind; label: string }) {
  const Figure = figures[kind]
  return <Figure intensity={0.5} label={label} />
}
