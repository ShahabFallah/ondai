'use client'
import Link from 'next/link'
import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import { Plane } from 'lucide-react'
import { AppleMark, CloudMark, GoogleMark } from '@/components/site/BrandMarks'
import { LogoMark } from '@/components/site/Logo'
import { useSequence } from './useSequence'

/**
 * The three steps as three square cards of grainy window light, each with a thin-line drawing that acts
 * its step out once on view and again on hover: the cursor presses Add and the source lands in the
 * repo's tiles; the call runs through Ondai and lights the path to the phone's model (each hover picks
 * the next one); a question is typed with the radio off and the answer rows arrive anyway.
 */

const V = 400 // every drawing is a 400 by 400 field, cropped to the card with `slice`

/** The shared defs: the edge fade for the line work, the raised key's fill and its soft shadow. */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-fade`} cx="50%" cy="48%" r="58%">
        <stop offset="0.3" stopColor="#fff" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={V} height={V}>
        <rect width={V} height={V} fill={`url(#${id}-fade)`} />
      </mask>
      <linearGradient id={`${id}-key`} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--key-top)' }} />
        <stop offset="1" style={{ stopColor: 'var(--key-bottom)' }} />
      </linearGradient>
      <radialGradient id={`${id}-glow`}>
        <stop offset="0" style={{ stopColor: 'var(--glow)', stopOpacity: 1 }} />
        <stop offset="1" style={{ stopColor: 'var(--glow)', stopOpacity: 0 }} />
      </radialGradient>
      <filter id={`${id}-lift`} x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="10" stdDeviation="11" style={{ floodColor: 'var(--key-shadow)' }} />
      </filter>
    </defs>
  )
}

/** A raised key: an outer ring, then the key itself on a soft shadow. */
function Key({ id, x, y, s, className }: { id: string; x: number; y: number; s: number; className?: string }) {
  return (
    <g className={className}>
      <circle cx={x + s / 2} cy={y + s / 2} r={s * 1.05} fill={`url(#${id}-glow)`} className="art-glow" />
      <rect x={x - 9} y={y - 9} width={s + 18} height={s + 18} rx={s * 0.3} className="art-ring" />
      <rect x={x} y={y} width={s} height={s} rx={s * 0.22} fill={`url(#${id}-key)`} filter={`url(#${id}-lift)`} className="art-key" />
      <rect x={x + 0.5} y={y + 0.5} width={s - 1} height={s - 1} rx={s * 0.22} className="art-key-edge" />
    </g>
  )
}

/* 1. Add it ------------------------------------------------------------------------------------------- */

// The repo: a grid of rounded tiles (110 pitch, 96 cell). Two of them receive the new source.
const tiles: [number, number, number, number][] = [
  [42, -68, 96, 96],
  [152, -68, 96, 96],
  [262, -68, 206, 96],
  [-68, 42, 96, 206],
  [42, 42, 96, 96],
  [152, 42, 96, 96],
  [262, 42, 96, 96],
  [372, 42, 96, 96],
  [42, 152, 96, 96],
  [-68, 262, 96, 96],
  [262, 262, 96, 206],
  [372, 262, 96, 96],
  [-68, 372, 96, 96],
  [42, 372, 206, 96],
  [372, 372, 96, 96],
]

/** Three lines of source, each drawn on by its own dash so they can land one after another. */
function Bars({ x, y, w }: { x: number; y: number; w: number[] }) {
  return w.map((len, i) => (
    <path key={i} d={`M${x} ${y + i * 18}h${len}`} pathLength={1} className="art-bar" style={{ '--j': `${i * 120}ms` } as CSSProperties} />
  ))
}

