import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Platform, Pressable, ScrollView, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { ArrowRight, Check, CircleAlert, Command, CornerDownLeft, FileText, Mic, Search, ShieldCheck } from 'lucide-react-native'
import { errorMessages, humanize, type PendingConfirmation, type ToolStep } from '@ondai/core'
import type { FontSizeKey, SkinInput, SkinTokens } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { KeyHint } from '../key-hint/key-hint'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { Sheet } from '../sheet/sheet'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Skeleton } from '../skeleton/skeleton'
import { StreamingText } from '../streaming-text/streaming-text'
import { SkinRowFace, SkinTile, SkinWell, skinHasWells, Surface } from '../surface/surface'
import type { CommandAction } from './actions'
import { registerToolNames, toolName, useCommandBar, type CommandResult, type UseCommandBarOptions } from './use-command-bar'

/** Every icon CommandBar draws. Pass a lucide icon (it is sized and coloured for you), an element, or `null` to hide it. */
export interface CommandBarIcons {
  /** Leading icon in the field. */
  search: IconInput
  /** The mic button. */
  voice: IconInput
  /** Beside the "working" line while the model chooses. */
  thinking: IconInput
  /** Rows in the `actions` group. */
  action: IconInput
  /** Rows in the `screens` group. */
  screen: IconInput
  /** Rows in the `items` group. */
  item: IconInput
  /** A finished tool step. */
  stepDone: IconInput
  /** A failed step and the error row. */
  error: IconInput
  /** The confirmation card. */
  confirm: IconInput
  /** The result row. */
  result: IconInput
  /** The trailing mark on the result row. */
  resultTrailing: IconInput
  /** The `pill` presentation's button. */
  open: IconInput
}

/** Every string CommandBar shows or announces. */
export interface CommandBarLabels {
  placeholder: string
  /** The line shown while the model works. */
  thinking: string
  retry: string
  cancel: string
  approve: string
  /** Under a risky action's title when it has no description. */
  needsApproval: string
  /** Key hint captions in the footer. */
  run: string
  close: string
  recent: string
  suggestions: string
  groupActions: string
  groupScreens: string
  groupItems: string
  /** Shown when nothing matches what was typed. */
  empty: string
  /** The `pill` button, closed and open. */
  openButton: string
  closeButton: string
  /** Screen reader names. */
  inputLabel: string
  voiceLabel: string
}

/** Styles for each part, applied after the component's own. */
export interface CommandBarStyles {
  /** The outer view. */
  container: StyleProp<ViewStyle>
  /** The floating panel. */
  panel: StyleProp<ViewStyle>
  inputRow: StyleProp<ViewStyle>
  input: StyleProp<TextStyle>
  list: StyleProp<ViewStyle>
  groupTitle: StyleProp<TextStyle>
  row: StyleProp<ViewStyle>
  rowTitle: StyleProp<TextStyle>
  rowDescription: StyleProp<TextStyle>
  confirm: StyleProp<ViewStyle>
  result: StyleProp<ViewStyle>
  footer: StyleProp<ViewStyle>
}

export const commandBarLabels: CommandBarLabels = {
  placeholder: 'Ask or do anything…',
  thinking: 'Working out what you mean',
  retry: 'Retry',
  cancel: 'Cancel',
  approve: 'Approve',
  needsApproval: 'Needs your OK before it runs',
  run: 'Run',
  close: 'Close',
  recent: 'Recent',
  suggestions: 'Suggestions',
  groupActions: 'Actions',
  groupScreens: 'Screens',
  groupItems: 'Items',
  empty: 'Nothing matches yet. Press return and the model will try.',
  openButton: 'Ask',
  closeButton: 'Close',
  inputLabel: 'Command input',
  voiceLabel: 'Speak',
}

export interface CommandRowProps {
  action: CommandAction<any>
  onPress: () => void
  /** The row's icon as CommandBar would draw it (respects `icons` and `renderIcon`). */
  icon: ReactNode
}

