import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Platform, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { ArrowLeftRight, ArrowRight, Check, Copy, Languages, RefreshCw } from 'lucide-react-native'
import { availabilityCopy, useLocalModel, type OndaiError } from '@ondai/core'
import type { FontSizeKey, SkinInput, SkinTokens } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { ModelDownload } from '../model-download/model-download'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Skeleton } from '../skeleton/skeleton'
import { StreamingText } from '../streaming-text/streaming-text'
import { frost, SkinTile, skinHasWells, Surface, Sweep } from '../surface/surface'
import { findLanguage, translateLanguages, type TranslateLanguage } from './prompts'
import { useTranslate, type UseTranslateOptions } from './use-translate'

/** Every icon Translate draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface TranslateIcons {
  /** On the header tile. */
  title: IconInput
  /** Between the two language names in the header. */
  direction: IconInput
  /** The translate key (with `autoRun` off). */
  run: IconInput
  /** Swap the languages. */
  swap: IconInput
  /** Copy the translation, and its confirmation. */
  copy: IconInput
  copied: IconInput
  retry: IconInput
}

/** Every string Translate shows or announces. `{language}` is filled in with the target's name. */
export interface TranslateLabels {
  run: string
  /** While the model reads, before the first words. */
  thinking: string
  /** Before the first run. */
  idle: string
  /** When there is no text to translate. */
  empty: string
  retry: string
  copy: string
  copied: string
  swap: string
  preparing: string
  /** Screen reader names for the language row and the source text. */
  languages: string
  source: string
}

export interface TranslateStyles {
  /** The card. */
  container: StyleProp<ViewStyle>
  header: StyleProp<ViewStyle>
  /** The source text. */
  source: StyleProp<TextStyle>
  /** The language chip row. */
  languages: StyleProp<ViewStyle>
  language: StyleProp<ViewStyle>
  /** The translation and its text. */
  result: StyleProp<ViewStyle>
  text: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
}

export const translateLabels: TranslateLabels = {
  run: 'Translate',
  thinking: 'Translating into {language}',
  idle: 'Pick a language. It translates on this phone.',
  empty: 'Nothing to translate yet.',
  retry: 'Try again',
  copy: 'Copy',
  copied: 'Copied',
  swap: 'Swap languages',
  preparing: 'Preparing model',
  languages: 'Translate into',
  source: 'Original text',
}

export interface TranslateLanguageProps {
  language: TranslateLanguage
  selected: boolean
  disabled: boolean
  onPress: () => void
}

export interface TranslateResultProps {
  translation: string
  source: string
  from: TranslateLanguage
  to: TranslateLanguage
  streaming: boolean
}

export interface TranslateActionProps {
  run: () => void
  busy: boolean
  label: string
}

export interface TranslateSwapEvent {
  /** The new source text (the old translation). */
  text: string
  from: string
  to: string
}

export interface TranslateProps extends UseTranslateOptions {
  /** The text to translate. */
  text: string
  /** Language of `text` (a code from `languages`). */
  from?: string
  /** The language to translate into. Changing it translates again. */
  to?: string
  /** Called when the person picks another target language. */
  onChangeTarget?: (code: string) => void
  /** Called after a swap with the new source text and pair. */
  onSwap?: (next: TranslateSwapEvent) => void
  /** The target chips, as codes. Defaults to every language in `languages` except `from`. */
  targets?: string[]
  /**
   * The look: `clean`, `minimal`, `glass`, `pop`, `candy`, `metal`, `shine` or `bevel`. Changes the card,
   * the header tile, the language chips and the keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for keys, chips, gloss and glow. Defaults to the theme accent. */
  tint?: string
  /** Card corner radius. Defaults to the variant's. */
  radius?: number
  icons?: Partial<TranslateIcons>
  labels?: Partial<TranslateLabels>
  styles?: Partial<TranslateStyles>
  /** Translate on mount and when the text or the target changes. */
  autoRun?: boolean
  /** Show the original text above the language row. */
  showSource?: boolean
  showBadge?: boolean
  /** Copy and swap keys under a finished translation. */
  showActions?: boolean
  /** Draw one language chip yourself. */
  renderLanguage?: (props: TranslateLanguageProps) => ReactNode
  /** Draw the streaming or finished translation yourself. */
  renderResult?: (props: TranslateResultProps) => ReactNode
  /** Shown before the first run (with `autoRun` off). */
  renderEmpty?: (props: TranslateActionProps) => ReactNode
  /** Draw an error yourself. `retry` is undefined for a refusal. */
  renderError?: (error: OndaiError, retry?: () => void) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))

