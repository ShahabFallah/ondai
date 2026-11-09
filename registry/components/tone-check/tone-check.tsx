import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Annoyed, Check, Feather, Frown, Meh, RefreshCw, Smile } from 'lucide-react-native'
import { availabilityCopy, useLocalModel, type OndaiError } from '@ondai/core'
import { alpha, type FontSizeKey, type SkinInput, type Theme } from '@ondai/tokens'
import { renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { ModelDownload } from '../model-download/model-download'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { StreamingText } from '../streaming-text/streaming-text'
import { skinHasWells, SkinWell, Surface } from '../surface/surface'
import { tonePosition, tones, type Tone, type ToneReading } from './prompts'
import { useToneCheck, type UseToneCheckOptions } from './use-tone-check'

/** Every icon ToneCheck draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface ToneCheckIcons {
  friendly: IconInput
  neutral: IconInput
  blunt: IconInput
  tense: IconInput
  /** On the "Soften it" key and the suggestion heading. */
  soften: IconInput
  /** On the "Use softer" key. */
  accept: IconInput
  /** On the "Keep mine" key (none by default). */
  reject: IconInput
  retry: IconInput
}

/** Every string ToneCheck shows or announces. */
export interface ToneCheckLabels {
  /** The pill before the first reading, and the screen reader name of the meter. */
  title: string
  friendly: string
  neutral: string
  blunt: string
  tense: string
  /** Ends of the tone meter. */
  warm: string
  sharp: string
  /** Ends of the formality meter. */
  casual: string
  formal: string
  /** Screen reader name of the formality meter. */
  formality: string
  /** While the model reads the tone. */
  thinking: string
  /** While the model writes the softer version. */
  softening: string
  /** Before there is enough text to read. */
  idle: string
  /** Heading over the softer version. */
  softer: string
  /** The key that asks for a softer version (`suggest="tap"`). */
  soften: string
  accept: string
  reject: string
  retry: string
  preparing: string
}

export interface ToneCheckStyles {
  /** The outer view (card or pill row). */
  container: StyleProp<ViewStyle>
  /** The tone pill and its text. */
  pill: StyleProp<ViewStyle>
  pillText: StyleProp<TextStyle>
  /** The note beside the pill. */
  note: StyleProp<TextStyle>
  meter: StyleProp<ViewStyle>
  /** The softer suggestion block and its text. */
  suggestion: StyleProp<ViewStyle>
  suggestionText: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
}

export const toneCheckLabels: ToneCheckLabels = {
  title: 'Tone',
  friendly: 'Friendly',
  neutral: 'Neutral',
  blunt: 'Blunt',
  tense: 'Tense',
  warm: 'Warm',
  sharp: 'Sharp',
  casual: 'Casual',
  formal: 'Formal',
  formality: 'Formality',
  thinking: 'Reading the tone',
  softening: 'Finding a softer way',
  idle: 'Start typing and the tone shows here.',
  softer: 'A softer way to say it',
  soften: 'Soften it',
  accept: 'Use softer',
  reject: 'Keep mine',
  retry: 'Try again',
  preparing: 'Preparing model',
}

export interface ToneMeterProps {
  reading: ToneReading | null
  /** The reading belongs to older text, or a newer check is running. */
  stale: boolean
  thinking: boolean
}

export interface ToneSuggestionProps {
  original: string
  suggestion: string
  streaming: boolean
  accept: () => void
  reject: () => void
}

