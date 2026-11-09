import { Text, View } from 'react-native'
import { CalendarClock, CalendarHeart, CalendarSearch, Contact, Navigation, Type } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { TextToEvent, type EventRowProps, type TextToEventIcons, type TextToEventLabels } from './text-to-event'
import { ambiguousNow, groupAnswer, groupMessage, noEventMessage, sampleAnswer, sampleMessage, sampleNow } from './sample-data'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<TextToEventIcons>> = {
  default: {},
  alternate: { event: CalendarHeart, title: Type, date: CalendarSearch, time: CalendarClock, place: Navigation, people: Contact },
  none: { event: null, title: null, date: null, time: null, place: null, people: null, edit: null },
}

const giorni = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

const copy: Record<string, { labels: Partial<TextToEventLabels>; formatDate?: (d: Date) => string }> = {
  default: { labels: {} },
  terse: { labels: { heading: 'New event', hint: 'On device.', find: 'Find', thinking: 'Reading', found: 'Got it', addToCalendar: 'Add', again: 'Redo', which: 'Which day?', check: '?' } },
  italiano: {
    labels: {
      heading: 'Crea un evento',
      hint: 'Incolla un messaggio. Viene letto su questo dispositivo.',
      placeholder: 'Incolla o scrivi un messaggio…',
      inputLabel: 'Messaggio',
      find: 'Trova evento',
      thinking: 'Leggo il messaggio',
      filling: 'Compilo {field}',
      found: 'Evento trovato',
      checkDate: 'Controlla la data prima di aggiungere.',
      which: 'Quale giorno intendevano?',
      title: 'Titolo',
      date: 'Data',
      time: 'Ora',
      place: 'Luogo',
      people: 'Persone',
      allDay: 'Tutto il giorno',
      add: 'Aggiungi',
      check: 'da controllare',
      addToCalendar: 'Aggiungi al calendario',
      added: 'Aggiunto',
      again: 'Ricomincia',
      noEvent: 'Nessun evento in questo messaggio',
      noEventHint: 'Prova con un giorno, un’ora o un luogo.',
      error: 'Non riesco a leggere un evento',
      refusal: 'Il modello sul dispositivo non ha voluto leggere questo messaggio.',
      retry: 'Riprova',
      preparing: 'Preparo il modello',
    },
    formatDate: (d) => `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`,
  },
}

/** A row drawn by the app, through `renderRow`: label above value. */
function StackedRow({ label, value, confidence, pending }: EventRowProps) {
  const t = useTheme()
  return (
    <View style={{ paddingVertical: 6, gap: 1 }}>
      <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>{label}</Text>
      <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { color: pending ? t.colors.textTertiary : confidence < 0.7 ? t.colors.warning : t.colors.text }]}>{pending ? '…' : value || '—'}</Text>
    </View>
  )
}

const read = mockScript.thinking(700).object(sampleAnswer)

export default definePlayground({
  name: 'text-to-event',
  title: 'TextToEvent',
  category: 'organize',
  description: '"Dinner with Sara next Friday 8pm at Nonna’s" becomes a calendar event: the fields fill in one by one with their confidence, an unclear date asks which day, and every row stays editable.',
  component: TextToEvent,
  controls: {
    variant: select(skinNames, 'bevel', 'Variant'),
    presentation: select(['card', 'message'], 'card', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    clock: select(['12h', '24h'], '12h', 'Clock'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    showBadge: boolean(true, 'Badge'),
    editable: boolean(true, 'Editable rows'),
    stacked: boolean(false, 'Stacked rows (renderRow)'),
  },
  variantKeys: ['variant', 'presentation', 'size'],
  states: {
    idle: { script: read, props: { message: sampleMessage }, description: 'A pasted message and the find key.' },
    thinking: { script: mockScript.thinking(60_000), props: { message: sampleMessage, autoRun: true } },
    filling: { script: read, props: { message: sampleMessage, autoRun: true, revealInterval: 1400 }, freezeAt: 2600, description: 'The fields fill in one at a time; the rest wait as quiet bars.' },
    done: { script: read, props: { message: sampleMessage, autoRun: true, revealInterval: 140 }, freezeAt: 2000, description: 'Said on a Saturday, "next Friday" can only be the 13th. "8pm" → 8:00 PM.' },
    ambiguous: {
      script: read,
      props: { message: sampleMessage, autoRun: true, revealInterval: 140, now: ambiguousNow },
      freezeAt: 2000,
      description: 'Said on a Monday, "next Friday" could be the 13th or the 20th: the date is highlighted and the add key waits for a choice.',
    },
    'two-days': { script: mockScript.thinking(700).object(groupAnswer), props: { message: groupMessage, autoRun: true, revealInterval: 140 }, freezeAt: 2000, description: '"Thursday or Friday" offers both days.' },
    'from-message': { script: read, props: { message: sampleMessage, autoRun: true, presentation: 'message', revealInterval: 140 }, freezeAt: 2000, description: 'Presentation `message`: the selected message as a bubble, the event under it.' },
    'no-event': { script: mockScript.thinking(500).object({}), props: { message: noEventMessage, autoRun: true } },
    error: { script: mockScript.error('invalid-output'), props: { message: sampleMessage, autoRun: true } },
    refusal: { script: mockScript.refusal(), props: { message: sampleMessage, autoRun: true } },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' }, props: { message: sampleMessage } },
    preparing: { availability: { status: 'preparing', provider: 'llama', progress: 0.62 }, props: { message: sampleMessage } },
  },
  review: ['idle', 'thinking', 'filling', 'done', 'ambiguous'],
  frame: { width: 390, padding: 20, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, stacked, ...rest } = p as typeof p & Record<string, unknown>
    const set = copy[labels as string] ?? copy.default!
    return (
      <TextToEvent
        now={sampleNow}
        {...(rest as object)}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={set.labels}
        formatDate={set.formatDate}
        renderRow={stacked ? (r) => <StackedRow {...r} /> : undefined}
        onAdd={() => {}}
      />
    )
  },
})
