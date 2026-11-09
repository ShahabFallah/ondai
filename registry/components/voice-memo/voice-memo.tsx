import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Check, RotateCcw } from 'lucide-react-native'
import { z } from 'zod'
import { useStructured } from '@ondai/core'
import type { FontSizeKey, SkinInput } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { SkinRowFace, SkinTile, skinHasWells, Surface } from '../surface/surface'
import { VoiceInput, type VoiceInputProps } from '../voice-input/voice-input'

export const memoSchema = z.object({
  title: z.string().describe('What the memo is about, 3 to 6 words'),
  summary: z.string().describe('One or two plain sentences'),
  actions: z
    .array(z.object({ text: z.string().describe('A to-do that starts with a verb'), due: z.string().optional().describe('When, in the speaker’s words, if they said one') }))
    .max(6)
    .describe('Things the speaker said they or someone must do'),
})
export type Memo = z.infer<typeof memoSchema>
export type MemoAction = Memo['actions'][number]

/** Every icon VoiceMemo draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface VoiceMemoIcons {
  /** Inside a ticked to-do. */
  check: IconInput
  /** On the add key once the to-dos were added. */
  added: IconInput
  /** On the retry key after an error. */
  retry: IconInput
}

/** Every string VoiceMemo shows or announces. `{count}` is replaced where it appears. */
export interface VoiceMemoLabels {
  /** The recorder's hint before anything is said. */
  record: string
  reading: string
  /** The section title over the to-dos. */
  todos: string
  add: string
  /** The add key when only some to-dos are ticked. */
  addSome: string
  added: string
  none: string
  error: string
  refusal: string
  retry: string
  /** Screen reader names for the transcript toggle. */
  showAll: string
  showLess: string
}

export interface VoiceMemoStyles {
  container: StyleProp<ViewStyle>
  transcript: StyleProp<TextStyle>
  card: StyleProp<ViewStyle>
  title: StyleProp<TextStyle>
  summary: StyleProp<TextStyle>
  row: StyleProp<ViewStyle>
  rowText: StyleProp<TextStyle>
  footer: StyleProp<ViewStyle>
}

export const voiceMemoLabels: VoiceMemoLabels = {
  record: 'Tap and talk. I’ll pull out the to-dos.',
  reading: 'Pulling out the to-dos',
  todos: 'To-dos',
  add: 'Add to Reminders',
  addSome: 'Add {count} to Reminders',
  added: 'Added',
  none: 'No to-dos in this one.',
  error: 'Couldn’t read the memo.',
  refusal: 'The on-device model declined to read this memo.',
  retry: 'Retry',
  showAll: 'Show the whole transcript',
  showLess: 'Show less of the transcript',
}

/** What a custom to-do row gets. */
export interface MemoActionRowProps {
  action: MemoAction
  index: number
  checked: boolean
  toggle: () => void
}

/** What a custom add key gets. */
export interface MemoAddProps {
  picked: MemoAction[]
  memo: Memo
  added: boolean
  add: () => void
}

export interface VoiceMemoProps {
  /** Skip recording and read this transcript (an imported recording, a call you already transcribed). */
  transcript?: string
  /** "Add" was pressed with the to-dos that are still ticked. Without it the add key is hidden. */
  onAdd?: (actions: MemoAction[], memo: Memo) => void
  /**
   * The look: `clean` (default), `minimal`, `glass`, `pop`, `candy`, `metal` or `shine`. Changes the recorder,
   * the memo card, the ticks and the add key together.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the ticks, the mic and the add key. Defaults to the accent. */
  tint?: string
  /** Card corner radius. Defaults to the variant's. */
  radius?: number
  /** To-dos (by index) that start unticked. */
  initialOff?: number[]
  /** Shortcut for `labels.add`, e.g. "Add to Things". */
  addLabel?: string
  icons?: Partial<VoiceMemoIcons>
  labels?: Partial<VoiceMemoLabels>
  styles?: Partial<VoiceMemoStyles>
  /** The model badge in the card's header. */
  showBadge?: boolean
  /** Draw a to-do row yourself. */
  renderAction?: (props: MemoActionRowProps) => ReactNode
  /** Draw the title and summary yourself. */
  renderSummary?: (memo: Memo) => ReactNode
  /** Draw the add key yourself. */
  renderAdd?: (props: MemoAddProps) => ReactNode
  /** Shown when the memo has no to-dos. */
  renderEmpty?: (memo: Memo) => ReactNode
  /** Passed to the recorder (a `recorder`, `mode`, `visual`, its own `labels`). */
  voiceProps?: Partial<Omit<VoiceInputProps, 'onUse' | 'variant' | 'tint'>>
  style?: StyleProp<ViewStyle>
  testID?: string
}

