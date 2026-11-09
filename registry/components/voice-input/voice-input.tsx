import { useEffect, useId, useState, type ComponentType, type ReactNode } from 'react'
import { Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue, withRepeat, withSpring, withTiming, type SharedValue } from 'react-native-reanimated'
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Mic, MicOff, RotateCcw, Square } from 'lucide-react-native'
import { type FontSizeKey, type SkinInput, type SkinTokens } from '@ondai/tokens'
import { SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { StreamingText } from '../streaming-text/streaming-text'
import { Surface } from '../surface/surface'
import { useVoiceInput, type UseVoiceInputOptions, type VoiceInputState, type VoiceInputStatus } from './use-voice-input'

/** Every icon VoiceInput draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface VoiceInputIcons {
  /** The mic key at rest. */
  mic: IconInput
  /** The mic key while it listens. */
  stop: IconInput
  /** The mic key when no transcription provider is ready. */
  unavailable: IconInput
  /** The retry key after a transcript. */
  retry: IconInput
  /** Optional icon on the Use key (none by default). */
  use: IconInput
}

/** Every string VoiceInput shows or announces. */
export interface VoiceInputLabels {
  /** Idle hints, per `mode`. */
  holdHint: string
  tapHint: string
  listening: string
  transcribing: string
  /** Under the card's mic while it listens, per `mode`. */
  releaseToStop: string
  tapToStop: string
  /** The card's line before anyone speaks (glow visual). */
  prompt: string
  /** The card's tag at rest and after a transcript. */
  voice: string
  transcript: string
  use: string
  retry: string
  unavailable: string
  error: string
  /** Screen reader names for the mic key. */
  start: string
  stop: string
  holding: string
  unavailableKey: string
}

export interface VoiceInputStyles {
  /** The panel. */
  container: StyleProp<ViewStyle>
  /** The view round the mic key. */
  mic: StyleProp<ViewStyle>
  /** The status line or hint. */
  status: StyleProp<TextStyle>
  transcript: StyleProp<ViewStyle>
  actions: StyleProp<ViewStyle>
}

export const voiceInputLabels: VoiceInputLabels = {
  holdHint: 'Hold to talk',
  tapHint: 'Tap to talk',
  listening: 'Listening',
  transcribing: 'Transcribing',
  releaseToStop: 'Release to stop',
  tapToStop: 'Tap to stop',
  prompt: 'Say what you need.',
  voice: 'Voice',
  transcript: 'Transcript',
  use: 'Use',
  retry: 'Retry',
  unavailable: 'Transcription isn’t available on this device.',
  error: 'Something went wrong. Try again.',
  start: 'Start listening',
  stop: 'Stop listening',
  holding: 'Listening, release to stop',
  unavailableKey: 'Voice input unavailable',
}

/** What a custom mic key gets. */
export interface VoiceMicProps {
  status: VoiceInputStatus
  mode: 'hold' | 'tap'
  listening: boolean
  disabled: boolean
  start: () => void
  stop: () => void
}

/** What custom actions get once there is a transcript. */
export interface VoiceActionsProps {
  transcript: string
  use: () => void
  retry: () => void
}