export interface ToneCheckProps extends UseToneCheckOptions {
  /** The draft to read (usually the current input value). */
  value: string
  /** Called with the softer version when the person takes it. */
  onAccept?: (text: string) => void
  /** Called with every new reading. */
  onReading?: (reading: ToneReading) => void
  /** Quiet time after the last keystroke before reading again. */
  debounceMs?: number
  /** Characters before the first reading. */
  minChars?: number
  /** `auto` writes the softer version as soon as the tone is off; `tap` waits for the Soften key; `off` never offers one. */
  suggest?: 'auto' | 'tap' | 'off'
  /** `card` shows the pill, the note and both meters; `pill` is one compact row, with the suggestion under it. */
  presentation?: 'card' | 'pill'
  /**
   * The look: `clean`, `minimal`, `glass`, `pop`, `candy`, `metal`, `shine` or `bevel`. Changes the card, the
   * meter wells and the keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the keys. Defaults to the theme accent. Tone colours stay semantic. */
  tint?: string
  /** Card corner radius. Defaults to the variant's. */
  radius?: number
  icons?: Partial<ToneCheckIcons>
  labels?: Partial<ToneCheckLabels>
  styles?: Partial<ToneCheckStyles>
  showBadge?: boolean
  /** Draw the meters yourself. */
  renderMeter?: (props: ToneMeterProps) => ReactNode
  /** Draw the softer suggestion and its keys yourself. */
  renderSuggestion?: (props: ToneSuggestionProps) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

const defaultIcons: Record<Tone, ComponentType<IconProps>> = { friendly: Smile, neutral: Meh, blunt: Annoyed, tense: Frown }

type Size = NonNullable<ToneCheckProps['size']>
const sizes: Record<Size, { font: FontSizeKey; body: FontSizeKey; pad: number; icon: number; track: number; knob: number; pillH: number; key: 'sm' | 'md'; gap: number }> = {
  sm: { font: 'xs', body: 'sm', pad: 12, icon: 12, track: 4, knob: 10, pillH: 24, key: 'sm', gap: 10 },
  md: { font: 'sm', body: 'md', pad: 14, icon: 14, track: 6, knob: 12, pillH: 28, key: 'sm', gap: 12 },
  lg: { font: 'md', body: 'lg', pad: 16, icon: 16, track: 8, knob: 14, pillH: 32, key: 'md', gap: 14 },
}

/** The semantic colour of a tone: green for friendly, blue for neutral, amber for blunt, red for tense. */
export function toneColor(t: Theme, tone: Tone | null | undefined): { ink: string; soft: string } {
  switch (tone) {
    case 'friendly':
      return { ink: t.colors.success, soft: t.colors.successSoft }
    case 'neutral':
      return { ink: t.colors.info, soft: t.colors.infoSoft }
    case 'blunt':
      return { ink: t.colors.warning, soft: t.colors.warningSoft }
    case 'tense':
      return { ink: t.colors.danger, soft: t.colors.dangerSoft }
    default:
      return { ink: t.colors.textTertiary, soft: t.colors.muted }
  }
}

/**
 * Reads the tone of a draft as the person types: a pill and a warm-to-sharp meter, plus how casual or formal it
 * sounds. When the tone is off (blunt or tense) it offers a softer version that one tap puts in place.
 * The model runs on device, after a pause in typing; a stale reading dims instead of jumping.
 */
export function ToneCheck({ variant, tint, ...props }: ToneCheckProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <ToneCheckInner {...props} />
    </SkinProvider>
  )
}