export interface CommandBarProps extends UseCommandBarOptions {
  /** Layout: a floating `spotlight`, a bottom `sheet`, an `inline` field that grows, a `pill` button that opens it, or `fullscreen`. */
  presentation?: 'spotlight' | 'sheet' | 'inline' | 'pill' | 'fullscreen'
  /**
   * The look: `clean` (default, follows the theme material), `minimal`, `glass`, `pop`, `candy`, `metal`
   * or `shine`. Changes the panel, the rows, the buttons and the confirmation card together.
   * `auto` and `solid` still work and mean `clean`.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for keys, gloss and glow. Defaults to the theme accent. */
  tint?: string
  /** Panel corner radius. Defaults to the variant's. */
  radius?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Shortcut for `labels.placeholder`. */
  placeholder?: string
  /** Replace any icon. `null` hides it. */
  icons?: Partial<CommandBarIcons>
  /** Replace any visible or announced string. */
  labels?: Partial<CommandBarLabels>
  styles?: Partial<CommandBarStyles>
  showVoice?: boolean
  showKeyHints?: boolean
  showBadge?: boolean
  /** Recently run action ids shown when the query is empty. */
  recent?: string[]
  /** Group suggestions by `actions` / `screens` / `items`. */
  grouped?: boolean
  /** Called when the mic is pressed; return transcribed text. */
  onVoice?: () => Promise<string>
  /** Pre-filled query (playground / deep links). */
  initialQuery?: string
  /** Submit the initial query on mount. */
  autoRun?: boolean
  /** Focus the input when the bar opens (default true; turn off for embedded demos). */
  autoFocus?: boolean
  /** Render inside the current view instead of a Modal (web previews). */
  inline?: boolean
  /** @deprecated Use `labels.thinking`. */
  thinkingLabel?: string
  /** Icon per action (wins over `icons.action` / `screen` / `item`). */
  renderIcon?: (action: CommandAction<any>) => ReactNode
  /** Draw a suggestion row yourself. */
  renderAction?: (props: CommandRowProps) => ReactNode
  /** Draw the result yourself. */
  renderResult?: (result: CommandResult) => ReactNode
  /** Draw the confirmation for a risky action yourself. Call `pending.confirm()` or `pending.cancel()`. */
  renderConfirm?: (pending: PendingConfirmation, action?: CommandAction<any>) => ReactNode
  /** Shown when the query matches nothing. Return null to show nothing. */
  renderEmpty?: (query: string) => ReactNode
  /** Replace the footer (badge and key hints). */
  renderFooter?: (state: { status: string; busy: boolean }) => ReactNode
  /**
   * Wrap the panel, e.g. in an effect that runs while the model works:
   * `frame={(panel, busy) => <BorderBeam active={busy} radius="xl">{panel}</BorderBeam>}`
   */
  frame?: (panel: ReactNode, busy: boolean) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<CommandBarProps['size']>
const sizes: Record<Size, { input: number; inputFont: FontSizeKey; icon: number; row: number; title: FontSizeKey; desc: FontSizeKey; tile: number; pad: number; button: 'sm' | 'md' }> = {
  sm: { input: 46, inputFont: 'md', icon: 16, row: 40, title: 'sm', desc: 'xs', tile: 20, pad: 12, button: 'sm' },
  md: { input: 56, inputFont: 'lg', icon: 18, row: 48, title: 'md', desc: 'sm', tile: 24, pad: 16, button: 'sm' },
  lg: { input: 64, inputFont: 'xl', icon: 20, row: 56, title: 'lg', desc: 'md', tile: 28, pad: 18, button: 'md' },
}

/**
 * "Spotlight for your app": natural language becomes one of the app's registered actions,
 * chosen by on-device tool calling, with a preview and confirmation for risky actions.
 */
export function CommandBar({ variant, tint, ...props }: CommandBarProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <CommandBarInner {...props} />
    </SkinProvider>
  )
}

