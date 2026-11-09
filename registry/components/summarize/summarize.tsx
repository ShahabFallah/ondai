import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { Check, ChevronDown, Copy, ListCollapse, RefreshCw, RotateCcw } from 'lucide-react-native'
import { availabilityCopy, useLocalModel, type OndaiError } from '@ondai/core'
import type { FontSizeKey, SkinInput, SkinTokens } from '@ondai/tokens'
import { renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { ModelDownload } from '../model-download/model-download'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Skeleton } from '../skeleton/skeleton'
import { StreamingText } from '../streaming-text/streaming-text'
import { BrushedStroke, CandyFill, FaceGradient, SkinTile, skinHasWells, Surface, Sweep } from '../surface/surface'
import type { SummaryLength } from './prompts'
import { useSummarize, type UseSummarizeOptions } from './use-summarize'

/** Every icon Summarize draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface SummarizeIcons {
  /** Beside the title in the card header. */
  title: IconInput
  /** The summarize key, the inline link and the sheet trigger. */
  run: IconInput
  /** The card's open and close chevron. */
  toggle: IconInput
  /** The retry key after an error. */
  retry: IconInput
  /** Copy the summary, and its confirmation. */
  copy: IconInput
  copied: IconInput
  /** Summarize again. */
  again: IconInput
  /** The bullet marker. Leave out for the variant's own dot; `null` hides markers. */
  bullet: IconInput
}

/** Every string Summarize shows or announces. `{part}`, `{total}` and `{count}` are filled in. */
export interface SummarizeLabels {
  title: string
  run: string
  thinking: string
  /** Long input, while each part is read. */
  reading: string
  /** Before the first run. */
  idle: string
  retry: string
  copy: string
  copied: string
  again: string
  preparing: string
  tokens: string
  /** Screen reader names for the card header. */
  show: string
  hide: string
}

export interface SummarizeStyles {
  /** The card, the inline panel, the tooltip. */
  container: StyleProp<ViewStyle>
  header: StyleProp<ViewStyle>
  title: StyleProp<TextStyle>
  body: StyleProp<ViewStyle>
  /** One bullet row and its text. */
  bullet: StyleProp<ViewStyle>
  text: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
}

export const summarizeLabels: SummarizeLabels = {
  title: 'Summary',
  run: 'Summarize',
  thinking: 'Reading the thread',
  reading: 'Reading part {part} of {total}',
  idle: 'Get the gist in a few lines, on device.',
  retry: 'Try again',
  copy: 'Copy',
  copied: 'Copied',
  again: 'Summarize again',
  preparing: 'Preparing model',
  tokens: '{count} tokens',
  show: 'Show summary',
  hide: 'Hide summary',
}

export interface SummaryBulletProps {
  text: string
  index: number
  /** This row is still arriving. */
  streaming: boolean
  /** The marker Summarize would draw (respects `icons.bullet` and the variant). */
  marker: ReactNode
}

export interface SummaryViewProps {
  summary: string
  /** The summary split into rows (bullets length only). */
  bullets: string[]
  streaming: boolean
  length: SummaryLength
}

export interface SummarizeActionProps {
  run: () => void
  busy: boolean
  label: string
}