function ToneCheckInner({
  value,
  onAccept,
  onReading,
  debounceMs = 700,
  minChars = 12,
  suggest = 'auto',
  presentation = 'card',
  size = 'md',
  radius,
  icons = {},
  labels: labelsProp,
  styles = {},
  showBadge = true,
  renderMeter,
  renderSuggestion,
  style,
  testID,
  ...hookOptions
}: Omit<ToneCheckProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: ToneCheckLabels = { ...toneCheckLabels, ...labelsProp }
  const model = useLocalModel('text', { localOnly: hookOptions.localOnly })
  const tc = useToneCheck({ ...hookOptions, autoSoften: suggest === 'auto' })
  const [keptFor, setKeptFor] = useState<string | null>(null)
  const ranOnce = useRef(false)
  const onReadingRef = useRef(onReading)
  onReadingRef.current = onReading

  const enough = value.trim().length >= minChars
  // Read after a pause; the first reading of text that is already there runs at once.
  useEffect(() => {
    if (!model.isReady) return
    if (!enough) {
      if (tc.reading || tc.isBusy) tc.reset()
      return
    }
    if (value === tc.checked) return
    const h = setTimeout(
      () => {
        ranOnce.current = true
        void tc
          .check(value)
          .then((r) => onReadingRef.current?.(r))
          .catch(() => {})
      },
      ranOnce.current ? debounceMs : 0,
    )
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enough, model.isReady, debounceMs])

  useEffect(() => {
    if (tc.status === 'done' && tc.suggestion) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
  }, [tc.status, tc.suggestion])

  const unavailable = model.availability && model.availability.status !== 'ready'
  const current = tc.checked === value
  const reading = tc.reading
  const stale = !!reading && (!current || tc.phase === 'reading')
  const thinking = tc.phase === 'reading'
  const softening = tc.phase === 'softening' && current
  const showSuggestion = suggest !== 'off' && current && (!!tc.suggestion || softening) && keptFor !== value
  const offerSoften = suggest === 'tap' && current && tc.isOff && !tc.suggestion && !softening && !tc.isBusy && keptFor !== value
  const error: OndaiError | null = tc.error && tc.error.kind !== 'cancelled' ? tc.error : null
  const tone = reading?.tone ?? null
  const color = toneColor(t, tone)
  const fade = motion.enabled ? FadeIn.duration(180) : undefined

  const accept = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onAccept?.(tc.suggestion)
    tc.dismiss()
  }
  const reject = () => {
    setKeptFor(value)
    tc.dismiss()
  }
  const retry = () => void tc.check(value).catch(() => {})
  const soften = () => {
    void Haptics.selectionAsync().catch(() => {})
    void tc.soften(value).catch(() => {})
  }
  const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps> | null) => (override === null ? undefined : (override ?? fallback ?? undefined))
  const toneIcon = (tn: Tone, ink: string, sz = z.icon) => renderIcon(icons[tn], defaultIcons[tn], { size: sz, strokeWidth: 2, color: ink })

  // The pill: the tone in its own colour, or the quiet title before the first reading.
  const pill = (
    <View
      accessibilityLabel={`${labels.title}: ${tone ? labels[tone] : labels.idle}`}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, height: z.pillH, paddingHorizontal: 10, borderRadius: z.pillH / 2, backgroundColor: color.soft, opacity: stale ? 0.6 : 1 }, styles.pill]}
    >
      <Animated.View key={tone ?? 'none'} entering={fade} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {tone ? toneIcon(tone, color.ink) : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.colors.textTertiary }} />}
        <Text numberOfLines={1} style={[typeStyle(t, z.font, { weight: 'semibold' }), { color: tone ? color.ink : t.colors.textSecondary }, styles.pillText]}>
          {tone ? labels[tone] : labels.title}
        </Text>
      </Animated.View>
    </View>
  )

  const noteStyle = [typeStyle(t, z.font), { color: t.colors.textSecondary, flex: 1 }, styles.note]
  const note = thinking ? (
    <View style={{ flex: 1 }}>
      <ShimmerText size={z.font} active>
        {labels.thinking}
      </ShimmerText>
    </View>
  ) : error ? (
    <Text numberOfLines={2} style={noteStyle}>
      {error.message}
    </Text>
  ) : reading ? (
    <Animated.View key={reading.note} entering={fade} style={{ flex: 1 }}>
      <Text numberOfLines={1} style={[noteStyle, { opacity: stale ? 0.6 : 1 }]}>
        {reading.note}
      </Text>
    </Animated.View>
  ) : (
    <Text numberOfLines={2} style={noteStyle}>
      {enough ? '' : labels.idle}
    </Text>
  )

  const meterProps: ToneMeterProps = { reading, stale, thinking }
  const meters = renderMeter ? (
    renderMeter(meterProps)
  ) : (
    <View style={[{ gap: z.gap - 2 }, styles.meter]}>
      <Meter label={labels.title} valueText={tone ? labels[tone] : undefined} value={tone ? tonePosition[tone] : 0.5} knob={reading ? color.ink : undefined} segments={tones.map((tn) => (tn === tone ? color.ink : alpha(toneColor(t, tn).ink, s.dark ? 0.28 : 0.22)))} left={labels.warm} right={labels.sharp} dim={!reading || stale} z={z} />
      <Meter label={labels.formality} valueText={reading ? `${Math.round(reading.formality * 100)}%` : undefined} value={reading?.formality ?? 0.5} knob={reading ? t.colors.text : undefined} left={labels.casual} right={labels.formal} dim={!reading || stale} z={z} />
    </View>
  )

  const suggestionView = showSuggestion ? (
    renderSuggestion ? (
      renderSuggestion({ original: tc.checked, suggestion: tc.suggestion, streaming: softening, accept, reject })
    ) : (
      <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined}>
        <SuggestionBox radius={Math.max(8, (radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container)) - 6)} style={styles.suggestion}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {renderIcon(icons.soften, Feather, { size: z.icon, strokeWidth: 1.75, color: t.colors.textTertiary })}
            {softening && !tc.suggestion ? (
              <ShimmerText size="xs" active>
                {labels.softening}
              </ShimmerText>
            ) : (
              <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>{labels.softer}</Text>
            )}
          </View>
          <StreamingText text={tc.suggestion} streaming={softening} size={z.body} placeholder="" style={styles.suggestionText} />
          {!softening && tc.suggestion ? (
            <View style={[{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 2 }, styles.footer]}>
              <Button title={labels.reject} variant="ghost" size={z.key} icon={keyIcon(icons.reject, null)} onPress={reject} />
              <Button title={labels.accept} variant="solid" size={z.key} icon={keyIcon(icons.accept, Check)} onPress={accept} />
            </View>
          ) : null}
        </SuggestionBox>
      </Animated.View>
    )
  ) : null

  const keys =
    error && error.kind !== 'refusal' ? (
      <View style={[{ flexDirection: 'row', justifyContent: 'flex-end' }, styles.footer]}>
        <Button title={labels.retry} variant="outline" size={z.key} icon={keyIcon(icons.retry, RefreshCw)} onPress={retry} />
      </View>
    ) : offerSoften ? (
      <Animated.View entering={fade} style={[{ flexDirection: 'row', justifyContent: 'flex-end' }, styles.footer]}>
        <Button title={labels.soften} variant="raised" size={z.key} icon={keyIcon(icons.soften, Feather)} onPress={soften} />
      </Animated.View>
    ) : null

  const gate =
    unavailable && model.availability ? (
      model.availability.status === 'preparing' ? (
        <ModelDownload progress={model.availability.progress} variant="bar" size="sm" label={labels.preparing} />
      ) : (
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{availabilityCopy(model.availability).title}</Text>
      )
    ) : null

  const badge = showBadge ? <OnDeviceBadge size="sm" variant={presentation === 'pill' ? 'icon' : 'pill'} state={tc.status} provider={tc.provider} locality={tc.locality as never} /> : null
  const cardRadius = radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container - 2)

  if (presentation === 'pill') {
    return (
      <View style={[{ gap: 8 }, style, styles.container]} testID={testID}>
        <Surface elevation="floating" radius={radius ?? 999} style={{ paddingVertical: 6, paddingLeft: 6, paddingRight: 12 }}>
          {gate ? (
            <View style={{ paddingHorizontal: 8, paddingVertical: 4 }}>{gate}</View>
          ) : (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {pill}
              {renderMeter ? <View style={{ flex: 1 }}>{renderMeter(meterProps)}</View> : <MiniMeter tone={tone} dim={!reading || stale} z={z} />}
              {note}
              {badge}
            </View>
          )}
        </Surface>
        {keys}
        {suggestionView ? <Surface radius={cardRadius} style={{ padding: 6 }}>{suggestionView}</Surface> : null}
      </View>
    )
  }

  return (
    <Surface radius={cardRadius} style={[{ padding: z.pad, gap: z.gap }, style, styles.container]} testID={testID}>
      {gate ?? (
        <>
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: z.pillH }}>
            {pill}
            {note}
            {badge}
          </View>
          {meters}
          {keys}
          {suggestionView}
        </>
      )}
    </Surface>
  )
}

