import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Pressable, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { ArrowUp, ArrowUpRight, CornerDownRight, FileSearch, MessageCircleQuestion, Quote, RefreshCw, Square } from 'lucide-react-native'
import { availabilityCopy, useLocalModel, type OndaiError } from '@ondai/core'
import { alpha, type FontSizeKey, type SkinInput, type SkinTokens } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { ModelDownload } from '../model-download/model-download'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Skeleton } from '../skeleton/skeleton'
import { StreamingText } from '../streaming-text/streaming-text'
import { SkinRowFace, SkinTile, SkinWell, skinHasWells, Surface, Sweep } from '../surface/surface'
import type { PageQuote } from './prompts'
import { useAskPage, type AskPageResult, type UseAskPageOptions } from './use-ask-page'

/** Every icon AskPage draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface AskPageIcons {
  /** Beside the title, and on the sheet trigger. */
  title: IconInput
  /** The ask key in the field, and the key that stops a running answer. */
  send: IconInput
  stop: IconInput
  /** The mark on each quote. */
  quote: IconInput
  /** The jump mark at the end of a quote. */
  jump: IconInput
  /** Before each follow-up question. */
  followUp: IconInput
  /** The not-in-this-page state. */
  notFound: IconInput
  retry: IconInput
}

/** Every string AskPage shows or announces. `{count}` is filled in. */
export interface AskPageLabels {
  title: string
  placeholder: string
  /** Before the first question. */
  idle: string
  /** Over the starter questions. */
  suggested: string
  thinking: string
  /** Over the quotes. */
  quotes: string
  /** Screen reader hint on a quote. */
  jump: string
  /** Over the follow-up questions. */
  followUps: string
  notFoundTitle: string
  notFoundHint: string
  /** Shown when a long page was cut to the parts that match. */
  trimmed: string
  retry: string
  preparing: string
  /** Screen reader names. */
  send: string
  stop: string
  inputLabel: string
}

export const askPageLabels: AskPageLabels = {
  title: 'Ask this page',
  placeholder: 'Ask about this page…',
  idle: 'Answers come from this page only, on device.',
  suggested: 'Try',
  thinking: 'Reading the page',
  quotes: 'From the page',
  jump: 'Jump to this part of the page',
  followUps: 'Ask next',
  notFoundTitle: 'Not in this page',
  notFoundHint: 'This page does not answer that. Try asking it another way.',
  trimmed: 'Read the parts that match',
  retry: 'Try again',
  preparing: 'Preparing model',
  send: 'Ask',
  stop: 'Stop',
  inputLabel: 'Question about this page',
}

export interface AskPageStyles {
  /** The card, the sheet's content, or the inline column. */
  container: StyleProp<ViewStyle>
  header: StyleProp<ViewStyle>
  title: StyleProp<TextStyle>
  /** The echoed question. */
  question: StyleProp<TextStyle>
  answer: StyleProp<TextStyle>
  /** One quote and its text. */
  quote: StyleProp<ViewStyle>
  quoteText: StyleProp<TextStyle>
  followUps: StyleProp<ViewStyle>
  inputRow: StyleProp<ViewStyle>
  input: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
}

/** What `renderQuote` gets. */
export interface AskPageQuoteProps {
  quote: PageQuote
  index: number
  /** Calls `onJump` with this quote. */
  onPress: () => void
}

/** What `renderFollowUp` gets. */
export interface AskPageFollowUpProps {
  question: string
  index: number
  /** Asks it. */
  onPress: () => void
}

/** The view state AskPage is in: the shared AI states plus `notFound`. */
export type AskPageView = 'idle' | 'thinking' | 'streaming' | 'done' | 'notFound' | 'error' | 'refusal' | 'unavailable' | 'preparing'