export interface SummarizeProps extends UseSummarizeOptions {
  /** The text to summarize. */
  text: string
  /** Layout: a collapsible `card`, an `inline` link that opens a card, a `sheet`, or a `tooltip` above its children. */
  presentation?: 'card' | 'inline' | 'sheet' | 'tooltip'
  length?: SummaryLength
  /** How the summary body sits: `plain`, a `quote` with a rule, or `highlighted` in a well. */
  emphasis?: 'plain' | 'quote' | 'highlighted'
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the
   * card, the header tile, the bullet markers and the keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for keys, markers, gloss and glow. Defaults to the theme accent. */
  tint?: string
  /** Container corner radius. Defaults to the variant's. */
  radius?: number
  /** Shortcut for `labels.title`. */
  title?: string
  /** @deprecated Use `labels.thinking`. */
  thinkingLabel?: string
  icons?: Partial<SummarizeIcons>
  labels?: Partial<SummarizeLabels>
  styles?: Partial<SummarizeStyles>
  /** Run on mount and when `text` changes. */
  autoRun?: boolean
  /** The card starts closed (summary hidden until tapped). */
  collapsed?: boolean
  showBadge?: boolean
  /** Copy and summarize-again keys under a finished summary. */
  showActions?: boolean
  /** Draw one bullet row yourself. */
  renderBullet?: (props: SummaryBulletProps) => ReactNode
  /** Draw the finished or streaming summary yourself. */
  renderSummary?: (props: SummaryViewProps) => ReactNode
  /** Shown before the first run (with `autoRun` off). */
  renderEmpty?: (props: SummarizeActionProps) => ReactNode
  /** Draw the summarize key yourself. */
  renderAction?: (props: SummarizeActionProps) => ReactNode
  /** Draw an error yourself. `retry` is undefined for a refusal. */
  renderError?: (error: OndaiError, retry?: () => void) => ReactNode
  /** Children are the content the summary refers to (the tooltip sits above them). */
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  /** @deprecated Use `style`. */
  containerStyle?: StyleProp<ViewStyle>
  testID?: string
}

/** Split a streamed "- a\n- b" summary into bullet rows. A lone marker still being typed is dropped. */
function bulletRows(summary: string): string[] {
  return summary
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*–]\s*/, ''))
    .filter((l) => l.trim().length > 0)
}

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))

type Size = NonNullable<SummarizeProps['size']>
const sizes: Record<Size, { body: FontSizeKey; title: FontSizeKey; icon: number; pad: number; gap: number; tile: number; key: 'sm' | 'md'; dot: number }> = {
  sm: { body: 'sm', title: 'sm', icon: 14, pad: 12, gap: 8, tile: 22, key: 'sm', dot: 6 },
  md: { body: 'md', title: 'sm', icon: 16, pad: 16, gap: 10, tile: 26, key: 'sm', dot: 7 },
  lg: { body: 'lg', title: 'md', icon: 18, pad: 18, gap: 12, tile: 30, key: 'md', dot: 8 },
}
type Z = (typeof sizes)[Size]

/**
 * The gist of long text, on device: a collapsible card, an inline link, a sheet or a tooltip. Streams
 * the summary in, and map-reduces input that does not fit the model's context.
 */
export function Summarize({ variant, tint, ...props }: SummarizeProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <SummarizeInner {...props} />
    </SkinProvider>
  )
}