function ArtAdd({ id }: { id: string }) {
  return (
    <svg viewBox={`0 0 ${V} ${V}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Defs id={id} />
      <g mask={`url(#${id}-mask)`}>
        {tiles.map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={22} className="art-line" />
        ))}
        {/* The files that land: a wide tile to the right of the key, one below it. */}
        <g className="a1-file" style={{ '--d': '0ms' } as CSSProperties}>
          <rect x={262} y={152} width={206} height={96} rx={22} className="a1-file-box" />
          <Bars x={286} y={182} w={[64, 96, 44]} />
        </g>
        <g className="a1-file" style={{ '--d': '260ms' } as CSSProperties}>
          <rect x={42} y={262} width={206} height={96} rx={22} className="a1-file-box" />
          <Bars x={66} y={292} w={[88, 56, 104]} />
        </g>
      </g>
      <Key id={id} x={156} y={156} s={88} className="a1-key" />
      <path d="M200 191v18M191 200h18" className="art-glyph a1-plus" />
      <g className="a1-cursor">
        <path
          d="M232 232l0 26.5 7-6.4 4.6 10.4 4.3-1.9-4.5-10.2 9.4-.2z"
          className="art-cursor"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

/* 2. It finds the model ----------------------------------------------------------------------------- */

const models = [
  { name: 'Apple Foundation Models', y: 92, Mark: AppleMark },
  { name: 'Gemini Nano', y: 200, Mark: GoogleMark },
  { name: 'A cloud model, only if you allow it', y: 308, Mark: CloudMark },
]
const branch = (y: number) => `M250 200C296 200 284 ${y} 330 ${y}`

function ArtModel({ id, pick }: { id: string; pick: number }) {
  return (
    <svg viewBox={`0 0 ${V} ${V}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Defs id={id} />
      <g mask={`url(#${id}-mask)`}>
        {/* The app on the left calls in. */}
        <rect x={-62} y={156} width={96} height={88} rx={22} className="art-line" />
        <path d="M-30 186h40M-30 204h24" className="art-bar art-bar-dim" />
        <path d="M34 200H146" className="art-line" />
        <path d="M34 200H146" pathLength={1} className="art-lit a2-in" />
        {/* Faint context tiles above and below the call. */}
        <rect x={-62} y={46} width={96} height={88} rx={22} className="art-line art-faint" />
        <rect x={-62} y={266} width={96} height={88} rx={22} className="art-line art-faint" />
        {models.map((m, i) => (
          <g key={m.name} className="a2-branch" data-on={i === pick || undefined}>
            <path d={branch(m.y)} className="art-line" />
            <path d={branch(m.y)} pathLength={1} className="art-lit a2-out" />
            <rect x={330} y={m.y - 36} width={120} height={72} rx={20} className="art-line a2-node" />
            <g className="a2-mark" transform={`translate(${352} ${m.y - 11})`}>
              <m.Mark size={22} />
            </g>
          </g>
        ))}
      </g>
      <Key id={id} x={160} y={160} s={80} className="a2-key" />
      {/* Ondai at the centre: the chip. */}
      <foreignObject x={186} y={186} width={28} height={28} className="art-chip">
        <LogoMark size={28} />
      </foreignObject>
    </svg>
  )
}

/* 3. It runs on the phone --------------------------------------------------------------------------- */

const rows = [176, 230, 284]
/** A tick, the answer's mark, centred on x, y. */
const tick = (x: number, y: number) => `M${x - 4.5} ${y + 0.5}l3 3 6-7`

function ArtPhone({ id }: { id: string }) {
  return (
    <svg viewBox={`0 0 ${V} ${V}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Defs id={id} />
      <g mask={`url(#${id}-mask)`}>
        <rect x={86} y={40} width={228} height={460} rx={46} className="art-line art-strong" />
        <rect x={95} y={49} width={210} height={442} rx={38} className="art-line art-faint" />
        <rect x={174} y={60} width={52} height={15} rx={7.5} className="art-line" />
        <path d="M120 68h20" className="art-bar" />
        {/* The radio is off: aeroplane mode in the status bar. */}
        <Plane x={260} y={60} width={16} height={16} strokeWidth={1.4} className="a3-plane" />
        {/* The question, typed into a pill. */}
        <rect x={110} y={100} width={180} height={40} rx={20} className="art-line art-strong a3-pill" />
        <path d="M130 120h104" pathLength={1} className="art-bar a3-type" />
        <circle cx={270} cy={120} r={12} className="a3-send" />
        <path d="M270 126v-11M265 119.5l5-5 5 5" className="art-glyph a3-send-arrow" />
        {/* The answer, made on the device. */}
        {rows.map((y, i) => (
          <g key={y} className="a3-row" style={{ '--d': `${i * 220}ms` } as CSSProperties}>
            <circle cx={124} cy={y} r={10} className="art-line art-strong" />
            <path d={tick(124, y)} className="art-glyph" />
            <path d={`M146 ${y - 5}h${[96, 120, 72][i]}`} pathLength={1} className="art-bar" />
            <path d={`M146 ${y + 8}h${[124, 88, 112][i]}`} pathLength={1} className="art-bar art-bar-dim" />
          </g>
        ))}
      </g>
    </svg>
  )
}

/* The cards ----------------------------------------------------------------------------------------- */

function StepCard({
  href,
  title,
  line,
  times,
  delay,
  onReplay,
  children,
}: {
  href: string
  title: string
  line: ReactNode
  times: number[]
  delay: number
  onReplay?: () => void
  children: ReactNode
}) {
  const { ref, step, instant, replay } = useSequence<HTMLAnchorElement>(times, { delay })
  const again = () => {
    if (replay()) onReplay?.()
  }
  return (
    <li className="step">
      <Link
        ref={ref}
        href={href}
        className="step-link"
        data-step={step}
        data-instant={instant || undefined}
        onPointerEnter={(e) => e.pointerType === 'mouse' && again()}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && again()}
      >
        <span className="gcard step-card" aria-hidden="true">
          {children}
        </span>
        <span className="step-text">
          <span className="step-title">{title}</span>
          <span className="step-line">{line}</span>
        </span>
      </Link>
    </li>
  )
}

export function Steps() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [pick, setPick] = useState(0)
  return (
    <ol className="steps">
      <StepCard
        href="/docs/installation"
        title="Add it."
        line={
          <>
            Run <code>npx ondai add command-bar</code> and the source lands in your repo.
          </>
        }
        times={[0, 1450, 1700, 2000]}
        delay={0}
      >
        <ArtAdd id={`${uid}a`} />
      </StepCard>
      <StepCard
        href="/docs/providers"
        title="It finds the model."
        line="Apple Foundation Models or Gemini Nano, whichever the phone has. A cloud model only if you allow it."
        times={[0, 900, 1300]}
        delay={500}
        onReplay={() => setPick((p) => (p + 1) % models.length)}
      >
        <ArtModel id={`${uid}b`} pick={pick} />
      </StepCard>
      <StepCard
        href="/docs/device-support"
        title="It runs on the phone."
        line="Offline and private, with nothing to pay per call."
        times={[0, 1300, 1600]}
        delay={1000}
      >
        <ArtPhone id={`${uid}c`} />
      </StepCard>
    </ol>
  )
}
