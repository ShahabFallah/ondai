import { useEffect, useRef, useState, type ComponentRef, type ComponentType, type ReactNode } from 'react'
import { Platform, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Briefcase, Check, Maximize2, Minimize2, PenLine, RefreshCw, Smile, SpellCheck } from 'lucide-react-native'
import type { OndaiError } from '@ondai/core'
import type { FontSizeKey, SkinInput, SkinTokens } from '@ondai/tokens'
import { colorAlpha } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Skeleton } from '../skeleton/skeleton'
import { StreamingText } from '../streaming-text/streaming-text'
import { frost, SkinRowFace, SkinTile, skinHasWells, Surface, Sweep } from '../surface/surface'
import { wordDiff } from './diff'
import { rewriteModes, type RewriteMode } from './prompts'
import { useRewrite, type UseRewriteOptions } from './use-rewrite'

/** Every icon Rewrite draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface RewriteIcons {
  shorten: IconInput
  expand: IconInput
  friendlier: IconInput
  formal: IconInput
  fix: IconInput
  custom: IconInput
  /** The `menu` presentation's trigger. */
  menu: IconInput
  /** On the "Use this" key. */
  accept: IconInput
  /** On the "Keep original" key (none by default). */
  reject: IconInput
  retry: IconInput
}

/** Every string Rewrite shows or announces. `{delta}` is filled in with the signed word count. */
export interface RewriteLabels {
  /** Mode names. */
  shorten: string
  expand: string
  friendlier: string
  formal: string
  fix: string
  custom: string
  /** The working line per mode, shown while the model writes. */
  workingShorten: string
  workingExpand: string
  workingFriendlier: string
  workingFormal: string
  workingFix: string
  workingCustom: string
  /** The `menu` trigger. */
  menu: string
  accept: string
  reject: string
  retry: string
  /** Side-by-side headings. */
  before: string
  after: string
  /** The change under a result: "+4 words", "−1 word", "Same length". */
  words: string
  word: string
  sameLength: string
  /** Under the modes when there is nothing to rewrite yet. */
  empty: string
  /** Screen reader name for the mode toolbar. */
  modes: string
}

export interface RewriteStyles {
  /** The outer view. */
  container: StyleProp<ViewStyle>
  /** The toolbar track, the chip row or the menu trigger row. */
  toolbar: StyleProp<ViewStyle>
  mode: StyleProp<ViewStyle>
  modeText: StyleProp<TextStyle>
  /** The result card and its text. */
  result: StyleProp<ViewStyle>
  resultText: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
}

export const rewriteLabels: RewriteLabels = {
  shorten: 'Shorten',
  expand: 'Expand',
  friendlier: 'Friendlier',
  formal: 'Formal',
  fix: 'Fix grammar',
  custom: 'Rewrite',
  workingShorten: 'Trimming it down',
  workingExpand: 'Adding a little more',
  workingFriendlier: 'Warming it up',
  workingFormal: 'Polishing the tone',
  workingFix: 'Checking spelling and grammar',
  workingCustom: 'Rewriting',
  menu: 'Rewrite',
  accept: 'Use this',
  reject: 'Keep original',
  retry: 'Try again',
  before: 'Before',
  after: 'After',
  words: '{delta} words',
  word: '{delta} word',
  sameLength: 'Same length',
  empty: 'Write a draft, then pick how to change it.',
  modes: 'Rewrite options',
}

export interface RewriteModeProps {
  mode: RewriteMode
  label: string
  /** The mode's icon as Rewrite would draw it. */
  icon: ReactNode
  /** This mode produced the result on screen. */
  selected: boolean
  disabled: boolean
  onPress: () => void
}

export interface RewriteResultProps {
  original: string
  result: string
  mode: RewriteMode | null
  streaming: boolean
  view: NonNullable<RewriteProps['resultView']>
}

export interface RewriteActionsProps {
  /** The rewrite is finished. */
  done: boolean
  result: string
  error: OndaiError | null
  accept: () => void
  reject: () => void
  /** Run the same mode again. */
  retry: () => void
}