export interface AskPageProps extends UseAskPageOptions {
  /** The text of the page on screen. Answers and quotes come only from it. */
  text: string
  /** The page's title, given to the model as context. */
  pageTitle?: string
  /** Layout: a `card` above the page, `inline` in its flow, or a `sheet` behind a trigger key. */
  presentation?: 'card' | 'inline' | 'sheet'
  /** Quotes as `cards` in a quiet well, a `rule` down the left like a pull quote, or numbered `chips`. */
  quoteStyle?: 'cards' | 'rule' | 'chips'
  /**
   * The look: `clean`, `minimal`, `glass`, `pop`, `candy`, `metal`, `shine` or `bevel`. Changes the card,
   * the field, the quotes, the follow-up chips and the keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for keys, quote rules, gloss and glow. Defaults to the theme accent. */
  tint?: string
  /** Container corner radius. Defaults to the variant's. */
  radius?: number
  /** Shortcut for `labels.title`. */
  title?: string
  /** Shortcut for `labels.placeholder`. */
  placeholder?: string
  icons?: Partial<AskPageIcons>
  labels?: Partial<AskPageLabels>
  styles?: Partial<AskPageStyles>
  /** Starter questions shown before the first question and after "not in this page". */
  suggestions?: string[]
  /** A question to ask on mount (with `autoRun`) or to prefill. */
  initialQuestion?: string
  autoRun?: boolean
  showQuotes?: boolean
  showFollowUps?: boolean
  showBadge?: boolean
  /** Hide the question field (drive it with `initialQuestion` or the hook). */
  hideInput?: boolean
  /** The sheet is open (controlled), for `presentation="sheet"`. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** A quote was tapped: scroll the page to `quote.start` and highlight `start..end`. */
  onJump?: (quote: PageQuote, index: number) => void
  onAsk?: (question: string) => void
  /** Draw one quote yourself. */
  renderQuote?: (props: AskPageQuoteProps) => ReactNode
  /** Draw one follow-up question yourself. */
  renderFollowUp?: (props: AskPageFollowUpProps) => ReactNode
  /** Draw the streaming or finished answer yourself. */
  renderAnswer?: (props: AskPageResult & { streaming: boolean }) => ReactNode
  /** Before the first question. */
  renderEmpty?: (props: { ask: (question: string) => void }) => ReactNode
  /** When the page does not hold the answer. */
  renderNotFound?: (props: { question: string; ask: (question: string) => void }) => ReactNode
  /** Draw an error yourself. `retry` is undefined for a refusal. */
  renderError?: (error: OndaiError, retry?: () => void) => ReactNode
  /** The page itself, drawn above the card (or beside the sheet trigger). */
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<AskPageProps['size']>
const sizes: Record<Size, { body: FontSizeKey; small: FontSizeKey; title: FontSizeKey; icon: number; pad: number; gap: number; tile: number; key: 'sm' | 'md'; input: number; chip: 'sm' | 'md' }> = {
  sm: { body: 'sm', small: 'xs', title: 'sm', icon: 14, pad: 12, gap: 10, tile: 22, key: 'sm', input: 42, chip: 'sm' },
  md: { body: 'md', small: 'sm', title: 'sm', icon: 16, pad: 16, gap: 12, tile: 26, key: 'sm', input: 48, chip: 'sm' },
  lg: { body: 'lg', small: 'md', title: 'md', icon: 18, pad: 18, gap: 14, tile: 30, key: 'md', input: 56, chip: 'md' },
}
type Z = (typeof sizes)[Size]

/**
 * Ask about the document on screen, on device. The answer streams in grounded in the page's text, with the
 * quotes it came from (tap to jump) and follow-up questions, and says so plainly when the page does not hold it.
 */
export function AskPage({ variant, tint, ...props }: AskPageProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <AskPageInner {...props} />
    </SkinProvider>
  )
}

