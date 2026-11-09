import { createContext, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Pressable, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { ArrowRight, CircleAlert, FileText, Search, SearchX, SlidersHorizontal, X } from 'lucide-react-native'
import type { z } from 'zod'
import { humanize } from '@ondai/core'
import type { FontSizeKey, SkinInput, SkinTokens } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { SkinRowFace, SkinTile, SkinWell, skinHasWells, Surface } from '../surface/surface'
import { Skeleton } from '../skeleton/skeleton'
import { useNaturalFilter, type FilterChip, type UseNaturalFilterOptions } from './use-natural-filter'

/** Every icon NaturalFilter draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface NaturalFilterIcons {
  /** Leading icon in the field. */
  search: IconInput
  /** Clears the request and the filters. */
  clear: IconInput
  /** Opens the filter editor (`sheet` presentation). */
  edit: IconInput
  /** The key that turns the request into filters. `null` hides the key (return still works). */
  submit: IconInput
  /** Default icon of a `NaturalFilterRow`. */
  row: IconInput
  /** The empty state. */
  empty: IconInput
  /** The error row. */
  error: IconInput
}

/** Every string NaturalFilter shows or announces. */
export interface NaturalFilterLabels {
  placeholder: string
  /** Shown while the model reads the request. */
  thinking: string
  /** Screen reader name of the submit key. */
  submit: string
  /** Screen reader name of the clear button in the field. */
  clear: string
  /** The text button after the chips. */
  clearFilters: string
  editFilters: string
  /** Title of the filter editor. */
  sheetTitle: string
  done: string
  any: string
  yes: string
  no: string
  /** A boolean filter set to false: "Not open now". */
  not: string
  /** Added to an editable chip's screen reader name. */
  tapToChange: string
  /** Prefix of a chip's remove button in the variants that draw their own chips ("Remove Cheap"). */
  remove: string
  emptyTitle: string
  emptyHint: string
  result: string
  results: string
  inputLabel: string
}

export const naturalFilterLabels: NaturalFilterLabels = {
  placeholder: 'Search in your own words…',
  thinking: 'Turning that into filters',
  submit: 'Filter',
  clear: 'Clear',
  clearFilters: 'Clear all',
  editFilters: 'Edit filters',
  sheetTitle: 'Filters',
  done: 'Done',
  any: 'Any',
  yes: 'Yes',
  no: 'No',
  not: 'Not',
  tapToChange: 'tap to change',
  remove: 'Remove',
  emptyTitle: 'No matches',
  emptyHint: 'Try removing a filter.',
  result: 'result',
  results: 'results',
  inputLabel: 'Search',
}

/** Styles for each part, applied after the component's own. */
export interface NaturalFilterStyles {
  /** The outer view. */
  container: StyleProp<ViewStyle>
  /** The panel the field, chips and results sit in. */
  panel: StyleProp<ViewStyle>
  inputRow: StyleProp<ViewStyle>
  input: StyleProp<TextStyle>
  chips: StyleProp<ViewStyle>
  chip: StyleProp<ViewStyle>
  /** Around `children` (the results). */
  list: StyleProp<ViewStyle>
  row: StyleProp<ViewStyle>
  rowTitle: StyleProp<TextStyle>
  rowDescription: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
}

/** What `renderChip` gets for each filter. */
export interface FilterChipProps {
  chip: FilterChip
  /** The chip's text as NaturalFilter would show it. */
  label: string
  /** Steps an enum filter to its next value; undefined for other types. */
  cycle?: () => void
  remove: () => void
}

/** What `renderSubmit` gets. */
export interface FilterSubmitProps {
  submit: () => void
  canSubmit: boolean
  busy: boolean
}

