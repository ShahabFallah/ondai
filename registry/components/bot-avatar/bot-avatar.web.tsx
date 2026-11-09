import { View } from 'react-native'
import { BotAvatar as WebAvatar } from 'bot-avatars'
import { useMotion, useTheme } from '@ondai/tokens/react'
import type { BotAvatarProps } from './bot-avatar'

export type { BotAvatarFace, BotAvatarProps, BotAvatarState, BotAvatarType } from './bot-avatar'

const chip = { type: 'square' as const, saturation: 0.5, highlight: 1.4, depth: 0.7 }

/** Web: libraries.dev's own canvas renderer (MIT), lit as plastic to match the native Skia port. */
export function BotAvatar({ type = 'chip', face, state = 'default', size = 64, color, interactive = true, accessibilityLabel, style, testID }: BotAvatarProps) {
  const t = useTheme()
  const motion = useMotion()
  const isChip = type === 'chip'
  const body = color ?? (isChip ? (t.scheme === 'dark' ? '#D6DAE3' : '#CDD2DC') : undefined)
  return (
    <View style={[{ width: size, height: size }, style]} testID={testID}>
      <WebAvatar
        type={isChip ? chip.type : type}
        face={face}
        state={state}
        size={size}
        color={body}
        shading="plastic"
        saturation={isChip ? chip.saturation : undefined}
        highlight={isChip ? chip.highlight : undefined}
        depth={isChip ? chip.depth : undefined}
        paused={!motion.enabled}
        interactive={interactive}
        aria-label={accessibilityLabel}
      />
    </View>
  )
}

export default BotAvatar
