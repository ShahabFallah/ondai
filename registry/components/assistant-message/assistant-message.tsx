import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Check, ChevronDown, ChevronRight, CircleAlert, Command, Copy, RotateCcw } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import type { AiState, FontSizeKey, SkinInput } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { StreamingText } from '../streaming-text/streaming-text'
import { CandyFill, ChromeRim, frost, SkinTile, skinHasWells, Surface, Sweep } from '../surface/surface'

export interface MessageStep {
  id: string
  /** What the model did, in a few words: "Searched your notes for Lyon". */
  label: string
  status: 'running' | 'done' | 'error'
}

export interface MessageSource {
  id: string
  title: string
  /** Where it came from: "Notes", "Mail, Tuesday". */
  detail?: string
  onPress?: () => void
}

/** Every icon a reply draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface AssistantMessageIcons {
  /** The assistant's mark at the start of the trace line. */
  avatar: IconInput
  /** The trace's disclosure chevron, closed and open. */
  expand: IconInput
  collapse: IconInput
  stepDone: IconInput
  stepError: IconInput
  /** Beside a failed reply. */
  error: IconInput
  copy: IconInput
  copied: IconInput
  retry: IconInput
}

/** Every string a reply shows or announces. `{time}` and `{count}` are filled in. */
export interface AssistantMessageLabels {
  /** While waiting for the first word. */
  thinking: string
  /** "Thought for 1.2s". */
  thought: string
  /** When there is no time, the step count: "1 step", "3 steps". */
  stepsOne: string
  stepsMany: string
  /** A failed or declined reply, when no `error` is passed. */
  error: string
  refusal: string
  copy: string
  copied: string
  retry: string
}

/** Styles for each part, applied after the component's own. */
export interface AssistantMessageStyles {
  /** The outer view (the card in the `card` presentation). */
  container: StyleProp<ViewStyle>
  trace: StyleProp<ViewStyle>
  steps: StyleProp<ViewStyle>
  step: StyleProp<ViewStyle>
  text: StyleProp<TextStyle>
  sources: StyleProp<ViewStyle>
  source: StyleProp<ViewStyle>
  actions: StyleProp<ViewStyle>
}

export const assistantMessageLabels: AssistantMessageLabels = {
  thinking: 'Thinking',
  thought: 'Thought for {time}',
  stepsOne: '1 step',
  stepsMany: '{count} steps',
  error: "Couldn't finish the answer.",
  refusal: 'The on-device model declined to answer this.',
  copy: 'Copy',
  copied: 'Copied',
  retry: 'Ask again',
}

export interface MessageActionsProps {
  text: string
  copied: boolean
  copy: () => void
  retry?: () => void
}

export interface AssistantMessageProps {
  text: string
  status?: AiState
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the mark,
   * the source chips, the action keys and (in `card`) the reply's panel together.
   */
  variant?: SkinInput
  /** `plain` sits on the page like a document (the default); `card` puts the reply on a panel. */
  presentation?: 'plain' | 'card'
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the mark, gloss and glow. Defaults to the theme accent. */
  tint?: string
  /** Corner radius of the card and the source chips. Defaults to the variant's. */
  radius?: number
  /** Time from the question to the first word, shown as "Thought for 1.2s". */
  thoughtMs?: number
  /** Tools or lookups behind the answer. */
  steps?: MessageStep[]
  /** Open the steps list without a tap. */
  defaultExpanded?: boolean
  sources?: MessageSource[]
  /** Shown instead of the text when the reply failed. */
  error?: string
  /** Copy is built in; pass to hear about it. */
  onCopy?: (text: string) => void
  onRetry?: () => void
  icons?: Partial<AssistantMessageIcons>
  labels?: Partial<AssistantMessageLabels>
  styles?: Partial<AssistantMessageStyles>
  /** @deprecated Use `labels.thinking`. */
  thinkingLabel?: string
  /** Draw one source yourself (a thumbnail, a favicon). */
  renderSource?: (source: MessageSource, index: number) => ReactNode
  /** Draw one step of the trace yourself. */
  renderStep?: (step: MessageStep) => ReactNode
  /** Draw the keys under a finished reply yourself (add thumbs, share). */
  renderActions?: (actions: MessageActionsProps) => ReactNode
  /** Draw a failed or declined reply yourself. */
  renderError?: (message: string, retry?: () => void) => ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<AssistantMessageProps['size']>
const sizes: Record<Size, { text: FontSizeKey; meta: FontSizeKey; mark: number; icon: number; chip: number; key: 'sm' | 'md'; gap: number; pad: number }> = {
  sm: { text: 'md', meta: 'xs', mark: 20, icon: 12, chip: 26, key: 'sm', gap: 8, pad: 12 },
  md: { text: 'lg', meta: 'sm', mark: 22, icon: 13, chip: 30, key: 'sm', gap: 10, pad: 14 },
  lg: { text: 'xl', meta: 'md', mark: 26, icon: 15, chip: 34, key: 'md', gap: 12, pad: 18 },
}

const seconds = (ms: number) => `${Math.max(0.1, ms / 1000).toFixed(1)}s`
const fill = (str: string, vars: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
const keyIcon = (override: IconInput | undefined, fallback?: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))

/**
 * One reply from the on-device model: a quiet trace of what it did ("Thought for 1.2s", tool steps),
 * the answer streaming in, where it came from, and copy and retry once it is done.
 * Replies have no bubble by default; the person's own turns do (UserMessage).
 */
export function AssistantMessage({ variant, tint, ...props }: AssistantMessageProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <MessageInner {...props} />
    </SkinProvider>
  )
}