export interface NaturalFilterProps<S extends z.ZodObject<z.ZodRawShape>> extends UseNaturalFilterOptions<S> {
  /** Layout: a `bar` panel, a bar with a `sheet` editor, or `inline` chips with no field. */
  presentation?: 'bar' | 'sheet' | 'inline'
  /** The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the panel, the field, the key, the chips and the rows together. */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the key, chips and tiles. Defaults to the theme accent. */
  tint?: string
  /** Panel corner radius. Defaults to the variant's. */
  radius?: number
  /** Chip look in the `clean` variant (the other variants paint chips in their own material). */
  chipStyle?: 'soft' | 'outline'
  /** Shortcut for `labels.placeholder`. */
  placeholder?: string
  icons?: Partial<NaturalFilterIcons>
  labels?: Partial<NaturalFilterLabels>
  styles?: Partial<NaturalFilterStyles>
  initialQuery?: string
  autoRun?: boolean
  /** @deprecated Use `labels.thinking`. */
  thinkingLabel?: string
  showBadge?: boolean
  /** Inline presentation: a filter object to display instead of running the model. */
  value?: Partial<z.infer<S>>
  /** How many results the filter leaves. Shown in the footer; `0` shows the empty state instead of `children`. */
  resultCount?: number
  /** The results, drawn inside the panel under the chips. `NaturalFilterRow` gives rows in the variant. */
  children?: ReactNode
  /** Draw a filter chip yourself. */
  renderChip?: (props: FilterChipProps) => ReactNode
  /** Draw the submit key yourself. */
  renderSubmit?: (props: FilterSubmitProps) => ReactNode
  /** Shown when `resultCount` is 0. Return null to show nothing. */
  renderEmpty?: (filter: Partial<z.infer<S>>) => ReactNode
  /** Replace the footer (badge and count). */
  renderFooter?: (state: { status: string; count?: number }) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<NaturalFilterProps<z.ZodObject<z.ZodRawShape>>['size']>
const sizes: Record<Size, { input: number; inputFont: FontSizeKey; icon: number; chip: 'sm' | 'md'; key: 'sm' | 'md'; row: number; title: FontSizeKey; desc: FontSizeKey; tile: number; pad: number }> = {
  sm: { input: 48, inputFont: 'md', icon: 16, chip: 'sm', key: 'sm', row: 40, title: 'sm', desc: 'xs', tile: 20, pad: 12 },
  md: { input: 56, inputFont: 'lg', icon: 18, chip: 'sm', key: 'sm', row: 48, title: 'md', desc: 'sm', tile: 24, pad: 16 },
  lg: { input: 64, inputFont: 'xl', icon: 20, chip: 'md', key: 'md', row: 56, title: 'lg', desc: 'md', tile: 28, pad: 18 },
}
type Zs = (typeof sizes)[Size]
/** Face heights of Button sizes, to seat the key level with the field. */
const keyHeights = { sm: 32, md: 38 } as const

/** What rows inside the panel read: the size and the icon set. */
const RowContext = createContext<{ z: Zs; icons: Partial<NaturalFilterIcons>; styles: Partial<NaturalFilterStyles> }>({ z: sizes.md, icons: {}, styles: {} })

/** "cheap Italian open now" becomes a typed filter and editable chips. Bar, bar with a sheet editor, or chips only. */
export function NaturalFilter<S extends z.ZodObject<z.ZodRawShape>>({ variant, tint, ...props }: NaturalFilterProps<S>) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <NaturalFilterInner<S> {...props} tint={tint} />
    </SkinProvider>
  )
}