function SummarizeInner({
  text,
  presentation = 'card',
  length = 'bullets',
  emphasis = 'plain',
  size = 'md',
  radius,
  title,
  thinkingLabel,
  icons = {},
  labels: labelsProp,
  styles = {},
  autoRun = true,
  collapsed = false,
  showBadge = true,
  showActions = true,
  renderBullet,
  renderSummary,
  renderEmpty,
  renderAction,
  renderError,
  children,
  style: styleProp,
  containerStyle,
  testID,
  ...hookOptions
}: Omit<SummarizeProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: SummarizeLabels = { ...summarizeLabels, ...(thinkingLabel ? { thinking: thinkingLabel } : null), ...labelsProp, ...(title !== undefined ? { title } : null) }
  const style = [containerStyle, styleProp]
  const sum = useSummarize({ ...hookOptions, length })
  const model = useLocalModel('text')
  const [open, setOpen] = useState(!collapsed)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const ran = useRef<string | null>(null)

  useEffect(() => {
    if (!autoRun || !text.trim() || ran.current === text || !model.isReady) return
    ran.current = text
    void sum.run(text).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoRun, model.isReady, length])
  useEffect(() => {
    if (sum.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [sum.status])
  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(id)
  }, [copied])

  const unavailable = model.availability && model.availability.status !== 'ready'
  const busy = sum.isBusy
  const streaming = sum.status === 'streaming'
  const run = () => void sum.run(text).catch(() => {})
  const copy = () => {
    void Haptics.selectionAsync().catch(() => {})
    void Clipboard.setStringAsync(sum.summary).then(() => setCopied(true)).catch(() => {})
  }
  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  const bodyLine = typeStyle(t, z.body).lineHeight ?? 22
  const idle = !autoRun && !busy && !sum.summary && !sum.error
  const retryable = !!sum.error && sum.error.kind !== 'refusal'
  const done = sum.status === 'done' && !!sum.summary
  const quiet = s.skin === 'clean' || s.skin === 'minimal'
  // An icon slot on a key: the override, else the default. Components are coloured by the key, so they follow the variant.
  const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

  const marker = (i: number) => {
    if (icons.bullet === null) return null
    const custom = renderIcon(icons.bullet, null, { size: z.icon - 2, strokeWidth: 2, color: quiet ? t.colors.textTertiary : s.tint })
    return (
      <View style={{ width: Math.max(z.icon - 2, z.dot + 2), height: bodyLine, alignItems: 'center', justifyContent: 'center' }} key={`m${i}`}>
        {custom ?? <Dot s={s} size={z.dot} />}
      </View>
    )
  }
  const rows = length === 'bullets' ? bulletRows(sum.summary) : []
  const summaryView = renderSummary ? (
    renderSummary({ summary: sum.summary, bullets: rows, streaming, length })
  ) : length === 'bullets' && sum.summary ? (
    <View style={{ gap: z.gap - 4 }}>
      {rows.map((row, i, all) => {
        const live = streaming && i === all.length - 1
        if (renderBullet) return <View key={i}>{renderBullet({ text: row, index: i, streaming: live, marker: marker(i) })}</View>
        return (
          <View key={i} style={[{ flexDirection: 'row', gap: 10 }, styles.bullet]}>
            {marker(i)}
            <StreamingText text={row} streaming={live} size={z.body} color={t.colors.text} style={[{ flex: 1 }, styles.text]} />
          </View>
        )
      })}
    </View>
  ) : (
    <StreamingText text={sum.summary} streaming={streaming} size={z.body} color={t.colors.text} style={styles.text} />
  )

  const action: SummarizeActionProps = { run, busy, label: labels.run }
  const runKey = renderAction ? renderAction(action) : <Button title={labels.run} size={z.key} variant="solid" onPress={run} icon={keyIcon(icons.run, ListCollapse)} />
  const secondary = skinHasWells(s.skin) || s.skin === 'shine' ? 'raised' : 'ghost'
  const doneKeys = done && showActions ? (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Button
        variant={secondary}
        size={z.key}
        icon={copied ? keyIcon(icons.copied, Check) : keyIcon(icons.copy, Copy)}
        title={(copied ? icons.copied : icons.copy) === null ? (copied ? labels.copied : labels.copy) : undefined}
        accessibilityLabel={copied ? labels.copied : labels.copy}
        onPress={copy}
      />
      <Button variant={secondary} size={z.key} icon={keyIcon(icons.again, RotateCcw)} title={icons.again === null ? labels.again : undefined} accessibilityLabel={labels.again} onPress={run} />
    </View>
  ) : null

  const emphasisStyle: ViewStyle | null = emphasis === 'quote' ? { borderLeftWidth: 2, borderLeftColor: quiet ? t.colors.hairlineStrong : s.tint, paddingLeft: 12 } : null
  const result =
    emphasis === 'highlighted' ? (
      <Surface elevation="inset" radius={s.skin === 'clean' ? t.radii.md : s.radius.inset} style={{ padding: 12 }}>
        {summaryView}
      </Surface>
    ) : (
      <View style={emphasisStyle}>{summaryView}</View>
    )

  const body = (
    <View style={[{ gap: z.gap + 2 }, styles.body]}>
      {unavailable && model.availability ? (
        model.availability.status === 'preparing' ? (
          <ModelDownload progress={model.availability.progress} variant="bar" size="sm" label={labels.preparing} />
        ) : (
          <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{availabilityCopy(model.availability).title}</Text>
        )
      ) : sum.status === 'thinking' ? (
        <View style={{ gap: 12 }}>
          <ShimmerText size="sm" active>
            {sum.progress ? fill(labels.reading, { part: Math.min(sum.progress[0] + 1, sum.progress[1]), total: sum.progress[1] }) : labels.thinking}
          </ShimmerText>
          <Skeleton lines={length === 'oneLine' ? 1 : 3} height={10} radius={5} style={{ paddingVertical: 2 }} />
        </View>
      ) : sum.error ? (
        <Animated.View entering={fade}>
          {renderError ? renderError(sum.error, retryable ? run : undefined) : <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{sum.error.message}</Text>}
        </Animated.View>
      ) : idle ? (
        renderEmpty ? (
          renderEmpty(action)
        ) : (
          <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{labels.idle}</Text>
        )
      ) : (
        <Animated.View entering={fade}>{result}</Animated.View>
      )}
      {(showBadge || idle || (retryable && !renderError) || doneKeys) && !unavailable ? (
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 28 }, styles.footer]}>
          {showBadge ? <OnDeviceBadge size="sm" style={{ alignSelf: 'center' }} state={sum.status} provider={sum.provider} locality={sum.locality as never} /> : <View />}
          {idle ? runKey : retryable && !renderError ? <Button title={labels.retry} variant="outline" size={z.key} onPress={run} icon={keyIcon(icons.retry, RefreshCw)} /> : doneKeys}
        </View>
      ) : null}
    </View>
  )

  const panelRadius = radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container)

  if (presentation === 'inline') {
    return (
      <View style={[{ gap: 10 }, style]} testID={testID}>
        {children}
        {!expanded ? (
          <View style={{ flexDirection: 'row' }}>
            <Button
              title={labels.run}
              variant={quiet ? 'ghost' : 'raised'}
              size={z.key}
              icon={keyIcon(icons.run, ListCollapse)}
              onPress={() => {
                setExpanded(true)
                if (!sum.summary && !busy) run()
              }}
              style={quiet ? { marginLeft: -10 } : undefined}
            />
          </View>
        ) : (
          <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined}>
            <Surface radius={panelRadius} style={[{ padding: z.pad - 2 }, styles.container]}>
              {body}
            </Surface>
          </Animated.View>
        )}
      </View>
    )
  }
  if (presentation === 'sheet') {
    return (
      <View style={[{ gap: 10 }, style]} testID={testID}>
        {children}
        <View style={{ flexDirection: 'row' }}>
          <Button
            title={labels.run}
            variant="outline"
            size={z.key}
            icon={keyIcon(icons.run, ListCollapse)}
            onPress={() => {
              setSheetOpen(true)
              if (!sum.summary && !busy) run()
            }}
          />
        </View>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} presentation="sheet" variant="solid" inline>
          <View style={[{ padding: 20, gap: 14 }, styles.container]}>
            <Header z={z} icon={renderIcon(icons.title, ListCollapse, { size: z.icon, strokeWidth: 1.75, color: tileInk(s, t.colors.textTertiary) })} title={labels.title} titleStyle={[typeStyle(t, 'lg', { weight: 'semibold' }), styles.title]} />
            {body}
          </View>
        </Sheet>
      </View>
    )
  }
  if (presentation === 'tooltip') {
    return (
      <View style={[{ gap: 10 }, style]} testID={testID}>
        <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined} style={{ alignSelf: 'flex-start', maxWidth: 340 }}>
          <Surface elevation="floating" radius={radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container - 4)} style={[{ padding: z.pad - 2 }, styles.container]}>
            {body}
          </Surface>
        </Animated.View>
        {children}
      </View>
    )
  }
  return (
    <View style={[{ gap: 12 }, style]} testID={testID}>
      <Surface radius={panelRadius} style={[{ paddingHorizontal: z.pad, paddingTop: z.pad - 4, paddingBottom: open ? z.pad - 2 : z.pad - 4, gap: z.gap + 2 }, styles.container]}>
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={open ? labels.hide : labels.show} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 }, styles.header]}>
          <Header
            z={z}
            icon={renderIcon(icons.title, ListCollapse, { size: z.icon, strokeWidth: 1.75, color: tileInk(s, t.colors.textTertiary) })}
            title={labels.title}
            titleStyle={[typeStyle(t, z.title, { weight: 'medium' }), styles.title]}
          />
          {sum.inputTokens ? <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{fill(labels.tokens, { count: sum.inputTokens.toLocaleString('en-US') })}</Text> : null}
          <Chevron open={open} icon={icons.toggle} size={z.icon} />
        </Pressable>
        {open ? body : null}
      </Surface>
      {children}
    </View>
  )
}