function MessageInner({
  text,
  status = 'done',
  presentation = 'plain',
  size = 'md',
  radius,
  thoughtMs,
  steps = [],
  defaultExpanded = false,
  sources = [],
  error,
  onCopy,
  onRetry,
  icons = {},
  labels: labelsProp,
  styles = {},
  thinkingLabel,
  renderSource,
  renderStep,
  renderActions,
  renderError,
  style,
  testID,
}: Omit<AssistantMessageProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels = { ...assistantMessageLabels, ...(thinkingLabel ? { thinking: thinkingLabel } : null), ...labelsProp }
  const waiting = status === 'thinking' || status === 'tool'
  const streaming = status === 'streaming'
  const failed = status === 'error' || status === 'refusal'
  const runningStep = steps.find((st) => st.status === 'running')
  const [open, setOpen] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)
  const wells = skinHasWells(s.skin)
  useEffect(() => setOpen(defaultExpanded), [defaultExpanded])
  useEffect(() => {
    if (!copied) return
    const h = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(h)
  }, [copied])

  const copy = () => {
    void Clipboard.setStringAsync(text).catch(() => {})
    setCopied(true)
    onCopy?.(text)
  }
  const retry = onRetry && status !== 'refusal' ? onRetry : undefined

  const meta = typeStyle(t, z.meta)
  const mark = renderIcon(icons.avatar, Command, { size: z.icon, strokeWidth: 1.9, color: wells ? s.tile.ink : t.colors.textSecondary })
  let traceText: ReactNode = null
  if (waiting) {
    traceText = (
      <ShimmerText size={z.meta} active accessibilityRole="progressbar">
        {runningStep?.label ?? labels.thinking}
      </ShimmerText>
    )
  } else if (thoughtMs !== undefined || steps.length) {
    const label = thoughtMs !== undefined ? fill(labels.thought, { time: seconds(thoughtMs) }) : fill(steps.length === 1 ? labels.stepsOne : labels.stepsMany, { count: steps.length })
    traceText = steps.length ? (
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={8} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}>
        <Text style={[meta, { color: t.colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{label}</Text>
        {renderIcon(open ? icons.collapse : icons.expand, open ? ChevronDown : ChevronRight, { size: z.icon + 1, strokeWidth: 1.75, color: t.colors.textTertiary })}
      </Pressable>
    ) : (
      <Text style={[meta, { color: t.colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{label}</Text>
    )
  }
  const trace =
    traceText || mark ? (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: z.gap - 2, minHeight: z.mark }, styles.trace]}>
        <Mark size={z.mark}>{mark}</Mark>
        {traceText}
      </View>
    ) : null

  const stepList =
    open && steps.length && !waiting ? (
      <Animated.View entering={motion.enabled ? FadeIn.duration(160) : undefined} style={[{ gap: 6, marginLeft: z.mark / 2 - 0.5, paddingLeft: z.mark / 2 + z.gap / 2 - 2, borderLeftWidth: 1, borderLeftColor: s.skin === 'pop' ? t.colors.hairlineStrong : t.colors.hairline }, styles.steps]}>
        {steps.map((st) =>
          renderStep ? (
            <View key={st.id}>{renderStep(st)}</View>
          ) : (
            <View key={st.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, styles.step]}>
              {st.status === 'error'
                ? renderIcon(icons.stepError, CircleAlert, { size: z.icon, strokeWidth: 1.75, color: t.colors.danger })
                : renderIcon(icons.stepDone, Check, { size: z.icon, strokeWidth: 2, color: t.colors.textTertiary })}
              <Text numberOfLines={1} style={[meta, { color: t.colors.textSecondary, flexShrink: 1 }]}>
                {st.label}
              </Text>
            </View>
          ),
        )}
      </Animated.View>
    ) : null

  const failMessage = error ?? (status === 'refusal' ? labels.refusal : labels.error)
  const bodyText = failed ? (
    renderError ? (
      renderError(failMessage, retry)
    ) : (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        {status === 'error' ? <View style={{ marginTop: 3 }}>{renderIcon(icons.error, CircleAlert, { size: z.icon + 3, strokeWidth: 1.75, color: t.colors.danger })}</View> : null}
        <Text style={[typeStyle(t, z.text), { color: t.colors.textSecondary, flex: 1 }, styles.text]}>{failMessage}</Text>
      </View>
    )
  ) : text || streaming ? (
    <StreamingText text={text} streaming={streaming} size={z.text} color={t.colors.text} style={styles.text} />
  ) : null

  const chipRadius = radius !== undefined ? Math.min(radius, 12) : Math.max(8, s.radius.inset - 2)
  const sourceList =
    sources.length && !waiting ? (
      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, styles.sources]}>
        {sources.map((src, i) =>
          renderSource ? (
            <View key={src.id}>{renderSource(src, i)}</View>
          ) : (
            <Pressable key={src.id} onPress={src.onPress} disabled={!src.onPress} accessibilityRole={src.onPress ? 'link' : undefined} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, maxWidth: '100%' })}>
              <Surface elevation="inset" radius={chipRadius} style={[{ flexDirection: 'row', alignItems: 'center', gap: 7, height: z.chip, paddingLeft: 4, paddingRight: 10 }, styles.source]}>
                <Index n={i + 1} size={z.chip - 8} radius={Math.max(4, chipRadius - 4)} />
                <Text numberOfLines={1} style={[typeStyle(t, z.meta, { weight: 'medium' }), { color: t.colors.text, flexShrink: 1 }]}>
                  {src.title}
                </Text>
                {src.detail ? (
                  <Text numberOfLines={1} style={[typeStyle(t, z.meta), { color: t.colors.textTertiary }]}>
                    {src.detail}
                  </Text>
                ) : null}
              </Surface>
            </Pressable>
          ),
        )}
      </View>
    ) : null

  // Quiet looks keep quiet text keys; the expressive ones make them the variant's own small keys.
  const keyRole = s.skin === 'clean' || s.skin === 'minimal' ? 'ghost' : 'outline'
  const canCopy = status === 'done' && !!text && icons.copy !== null
  const canRetry = !!retry && icons.retry !== null && ((status === 'done' && !!text) || failed)
  const showActions = renderActions ? (status === 'done' && !!text) || failed : canCopy || canRetry
  const actions = showActions ? (
    renderActions ? (
      renderActions({ text, copied, copy, retry })
    ) : (
      <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: keyRole === 'ghost' ? 2 : 8, marginLeft: keyRole === 'ghost' ? -8 : 0 }, styles.actions]}>
        {canCopy ? <Button variant={keyRole} size={z.key} icon={copied ? keyIcon(icons.copied, Check) : keyIcon(icons.copy, Copy)} onPress={copy} accessibilityLabel={copied ? labels.copied : labels.copy} /> : null}
        {canRetry && retry ? <Button variant={keyRole} size={z.key} icon={keyIcon(icons.retry, RotateCcw)} onPress={retry} accessibilityLabel={labels.retry} /> : null}
      </View>
    )
  ) : null

  const content = (
    <>
      {trace}
      {stepList}
      {bodyText}
      {sourceList}
      {actions}
    </>
  )
  if (presentation === 'card') {
    return (
      <Surface elevation="card" radius={radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)} style={[{ padding: z.pad, gap: z.gap }, style, styles.container]} testID={testID}>
        {content}
      </Surface>
    )
  }
  return (
    <View style={[{ gap: z.gap }, style, styles.container]} testID={testID}>
      {content}
    </View>
  )
}