export interface VoiceInputProps extends UseVoiceInputOptions {
  /** `pill`: one row for a toolbar or a composer. `card`: a larger stage with the transcript above the mic. */
  presentation?: 'pill' | 'card'
  /** `bars`: a rippling waveform drawn in the variant. `glow`: a soft bloom rising from the bottom edge. */
  visual?: 'bars' | 'glow'
  /** `hold`: press and hold the mic. `tap`: tap to start, tap again to stop. */
  mode?: 'hold' | 'tap'
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the panel,
   * the mic key, the waveform and the actions together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the mic key, the waveform and the glow. Defaults to the accent. */
  tint?: string
  /** Panel corner radius. Defaults to the variant's. */
  radius?: number
  /** Shortcut for the idle hint (`labels.holdHint` or `labels.tapHint`, per `mode`). */
  label?: string
  icons?: Partial<VoiceInputIcons>
  labels?: Partial<VoiceInputLabels>
  styles?: Partial<VoiceInputStyles>
  /** Draw the mic key yourself. Call `start()` and `stop()`. */
  renderMic?: (props: VoiceMicProps) => ReactNode
  /** Draw the transcript yourself. */
  renderTranscript?: (transcript: string) => ReactNode
  /** Replace Use and Retry. */
  renderActions?: (props: VoiceActionsProps) => ReactNode
  /** The user accepted the transcript with "Use". */
  onUse?: (text: string) => void
  /** Bring your own `useVoiceInput()` when something else drives it (a hardware button, a shortcut, a demo). */
  controller?: VoiceInputState
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<VoiceInputProps['size']>
type KeySize = 'sm' | 'md' | 'lg'
const sizes: Record<Size, { pillKey: KeySize; cardKey: KeySize; text: FontSizeKey; status: FontSizeKey; pillBars: number; cardBars: number; pad: number; gap: number }> = {
  sm: { pillKey: 'sm', cardKey: 'md', text: 'sm', status: 'xs', pillBars: 22, cardBars: 32, pad: 16, gap: 12 },
  md: { pillKey: 'md', cardKey: 'lg', text: 'md', status: 'sm', pillBars: 28, cardBars: 40, pad: 20, gap: 16 },
  lg: { pillKey: 'lg', cardKey: 'lg', text: 'lg', status: 'md', pillBars: 34, cardBars: 48, pad: 24, gap: 18 },
}
const keyHeights = { sm: 32, md: 38, lg: 46 } as const

/** The stop glyph: a small filled square in the key's own ink. */
function StopGlyph({ color, size = 16 }: IconProps) {
  return <Square size={Math.round(size * 0.72)} strokeWidth={2.5} color={color} fill={color} />
}

/** A key icon: the override, else the default. Components are coloured by the key, so they follow the variant. */
const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

/**
 * Push-to-talk that transcribes on device. The mic is the variant's primary key; a waveform drawn in the
 * variant follows the voice, sweeps while the model transcribes, then the transcript comes back with Use and Retry.
 */
export function VoiceInput({ variant, tint, ...props }: VoiceInputProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <Voice {...props} tinted={!!tint} />
    </SkinProvider>
  )
}

