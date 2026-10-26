import { useEffect } from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { hairlineWidth, typeStyle, useMotion, useTheme } from '@ondai/tokens/react'

export interface ModelDownloadProps {
  /** 0..1. Undefined = indeterminate. */
  progress?: number
  variant?: 'bar' | 'ring' | 'card'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  /** e.g. "1.2 GB · Wi-Fi only" */
  detail?: string
  onCancel?: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** Thin ion progress line (or ring / card) with a mono percentage while a model downloads. */
export function ModelDownload({ progress, variant = 'bar', size = 'md', label = 'Preparing model', detail, onCancel, style, testID }: ModelDownloadProps) {
  const t = useTheme()
  const motion = useMotion()
  const p = progress === undefined ? 0 : Math.max(0, Math.min(1, progress))
  const v = useSharedValue(p)
  useEffect(() => {
    v.value = motion.enabled ? withSpring(p, t.springs.smooth) : p
  }, [p, motion.enabled, v, t.springs.smooth])
  const pct = progress === undefined ? '…' : `${Math.round(p * 100)}%`
  const labelStyle = [typeStyle(t, size === 'lg' ? 'md' : 'sm', { weight: 'medium' }), { color: t.colors.text }]
  const monoStyle = [typeStyle(t, 'xs', { mono: true, weight: 'medium' }), { color: t.colors.textTertiary, letterSpacing: 0.4 }]

  if (variant === 'ring') return <Ring v={v} pct={pct} size={size} label={label} style={style} testID={testID} />

  const bar = <Bar v={v} size={size} />
  if (variant === 'bar') {
    return (
      <View testID={testID} accessibilityRole="progressbar" accessibilityValue={{ now: Math.round(p * 100), min: 0, max: 100 }} style={[{ gap: 8 }, style]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <Text style={labelStyle}>{label}</Text>
          <Text style={monoStyle}>{pct}</Text>
        </View>
        {bar}
        {detail ? <Text style={monoStyle}>{detail}</Text> : null}
      </View>
    )
  }
  return (
    <View testID={testID} accessibilityRole="progressbar" style={[{ padding: t.spacing[4], gap: 12, borderRadius: t.radii.lg, borderWidth: hairlineWidth, borderColor: t.colors.hairline, backgroundColor: t.colors.surface }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <Text style={labelStyle}>{label}</Text>
        <Text style={monoStyle}>{pct}</Text>
      </View>
      {bar}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={monoStyle}>{detail ?? 'Downloads once. Runs offline after that.'}</Text>
        {onCancel ? (
          <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
            <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function Bar({ v, size }: { v: SharedValue<number>; size: 'sm' | 'md' | 'lg' }) {
  const t = useTheme()
  const h = size === 'sm' ? 2 : size === 'md' ? 3 : 4
  const s = useAnimatedStyle(() => ({ width: `${Math.max(2, v.value * 100)}%` }), [v])
  return (
    <View style={{ height: h, borderRadius: h, backgroundColor: t.colors.input, overflow: 'hidden' }}>
      <Animated.View style={[{ height: h, borderRadius: h, overflow: 'hidden' }, s]}>
        <Svg width="100%" height={h}>
          <Defs>
            <LinearGradient id="ondai-dl" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={t.colors.accent.a} />
              <Stop offset="0.5" stopColor={t.colors.accent.b} />
              <Stop offset="1" stopColor={t.colors.accent.c} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height={h} fill="url(#ondai-dl)" />
        </Svg>
      </Animated.View>
    </View>
  )
}

function Ring({ v, pct, size, label, style, testID }: { v: SharedValue<number>; pct: string; size: 'sm' | 'md' | 'lg'; label: string; style?: StyleProp<ViewStyle>; testID?: string }) {
  const t = useTheme()
  const d = size === 'sm' ? 28 : size === 'md' ? 40 : 56
  const sw = size === 'sm' ? 2 : 3
  const r = (d - sw) / 2
  const c = 2 * Math.PI * r
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - v.value) }), [v, c])
  return (
    <View testID={testID} accessibilityRole="progressbar" style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>
      <View style={{ width: d, height: d }}>
        <Svg width={d} height={d}>
          <Defs>
            <LinearGradient id="ondai-ring" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={t.colors.accent.a} />
              <Stop offset="1" stopColor={t.colors.accent.c} />
            </LinearGradient>
          </Defs>
          <Circle cx={d / 2} cy={d / 2} r={r} stroke={t.colors.input} strokeWidth={sw} fill="none" />
          <AnimatedCircle cx={d / 2} cy={d / 2} r={r} stroke="url(#ondai-ring)" strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props} transform={`rotate(-90 ${d / 2} ${d / 2})`} />
        </Svg>
      </View>
      <View style={{ gap: 2 }}>
        <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text }]}>{label}</Text>
        <Text style={[typeStyle(t, 'xs', { mono: true }), { color: t.colors.textTertiary }]}>{pct}</Text>
      </View>
    </View>
  )
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export default ModelDownload