/** The assistant's mark: the variant's tile in the expressive looks, a soft square in the quiet ones. */
function Mark({ size, children }: { size: number; children: ReactNode }) {
  const t = useTheme()
  const s = useSkin()
  if (children === null || children === undefined || children === false) return null
  if (skinHasWells(s.skin)) return <SkinTile size={size}>{children}</SkinTile>
  const minimal = s.skin === 'minimal'
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), alignItems: 'center', justifyContent: 'center', backgroundColor: minimal ? 'transparent' : t.colors.muted, borderWidth: minimal ? hairlineWidth : 0, borderColor: t.colors.hairlineStrong }}>
      {children}
    </View>
  )
}

/** A source's number, on a small plate in the chip. */
function Index({ n, size, radius }: { n: number; size: number; radius: number }) {
  const t = useTheme()
  const s = useSkin()
  const solid = s.skin === 'pop' || s.skin === 'candy' || s.skin === 'metal'
  const bg = solid ? s.tile.fill : s.skin === 'minimal' ? 'transparent' : t.colors.surface
  const ink = solid ? s.tile.ink : t.colors.textSecondary
  return (
    <View style={{ minWidth: size, height: size, paddingHorizontal: 4, borderRadius: radius, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: s.skin === 'pop' ? 1.5 : s.skin === 'minimal' || s.skin === 'metal' ? hairlineWidth : 0, borderColor: s.skin === 'pop' ? s.secondary.border : s.skin === 'metal' ? s.metal.stroke[1] : t.colors.hairlineStrong }}>
      <Text style={[typeStyle(t, 'xs', { weight: 'semibold' }), { color: ink, fontVariant: ['tabular-nums'] }]}>{n}</Text>
    </View>
  )
}

