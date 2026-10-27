import { useEffect, useId, useRef, type ComponentRef } from 'react'
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useDerivedValue, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated'
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg'
import { useMotion, useTheme } from '@ondai/tokens/react'

export type AgentAvatarShape = 'blob' | 'square' | 'pill' | 'drop'
export type AgentAvatarState = 'idle' | 'thinking' | 'speaking' | 'sleeping'

export interface AgentAvatarProps {
  /** Width and height in pt (default 64). */
  size?: number
  shape?: AgentAvatarShape
  state?: AgentAvatarState
  /** Body colour. Defaults to a theme grey with a faint accent tint; shading is derived from it. */
  color?: string
  eyes?: 'dots' | 'ovals'
  /** On web the eyes and head follow the pointer. */
  interactive?: boolean
  /** Accessible name; the state is appended ("Assistant, thinking"). */
  name?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

interface ShapeDef {
  path: string
  /** Eye line (viewBox units). */
  eyeY: number
  /** Half the distance between the eyes. */
  eyeDX: number
  mouthY: number
  /** Top of the body: where the thinking orbit and the sleeping z sit. */
  top: number
}

/** A squircle: cubic corners read softer than circular arcs. */
function squircle(x: number, y: number, w: number, h: number, r: number): string {
  const k = 0.45
  return [
    `M${x + r} ${y}`,
    `H${x + w - r}`,
    `C${x + w - r * k} ${y} ${x + w} ${y + r * k} ${x + w} ${y + r}`,
    `V${y + h - r}`,
    `C${x + w} ${y + h - r * k} ${x + w - r * k} ${y + h} ${x + w - r} ${y + h}`,
    `H${x + r}`,
    `C${x + r * k} ${y + h} ${x} ${y + h - r * k} ${x} ${y + h - r}`,
    `V${y + r}`,
    `C${x} ${y + r * k} ${x + r * k} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ')
}

const shapes: Record<AgentAvatarShape, ShapeDef> = {
  blob: { path: 'M52 14 C71 14 88 27 90 50 C92 75 76 94 50 94 C24 94 8 76 10 51 C12 28 30 14 52 14 Z', eyeY: 50, eyeDX: 13, mouthY: 64, top: 14 },
  square: { path: squircle(13, 15, 74, 78, 28), eyeY: 50, eyeDX: 13, mouthY: 64, top: 15 },
  pill: { path: squircle(5, 21, 90, 64, 32), eyeY: 49, eyeDX: 14, mouthY: 62, top: 21 },
  drop: { path: 'M50 11 C56 25 86 40 86 61 C86 81 70 94 50 94 C30 94 14 81 14 61 C14 40 44 25 50 11 Z', eyeY: 58, eyeDX: 12, mouthY: 72, top: 11 },
}

function parse(color: string): [number, number, number] | null {
  const s = color.trim()
  if (s.startsWith('#')) {
    let h = s.slice(1)
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
    if (h.length < 6) return null
    const n = parseInt(h.slice(0, 6), 16)
    if (Number.isNaN(n)) return null
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const m = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  return null
}
const rgb = (c: [number, number, number]) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
/** amount > 0 lightens toward white, < 0 darkens toward black. */
const shade = (c: [number, number, number], amount: number) => (amount >= 0 ? mix(c, [255, 255, 255], amount) : mix(c, [0, 0, 0], -amount))

const TAU = Math.PI * 2
const stateWord: Record<AgentAvatarState, string> = { idle: '', thinking: 'thinking', speaking: 'speaking', sleeping: 'sleeping' }

/**
 * A living face for the on-device assistant: a soft, lit body with two eyes that glance around and blink.
 * Thinking looks up with an orbiting dot, speaking opens a small mouth, sleeping closes the eyes and breathes.
 */
export function AgentAvatar({ size = 64, shape = 'blob', state = 'idle', color, eyes = 'dots', interactive = false, name = 'Assistant', style, testID }: AgentAvatarProps) {
  const t = useTheme()
  const motion = useMotion()
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ref = useRef<ComponentRef<typeof View>>(null)
  const def = shapes[shape]
  const u = size / 100
  const dark = t.scheme === 'dark'
  const accent = parse(t.colors.accent.b) ?? [139, 124, 255]
  const base = parse(color ?? '') ?? mix(dark ? [48, 54, 63] : [217, 221, 227], accent, dark ? 0.1 : 0.08)
  const luminance = (0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2]) / 255
  const eyeColor = luminance > 0.45 ? '#15181C' : '#07080A'
  const light = luminance > 0.45
  const enabled = motion.enabled

  // Loops (0..1): bob, breath, orbit, z. Targets (0..1 or units): sink, tilt, lids, orbitT, speakT, mouth, blink, glance, pointer.
  const bob = useSharedValue(0.25)
  const breathe = useSharedValue(0.25)
  const orbit = useSharedValue(0.12)
  const zT = useSharedValue(0.3)
  const sink = useSharedValue(state === 'sleeping' ? 1 : 0)
  const tilt = useSharedValue(0)
  const lids = useSharedValue(state === 'sleeping' ? 1 : 0)
  const orbitT = useSharedValue(state === 'thinking' ? 1 : 0)
  const speakT = useSharedValue(state === 'speaking' ? 1 : 0)
  const mouth = useSharedValue(0)
  const blink = useSharedValue(1)
  const glanceX = useSharedValue(0)
  const glanceY = useSharedValue(0)
  const pointerX = useSharedValue(0)
  const pointerY = useSharedValue(0)
  const pointerT = useSharedValue(0)

  useEffect(() => {
    const tm = (v: number, ms = 520) => (enabled ? withTiming(v, { duration: ms, easing: Easing.inOut(Easing.cubic) }) : v)
    sink.value = tm(state === 'sleeping' ? 1 : 0, 700)
    tilt.value = tm(state === 'thinking' ? -7 : state === 'sleeping' ? 4 : 0)
    lids.value = tm(state === 'sleeping' ? 1 : 0, 420)
    orbitT.value = tm(state === 'thinking' ? 1 : 0, 400)
    speakT.value = tm(state === 'speaking' ? 1 : 0, 300)
    if (state === 'thinking') {
      glanceX.value = tm(3.4)
      glanceY.value = tm(-4)
    } else if (state === 'sleeping') {
      glanceX.value = tm(0)
      glanceY.value = tm(1.5)
    } else if (!enabled) {
      glanceX.value = 0
      glanceY.value = 0
    }
    if (state !== 'speaking') mouth.value = tm(0, 260)
    else if (!enabled) mouth.value = 0.55
    if (!enabled) blink.value = 1
  }, [state, enabled, sink, tilt, lids, orbitT, speakT, glanceX, glanceY, mouth, blink])

  useEffect(() => {
    const loop = (v: SharedValue<number>, ms: number) => {
      v.value = 0
      v.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false)
    }
    if (enabled) {
      loop(bob, 2800)
      loop(breathe, 4200)
      loop(orbit, 1900)
      loop(zT, 2600)
    } else {
      for (const v of [bob, breathe, orbit, zT]) cancelAnimation(v)
      bob.value = 0.25
      breathe.value = 0.25
      orbit.value = 0.12
      zT.value = 0.3
    }
    return () => {
      for (const v of [bob, breathe, orbit, zT]) cancelAnimation(v)
    }
  }, [enabled, bob, breathe, orbit, zT])

  // Glance around every 2–4 s (idle, speaking).
  useEffect(() => {
    if (!enabled || state === 'thinking' || state === 'sleeping') return
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      timer = setTimeout(() => {
        const centre = Math.random() < 0.35
        const tx = centre ? 0 : (Math.random() * 2 - 1) * 4
        const ty = centre ? 0 : (Math.random() * 2 - 1) * 2.4
        const e = { duration: 360, easing: Easing.inOut(Easing.quad) }
        glanceX.value = withTiming(tx, e)
        glanceY.value = withTiming(ty, e)
        next()
      }, 2000 + Math.random() * 2000)
    }
    next()
    return () => clearTimeout(timer)
  }, [enabled, state, glanceX, glanceY])

  // Blink every 3–6 s, sometimes twice.
  useEffect(() => {
    if (!enabled || state === 'sleeping') return
    let timer: ReturnType<typeof setTimeout>
    const shut = () => withSequence(withTiming(0.08, { duration: 70, easing: Easing.in(Easing.quad) }), withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }))
    const next = () => {
      timer = setTimeout(() => {
        blink.value = Math.random() < 0.2 ? withSequence(shut(), withTiming(1, { duration: 120 }), shut()) : shut()
        next()
      }, 3000 + Math.random() * 3000)
    }
    next()
    return () => clearTimeout(timer)
  }, [enabled, state, blink])

  // Speaking: the mouth takes a new opening every 90–170 ms, like syllables.
  useEffect(() => {
    if (!enabled || state !== 'speaking') return
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      timer = setTimeout(() => {
        const target = Math.random() < 0.18 ? 0.08 : 0.2 + Math.random() * 0.8
        mouth.value = withTiming(target, { duration: 110, easing: Easing.out(Easing.quad) })
        next()
      }, 90 + Math.random() * 80)
    }
    next()
    return () => clearTimeout(timer)
  }, [enabled, state, mouth])

  // Web: eyes and head follow the pointer.
  useEffect(() => {
    const doc = (globalThis as { document?: { addEventListener(type: string, cb: (e: { clientX: number; clientY: number }) => void): void; removeEventListener(type: string, cb: (e: { clientX: number; clientY: number }) => void): void } }).document
    if (!interactive || Platform.OS !== 'web' || typeof doc === 'undefined') return
    const onMove = (e: { clientX: number; clientY: number }) => {
      const node = ref.current as unknown as { getBoundingClientRect?: () => { left: number; top: number; width: number; height: number } } | null
      const rect = node?.getBoundingClientRect?.()
      if (!rect) return
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      const reach = Math.max(240, size * 5)
      pointerX.value = withTiming(Math.max(-1, Math.min(1, dx / reach)), { duration: 140 })
      pointerY.value = withTiming(Math.max(-1, Math.min(1, dy / reach)), { duration: 140 })
      pointerT.value = withTiming(Math.hypot(dx, dy) < reach * 3 ? 1 : 0, { duration: 320 })
    }
    const onLeave = () => {
      pointerT.value = withTiming(0, { duration: 600 })
    }
    doc.addEventListener('mousemove', onMove)
    doc.addEventListener('mouseleave', onLeave)
    return () => {
      doc.removeEventListener('mousemove', onMove)
      doc.removeEventListener('mouseleave', onLeave)
      pointerT.value = withTiming(0, { duration: 300 })
    }
  }, [interactive, size, pointerX, pointerY, pointerT])

  const lookX = useDerivedValue(() => (glanceX.value * (1 - pointerT.value) + pointerX.value * 4.5 * pointerT.value) * (1 - sink.value * 0.8), [glanceX, pointerX, pointerT, sink])
  const lookY = useDerivedValue(() => glanceY.value * (1 - pointerT.value) + pointerY.value * 3 * pointerT.value * (1 - sink.value) + sink.value * 1.5, [glanceY, pointerY, pointerT, sink])

  const bodyStyle = useAnimatedStyle(() => {
    const awake = 1 - sink.value
    const bobY = Math.sin(bob.value * TAU) * 1.4 * awake
    const br = Math.sin(breathe.value * TAU) * sink.value
    const talk = mouth.value * speakT.value
    const ty = (bobY + sink.value * 4 + br * 0.9 - talk * 1.2) * u
    const sx = 1 + sink.value * 0.05 + br * 0.015 + talk * 0.012
    const sy = 1 - sink.value * 0.06 + br * 0.015 + talk * 0.025
    const rot = tilt.value + lookX.value * 0.55 * awake
    const tx = lookX.value * 0.3 * awake * u
    return { transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${rot}deg` }, { scaleX: sx }, { scaleY: sy }] }
  }, [bob, breathe, sink, mouth, speakT, tilt, lookX, u])
  const shadowStyle = useAnimatedStyle(() => {
    const awake = 1 - sink.value
    const bobY = Math.sin(bob.value * TAU) * awake
    return { opacity: 0.75 - bobY * 0.2 + sink.value * 0.2, transform: [{ scaleX: 1 - bobY * 0.06 + sink.value * 0.08 }] }
  }, [bob, sink])
  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lookX.value * u }, { translateY: lookY.value * u }] }), [lookX, lookY, u])
  const lidsStyle = useAnimatedStyle(() => ({ opacity: lids.value, transform: [{ translateX: lookX.value * u * 0.4 }, { translateY: lookY.value * u * 0.4 }] }), [lids, lookX, lookY, u])
  const mouthStyle = useAnimatedStyle(() => {
    const open = mouth.value
    return { opacity: speakT.value, height: (1.6 + open * 8.5) * u, width: (13 - open * 3.5) * u, transform: [{ translateX: lookX.value * u * 0.5 }, { translateY: lookY.value * u * 0.3 }] }
  }, [mouth, speakT, lookX, lookY, u])
  const orbitStyle = useAnimatedStyle(() => {
    const th = orbit.value * TAU
    const depth = (Math.sin(th) + 1) / 2
    const x = 50 + Math.cos(th) * 21
    const y = def.top - 3 + Math.sin(th) * 4.5
    return { opacity: orbitT.value * (0.55 + 0.45 * depth), transform: [{ translateX: x * u }, { translateY: y * u }, { scale: (0.7 + 0.45 * depth) * orbitT.value }] }
  }, [orbit, orbitT, def.top, u])
  const haloStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, orbitT.value + speakT.value * 0.6) * (0.55 + 0.45 * ((Math.sin(orbit.value * TAU) + 1) / 2)) }), [orbitT, speakT, orbit])
  const eyeW = (eyes === 'dots' ? 10 : 9.2) * u
  const eyeH = (eyes === 'dots' ? 10 : 13) * u
  const hi = 3 * u
  const eye = (dx: number) => (
    <Eye key={dx} left={(50 + dx * def.eyeDX) * u - eyeW / 2} top={def.eyeY * u - eyeH / 2} width={eyeW} height={eyeH} highlight={hi} color={eyeColor} blink={blink} lids={lids} />
  )
  const topLight = light ? 0.65 : 0.34
  const rimTop = light ? 0.9 : 0.5
  const label = stateWord[state] ? `${name}, ${stateWord[state]}` : name

  return (
    <View ref={ref} testID={testID} accessibilityRole="image" accessibilityLabel={label} style={[{ width: size, height: size }, style]}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, shadowStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`${id}-sh`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#000" stopOpacity={dark ? 0.5 : 0.22} />
              <Stop offset="0.6" stopColor="#000" stopOpacity={dark ? 0.16 : 0.07} />
              <Stop offset="1" stopColor="#000" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={t.colors.accent.b} stopOpacity={0.45} />
              <Stop offset="0.5" stopColor={t.colors.accent.a} stopOpacity={0.14} />
              <Stop offset="1" stopColor={t.colors.accent.c} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={50} cy={96} rx={32} ry={5} fill={`url(#${id}-sh)`} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, haloStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Ellipse cx={50} cy={92} rx={40} ry={9} fill={`url(#${id}-halo)`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={rgb(shade(base, 0.2))} />
              <Stop offset="0.55" stopColor={rgb(base)} />
              <Stop offset="1" stopColor={rgb(shade(base, -0.26))} />
            </LinearGradient>
            <RadialGradient id={`${id}-hi`} cx="40%" cy="18%" r="52%">
              <Stop offset="0" stopColor="#fff" stopOpacity={topLight} />
              <Stop offset="0.55" stopColor="#fff" stopOpacity={topLight * 0.18} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`${id}-ao`} cx="50%" cy="100%" r="62%">
              <Stop offset="0" stopColor="#000" stopOpacity={dark ? 0.32 : 0.16} />
              <Stop offset="0.6" stopColor="#000" stopOpacity={dark ? 0.08 : 0.04} />
              <Stop offset="1" stopColor="#000" stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity={rimTop} />
              <Stop offset="0.4" stopColor="#fff" stopOpacity={rimTop * 0.12} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={def.path} fill={`url(#${id}-body)`} />
          <Path d={def.path} fill={`url(#${id}-hi)`} />
          <Path d={def.path} fill={`url(#${id}-ao)`} />
          <Path d={def.path} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={1.3} />
        </Svg>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, eyesStyle]}>
          {eye(-1)}
          {eye(1)}
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, lidsStyle]}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Path d={`M${50 - def.eyeDX - 4.5} ${def.eyeY - 0.5} Q${50 - def.eyeDX} ${def.eyeY + 4} ${50 - def.eyeDX + 4.5} ${def.eyeY - 0.5}`} stroke={eyeColor} strokeWidth={2.4} strokeLinecap="round" fill="none" />
            <Path d={`M${50 + def.eyeDX - 4.5} ${def.eyeY - 0.5} Q${50 + def.eyeDX} ${def.eyeY + 4} ${50 + def.eyeDX + 4.5} ${def.eyeY - 0.5}`} stroke={eyeColor} strokeWidth={2.4} strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: def.mouthY * u, alignItems: 'center' }}>
          <Animated.View style={[{ borderRadius: 7 * u, backgroundColor: eyeColor }, mouthStyle]} />
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -7 * u, top: -7 * u, width: 14 * u, height: 14 * u, alignItems: 'center', justifyContent: 'center' }, orbitStyle]}>
        <View style={{ position: 'absolute', width: 14 * u, height: 14 * u, borderRadius: 7 * u, backgroundColor: t.colors.accent.glow, opacity: 0.6 }} />
        <View style={{ width: 7 * u, height: 7 * u, borderRadius: 3.5 * u, backgroundColor: t.colors.accent.solid, ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 ${6 * u}px ${t.colors.accent.ring}` } as object) : null) }}>
          <View style={{ position: 'absolute', left: 1.4 * u, top: 1.2 * u, width: 2.4 * u, height: 2.4 * u, borderRadius: 1.2 * u, backgroundColor: '#fff', opacity: 0.85 }} />
        </View>
      </Animated.View>
      <Zed k={0} size={8 * u} top={def.top} u={u} zT={zT} lids={lids} color={light ? '#5C6168' : '#9BA1A9'} />
      <Zed k={0.5} size={6 * u} top={def.top} u={u} zT={zT} lids={lids} color={light ? '#5C6168' : '#9BA1A9'} />
    </View>
  )
}

function Eye({ left, top, width, height, highlight, color, blink, lids }: { left: number; top: number; width: number; height: number; highlight: number; color: string; blink: SharedValue<number>; lids: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: 1 - lids.value, transform: [{ scaleY: Math.max(0.02, blink.value * (1 - lids.value * 0.95)) }] }), [blink, lids])
  return (
    <Animated.View style={[{ position: 'absolute', left, top, width, height, borderRadius: width / 2, backgroundColor: color }, style]}>
      <View style={{ position: 'absolute', left: width * 0.22, top: height * 0.16, width: highlight, height: highlight, borderRadius: highlight / 2, backgroundColor: '#fff', opacity: 0.85 }} />
    </Animated.View>
  )
}

/** A hand-drawn z (independent of fonts) that rises and fades while sleeping. `k` staggers two of them. */
function Zed({ k, size, top, u, zT, lids, color }: { k: number; size: number; top: number; u: number; zT: SharedValue<number>; lids: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = (zT.value + k) % 1
    return { opacity: lids.value * Math.sin(p * Math.PI), transform: [{ translateX: (68 + p * 12 + k * 6) * u }, { translateY: (top + 4 - p * 20) * u }, { scale: 0.7 + p * 0.5 }] }
  }, [zT, lids, k, top, u])
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Path d="M1.5 1.8 H8.5 L1.5 8.2 H8.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Animated.View>
  )
}

export default AgentAvatar
