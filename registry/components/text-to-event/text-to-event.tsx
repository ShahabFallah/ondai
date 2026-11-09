import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Pressable, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Ban, CalendarCheck, CalendarDays, CalendarPlus, CircleAlert, Clock, Heading, MapPin, Pencil, RefreshCw, RotateCcw, Users } from 'lucide-react-native'
import { availabilityCopy, useLocalModel } from '@ondai/core'
import type { FontSizeKey, SkinInput } from '@ondai/tokens'
import { hairlineWidth, renderIcon, SkinProvider, typeStyle, useMotion, useSkin, useTheme, type IconInput, type IconProps } from '@ondai/tokens/react'
import { Button } from '../button/button'
import { Chip } from '../chip/chip'
import { Field } from '../field/field'
import { ModelDownload } from '../model-download/model-download'
import { OnDeviceBadge } from '../on-device-badge/on-device-badge'
import { ShimmerText } from '../shimmer-text/shimmer-text'
import { Skeleton } from '../skeleton/skeleton'
import { SkinTile, skinHasWells, Surface } from '../surface/surface'
import { eventFieldNames, toLocalDate, useTextToEvent, type CalendarEvent, type EventDraft, type EventFieldName, type UseTextToEventOptions } from './use-text-to-event'

/** Every icon TextToEvent draws. Pass a lucide icon (sized and coloured for you), an element, or `null` to hide it. */
export interface TextToEventIcons {
  /** The tile in the header and the find key. */
  event: IconInput
  title: IconInput
  date: IconInput
  time: IconInput
  place: IconInput
  people: IconInput
  /** At the end of an editable row. */
  edit: IconInput
  /** On the add key once the event is added. */
  added: IconInput
  /** On the start-over key. */
  again: IconInput
  retry: IconInput
  error: IconInput
  refusal: IconInput
}

/** Every string TextToEvent shows or announces. `{field}` is replaced where it appears. */
export interface TextToEventLabels {
  heading: string
  hint: string
  placeholder: string
  /** Screen reader name for the message box. */
  inputLabel: string
  find: string
  thinking: string
  filling: string
  /** The header once fields are in. */
  found: string
  /** Under the header while a date is unclear. */
  checkDate: string
  /** Above the choices for an unclear date. */
  which: string
  title: string
  date: string
  time: string
  place: string
  people: string
  /** The time row when no time was given. */
  allDay: string
  /** A row with no value. */
  add: string
  /** After a value the model was unsure of. */
  check: string
  /** Screen reader hint on an editable row. */
  editHint: string
  addToCalendar: string
  added: string
  again: string
  noEvent: string
  noEventHint: string
  error: string
  refusal: string
  retry: string
  preparing: string
}

export interface TextToEventStyles {
  container: StyleProp<ViewStyle>
  /** The quoted message (presentation `message`). */
  bubble: StyleProp<ViewStyle>
  card: StyleProp<ViewStyle>
  row: StyleProp<ViewStyle>
  rowLabel: StyleProp<TextStyle>
  rowValue: StyleProp<TextStyle>
  actions: StyleProp<ViewStyle>
}

export const textToEventLabels: TextToEventLabels = {
  heading: 'Make it an event',
  hint: 'Paste a message. It is read on this device.',
  placeholder: 'Paste or type a message…',
  inputLabel: 'Message',
  find: 'Find event',
  thinking: 'Reading the message',
  filling: 'Filling in the {field}',
  found: 'Event found',
  checkDate: 'Check the date before adding.',
  which: 'Which day did they mean?',
  title: 'Title',
  date: 'Date',
  time: 'Time',
  place: 'Place',
  people: 'People',
  allDay: 'All day',
  add: 'Add',
  check: 'check',
  editHint: 'Double tap to edit',
  addToCalendar: 'Add to calendar',
  added: 'Added',
  again: 'Start over',
  noEvent: 'No event in this message',
  noEventHint: 'Try one with a day, a time or a place.',
  error: 'Couldn’t read an event from that',
  refusal: 'The on-device model wouldn’t read this message.',
  retry: 'Try again',
  preparing: 'Getting the model ready',
}

/** What a custom row gets. */
export interface EventRowProps {
  name: EventFieldName
  label: string
  /** Formatted for display; empty when missing. */
  value: string
  /** 0 to 1. */
  confidence: number
  /** Still waiting to fill in. */
  pending: boolean
  edit: () => void
}

/** What a custom add key gets. */
export interface EventAddProps {
  event: CalendarEvent | null
  add: () => void
  added: boolean
}