function CommandBarInner({
  presentation = 'spotlight',
  size = 'md',
  radius,
  open: openProp,
  onOpenChange,
  placeholder,
  icons = {},
  labels: labelsProp,
  styles = {},
  showVoice = true,
  showKeyHints = Platform.OS === 'web',
  showBadge = true,
  recent,
  grouped = true,
  onVoice,
  initialQuery = '',
  autoRun = false,
  autoFocus = true,
  inline,
  thinkingLabel,
  renderIcon: renderActionIcon,
  renderAction,
  renderResult,
  renderConfirm,
  renderEmpty,
  renderFooter,
  frame,
  style,
  testID,
  ...hookOptions
}: Omit<CommandBarProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const bar = useCommandBar(hookOptions)
  const z = sizes[size]
  const labels: CommandBarLabels = { ...commandBarLabels, ...(thinkingLabel ? { thinking: thinkingLabel } : null), ...labelsProp, ...(placeholder !== undefined ? { placeholder } : null) }
  const [openState, setOpenState] = useState(openProp ?? (presentation === 'inline' || presentation === 'pill'))
  const open = openProp ?? openState
  const setOpen = (v: boolean) => {
    setOpenState(v)
    onOpenChange?.(v)
  }
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null)
  const busy = bar.status === 'thinking' || bar.status === 'streaming' || bar.status === 'tool'

  useEffect(() => registerToolNames(hookOptions.actions), [hookOptions.actions])
  useEffect(() => {
    if (initialQuery) bar.setQuery(initialQuery)
    if (autoRun && initialQuery) void bar.submit(initialQuery).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, autoRun])
  useEffect(() => {
    // On web the DOM input takes `preventScroll`; native ignores the argument.
    if (open && autoFocus && presentation !== 'pill') setTimeout(() => (inputRef.current as unknown as { focus: (o?: { preventScroll: boolean }) => void } | null)?.focus({ preventScroll: true }), 60)
  }, [open, autoFocus, presentation])
  useEffect(() => {
    if (bar.status === 'done') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [bar.status])

  const submit = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    void bar.submit().catch(() => {})
  }
  const pick = (a: CommandAction<any>) => {
    void Haptics.selectionAsync().catch(() => {})
    void bar.runAction(a, {}).catch(() => {})
  }

  const groupTitles = { actions: labels.groupActions, screens: labels.groupScreens, items: labels.groupItems }
  const groups = useMemo(() => {
    const typed = !!bar.query.trim()
    const recentList = !typed && recent?.length ? recent.map((id) => hookOptions.actions.find((a) => a.id === id)).filter((a): a is CommandAction<any> => !!a) : []
    const rest = bar.suggestions.filter((a) => !recentList.includes(a)).slice(0, Math.max(0, (typed ? 6 : 5) - recentList.length))
    const out: Array<{ key: string; title?: string; items: Array<CommandAction<any>> }> = []
    if (recentList.length) out.push({ key: 'recent', title: labels.recent, items: recentList })
    if (!grouped) {
      if (rest.length) out.push({ key: 'all', title: recentList.length ? labels.suggestions : undefined, items: rest })
      return out
    }
    const order: Array<NonNullable<CommandAction<any>['group']>> = ['actions', 'screens', 'items']
    for (const g of order) {
      const items = rest.filter((a) => (a.group ?? 'actions') === g)
      if (items.length) out.push({ key: g, title: groupTitles[g], items })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar.query, bar.suggestions, recent, hookOptions.actions, grouped, labels.recent, labels.suggestions, labels.groupActions, labels.groupScreens, labels.groupItems])

  const actionFor = (name: string) => hookOptions.actions.find((a) => toolName(a.id) === name)
  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  // Icons on tiles take the tile's ink (white on licorice, ink on chrome); bare icons stay muted.
  const ink = { size: z.icon - 2, strokeWidth: 1.75, color: skinHasWells(s.skin) ? s.tile.ink : s.container.fgMuted }
  const rowIcon = (a: CommandAction<any>) =>
    renderActionIcon?.(a) ??
    (a.group === 'screens' ? renderIcon(icons.screen, ArrowRight, ink) : a.group === 'items' ? renderIcon(icons.item, FileText, ink) : renderIcon(icons.action, Command, ink))

  // Expressive variants seat the field in a well of their own; the quiet ones let it sit on the panel.
  const wells = skinHasWells(s.skin)
  const inputRow = (
    <SkinWell
      style={[{ flexDirection: 'row', alignItems: 'center', height: wells ? z.input - 14 : z.input, paddingLeft: wells ? z.pad - 4 : z.pad, paddingRight: wells ? 6 : 10, gap: 10 }, wells ? { margin: 7, marginBottom: 7 } : null, styles.inputRow]}
    >
      {renderIcon(icons.search, Search, { size: z.icon, strokeWidth: 1.75, color: busy ? t.colors.textSecondary : t.colors.textTertiary })}
      <TextInput
        ref={inputRef}
        testID={testID ? `${testID}-input` : undefined}
        value={bar.query}
        onChangeText={bar.setQuery}
        onSubmitEditing={submit}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === 'Escape') setOpen(false)
        }}
        placeholder={labels.placeholder}
        placeholderTextColor={t.colors.textTertiary}
        selectionColor={s.tint}
        returnKeyType="go"
        autoCorrect={false}
        accessibilityLabel={labels.inputLabel}
        style={[typeStyle(t, z.inputFont), { flex: 1, minWidth: 0, color: t.colors.text, paddingVertical: 0, outlineStyle: 'none' } as never, styles.input]}
      />
      {showVoice && onVoice ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.voiceLabel}
          onPress={() => void onVoice().then((text) => (text ? bar.submit(text) : null)).catch(() => {})}
          hitSlop={8}
          style={(st) => ({ width: z.icon + 14, height: z.icon + 14, borderRadius: s.radius.control - 2, alignItems: 'center', justifyContent: 'center', backgroundColor: st.pressed || (st as { hovered?: boolean }).hovered ? s.rowHover : 'transparent' })}
        >
          {renderIcon(icons.voice, Mic, { size: z.icon - 2, strokeWidth: 1.75, color: t.colors.textSecondary })}
        </Pressable>
      ) : null}
      {showKeyHints && !bar.query ? <KeyHint keys={['cmd', 'K']} size="sm" /> : null}
    </SkinWell>
  )

  const showList = !busy && !bar.result && !bar.pendingConfirmation && !bar.error
  const typed = !!bar.query.trim()
  const empty = showList && typed && groups.length === 0 ? (renderEmpty ? renderEmpty(bar.query) : <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary, paddingHorizontal: 10, paddingVertical: 12 }]}>{labels.empty}</Text>) : null
  const hasBody = busy || !!bar.result || !!bar.pendingConfirmation || !!bar.error || (!!bar.text && !bar.result) || (showList && groups.length > 0) || !!empty

  const body = (
    <View style={[{ padding: 6, gap: 2 }, styles.list]}>
      {busy ? (
        <Animated.View entering={fade} style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {renderIcon(icons.thinking, Command, { size: 16, strokeWidth: 1.75, color: t.colors.textTertiary })}
            <ShimmerText size="sm" active>
              {labels.thinking}
            </ShimmerText>
          </View>
          {bar.steps.map((st) => (
            <StepRow key={st.id} step={st} action={actionFor(st.toolName)} icons={icons} />
          ))}
          {!bar.steps.length ? (
            <View style={{ gap: 14, paddingTop: 4, paddingBottom: 4, opacity: 0.8 }}>
              {[0.42, 0.3].map((w, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: -2 }}>
                  <Skeleton width={32} height={32} radius={8} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={`${w * 100}%`} height={10} />
                    <Skeleton width={`${w * 160}%`} height={8} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>
      ) : null}
      {bar.error && !busy ? (
        <Animated.View entering={fade} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10, paddingRight: 4, minHeight: 44 }}>
          {renderIcon(icons.error, CircleAlert, { size: 16, strokeWidth: 1.75, color: t.colors.danger })}
          <Text style={[typeStyle(t, 'sm'), { flex: 1, color: t.colors.danger }]} numberOfLines={2}>
            {bar.error.message || errorMessages.unknown}
          </Text>
          <Button title={labels.retry} size="sm" variant="ghost" onPress={submit} />
        </Animated.View>
      ) : null}
      {bar.pendingConfirmation
        ? (renderConfirm?.(bar.pendingConfirmation, actionFor(bar.pendingConfirmation.toolName)) ?? (
            <ConfirmBlock pending={bar.pendingConfirmation} action={actionFor(bar.pendingConfirmation.toolName)} labels={labels} icons={icons} s={s} z={z} style={styles.confirm} />
          ))
        : null}
      {bar.result ? (renderResult?.(bar.result) ?? <ResultRow result={bar.result} icons={icons} s={s} z={z} style={styles.result} />) : null}
      {bar.text && !bar.result && !bar.pendingConfirmation ? (
        <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
          <StreamingText text={bar.text} streaming={bar.status === 'streaming'} size="sm" color={t.colors.textSecondary} />
        </View>
      ) : null}
      {showList
        ? groups.map((g) => (
            <View key={g.key}>
              {g.title ? <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 }, styles.groupTitle]}>{g.title}</Text> : null}
              {g.items.map((a) =>
                renderAction ? (
                  <View key={a.id}>{renderAction({ action: a, onPress: () => pick(a), icon: rowIcon(a) })}</View>
                ) : (
                  <ActionRow key={a.id} action={a} icon={rowIcon(a)} onPress={() => pick(a)} s={s} z={z} styles={styles} />
                ),
              )}
            </View>
          ))
        : null}
      {empty}
    </View>
  )

  const hint = (keys: string[], label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <KeyHint keys={keys} size="sm" />
      <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>{label}</Text>
    </View>
  )
  const footer = renderFooter ? (
    renderFooter({ status: bar.status, busy })
  ) : showBadge || showKeyHints ? (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 44, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }, styles.footer]}>
      {showBadge ? <OnDeviceBadge size="sm" state={bar.status} provider={bar.provider} locality={bar.locality as never} style={{ alignSelf: 'center' }} /> : <View />}
      {showKeyHints ? (
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          {hint(['enter'], labels.run)}
          {hint(['esc'], labels.close)}
        </View>
      ) : null}
    </View>
  ) : null

  const content = (expanded: boolean) => (
    <>
      {inputRow}
      {expanded && hasBody ? (
        <>
          {wells ? null : <View style={{ height: hairlineWidth, backgroundColor: t.colors.hairline }} />}
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
            {body}
          </ScrollView>
        </>
      ) : null}
      {expanded ? footer : null}
    </>
  )

  // The panel is the AI input: a floating surface in the chosen variant. `frame` can add an effect while the model works.
  const panelRadius = radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)
  const panel = (expanded: boolean) => {
    const surface = (
      <Surface elevation="floating" radius={panelRadius} style={[{ overflow: 'hidden' }, styles.panel]}>
        {content(expanded)}
      </Surface>
    )
    return frame ? frame(surface, busy) : surface
  }

  if (presentation === 'inline') {
    const expanded = !!(bar.query || bar.result || bar.pendingConfirmation || bar.error || busy)
    return (
      <View style={[style, styles.container]} testID={testID}>
        {panel(expanded)}
      </View>
    )
  }
  if (presentation === 'pill') {
    return (
      <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
        {open ? <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined}>{panel(true)}</Animated.View> : null}
        <Button
          title={open ? labels.closeButton : labels.openButton}
          variant="solid"
          size={z.button === 'sm' ? 'md' : 'lg'}
          icon={icons.open === null ? undefined : (icons.open ?? Command)}
          onPress={() => setOpen(!open)}
          accessibilityLabel={open ? labels.closeButton : labels.openButton}
          style={{ alignSelf: 'center' }}
        />
      </View>
    )
  }
  if (presentation === 'spotlight' && inline) {
    // Embedded previews: the floating panel on its own, no scrim behind it.
    if (!open) return null
    return (
      <View style={[{ padding: 12, paddingTop: 16 }, style, styles.container]} testID={testID}>
        <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined}>{panel(true)}</Animated.View>
      </View>
    )
  }
  return (
    <Sheet open={open} onClose={() => setOpen(false)} presentation={presentation === 'sheet' ? 'sheet' : presentation === 'fullscreen' ? 'fullscreen' : 'spotlight'} inline={inline} style={[style, styles.container]} testID={testID}>
      {content(true)}
    </Sheet>
  )
}

