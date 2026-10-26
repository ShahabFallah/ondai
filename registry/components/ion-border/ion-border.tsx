import { useEffect, useState, type ReactNode } from 'react'
import { Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { hairlineWidth, useMotion, useTheme } from '@ondai/tokens/react'
import type { RadiusKey } from '@ondai/tokens'

export interface IonBorderProps {
  /** Show the traveling light (thinking / streaming). */
  active?: boolean
  /** Fade the border in when focused: a faint static ring. */
  focused?: boolean
  radius?: RadiusKey | number
  /** Ring thickness in pt. */
  width?: number
  /** Seconds per lap. */
  speed?: number
  /** Background behind children. Defaults to the theme surface. */
  fill?: string
  /** Soft outer glow while active (elevation 3). */
  glow?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  children?: ReactNode
  testID?: string
}

/**
 * The signature "thinking" border: a slow gradient light travels around the edge of any container.
 * Idle: hairline. Focus: faint ring. Active: the ion sweep. Done: fades out within 300ms.
 */
export function IonBorder({ active = false, focused = false, radius = 'lg', width = 1.5, speed, fill, glow = false, style, contentStyle, children, testID }: IonBorderProps) {
  const t = useTheme()
  const motion = useMotion()
  const r = typeof radius === 'number' ? radius : t.radii[radius]
  const [size, setSize] = useState({ w: 0, h: 0 })
  const rotation = useSharedValue(0)
  const opacity = useSharedValue(active ? 1 : 0)
  const lapMs = (speed ?? t.durations.sweep / 1000) * 1000

  useEffect(() => {
    if (active && motion.enabled) {
      rotation.value = 0
      rotation.value = withRepeat(withTiming(360, { duration: lapMs, easing: Easing.linear }), -1, false)
    } else {
      cancelAnimation(rotation)
    }
    return () => cancelAnimation(rotation)
  }, [active, motion.enabled, lapMs, rotation])

  useEffect(() => {
    opacity.value = motion.enabled ? withTiming(active ? 1 : 0, { duration: active ? 200 : t.durations.settle }) : active ? 1 : 0
  }, [active, motion.enabled, opacity, t.durations.settle])

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }), [rotation])
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity])

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout
    if (w !== size.w || h !== size.h) setSize({ w, h })
  }
  const d = Math.ceil(Math.hypot(size.w, size.h)) + 8
  const bg = fill ?? t.colors.surface
  const g = t.colors.accent
  const glowStyle: ViewStyle =
    glow && active
      ? Platform.OS === 'web'
        ? ({ boxShadow: `0 0 24px ${g.glow}` } as unknown as ViewStyle)
        : { shadowColor: g.solid, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }
      : {}

  return (
    <View style={[glowStyle, { borderRadius: r }, style]} testID={testID}>
      <View onLayout={onLayout} style={[styles.clip, { borderRadius: r, backgroundColor: bg, borderWidth: hairlineWidth, borderColor: focused ? t.colors.accent.ring : t.colors.hairline }]}>
        {size.w > 0 ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, fade]}>
            <Animated.View style={spin}>
              <Svg width={d} height={d}>
                <Defs>
                  <LinearGradient id="ondai-ion" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={g.a} stopOpacity={0} />
                    <Stop offset="0.3" stopColor={g.a} stopOpacity={0.15} />
                    <Stop offset="0.5" stopColor={g.b} stopOpacity={1} />
                    <Stop offset="0.62" stopColor={g.c} stopOpacity={0.9} />
                    <Stop offset="0.8" stopColor={g.c} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Rect x={0} y={0} width={d} height={d} fill="url(#ondai-ion)" />
              </Svg>
            </Animated.View>
          </Animated.View>
        ) : null}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: width, borderRadius: Math.max(0, r - width), backgroundColor: bg }]} />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { position: 'relative' },
})

export default IonBorder
