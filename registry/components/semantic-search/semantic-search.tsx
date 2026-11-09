import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { CircleAlert, FileText, History, Search, SearchX, X } from 'lucide-react-native'
import type { SearchHit } from '@ondai/core'
import { alpha, type FontSizeKey, type SkinInput, type SkinTokens } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput } from '@ondai/tokens/react'
import { ModelDownload } from '../model-download/model-download'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { SkinRowFace, SkinTile, SkinWell, skinHasWells, Surface } from '../surface/surface'
import { Skeleton } from '../skeleton/skeleton'
import { useSemanticSearch, type UseSemanticSearchOptions } from './use-semantic-search'

/** Every icon SemanticSearch draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface SemanticSearchIcons {
  /** Leading icon in the field. */
  search: IconInput
  /** The clear button in the field. */
  clear: IconInput
  /** Each result row (`renderIcon` wins per hit). */
  result: IconInput
  /** Recent search rows. */
  recent: IconInput
  /** The empty state. */
  empty: IconInput
  /** The error row. */
  error: IconInput
}

/** Every string SemanticSearch shows or announces. */
export interface SemanticSearchLabels {
  placeholder: string
  /** Title of the `header` presentation. */
  title: string
  /** Group title over recent searches. */
  recent: string
  /** Shown while the query is embedded and matched. */
  searching: string
  /** Shown while the index is built. */
  indexing: string
  /** "3 of 12 items" under the indexing bar. */
  of: string
  items: string
  emptyTitle: string
  emptyHint: string
  /** "Matches “train”, “flight”". */
  matches: string
  /** "84% similar". */
  similar: string
  result: string
  results: string
  /** Footer: how this search ran. */
  byMeaning: string
  keywordsOnly: string
  /** Title for hits `groupBy` puts in an empty group. */
  other: string
  /** Screen reader names. */
  clear: string
  inputLabel: string
}

export const semanticSearchLabels: SemanticSearchLabels = {
  placeholder: 'Search by meaning…',
  title: 'Search',
  recent: 'Recent',
  searching: 'Searching by meaning',
  indexing: 'Indexing on device',
  of: 'of',
  items: 'items',
  emptyTitle: 'Nothing close yet',
  emptyHint: 'Try other words, or fewer of them.',
  matches: 'Matches',
  similar: 'similar',
  result: 'result',
  results: 'results',
  byMeaning: 'By meaning',
  keywordsOnly: 'Keywords only',
  other: 'Other',
  clear: 'Clear',
  inputLabel: 'Search',
}

/** Styles for each part, applied after the component's own. */
export interface SemanticSearchStyles {
  /** The outer view. */
  container: StyleProp<ViewStyle>
  /** The panel the field and results sit in. */
  panel: StyleProp<ViewStyle>
  inputRow: StyleProp<ViewStyle>
  input: StyleProp<TextStyle>
  list: StyleProp<ViewStyle>
  groupTitle: StyleProp<TextStyle>
  row: StyleProp<ViewStyle>
  rowTitle: StyleProp<TextStyle>
  rowWhy: StyleProp<TextStyle>
  /** A result in the `cards` style. */
  card: StyleProp<ViewStyle>
  footer: StyleProp<ViewStyle>
  title: StyleProp<TextStyle>
}

/** What `renderResult` gets for each hit. */
export interface SearchResultProps<M> {
  hit: SearchHit<M>
  index: number
  onPress: () => void
  /** The row's icon as SemanticSearch would draw it (respects `icons` and `renderIcon`). */
  icon: ReactNode
  /** The "why it matched" line, or undefined when there is nothing to say or `showWhy` is off. */
  why?: string
  /** Similarity 0..1 when the hit came from the vector index. */
  similarity?: number
  /** The top hit: return opens it, and the default row shows it lit. */
  active: boolean
}