function Voice({
  presentation = 'pill',
  visual = 'bars',
  mode = 'hold',
  size = 'md',
  radius,
  label,
  icons = {},
  labels: labelsProp,
  styles = {},
  renderMic,
  renderTranscript,
  renderActions,
  onUse,
  controller,
  style,
  testID,
  tinted,
  ...hookOptions
}: Omit<VoiceInputProps, 'variant' | 'tint'> & { tinted: boolean }) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const own = useVoiceInput(hookOptions)
  const voice = controller ?? own
  const { status, transcript, level } = voice
  const labels: VoiceInputLabels = { ...voiceInputLabels, ...labelsProp, ...(label ? { holdHint: label, tapHint: label } : null) }
  const hint = mode === 'hold' ? labels.holdHint : labels.tapHint
  const frozen = !motion.enabled
  const [box, setBox] = useState({ w: 0, h: 0 })
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height })
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
  const done = status === 'done'
  const barMode: BarMode = status === 'listening' ? 'listening' : status === 'thinking' ? 'thinking' : 'off'
  const glow = visual === 'glow' && box.w > 0 ? <Glow level={level} mode={barMode} width={box.w} height={box.h} frozen={frozen} tint={tinted ? s.tint : undefined} /> : null
  const statusText = [typeStyle(t, z.status), { color: t.colors.textSecondary }, styles.status]
  const message =
    status === 'unavailable' ? (
      <Text style={[typeStyle(t, z.status), { color: t.colors.textTertiary }, styles.status]}>{labels.unavailable}</Text>
    ) : status === 'error' ? (
      <Text style={[typeStyle(t, z.status), { color: t.colors.danger }, styles.status]}>{voice.error?.message ?? labels.error}</Text>
    ) : null

  const keySize = presentation === 'card' ? z.cardKey : z.pillKey
  const mic = renderMic ? (
    renderMic({ status, mode, listening: status === 'listening', disabled: status === 'thinking' || status === 'unavailable', start, stop })
  ) : (
    <MicKey size={keySize} status={status} mode={mode} level={level} frozen={frozen} onStart={start} onStop={stop} hint={hint} labels={labels} icons={icons} testID={testID ? `${testID}-mic` : undefined} />
  )
  const actions = renderActions ? (
    renderActions({ transcript, use, retry })
  ) : (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, styles.actions]}>
      <Button title={labels.use} icon={icons.use ?? undefined} size={size === 'lg' ? 'md' : 'sm'} variant="solid" onPress={use} testID={testID ? `${testID}-use` : undefined} />
      {icons.retry === null ? null : <Button icon={keyIcon(icons.retry, RotateCcw)} size={size === 'lg' ? 'md' : 'sm'} variant="ghost" accessibilityLabel={labels.retry} onPress={retry} />}
    </View>
  )
  const transcriptView = (
    <View accessible accessibilityLabel={`${labels.transcript}: ${transcript}`} accessibilityLiveRegion="polite" style={styles.transcript}>
      {renderTranscript ? renderTranscript(transcript) : <StreamingText text={transcript} caret={false} size={z.text} numberOfLines={presentation === 'pill' ? 3 : undefined} />}
    </View>
  )
  const barsFor = (target: number, height: number) => <Bars level={level} mode={barMode} height={height} target={target} frozen={frozen} />
  const panelRadius = radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)

  if (presentation === 'card') {
    const tag = status === 'listening' ? labels.listening : status === 'thinking' ? labels.transcribing : done ? labels.transcript : labels.voice
    return (
      <Surface testID={testID} onLayout={onLayout} elevation="floating" radius={panelRadius} style={[{ overflow: 'hidden', padding: z.pad, gap: z.gap }, style, styles.container]}>
        {glow}
        {status === 'thinking' ? <ShimmerText size={z.status === 'xs' ? 'xs' : 'sm'}>{tag}</ShimmerText> : <Text style={[typeStyle(t, z.status, { weight: 'medium' }), { color: busy ? t.colors.text : t.colors.textSecondary }, styles.status]}>{tag}</Text>}
        <View style={{ minHeight: z.cardBars + 16, justifyContent: 'center' }}>
          {done ? (
            <View style={{ gap: 14 }}>
              {transcriptView}
              {actions}
            </View>
          ) : message ? (
            message
          ) : visual === 'bars' ? (
            <View style={{ alignItems: 'center' }}>{barsFor(240, z.cardBars)}</View>
          ) : (
            <Text style={[typeStyle(t, z.text), { color: busy ? t.colors.textSecondary : t.colors.textTertiary, textAlign: 'center' }]}>{status === 'listening' ? `${labels.listening}…` : status === 'thinking' ? `${labels.transcribing}…` : labels.prompt}</Text>
          )}
        </View>
        {done ? null : (
          <View style={[{ alignItems: 'center', gap: 10 }, styles.mic]}>
            {mic}
            <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>{status === 'listening' ? (mode === 'hold' ? labels.releaseToStop : labels.tapToStop) : status === 'thinking' ? ' ' : hint}</Text>
          </View>
        )}
      </Surface>
    )
  }

  const middle = done ? (
    transcriptView
  ) : message ? (
    message
  ) : busy && visual === 'bars' ? (
    barsFor(150, z.pillBars)
  ) : status === 'thinking' ? (
    <ShimmerText size={z.status === 'xs' ? 'xs' : 'sm'}>{labels.transcribing}</ShimmerText>
  ) : busy ? (
    <Text style={statusText}>{labels.listening}</Text>
  ) : (
    <Text style={statusText}>{hint}</Text>
  )
  const trailing = done ? actions : busy && visual === 'bars' ? status === 'thinking' ? <ShimmerText size={z.status === 'xs' ? 'xs' : 'sm'}>{labels.transcribing}</ShimmerText> : <Text style={[typeStyle(t, z.status, { weight: 'medium' }), { color: t.colors.textSecondary }, styles.status]}>{labels.listening}</Text> : null
  return (
    <Surface
      testID={testID}
      onLayout={onLayout}
      radius={radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container - 2)}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: keyHeights[keySize] + 18, paddingLeft: 9, paddingRight: done ? 9 : 14, paddingVertical: 9, overflow: 'hidden' }, style, styles.container]}
    >
      {glow}
      <View style={styles.mic}>{mic}</View>
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', minHeight: 24 }}>{middle}</View>
      {trailing}
    </Surface>
  )
}

type BarMode = 'listening' | 'thinking' | 'off'

/**
 * The mic: the variant's primary key (a pushable key in `pop`, a sweet in `candy`, chrome in `metal`).
 * While it listens a halo in the tint breathes with the level behind it.
 */