/* ---------------------------------------------------------------------------------------------- */

type Z = (typeof sizes)[Size]

/**
 * A fixed slot so row text lines up. In the quiet variants the icon stands on its own; the expressive ones
 * seat it on a small tile in their material (a keycap, a sweet, a brushed well, frosted glass).
 */
function Tile({ children, z }: { children: ReactNode; z: Z }) {
  const s = useSkin()
  // An icon hidden with `icons={{ action: null }}` takes its slot with it, so the text starts at the edge.
  if (children === null || children === undefined || children === false) return null
  if (skinHasWells(s.skin)) return <View style={{ height: z.tile + 8, justifyContent: 'center' }}><SkinTile size={z.tile + 6}>{children}</SkinTile></View>
  return <View style={{ width: z.tile, height: z.tile + 8, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
}

function ActionRow({ action, icon, onPress, s, z, styles }: { action: CommandAction<any>; icon: ReactNode; onPress: () => void; s: SkinTokens; z: Z; styles: Partial<CommandBarStyles> }) {
  const t = useTheme()
  const r = Math.max(8, s.radius.control)
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: z.row, paddingHorizontal: 8, paddingVertical: 6, borderRadius: r }, styles.row]}>
      {(st) => (
        <>
          {/* The hovered or pressed row becomes the variant's key: a keycap, a glossy pill, a steel plate. */}
          {st.pressed || (st as { hovered?: boolean }).hovered ? <SkinRowFace radius={r} /> : null}
          <Tile z={z}>{icon}</Tile>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typeStyle(t, z.title, { weight: 'medium' }), { color: t.colors.text }, styles.rowTitle]} numberOfLines={1}>
              {action.title}
            </Text>
            {action.description ? (
              <Text style={[typeStyle(t, z.desc), { color: t.colors.textSecondary }, styles.rowDescription]} numberOfLines={1}>
                {action.description}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </Pressable>
  )
}