type Z = (typeof sizes)[Size]

/**
 * One meter: a track (optionally in segments) with a knob that springs to `value` (0..1), end labels under it.
 * Dims while there is no reading or a newer one is on the way, so it moves instead of jumping.
 */
function Meter({ label, valueText, value, knob, segments, left, right, dim, z }: { label: string; valueText?: string; value: number; knob?: string; segments?: string[]; left: string; right: string; dim: boolean; z: Z }) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const pos = useSharedValue(value)
  const width = useSharedValue(0)
  const opacity = useSharedValue(dim ? 0.45 : 1)
  useEffect(() => {
    pos.value = motion.enabled ? withSpring(value, t.springs.smooth) : value
  }, [value, motion.enabled, pos, t.springs.smooth])
  useEffect(() => {
    opacity.value = motion.enabled ? withTiming(dim ? 0.45 : 1, { duration: 200 }) : dim ? 0.45 : 1
  }, [dim, motion.enabled, opacity])
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * Math.max(0, width.value - z.knob) }] }), [pos, width, z.knob])
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity])
  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width
  }
  const track = s.placeholder
  const ring = s.dark ? t.colors.elevated : t.colors.surface
  const ends = [typeStyle(t, 'xs'), { color: t.colors.textTertiary }]
  return (
    <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={valueText ? { text: valueText } : undefined} style={[{ gap: 6 }, fadeStyle]}>
      <View onLayout={onLayout} style={{ height: z.knob, justifyContent: 'center' }}>
        {segments ? (
          <View style={{ flexDirection: 'row', gap: 3, height: z.track }}>
            {segments.map((c, i) => (
              <View key={i} style={{ flex: 1, borderRadius: z.track / 2, backgroundColor: c }} />
            ))}
          </View>
        ) : (
          <View style={{ height: z.track, borderRadius: z.track / 2, backgroundColor: track }} />
        )}
        {knob ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', left: 0, top: 0, width: z.knob, height: z.knob, borderRadius: z.knob / 2, backgroundColor: knob, borderWidth: 2, borderColor: ring, boxShadow: t.shadows.sm } as ViewStyle, knobStyle]}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={ends}>{left}</Text>
        <Text style={ends}>{right}</Text>
      </View>
    </Animated.View>
  )
}