function AskPageInner({
  text,
  pageTitle,
  presentation = 'card',
  quoteStyle = 'cards',
  size = 'md',
  radius,
  title,
  placeholder,
  icons = {},
  labels: labelsProp,
  styles = {},
  suggestions,
  initialQuestion = '',
  autoRun = false,
  showQuotes = true,
  showFollowUps = true,
  showBadge = true,
  hideInput = false,
  open: openProp,
  onOpenChange,
  onJump,
  onAsk,
  renderQuote,
  renderFollowUp,
  renderAnswer,
  renderEmpty,
  renderNotFound,
  renderError,
  children,
  style,
  testID,
  ...hookOptions
}: Omit<AskPageProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: AskPageLabels = { ...askPageLabels, ...labelsProp, ...(title !== undefined ? { title } : null), ...(placeholder !== undefined ? { placeholder } : null) }
  const page = useAskPage(hookOptions)
  const model = useLocalModel('text')
  const [draft, setDraft] = useState(autoRun ? '' : initialQuestion)
  const [sheetState, setSheetState] = useState(false)
  const sheetOpen = openProp ?? sheetState
  const setSheetOpen = (o: boolean) => (setSheetState(o), onOpenChange?.(o))
  const ran = useRef(false)

  const ask = (question: string) => {
    const q = question.trim()
    if (!q || !text.trim()) return
    setDraft('')
    onAsk?.(q)
    void page.ask(text, q, pageTitle).catch(() => {})
  }
  useEffect(() => {
    if (!autoRun || ran.current || !initialQuestion.trim() || !model.isReady) return
    ran.current = true
    ask(initialQuestion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialQuestion, model.isReady])
  useEffect(() => {
    if (page.status === 'done') void Haptics.notificationAsync(page.notFound ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [page.status, page.notFound])

  const availability = model.availability && model.availability.status !== 'ready' ? model.availability : null
  const view: AskPageView = availability
    ? availability.status === 'preparing'
      ? 'preparing'
      : 'unavailable'
    : page.status === 'thinking' || (page.status === 'streaming' && !page.answer)
      ? 'thinking'
      : page.status === 'streaming'
        ? 'streaming'
        : page.status === 'refusal' || page.status === 'error'
          ? page.status
          : page.status === 'done'
            ? page.notFound
              ? 'notFound'
              : 'done'
            : 'idle'
  const streaming = view === 'streaming'
  const answered = view === 'streaming' || view === 'done'
  const retryable = view === 'error'
  const retry = () => ask(page.question)
  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  const quiet = s.skin === 'clean' || s.skin === 'minimal'
  const wells = skinHasWells(s.skin)
  const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

  const jump = (q: PageQuote, i: number) => {
    void Haptics.selectionAsync().catch(() => {})
    onJump?.(q, i)
  }

  const followUp = (question: string, i: number) =>
    renderFollowUp ? (
      <View key={`f${i}`}>{renderFollowUp({ question, index: i, onPress: () => ask(question) })}</View>
    ) : (
      <Chip key={`f${i}`} label={question} size={z.chip} multiline icon={renderIcon(icons.followUp, CornerDownRight, { size: z.icon - 3, strokeWidth: 1.75, color: t.colors.textTertiary }) ?? undefined} variant={quiet ? 'outline' : 'soft'} onPress={() => ask(question)} />
    )
  const chipRow = (list: string[], heading: string) =>
    list.length ? (
      <View style={{ gap: 6 }}>
        <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>{heading}</Text>
        <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, styles.followUps]}>{list.map(followUp)}</View>
      </View>
    ) : null

  const quoteList =
    showQuotes && page.quotes.length && answered ? (
      <Animated.View entering={fade} style={{ gap: 6 }}>
        <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>{labels.quotes}</Text>
        <View style={quoteStyle === 'chips' ? { flexDirection: 'row', flexWrap: 'wrap', gap: 6 } : { gap: 6 }}>
          {page.quotes.map((q, i) =>
            renderQuote ? (
              <View key={q.start}>{renderQuote({ quote: q, index: i, onPress: () => jump(q, i) })}</View>
            ) : (
              <QuoteRow key={q.start} quote={q} index={i} onPress={() => jump(q, i)} z={z} s={s} quoteStyle={quoteStyle} icons={icons} labels={labels} styles={styles} />
            ),
          )}
        </View>
      </Animated.View>
    ) : null

  const answerView = renderAnswer ? (
    renderAnswer({ question: page.question, answer: page.answer, quotes: page.quotes, followUps: page.followUps, notFound: page.notFound, streaming })
  ) : (
    <StreamingText text={page.answer} streaming={streaming} size={z.body} color={t.colors.text} style={styles.answer} />
  )

  const questionEcho = page.question && view !== 'idle' && view !== 'unavailable' && view !== 'preparing' ? (
    <Text style={[typeStyle(t, z.small, { weight: 'medium' }), { color: t.colors.textSecondary }, styles.question]} numberOfLines={2}>
      {page.question}
    </Text>
  ) : null

  let state: ReactNode
  if (view === 'preparing' && availability?.status === 'preparing') state = <ModelDownload progress={availability.progress} variant="bar" size="sm" label={labels.preparing} />
  else if (view === 'unavailable' && availability) state = <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{availabilityCopy(availability).title}</Text>
  else if (view === 'thinking')
    state = (
      <View style={{ gap: 12 }}>
        <ShimmerText size="sm" active>
          {labels.thinking}
        </ShimmerText>
        <Skeleton lines={2} height={10} radius={5} style={{ paddingVertical: 2 }} />
      </View>
    )
  else if ((view === 'error' || view === 'refusal') && page.error)
    state = <Animated.View entering={fade}>{renderError ? renderError(page.error, retryable ? retry : undefined) : <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{page.error.message}</Text>}</Animated.View>
  else if (view === 'notFound')
    state = (
      <Animated.View entering={fade} style={{ gap: z.gap }}>
        {renderNotFound ? (
          renderNotFound({ question: page.question, ask })
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }} accessibilityRole="summary">
              <Tile size={z.tile}>{renderIcon(icons.notFound, FileSearch, { size: z.icon, strokeWidth: 1.75, color: tileInk(s, t.colors.textTertiary) })}</Tile>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={[typeStyle(t, z.body, { weight: 'medium' }), { color: t.colors.text }]}>{labels.notFoundTitle}</Text>
                <Text style={[typeStyle(t, z.small), { color: t.colors.textSecondary }]}>{labels.notFoundHint}</Text>
              </View>
            </View>
            {suggestions?.length ? chipRow(suggestions.filter((q) => q !== page.question), labels.suggested) : null}
          </>
        )}
      </Animated.View>
    )
  else if (answered)
    state = (
      <Animated.View entering={fade} style={{ gap: z.gap + 2 }}>
        {answerView}
        {quoteList}
        {showFollowUps && view === 'done' ? chipRow(page.followUps, labels.followUps) : null}
      </Animated.View>
    )
  else
    state = renderEmpty ? (
      renderEmpty({ ask })
    ) : (
      <View style={{ gap: z.gap }}>
        <Text style={[typeStyle(t, z.small), { color: t.colors.textSecondary }]}>{labels.idle}</Text>
        {suggestions?.length ? chipRow(suggestions, labels.suggested) : null}
      </View>
    )

  const busy = page.isBusy
  const canSend = !!draft.trim() && !availability
  const inputRow = hideInput ? null : (
    <SkinWell style={[{ flexDirection: 'row', alignItems: 'center', height: wells ? z.input - 8 : z.input, paddingLeft: z.pad - 4, paddingRight: 5, gap: 8 }, !wells ? { borderWidth: hairlineWidth, borderColor: t.colors.hairlineStrong, borderRadius: s.skin === 'clean' ? t.radii.md : s.radius.control } : null, styles.inputRow]}>
      <TextInput
        testID={testID ? `${testID}-input` : undefined}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => ask(draft)}
        editable={!availability}
        placeholder={labels.placeholder}
        placeholderTextColor={t.colors.textTertiary}
        selectionColor={s.tint}
        returnKeyType="send"
        accessibilityLabel={labels.inputLabel}
        style={[typeStyle(t, z.body), { flex: 1, minWidth: 0, color: t.colors.text, paddingVertical: 0, outlineStyle: 'none' } as never, styles.input]}
      />
      {busy ? (
        <Button variant={quiet ? 'ghost' : 'raised'} size={z.key} icon={keyIcon(icons.stop, Square)} accessibilityLabel={labels.stop} onPress={page.stop} />
      ) : (
        <Button variant="solid" size={z.key} icon={keyIcon(icons.send, ArrowUp)} accessibilityLabel={labels.send} disabled={!canSend} onPress={() => ask(draft)} />
      )}
    </SkinWell>
  )

  const footer =
    showBadge || (retryable && !renderError) || page.trimmed ? (
      <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 28 }, styles.footer]}>
        {showBadge && !availability ? <OnDeviceBadge size="sm" style={{ alignSelf: 'center' }} state={view === 'notFound' ? 'done' : (page.status as never)} provider={page.provider} locality={page.locality as never} /> : <View />}
        {retryable && !renderError ? (
          <Button title={labels.retry} variant="outline" size={z.key} onPress={retry} icon={keyIcon(icons.retry, RefreshCw)} />
        ) : page.trimmed && answered ? (
          <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>{labels.trimmed}</Text>
        ) : null}
      </View>
    ) : null

  const header = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 }, styles.header]}>
      <Tile size={z.tile}>{renderIcon(icons.title, MessageCircleQuestion, { size: z.icon, strokeWidth: 1.75, color: tileInk(s, t.colors.textTertiary) })}</Tile>
      <Text style={[typeStyle(t, z.title, { weight: 'medium' }), { flex: 1, color: t.colors.text }, styles.title]} numberOfLines={1}>
        {labels.title}
      </Text>
    </View>
  )

  const content = (
    <>
      {header}
      {questionEcho}
      <View accessibilityLiveRegion="polite">{state}</View>
      {inputRow}
      {footer}
    </>
  )
  const panelRadius = radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container)

  if (presentation === 'sheet') {
    return (
      <View style={[{ gap: 10 }, style]} testID={testID}>
        {children}
        <View style={{ flexDirection: 'row' }}>
          <Button title={labels.title} variant={quiet ? 'outline' : 'raised'} size={z.key} icon={keyIcon(icons.title, MessageCircleQuestion)} onPress={() => setSheetOpen(true)} />
        </View>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} presentation="sheet" variant="solid" inline>
          <View style={[{ padding: 20, gap: z.gap }, styles.container]}>{content}</View>
        </Sheet>
      </View>
    )
  }
  if (presentation === 'inline') {
    return (
      <View style={[{ gap: 12 }, style]} testID={testID}>
        {children}
        <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined} style={[{ gap: z.gap }, styles.container]}>
          {content}
        </Animated.View>
      </View>
    )
  }
  return (
    <View style={[{ gap: 12 }, style]} testID={testID}>
      {children}
      <Surface radius={panelRadius} style={[{ padding: z.pad, paddingTop: z.pad - 4, gap: z.gap }, styles.container]}>
        {content}
      </Surface>
    </View>
  )
}

