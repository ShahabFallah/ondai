import { useEffect } from 'react'
import { Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { badgeLabel, useLocalModel, type Locality, type ProviderId } from '@ondai/core'
import { createVariants, type AiState } from '@ondai/tokens'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'

export interface OnDeviceBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  /** `pill` (dot + label), `icon` (dot only), `text` (label only, no border). */
  variant?: 'pill' | 'icon' | 'text'
  /** Pulse the dot while the AI works. */
  state?: AiState
  /** Override the detected provider (otherwise read from the router). */
  provider?: ProviderId
  locality?: Locality
  label?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

const variants = createVariants({
  variants: {
    size: {
      sm: { height: 20, paddingHorizontal: 8, gap: 6 },
      md: { height: 24, paddingHorizontal: 10, gap: 7 },
      lg: { height: 28, paddingHorizontal: 12, gap: 8 },
    },
    variant: {
      pill: {},
      icon: { paddingHorizontal: 0, width: undefined },
      text: { paddingHorizontal: 0, borderWidth: 0, backgroundColor: 'transparent' },
    },
  },
  compound: [
    { when: { variant: 'icon', size: 'sm' }, style: { width: 20 } },
    { when: { variant: 'icon', size: 'md' }, style: { width: 24 } },
    { when: { variant: 'icon', size: 'lg' }, style: { width: 28 } },
  ],
  defaults: { size: 'md', variant: 'pill' },
})

const dotSize = { sm: 5, md: 6, lg: 7 } as const

/** A quiet pill that says where inference runs: ON DEVICE · APPLE, LOCAL · LLAMA, CLOUD. The dot glows while thinking. */
export function OnDeviceBadge({ size = 'md', variant = 'pill', state = 'idle', provider, locality, label, style, testID }: OnDeviceBadgeProps) {
  const t = useTheme()
  const motion = useMotion()
  const detected = useLocalModel('text')
  const prov = provider ?? detected.provider
  const loc = locality ?? detected.locality
  const text = badgeLabel(prov, loc, label || (provider ? undefined : detected.label))
  const active = state === 'thinking' || state === 'streaming' || state === 'tool' || state === 'preparing'
  const ready = detected.isReady || !!provider

  const pulse = useSharedValue(1)
  useEffect(() => {
    if (active && motion.enabled) {
      pulse.value = withRepeat(withSequence(withTiming(0.35, { duration: t.durations.pulse / 2, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: t.durations.pulse / 2, easing: Easing.inOut(Easing.quad) })), -1, false)
    } else {
      cancelAnimation(pulse)
      pulse.value = withTiming(1, { duration: 200 })
    }
    return () => cancelAnimation(pulse)
  }, [active, motion.enabled, pulse, t.durations.pulse])
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value, transform: [{ scale: 0.85 + pulse.value * 0.15 }] }), [pulse])

  const dotColor = loc === 'cloud' ? t.colors.warning : ready || active ? t.colors.accent.solid : t.colors.textTertiary
  const d = dotSize[size]
  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`${text.replace('·', ',').toLowerCase()}${active ? ', working' : ''}`}
      style={[
        { flexDirection: 'row', alignItems: 'center', borderRadius: t.radii.pill, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: t.colors.surface, justifyContent: 'center' },
        ...variants({ size, variant }),
        style,
      ]}
    >
      {variant !== 'text' ? (
        <View style={{ width: d * 2, height: d * 2, alignItems: 'center', justifyContent: 'center' }}>
          {active ? <View style={{ position: 'absolute', width: d * 2, height: d * 2, borderRadius: d, backgroundColor: t.colors.accent.glow }} /> : null}
          <Animated.View style={[{ width: d, height: d, borderRadius: d / 2, backgroundColor: dotColor }, dotStyle]} />
        </View>
      ) : null}
      {variant !== 'icon' ? (
        <Text numberOfLines={1} style={[typeStyle(t, size === 'lg' ? 'sm' : 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textSecondary }]}>
          {text}
        </Text>
      ) : null}
    </View>
  )
}

export default OnDeviceBadge
