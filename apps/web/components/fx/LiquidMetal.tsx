'use client'
import type { CSSProperties, ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { MetalFx } from 'metal-fx'

/**
 * LiquidMetal on the site: libraries.dev's metal-fx (MIT; the material is Paper Shaders' liquidMetal,
 * Apache-2.0), the same ring the registry's `liquid-metal` component draws with Skia on phones.
 */
export type LiquidMetalShape = 'ring' | 'pill'

export interface LiquidMetalProps {
  /** `ring` (default): a metal ring around a round button. `pill`: a band around a pill. */
  shape?: LiquidMetalShape
  /** Ring diameter in px. */
  size?: number
  /** Pill size in px. */
  width?: number
  height?: number
  strength?: number
  preset?: 'chromatic' | 'silver' | 'gold'
  paused?: boolean
  /** Accessible name when there is no text inside. */
  label?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function LiquidMetal({ shape = 'ring', size = 56, width = 220, height = 56, strength = 1, preset = 'chromatic', paused, label, className, style, children }: LiquidMetalProps) {
  const { resolvedTheme } = useTheme()
  const ring = shape === 'ring'
  const w = ring ? size : width
  const h = ring ? size : height
  return (
    <MetalFx variant={ring ? 'circle' : 'button'} preset={preset} theme={resolvedTheme === 'light' ? 'light' : 'dark'} strength={strength} borderRadius={h / 2} paused={paused} className={className} style={style}>
      <span role={label ? 'img' : undefined} aria-label={label} aria-hidden={label || children ? undefined : true} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: w, height: h, borderRadius: h / 2 }}>
        {children}
      </span>
    </MetalFx>
  )
}
