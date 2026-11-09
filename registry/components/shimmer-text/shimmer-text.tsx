import { useEffect, useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import type { FontSizeKey, FontWeightKey } from '@ondai/tokens'
import { typeStyle, useMotion, useTheme } from '@ondai/tokens/react'

export interface ShimmerTextProps {
  children: string
  /** Sweep a highlight across the text. Off renders plain text in `color`. */
  active?: boolean
  size?: FontSizeKey
  weight?: FontWeightKey
  /** Resting color (and the color when inactive). Defaults to tertiary text while active, secondary otherwise. */
  color?: string
  /** Color at the center of the moving band. Defaults to primary text. */
  highlight?: string
  /** One pass, in ms. */
  duration?: number
  numberOfLines?: number
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  /** `progressbar` when the text is the only sign of work (ThinkingIndicator uses it). */
  accessibilityRole?: 'text' | 'progressbar'
  testID?: string
}

/** Slices that build the soft band. Each is a clipped copy of the text, so kerning and wrapping stay exact. */
const SLICES = 9
const profile = Array.from({ length: SLICES }, (_, i) => Math.pow(Math.sin((Math.PI * (i + 0.5)) / SLICES), 2))

/** Text with a light that runs across it while the model works. Calm, legible, never a spinner. */
export function ShimmerText({ children, active = true, size = 'sm', weight = 'medium', color, highlight, duration = 2200, numberOfLines, style, textStyle, accessibilityRole = 'text', testID }: ShimmerTextProps) {
  const t = useTheme()
  const motion = useMotion()
  const [box, setBox] = useState({ w: 0, h: 0 })
  const p = useSharedValue(0.45)
  const running = active && motion.enabled && box.w > 0
  const band = Math.max(56, Math.min(box.w * 0.45, 160))
  const slice = band / SLICES

  useEffect(() => {
    if (running) {
      p.value = 0
      p.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)
    } else {
      cancelAnimation(p)
      p.value = 0.45
    }
    return () => cancelAnimation(p)
  }, [running, duration, p])

  // The band travels from fully left of the text to fully right of it.
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: -band + p.value * (box.w + band) }] }), [p, band, box.w])
  const counter = useAnimatedStyle(() => ({ transform: [{ translateX: band - p.value * (box.w + band) }] }), [p, band, box.w])

  const base = typeStyle(t, size, { weight })
  const rest = color ?? (active ? t.colors.textTertiary : t.colors.textSecondary)
  const lit = highlight ?? t.colors.text
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (Math.abs(width - box.w) > 0.5 || Math.abs(height - box.h) > 0.5) setBox({ w: width, h: height })
  }

  return (
    <View testID={testID} style={[{ flexDirection: 'row', maxWidth: '100%' }, style]} accessibilityRole={accessibilityRole} accessibilityLabel={children}>
      <Text onLayout={onLayout} numberOfLines={numberOfLines} style={[base, { color: rest, flexShrink: 1 }, textStyle]}>
        {children}
      </Text>
      {active && box.w > 0 ? (
        <Animated.View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[{ position: 'absolute', top: 0, left: 0, width: band, height: box.h }, move]}>
          {profile.map((o, i) => (
            <View key={i} style={{ position: 'absolute', top: 0, left: i * slice, width: slice + 0.5, height: box.h, overflow: 'hidden', opacity: o }}>
              <Animated.View style={[{ position: 'absolute', top: 0, left: -i * slice, width: box.w }, counter]}>
                <Text numberOfLines={numberOfLines} style={[base, { color: lit }, textStyle, styles.copy, { width: box.w }]}>
                  {children}
                </Text>
              </Animated.View>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({ copy: { margin: 0 } })

export default ShimmerText