function MicKey({ size, status, mode, level, frozen, onStart, onStop, hint, labels, icons, testID }: { size: KeySize; status: VoiceInputStatus; mode: 'hold' | 'tap'; level: SharedValue<number>; frozen: boolean; onStart: () => void; onStop: () => void; hint: string; labels: VoiceInputLabels; icons: Partial<VoiceInputIcons>; testID?: string }) {
  const s = useSkin()
  const motion = useMotion()
  const listening = status === 'listening'
  const thinking = status === 'thinking'
  const unavailable = status === 'unavailable'
  const disabled = thinking || unavailable
  const a11y = unavailable ? labels.unavailableKey : thinking ? labels.transcribing : listening ? (mode === 'hold' ? labels.holding : labels.stop) : mode === 'hold' ? hint : labels.start
  const icon = listening ? keyIcon(icons.stop, StopGlyph) : unavailable ? keyIcon(icons.unavailable, MicOff) : keyIcon(icons.mic, Mic)
  // After a transcript, Use is the primary action; the mic steps back to a secondary key.
  const role = status === 'done' ? 'raised' : 'solid'
  const dim = keyHeights[size]
  const r = (s.skin === 'clean' ? 10 : s.radius.control) + (size === 'sm' ? -2 : size === 'lg' ? 2 : 0)

  const haloOn = useSharedValue(0)
  useEffect(() => {
    haloOn.value = motion.enabled ? withTiming(listening ? 1 : 0, { duration: listening ? 260 : 400, easing: Easing.out(Easing.cubic) }) : listening ? 1 : 0
  }, [listening, motion.enabled, haloOn])
  const haloStyle = useAnimatedStyle(() => {
    const l = frozen ? 0.62 : level.value
    return { opacity: haloOn.value * (0.1 + 0.16 * l), transform: [{ scale: 1 + (0.12 + l * 0.32) * haloOn.value }] }
  }, [haloOn, level, frozen])

  const [down, setDown] = useState(false)
  // The halo rings the key's face, which on a pop key travels down onto its side while held.
  const faceTop = s.skin === 'pop' && (down || listening) ? s.depth[size] : 0
  const halo = <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: faceTop, width: dim, height: dim, borderRadius: r + 2, backgroundColor: s.tint }, haloStyle]} />
  if (mode === 'tap') {
    return (
      <View>
        {halo}
        <Button variant={role} size={size} icon={icon} disabled={disabled} onPress={listening ? onStop : onStart} accessibilityLabel={a11y} testID={testID} />
      </View>
    )
  }
  // Hold to talk: the real key takes press-in and press-out, and stays down (sunk, squashed) while the finger
  // is on it and while it listens.
  return (
    <View>
      {halo}
      <Button
        variant={role}
        size={size}
        icon={icon}
        disabled={disabled}
        pressed={down || listening}
        onPressIn={() => {
          setDown(true)
          if (!listening) onStart()
        }}
        onPressOut={() => {
          setDown(false)
          onStop()
        }}
        accessibilityLabel={a11y}
        testID={testID}
      />
    </View>
  )
}

/** How the waveform is painted in each variant: width, gap, and a fill (a gradient across, or per bar) with an optional edge. */
function barLook(s: SkinTokens): { width: number; gap: number; across: boolean; stops: Array<[number, string, number]>; stroke?: string; strokeWidth?: number } {
  const tint = s.tint
  switch (s.skin) {
    case 'pop':
      // Little keycaps: a face in the tile colour with the ink edge.
      return { width: 5, gap: 3, across: false, stops: [[0, s.tile.fill, 1], [1, s.tile.fill, 1]], stroke: s.secondary.border, strokeWidth: 1.5 }
    case 'candy': {
      const c = s.tile.candy!
      return { width: 5, gap: 3, across: false, stops: [[0, c.bounce, 1], [0.35, c.top, 1], [1, c.bottom, 1]], stroke: c.border, strokeWidth: 0.75 }
    }
    case 'metal': {
      const f = s.metal.face
      return { width: 4, gap: 3, across: false, stops: f.map((c, i) => [i / (f.length - 1), c, 1] as [number, string, number]), stroke: s.metal.rim[s.dark ? 1 : 3], strokeWidth: 0.75 }
    }
    case 'glass':
      return { width: 4, gap: 3, across: true, stops: [[0, tint, 0.25], [0.5, tint, 0.85], [1, tint, 0.25]], stroke: s.dark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)', strokeWidth: 0.75 }
    case 'shine':
      return { width: 3, gap: 4, across: true, stops: [[0, tint, 0.2], [0.42, tint, 1], [0.5, s.dark ? '#FFFFFF' : tint, s.dark ? 1 : 0.55], [0.58, tint, 1], [1, tint, 0.2]] }
    default:
      return { width: 3, gap: 4, across: true, stops: [[0, tint, 0.35], [0.5, tint, 1], [1, tint, 0.35]] }
  }
}