export interface SemanticSearchProps<M> extends UseSemanticSearchOptions<M> {
  /** Layout: a `bar` panel, a floating `spotlight`, or a `header` with a large title over the panel. */
  presentation?: 'bar' | 'spotlight' | 'header'
  /** Results as a `list`, as separate `cards`, or `grouped` under `groupBy` titles. */
  resultStyle?: 'list' | 'cards' | 'grouped'
  /** The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the panel, the field, the rows and the cards together. */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for tiles, gloss, glow and the match highlight. Defaults to the theme accent. */
  tint?: string
  /** Panel corner radius. Defaults to the variant's. */
  radius?: number
  /** Shortcut for `labels.title`. */
  title?: string
  /** Shortcut for `labels.placeholder`. */
  placeholder?: string
  icons?: Partial<SemanticSearchIcons>
  labels?: Partial<SemanticSearchLabels>
  styles?: Partial<SemanticSearchStyles>
  initialQuery?: string
  autoRun?: boolean
  /** Show the matched words and the similarity on each result. */
  showWhy?: boolean
  /** Mark the matched words inside each result. */
  highlight?: boolean
  /** Earlier searches, shown while the field is empty. Pressing one runs it. */
  recent?: string[]
  groupBy?: (hit: SearchHit<M>) => string
  /** Icon per hit (wins over `icons.result`). */
  renderIcon?: (hit: SearchHit<M>) => ReactNode
  /** Replace the text inside the default row (keeps the row, icon and why line). */
  renderItem?: (hit: SearchHit<M>) => ReactNode
  /** Draw a whole result yourself. */
  renderResult?: (props: SearchResultProps<M>) => ReactNode
  /** Shown when the query matches nothing. Return null to show nothing. */
  renderEmpty?: (query: string) => ReactNode
  /** Replace the footer (badge, count and mode). */
  renderFooter?: (state: { count: number; mode: 'vector' | 'keyword'; searching: boolean }) => ReactNode
  onSelect?: (hit: SearchHit<M>) => void
  /** Debounce ms for search-as-you-type (0 = submit only). */
  debounce?: number
  showBadge?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<SemanticSearchProps<unknown>['size']>
const sizes: Record<Size, { input: number; inputFont: FontSizeKey; icon: number; row: number; title: FontSizeKey; desc: FontSizeKey; tile: number; pad: number; heading: FontSizeKey }> = {
  sm: { input: 46, inputFont: 'md', icon: 16, row: 40, title: 'sm', desc: 'xs', tile: 20, pad: 12, heading: 'xl' },
  md: { input: 56, inputFont: 'lg', icon: 18, row: 48, title: 'md', desc: 'sm', tile: 24, pad: 16, heading: '2xl' },
  lg: { input: 64, inputFont: 'xl', icon: 20, row: 56, title: 'lg', desc: 'md', tile: 28, pad: 18, heading: '3xl' },
}
type Z = (typeof sizes)[Size]

/** A search-by-meaning panel over your own records, with a local vector index, hybrid keyword matching and "why it matched". */
export function SemanticSearch<M = Record<string, unknown>>({ variant, tint, ...props }: SemanticSearchProps<M>) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <SemanticSearchInner<M> {...props} />
    </SkinProvider>
  )
}