/** The compact meter in the `pill` row: four short bars, the ones up to the tone lit in its colour. */
function MiniMeter({ tone, dim, z }: { tone: Tone | null; dim: boolean; z: Z }) {
  const t = useTheme()
  const s = useSkin()
  const color = toneColor(t, tone).ink
  const upto = tone ? tones.indexOf(tone) : -1
  return (
    <View accessible={false} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: z.pillH - 10, opacity: dim ? 0.5 : 1 }}>
      {tones.map((tn, i) => (
        <MiniBar key={tn} lit={i <= upto} color={i <= upto ? color : s.placeholder} height={(z.pillH - 10) * (0.45 + i * 0.18)} width={Math.max(3, z.track - 1)} />
      ))}
    </View>
  )
}

function MiniBar({ lit, color, height, width }: { lit: boolean; color: string; height: number; width: number }) {
  const motion = useMotion()
  const h = useSharedValue(lit ? height : height * 0.7)
  useEffect(() => {
    const to = lit ? height : height * 0.7
    h.value = motion.enabled ? withTiming(to, { duration: 220 }) : to
  }, [lit, height, motion.enabled, h])
  const st = useAnimatedStyle(() => ({ height: h.value }), [h])
  return <Animated.View style={[{ width, borderRadius: width / 2, backgroundColor: color }, st]} />
}

/** The block the softer version sits in: the variant's well on expressive skins, a quiet fill otherwise. */
function SuggestionBox({ children, radius, style }: { children: ReactNode; radius: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  const s = useSkin()
  const inner: ViewStyle = { padding: 12, gap: 8 }
  if (skinHasWells(s.skin))
    return (
      <SkinWell radius={radius} style={style}>
        <View style={inner}>{children}</View>
      </SkinWell>
    )
  return <View style={[inner, { borderRadius: radius, backgroundColor: s.skin === 'minimal' ? 'transparent' : t.colors.muted, borderWidth: s.skin === 'minimal' ? 1 : 0, borderColor: t.colors.hairline }, style]}>{children}</View>
}

export default ToneCheck