/** Rounded bars following the level, drawn in the variant. Bars away from the centre lag a few frames, so a loud syllable ripples outward. */
function Bars({ level, mode, height, target, frozen }: { level: SharedValue<number>; mode: BarMode; height: number; target: number; frozen: boolean }) {
  const s = useSkin()
  const motion = useMotion()
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const look = barLook(s)
  const count = Math.max(9, Math.floor((target + look.gap) / (look.width + look.gap)))
  const width = count * (look.width + look.gap) - look.gap
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

  const sw = look.strokeWidth ?? 0
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          {look.across ? (
            <LinearGradient id={`${id}-bars`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
              {look.stops.map(([o, c, a], i) => (
                <Stop key={i} offset={o} stopColor={c} stopOpacity={a} />
              ))}
            </LinearGradient>
          ) : (
            <LinearGradient id={`${id}-bars`} x1="0" y1="0" x2="0" y2="1">
              {look.stops.map(([o, c, a], i) => (
                <Stop key={i} offset={o} stopColor={c} stopOpacity={a} />
              ))}
            </LinearGradient>
          )}
        </Defs>
        {Array.from({ length: count }, (_, i) => (
          <Bar key={i} i={i} count={count} level={level} tick={tick} modeT={modeT} on={on} height={height} width={look.width} gap={look.gap} fill={`url(#${id}-bars)`} stroke={look.stroke} strokeWidth={sw} frozen={frozen} />
        ))}
      </Svg>
    </View>
  )
}

const AnimatedRect = Animated.createAnimatedComponent(Rect)

function Bar({ i, count, level, tick, modeT, on, height, width, gap, fill, stroke, strokeWidth, frozen }: { i: number; count: number; level: SharedValue<number>; tick: SharedValue<number>; modeT: SharedValue<number>; on: SharedValue<number>; height: number; width: number; gap: number; fill: string; stroke?: string; strokeWidth: number; frozen: boolean }) {
  const c = (count - 1) / 2
  const dist = Math.abs(i - c) / c
  const bell = 0.32 + 0.68 * Math.exp(-dist * dist * 1.7)
  const lag = Math.abs(i - c) / c
  const x = i * (width + gap) + strokeWidth / 2
  const w = width - strokeWidth
  // Pop's keycaps keep a little height at rest so the quiet edges read as caps, not dots.
  const minH = strokeWidth > 1 ? width + 3 : width
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
    const h = Math.max(minH, Math.min(height - strokeWidth, amp * height))
    return { height: h, y: (height - h) / 2 }
  }, [lagged, tick, modeT, on, bell, i, count, height, minH, frozen, still, strokeWidth])
  return <AnimatedRect x={x} width={w} rx={w / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth || undefined} animatedProps={props} />
}

/** A plausible speech snapshot for frozen frames (review, reduced motion). */
function staticLevel(i: number, count: number): number {
  const c = (count - 1) / 2
  const dist = Math.abs(i - c) / c
  const bell = 0.3 + 0.7 * Math.exp(-dist * dist * 1.6)
  return bell * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + 0.6)))
}

/** A soft bloom anchored to the bottom edge, in the accent (or the tint). Scales with the level while listening, breathes while transcribing. */
function Glow({ level, mode, width, height, frozen, tint }: { level: SharedValue<number>; mode: BarMode; width: number; height: number; frozen: boolean; tint?: string }) {
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
  const g = tint ? { a: tint, b: tint, c: tint } : t.colors.accent
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute', left: 0, top: 0, width, height }, style]}>
      <Svg width={width} height={height}>
        <Defs>
          {(['a', 'b', 'c'] as const).map((k) => (
            <RadialGradient key={k} id={`${id}-${k}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={g[k]} stopOpacity={k === 'b' ? peak : peak * 0.8} />
              <Stop offset="0.5" stopColor={g[k]} stopOpacity={mid} />
              <Stop offset="1" stopColor={g[k]} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Ellipse cx={width * 0.24} cy={height * 1.02} rx={width * 0.34} ry={height * 0.9} fill={`url(#${id}-a)`} />
        <Ellipse cx={width * 0.76} cy={height * 1.02} rx={width * 0.34} ry={height * 0.9} fill={`url(#${id}-c)`} />
        <Ellipse cx={width * 0.5} cy={height * 1.04} rx={width * 0.46} ry={height * 1.05} fill={`url(#${id}-b)`} />
      </Svg>
    </Animated.View>
  )
}

export default VoiceInput