export interface TextToEventProps extends UseTextToEventOptions {
  /**
   * `card`: a box to paste into, then the event below it. `message`: the message (selected text) as a bubble with a
   * key under it, for a chat or mail view.
   */
  presentation?: 'card' | 'message'
  /**
   * The look: `clean`, `minimal`, `glass`, `pop`, `candy`, `metal`, `shine` or `bevel`. Changes the box, the card,
   * the rows and the keys together. Defaults to the nearest SkinProvider.
   */
  variant?: SkinInput
  size?: 'sm' | 'md' | 'lg'
  /** Primary colour (hex) for the keys and the chosen date. Defaults to the accent. */
  tint?: string
  /** Corner radius of the box, the bubble and the card. Defaults to the variant's. */
  radius?: number
  icons?: Partial<TextToEventIcons>
  labels?: Partial<TextToEventLabels>
  styles?: Partial<TextToEventStyles>
  /** The message for presentation `message`, or the starting text of the box. */
  message?: string
  /** Read the message on mount. */
  autoRun?: boolean
  /** Called with the finished event when "Add to calendar" is pressed. Write it with expo-calendar or your API. */
  onAdd?: (event: CalendarEvent) => void | Promise<void>
  /** Let rows be tapped and edited (default true). */
  editable?: boolean
  /** Ms between fields filling in (default 240). 0 fills them at once; so does reduced motion. */
  revealInterval?: number
  /** `12h` (default) or `24h`. */
  clock?: '12h' | '24h'
  /** Write a date your way. Defaults to "Fri 13 Nov". */
  formatDate?: (date: Date) => string
  /** Write a time your way. */
  formatTime?: (date: Date) => string
  /** Draw a row yourself. */
  renderRow?: (props: EventRowProps) => ReactNode
  /** Draw the add key yourself. */
  renderAdd?: (props: EventAddProps) => ReactNode
  showBadge?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

type Size = NonNullable<TextToEventProps['size']>
const sizes: Record<Size, { text: FontSizeKey; title: FontSizeKey; labelW: number; key: 'sm' | 'md' | 'lg'; tile: number; pad: number; row: number; icon: number }> = {
  sm: { text: 'sm', title: 'md', labelW: 64, key: 'sm', tile: 26, pad: 12, row: 36, icon: 15 },
  md: { text: 'sm', title: 'md', labelW: 72, key: 'sm', tile: 30, pad: 14, row: 40, icon: 16 },
  lg: { text: 'md', title: 'lg', labelW: 84, key: 'md', tile: 34, pad: 18, row: 46, icon: 18 },
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const defaultDate = (d: Date) => `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`
const defaultTime = (clock: '12h' | '24h') => (d: Date) => {
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  return clock === '24h' ? `${String(h).padStart(2, '0')}:${m}` : `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`
}
const fillIn = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
/** A key icon: the override, else the default. Components are coloured by the key, so they follow the variant. */
const keyIcon = (override: IconInput | undefined, fallback: ComponentType<IconProps>) => (override === null ? undefined : (override ?? fallback))
const rowIcons: Record<EventFieldName, ComponentType<IconProps>> = { title: Heading, date: CalendarDays, time: Clock, place: MapPin, people: Users }

/** A message becomes a calendar event: fields fill in one by one with their confidence, stay editable, then go to the calendar. */
export function TextToEvent({ variant, tint, ...props }: TextToEventProps) {
  return (
    <SkinProvider skin={variant} tint={tint}>
      <EventCard {...props} />
    </SkinProvider>
  )
}

function EventCard({
  presentation = 'card',
  size = 'md',
  radius,
  icons = {},
  labels: labelsProp,
  styles = {},
  message,
  autoRun = false,
  onAdd,
  editable = true,
  revealInterval = 240,
  clock = '12h',
  formatDate = defaultDate,
  formatTime,
  renderRow,
  renderAdd,
  showBadge = true,
  style,
  testID,
  ...hookOptions
}: Omit<TextToEventProps, 'variant' | 'tint'>) {
  const t = useTheme()
  const s = useSkin()
  const motion = useMotion()
  const z = sizes[size]
  const labels: TextToEventLabels = { ...textToEventLabels, ...labelsProp }
  const ev = useTextToEvent(hookOptions)
  const model = useLocalModel('text')
  const [text, setText] = useState(message ?? '')
  const [asked, setAsked] = useState(false)
  const [revealed, setRevealed] = useState(0)
  const [editing, setEditing] = useState<EventFieldName | null>(null)
  const [added, setAdded] = useState(false)
  const ran = useRef(false)
  const time = formatTime ?? defaultTime(clock)
  const r = radius ?? (s.skin === 'clean' ? t.radii.lg : s.radius.container - 4)
  const wells = skinHasWells(s.skin)
  const unavailable = !!model.availability && model.availability.status !== 'ready'
  const busy = ev.phase === 'extract'

  useEffect(() => {
    if (message !== undefined) setText(message)
  }, [message])
  const run = (value = text) => {
    if (!value.trim()) return
    setAsked(true)
    setAdded(false)
    setEditing(null)
    void ev.run(value).catch(() => {})
  }
  useEffect(() => {
    if (!autoRun || ran.current || !model.isReady || !(message ?? text).trim()) return
    ran.current = true
    run(message ?? text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, model.isReady])

  // Fill the fields in one at a time once the event is read.
  const instant = !motion.enabled || revealInterval <= 0
  useEffect(() => {
    if (ev.phase !== 'done') {
      setRevealed(0)
      return
    }
    if (instant) {
      setRevealed(eventFieldNames.length)
      return
    }
    setRevealed(1)
    let n = 1
    const id = setInterval(() => {
      n += 1
      setRevealed(n)
      void Haptics.selectionAsync().catch(() => {})
      if (n >= eventFieldNames.length) clearInterval(id)
    }, revealInterval)
    return () => clearInterval(id)
  }, [ev.phase, ev.source, instant, revealInterval])
  const filling = ev.phase === 'done' && revealed < eventFieldNames.length
  const done = ev.phase === 'done' && !filling
  useEffect(() => {
    if (done) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [done])

  const startOver = () => {
    ev.reset()
    setAsked(false)
    setAdded(false)
    setEditing(null)
    if (presentation === 'card') setText('')
  }
  const add = async () => {
    if (!ev.event || added) return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    await onAdd?.(ev.event)
    setAdded(true)
  }

  const sm = typeStyle(t, z.text)
  const fade = motion.enabled ? FadeIn.duration(180) : undefined
  const quiet = { size: z.icon, strokeWidth: 1.75, color: t.colors.textTertiary }
  const draft: EventDraft = ev.draft ?? { title: '', people: [] }
  const dateInfo = ev.fields.date
  const ambiguous = done && !!dateInfo.candidates?.length && dateInfo.confidence < 0.7
  const low = (name: EventFieldName) => ev.fields[name].confidence < 0.7

  const display = (name: EventFieldName): string => {
    if (name === 'title') return draft.title
    if (name === 'date') return draft.date ? formatDate(toLocalDate(draft.date)) : (ev.fields.date.raw ?? '')
    if (name === 'time') return draft.time ? time(toLocalDate('2000-01-01', draft.time)) : (ev.fields.time.raw ?? (draft.date ? labels.allDay : ''))
    if (name === 'place') return draft.place ?? ''
    return draft.people.join(', ')
  }
  const editValue = (name: EventFieldName) => (name === 'date' ? (draft.date ? formatDate(toLocalDate(draft.date)) : '') : name === 'time' ? (draft.time ? time(toLocalDate('2000-01-01', draft.time)) : '') : display(name))

  // Header: a tile in the variant and a sentence for where it is.
  const tileIcon = renderIcon(icons.event, done || added ? CalendarCheck : CalendarPlus, { size: Math.round(z.tile * 0.52), strokeWidth: 1.75, color: wells ? s.tile.ink : t.colors.text })
  const header = (title: string, sub?: string, subColor?: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {tileIcon ? wells ? <SkinTile size={z.tile}>{tileIcon}</SkinTile> : <View style={{ width: z.tile, height: z.tile, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.muted }}>{tileIcon}</View> : null}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[typeStyle(t, z.title, { weight: 'semibold' }), { color: t.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={[typeStyle(t, 'xs'), { color: subColor ?? t.colors.textTertiary }]} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  )

  const rows = (
    <View>
      {eventFieldNames.map((name, i) => {
        const pending = !(ev.phase === 'done' && i < revealed)
        const value = pending ? '' : display(name)
        const conf = ev.fields[name].confidence
        const label = labels[name]
        const edit = () => editable && !pending && !added && setEditing(name)
        if (renderRow) return <View key={name}>{renderRow({ name, label, value, confidence: conf, pending, edit })}</View>
        const warn = !pending && !!value && low(name) && !(name === 'time' && !draft.time && !ev.fields.time.raw)
        const icon = renderIcon(icons[name], rowIcons[name], { ...quiet, color: warn ? t.colors.warning : t.colors.textTertiary })
        const isEditing = editing === name
        return (
          <View key={name} style={{ borderTopWidth: i ? hairlineWidth : 0, borderTopColor: t.colors.hairline }}>
            <Pressable
              onPress={edit}
              disabled={!editable || pending || added || isEditing}
              accessibilityRole={editable && !pending ? 'button' : undefined}
              accessibilityLabel={`${label}: ${value || labels.add}`}
              accessibilityHint={editable && !pending ? labels.editHint : undefined}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: z.row, paddingVertical: 6, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 8 },
                warn && name === 'date' ? { backgroundColor: t.colors.warningSoft } : null,
                pressed ? { backgroundColor: s.rowHover } : null,
                styles.row,
              ]}
            >
              {icon ? <View style={{ width: z.icon, alignItems: 'center' }}>{icon}</View> : null}
              <Text style={[sm, { color: t.colors.textSecondary, width: z.labelW }, styles.rowLabel]} numberOfLines={1}>
                {label}
              </Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                {pending ? (
                  <Skeleton width={name === 'title' ? '78%' : name === 'people' ? '44%' : '58%'} height={10} radius={5} shimmer={busy || filling} />
                ) : isEditing ? (
                  <TextInput
                    autoFocus
                    defaultValue={editValue(name)}
                    onSubmitEditing={(e) => (ev.set(name, e.nativeEvent.text), setEditing(null))}
                    onEndEditing={(e) => (ev.set(name, e.nativeEvent.text), setEditing(null))}
                    returnKeyType="done"
                    accessibilityLabel={label}
                    placeholder={labels[name]}
                    placeholderTextColor={t.colors.textTertiary}
                    selectionColor={s.tint}
                    style={[sm, { color: t.colors.text, padding: 0, outlineStyle: 'none' } as never]}
                  />
                ) : (
                  <Animated.View entering={fade}>
                    <Text style={[sm, { color: value ? (warn ? t.colors.warning : t.colors.text) : t.colors.textTertiary, fontWeight: name === 'title' && value ? '600' : undefined }, styles.rowValue]} numberOfLines={2}>
                      {value || labels.add}
                      {warn ? <Text style={[typeStyle(t, 'xs'), { color: t.colors.warning }]}>{`  ${labels.check}`}</Text> : null}
                    </Text>
                  </Animated.View>
                )}
              </View>
              {editable && !pending && !isEditing && !added ? renderIcon(icons.edit, Pencil, { size: 13, strokeWidth: 1.75, color: t.colors.textTertiary }) : null}
            </Pressable>
            {name === 'date' && ambiguous && !pending ? (
              <Animated.View entering={motion.enabled ? FadeInDown.duration(200) : undefined} style={{ gap: 8, paddingTop: 4, paddingBottom: 10, paddingLeft: z.icon + 10 }}>
                <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textSecondary }]}>{labels.which}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {dateInfo.candidates!.map((day) => (
                    <Chip key={day} size="sm" label={formatDate(toLocalDate(day))} selected={draft.date === day} variant="outline" onPress={() => (void Haptics.selectionAsync().catch(() => {}), ev.choose(day))} />
                  ))}
                </View>
              </Animated.View>
            ) : null}
          </View>
        )
      })}
    </View>
  )