/** One tool call as a trace row: icon, what it did, the arguments as muted meta. */
function StepRow({ step, action, icons }: { step: ToolStep; action?: CommandAction<any>; icons: Partial<CommandBarIcons> }) {
  const t = useTheme()
  const title = action?.title ?? humanize(step.toolName)
  const meta = Object.values(step.input ?? {})
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .slice(0, 2)
    .join(' · ')
  const live = step.status === 'running' || step.status === 'pending'
  const failed = step.status === 'error'
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {failed ? renderIcon(icons.error, CircleAlert, { size: 16, strokeWidth: 1.75, color: t.colors.danger }) : renderIcon(icons.stepDone, Check, { size: 16, strokeWidth: 1.75, color: t.colors.textTertiary })}
      {live ? (
        <ShimmerText size="sm" active>
          {title}
        </ShimmerText>
      ) : (
        <Text style={[typeStyle(t, 'sm'), { color: failed ? t.colors.danger : t.colors.textSecondary }]}>{title}</Text>
      )}
      {meta ? (
        <Text style={[typeStyle(t, 'sm'), { flex: 1, color: t.colors.textTertiary }]} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </View>
  )
}

/** Risky actions ask first: what will run, with which values, and two buttons. */
function ConfirmBlock({ pending, action, labels, icons, s, z, style }: { pending: PendingConfirmation; action?: CommandAction<any>; labels: CommandBarLabels; icons: Partial<CommandBarIcons>; s: SkinTokens; z: Z; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  const motion = useMotion()
  const entries = Object.entries(pending.input ?? {}).filter(([, v]) => v !== undefined && v !== '')
  const clean = s.skin === 'clean'
  const inner = (
    <>
      <View style={{ flexDirection: 'row', gap: 12, padding: 12, alignItems: 'center' }}>
        <Tile z={z}>{renderIcon(icons.confirm, ShieldCheck, { size: z.icon - 2, strokeWidth: 1.75, color: skinHasWells(s.skin) ? s.tile.ink : t.colors.textSecondary })}</Tile>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typeStyle(t, z.title, { weight: 'medium' }), { color: t.colors.text }]} numberOfLines={1}>{`${action?.title ?? pending.title}?`}</Text>
          <Text style={[typeStyle(t, z.desc), { color: t.colors.textSecondary }]} numberOfLines={1}>
            {action?.description ?? labels.needsApproval}
          </Text>
        </View>
      </View>
      {entries.length ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
          {entries.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }}>
              <Text style={[typeStyle(t, 'sm'), { width: 64, color: t.colors.textTertiary }]}>{humanize(k)}</Text>
              <Text style={[typeStyle(t, 'sm'), { flex: 1, color: t.colors.text }]} numberOfLines={2}>
                {String(v)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }}>
        <Button title={labels.cancel} size={z.button} variant="ghost" onPress={() => pending.cancel()} />
        <Button title={labels.approve} size={z.button} variant="solid" onPress={() => pending.confirm()} />
      </View>
    </>
  )
  return (
    <Animated.View entering={motion.enabled ? FadeIn.duration(180) : undefined} style={{ margin: 4 }}>
      {clean ? (
        <View style={[{ borderRadius: 12, borderWidth: hairlineWidth, borderColor: t.colors.hairlineStrong, backgroundColor: t.colors.surface, overflow: 'hidden' }, style]}>{inner}</View>
      ) : (
        <Surface elevation="inset" radius={s.radius.inset + 2} style={style}>
          {inner}
        </Surface>
      )}
    </Animated.View>
  )
}