const INSTRUCTIONS =
  'You read a voice memo transcript. Give it a short title, a one or two sentence summary, and list every to-do the speaker mentioned. Keep the speaker’s own words for dates. Do not invent tasks.'

type Size = NonNullable<VoiceMemoProps['size']>
const sizes: Record<Size, { title: FontSizeKey; body: FontSizeKey; meta: FontSizeKey; check: number; key: 'sm' | 'md' | 'lg'; pad: number; row: number }> = {
  sm: { title: 'md', body: 'sm', meta: 'xs', check: 18, key: 'sm', pad: 14, row: 36 },
  md: { title: 'lg', body: 'md', meta: 'sm', check: 22, key: 'md', pad: 16, row: 42 },
  lg: { title: 'xl', body: 'lg', meta: 'md', check: 26, key: 'lg', pad: 20, row: 50 },
}

const fill = (s: string, count: number) => s.replace('{count}', String(count))

/**
 * Talk, and get the memo back as something to act on: a title, a two-line summary, and the to-dos
 * the person mentioned, ticked and ready to add. Recording, transcription and reading all run on the device.
 */
export function VoiceMemo({ variant, tint, ...props }: VoiceMemoProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <MemoView {...props} />
    </SkinProvider>
  )
}

function MemoView({ transcript: given, onAdd, initialOff, size = 'md', radius, addLabel, icons = {}, labels: labelsProp, styles = {}, showBadge = true, renderAction, renderSummary, renderAdd, renderEmpty, voiceProps, style, testID }: Omit<VoiceMemoProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: VoiceMemoLabels = { ...voiceMemoLabels, ...labelsProp, ...(addLabel ? { add: addLabel, addSome: `${addLabel} ({count})` } : null) }
  const [transcript, setTranscript] = useState(given ?? '')
  const [showAll, setShowAll] = useState(false)
  const startOff = () => Object.fromEntries((initialOff ?? []).map((i) => [i, true])) as Record<number, boolean>
  const [off, setOff] = useState<Record<number, boolean>>(startOff)
  const [added, setAdded] = useState(false)
  const memo = useStructured({ schema: memoSchema, instructions: INSTRUCTIONS, component: 'voice-memo', temperature: 0.1 })
  const fade = motion.enabled ? FadeIn.duration(180) : undefined

  useEffect(() => {
    if (given !== undefined) setTranscript(given)
  }, [given])
  useEffect(() => {
    if (!transcript.trim()) return
    setOff(startOff())
    setAdded(false)
    void memo.run(transcript).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript])

  if (!transcript) {
    return <VoiceInput presentation="card" mode="tap" size={size} radius={radius} label={labels.record} {...voiceProps} onUse={setTranscript} style={[style, styles.container]} testID={testID} />
  }

  const m = memo.object
  const picked = m ? m.actions.filter((_, i) => !off[i]) : []
  const meta = typeStyle(t, z.meta)
  const add = () => {
    if (!m || !onAdd) return
    onAdd(picked, m)
    setAdded(true)
  }

  return (
    <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
      <Pressable onPress={() => setShowAll((v) => !v)} accessibilityRole="button" accessibilityLabel={showAll ? labels.showLess : labels.showAll}>
        <Text numberOfLines={showAll ? undefined : 2} style={[meta, { color: t.colors.textSecondary, paddingHorizontal: 2 }, styles.transcript]}>
          {`“${transcript.trim()}”`}
        </Text>
      </Pressable>

      {memo.isLoading ? (
        <ShimmerText size={z.meta === 'xs' ? 'xs' : 'sm'} active>
          {labels.reading}
        </ShimmerText>
      ) : null}

      {memo.error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[meta, { color: t.colors.textSecondary, flex: 1 }]}>{memo.status === 'refusal' ? labels.refusal : labels.error}</Text>
          {memo.status !== 'refusal' ? <Button variant="ghost" size="sm" title={labels.retry} icon={icons.retry === null ? undefined : (icons.retry ?? RotateCcw)} onPress={() => void memo.run(transcript).catch(() => {})} /> : null}
        </View>
      ) : null}

      {m ? (
        <Animated.View entering={fade}>
          <Surface elevation="floating" radius={radius ?? (s.skin === 'clean' ? t.radii.xl : s.radius.container)} style={[{ padding: z.pad, gap: 14 }, styles.card]}>
            {renderSummary ? (
              renderSummary(m)
            ) : (
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Text numberOfLines={2} style={[typeStyle(t, z.title, { weight: 'semibold' }), { color: t.colors.text, flex: 1 }, styles.title]}>
                    {m.title}
                  </Text>
                  {showBadge ? <OnDeviceBadge size="sm" state={memo.status} provider={memo.provider} locality={memo.locality} /> : null}
                </View>
                <Text style={[typeStyle(t, z.body), { color: t.colors.textSecondary }, styles.summary]}>{m.summary}</Text>
              </View>
            )}

            {m.actions.length ? (
              <View style={{ gap: 2, paddingTop: 10, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }}>
                <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary, paddingBottom: 4 }]}>{`${labels.todos} · ${picked.length}/${m.actions.length}`}</Text>
                {m.actions.map((a, i) => {
                  const on = !off[i]
                  const toggle = () => setOff((o) => ({ ...o, [i]: on }))
                  if (renderAction) return <View key={`${a.text}-${i}`}>{renderAction({ action: a, index: i, checked: on, toggle })}</View>
                  return <TodoRow key={`${a.text}-${i}`} action={a} on={on} toggle={toggle} z={z} icons={icons} styles={styles} />
                })}
              </View>
            ) : renderEmpty ? (
              renderEmpty(m)
            ) : (
              <Text style={[meta, { color: t.colors.textTertiary }]}>{labels.none}</Text>
            )}

            {m.actions.length && onAdd ? (
              <View style={styles.footer}>
                {renderAdd ? (
                  renderAdd({ picked, memo: m, added, add })
                ) : (
                  <Button
                    variant={added ? 'soft' : 'solid'}
                    size={z.key}
                    block
                    icon={added && icons.added !== null ? (icons.added ?? Check) : undefined}
                    title={added ? labels.added : picked.length === m.actions.length ? labels.add : fill(labels.addSome, picked.length)}
                    disabled={!picked.length || added}
                    onPress={add}
                  />
                )}
              </View>
            ) : null}
          </Surface>
        </Animated.View>
      ) : null}
    </View>
  )
}