type Size = NonNullable<TranslateProps['size']>
const sizes: Record<Size, { body: FontSizeKey; src: FontSizeKey; title: FontSizeKey; icon: number; pad: number; gap: number; tile: number; key: 'sm' | 'md'; chip: 'sm' | 'md' }> = {
  sm: { body: 'sm', src: 'xs', title: 'sm', icon: 14, pad: 12, gap: 8, tile: 22, key: 'sm', chip: 'sm' },
  md: { body: 'md', src: 'sm', title: 'sm', icon: 16, pad: 16, gap: 10, tile: 26, key: 'sm', chip: 'sm' },
  lg: { body: 'lg', src: 'md', title: 'md', icon: 18, pad: 18, gap: 12, tile: 30, key: 'md', chip: 'md' },
}

/**
 * Live translation on device: the original, a row of target languages, and the translation streaming in,
 * with copy and a swap that flips the pair without another model call.
 */
export function Translate({ variant, tint, ...props }: TranslateProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <TranslateInner {...props} />
    </SkinProvider>
  )
}

function TranslateInner({
  text,
  from: fromProp = 'en',
  to: toProp = 'it',
  onChangeTarget,
  onSwap,
  targets,
  size = 'md',
  radius,
  icons = {},
  labels: labelsProp,
  styles = {},
  autoRun = true,
  showSource = true,
  showBadge = true,
  showActions = true,
  renderLanguage,
  renderResult,
  renderEmpty,
  renderError,
  style,
  testID,
  ...hookOptions
}: Omit<TranslateProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: TranslateLabels = { ...translateLabels, ...labelsProp }
  const languages = hookOptions.languages ?? translateLanguages
  const tr = useTranslate(hookOptions)
  const model = useLocalModel('text')
  const [source, setSource] = useState(text)
  const [from, setFrom] = useState(fromProp)
  const [to, setTo] = useState(toProp)
  const [copied, setCopied] = useState(false)
  const ran = useRef<string | null>(null)

  // Follow the props when the app changes them.
  useEffect(() => setSource(text), [text])
  useEffect(() => setFrom(fromProp), [fromProp])
  useEffect(() => setTo(toProp), [toProp])

  useEffect(() => {
    const key = `${from}|${to}|${source}`
    if (!autoRun || !source.trim() || ran.current === key || !model.isReady || from === to) return
    ran.current = key
    void tr.run(source, to, from).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, from, to, autoRun, model.isReady])
  useEffect(() => {
    if (tr.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [tr.status])
  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(id)
  }, [copied])

  const fromLang = findLanguage(from, languages)
  const toLang = findLanguage(to, languages)
  const chips = (targets ?? languages.map((l) => l.code)).filter((c) => c !== from).map((c) => findLanguage(c, languages))
  const unavailable = model.availability && model.availability.status !== 'ready'
  const busy = tr.isBusy
  const streaming = tr.status === 'streaming'
  const empty = !source.trim()
  const run = () => {
    if (empty) return
    ran.current = `${from}|${to}|${source}`
    void tr.run(source, to, from).catch(() => {})
  }
  const pick = (code: string) => {
    void Haptics.selectionAsync().catch(() => {})
    onChangeTarget?.(code)
    setTo(code)
    if (empty || !model.isReady) return
    // A pick is an explicit ask, so it translates even with autoRun off.
    ran.current = `${from}|${code}|${source}`
    void tr.run(source, code, from).catch(() => {})
  }
  const swap = () => {
    const next = tr.swap()
    if (!next) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    // The swapped pair is already translated: mark it run so autoRun does not ask the model again.
    ran.current = `${next.from}|${next.to}|${next.source}`
    setSource(next.source)
    setFrom(next.from)
    setTo(next.to)
    onSwap?.({ text: next.source, from: next.from, to: next.to })
  }
  const copy = () => {
    void Haptics.selectionAsync().catch(() => {})
    void Clipboard.setStringAsync(tr.translation).then(() => setCopied(true)).catch(() => {})
  }

  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  // The result on screen belongs to this pair (not a stale run for another target).
  const current = tr.to === to && tr.from === from
  const idle = !busy && !tr.error && (!current || !tr.translation)
  const retryable = !!tr.error && tr.error.kind !== 'refusal'
  const done = tr.status === 'done' && current && !!tr.translation
  const quiet = s.skin === 'clean' || s.skin === 'minimal'
  const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))
  const secondary = skinHasWells(s.skin) || s.skin === 'shine' ? 'raised' : 'ghost'

  const languageRow = (
    <View accessibilityLabel={labels.languages} accessibilityRole="radiogroup" style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, styles.languages]}>
      {chips.map((l) => {
        const on = l.code === to
        const props: TranslateLanguageProps = { language: l, selected: on, disabled: empty, onPress: () => pick(l.code) }
        if (renderLanguage) return <View key={l.code}>{renderLanguage(props)}</View>
        return <Chip key={l.code} label={l.label} size={z.chip} variant="soft" selected={on} onPress={props.onPress} disabled={empty} accessibilityLabel={l.label} style={styles.language} />
      })}
    </View>
  )

  const resultView = renderResult ? (
    renderResult({ translation: tr.translation, source, from: fromLang, to: toLang, streaming })
  ) : (
    <StreamingText text={tr.translation} streaming={streaming} size={z.body} color={t.colors.text} style={styles.text} />
  )

  const action: TranslateActionProps = { run, busy, label: labels.run }
  const body = unavailable && model.availability ? (
    model.availability.status === 'preparing' ? (
      <ModelDownload progress={model.availability.progress} variant="bar" size="sm" label={labels.preparing} />
    ) : (
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{availabilityCopy(model.availability).title}</Text>
    )
  ) : empty && !tr.translation ? (
    <Note color={t.colors.textTertiary}>{labels.empty}</Note>
  ) : tr.status === 'thinking' ? (
    <View style={{ gap: 12 }}>
      <ShimmerText size="sm" active>
        {fill(labels.thinking, { language: toLang.label })}
      </ShimmerText>
      <Skeleton lines={2} height={10} radius={5} style={{ paddingVertical: 2 }} />
    </View>
  ) : tr.error ? (
    <Animated.View entering={fade}>{renderError ? renderError(tr.error, retryable ? run : undefined) : <Note color={t.colors.textSecondary}>{tr.error.message}</Note>}</Animated.View>
  ) : idle ? (
    renderEmpty ? (
      renderEmpty(action)
    ) : (
      <Note color={t.colors.textSecondary}>{labels.idle}</Note>
    )
  ) : (
    <Animated.View key={`${tr.from}-${tr.to}`} entering={fade}>
      {resultView}
    </Animated.View>
  )

  const doneKeys =
    done && showActions ? (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Button
          variant={secondary}
          size={z.key}
          icon={copied ? keyIcon(icons.copied, Check) : keyIcon(icons.copy, Copy)}
          title={(copied ? icons.copied : icons.copy) === null ? (copied ? labels.copied : labels.copy) : undefined}
          accessibilityLabel={copied ? labels.copied : labels.copy}
          onPress={copy}
        />
        <Button variant={secondary} size={z.key} icon={keyIcon(icons.swap, ArrowLeftRight)} title={icons.swap === null ? labels.swap : undefined} accessibilityLabel={labels.swap} onPress={swap} />
      </View>
    ) : null
  const showRunKey = idle && !autoRun && !empty && !renderEmpty
  const trailing = showRunKey ? (
    <Button title={labels.run} size={z.key} variant="solid" onPress={run} icon={keyIcon(icons.run, Languages)} />
  ) : retryable && !renderError ? (
    <Button title={labels.retry} variant="outline" size={z.key} onPress={run} icon={keyIcon(icons.retry, RefreshCw)} />
  ) : (
    doneKeys
  )

  const muted = tileInk(s, t.colors.textTertiary)
  const titleStyle = [typeStyle(t, z.title, { weight: 'medium' }), { color: t.colors.text }]
  const arrow = renderIcon(icons.direction, ArrowRight, { size: z.icon - 2, strokeWidth: 1.75, color: t.colors.textTertiary })
  const titleIcon = renderIcon(icons.title, Languages, { size: z.icon, strokeWidth: 1.75, color: muted })

  return (
    <View style={style} testID={testID}>
      <Surface radius={radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container)} style={[{ paddingHorizontal: z.pad, paddingTop: z.pad - 4, paddingBottom: z.pad - 2, gap: z.gap + 2 }, styles.container]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 }, styles.header]}>
          {titleIcon ? <Tile size={z.tile}>{titleIcon}</Tile> : null}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Text style={[titleStyle, { color: t.colors.textSecondary }]} numberOfLines={1}>
              {fromLang.label}
            </Text>
            {arrow}
            <Text style={titleStyle} numberOfLines={1}>
              {toLang.label}
            </Text>
          </View>
        </View>
        {showSource && source.trim() ? (
          <Text accessibilityLabel={`${labels.source}: ${source}`} numberOfLines={5} style={[typeStyle(t, z.src), { color: t.colors.textSecondary }, styles.source]}>
            {source}
          </Text>
        ) : null}
        {unavailable ? null : languageRow}
        <View style={{ height: hairlineWidth, backgroundColor: quiet ? t.colors.hairline : t.colors.hairlineStrong, opacity: quiet ? 1 : 0.6 }} />
        <View style={[{ minHeight: z.tile }, styles.result]}>{body}</View>
        {(showBadge || trailing) && !unavailable ? (
          <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 28 }, styles.footer]}>
            {showBadge ? <OnDeviceBadge size="sm" style={{ alignSelf: 'center' }} state={tr.status} provider={tr.provider} locality={tr.locality as never} /> : <View />}
            {trailing}
          </View>
        ) : null}
      </Surface>
    </View>
  )
}