function NaturalFilterInner<S extends z.ZodObject<z.ZodRawShape>>({
  presentation = 'bar',
  size = 'md',
  tint,
  radius,
  chipStyle = 'outline',
  placeholder,
  icons = {},
  labels: labelsProp,
  styles = {},
  initialQuery = '',
  autoRun = false,
  thinkingLabel,
  showBadge = true,
  value,
  resultCount,
  children,
  renderChip,
  renderSubmit,
  renderEmpty,
  renderFooter,
  style,
  testID,
  ...hookOptions
}: Omit<NaturalFilterProps<S>, 'variant'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: NaturalFilterLabels = { ...naturalFilterLabels, ...(thinkingLabel ? { thinking: thinkingLabel } : null), ...labelsProp, ...(placeholder !== undefined ? { placeholder } : null) }
  const nf = useNaturalFilter(hookOptions)
  const [query, setQuery] = useState(initialQuery)
  const [sheetOpen, setSheetOpen] = useState(false)
  const ran = useRef(false)
  useEffect(() => {
    if (value) {
      for (const [k, v] of Object.entries(value)) nf.set(k as never, v)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value ?? null)])
  useEffect(() => {
    if (autoRun && initialQuery && !ran.current) {
      ran.current = true
      void nf.run(initialQuery).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialQuery])
  useEffect(() => {
    if (nf.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [nf.status])

  const canSubmit = !!query.trim() && !nf.isLoading
  const submit = () => {
    if (!query.trim()) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    void nf.run(query).catch(() => {})
  }
  const cycle = (c: FilterChip) => {
    if (!c.options?.length) return
    const i = c.options.indexOf(String(c.value))
    nf.set(c.key as never, c.options[(i + 1) % c.options.length])
    void Haptics.selectionAsync().catch(() => {})
  }
  // Booleans read as their label ("Open now"); a custom `format` speaks for itself; otherwise "Label: value".
  const chipLabel = (c: FilterChip) => (typeof c.value === 'boolean' ? (c.value ? c.label : `${labels.not} ${c.label.toLowerCase()}`) : hookOptions.format ? c.display : `${c.label}: ${c.display}`)

  const enter = (i: number) => (motion.enabled ? FadeIn.delay(i * 40).duration(180) : undefined)
  const chips = (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }, styles.chips]}>
      {nf.chips.map((c, i) => {
        const label = chipLabel(c)
        const remove = () => nf.remove(c.key as never)
        const step = c.options ? () => cycle(c) : undefined
        return (
          <Animated.View key={c.key} entering={enter(i)}>
            {renderChip ? (
              renderChip({ chip: c, label, cycle: step, remove })
            ) : (
              <Chip size={z.chip} variant={chipStyle} tint={tint} label={label} ghost={c.confidence < 0.6} onPress={step} onRemove={remove} removeLabel={`${labels.remove} ${label}`} accessibilityLabel={`${label}${c.options ? `, ${labels.tapToChange}` : ''}`} style={styles.chip} />
            )}
          </Animated.View>
        )
      })}
      {nf.chips.length > 1 ? (
        <Pressable onPress={nf.clear} accessibilityRole="button" hitSlop={6} style={(st) => ({ height: z.chip === 'sm' ? 26 : 32, paddingHorizontal: 8, borderRadius: 8, justifyContent: 'center', backgroundColor: st.pressed || (st as { hovered?: boolean }).hovered ? s.rowHover : 'transparent' })}>
          <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textSecondary }]}>{labels.clearFilters}</Text>
        </Pressable>
      ) : null}
    </View>
  )
  const thinking = nf.isLoading ? (
    <Animated.View entering={motion.enabled ? FadeIn.duration(180) : undefined} style={{ gap: 10 }}>
      <ShimmerText size="sm" active>
        {labels.thinking}
      </ShimmerText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[84, 64, 96].map((w, i) => (
          <Skeleton key={i} width={w} height={z.chip === 'sm' ? 26 : 32} radius={16} dashed />
        ))}
      </View>
    </Animated.View>
  ) : null
  const error = nf.error ? (
    <Animated.View entering={motion.enabled ? FadeIn.duration(180) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 }}>
      {renderIcon(icons.error, CircleAlert, { size: 16, strokeWidth: 1.75, color: t.colors.danger })}
      <Text style={[typeStyle(t, 'sm'), { flex: 1, color: t.colors.danger }]} numberOfLines={2}>
        {nf.error.message}
      </Text>
    </Animated.View>
  ) : null
  const badge = showBadge ? <OnDeviceBadge size="sm" style={{ alignSelf: 'center' }} state={nf.status} provider={nf.provider} locality={nf.locality as never} /> : null
  const ctx = { z, icons, styles }

  const empty = resultCount === 0 ? (renderEmpty ? renderEmpty(nf.filter) : <EmptyState z={z} icon={renderIcon(icons.empty, SearchX, tileInk(s, z))} title={labels.emptyTitle} hint={labels.emptyHint} />) : null
  const results = resultCount === 0 ? empty : children

  if (presentation === 'inline') {
    return (
      <RowContext.Provider value={ctx}>
        <View style={[{ gap: 10 }, style, styles.container]} testID={testID}>
          {thinking}
          {nf.chips.length ? chips : null}
          {error}
          {results ? <View style={styles.list}>{results}</View> : null}
        </View>
      </RowContext.Provider>
    )
  }

  const wells = skinHasWells(s.skin)
  // The quiet looks keep a soft raised key; the expressive ones make it their primary key.
  const keyRole = s.skin === 'clean' || s.skin === 'minimal' ? 'raised' : 'solid'
  const iconButton = (icon: ReactNode, label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={(st) => ({ width: z.icon + 14, height: z.icon + 14, borderRadius: s.radius.control - 2, alignItems: 'center', justifyContent: 'center', backgroundColor: st.pressed || (st as { hovered?: boolean }).hovered ? s.rowHover : 'transparent' })}
    >
      {icon}
    </Pressable>
  )
  const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))
  const key = renderSubmit ? (
    renderSubmit({ submit, canSubmit, busy: nf.isLoading })
  ) : icons.submit === null ? null : (
    <Button variant={keyRole} size={z.key} icon={keyIcon(icons.submit, ArrowRight)} disabled={!canSubmit} onPress={submit} accessibilityLabel={labels.submit} testID={testID ? `${testID}-submit` : undefined} />
  )
  const wellHeight = wells ? z.input - 14 : z.input
  const field = (
    <SkinWell style={[{ flex: wells ? 1 : undefined, flexDirection: 'row', alignItems: 'center', height: wellHeight, paddingLeft: wells ? z.pad - 4 : z.pad, paddingRight: wells ? 6 : 10, gap: 8 }, styles.inputRow]}>
      {renderIcon(icons.search, Search, { size: z.icon, strokeWidth: 1.75, color: nf.isLoading ? t.colors.textSecondary : t.colors.textTertiary })}
      <TextInput
        testID={testID ? `${testID}-input` : undefined}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={submit}
        placeholder={labels.placeholder}
        placeholderTextColor={t.colors.textTertiary}
        selectionColor={s.tint}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={labels.inputLabel}
        style={[typeStyle(t, z.inputFont), { flex: 1, minWidth: 0, color: t.colors.text, paddingVertical: 0, outlineStyle: 'none' } as never, styles.input]}
      />
      {query && icons.clear !== null ? iconButton(renderIcon(icons.clear, X, { size: z.icon - 2, strokeWidth: 1.75, color: t.colors.textTertiary }), labels.clear, () => (setQuery(''), nf.clear())) : null}
      {presentation === 'sheet' && icons.edit !== null ? iconButton(renderIcon(icons.edit, SlidersHorizontal, { size: z.icon - 2, strokeWidth: 1.75, color: t.colors.textSecondary }), labels.editFilters, () => setSheetOpen(true)) : null}
      {wells ? null : <View style={{ justifyContent: 'center' }}>{key}</View>}
    </SkinWell>
  )
  // Expressive variants stand the key beside the well, its face level with the field, so a pop key's side has room.
  const inputRow = wells ? (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 7 }}>
      {field}
      {key ? <View style={{ marginTop: Math.max(0, (wellHeight - keyHeights[z.key]) / 2) }}>{key}</View> : null}
    </View>
  ) : (
    field
  )

  const hasStatus = !!thinking || nf.chips.length > 0 || !!error
  const status = hasStatus ? (
    <View style={{ paddingHorizontal: wells ? 12 : z.pad - 4, paddingTop: wells ? 2 : 12, paddingBottom: 12, gap: 10 }}>
      {thinking}
      {nf.chips.length ? chips : null}
      {error}
    </View>
  ) : null
  const footer = renderFooter ? (
    renderFooter({ status: nf.status, count: resultCount })
  ) : showBadge || resultCount !== undefined ? (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 12, height: 44, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }, styles.footer]}>
      {badge ?? <View />}
      {resultCount !== undefined ? (
        <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{`${resultCount} ${resultCount === 1 ? labels.result : labels.results}`}</Text>
      ) : null}
    </View>
  ) : null

  const panelRadius = radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)
  return (
    <RowContext.Provider value={ctx}>
      <View style={[style, styles.container]} testID={testID}>
        <Surface elevation="floating" radius={panelRadius} style={[{ overflow: 'hidden' }, styles.panel]}>
          {inputRow}
          {!wells && (status || results) ? <View style={{ height: hairlineWidth, backgroundColor: t.colors.hairline }} /> : null}
          {status}
          {status && results && !wells ? <View style={{ height: hairlineWidth, backgroundColor: t.colors.hairline }} /> : null}
          {results ? <View style={[{ padding: 6, paddingTop: wells && !status ? 0 : 6 }, styles.list]}>{results}</View> : null}
          {footer}
        </Surface>
        {presentation === 'sheet' ? (
          <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} presentation="sheet" inline>
            <View style={{ padding: 20, gap: 14 }}>
              <Text style={[typeStyle(t, 'lg', { weight: 'medium' }), { color: t.colors.text }]}>{labels.sheetTitle}</Text>
              {nf.fieldInfo.map((f) => {
                const v = (nf.filter as Record<string, unknown>)[f.name]
                return (
                  <View key={f.name} style={{ gap: 6 }}>
                    <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary }]}>{hookOptions.fieldLabels?.[f.name as never] ?? humanize(f.name)}</Text>
                    {f.type === 'enum' ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {f.options?.map((o) => (
                          <Chip key={o} size="sm" label={hookOptions.format ? hookOptions.format(f.name, o) : o} variant="outline" tint={tint} selected={v === o} onPress={() => nf.set(f.name as never, v === o ? undefined : o)} />
                        ))}
                      </View>
                    ) : f.type === 'boolean' ? (
                      <Chip size="sm" label={v ? labels.yes : labels.no} variant="outline" tint={tint} selected={!!v} onPress={() => nf.set(f.name as never, !v)} />
                    ) : (
                      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{v === undefined ? labels.any : String(v)}</Text>
                    )}
                  </View>
                )
              })}
              <Button title={labels.done} variant="solid" onPress={() => setSheetOpen(false)} />
            </View>
          </Sheet>
        ) : null}
      </View>
    </RowContext.Provider>
  )
}

