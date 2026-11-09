import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, cancelAnimation } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { hairlineWidth, useMotion, useTheme } from '@ondai/tokens/react'
import { hexToRgba, type AccentStops, type RadiusKey } from '@ondai/tokens'

export type IonBorderVariant = 'sweep' | 'beam' | 'pulse'

export interface IonBorderProps {
  /** Show the traveling light (thinking / streaming). */
  active?: boolean
  /** Fade the border in when focused: a faint static ring. */
  focused?: boolean
  /**
   * `sweep` (default): a soft gradient light travels around the edge. `beam`: a bright comet with a long
   * fading tail and an outer halo. `pulse`: no travelling light, the whole ring breathes in the accent.
   */
  variant?: IonBorderVariant
  radius?: RadiusKey | number
  /** Ring thickness in pt. */
  width?: number
  /** Seconds per lap. */
  speed?: number
  /** Background behind children. Defaults to the theme surface. */
  fill?: string
  /** Soft outer glow while active (elevation 3). */
  glow?: boolean
  /** Resting shadow from the theme. Cards use `sm`, floating panels `lg`. */
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  /** Idle border color. Defaults to the theme hairline. */
  borderColor?: string
  /** Light colours, three stops. Defaults to the theme accent. */
  colors?: AccentStops
  /** `beam` and `pulse` draw a soft halo outside the edge. Default true. */
  halo?: boolean
  /** Degrees of tail behind the beam's head. Default 150. */
  tail?: number
  /** The beam's head burns white. Turn off for a dark glint on light surfaces. Default true. */
  hotHead?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  children?: ReactNode
  testID?: string
}

/** Where the beam's head rests when motion is off: just past the top-right corner, tail along the top edge. */
const beamStill = 335
/** The halo bleeds `haloStep × haloRings` pt outside the border; each ring adds a little opacity closer to the edge. */
const haloStep = 2
const haloRings = 6
const haloOpacity = [0.1, 0.08, 0.07, 0.06, 0.05, 0.04] as const

/**
 * The signature "thinking" border: a slow gradient light travels around the edge of any container.
 * Idle: hairline. Focus: faint ring. Active: the ion sweep (or a comet beam, or a breathing pulse). Done: fades out within 300ms.
 */
