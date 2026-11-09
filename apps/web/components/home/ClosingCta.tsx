'use client'
import Link from 'next/link'
import { Fragment, type CSSProperties } from 'react'
import { LogoMark } from '@/components/site/Logo'
import { CopyCommand } from '@/components/site/CopyCommand'
import { useSequence } from './how/useSequence'
import './how.css'

/**
 * The conclusion of the three steps, in their material: one wide card of grainy window light. The words
 * rise out of a soft blur one at a time as the card comes into view, and on the right the Ondai chip sits
 * raised in a field of tiles that light up outward from it, as if it had just been switched on.
 */

const title = 'Your users already paid for the model.'
const words = title.split(' ')

// The field: rounded tiles on a 110 pitch, each lit after a delay that grows with its distance to the chip.
const KX = 860
const KY = 230
const field: { x: number; y: number; w: number; h: number; d: number }[] = []
for (let c = 0; c < 7; c++) {
  for (let r = 0; r < 5; r++) {
    const x = 482 + c * 110
    const y = -45 + r * 110
    if (x === 812 && y === 175) continue // the chip's own cell
    const wide = (c === 4 && r === 3) || (c === 1 && r === 1) || (c === 5 && r === 0)
    if ((c === 5 && r === 3) || (c === 2 && r === 1) || (c === 6 && r === 0)) continue // covered by a wide tile
    const w = wide ? 206 : 96
    const d = Math.hypot(x + w / 2 - KX, y + 48 - KY)
    field.push({ x, y, w, h: 96, d })
  }
}

export function ClosingCta() {
  const { ref, step, instant } = useSequence<HTMLDivElement>([0])
  return (
    <section className="section home-section closing" aria-labelledby="cta">
      <div className="wrap">
        <div ref={ref} className="gcard closing-card" data-step={step} data-instant={instant || undefined}>
          <svg className="closing-art" viewBox="0 0 1200 460" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
            <defs>
              <radialGradient id="closing-fade-r" cx={KX} cy={KY} r="420" gradientUnits="userSpaceOnUse">
                <stop offset="0.2" stopColor="#fff" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <mask id="closing-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="460">
                <rect width="1200" height="460" fill="url(#closing-fade-r)" />
              </mask>
              <linearGradient id="closing-key" x1="0" y1="0" x2="0.4" y2="1">
                <stop offset="0" style={{ stopColor: 'var(--key-top)' }} />
                <stop offset="1" style={{ stopColor: 'var(--key-bottom)' }} />
              </linearGradient>
              <radialGradient id="closing-glow">
                <stop offset="0" style={{ stopColor: 'var(--glow)', stopOpacity: 1 }} />
                <stop offset="1" style={{ stopColor: 'var(--glow)', stopOpacity: 0 }} />
              </radialGradient>
              <filter id="closing-lift" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="12" stdDeviation="14" style={{ floodColor: 'var(--key-shadow)' }} />
              </filter>
            </defs>
            <g mask="url(#closing-mask)">
              {field.map((t) => (
                <rect
                  key={`${t.x}-${t.y}`}
                  x={t.x}
                  y={t.y}
                  width={t.w}
                  height={t.h}
                  rx={22}
                  className="art-line closing-tile"
                  style={{ '--d': `${Math.round(t.d * 2.2)}ms` } as CSSProperties}
                />
              ))}
            </g>
            <circle cx={KX} cy={KY} r={150} fill="url(#closing-glow)" className="art-glow closing-glow" />
            <rect x={KX - 61} y={KY - 61} width={122} height={122} rx={34} className="art-ring closing-ring" />
            <rect x={KX - 50} y={KY - 50} width={100} height={100} rx={24} fill="url(#closing-key)" filter="url(#closing-lift)" className="art-key" />
            <rect x={KX - 49.5} y={KY - 49.5} width={99} height={99} rx={24} className="art-key-edge" />
            <foreignObject x={KX - 21} y={KY - 21} width={42} height={42} className="closing-chip">
              <LogoMark size={42} />
            </foreignObject>
          </svg>

          <div className="closing-text">
            <h2 id="cta" className="closing-title" aria-label={title}>
              {words.map((w, i) => (
                <Fragment key={i}>
                  <span className="closing-word" aria-hidden="true" style={{ '--i': i } as CSSProperties}>
                    {w}
                  </span>
                  {i < words.length - 1 ? ' ' : null}
                </Fragment>
              ))}
            </h2>
            <p className="closing-sub" style={{ '--i': words.length + 2 } as CSSProperties}>
              Put it to work.
            </p>
            <div className="closing-actions" style={{ '--i': words.length + 4 } as CSSProperties}>
              <CopyCommand command="npx ondai init" />
              <Link href="/docs/installation" className="btn btn-primary">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