export interface RewriteProps extends UseRewriteOptions {
  /** The text to rewrite (usually the current input value). */
  value: string
  /** Called when the person accepts a rewrite. */
  onAccept: (text: string) => void
  /** Layout of the modes: a scrolling `toolbar`, a `menu` sheet, or wrapping `chips`. */
  presentation?: 'toolbar' | 'menu' | 'chips'
  resultView?: 'replace' | 'diff' | 'sideBySide'
  modes?: RewriteMode[]
  /** Run this mode on mount (playground, shortcuts). */
  initialMode?: RewriteMode
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the
   * toolbar, the selected mode, the result card and its keys together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for keys, gloss and glow. Defaults to the theme accent. */
  tint?: string
  /** Result card corner radius. Defaults to the variant's. */
  radius?: number
  icons?: Partial<RewriteIcons>
  labels?: Partial<RewriteLabels>
  styles?: Partial<RewriteStyles>
  showBadge?: boolean
  /** Draw one mode (a toolbar segment, a chip or a menu row) yourself. */
  renderMode?: (props: RewriteModeProps) => ReactNode
  /** Draw the rewritten text yourself. */
  renderResult?: (props: RewriteResultProps) => ReactNode
  /** Replace the accept, keep and retry keys. */
  renderActions?: (props: RewriteActionsProps) => ReactNode
  /** Shown under the modes while `value` is empty. Return null to show nothing. */
  renderEmpty?: () => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

const defaultIcons: Record<RewriteMode, ComponentType<IconProps>> = { shorten: Minimize2, expand: Maximize2, friendlier: Smile, formal: Briefcase, fix: SpellCheck, custom: PenLine }
const workingKey: Record<RewriteMode, keyof RewriteLabels> = { shorten: 'workingShorten', expand: 'workingExpand', friendlier: 'workingFriendlier', formal: 'workingFormal', fix: 'workingFix', custom: 'workingCustom' }

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))

/** "+4 words", "−6 words" or "Same length": the quiet hint of what changed, short enough for a phone footer. */
function changeMeta(before: string, after: string, labels: RewriteLabels): string {
  const d = words(after) - words(before)
  if (d === 0) return labels.sameLength
  const n = Math.abs(d)
  return fill(n === 1 ? labels.word : labels.words, { delta: `${d < 0 ? '−' : '+'}${n}` })
}

type Size = NonNullable<RewriteProps['size']>
const sizes: Record<Size, { seg: number; font: FontSizeKey; icon: number; body: FontSizeKey; pad: number; key: 'sm' | 'md'; tile: number; chip: 'sm' | 'md' }> = {
  sm: { seg: 28, font: 'xs', icon: 13, body: 'sm', pad: 12, key: 'sm', tile: 22, chip: 'sm' },
  md: { seg: 32, font: 'sm', icon: 14, body: 'md', pad: 16, key: 'sm', tile: 26, chip: 'sm' },
  lg: { seg: 38, font: 'md', icon: 16, body: 'lg', pad: 18, key: 'md', tile: 30, chip: 'md' },
}

/**
 * Shorten, expand, warm up, formalize or fix a draft on device. The modes sit in a toolbar, a menu or
 * chips; the result streams into a card as a replacement, a diff or side by side, with accept and keep.
 */
export function Rewrite({ variant, tint, ...props }: RewriteProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <RewriteInner {...props} />
    </SkinProvider>
  )
}