export function IonBorder({ active = false, focused = false, variant = 'sweep', radius = 'lg', width = 1.5, speed, fill, glow = false, shadow = 'none', borderColor, colors, halo = true, tail = tailAngle, hotHead = true, style, contentStyle, children, testID }: IonBorderProps) {
  const t = useTheme()
  const motion = useMotion()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const r = typeof radius === 'number' ? radius : t.radii[radius]
  const [size, setSize] = useState({ w: 0, h: 0 })
  const rotation = useSharedValue(variant === 'beam' && !motion.enabled ? beamStill : 0)
  const opacity = useSharedValue(active ? 1 : 0)
  const breath = useSharedValue(0.75)
  const lapMs = (speed ?? t.durations.sweep / 1000) * 1000
  const travelling = variant !== 'pulse'

  useEffect(() => {
    if (active && motion.enabled && travelling) {
      rotation.value = 0
      rotation.value = withRepeat(withTiming(360, { duration: lapMs, easing: Easing.linear }), -1, false)
    } else {
      cancelAnimation(rotation)
      if (variant === 'beam' && !motion.enabled) rotation.value = beamStill
    }
    return () => cancelAnimation(rotation)
  }, [active, motion.enabled, lapMs, rotation, travelling, variant])

  useEffect(() => {
    if (variant !== 'pulse') return
    if (active && motion.enabled) {
      breath.value = 0.3
      breath.value = withRepeat(withSequence(withTiming(1, { duration: t.durations.pulse / 2, easing: Easing.inOut(Easing.sin) }), withTiming(0.3, { duration: t.durations.pulse / 2, easing: Easing.inOut(Easing.sin) })), -1, false)
    } else {
      cancelAnimation(breath)
      breath.value = 0.75
    }
    return () => cancelAnimation(breath)
  }, [variant, active, motion.enabled, breath, t.durations.pulse])

  useEffect(() => {
    opacity.value = motion.enabled ? withTiming(active ? 1 : 0, { duration: active ? 200 : t.durations.settle }) : active ? 1 : 0
  }, [active, motion.enabled, opacity, t.durations.settle])

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }), [rotation])
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity])
  const pulse = useAnimatedStyle(() => ({ opacity: breath.value }), [breath])

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout
    if (w !== size.w || h !== size.h) setSize({ w, h })
  }
  const d = Math.ceil(Math.hypot(size.w, size.h)) + 8
  const bg = fill ?? t.colors.surface
  const g = colors ? { ...t.colors.accent, ...colors, solid: colors.b } : t.colors.accent
  // Depth: the resting shadow, a 3px soft ring on focus (the reui input ring), a calm accent bloom while active.
  const layers: string[] = []
  if (shadow !== 'none') layers.push(t.shadows[shadow])
  if (focused && !active) layers.push(`0 0 0 3px ${g.soft}`)
  if (glow && active) layers.push(`0 0 0 1px ${g.soft}`, `0 8px 28px ${g.glow}`)
  const glowStyle: ViewStyle = layers.length ? ({ boxShadow: layers.join(', ') } as ViewStyle) : {}

  // Beam geometry: one fan for the ring, a larger softer one for the halo outside it.
  const beamD = Math.ceil(Math.hypot(size.w, size.h)) + 16
  const haloD = Math.ceil(Math.hypot(size.w + 2 * haloStep * haloRings, size.h + 2 * haloStep * haloRings)) + 16
  const ga = g.a
  const gb = g.b
  const gc = g.c
  const beam = useMemo(() => (variant === 'beam' && size.w > 0 ? comet(beamD, { a: ga, b: gb, c: gc }, { lead: 4, alpha: 0.98, layers: 36, tail, hot: hotHead }) : []), [variant, size.w, beamD, ga, gb, gc, tail, hotHead])
  const haloBeam = useMemo(() => (variant === 'beam' && halo && size.w > 0 ? comet(haloD, { a: ga, b: gb, c: gc }, { lead: 5, alpha: 0.95, layers: 16, tail, hot: hotHead }) : []), [variant, halo, size.w, haloD, ga, gb, gc, tail, hotHead])

  const layer = testID ? (k: string) => `${testID}-${k}` : () => undefined

  return (
    <View style={[glowStyle, { borderRadius: r }, style]} testID={testID}>
      {variant !== 'sweep' && halo && size.w > 0 ? (
        <Animated.View pointerEvents="none" testID={layer('halo')} style={[StyleSheet.absoluteFill, fade]}>
          {Array.from({ length: haloRings }, (_, i) => {
            const k = haloRings - i
            const inset = -k * haloStep
            return (
              <View key={k} pointerEvents="none" style={[styles.center, { position: 'absolute', left: inset, top: inset, right: inset, bottom: inset, borderRadius: r + k * haloStep, overflow: 'hidden', opacity: haloOpacity[k - 1] }]}>
                {variant === 'beam' ? (
                  <Animated.View style={spin}>
                    <Fan size={haloD} layers={haloBeam} />
                  </Animated.View>
                ) : (
                  <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: g.solid }, pulse]} />
                )}
              </View>
            )
          })}
        </Animated.View>
      ) : null}
      <View onLayout={onLayout} testID={layer('clip')} style={[styles.clip, { borderRadius: r, backgroundColor: bg, borderWidth: hairlineWidth, borderColor: focused ? t.colors.accent.ring : (borderColor ?? t.colors.hairline) }]}>
        {size.w > 0 ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, fade]}>
            {variant === 'pulse' ? (
              <Animated.View testID={layer('pulse')} style={[StyleSheet.absoluteFill, { backgroundColor: g.solid }, pulse]} />
            ) : variant === 'beam' ? (
              <Animated.View testID={layer('beam')} style={spin}>
                <Fan size={beamD} layers={beam} />
              </Animated.View>
            ) : (
              <Animated.View testID={layer('sweep')} style={spin}>
                <Svg width={d} height={d}>
                  <Defs>
                    <LinearGradient id={`ondai-ion-${uid}`} x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0.18" stopColor={g.a} stopOpacity={0} />
                      <Stop offset="0.38" stopColor={g.a} stopOpacity={0.35} />
                      <Stop offset="0.5" stopColor={g.b} stopOpacity={0.95} />
                      <Stop offset="0.6" stopColor={g.c} stopOpacity={0.7} />
                      <Stop offset="0.78" stopColor={g.c} stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Rect x={0} y={0} width={d} height={d} fill={`url(#ondai-ion-${uid})`} />
                </Svg>
              </Animated.View>
            )}
          </Animated.View>
        ) : null}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: width, borderRadius: Math.max(0, r - width), backgroundColor: bg }]} />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  )
}

