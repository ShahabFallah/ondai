import type { StyleProp, ViewStyle } from 'react-native'
import { useMotion, useTheme } from '@ondai/tokens/react'
import { BotAvatar as AvatarEngine } from './engine'
import type { BotAvatarFace, BotAvatarState, BotAvatarType } from './types'

export type { BotAvatarFace, BotAvatarState, BotAvatarType } from './types'

export interface BotAvatarProps {
  /** `chip` is Ondai's own: a squared body in quiet chrome. The rest are libraries.dev's 18 shapes. */
  type?: 'chip' | BotAvatarType
  /** `mouth` adds a mouth (used while speaking). Defaults to the shape's own face. */
  face?: BotAvatarFace
  /** `default` looks around, `working` hops and turns while the model runs, `sleeping` breathes slowly. */
  state?: BotAvatarState
  /** Points. */
  size?: number
  /** Body colour. Each shape has its own; `chip` is chrome that follows the theme. */
  color?: string
  /** A tap makes it hop; a resting finger draws its eyes. */
  interactive?: boolean
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** The chip: libraries.dev's square body, desaturated to chrome, lit a little softer. */
const chip = { type: 'square' as const, saturation: 0.5, highlight: 1.4, depth: 0.7 }

/**
 * A small glossy body with eyes that blinks, glances, hops while the model works and sleeps when idle.
 * The rig and the Skia renderer are libraries.dev's bot avatars (MIT); Ondai adds the chrome `chip` body,
 * theme-aware chrome, and freezes it when the OS asks for reduced motion.
 */
export function BotAvatar({ type = 'chip', face, state = 'default', size = 64, color, interactive = true, accessibilityLabel, style, testID }: BotAvatarProps) {
  const t = useTheme()
  const motion = useMotion()
  const isChip = type === 'chip'
  const body = color ?? (isChip ? (t.scheme === 'dark' ? '#D6DAE3' : '#CDD2DC') : undefined)
  return (
    <AvatarEngine
      type={isChip ? chip.type : type}
      face={face}
      state={state}
      size={size}
      color={body}
      saturation={isChip ? chip.saturation : undefined}
      highlight={isChip ? chip.highlight : undefined}
      depth={isChip ? chip.depth : undefined}
      paused={!motion.enabled}
      interactive={interactive}
      accessibilityLabel={accessibilityLabel}
      style={style}
      testID={testID}
    />
  )
}

export default BotAvatar
