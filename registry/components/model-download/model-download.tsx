import { useEffect, useState } from 'react'
import { Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming, type SharedValue } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { ArrowDownToLine, Check, X } from 'lucide-react-native'
import { typeStyle, useMotion, useTheme } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Surface } from '../surface/surface'

export interface ModelDownloadProps {
  /** 0..1. Undefined = indeterminate. */
  progress?: number
  variant?: 'bar' | 'ring' | 'card'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  /** e.g. "1.2 of 2.0 GB" */
  detail?: string
  onCancel?: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
}

const tabular: TextStyle = { fontVariant: ['tabular-nums'] }

/** A thin, calm progress line (or ring, or card) with a tabular percentage while a model downloads. */
export function ModelDownload({ progress, variant = 'bar', size = 'md', label = 'Getting the model ready', detail, onCancel, style, testID }: ModelDownloadProps) {
  const t = useTheme()
  const motion = useMotion()
  const indeterminate = progress === undefined
  const p = indeterminate ? 0 : Math.max(0, Math.min(1, progress))
  const done = !indeterminate && p >= 1
  const v = useSharedValue(p)
  useEffect(() => {
    v.value = motion.enabled ? withSpring(p, t.springs.smooth) : p
  }, [p, motion.enabled, v, t.springs.smooth])
  const pct = indeterminate ? 'Starting' : done ? 'Done' : `${Math.round(p * 100)}%`
  const a11y = { accessibilityRole: 'progressbar' as const, accessibilityLabel: label, accessibilityValue: indeterminate ? undefined : { now: Math.round(p * 100), min: 0, max: 100 } }
  const labelStyle = [typeStyle(t, size === 'lg' ? 'md' : 'sm', { weight: 'medium' }), { color: t.colors.text }]
  const pctStyle = [typeStyle(t, 'sm'), tabular, { color: t.colors.textSecondary }]
  const detailStyle = [typeStyle(t, size === 'sm' ? 'xs' : 'sm'), tabular, { color: t.colors.textSecondary }]

  if (variant === 'ring') {
    return (
      <View testID={testID} {...a11y} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>
        <Ring v={v} size={size} indeterminate={indeterminate} done={done} />
        <View style={{ gap: 1, flexShrink: 1 }}>
          <Text style={labelStyle} numberOfLines={1}>{label}</Text>
          <Text style={detailStyle} numberOfLines={1}>{detail ? `${pct} · ${detail}` : pct}</Text>
        </View>
      </View>
    )
  }

  if (variant === 'bar') {
    return (
      <View testID={testID} {...a11y} style={[{ gap: size === 'sm' ? 6 : 8 }, style]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <Text style={[labelStyle, { flexShrink: 1 }]} numberOfLines={1}>{label}</Text>
          <Text style={pctStyle}>{pct}</Text>
        </View>
        <Bar v={v} size={size} indeterminate={indeterminate} />
        {detail ? <Text style={detailStyle}>{detail}</Text> : null}
      </View>
    )
  }

  const Icon = done ? Check : ArrowDownToLine
  return (
    <Surface testID={testID} {...a11y} style={[{ padding: 16, gap: 14 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon size={20} strokeWidth={1.5} color={t.colors.text} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: t.colors.text }]} numberOfLines={1}>{label}</Text>
          <Text style={[typeStyle(t, 'sm'), tabular, { color: t.colors.textSecondary }]} numberOfLines={1}>{detail ?? (done ? 'Runs offline from here.' : 'Downloads once, then works offline.')}</Text>
        </View>
      </View>
      {done ? null : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Bar v={v} size="md" indeterminate={indeterminate} />
          </View>
          <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), tabular, { color: t.colors.text, minWidth: 34, textAlign: 'right' }]}>{indeterminate ? '' : pct}</Text>
          {onCancel ? <Button variant="ghost" size="sm" accessibilityLabel="Cancel download" icon={<X size={14} strokeWidth={1.75} color={t.colors.textSecondary} />} onPress={onCancel} style={{ marginVertical: -8, marginLeft: -4, marginRight: -8 }} /> : null}
        </View>
      )}
    </Surface>
  )
}

function Bar({ v, size, indeterminate }: { v: SharedValue<number>; size: 'sm' | 'md' | 'lg'; indeterminate: boolean }) {
  const t = useTheme()
  const motion = useMotion()
  const h = size === 'sm' ? 3 : 4
  const [w, setW] = useState(0)
  const slide = useSharedValue(0)
  useEffect(() => {
    if (indeterminate && motion.enabled) {
      slide.value = 0
      slide.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }), -1, false)
    } else {
      cancelAnimation(slide)
      slide.value = 0.35
    }
    return () => cancelAnimation(slide)
  }, [indeterminate, motion.enabled, slide])
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, v.value * 100)}%` }), [v])
  const seg = useAnimatedStyle(() => ({ transform: [{ translateX: -w * 0.3 + slide.value * w * 1.3 }] }), [slide, w])
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))
  return (
    <View onLayout={onLayout} style={{ height: h, borderRadius: h, backgroundColor: t.colors.muted, overflow: 'hidden' }}>
      {indeterminate ? (
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, height: h, width: '30%', borderRadius: h, backgroundColor: t.colors.text }, seg]} />
      ) : (
        <Animated.View style={[{ height: h, borderRadius: h, backgroundColor: t.colors.text }, fill]} />
      )}
    </View>
  )
}

function Ring({ v, size, indeterminate, done }: { v: SharedValue<number>; size: 'sm' | 'md' | 'lg'; indeterminate: boolean; done: boolean }) {
  const t = useTheme()
  const motion = useMotion()
  const d = size === 'sm' ? 28 : size === 'md' ? 36 : 48
  const sw = size === 'sm' ? 2.5 : 3
  const r = (d - sw) / 2
  const c = 2 * Math.PI * r
  const spin = useSharedValue(0)
  useEffect(() => {
    if (indeterminate && motion.enabled) {
      spin.value = 0
      spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false)
    } else {
      cancelAnimation(spin)
      spin.value = 0
    }
    return () => cancelAnimation(spin)
  }, [indeterminate, motion.enabled, spin])
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - (indeterminate ? 0.28 : v.value)) }), [v, c, indeterminate])
  const rot = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }), [spin])
  return (
    <View style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: d, height: d }, rot]}>
        <Svg width={d} height={d}>
          <Circle cx={d / 2} cy={d / 2} r={r} stroke={t.colors.muted} strokeWidth={sw} fill="none" />
          <AnimatedCircle cx={d / 2} cy={d / 2} r={r} stroke={t.colors.text} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props} transform={`rotate(-90 ${d / 2} ${d / 2})`} />
        </Svg>
      </Animated.View>
      {done ? <Check size={d * 0.42} strokeWidth={2} color={t.colors.text} /> : size !== 'sm' ? <ArrowDownToLine size={d * 0.4} strokeWidth={1.75} color={t.colors.textSecondary} /> : null}
    </View>
  )
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export default ModelDownload
