import { useEffect, useId } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, RadialGradient, Stop } from 'react-native-svg'
import { typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { ShimmerText } from '../shimmer-text/shimmer-text'

export type ThinkingState = 'thinking' | 'listening' | 'speaking'

export interface ThinkingIndicatorProps {
  /** `shimmer` (default): the label itself carries a running light. `orb`: a breathing chrome sphere. */
  variant?: 'shimmer' | 'dots' | 'orb' | 'line' | 'sweep'
  size?: 'sm' | 'md' | 'lg'
  /**
   * What the model is doing. Changes the orb's rhythm: `thinking` breathes with a slow inner swirl,
   * `listening` breathes slower while the halo swells outward, `speaking` pulses in short beats.
   */
  state?: ThinkingState
  /** What the model is doing, in a few words ("Reading the thread"). Shown next to the visual, or as the visual for `shimmer`. */
  label?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

const px = { sm: 4, md: 6, lg: 8 } as const
const orbPx = { sm: 18, md: 28, lg: 40 } as const
const stateLabel: Record<ThinkingState, string> = { thinking: 'Thinking', listening: 'Listening', speaking: 'Speaking' }

/** Ways to say "the model is working": a shimmering sentence, a chrome orb that breathes, dots, a line, or a sweep. */
export function ThinkingIndicator({ variant = 'shimmer', size = 'md', state = 'thinking', label, style, testID }: ThinkingIndicatorProps) {
  const t = useTheme()
  if (variant === 'shimmer') {
    const text = label || stateLabel[state]
    return (
      <ShimmerText testID={testID} accessibilityRole="progressbar" style={style} size={size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm'}>
        {text}
      </ShimmerText>
    )
  }
  return (
    <View testID={testID} accessibilityRole="progressbar" accessibilityLabel={label ?? stateLabel[state]} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      {variant === 'dots' ? <Dots size={size} /> : variant === 'orb' ? <Orb size={size} state={state} testID={testID ? `${testID}-orb` : undefined} /> : variant === 'line' ? <Line size={size} /> : <Sweep size={size} />}
      {label ? <Text style={[typeStyle(t, size === 'lg' ? 'md' : 'sm', { weight: 'medium' }), { color: t.colors.textSecondary }]}>{label}</Text> : null}
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

/* ---------------------------------------------------------------------------------------------- */
/* Orb: a metallic breathing sphere                                                                */
/* ---------------------------------------------------------------------------------------------- */

interface Rhythm {
  /** One breath, ms. */
  breathe: number
  /** One revolution of the inner swirl, ms. */
  swirl: number
  /** One orbit of the specular highlight, ms. */
  orbit: number
  /** Short beat (fast attack, slow release) instead of a sine breath. */
  beat: boolean
  scale: readonly [number, number]
  haloScale: readonly [number, number]
  haloOpacity: readonly [number, number]
}

const rhythms: Record<ThinkingState, Rhythm> = {
  thinking: { breathe: 3200, swirl: 9000, orbit: 7000, beat: false, scale: [0.96, 1.04], haloScale: [0.94, 1.08], haloOpacity: [0.7, 1] },
  listening: { breathe: 4800, swirl: 14000, orbit: 11000, beat: false, scale: [0.97, 1.03], haloScale: [1, 1.32], haloOpacity: [0.4, 0.8] },
  speaking: { breathe: 400, swirl: 6000, orbit: 5000, beat: true, scale: [0.98, 1.04], haloScale: [1, 1.18], haloOpacity: [0.55, 1] },
}

/** 0→1→0 every `duration` ms: a sine breath, or a beat (fast attack, slow release). Holds `still` when motion is off. */
function useBreath(duration: number, beat: boolean, enabled: boolean, still: number) {
  const v = useSharedValue(still)
  useEffect(() => {
    if (enabled) {
      v.value = 0
      v.value = beat
        ? withRepeat(withSequence(withTiming(1, { duration: duration * 0.3, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: duration * 0.7, easing: Easing.inOut(Easing.sin) })), -1, false)
        : withRepeat(withSequence(withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })), -1, false)
    } else {
      cancelAnimation(v)
      v.value = still
    }
    return () => cancelAnimation(v)
  }, [enabled, duration, beat, still, v])
  return v
}

/** 0→1 at constant speed every `duration` ms (one revolution). Holds `still` when motion is off. */
function useSpin(duration: number, enabled: boolean, still: number) {
  const v = useSharedValue(still)
  useEffect(() => {
    if (enabled) {
      v.value = still
      v.value = withRepeat(withTiming(still + 1, { duration, easing: Easing.linear }), -1, false)
    } else {
      cancelAnimation(v)
      v.value = still
    }
    return () => cancelAnimation(v)
  }, [enabled, duration, still, v])
  return v
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/**
 * A dark chrome sphere lit from the top-left: radial base, a soft reflection band across the upper third,
 * two faint coloured reflections low on the sphere, a slow inner swirl under the surface, a drifting
 * specular highlight, and a soft halo that breathes with it.
 */
function Orb({ size, state, testID }: { size: 'sm' | 'md' | 'lg'; state: ThinkingState; testID?: string }) {
  const t = useTheme()
  const motion = useMotion()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const id = (k: string) => `ondai-orb-${uid}-${k}`
  const url = (k: string) => `url(#${id(k)})`
  const g = t.colors.accent
  const rhythm = rhythms[state]
  const d = orbPx[size]
  const c = d / 2
  const R = c - 0.25
  const S = Math.round(d * 2.6)
  const rim = size === 'sm' ? 0.5 : size === 'md' ? 0.65 : 0.8
  const [s0, s1] = rhythm.scale
  const [h0, h1] = rhythm.haloScale
  const [o0, o1] = rhythm.haloOpacity

  const breath = useBreath(rhythm.breathe, rhythm.beat, motion.enabled, 0.5)
  const swirl = useSpin(rhythm.swirl, motion.enabled, 0.06)
  const orbit = useSpin(rhythm.orbit, motion.enabled, 0.2)

  const sphere = useAnimatedStyle(() => ({ transform: [{ scale: s0 + breath.value * (s1 - s0) }] }), [breath, s0, s1])
  const halo = useAnimatedStyle(() => ({ opacity: o0 + breath.value * (o1 - o0), transform: [{ scale: h0 + breath.value * (h1 - h0) }] }), [breath, h0, h1, o0, o1])
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${swirl.value * 360}deg` }] }), [swirl])

  // The specular drifts on a small orbit inside the lit quadrant.
  const sx = c - R * 0.36
  const sy = c - R * 0.44
  const ox = R * 0.11
  const oy = R * 0.07
  const glint = useAnimatedProps(() => {
    const a = orbit.value * Math.PI * 2
    return { cx: sx + Math.cos(a) * ox, cy: sy + Math.sin(a) * oy }
  }, [orbit, sx, sy, ox, oy])
  const glintCore = useAnimatedProps(() => {
    const a = orbit.value * Math.PI * 2
    return { cx: sx + Math.cos(a) * ox, cy: sy + Math.sin(a) * oy }
  }, [orbit, sx, sy, ox, oy])

  return (
    <View testID={testID} style={{ width: d, height: d }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: (d - S) / 2, top: (d - S) / 2, width: S, height: S }, halo]}>
        <Svg width={S} height={S}>
          <Defs>
            <RadialGradient id={id('halo')} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={g.solid} stopOpacity={0.36} />
              <Stop offset="0.4" stopColor={g.solid} stopOpacity={0.2} />
              <Stop offset="0.64" stopColor={g.solid} stopOpacity={0.06} />
              <Stop offset="1" stopColor={g.solid} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={S / 2} cy={S / 2} r={S / 2} fill={url('halo')} />
        </Svg>
      </Animated.View>

      <Animated.View style={[{ width: d, height: d }, sphere]}>
        {/* Base: dark chrome lit from the top-left, near-black at the rim, two coloured reflections low on the sphere. */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width={d} height={d}>
            <Defs>
              <RadialGradient id={id('base')} cx="34%" cy="28%" r="80%">
                <Stop offset="0" stopColor="#626973" />
                <Stop offset="0.28" stopColor="#32373E" />
                <Stop offset="0.62" stopColor="#15181D" />
                <Stop offset="1" stopColor="#030405" />
              </RadialGradient>
              <LinearGradient id={id('horizon')} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.08} />
                <Stop offset="0.44" stopColor="#FFFFFF" stopOpacity={0.02} />
                <Stop offset="0.58" stopColor="#000000" stopOpacity={0.14} />
                <Stop offset="1" stopColor="#000000" stopOpacity={0.4} />
              </LinearGradient>
              <RadialGradient id={id('ra')} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={g.a} stopOpacity={0.38} />
                <Stop offset="0.6" stopColor={g.a} stopOpacity={0.14} />
                <Stop offset="1" stopColor={g.a} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id={id('rc')} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={g.c} stopOpacity={0.34} />
                <Stop offset="0.6" stopColor={g.c} stopOpacity={0.12} />
                <Stop offset="1" stopColor={g.c} stopOpacity={0} />
              </RadialGradient>
              <ClipPath id={id('clip')}>
                <Circle cx={c} cy={c} r={R} />
              </ClipPath>
            </Defs>
            <Circle cx={c} cy={c} r={R} fill={url('base')} />
            <G clipPath={url('clip')}>
              <Circle cx={c} cy={c} r={R} fill={url('horizon')} />
              {/* Coloured light caught on the lower rim: the clip turns each ellipse into a crescent. */}
              <Ellipse cx={c - R * 0.58} cy={c + R * 0.74} rx={R * 0.64} ry={R * 0.3} transform={`rotate(38 ${c - R * 0.58} ${c + R * 0.74})`} fill={url('ra')} />
              <Ellipse cx={c + R * 0.62} cy={c + R * 0.7} rx={R * 0.6} ry={R * 0.28} transform={`rotate(-40 ${c + R * 0.62} ${c + R * 0.7})`} fill={url('rc')} />
            </G>
          </Svg>
        </View>

        {/* Inner swirl: a slow nebula under the surface. The clip is a centred circle, so rotating the layer keeps it in place. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, spin]}>
          <Svg width={d} height={d}>
            <Defs>
              <RadialGradient id={id('swirl')} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={g.b} stopOpacity={0.42} />
                <Stop offset="0.55" stopColor={g.b} stopOpacity={0.14} />
                <Stop offset="1" stopColor={g.b} stopOpacity={0} />
              </RadialGradient>
              <ClipPath id={id('sclip')}>
                <Circle cx={c} cy={c} r={R * 0.97} />
              </ClipPath>
            </Defs>
            <G clipPath={url('sclip')}>
              <Ellipse cx={c + R * 0.16} cy={c + R * 0.1} rx={R * 0.86} ry={R * 0.24} transform={`rotate(-24 ${c} ${c})`} fill={url('swirl')} opacity={0.36} />
              <Ellipse cx={c - R * 0.14} cy={c + R * 0.2} rx={R * 0.74} ry={R * 0.2} transform={`rotate(44 ${c} ${c})`} fill={url('swirl')} opacity={0.3} />
              <Ellipse cx={c + R * 0.02} cy={c - R * 0.14} rx={R * 0.64} ry={R * 0.18} transform={`rotate(104 ${c} ${c})`} fill={url('swirl')} opacity={0.26} />
            </G>
          </Svg>
        </Animated.View>

        {/* Surface: the chrome reflection band, the lit rim, and the drifting specular. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width={d} height={d}>
            <Defs>
              <RadialGradient id={id('band')} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.72} />
                <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.3} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
              <LinearGradient id={id('rim')} x1="0.2" y1="0" x2="0.8" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.42} />
                <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.015} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.06} />
              </LinearGradient>
              <RadialGradient id={id('glint')} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.3} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
              <ClipPath id={id('tclip')}>
                <Circle cx={c} cy={c} r={R} />
              </ClipPath>
            </Defs>
            <G clipPath={url('tclip')}>
              <Ellipse cx={c} cy={c - R * 0.5} rx={R * 0.98} ry={R * 0.26} transform={`rotate(-18 ${c} ${c - R * 0.5})`} fill={url('band')} />
              <Ellipse cx={c - R * 0.08} cy={c - R * 0.58} rx={R * 0.62} ry={R * 0.09} transform={`rotate(-18 ${c - R * 0.08} ${c - R * 0.58})`} fill={url('band')} opacity={0.9} />
            </G>
            <Circle cx={c} cy={c} r={R - rim / 2} stroke={url('rim')} strokeWidth={rim} fill="none" />
            <AnimatedCircle animatedProps={glint} cx={sx} cy={sy} r={R * 0.2} fill={url('glint')} />
            <AnimatedCircle animatedProps={glintCore} cx={sx} cy={sy} r={R * 0.065} fill="#FFFFFF" />
          </Svg>
        </View>
      </Animated.View>
    </View>
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