/** Title row: the icon (on the variant's tile in the expressive looks) and the title. */
function Header({ z, icon, title, titleStyle }: { z: Z; icon: ReactNode; title: string; titleStyle: StyleProp<TextStyle> }) {
  const t = useTheme()
  const tile = icon ? <Tile size={z.tile}>{icon}</Tile> : null
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {tile}
      <Text style={[{ color: t.colors.text, flex: 1 }, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  )
}

/** Icon ink on the variant's tile: the tile's own ink, the key's ink for `shine`, else the muted ink. */
function tileInk(s: SkinTokens, muted: string) {
  return skinHasWells(s.skin) ? s.tile.ink : s.skin === 'shine' ? s.primary.fg : muted
}

/**
 * The tile behind the header icon: the variant's keycap, candy, chrome cap or frosted tile; for `shine` a
 * small key in the tint with its band of light; the quiet looks keep the icon bare.
 */
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

/** The open and close chevron, turning with the card. */
function Chevron({ open, icon, size }: { open: boolean; icon: IconInput | undefined; size: number }) {
  const t = useTheme()
  const motion = useMotion()
  const turn = useSharedValue(open ? 0 : -90)
  useEffect(() => {
    turn.value = motion.enabled ? withTiming(open ? 0 : -90, { duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) }) : open ? 0 : -90
  }, [open, motion.enabled, turn])
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }), [turn])
  const glyph = renderIcon(icon, ChevronDown, { size, strokeWidth: 1.75, color: t.colors.textTertiary })
  return glyph ? <Animated.View style={st}>{glyph}</Animated.View> : null
}