/* ---------------------------------------------------------------------------------------------- */

/** One grounded quote: tap to jump to it in the page. */
function QuoteRow({ quote, index, onPress, z, s, quoteStyle, icons, labels, styles }: AskPageQuoteProps & { z: Z; s: SkinTokens; quoteStyle: NonNullable<AskPageProps['quoteStyle']>; icons: Partial<AskPageIcons>; labels: AskPageLabels; styles: Partial<AskPageStyles> }) {
  const t = useTheme()
  const quiet = s.skin === 'clean' || s.skin === 'minimal'
  const r = Math.max(8, s.radius.inset)
  const textStyle: StyleProp<TextStyle> = [typeStyle(t, z.small), { flex: 1, color: t.colors.text }, styles.quoteText]
  const jumpMark = renderIcon(icons.jump, ArrowUpRight, { size: z.icon - 2, strokeWidth: 1.75, color: t.colors.textTertiary })
  const a11y = { accessibilityRole: 'link' as const, accessibilityLabel: `“${quote.text}”`, accessibilityHint: labels.jump }

  if (quoteStyle === 'chips') {
    return (
      <Pressable onPress={onPress} {...a11y} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, maxWidth: '100%' })}>
        <Surface elevation="inset" radius={Math.min(r, 12)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 7, height: z.input - 18, paddingLeft: 4, paddingRight: 10 }, styles.quote]}>
          <Index n={index + 1} size={z.input - 26} s={s} />
          <Text numberOfLines={1} style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.text, flexShrink: 1 }]}>{`“${quote.text}”`}</Text>
        </Surface>
      </Pressable>
    )
  }
  if (quoteStyle === 'rule') {
    return (
      <Pressable onPress={onPress} {...a11y} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, borderRadius: 6 }, styles.quote]}>
        {(st) => (
          <>
            <View style={{ alignSelf: 'stretch', width: 2, borderRadius: 1, backgroundColor: quiet ? t.colors.hairlineStrong : s.tint, opacity: st.pressed ? 0.6 : 1 }} />
            <Text style={[textStyle, { color: t.colors.textSecondary }]}>{`“${quote.text}”`}</Text>
            {jumpMark}
          </>
        )}
      </Pressable>
    )
  }
  const mark = renderIcon(icons.quote, Quote, { size: z.icon - 3, strokeWidth: 2, color: quiet ? t.colors.textTertiary : s.tint })
  return (
    <Pressable onPress={onPress} {...a11y}>
      {(st) => (
        <Surface elevation="inset" radius={s.skin === 'clean' ? t.radii.md : r} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, overflow: 'hidden' }, styles.quote]}>
          {(st.pressed || (st as { hovered?: boolean }).hovered) && skinHasWells(s.skin) ? <SkinRowFace radius={r} /> : null}
          {st.pressed && !skinHasWells(s.skin) ? <View style={{ position: 'absolute', inset: 0, backgroundColor: /^#[0-9a-f]{6}$/i.test(s.tint) ? alpha(s.tint, 0.08) : 'transparent' } as ViewStyle} /> : null}
          {mark}
          <Text style={textStyle}>{quote.text}</Text>
          {jumpMark}
        </Surface>
      )}
    </Pressable>
  )
}