/* ---------------------------------------------------------------------------------------------- */

export interface UserMessageStyles {
  bubble: StyleProp<ViewStyle>
  text: StyleProp<TextStyle>
}

export interface UserMessageProps {
  text: string
  /**
   * The look: `clean` (a soft grey bubble), `minimal` (a hairline), `glass` (frosted), `pop` (a key in the
   * tint with an ink edge and a side), `candy` (a glossy sweet), `metal` (a steel plate) or `shine` (the tint
   * with a slow gleam). Defaults to the nearest SkinProvider.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Bubble colour (hex) in the expressive looks. Defaults to the theme accent. */
  tint?: string
  /** Bubble corner radius. Default 18. */
  radius?: number
  styles?: Partial<UserMessageStyles>
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** The person's own turn: a bubble on the trailing side, painted in the variant. */
export function UserMessage({ variant, tint, ...props }: UserMessageProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <Bubble {...props} />
    </SkinProvider>
  )
}

function Bubble({ text, size = 'md', radius = 18, styles = {}, style, testID }: Omit<UserMessageProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const z = sizes[size]
  const box: ViewStyle = { borderRadius: radius, paddingHorizontal: z.pad, paddingVertical: Math.round(z.pad * 0.65) }
  const label = (color: string) => <Text style={[typeStyle(t, z.text), { color }, styles.text]}>{text}</Text>
  const outer: StyleProp<ViewStyle> = [{ alignSelf: 'flex-end', maxWidth: '85%' }, style]

  switch (s.skin) {
    case 'pop': {
      // A key in the tint: face, ink edge and a short side.
      const p = s.primary
      const side = 4
      return (
        <View style={[outer, { paddingBottom: side }]} testID={testID}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: side, bottom: 0, borderRadius: radius, backgroundColor: p.side, borderWidth: p.borderWidth, borderColor: p.border }} />
          <View style={[box, { backgroundColor: p.fill, borderWidth: p.borderWidth, borderColor: p.border }, styles.bubble]}>{label(p.fg)}</View>
        </View>
      )
    }
    case 'candy':
      return (
        <View style={[outer, box, { boxShadow: s.primary.shadow } as ViewStyle, styles.bubble]} testID={testID}>
          <CandyFill stops={s.primary.candy!} radius={radius} />
          <View>{label(s.primary.fg)}</View>
        </View>
      )
    case 'metal':
      return (
        <View style={[outer, { borderRadius: radius, boxShadow: s.secondary.shadow } as ViewStyle]} testID={testID}>
          <ChromeRim radius={radius} width={1.5} skin={s} face={s.metal.plate} contentStyle={[box, styles.bubble]}>
            {label(s.metal.plateInk)}
          </ChromeRim>
        </View>
      )
    case 'shine':
      return (
        <View style={[outer, box, { backgroundColor: s.primary.fill, borderWidth: s.primary.borderWidth, borderColor: s.primary.border, boxShadow: s.primary.shadow } as ViewStyle, styles.bubble]} testID={testID}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
            <Sweep color={s.shine.sweep} period={6000} />
          </View>
          {label(s.primary.fg)}
        </View>
      )
    case 'glass':
      return (
        <View style={[outer, box, { backgroundColor: s.secondary.fill, borderWidth: s.secondary.borderWidth, borderColor: s.secondary.border, boxShadow: s.secondary.shadow } as ViewStyle, Platform.OS === 'web' ? frost : null, styles.bubble]} testID={testID}>
          {label(t.colors.text)}
        </View>
      )
    case 'minimal':
      return (
        <View style={[outer, box, { borderWidth: 1, borderColor: t.colors.hairlineStrong }, styles.bubble]} testID={testID}>
          {label(t.colors.text)}
        </View>
      )
    default:
      return (
        <View style={[outer, box, { backgroundColor: s.tint !== t.colors.accent.solid ? s.primary.fill : t.colors.muted }, styles.bubble]} testID={testID}>
          {label(s.tint !== t.colors.accent.solid ? s.primary.fg : t.colors.text)}
        </View>
      )
  }
}

export default AssistantMessage
