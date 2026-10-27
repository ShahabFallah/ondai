import { useEffect, useId, useState } from 'react'
import { Platform, Pressable, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue, withRepeat, withSpring, withTiming, type SharedValue } from 'react-native-reanimated'
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Mic, MicOff, RotateCcw, Square } from 'lucide-react-native'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { StreamingText } from '../streaming-text/streaming-text'
import { useVoiceInput, type UseVoiceInputOptions, type VoiceInputState, type VoiceInputStatus } from './use-voice-input'

export interface VoiceInputProps extends UseVoiceInputOptions {
  /** `pill`: one row for a toolbar or a composer. `card`: a larger stage with the transcript above the mic. */
  presentation?: 'pill' | 'card'
  /** `bars`: a thin rippling waveform. `glow`: a soft accent bloom rising from the bottom edge. */
  visual?: 'bars' | 'glow'
  /** `hold`: press and hold the mic. `tap`: tap to start, tap again to stop. */
  mode?: 'hold' | 'tap'
  /** Idle hint. Defaults to "Hold to talk" / "Tap to talk". */
  label?: string
  /** The user accepted the transcript with "Use". */
  onUse?: (text: string) => void
  /** Bring your own `useVoiceInput()` when something else drives it (a hardware button, a shortcut, a demo). */
  controller?: VoiceInputState
  style?: StyleProp<ViewStyle>
  testID?: string
}

const copy = {
  listening: 'Listening',
  thinking: 'Transcribing',
  unavailable: 'Transcription isn’t available on this device.',
} as const

/**
 * Push-to-talk that transcribes on device. A round mic, a level-driven waveform or bloom while you speak,
 * a slow sweep while the model transcribes, then the transcript with Use and Retry.
 */
export function VoiceInput({ presentation = 'pill', visual = 'bars', mode = 'hold', label, onUse, controller, style, testID, ...hookOptions }: VoiceInputProps) {
  const t = useTheme()
  const motion = useMotion()
  const own = useVoiceInput(hookOptions)
  const voice = controller ?? own
  const { status, transcript, level } = voice
  const hint = label || (mode === 'hold' ? 'Hold to talk' : 'Tap to talk')
  const frozen = !motion.enabled
  const [size, setSize] = useState({ w: 0, h: 0 })
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height })
  }

  useEffect(() => {
    if (status === 'listening') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    if (status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [status])

  const start = () => void voice.start()
  const stop = () => void voice.stop()
  const retry = () => {
    voice.reset()
    if (mode === 'tap') void voice.start()
  }
  const use = () => {
    onUse?.(transcript)
    voice.reset()
  }

  const busy = status === 'listening' || status === 'thinking'
  const barMode: BarMode = status === 'listening' ? 'listening' : status === 'thinking' ? 'thinking' : 'off'
  const glow = visual === 'glow' && size.w > 0 ? <Glow level={level} mode={barMode} width={size.w} height={size.h} frozen={frozen} /> : null
  const message =
    status === 'unavailable' ? (
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary }]}>{copy.unavailable}</Text>
    ) : status === 'error' ? (
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.danger }]}>{voice.error?.message ?? 'Something went wrong. Try again.'}</Text>
    ) : null
  const actions = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Button title="Use" size="sm" variant="solid" onPress={use} testID={testID ? `${testID}-use` : undefined} />
      <Button icon={<RotateCcw size={14} color={t.colors.textSecondary} strokeWidth={1.75} />} size="sm" variant="ghost" accessibilityLabel="Retry" onPress={retry} />
    </View>
  )
  const transcriptView = (
    <View accessible accessibilityLabel={`Transcript: ${transcript}`} accessibilityLiveRegion="polite">
      <StreamingText text={transcript} caret={false} size="md" numberOfLines={presentation === 'pill' ? 3 : undefined} />
    </View>
  )

  if (presentation === 'card') {
    const tag = status === 'listening' ? copy.listening : status === 'thinking' ? copy.thinking : status === 'done' ? 'Transcript' : 'Voice'
    return (
      <View
        testID={testID}
        onLayout={onLayout}
        style={[
          { borderRadius: t.radii.xl, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: t.colors.surface, overflow: 'hidden', padding: 20, gap: 16 },
          style,
        ]}
      >
        {glow}
        <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: busy ? t.colors.textSecondary : t.colors.textTertiary }]}>{tag}</Text>
        <View style={{ minHeight: 56, justifyContent: 'center' }}>
          {status === 'done' ? (
            <View style={{ gap: 14 }}>
              {transcriptView}
              {actions}
            </View>
          ) : message ? (
            message
          ) : visual === 'bars' ? (
            <View style={{ alignItems: 'center' }}>
              <Bars level={level} mode={barMode} height={40} count={28} barWidth={3} gap={4} frozen={frozen} />
            </View>
          ) : (
            <Text style={[typeStyle(t, 'md'), { color: busy ? t.colors.textSecondary : t.colors.textTertiary, textAlign: 'center' }]}>
              {status === 'listening' ? 'Listening…' : status === 'thinking' ? 'Transcribing…' : 'Say what you need.'}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <MicButton size={56} status={status} mode={mode} level={level} frozen={frozen} onStart={start} onStop={stop} hint={hint} testID={testID ? `${testID}-mic` : undefined} />
          <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>{status === 'listening' ? (mode === 'hold' ? 'Release to stop' : 'Tap to stop') : status === 'thinking' ? ' ' : hint}</Text>
        </View>
      </View>
    )
  }

  const middle =
    status === 'done' ? (
      transcriptView
    ) : message ? (
      message
    ) : busy && visual === 'bars' ? (
      <Bars level={level} mode={barMode} height={28} count={22} barWidth={3} gap={3} frozen={frozen} />
    ) : busy ? (
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{status === 'listening' ? 'Listening…' : 'Transcribing…'}</Text>
    ) : (
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{hint}</Text>
    )
  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 56,
          paddingLeft: 8,
          paddingRight: status === 'done' ? 8 : 16,
          paddingVertical: 8,
          borderRadius: t.radii.pill,
          borderWidth: hairlineWidth,
          borderColor: t.colors.hairline,
          backgroundColor: t.colors.surface,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {glow}
      <MicButton size={40} status={status} mode={mode} level={level} frozen={frozen} onStart={start} onStop={stop} hint={hint} testID={testID ? `${testID}-mic` : undefined} />
      <View style={{ flex: 1, justifyContent: 'center', minHeight: 24 }}>{middle}</View>
      {status === 'done' ? actions : busy && visual === 'bars' ? <Text style={[typeStyle(t, 'xs', { mono: true, tag: true, weight: 'medium' }), { color: t.colors.textTertiary }]}>{status === 'listening' ? copy.listening : copy.thinking}</Text> : null}
    </View>
  )
}