/** A status line (idle, empty, error). On `glass` it sits on a small frosted plate, so it reads over whatever is behind. */
function Note({ children, color }: { children: ReactNode; color: string }) {
  const t = useTheme()
  const s = useSkin()
  const line = <Text style={[typeStyle(t, 'sm'), { color }]}>{children}</Text>
  if (s.skin !== 'glass') return line
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: s.radius.control, backgroundColor: s.secondary.fill, borderWidth: 1, borderColor: s.secondary.border, ...(Platform.OS === 'web' ? frost : null) }}>{line}</View>
}

/** Icon ink on the variant's tile: the tile's own ink, the key's ink for `shine`, else the muted ink. */
function tileInk(s: SkinTokens, muted: string) {
  return skinHasWells(s.skin) ? s.tile.ink : s.skin === 'shine' ? s.primary.fg : muted
}

/** The tile behind the header icon: the variant's keycap, candy, chrome cap or frost; a lit key for `shine`; bare otherwise. */
function Tile({ size, children }: { size: number; children: ReactNode }) {
  const s = useSkin()
  if (skinHasWells(s.skin)) return <SkinTile size={size}>{children}</SkinTile>
  if (s.skin !== 'shine') return <>{children}</>
  const r = Math.round(size * 0.32)
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: s.primary.fill, borderWidth: s.primary.borderWidth, borderColor: s.primary.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: s.primary.shadow } as ViewStyle}>
      <Sweep color={s.shine.sweep} period={5200} width={0.9} />
      <View>{children}</View>
    </View>
  )
}

export default Translate
