import { useEffect, useRef, useState } from 'react'
import { Platform, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import type { FontSizeKey, FontWeightKey } from '@ondai/tokens'
import { alpha } from '@ondai/tokens'
import { typeStyle, useMotion, useTheme } from '@ondai/tokens/react'

export interface StreamingTextProps {
  text: string
  /** While true, a thin accent caret breathes at the end and new chunks fade in. */
  streaming?: boolean
  size?: FontSizeKey
  weight?: FontWeightKey
  mono?: boolean
  color?: string
  caret?: boolean
  numberOfLines?: number
  style?: StyleProp<TextStyle>
  testID?: string
  /** Text shown (dimmed) when `text` is empty and not streaming. */
  placeholder?: string
}

const CHUNK_MS = 180

/** A 2px bar that sits inline after the last glyph, spanning ascender to descender. */
function caretBox(px: number, color: string): StyleProp<ViewStyle> {
  const h = Math.round(px * 1.15)
  const box: ViewStyle = { width: 2, height: h, marginLeft: 2, borderRadius: 1, backgroundColor: color }
  // Web flows it like a glyph; native inline views sit on the baseline, so nudge it down by the descent.
  return Platform.OS === 'web' ? [box, { display: 'inline-block', verticalAlign: 'text-bottom' } as unknown as ViewStyle] : [box, { transform: [{ translateY: Math.round(px * 0.22) }] }]
}

/** Token-by-token text: the newest chunk fades in, a 2px caret breathes while streaming. No layout jumps. */
export function StreamingText({ text, streaming = false, size = 'md', weight = 'regular', mono = false, color, caret = true, numberOfLines, style, testID, placeholder }: StreamingTextProps) {
  const t = useTheme()
  const motion = useMotion()
  const fg = color ?? t.colors.text
  const [parts, setParts] = useState<{ committed: string; latest: string }>({ committed: text, latest: '' })
  const prev = useRef(text)
  const chunkT = useSharedValue(1)
  const blink = useSharedValue(1)

  useEffect(() => {
    if (text === prev.current) return
    if (text.startsWith(prev.current)) {
      const delta = text.slice(prev.current.length)
      setParts({ committed: prev.current, latest: delta })
      if (motion.enabled) {
        chunkT.value = 0
        chunkT.value = withTiming(1, { duration: CHUNK_MS, easing: Easing.out(Easing.cubic) })
      } else chunkT.value = 1
    } else {
      setParts({ committed: text, latest: '' })
    }
    prev.current = text
  }, [text, motion.enabled, chunkT])

  useEffect(() => {
    if (streaming && caret && motion.enabled) {
      const half = { duration: t.durations.caret / 2, easing: Easing.inOut(Easing.quad) }
      blink.value = withRepeat(withSequence(withTiming(0.2, half), withTiming(1, half)), -1, false)
    } else {
      cancelAnimation(blink)
      blink.value = 1
    }
    return () => cancelAnimation(blink)
  }, [streaming, caret, motion.enabled, blink, t.durations.caret])

  const faded = alpha(fg.startsWith('#') ? fg : '#9BA1A9', 0)
  const latestStyle = useAnimatedStyle(() => ({ color: interpolateColor(chunkT.value, [0, 1], [faded, fg]) }), [chunkT, fg, faded])
  const caretStyle = useAnimatedStyle(() => ({ opacity: blink.value }), [blink])

  const px = t.fontSizes[size]
  const base = [typeStyle(t, size, { weight, mono }), { color: fg }, style]
  if (!text && !streaming && placeholder) {
    return (
      <Text testID={testID} style={[base, { color: t.colors.textTertiary }]}>
        {placeholder}
      </Text>
    )
  }
  return (
    <Text testID={testID} numberOfLines={numberOfLines} style={base} accessibilityLiveRegion={streaming ? 'polite' : 'none'}>
      {parts.committed}
      {parts.latest ? <Animated.Text style={latestStyle}>{parts.latest}</Animated.Text> : null}
      {streaming && caret ? <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[caretStyle, caretBox(px, t.colors.accent.solid)]} /> : null}
    </Text>
  )
}

export default StreamingText