type BarMode = 'listening' | 'thinking' | 'off'

function MicButton({ size, status, mode, level, frozen, onStart, onStop, hint, testID }: { size: number; status: VoiceInputStatus; mode: 'hold' | 'tap'; level: SharedValue<number>; frozen: boolean; onStart: () => void; onStop: () => void; hint: string; testID?: string }) {
  const t = useTheme()
  const motion = useMotion()
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const listening = status === 'listening'
  const thinking = status === 'thinking'
  const disabled = thinking || status === 'unavailable'
  const fill = listening ? t.colors.accent.solid : thinking ? t.colors.elevated : status === 'unavailable' ? t.colors.input : t.colors.accent.soft
  const iconColor = listening ? t.colors.onAccent : thinking || status === 'unavailable' ? t.colors.textTertiary : t.colors.accent.solid
  const a11y = status === 'unavailable' ? 'Voice input unavailable' : thinking ? 'Transcribing' : listening ? (mode === 'hold' ? 'Listening, release to stop' : 'Stop listening') : mode === 'hold' ? hint : 'Start listening'

  const haloOn = useSharedValue(0)
  useEffect(() => {
    haloOn.value = motion.enabled ? withTiming(listening ? 1 : 0, { duration: listening ? 260 : 400, easing: Easing.out(Easing.cubic) }) : listening ? 1 : 0
  }, [listening, motion.enabled, haloOn])
  const haloStyle = useAnimatedStyle(() => {
    const l = frozen ? 0.62 : level.value
    return { opacity: haloOn.value * (0.12 + 0.28 * l), transform: [{ scale: 1 + (0.12 + l * 0.55) * haloOn.value }] }
  }, [haloOn, level, frozen])

  const spin = useSharedValue(0)
  useEffect(() => {
    if (thinking && motion.enabled) {
      spin.value = 0
      spin.value = withRepeat(withTiming(360, { duration: 1100, easing: Easing.linear }), -1, false)
    } else {
      cancelAnimation(spin)
      spin.value = 40
    }
    return () => cancelAnimation(spin)
  }, [thinking, motion.enabled, spin])
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }), [spin])

  const ring = size + 8
  const r = ring / 2 - 1
  const c = 2 * Math.PI * r
  const iconSize = Math.round(size * 0.45)
  const shadow: ViewStyle =
    listening && Platform.OS === 'web'
      ? ({ boxShadow: `0 0 ${Math.round(size * 0.5)}px ${t.colors.accent.glow}` } as unknown as ViewStyle)
      : listening
        ? { shadowColor: t.colors.accent.solid, shadowOpacity: 0.35, shadowRadius: size * 0.35, shadowOffset: { width: 0, height: 0 } }
        : {}
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.accent.solid }, haloStyle]} />
      {thinking ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: ring, height: ring }, spinStyle]}>
          <Svg width={ring} height={ring}>
            <Defs>
              <LinearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={t.colors.accent.a} />
                <Stop offset="1" stopColor={t.colors.accent.c} />
              </LinearGradient>
            </Defs>
            <Circle cx={ring / 2} cy={ring / 2} r={r} stroke={`url(#${id}-ring)`} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeDasharray={`${c * 0.26} ${c * 0.74}`} />
          </Svg>
        </Animated.View>
      ) : null}
      <Pressable
        onPressIn={mode === 'hold' && !listening ? onStart : undefined}
        onPressOut={mode === 'hold' ? onStop : undefined}
        onPress={mode === 'tap' ? (listening ? onStop : onStart) : undefined}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ disabled, busy: thinking }}
        hitSlop={8}
        testID={testID}
        style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed && !disabled ? 0.94 : 1 }] }, shadow]}
      >
        {listening ? (
          <Square size={Math.round(iconSize * 0.68)} color={iconColor} fill={iconColor} strokeWidth={1} />
        ) : status === 'unavailable' ? (
          <MicOff size={iconSize} color={iconColor} strokeWidth={1.75} />
        ) : (
          <Mic size={iconSize} color={iconColor} strokeWidth={1.75} />
        )}
      </Pressable>
    </View>
  )
}

