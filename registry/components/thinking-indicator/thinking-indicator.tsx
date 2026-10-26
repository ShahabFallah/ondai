import { useEffect } from 'react'
import { Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { typeStyle, useMotion, useTheme } from '@ondai/tokens/react'

export interface ThinkingIndicatorProps {
  variant?: 'dots' | 'orb' | 'line' | 'sweep'
  size?: 'sm' | 'md' | 'lg'
  /** Optional mono label, e.g. "Thinking". */
  label?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

const px = { sm: 4, md: 6, lg: 8 } as const

/** Four ways to say "the model is working": dots, a breathing orb, a sweeping line, or a light sweep behind a label. */
export function ThinkingIndicator({ variant = 'dots', size = 'md', label, style, testID }: ThinkingIndicatorProps) {
  const t = useTheme()
  return (
    <View testID={testID} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Thinking'} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      {variant === 'dots' ? <Dots size={size} /> : variant === 'orb' ? <Orb size={size} /> : variant === 'line' ? <Line size={size} /> : <Sweep size={size} />}
      {label ? <Text style={[typeStyle(t, size === 'lg' ? 'sm' : 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textSecondary }]}>{label}</Text> : null}
    </View>
  )
}

function useLoop(duration: number, enabled: boolean, delay = 0) {
  const v = useSharedValue(0)
  useEffect(() => {
    if (enabled) {
      v.value = 0
      v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })), -1, false))
    } else {
      cancelAnimation(v)
      v.value = 0.5
    }
    return () => cancelAnimation(v)
  }, [enabled, duration, delay, v])
  return v
}

function Dot({ size, delay }: { size: number; delay: number }) {
  const t = useTheme()
  const motion = useMotion()
  const v = useLoop(900, motion.enabled, delay)
  const s = useAnimatedStyle(() => ({ opacity: 0.25 + v.value * 0.75, transform: [{ scale: 0.8 + v.value * 0.3 }] }), [v])
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.accent.solid }, s]} />
}

function Dots({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const d = px[size]
  return (
    <View style={{ flexDirection: 'row', gap: d, alignItems: 'center', height: d * 2 }}>
      <Dot size={d} delay={0} />
      <Dot size={d} delay={150} />
      <Dot size={d} delay={300} />
    </View>
  )
}

function Orb({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const t = useTheme()
  const motion = useMotion()
  const d = px[size] * 3
  const v = useLoop(1800, motion.enabled)
  const s = useAnimatedStyle(() => ({ transform: [{ scale: 0.9 + v.value * 0.2 }], opacity: 0.8 + v.value * 0.2 }), [v])
  const g = t.colors.accent
  return (
    <Animated.View style={[{ width: d, height: d }, s]}>
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id="ondai-orb" cx="40%" cy="35%" r="70%">
            <Stop offset="0" stopColor={g.a} />
            <Stop offset="0.55" stopColor={g.b} />
            <Stop offset="1" stopColor={g.c} stopOpacity={0.9} />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill="url(#ondai-orb)" />
      </Svg>
    </Animated.View>
  )
}

function Line({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const t = useTheme()
  const motion = useMotion()
  const w = size === 'sm' ? 48 : size === 'md' ? 72 : 112
  const v = useSharedValue(0)
  useEffect(() => {
    if (motion.enabled) {
      v.value = 0
      v.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }), -1, false)
    } else {
      cancelAnimation(v)
      v.value = 0.5
    }
    return () => cancelAnimation(v)
  }, [motion.enabled, v])
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: -w * 0.4 + v.value * w * 0.8 }] }), [v, w])
  return (
    <View style={{ width: w, height: 2, borderRadius: 1, backgroundColor: t.colors.hairlineStrong, overflow: 'hidden' }}>
      <Animated.View style={[{ width: w * 0.4, height: 2, borderRadius: 1, backgroundColor: t.colors.accent.solid, marginLeft: w * 0.3 }, s]} />
    </View>
  )
}

function Sweep({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const t = useTheme()
  const motion = useMotion()
  const w = size === 'sm' ? 64 : size === 'md' ? 96 : 140
  const h = px[size] * 3
  const v = useSharedValue(0)
  useEffect(() => {
    if (motion.enabled) {
      v.value = 0
      v.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, false)
    } else {
      cancelAnimation(v)
      v.value = 0.5
    }
    return () => cancelAnimation(v)
  }, [motion.enabled, v])
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: -w + v.value * w * 2 }] }), [v, w])
  return (
    <View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: t.colors.accent.soft, overflow: 'hidden' }}>
      <Animated.View style={[{ width: w, height: h, backgroundColor: t.colors.accent.glow, opacity: 0.9 }, s]} />
    </View>
  )
}

export default ThinkingIndicator
