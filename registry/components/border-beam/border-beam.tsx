import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { RadiusKey } from '@ondai/tokens'
import { useMotion, useTheme } from '@ondai/tokens/react'
import { BorderBeam as BeamEngine } from './engine'
import type { BorderBeamColorVariant, BorderBeamSize } from './types'

export interface BorderBeamProps {
  children: ReactNode
  /** Light travels while true (the model is working); fades out when it turns false. */
  active?: boolean
  /** libraries.dev's palettes; `mono` is the quiet one. */
  tone?: BorderBeamColorVariant
  /** `md` circles the whole border, `sm` is a tighter beam for chips, `line` runs along the bottom edge, `pulse-*` breathe. */
  size?: BorderBeamSize
  /** Match the wrapped surface's corner radius. */
  radius?: RadiusKey | number
  /** 0 to 1. */
  strength?: number
  style?: StyleProp<ViewStyle>
}

/** Seconds per lap: a little slower than libraries.dev's 1.96 s, so a long generation reads calm. */
const LAP = { md: 2.6, sm: 2.2, line: 3.4, 'pulse-inner': 2.6, 'pulse-outside': 2.6 } as const

/**
 * A light that travels around a card's border while the on-device model works.
 * The shader and its tuning are libraries.dev's border beam (MIT); Ondai sets
 * a calmer lap, theme-aware light/dark, token radii, and a still frame when the OS asks for reduced motion.
 */
export function BorderBeam({ children, active = true, tone = 'colorful', size = 'md', radius = 'lg', strength = 1, style }: BorderBeamProps) {
  const t = useTheme()
  const motion = useMotion()
  const r = typeof radius === 'number' ? radius : t.radii[radius]
  return (
    <BeamEngine
      active={active}
      size={size}
      colorVariant={tone}
      theme={t.scheme}
      borderRadius={r}
      strength={strength}
      // Reduced motion: the beam holds still and the colors stop drifting.
      duration={motion.enabled ? LAP[size] : 1e9}
      staticColors={!motion.enabled || tone === 'mono'}
      style={[{ borderRadius: r }, style]}
    >
      {children}
    </BeamEngine>
  )
}

export default BorderBeam
