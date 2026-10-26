import { useEffect, useState } from 'react'
import { View, type DimensionValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import type { RadiusKey } from '@ondai/tokens'
import { useMotion, useTheme } from '@ondai/tokens/react'

export interface SkeletonProps {
  width?: DimensionValue
  height?: number
  radius?: RadiusKey | number
  /** Render N text-like lines instead of one block. The last line is shorter. */
  lines?: number
  /** The ion shimmer that sweeps across while loading. */
  shimmer?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Loading placeholder with a faint ion shimmer. Quiet gray otherwise. */
export function Skeleton({ width = '100%', height = 16, radius = 'sm', lines, shimmer = true, style, testID }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <View style={[{ gap: 8 }, style]} testID={testID} accessibilityLabel="Loading" accessibilityRole="progressbar">
        {Array.from({ length: lines }, (_, i) => (
          <Block key={i} width={i === lines - 1 ? '62%' : width} height={height} radius={radius} shimmer={shimmer} delay={i * 80} />
        ))}
      </View>
    )
  }
  return <Block width={width} height={height} radius={radius} shimmer={shimmer} style={style} testID={testID} />
}

function Block({ width, height, radius, shimmer, delay = 0, style, testID }: Required<Pick<SkeletonProps, 'width' | 'height' | 'radius' | 'shimmer'>> & { delay?: number; style?: StyleProp<ViewStyle>; testID?: string }) {
  const t = useTheme()
  const motion = useMotion()
  const r = typeof radius === 'number' ? radius : t.radii[radius]
  const [w, setW] = useState(0)
  const x = useSharedValue(0)
  useEffect(() => {
    if (shimmer && motion.enabled && w > 0) {
      x.value = 0
      x.value = withRepeat(withTiming(1, { duration: t.durations.shimmer, easing: Easing.inOut(Easing.quad) }), -1, false)
    } else {
      cancelAnimation(x)
      x.value = 0.5
    }
    return () => cancelAnimation(x)
  }, [shimmer, motion.enabled, w, x, t.durations.shimmer, delay])
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * 2 * w }] }), [x, w])
  const g = t.colors.accent
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))
  return (
    <View onLayout={onLayout} testID={testID} accessibilityLabel="Loading" style={[{ width, height, borderRadius: r, backgroundColor: t.colors.input, overflow: 'hidden' }, style]}>
      {shimmer && w > 0 ? (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: w }, s]}>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="ondai-shimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={g.a} stopOpacity={0} />
                <Stop offset="0.5" stopColor={g.b} stopOpacity={t.scheme === 'dark' ? 0.22 : 0.16} />
                <Stop offset="1" stopColor={g.c} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={height} fill="url(#ondai-shimmer)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  )
}

export default Skeleton