function RewriteInner({
  value,
  onAccept,
  presentation = 'toolbar',
  resultView = 'replace',
  modes = ['shorten', 'expand', 'friendlier', 'formal', 'fix'],
  initialMode,
  size = 'md',
  radius,
  icons = {},
  labels: labelsProp,
  styles = {},
  showBadge = true,
  renderMode,
  renderResult,
  renderActions,
  renderEmpty,
  style,
  testID,
  ...hookOptions
}: Omit<RewriteProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: RewriteLabels = { ...rewriteLabels, ...labelsProp }
  const rw = useRewrite(hookOptions)
  const [menuOpen, setMenuOpen] = useState(false)
  const [edges, setEdges] = useState({ left: false, right: false })
  const box = useRef({ view: 0, content: 0 })
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null)
  const itemX = useRef<Partial<Record<RewriteMode, { x: number; w: number }>>>({})
  const ran = useRef(false)
  useEffect(() => {
    if (initialMode && value && !ran.current) {
      ran.current = true
      void rw.run(value, initialMode).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode, value])
  // Keep the running mode in view when the toolbar scrolls.
  const reveal = (m: RewriteMode | null, animated: boolean) => {
    const it = m ? itemX.current[m] : undefined
    if (!it || !box.current.view) return
    scroller.current?.scrollTo({ x: Math.max(0, it.x + it.w / 2 - box.current.view / 2), animated })
  }
  useEffect(() => {
    if (presentation === 'toolbar') reveal(rw.mode, motion.enabled)
  }, [rw.mode, presentation, motion.enabled])
  useEffect(() => {
    if (rw.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [rw.status])

  const start = (m: RewriteMode) => {
    setMenuOpen(false)
    void Haptics.selectionAsync().catch(() => {})
    void rw.run(value, m).catch(() => {})
  }
  const accept = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onAccept(rw.result)
    rw.reset()
  }
  const list = rewriteModes.filter((m) => modes.includes(m.id))
  const hasResult = rw.mode !== null && (rw.isBusy || rw.result || rw.error)
  const empty = !value.trim()
  const quiet = s.skin === 'clean' || s.skin === 'minimal'
  const wells = skinHasWells(s.skin)
  const modeIcon = (m: RewriteMode, color: string, sz = z.icon) => renderIcon(icons[m], defaultIcons[m], { size: sz, strokeWidth: 1.75, color })
  const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps> | null) => (override === null ? undefined : (override ?? fallback ?? undefined))
  const slot = (m: RewriteMode, selected: boolean, icon: ReactNode) => renderMode?.({ mode: m, label: labels[m], icon, selected, disabled: empty, onPress: () => start(m) })

  // Toolbar edge fades: only where there is more to scroll to, in the track's own colour.
  const updateEdges = (x: number) => {
    const { view, content } = box.current
    const next = { left: x > 2, right: content - view - x > 2 }
    setEdges((e) => (e.left === next.left && e.right === next.right ? e : next))
  }
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => updateEdges(e.nativeEvent.contentOffset.x)
  const trackFill = s.skin === 'clean' ? t.colors.muted : colorAlpha(s.inset.fill) < 0.05 ? t.colors.bg : s.inset.fill
  const fade = (side: 'left' | 'right') => (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, width: 44, [side]: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`ondai-rw-fade-${side}`} x1={side === 'right' ? '0' : '1'} y1="0" x2={side === 'right' ? '1' : '0'} y2="0">
            <Stop offset="0" stopColor={trackFill} stopOpacity={0} />
            <Stop offset="0.7" stopColor={trackFill} stopOpacity={1} />
            <Stop offset="1" stopColor={trackFill} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#ondai-rw-fade-${side})`} />
      </Svg>
    </View>
  )

  // The selected segment's ink: the plate ink on steel, the key ink on shine, else the text colour.
  const onInk = s.skin === 'metal' ? s.metal.plateInk : t.colors.text
  const segR = Math.max(6, (s.skin === 'clean' ? 10 : s.radius.control) - 3)
  const popPad = s.skin === 'pop' ? 3 : 0
  const segment = (m: RewriteMode, label: string) => {
    const on = rw.mode === m && !!hasResult
    const custom = slot(m, on, modeIcon(m, on ? onInk : t.colors.textTertiary))
    if (custom !== undefined) return <View key={m}>{custom}</View>
    return (
      <Pressable
        key={m}
        onPress={() => start(m)}
        onLayout={(e) => {
          itemX.current[m] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width }
          if (m === rw.mode) reveal(m, false)
        }}
        disabled={empty}
        accessibilityRole="button"
        accessibilityState={{ selected: on, disabled: empty }}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, height: z.seg, paddingHorizontal: 10, borderRadius: segR, opacity: empty ? 0.4 : pressed ? 0.7 : 1, marginBottom: popPad }, styles.mode]}
      >
        {(st) => {
          const hover = (st as { hovered?: boolean }).hovered && !empty
          return (
            <>
              {on ? <SelectedFace radius={segR} s={s} /> : hover ? <SkinRowFace radius={segR} /> : null}
              {/* Wrapped so the icon paints above the absolutely placed face on web. */}
              <View>{modeIcon(m, on || hover ? onInk : t.colors.textTertiary)}</View>
              <Text numberOfLines={1} style={[typeStyle(t, z.font, { weight: 'medium' }), { color: on || hover ? onInk : t.colors.textSecondary }, styles.modeText]}>
                {label}
              </Text>
            </>
          )
        }}
      </Pressable>
    )
  }

  const modeButtons =
    presentation === 'chips' ? (
      <View accessibilityLabel={labels.modes} style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, styles.toolbar]}>
        {list.map((m) => {
          const on = rw.mode === m.id && !!hasResult
          const ink = on ? (quiet ? t.colors.bg : s.chip.selectedFg) : t.colors.textSecondary
          const custom = slot(m.id, on, modeIcon(m.id, ink, z.icon - 1))
          if (custom !== undefined) return <View key={m.id}>{custom}</View>
          return <Chip key={m.id} label={labels[m.id]} size={z.chip} variant="soft" selected={on} icon={modeIcon(m.id, ink, z.icon - 1)} onPress={() => start(m.id)} disabled={empty} style={styles.mode} />
        })}
      </View>
    ) : presentation === 'menu' ? (
      <>
        <View style={[{ flexDirection: 'row' }, styles.toolbar]}>
          <Button title={labels.menu} variant={quiet ? 'outline' : 'raised'} size={z.key} icon={keyIcon(icons.menu, PenLine)} onPress={() => setMenuOpen(true)} disabled={empty} />
        </View>
        <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} presentation="sheet" variant="solid" inline>
          <View accessibilityLabel={labels.modes} style={{ padding: 8, gap: 2 }}>
            {list.map((m) => {
              const ink = wells ? s.tile.ink : t.colors.textSecondary
              const custom = slot(m.id, rw.mode === m.id, modeIcon(m.id, ink, z.icon + 2))
              if (custom !== undefined) return <View key={m.id}>{custom}</View>
              return (
                <Pressable key={m.id} onPress={() => start(m.id)} accessibilityRole="menuitem" style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: s.radius.control }, styles.mode]}>
                  {(st) => (
                    <>
                      {st.pressed || (st as { hovered?: boolean }).hovered ? <SkinRowFace radius={s.radius.control} /> : null}
                      <Tile size={z.tile}>{modeIcon(m.id, ink, z.icon + 2)}</Tile>
                      <Text style={[typeStyle(t, z.body), { color: t.colors.text }, styles.modeText]}>{labels[m.id]}</Text>
                    </>
                  )}
                </Pressable>
              )
            })}
          </View>
        </Sheet>
      </>
    ) : (
      <Surface
        elevation="inset"
        radius={s.skin === 'clean' ? t.radii.md : s.radius.control + 1}
        accessibilityLabel={labels.modes}
        onLayout={(e) => {
          box.current.view = e.nativeEvent.layout.width - 6
          updateEdges(0)
          reveal(rw.mode, false)
        }}
        style={[{ padding: 3, overflow: 'hidden' }, styles.toolbar]}
      >
        <ScrollView
          ref={scroller}
          horizontal
          focusable
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={32}
          onContentSizeChange={(w) => {
            box.current.content = w
            updateEdges(0)
            reveal(rw.mode, false)
          }}
          contentContainerStyle={{ gap: 2 }}
        >
          {list.map((m) => segment(m.id, labels[m.id]))}
        </ScrollView>
        {edges.left ? fade('left') : null}
        {edges.right ? fade('right') : null}
      </Surface>
    )

  const done = !rw.isBusy && !!rw.result
  const streaming = rw.status === 'streaming'
  const textStyle = [typeStyle(t, z.body), { color: t.colors.text }, styles.resultText]
  const resultBody = rw.error ? (
    <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{rw.error.message}</Text>
  ) : rw.status === 'thinking' ? (
    <View style={{ gap: 12 }}>
      <ShimmerText size="sm" active>
        {labels[workingKey[rw.mode ?? 'custom']]}
      </ShimmerText>
      <Skeleton lines={2} height={10} radius={5} style={{ paddingVertical: 2 }} />
    </View>
  ) : renderResult ? (
    renderResult({ original: rw.original, result: rw.result, mode: rw.mode, streaming, view: resultView })
  ) : resultView === 'diff' && done ? (
    <Animated.View entering={motion.enabled ? FadeIn.duration(180) : undefined}>
      <Text style={textStyle}>
        {wordDiff(rw.original, rw.result).map((p, i, all) =>
          p.type === 'equal' ? (
            <Text key={i}>{p.text}</Text>
          ) : p.type === 'add' ? (
            <Text key={i} style={{ backgroundColor: t.colors.successSoft, color: t.colors.text }}>
              {p.text}
            </Text>
          ) : (
            <Text key={i}>
              <Text style={{ color: t.colors.textTertiary, textDecorationLine: 'line-through' }}>{p.text}</Text>
              {/* A removed word right before its replacement needs a gap, or the two read as one. */}
              {all[i + 1]?.type === 'add' && !/\s$/.test(p.text) ? ' ' : null}
            </Text>
          ),
        )}
      </Text>
    </Animated.View>
  ) : resultView === 'sideBySide' ? (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>{labels.before}</Text>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>{rw.original}</Text>
      </View>
      <View style={{ width: hairlineWidth, backgroundColor: t.colors.hairline }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>{labels.after}</Text>
        <StreamingText text={rw.result} streaming={streaming} size="sm" style={styles.resultText} />
      </View>
    </View>
  ) : (
    <StreamingText text={rw.result} streaming={streaming} size={z.body} placeholder="" style={styles.resultText} />
  )

  const retry = () => (rw.mode ? start(rw.mode) : undefined)
  const showActions = done || (rw.error && rw.error.kind !== 'refusal')
  const actions = renderActions ? (
    renderActions({ done, result: rw.result, error: rw.error, accept, reject: () => rw.reset(), retry })
  ) : showActions ? (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32, marginTop: 2 }, styles.footer]}>
      <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary, flex: 1 }]} numberOfLines={1}>
        {done ? changeMeta(rw.original, rw.result, labels) : ''}
      </Text>
      {done ? (
        <>
          <Button title={labels.reject} variant="ghost" size={z.key} icon={keyIcon(icons.reject, null)} onPress={() => rw.reset()} />
          <Button title={labels.accept} variant="solid" size={z.key} icon={keyIcon(icons.accept, Check)} onPress={accept} />
        </>
      ) : rw.mode ? (
        <Button title={labels.retry} variant="outline" size={z.key} icon={keyIcon(icons.retry, RefreshCw)} onPress={retry} />
      ) : null}
    </View>
  ) : null

  const headInk = wells ? s.tile.ink : s.skin === 'shine' ? s.primary.fg : t.colors.textTertiary
  const emptyView = empty && !hasResult ? (renderEmpty ? renderEmpty() : <Note color={t.colors.textTertiary}>{labels.empty}</Note>) : null

  return (
    <View style={[{ gap: 10 }, style, styles.container]} testID={testID}>
      {modeButtons}
      {emptyView}
      {hasResult ? (
        <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined}>
          <Surface radius={radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container - 2)} style={[{ paddingHorizontal: z.pad, paddingTop: z.pad - 4, paddingBottom: z.pad - 4, gap: 10 }, styles.result]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 24 }}>
              <Tile size={z.tile}>{modeIcon(rw.mode ?? 'custom', headInk, z.icon + 2)}</Tile>
              <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textSecondary, flex: 1 }]} numberOfLines={1}>
                {labels[rw.mode ?? 'custom']}
              </Text>
              {showBadge ? <OnDeviceBadge size="sm" style={{ alignSelf: 'center' }} state={rw.status} provider={rw.provider} locality={rw.locality as never} /> : null}
            </View>
            {resultBody}
            {actions}
          </Surface>
        </Animated.View>
      ) : null}
    </View>
  )
}

