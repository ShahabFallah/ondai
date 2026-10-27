import type { CSSProperties, ReactNode } from 'react'
import './BorderBeam.css'

/**
 * BorderBeam: a bright comet with a coloured tail travelling around the border of whatever it wraps.
 * Pure CSS (conic gradient masked to the border ring, `@property`-animated angle, blurred halo):
 * zero JS per frame. `prefers-reduced-motion` freezes the angle.
 *
 * The child should carry the same radius (the wrapper sets `border-radius` to `radius`).
 */

export interface BorderBeamProps {
  children?: ReactNode
  /** Corner radius in px (default 24). Match it to the wrapped card. */
  radius?: number
  /** Beam thickness: `sm` 1 px (default), `md` 2 px. */
  size?: 'sm' | 'md'
  /** 0–1: ring brightness and halo opacity (default 0.7). */
  strength?: number
  /** false: animation paused and halo hidden (default true). */
  active?: boolean
  /** Tail, halo and head colours. Default: the ion stops. */
  colors?: [string, string, string]
  /** Seconds per lap (default 4). */
  duration?: number
  className?: string
  style?: CSSProperties
}

const ION: [string, string, string] = ['#7CF7FF', '#8B7CFF', '#FF7CE5']
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export function BorderBeam({
  children,
  radius = 24,
  size = 'sm',
  strength = 0.7,
  active = true,
  colors = ION,
  duration = 4,
  className = '',
  style,
}: BorderBeamProps) {
  const vars = {
    '--beam-radius': `${radius}px`,
    '--beam-width': size === 'md' ? '2px' : '1px',
    '--beam-strength': String(clamp01(strength)),
    '--beam-a': colors[0],
    '--beam-b': colors[1],
    '--beam-c': colors[2],
    '--beam-duration': `${Math.max(0.2, duration)}s`,
  } as CSSProperties
  return (
    <div className={`fx-beam ${className}`} data-active={active ? 'true' : 'false'} style={{ ...vars, ...style }}>
      <span className="fx-beam-halo" aria-hidden />
      {children}
    </div>
  )
}