/* ---------------------------------------------------------------------------------------------- */
/* The comet: a fan of nested wedges from the centre of a rotating square                          */
/* ---------------------------------------------------------------------------------------------- */

interface Wedge {
  d: string
  fill: string
  opacity: number
}

/** Degrees of tail behind the head. */
const tailAngle = 150

function Fan({ size, layers }: { size: number; layers: Wedge[] }) {
  return (
    <Svg width={size} height={size}>
      {layers.map((w, i) => (
        <Path key={i} d={w.d} fill={w.fill} fillOpacity={w.opacity} />
      ))}
    </Svg>
  )
}

type Rgb = [number, number, number]
const rgbOf = (hex: string): Rgb => hexToRgba(hex).slice(0, 3) as Rgb
const lerp = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const css = ([r, g, b]: Rgb) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`

/** Colour along the tail (u = 0 at the head, 1 at the end): white-hot accent.b, then accent.a, fading into accent.c. */
function cometColor(u: number, g: AccentStops, hot = true): string {
  const white: Rgb = [255, 255, 255]
  const a = rgbOf(g.a)
  const b = rgbOf(g.b)
  const c = rgbOf(g.c)
  const stops: Array<[number, Rgb]> = [
    [0, hot ? lerp(b, white, 0.82) : b],
    [0.05, hot ? lerp(a, white, 0.55) : a],
    [0.14, a],
    [0.62, c],
    [1, c],
  ]
  for (let i = 1; i < stops.length; i++) {
    const [u0, c0] = stops[i - 1]!
    const [u1, c1] = stops[i]!
    if (u <= u1) return css(lerp(c0, c1, (u - u0) / (u1 - u0)))
  }
  return css(c)
}

/**
 * Nested wedges that all start at the head and end further down the tail, each with the opacity delta that
 * makes the stack sum to `alpha · (1 − u)^2.2`. Nesting (instead of adjacent wedges) avoids seams at the joins.
 * The head leads the 0° ray by `lead` degrees; the tail trails counter-clockwise behind it.
 */
function comet(size: number, g: AccentStops, { lead, alpha, layers, tail = tailAngle, hot = true }: { lead: number; alpha: number; layers: number; tail?: number; hot?: boolean }): Wedge[] {
  const c = size / 2
  const rad = size / 2 + 2
  const profile = (u: number) => alpha * Math.pow(1 - u, 2.2)
  const out: Wedge[] = []
  let prev = 0
  for (let k = 1; k <= layers; k++) {
    const u = Math.pow(k / layers, 1.5)
    const delta = 1 - (1 - profile(prev)) / (1 - profile(u))
    const from = lead
    const to = -tail * u
    const n = Math.max(2, Math.ceil((from - to) / 6))
    const pts: string[] = []
    for (let i = 0; i <= n; i++) {
      const a = ((from + ((to - from) * i) / n) * Math.PI) / 180
      pts.push(`${(c + Math.cos(a) * rad).toFixed(2)} ${(c + Math.sin(a) * rad).toFixed(2)}`)
    }
    out.push({ d: `M${c} ${c} L${pts.join(' L')} Z`, fill: cometColor((prev + u) / 2, g, hot), opacity: Math.max(0, Math.min(1, delta)) })
    prev = u
  }
  // Longest first, so the white head is drawn last and sits on top.
  return out.reverse()
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { position: 'relative' },
})

export default IonBorder
