import { Text, View } from 'react-native'
import { CircleCheck, ListPlus, Undo2 } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { VoiceMemo, type VoiceMemoIcons, type VoiceMemoLabels } from './voice-memo'

const transcript =
  'Okay, notes from the venue call. They can do Friday at noon for thirty people. I need to send Sam the deposit form by Wednesday, and Priya should bring the revised budget printout. Also remind me to book the projector.'

const memo = {
  title: 'Venue call for Friday',
  summary: 'The venue can host thirty people on Friday at noon. A deposit form and the revised budget are still outstanding.',
  actions: [
    { text: 'Send Sam the deposit form', due: 'by Wednesday' },
    { text: 'Ask Priya to bring the revised budget printout' },
    { text: 'Book the projector' },
  ],
}

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<VoiceMemoIcons>> = {
  default: {},
  alternate: { check: CircleCheck, added: ListPlus, retry: Undo2 },
  none: { added: null, retry: null },
}

const copy: Record<string, Partial<VoiceMemoLabels>> = {
  default: {},
  terse: { record: 'Talk. I’ll find the tasks.', reading: 'Reading', todos: 'Tasks', add: 'Add all', addSome: 'Add {count}', added: 'Done', none: 'Nothing to do.' },
  italiano: {
    record: 'Tocca e parla. Trovo io le cose da fare.',
    reading: 'Cerco le cose da fare',
    todos: 'Da fare',
    add: 'Aggiungi ai Promemoria',
    addSome: 'Aggiungi {count} ai Promemoria',
    added: 'Aggiunte',
    none: 'Niente da fare qui.',
    error: 'Non riesco a leggere il memo.',
    retry: 'Riprova',
  },
}

/** A custom empty state, through `renderEmpty`. */
function NoTodos() {
  const t = useTheme()
  return (
    <View style={{ paddingVertical: 10, alignItems: 'center' }}>
      <Text style={[typeStyle(t, 'sm'), { color: t.colors.textTertiary }]}>Just notes this time. Nothing to add.</Text>
    </View>
  )
}

export default definePlayground({
  name: 'voice-memo',
  title: 'VoiceMemo',
  category: 'voice',
  description: 'Talk, and get the memo back as something to act on: a title, a two-line summary and the to-dos you mentioned, ticked and ready to add.',
  component: VoiceMemo,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '12', '18', '28'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    addLabel: text('Add to Reminders', 'Add label'),
    showBadge: boolean(true, 'Badge'),
    customEmpty: boolean(false, 'Custom empty (renderEmpty)'),
  },
  variantKeys: ['variant', 'size'],
  states: {
    record: { description: 'Tap and talk.' },
    reading: { script: mockScript.thinking(60_000), props: { transcript } },
    done: { script: mockScript.thinking(300).object(memo), props: { transcript }, freezeAt: 1200 },
    'some-off': { script: mockScript.thinking(300).object(memo), props: { transcript, initialOff: [1] }, freezeAt: 1200, description: 'Untick a to-do and the key counts what is left.' },
    empty: { script: mockScript.thinking(300).object({ ...memo, actions: [] }), props: { transcript }, freezeAt: 1200, description: 'A memo with nothing to do.' },
    refusal: { script: mockScript.refusal(), props: { transcript } },
  },
  review: ['record', 'done'],
  frame: { width: 390, padding: 16, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, addLabel, customEmpty, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <VoiceMemo
        {...(rest as object)}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        // The add label only overrides the copy set once it is changed.
        addLabel={addLabel !== 'Add to Reminders' ? (addLabel as string) : undefined}
        renderEmpty={customEmpty ? () => <NoTodos /> : undefined}
        onAdd={() => {}}
      />
    )
  },
})