function SemanticSearchInner<M>({
  presentation = 'bar',
  resultStyle = 'list',
  size = 'md',
  radius,
  title,
  placeholder,
  icons = {},
  labels: labelsProp,
  styles = {},
  initialQuery = '',
  autoRun = false,
  showWhy = true,
  highlight = true,
  recent,
  groupBy,
  renderIcon: renderHitIcon,
  renderItem,
  renderResult,
  renderEmpty,
  renderFooter,
  onSelect,
  debounce = 250,
  showBadge = true,
  open: openProp,
  onOpenChange,
  style,
  testID,
  ...hookOptions
}: Omit<SemanticSearchProps<M>, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: SemanticSearchLabels = { ...semanticSearchLabels, ...labelsProp, ...(title !== undefined ? { title } : null), ...(placeholder !== undefined ? { placeholder } : null) }
  const search = useSemanticSearch<M>(hookOptions)
  const [text, setText] = useState(initialQuery)
  const [openState, setOpenState] = useState(true)
  const open = openProp ?? openState
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null)
  const ran = useRef(false)
  useEffect(() => {
    if (autoRun && initialQuery && !ran.current && !search.isIndexing) {
      ran.current = true
      void search.search(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialQuery, search.isIndexing])
  useEffect(() => {
    if (!debounce) return
    const h = setTimeout(() => {
      if (text !== search.query) void search.search(text)
    }, debounce)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, debounce])

  const pick = (h: SearchHit<M>) => {
    void Haptics.selectionAsync().catch(() => {})
    onSelect?.(h)
  }
  const runRecent = (q: string) => {
    void Haptics.selectionAsync().catch(() => {})
    setText(q)
    void search.search(q)
  }

  const wells = skinHasWells(s.skin)
  // Icons on tiles take the tile's ink (white on licorice, ink on chrome); bare icons stay muted.
  const ink = { size: z.icon - 2, strokeWidth: 1.75, color: wells ? s.tile.ink : s.container.fgMuted }
  const hitIcon = (h: SearchHit<M>) => renderHitIcon?.(h) ?? renderIcon(icons.result, FileText, ink)

  const inputRow = (
    <SkinWell style={[{ flexDirection: 'row', alignItems: 'center', height: wells ? z.input - 14 : z.input, paddingLeft: wells ? z.pad - 4 : z.pad, paddingRight: wells ? 6 : 10, gap: 10 }, wells ? { margin: 7 } : null, styles.inputRow]}>
      {renderIcon(icons.search, Search, { size: z.icon, strokeWidth: 1.75, color: search.isSearching ? t.colors.textSecondary : t.colors.textTertiary })}
      <TextInput
        ref={inputRef}
        testID={testID ? `${testID}-input` : undefined}
        value={text}
        onChangeText={setText}
        // Return opens the top hit once its results are on screen; otherwise it searches now.
        onSubmitEditing={() => (text === search.query && search.results[0] ? pick(search.results[0]) : void search.search(text))}
        placeholder={labels.placeholder}
        placeholderTextColor={t.colors.textTertiary}
        selectionColor={s.tint}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={labels.inputLabel}
        style={[typeStyle(t, z.inputFont), { flex: 1, minWidth: 0, color: t.colors.text, paddingVertical: 0, outlineStyle: 'none' } as never, styles.input]}
      />
      {text && icons.clear !== null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.clear}
          hitSlop={8}
          onPress={() => (setText(''), search.clear())}
          style={(st) => ({ width: z.icon + 14, height: z.icon + 14, borderRadius: s.radius.control - 2, alignItems: 'center', justifyContent: 'center', backgroundColor: st.pressed || (st as { hovered?: boolean }).hovered ? s.rowHover : 'transparent' })}
        >
          {renderIcon(icons.clear, X, { size: z.icon - 2, strokeWidth: 1.75, color: t.colors.textSecondary })}
        </Pressable>
      ) : null}
    </SkinWell>
  )

  // Why it matched, as one quiet line: the shared words, then how close the meaning is.
  const whyLine = (h: SearchHit<M>) => {
    if (!showWhy) return undefined
    const terms = matchTerms(h)
    return terms.length ? `${labels.matches} ${terms.slice(0, 3).map((w) => `“${w}”`).join(', ')}` : undefined
  }
  const similarity = (h: SearchHit<M>) => (showWhy && h.why.vector !== undefined ? Math.max(0, Math.min(1, h.why.vector)) : undefined)

  const cards = resultStyle === 'cards'
  const row = (h: SearchHit<M>, i: number) => {
    const props: SearchResultProps<M> = { hit: h, index: i, onPress: () => pick(h), icon: hitIcon(h), why: whyLine(h), similarity: similarity(h), active: i === 0 }
    const enter = motion.enabled ? FadeIn.delay(Math.min(i, 6) * 30).duration(180) : undefined
    if (renderResult) return <Animated.View key={h.id} entering={enter}>{renderResult(props)}</Animated.View>
    const inner = <ResultRow {...props} z={z} s={s} labels={labels} cards={cards} highlight={highlight} renderItem={renderItem} styles={styles} />
    return (
      <Animated.View key={h.id} entering={enter}>
        {cards ? (
          <Surface elevation="inset" radius={s.skin === 'clean' ? 12 : s.radius.inset + 2} style={[{ overflow: 'hidden' }, styles.card]}>
            {inner}
          </Surface>
        ) : (
          inner
        )}
      </Animated.View>
    )
  }

  const groupTitle = (key: string, label: string) => (
    <Text key={`t-${key}`} style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 }, styles.groupTitle]}>
      {label}
    </Text>
  )

  const results = search.results
  const typed = !!search.query.trim()
  const busy = search.isSearching && !results.length
  const groups =
    resultStyle === 'grouped' && groupBy
      ? Object.entries(
          results.reduce<Record<string, Array<{ h: SearchHit<M>; i: number }>>>((acc, h, i) => {
            ;(acc[groupBy(h) || labels.other] ??= []).push({ h, i })
            return acc
          }, {}),
        )
      : null
  const showEmpty = !search.isSearching && typed && !results.length && !search.error
  const showRecent = !typed && !search.isSearching && !!recent?.length

  const body = (
    <View style={[{ padding: 6, gap: cards ? 6 : 2 }, styles.list]}>
      {search.isIndexing && search.indexProgress ? (
        <View style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
          <ModelDownload progress={search.indexProgress[0] / search.indexProgress[1]} variant="bar" size="sm" label={labels.indexing} detail={`${search.indexProgress[0]} ${labels.of} ${search.indexProgress[1]} ${labels.items}`} />
        </View>
      ) : null}
      {busy ? (
        <Animated.View entering={motion.enabled ? FadeIn.duration(180) : undefined} style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6, gap: 12 }}>
          <ShimmerText size="sm" active>
            {labels.searching}
          </ShimmerText>
          {[0.62, 0.44, 0.52].map((w, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: -2, opacity: 0.8 }}>
              <Skeleton width={z.tile + 6} height={z.tile + 6} radius={8} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width={`${w * 100}%`} height={10} radius={5} />
                <Skeleton width={`${w * 60}%`} height={8} radius={4} />
              </View>
            </View>
          ))}
        </Animated.View>
      ) : null}
      {search.error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, minHeight: 44 }}>
          {renderIcon(icons.error, CircleAlert, { size: 16, strokeWidth: 1.75, color: t.colors.danger })}
          <Text style={[typeStyle(t, 'sm'), { flex: 1, color: t.colors.danger }]} numberOfLines={2}>
            {search.error.message}
          </Text>
        </View>
      ) : null}
      {showRecent ? (
        <View>
          {groupTitle('recent', labels.recent)}
          {recent!.map((q) => (
            <PlainRow key={q} title={q} icon={renderIcon(icons.recent, History, ink)} onPress={() => runRecent(q)} z={z} s={s} styles={styles} />
          ))}
        </View>
      ) : null}
      {showEmpty ? (renderEmpty ? renderEmpty(search.query) : <EmptyState z={z} s={s} icon={renderIcon(icons.empty, SearchX, ink)} title={labels.emptyTitle} hint={labels.emptyHint} />) : null}
      {results.length
        ? groups
          ? groups.map(([g, hits]) => (
              <View key={g} style={{ gap: cards ? 6 : 2 }}>
                {groupTitle(g, g.charAt(0).toUpperCase() + g.slice(1))}
                {hits.map(({ h, i }) => row(h, i))}
              </View>
            ))
          : results.map(row)
        : null}
    </View>
  )
  const hasBody = !!(search.isIndexing && search.indexProgress) || busy || !!search.error || showRecent || showEmpty || results.length > 0

  const footer = renderFooter ? (
    renderFooter({ count: results.length, mode: search.mode, searching: search.isSearching })
  ) : (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, height: 44, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }, styles.footer]}>
      {showBadge ? <OnDeviceBadge size="sm" style={{ alignSelf: 'center' }} state={search.isSearching ? 'thinking' : 'idle'} provider={search.provider} locality={search.locality as never} /> : <View />}
      <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary, fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
        {results.length ? `${results.length} ${results.length === 1 ? labels.result : labels.results} · ` : ''}
        {search.mode === 'vector' ? labels.byMeaning : labels.keywordsOnly}
      </Text>
    </View>
  )

  const content = (
    <>
      {inputRow}
      {hasBody ? (
        <>
          {wells ? null : <View style={{ height: hairlineWidth, backgroundColor: t.colors.hairline }} />}
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
            {body}
          </ScrollView>
        </>
      ) : null}
      {footer}
    </>
  )

  if (presentation === 'spotlight') {
    return (
      <Sheet open={open} onClose={() => (setOpenState(false), onOpenChange?.(false))} presentation="spotlight" inline style={[style, styles.container]} testID={testID}>
        {content}
      </Sheet>
    )
  }
  const panelRadius = radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)
  return (
    <View style={[{ gap: 14 }, style, styles.container]} testID={testID}>
      {presentation === 'header' ? <Text style={[typeStyle(t, z.heading, { weight: 'semibold' }), { color: t.colors.text, paddingHorizontal: 2 }, styles.title]}>{labels.title}</Text> : null}
      <Surface elevation="floating" radius={panelRadius} style={[{ overflow: 'hidden' }, styles.panel]}>
        {content}
      </Surface>
    </View>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function matchTerms(h: SearchHit<unknown>): string[] {
  const seen = new Set<string>()
  return (h.why.terms ?? []).filter((w) => {
    const k = w.toLowerCase()
    if (k.length <= 2 || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The text with the matched words marked: heavier ink on a soft wash of the tint. */
function Marked({ text, terms, s, base }: { text: string; terms: string[]; s: SkinTokens; base: StyleProp<TextStyle> }) {
  if (!terms.length) return <>{text}</>
  const re = new RegExp(`(${terms.map(escape).join('|')})`, 'gi')
  const wash = /^#[0-9a-f]{6}$/i.test(s.tint) ? alpha(s.tint, s.dark ? 0.28 : 0.14) : 'transparent'
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={[base, { fontWeight: '600', backgroundColor: wash, borderRadius: 3 }]}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  )
}

/** A fixed slot so row text lines up. Expressive variants seat the icon on a tile in their material. */
function Tile({ children, z }: { children: ReactNode; z: Z }) {
  const s = useSkin()
  if (children === null || children === undefined || children === false) return null
  if (skinHasWells(s.skin)) return <View style={{ height: z.tile + 8, justifyContent: 'center' }}><SkinTile size={z.tile + 6}>{children}</SkinTile></View>
  return <View style={{ width: z.tile, height: z.tile + 8, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
}

function ResultRow<M>({ hit, onPress, icon, why, similarity, active, z, s, labels, cards, highlight, renderItem, styles }: SearchResultProps<M> & { z: Z; s: SkinTokens; labels: SemanticSearchLabels; cards: boolean; highlight: boolean; renderItem?: (hit: SearchHit<M>) => ReactNode; styles: Partial<SemanticSearchStyles> }) {
  const t = useTheme()
  const r = Math.max(8, s.radius.control)
  const titleStyle: StyleProp<TextStyle> = [typeStyle(t, z.title, { weight: 'medium' }), { color: t.colors.text }, styles.rowTitle]
  const text = hit.text ?? hit.id
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={text} style={[{ flexDirection: 'row', alignItems: cards ? 'flex-start' : 'center', gap: 12, minHeight: z.row, paddingHorizontal: cards ? 10 : 8, paddingVertical: cards ? 10 : 6, borderRadius: r }, styles.row]}>
      {(st) => (
        <>
          {/* The hovered or pressed row becomes the variant's key: a keycap, a glossy pill, a steel plate. Cards keep their own face. */}
          {!cards && (active || st.pressed || (st as { hovered?: boolean }).hovered) ? <SkinRowFace radius={r} /> : null}
          <Tile z={z}>{icon}</Tile>
          <View style={{ flex: 1, minWidth: 0, paddingTop: cards ? 3 : 0 }}>
            {renderItem ? (
              renderItem(hit)
            ) : (
              <Text style={titleStyle} numberOfLines={cards ? 3 : 1}>
                {highlight ? <Marked text={text} terms={matchTerms(hit)} s={s} base={titleStyle} /> : text}
              </Text>
            )}
            {why ? (
              <Text style={[typeStyle(t, z.desc), { color: t.colors.textSecondary, marginTop: cards ? 4 : 0 }, styles.rowWhy]} numberOfLines={1}>
                {why}
              </Text>
            ) : null}
          </View>
          {similarity !== undefined ? (
            <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary, fontVariant: ['tabular-nums'], paddingTop: cards ? 4 : 0 }]} accessibilityLabel={`${Math.round(similarity * 100)}% ${labels.similar}`}>
              {`${Math.round(similarity * 100)}%`}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  )
}

function PlainRow({ title, icon, onPress, z, s, styles }: { title: string; icon: ReactNode; onPress: () => void; z: Z; s: SkinTokens; styles: Partial<SemanticSearchStyles> }) {
  const t = useTheme()
  const r = Math.max(8, s.radius.control)
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: z.row - 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: r }, styles.row]}>
      {(st) => (
        <>
          {st.pressed || (st as { hovered?: boolean }).hovered ? <SkinRowFace radius={r} /> : null}
          <Tile z={z}>{icon}</Tile>
          <Text style={[typeStyle(t, z.title), { flex: 1, color: t.colors.textSecondary }, styles.rowTitle]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  )
}

function EmptyState({ z, icon, title, hint }: { z: Z; s: SkinTokens; icon: ReactNode; title: string; hint: string }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 10 }}>
      <Tile z={z}>{icon}</Tile>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typeStyle(t, z.title, { weight: 'medium' }), { color: t.colors.text }]}>{title}</Text>
        <Text style={[typeStyle(t, z.desc), { color: t.colors.textSecondary }]}>{hint}</Text>
      </View>
    </View>
  )
}

export default SemanticSearch
