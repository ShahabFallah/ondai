import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { RadiusKey } from '@ondai/tokens'
import { useMotion, useTheme } from '@ondai/tokens/react'
import { MetalFx } from './engine'
import type { MetalPreset } from './material'

export type { MetalPreset } from './material'

export interface LiquidMetalProps {
  children: ReactNode
  /** `button` draws a 1pt band around a pill or rounded rect; `circle` a 2pt ring for icon buttons and avatars. */
  shape?: 'button' | 'circle'
  preset?: MetalPreset
  /** The glow runs bright while true (the model is working) and settles when false. */
  active?: boolean
  /** Corner radius of the wrapped content. Defaults to fully rounded. */
  radius?: RadiusKey | number
  /** 0 to 1. */
  strength?: number
  /** Bend the band with the phone's tilt. */
  tilt?: boolean
  /** Band width in pt. Defaults to 1 for `button`, 2 for `circle`. */
  ringWidth?: number
  /** The wandering highlight along the band. Default true. */
  glow?: boolean
  /** Body colour inside the ring. Defaults to the theme's raised surface. */
  fill?: string
  /** Stretch to the parent's width (panels) instead of hugging the content (buttons). */
  block?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * A ring of liquid metal around a button, a mic or an avatar. The shader is libraries.dev's metal-fx
 * (MIT; the material is Paper Shaders' liquidMetal, Apache-2.0). Ondai ties the glow to the AI state,
 * follows the theme and token radii, and holds still when the OS asks for reduced motion.
 */
export function LiquidMetal({ children, shape = 'button', preset = 'chromatic', active = false, radius, strength = 1, tilt = true, ringWidth, glow = true, fill, style }: LiquidMetalProps) {
  const t = useTheme()
  const motion = useMotion()
  const r = radius === undefined ? undefined : typeof radius === 'number' ? radius : t.radii[radius]
  return (
    <MetalFx
      variant={shape}
      preset={preset}
      theme={t.scheme}
      strength={strength}
      cornerRadius={r}
      glowGain={active ? 1.2 : 0.45}
      paused={!motion.enabled}
      tilt={tilt && motion.enabled}
      ringWidth={ringWidth}
      glow={glow}
      fill={fill ?? (t.scheme === 'dark' ? t.colors.elevated : t.colors.surface)}
      style={style}
    >
      {children}
    </MetalFx>
  )
}

export default LiquidMetal