/** One to-do: a tick in the variant (a keycap, a sweet, a chrome cap) and the words. */
function TodoRow({ action, on, toggle, z, icons, styles }: { action: MemoAction; on: boolean; toggle: () => void; z: (typeof sizes)[Size]; icons: Partial<VoiceMemoIcons>; styles: Partial<VoiceMemoStyles> }) {
  const t = useTheme()
  const s = useSkin()
  const r = Math.max(8, s.radius.control)
  // Glass ticks are tinted glass keys (a frosted tile would vanish on paper); the other expressive looks use their tile.
  const wells = skinHasWells(s.skin) && s.skin !== 'glass'
  const box = Math.round(z.check * (wells ? 1 : 0.86))
  const ink = wells ? s.tile.ink : s.skin === 'glass' ? s.primary.fg : s.onTint
  const check = renderIcon(icons.check, Check, { size: Math.round(box * 0.62), strokeWidth: 2.5, color: ink })
  const tick = on ? (
    wells ? (
      <SkinTile size={box}>{check}</SkinTile>
    ) : (
      <View style={[{ width: box, height: box, borderRadius: Math.round(box * 0.3), alignItems: 'center', justifyContent: 'center', backgroundColor: s.tint }, s.skin === 'glass' ? ({ backgroundColor: s.primary.fill, borderWidth: 1, borderColor: s.primary.border, boxShadow: s.primary.shadow } as ViewStyle) : null]}>{check}</View>
    )
  ) : (
    <View style={{ width: box, height: box, borderRadius: Math.round(box * 0.3), borderWidth: s.skin === 'pop' ? 1.5 : 1.25, borderColor: s.skin === 'pop' ? s.secondary.border : t.colors.hairlineStrong, backgroundColor: s.skin === 'pop' ? s.field.fill : 'transparent' }} />
  )
  return (
    <Pressable onPress={toggle} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={action.text} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: z.row, paddingHorizontal: 8, marginHorizontal: -8, paddingVertical: 6, borderRadius: r }, styles.row]}>
      {(st) => (
        <>
          {st.pressed || (st as { hovered?: boolean }).hovered ? <SkinRowFace radius={r} /> : null}
          <View style={{ width: z.check, alignItems: 'center' }}>{tick}</View>
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text style={[typeStyle(t, z.body), { color: on ? t.colors.text : t.colors.textTertiary, textDecorationLine: on ? 'none' : 'line-through' }, styles.rowText]}>{action.text}</Text>
            {action.due ? <Text style={[typeStyle(t, z.meta), { color: t.colors.textTertiary }]}>{action.due}</Text> : null}
          </View>
        </>
      )}
    </Pressable>
  )
}

export default VoiceMemo
