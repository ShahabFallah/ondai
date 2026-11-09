import { useEffect, useRef, useState } from 'react'
import { Image, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import type { RadiusKey } from '@ondai/tokens'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { grain } from './grain'

export interface ImageRevealProps {
  source: ImageSourcePropType
  width: number
  height: number
  radius?: RadiusKey | number
  /** 0 to 1, or `auto` to loop: resolve over 3.6 s, hold 2.4 s, fall back to noise in 0.9 s. */
  progress?: number | 'auto'
  /** Sampler steps. The grain re-rolls on every step, like a denoising pass. */
  steps?: number
  /** A quiet "Step 12 of 28" tag while the image resolves. */
  showSteps?: boolean
  /** Fires once each time progress reaches 1. */
  onRevealed?: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
  accessibilityLabel?: string
}

const REVEAL_MS = 3600
const HOLD_MS = 2400
const UNDO_MS = 900
const PERIOD_MS = REVEAL_MS + HOLD_MS + UNDO_MS
/** Still frame for `auto` when motion is off: mid-sampling, so the idea reads. */
const STILL_PROGRESS = 0.55
const GRAIN = 128

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a))
  return k * k * (3 - 2 * k)
}

function autoProgress(elapsed: number): number {
  const u = ((elapsed % PERIOD_MS) + PERIOD_MS) % PERIOD_MS
  if (u < REVEAL_MS) return 1 - Math.pow(1 - u / REVEAL_MS, 2.2)
  if (u < REVEAL_MS + HOLD_MS) return 1
  return 1 - (u - REVEAL_MS - HOLD_MS) / UNDO_MS
}

/** Deterministic hash of a step index into [0,1). */
function hash(n: number, salt: number): number {
  const s = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * An image arriving the way a diffusion sampler makes it: film grain over a heavily blurred colour field,
 * resolved in discrete steps, coarse to fine. Drive `progress` from your pipeline or let it loop.
 */
export function ImageReveal({ source, width, height, radius = 'lg', progress = 'auto', steps = 28, showSteps = false, onRevealed, style, testID, accessibilityLabel }: ImageRevealProps) {
  const t = useTheme()
  const motion = useMotion()
  const r = typeof radius === 'number' ? radius : t.radii[radius]
  const auto = progress === 'auto'
  const [autoP, setAutoP] = useState(auto && !motion.enabled ? STILL_PROGRESS : 0)

  // The auto loop only re-renders when the sampler moves to a new step.
  useEffect(() => {
    if (!auto) return
    if (!motion.enabled) {
      setAutoP(STILL_PROGRESS)
      return
    }
    const start = Date.now()
    let last = -1
    const h = setInterval(() => {
      const p = autoProgress(Date.now() - start)
      const step = Math.round(p * steps)
      if (step !== last) {
        last = step
        setAutoP(step / steps)
      }
    }, 40)
    return () => clearInterval(h)
  }, [auto, motion.enabled, steps])

  const p = clamp01(auto ? autoP : (progress as number))
  const step = Math.round(p * steps)
  const q = step / steps

  // Three focus layers: very blurred, softly blurred, sharp. The grain fades as the sampler converges.
  const soft = useSharedValue(smooth(0.2, 0.62, q))
  const sharp = useSharedValue(smooth(0.5, 0.97, q))
  const noise = useSharedValue(Math.pow(1 - q, 1.4))
  useEffect(() => {
    const go = (v: number) => (motion.enabled ? withTiming(v, { duration: 140, easing: Easing.out(Easing.quad) }) : v)
    soft.value = go(smooth(0.2, 0.62, q))
    sharp.value = go(smooth(0.5, 0.97, q))
    noise.value = go(Math.pow(1 - q, 1.4))
  }, [q, motion.enabled, soft, sharp, noise])
  const softStyle = useAnimatedStyle(() => ({ opacity: soft.value }), [soft])
  const sharpStyle = useAnimatedStyle(() => ({ opacity: sharp.value }), [sharp])
  const grainStyle = useAnimatedStyle(() => ({ opacity: noise.value * 0.62 }), [noise])

  const revealed = q >= 1
  const fired = useRef(false)
  useEffect(() => {
    if (revealed && !fired.current) {
      fired.current = true
      onRevealed?.()
    } else if (!revealed) fired.current = false
  }, [revealed, onRevealed])

  // A fresh grain offset per step, so the noise re-rolls instead of sliding.
  const ox = Math.floor(hash(step, 1) * GRAIN)
  const oy = Math.floor(hash(step, 2) * GRAIN)
  const blurBig = Math.max(12, Math.round(Math.min(width, height) * 0.12))
  const blurSoft = Math.max(4, Math.round(blurBig * 0.3))

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: !revealed }}
      style={[{ width, height, borderRadius: r, overflow: 'hidden', backgroundColor: t.colors.muted, borderWidth: hairlineWidth, borderColor: t.colors.hairline }, style]}
    >
      <Image source={source} blurRadius={blurBig} resizeMode="cover" style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.08 }] }]} />
      <Animated.View style={[StyleSheet.absoluteFill, softStyle]}>
        <Image source={source} blurRadius={blurSoft} resizeMode="cover" style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.02 }] }]} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, sharpStyle]}>
        <Image source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View testID={testID ? `${testID}-overlay` : undefined} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, grainStyle]}>
        <Image source={grain} resizeMode="repeat" style={[{ position: 'absolute', left: -ox, top: -oy, width: width + GRAIN, height: height + GRAIN }, { mixBlendMode: 'overlay' } as object]} />
      </Animated.View>
      {showSteps && !revealed ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 8, height: 22, borderRadius: 6, justifyContent: 'center', backgroundColor: 'rgba(10,10,12,0.42)' }}>
          <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: '#FFFFFF', fontVariant: ['tabular-nums'] }]}>{`Step ${step} of ${steps}`}</Text>
        </View>
      ) : null}
    </View>
  )
}

export default ImageReveal