/** Thin rounded bars following the level. Bars away from the centre lag a few frames, so a loud syllable ripples outward. */
function Bars({ level, mode, height, count, barWidth, gap, frozen }: { level: SharedValue<number>; mode: BarMode; height: number; count: number; barWidth: number; gap: number; frozen: boolean }) {
  const t = useTheme()
  const motion = useMotion()
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const width = count * (barWidth + gap) - gap
  const tick = useSharedValue(0.37)
  const modeT = useSharedValue(mode === 'thinking' ? 1 : 0)
  const on = useSharedValue(mode === 'off' ? 0 : 1)

  useEffect(() => {
    const think = mode === 'thinking' ? 1 : 0
    const live = mode === 'off' ? 0 : 1
    if (motion.enabled) {
      modeT.value = withTiming(think, { duration: 520, easing: Easing.inOut(Easing.cubic) })
      on.value = withTiming(live, { duration: 320, easing: Easing.out(Easing.cubic) })
    } else {
      modeT.value = think
      on.value = live
    }
  }, [mode, motion.enabled, modeT, on])

  useEffect(() => {
    if (motion.enabled && mode !== 'off') {
      tick.value = 0
      tick.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false)
    } else {
      cancelAnimation(tick)
      tick.value = 0.37
    }
    return () => cancelAnimation(tick)
  }, [motion.enabled, mode, tick])

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`${id}-bars`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={t.colors.accent.a} />
            <Stop offset="0.5" stopColor={t.colors.accent.b} />
            <Stop offset="1" stopColor={t.colors.accent.c} />
          </LinearGradient>
        </Defs>
        {Array.from({ length: count }, (_, i) => (
          <Bar key={i} i={i} count={count} level={level} tick={tick} modeT={modeT} on={on} height={height} width={barWidth} gap={gap} fill={`url(#${id}-bars)`} frozen={frozen} />
        ))}
      </Svg>
    </View>
  )
}

const AnimatedRect = Animated.createAnimatedComponent(Rect)

function Bar({ i, count, level, tick, modeT, on, height, width, gap, fill, frozen }: { i: number; count: number; level: SharedValue<number>; tick: SharedValue<number>; modeT: SharedValue<number>; on: SharedValue<number>; height: number; width: number; gap: number; fill: string; frozen: boolean }) {
  const c = (count - 1) / 2
  const dist = Math.abs(i - c) / c
  const bell = 0.32 + 0.68 * Math.exp(-dist * dist * 1.7)
  const lag = Math.abs(i - c) / c
  const x = i * (width + gap)
  const minH = width
  const still = staticLevel(i, count)
  // Each bar chases the level on its own spring, softer toward the edges, so a loud syllable ripples outward.
  // (A spring keeps its velocity across the per-frame retarget; a timing would restart at progress 0 every frame.)
  const stiffness = 420 - lag * 300
  const lagged = useDerivedValue(() => withSpring(level.value, { damping: 18, stiffness, mass: 1, overshootClamping: false }), [level, stiffness])
  const props = useAnimatedProps(() => {
    const l = frozen ? still : lagged.value
    const ph = tick.value * Math.PI * 2
    const wave = 0.74 + 0.26 * Math.sin(ph * 1.5 + i * 0.55)
    const listen = Math.min(1, l * 1.45) * bell * wave
    const d = i / (count - 1) - tick.value
    const sweep = Math.exp(-d * d * 36)
    const think = 0.07 + 0.3 * sweep + 0.04 * Math.sin(ph * 2 + i * 0.4)
    const amp = (listen * (1 - modeT.value) + think * modeT.value) * on.value
    const h = Math.max(minH, Math.min(height, amp * height))
    return { height: h, y: (height - h) / 2 }
  }, [lagged, tick, modeT, on, bell, i, count, height, minH, frozen, still])
  return <AnimatedRect x={x} width={width} rx={width / 2} fill={fill} animatedProps={props} />
}