  const addProps: EventAddProps = { event: ev.event, add: () => void add(), added }
  const addKey = renderAdd ? (
    renderAdd(addProps)
  ) : (
    <Button
      title={added ? labels.added : labels.addToCalendar}
      variant="solid"
      size={z.key}
      icon={added ? keyIcon(icons.added, CalendarCheck) : keyIcon(icons.event, CalendarPlus)}
      onPress={() => void add()}
      disabled={!done || !ev.event || added || ambiguous}
      testID={testID ? `${testID}-add` : undefined}
    />
  )

  const badge = showBadge ? <OnDeviceBadge size="sm" state={busy ? 'thinking' : ev.status} provider={ev.provider} locality={ev.locality as never} /> : null
  const fieldName = labels[eventFieldNames[Math.min(revealed, eventFieldNames.length - 1)]!].toLowerCase()

  const result =
    busy || ev.phase === 'done' ? (
      <Animated.View entering={fade}>
        <Surface elevation="floating" radius={r} style={[{ padding: z.pad, gap: 10 }, styles.card]}>
          {busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: z.tile }} accessibilityLiveRegion="polite">
              <ShimmerText size="sm" weight="regular">
                {labels.thinking}
              </ShimmerText>
            </View>
          ) : filling ? (
            <View style={{ minHeight: z.tile, justifyContent: 'center' }} accessibilityLiveRegion="polite">
              <ShimmerText size="sm" weight="regular">
                {fillIn(labels.filling, { field: fieldName })}
              </ShimmerText>
            </View>
          ) : (
            header(added ? labels.added : labels.found, ambiguous ? labels.checkDate : undefined, ambiguous ? t.colors.warning : undefined)
          )}
          {rows}
          {done ? (
            <View style={[{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 10, borderTopWidth: hairlineWidth, borderTopColor: t.colors.hairline }, styles.actions]}>
              <Button title={labels.again} variant="ghost" size={z.key} icon={keyIcon(icons.again, RotateCcw)} onPress={startOver} />
              {addKey}
            </View>
          ) : null}
        </Surface>
      </Animated.View>
    ) : null

  const refusal = ev.error?.kind === 'refusal'
  const problem =
    !busy && (ev.phase === 'error' || ev.phase === 'empty') ? (
      <Animated.View entering={fade} style={{ gap: 6, paddingHorizontal: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {renderIcon(refusal ? icons.refusal : icons.error, refusal ? Ban : CircleAlert, { size: 16, strokeWidth: 1.75, color: ev.phase === 'empty' || refusal ? t.colors.textTertiary : t.colors.danger })}
          <Text style={[sm, { flex: 1, color: ev.phase === 'empty' || refusal ? t.colors.textSecondary : t.colors.danger }]}>{ev.phase === 'empty' ? labels.noEvent : refusal ? labels.refusal : labels.error}</Text>
        </View>
        {ev.phase === 'empty' || (!refusal && ev.error?.message) ? (
          <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary, marginLeft: 24 }]} numberOfLines={2}>
            {ev.phase === 'empty' ? labels.noEventHint : ev.error?.message}
          </Text>
        ) : null}
        {ev.phase === 'error' && !refusal ? (
          <View style={{ flexDirection: 'row', marginLeft: 16 }}>
            <Button title={labels.retry} variant="ghost" size="sm" icon={keyIcon(icons.retry, RefreshCw)} onPress={() => run(ev.source || text)} />
          </View>
        ) : null}
      </Animated.View>
    ) : null

  const gate = unavailable && model.availability ? (
    model.availability.status === 'preparing' ? (
      <ModelDownload progress={model.availability.progress} variant="bar" size="sm" label={labels.preparing} />
    ) : (
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <Text style={[sm, { color: t.colors.text }]}>{availabilityCopy(model.availability).title}</Text>
        <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>{availabilityCopy(model.availability).description}</Text>
      </View>
    )
  ) : null

  const findKey = <Button title={labels.find} variant="solid" size={z.key} icon={keyIcon(icons.event, CalendarPlus)} onPress={() => run()} disabled={busy || unavailable || !text.trim()} />
  const showInput = !asked || ev.phase === 'error' || ev.phase === 'empty'

  if (presentation === 'message') {
    return (
      <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
        <Surface elevation="inset" radius={r} style={[{ padding: z.pad - 2, alignSelf: 'flex-start', maxWidth: '92%' }, styles.bubble]}>
          <Text style={[typeStyle(t, z.text === 'sm' ? 'md' : 'lg'), { color: t.colors.text }]}>{message ?? text}</Text>
        </Surface>
        {gate}
        {!asked && !gate ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {findKey}
            {badge}
          </View>
        ) : null}
        {result}
        {problem}
        {asked ? badge : null}
      </View>
    )
  }

  return (
    <View style={[{ gap: 12 }, style, styles.container]} testID={testID}>
      {showInput ? (
        <Surface radius={r} style={{ padding: z.pad, gap: 12 }}>
          {header(labels.heading, labels.hint)}
          <Field
            value={text}
            onChangeText={setText}
            placeholder={labels.placeholder}
            accessibilityLabel={labels.inputLabel}
            multiline
            state={busy ? 'thinking' : 'idle'}
            editable={!busy}
            onSubmitEditing={() => run()}
          />
          {gate}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {badge ?? <View />}
            {findKey}
          </View>
        </Surface>
      ) : (
        <Pressable onPress={busy ? undefined : startOver} accessibilityRole="button" accessibilityLabel={labels.again} style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4 }}>
          <View style={{ width: 2, borderRadius: 1, backgroundColor: t.colors.hairlineStrong }} />
          <Text style={[sm, { flex: 1, color: t.colors.textSecondary }]} numberOfLines={2}>
            {ev.source || text}
          </Text>
        </Pressable>
      )}
      {result}
      {problem}
      {asked && !showInput ? badge : null}
    </View>
  )
}

export default TextToEvent