function ResultRow({ result, icons, s, z, style }: { result: CommandResult; icons: Partial<CommandBarIcons>; s: SkinTokens; z: Z; style?: StyleProp<ViewStyle> }) {
  const t = useTheme()
  const motion = useMotion()
  const title = result.action.title
  const detail = result.preview ? result.preview.replace(new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*·\\s*`), '') : typeof result.result === 'string' ? result.result : undefined
  const row: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: z.row + 4, paddingHorizontal: 8, paddingVertical: 6 }
  const inner = (
    <>
      <Tile z={z}>{renderIcon(icons.result, Check, { size: z.icon - 2, strokeWidth: 2, color: skinHasWells(s.skin) ? s.tile.ink : t.colors.text })}</Tile>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typeStyle(t, z.title, { weight: 'medium' }), { color: t.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text style={[typeStyle(t, z.desc), { color: t.colors.textSecondary }]} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      {renderIcon(icons.resultTrailing, CornerDownLeft, { size: 16, strokeWidth: 1.75, color: t.colors.textTertiary })}
    </>
  )
  return (
    <Animated.View entering={motion.enabled ? FadeIn.duration(180) : undefined}>
      {s.skin === 'clean' ? (
        <View style={[row, { borderRadius: 10, backgroundColor: t.colors.muted }, style]}>{inner}</View>
      ) : (
        <Surface elevation="inset" style={[row, style]}>
          {inner}
        </Surface>
      )}
    </Animated.View>
  )
}

export default CommandBar