/** A status line (empty, error). On `glass` it sits on a small frosted plate, so it reads over whatever is behind. */
function Note({ children, color }: { children: ReactNode; color: string }) {
  const t = useTheme()
  const s = useSkin()
  const text = <Text style={[typeStyle(t, 'sm'), { color }]}>{children}</Text>
  if (s.skin !== 'glass') return text
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: s.radius.control, backgroundColor: s.secondary.fill, borderWidth: 1, borderColor: s.secondary.border, ...(Platform.OS === 'web' ? frost : null) }}>{text}</View>
}

/**
 * The selected toolbar segment: a lifted white segment in `clean`, a hairline in `minimal`, and the
 * variant's row face everywhere else (a keycap, a glossy pearl, a steel plate, frosted glass, a lit sheen).
 */
function SelectedFace({ radius, s }: { radius: number; s: SkinTokens }) {
  const t = useTheme()
  const fill: ViewStyle = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius }
  if (s.skin === 'clean') return <View pointerEvents="none" style={[fill, { backgroundColor: s.dark ? t.colors.elevatedHover : t.colors.surface }, s.dark ? null : ({ boxShadow: t.shadows.sm } as ViewStyle)]} />
  if (s.skin === 'minimal') return <View pointerEvents="none" style={[fill, { borderWidth: 1, borderColor: t.colors.hairlineStrong, backgroundColor: t.colors.surface }]} />
  if (s.skin === 'shine')
    return (
      <View pointerEvents="none" style={[fill, { backgroundColor: t.colors.surface, overflow: 'hidden', borderWidth: 1, borderColor: t.colors.hairlineStrong, boxShadow: s.dark ? undefined : t.shadows.sm } as ViewStyle]}>
        <Sweep color={s.dark ? 'rgba(255,255,255,0.14)' : 'rgba(9,9,11,0.06)'} period={5200} width={0.8} />
      </View>
    )
  return <SkinRowFace radius={radius} />
}

/** The tile behind a mode icon: the variant's keycap, candy, chrome cap or frost; a lit key for `shine`; bare otherwise. */
function Tile({ size, children }: { size: number; children: ReactNode }) {
  const s = useSkin()
  if (children === null || children === undefined) return null
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

export default Rewrite
