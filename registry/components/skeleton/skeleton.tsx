import { useEffect, useId, useState } from 'react'
import { View, type DimensionValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import type { RadiusKey, SkinInput } from '@ondai/tokens'
import { useMotion, useSkin, useTheme } from '@ondai/tokens/react'

export interface SkeletonProps {
  width?: DimensionValue
  height?: number
  radius?: RadiusKey | number
  /** Render N text-like lines instead of one block. The last line is shorter. */
  lines?: number
  /** A soft light that sweeps across. Off by default: a flat placeholder at the final size reads calmer. */
  shimmer?: boolean
  /** A dashed edge round the block: an empty slot (a tag or a chip still to come) rather than a line of text. */
  dashed?: boolean
  /**
   * The look. Defaults to the nearest SkinProvider: the muted fill in `clean` and `minimal`, a see-through ink on
   * the expressive panels (candy, metal, glass, pop, shine), where a fixed grey would vanish.
   */
  skin?: SkinInput
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Loading placeholder: a flat block at the size of what will land there, in a fill that reads on the skin's panel. */
export function Skeleton({ width = '100%', height = 16, radius = 'sm', lines, shimmer = false, dashed = false, skin, style, testID }: SkeletonProps) {
  const fill = useSkin(skin).placeholder
  if (lines && lines > 1) {
    return (
      <View style={[{ gap: 8 }, style]} testID={testID} accessibilityLabel="Loading" accessibilityRole="progressbar">
        {Array.from({ length: lines }, (_, i) => (
          <Block key={i} width={i === lines - 1 ? '58%' : width} height={height} radius={radius} shimmer={shimmer} dashed={dashed} fill={fill} delay={i * 80} />
        ))}
      </View>
    )
  }
  return <Block width={width} height={height} radius={radius} shimmer={shimmer} dashed={dashed} fill={fill} style={style} testID={testID} />
}

function Block({ width, height, radius, shimmer, dashed, fill, delay = 0, style, testID }: Required<Pick<SkeletonProps, 'width' | 'height' | 'radius' | 'shimmer' | 'dashed'>> & { fill: string; delay?: number; style?: StyleProp<ViewStyle>; testID?: string }) {
  const t = useTheme()
  const motion = useMotion()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const r = typeof radius === 'number' ? radius : t.radii[radius]
  const [w, setW] = useState(0)
  const x = useSharedValue(0)
  useEffect(() => {
    if (shimmer && motion.enabled && w > 0) {
      x.value = 0
      x.value = withDelay(delay, withRepeat(withTiming(1, { duration: t.durations.shimmer, easing: Easing.inOut(Easing.quad) }), -1, false))
    } else {
      cancelAnimation(x)
      x.value = 0.5
    }
    return () => cancelAnimation(x)
  }, [shimmer, motion.enabled, w, x, t.durations.shimmer, delay])
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * 2 * w }] }), [x, w])
  const dark = t.scheme === 'dark'
  const lite = '#FFFFFF'
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))
  return (
    <View onLayout={onLayout} testID={testID} accessibilityRole="progressbar" accessibilityLabel="Loading" style={[{ width, height, borderRadius: r, backgroundColor: fill, overflow: 'hidden' }, dashed ? { borderWidth: 1, borderStyle: 'dashed', borderColor: t.colors.hairlineStrong } : null, style]}>
      {shimmer && w > 0 ? (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: w }, s]}>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id={`ondai-shimmer-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={lite} stopOpacity={0} />
                <Stop offset="0.5" stopColor={lite} stopOpacity={dark ? 0.06 : t.glass ? 0.25 : 0.6} />
                <Stop offset="1" stopColor={lite} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={height} fill={`url(#ondai-shimmer-${uid})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  )
}

export default Skeleton