/** A quote's number, on a small plate in the chip. */
function Index({ n, size, s }: { n: number; size: number; s: SkinTokens }) {
  const t = useTheme()
  const solid = s.skin === 'pop' || s.skin === 'candy' || s.skin === 'metal' || s.skin === 'bevel'
  return (
    <View style={{ minWidth: size, height: size, paddingHorizontal: 4, borderRadius: Math.round(size * 0.3), alignItems: 'center', justifyContent: 'center', backgroundColor: solid ? s.tile.fill : s.skin === 'minimal' ? 'transparent' : t.colors.surface, borderWidth: s.skin === 'minimal' ? hairlineWidth : 0, borderColor: t.colors.hairlineStrong }}>
      <Text style={[typeStyle(t, 'xs', { weight: 'semibold' }), { color: solid ? s.tile.ink : t.colors.textSecondary, fontVariant: ['tabular-nums'] }]}>{n}</Text>
    </View>
  )
}

/** Icon ink on the variant's tile: the tile's own ink, the key's ink for `shine`, else the muted ink. */
function tileInk(s: SkinTokens, muted: string) {
  return skinHasWells(s.skin) ? s.tile.ink : s.skin === 'shine' ? s.primary.fg : muted
}

/** The tile behind the header icon: the variant's keycap, candy, chrome cap or frosted tile; `shine` a small lit key; quiet looks keep it bare. */
function Tile({ size, children }: { size: number; children: ReactNode }) {
  const s = useSkin()
  if (children === null || children === undefined || children === false) return null
  if (skinHasWells(s.skin)) return <SkinTile size={size}>{children}</SkinTile>
  if (s.skin !== 'shine') return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
  const r = Math.round(size * 0.32)
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: s.primary.fill, borderWidth: s.primary.borderWidth, borderColor: s.primary.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: s.primary.shadow } as ViewStyle}>
      <Sweep color={s.shine.sweep} period={5200} width={0.9} />
      <View>{children}</View>
    </View>
  )
}

export default AskPage