/* ---------------------------------------------------------------------------------------------- */

const tileInk = (s: SkinTokens, z: Zs) => ({ size: z.icon - 2, strokeWidth: 1.75, color: skinHasWells(s.skin) ? s.tile.ink : s.container.fgMuted })

/** A fixed slot so row text lines up. Expressive variants seat the icon on a tile in their material. */
function Tile({ children, z }: { children: ReactNode; z: Zs }) {
  const s = useSkin()
  if (children === null || children === undefined || children === false) return null
  if (skinHasWells(s.skin)) return <View style={{ height: z.tile + 8, justifyContent: 'center' }}><SkinTile size={z.tile + 6}>{children}</SkinTile></View>
  return <View style={{ width: z.tile, height: z.tile + 8, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
}

export interface NaturalFilterRowProps {
  title: string
  description?: string
  /** Defaults to the filter's `icons.row`. `null` hides it. */
  icon?: IconInput
  /** Short text at the end of the row (a rating, a price). */
  meta?: string
  /** Anything at the end of the row; wins over `meta`. */
  trailing?: ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/**
 * A result row in the filter's variant: the icon on a tile (a keycap, a sweet, a chrome cap), and the
 * variant's row face on hover and press. Use it as `children` of NaturalFilter.
 */
export function NaturalFilterRow({ title, description, icon, meta, trailing, onPress, style }: NaturalFilterRowProps) {
  const t = useTheme()
  const s = useSkin()
  const { z, icons, styles } = useContext(RowContext)
  const r = Math.max(8, s.radius.control)
  const glyph = renderIcon(icon !== undefined ? icon : icons.row, FileText, tileInk(s, z))
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: z.row, paddingHorizontal: 8, paddingVertical: 6, borderRadius: r }, styles.row, style]}>
      {(st) => (
        <>
          {st.pressed || (st as { hovered?: boolean }).hovered ? <SkinRowFace radius={r} /> : null}
          <Tile z={z}>{glyph}</Tile>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typeStyle(t, z.title, { weight: 'medium' }), { color: t.colors.text }, styles.rowTitle]} numberOfLines={1}>
              {title}
            </Text>
            {description ? (
              <Text style={[typeStyle(t, z.desc), { color: t.colors.textSecondary }, styles.rowDescription]} numberOfLines={1}>
                {description}
              </Text>
            ) : null}
          </View>
          {trailing ?? (meta ? <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary, fontVariant: ['tabular-nums'] }]}>{meta}</Text> : null)}
        </>
      )}
    </Pressable>
  )
}

function EmptyState({ z, icon, title, hint }: { z: Zs; icon: ReactNode; title: string; hint: string }) {
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

export default NaturalFilter
