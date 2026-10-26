import { useEffect, useRef, useState } from 'react'
import { Text, type StyleProp, type TextStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import type { FontSizeKey, FontWeightKey } from '@ondai/tokens'
import { alpha } from '@ondai/tokens'
import { typeStyle, useMotion, useTheme } from '@ondai/tokens/react'

export interface StreamingTextProps {
  text: string
  /** While true, a soft accent caret blinks at the end and new chunks fade in. */
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

/** Token-by-token text: the newest chunk fades in (120ms), a caret blinks while streaming. No layout jumps. */
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
        chunkT.value = withTiming(1, { duration: t.durations.chunk, easing: Easing.out(Easing.quad) })
      } else chunkT.value = 1
    } else {
      setParts({ committed: text, latest: '' })
    }
    prev.current = text
  }, [text, motion.enabled, chunkT, t.durations.chunk])

  useEffect(() => {
    if (streaming && caret && motion.enabled) {
      blink.value = withRepeat(withSequence(withTiming(0, { duration: t.durations.caret / 2 }), withTiming(1, { duration: t.durations.caret / 2 })), -1, false)
    } else {
      cancelAnimation(blink)
      blink.value = 1
    }
    return () => cancelAnimation(blink)
  }, [streaming, caret, motion.enabled, blink, t.durations.caret])

  const faded = alpha(fg.startsWith('#') ? fg : '#9BA1A9', 0)
  const latestStyle = useAnimatedStyle(() => ({ color: interpolateColor(chunkT.value, [0, 1], [faded, fg]) }), [chunkT, fg, faded])
  const caretStyle = useAnimatedStyle(() => ({ opacity: blink.value }), [blink])

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
      {streaming && caret ? (
        <Animated.Text style={[caretStyle, { color: t.colors.accent.solid }]} accessibilityElementsHidden>
          {' ▍'}
        </Animated.Text>
      ) : null}
    </Text>
  )
}

export default StreamingText