/** A bullet marker in the variant's material: a keycap, a candy, a chrome bead, frosted glass or a plain dot. */
function Dot({ s, size }: { s: SkinTokens; size: number }) {
  const t = useTheme()
  switch (s.skin) {
    case 'pop':
      return <View style={{ width: size, height: size, borderRadius: 2, backgroundColor: s.tile.fill, borderWidth: 1.5, borderColor: s.secondary.border, boxShadow: `0 2px 0 0 ${s.secondary.border}`, marginTop: -2 } as ViewStyle} />
    case 'candy':
      return (
        <View style={{ width: size + 1, height: size + 1, borderRadius: size, boxShadow: `0 2px 4px -1px ${s.tile.candy?.glow ?? 'transparent'}` } as ViewStyle}>
          <CandyFill stops={s.tile.candy!} radius={(size + 1) / 2} />
        </View>
      )
    case 'metal':
      return (
        <View style={{ width: size + 1, height: size + 1, borderRadius: size, boxShadow: s.dark ? '0 1px 2px rgba(0,0,0,0.7)' : '0 1px 2px rgba(16,16,20,0.3)' } as ViewStyle}>
          <FaceGradient stops={s.dark ? ['#FAFAFA', '#A1A1AA', '#52525B'] : ['#FFFFFF', '#C4C4CA', '#71717A']} radius={size} />
          <BrushedStroke radius={size} stops={s.metal.stroke} width={1} />
        </View>
      )
    case 'glass':
      return <View style={{ width: size, height: size, borderRadius: size, backgroundColor: s.secondary.fill, borderWidth: 1, borderColor: s.dark ? 'rgba(255,255,255,0.4)' : 'rgba(9,9,11,0.18)', boxShadow: s.secondary.shadow } as ViewStyle} />
    case 'shine':
      return <View style={{ width: size - 2, height: size - 2, borderRadius: size, backgroundColor: s.primary.fill, boxShadow: `0 0 0 2px ${s.dark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.06)'}` } as ViewStyle} />
    case 'minimal':
      return <View style={{ width: size - 2, height: size - 2, borderRadius: size, borderWidth: 1.25, borderColor: t.colors.textTertiary }} />
    default:
      return <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: t.colors.textTertiary }} />
  }
}

export default Summarize
