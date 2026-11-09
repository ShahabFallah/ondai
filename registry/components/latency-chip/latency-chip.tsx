import { Text, View, type StyleProp, type ViewStyle } from 'react-native'
import type { ProviderId } from '@ondai/core'
import { hairlineWidth, typeStyle, useTheme } from '@ondai/tokens/react'

export interface LatencyChipProps {
  latencyMs?: number
  tokensPerSecond?: number
  ttftMs?: number
  provider?: ProviderId | string
  size?: 'sm' | 'md'
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Dev/gallery-only metrics pill: `142ms · 38 tok/s · apple`. Mono, muted, never in the way. */
export function LatencyChip({ latencyMs, tokensPerSecond, ttftMs, provider, size = 'sm', style, testID }: LatencyChipProps) {
  const t = useTheme()
  const parts: string[] = []
  if (latencyMs !== undefined) parts.push(`${Math.round(latencyMs)}ms`)
  if (ttftMs !== undefined) parts.push(`ttft ${Math.round(ttftMs)}ms`)
  if (tokensPerSecond !== undefined) parts.push(`${Math.round(tokensPerSecond)} tok/s`)
  if (provider) parts.push(String(provider))
  if (!parts.length) parts.push('no runs yet')
  return (
    <View testID={testID} style={[{ alignSelf: 'flex-start', paddingHorizontal: size === 'sm' ? 8 : 10, height: size === 'sm' ? 22 : 26, borderRadius: 6, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: t.colors.muted, justifyContent: 'center' }, style]}>
      <Text style={[typeStyle(t, size === 'sm' ? 'xs' : 'sm', { mono: true }), { color: t.colors.textSecondary, fontVariant: ['tabular-nums'] }]}>{parts.join(' · ')}</Text>
    </View>
  )
}

export default LatencyChip