/** A plausible speech snapshot for frozen frames (review, reduced motion). */
function staticLevel(i: number, count: number): number {
  const c = (count - 1) / 2
  const dist = Math.abs(i - c) / c
  const bell = 0.3 + 0.7 * Math.exp(-dist * dist * 1.6)
  return bell * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + 0.6)))
}

/** A soft accent bloom anchored to the bottom edge. Scales with the level while listening, breathes while transcribing. */
function Glow({ level, mode, width, height, frozen }: { level: SharedValue<number>; mode: BarMode; width: number; height: number; frozen: boolean }) {
  const t = useTheme()
  const motion = useMotion()
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const tick = useSharedValue(0.25)
  const modeT = useSharedValue(mode === 'thinking' ? 1 : 0)
  const on = useSharedValue(mode === 'off' ? 0 : 1)
  useEffect(() => {
    const think = mode === 'thinking' ? 1 : 0
    const live = mode === 'off' ? 0 : 1
    if (motion.enabled) {
      modeT.value = withTiming(think, { duration: 600, easing: Easing.inOut(Easing.cubic) })
      on.value = withTiming(live, { duration: live ? 360 : t.durations.settle, easing: Easing.out(Easing.cubic) })
    } else {
      modeT.value = think
      on.value = live
    }
  }, [mode, motion.enabled, modeT, on, t.durations.settle])
  useEffect(() => {
    if (motion.enabled && mode !== 'off') {
      tick.value = 0
      tick.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false)
    } else {
      cancelAnimation(tick)
      tick.value = 0.25
    }
    return () => cancelAnimation(tick)
  }, [motion.enabled, mode, tick])
  const style = useAnimatedStyle(() => {
    const l = frozen ? 0.62 : level.value
    const breath = 0.42 + 0.16 * Math.sin(tick.value * Math.PI * 2)
    const k = (0.18 + 0.82 * l) * (1 - modeT.value) + breath * modeT.value
    return {
      opacity: on.value * (0.5 + 0.5 * k),
      transform: [{ translateX: Math.sin(tick.value * Math.PI * 2) * modeT.value * width * 0.06 }, { translateY: height / 2 }, { scaleY: Math.max(0.001, (0.25 + k * 1.05) * on.value) }, { translateY: -height / 2 }],
    }
  }, [level, tick, modeT, on, width, height, frozen])
  const dark = t.scheme === 'dark'
  const peak = dark ? 0.75 : 0.5
  const mid = dark ? 0.3 : 0.18
  const g = t.colors.accent
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute', left: 0, top: 0, width, height }, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={`${id}-a`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={g.a} stopOpacity={peak * 0.8} />
            <Stop offset="0.5" stopColor={g.a} stopOpacity={mid} />
            <Stop offset="1" stopColor={g.a} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-b`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={g.b} stopOpacity={peak} />
            <Stop offset="0.45" stopColor={g.b} stopOpacity={mid} />
            <Stop offset="1" stopColor={g.b} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-c`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={g.c} stopOpacity={peak * 0.8} />
            <Stop offset="0.5" stopColor={g.c} stopOpacity={mid} />
            <Stop offset="1" stopColor={g.c} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width * 0.24} cy={height * 1.02} rx={width * 0.34} ry={height * 0.9} fill={`url(#${id}-a)`} />
        <Ellipse cx={width * 0.76} cy={height * 1.02} rx={width * 0.34} ry={height * 0.9} fill={`url(#${id}-c)`} />
        <Ellipse cx={width * 0.5} cy={height * 1.04} rx={width * 0.46} ry={height * 1.05} fill={`url(#${id}-b)`} />
      </Svg>
    </Animated.View>
  )
}

export default VoiceInput
