import { Text, View } from 'react-native'
import { Bot, ChevronUp, CircleCheck, ClipboardCopy, ClipboardCheck, OctagonAlert, Plus, RefreshCw } from 'lucide-react-native'
import { boolean, definePlayground, number, select } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { AssistantMessage, UserMessage, type AssistantMessageIcons, type AssistantMessageLabels, type MessageSource } from './assistant-message'

const answer = 'You set the venue budget at €1,800 and asked Priya to bring the revised printout on Friday. The catering quote is still open.'
const steps = [
  { id: 's1', label: 'Searched your notes for “budget”', status: 'done' as const },
  { id: 's2', label: 'Read 2 messages from Priya', status: 'done' as const },
]
const sources = [
  { id: 'n1', title: 'Venue budget', detail: 'Notes' },
  { id: 'm1', title: 'Priya', detail: 'Messages, Tue' },
]

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<AssistantMessageIcons>> = {
  default: {},
  alternate: { avatar: Bot, expand: Plus, collapse: ChevronUp, stepDone: CircleCheck, error: OctagonAlert, copy: ClipboardCopy, copied: ClipboardCheck, retry: RefreshCw },
  none: { avatar: null, expand: null, collapse: null, stepDone: null, stepError: null, error: null },
}

const copy: Record<string, Partial<AssistantMessageLabels>> = {
  default: {},
  terse: { thinking: 'Hmm', thought: '{time}', stepsOne: '1 step', stepsMany: '{count}×', error: 'That broke.', copy: 'Copy', copied: 'Done', retry: 'Again' },
  italiano: { thinking: 'Ci penso', thought: 'Ha pensato per {time}', stepsOne: '1 passaggio', stepsMany: '{count} passaggi', error: 'Non sono riuscito a finire la risposta.', refusal: 'Il modello sul dispositivo ha preferito non rispondere.', copy: 'Copia', copied: 'Copiato', retry: 'Chiedi di nuovo' },
}
const question: Record<string, string> = { default: 'What did I note about the budget?', terse: 'Budget notes?', italiano: 'Cosa ho annotato sul budget?' }

/** `renderSource`: sources as a numbered footnote list instead of chips. */
function Footnote({ source, index }: { source: MessageSource; index: number }) {
  const t = useTheme()
  return (
    <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>
      {`[${index + 1}] ${source.title}${source.detail ? `, ${source.detail}` : ''}`}
    </Text>
  )
}

export default definePlayground({
  name: 'assistant-message',
  title: 'AssistantMessage',
  category: 'chat',
  description: 'One reply from the on-device model: a trace of what it did, the answer streaming in, its sources, and copy or retry. With UserMessage for the person’s turns.',
  component: AssistantMessage,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['plain', 'card'], 'plain', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '14', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    thoughtMs: number(1200, { min: 0, max: 8000, step: 100, label: 'Thought (ms)' }),
    defaultExpanded: boolean(false, 'Steps open'),
    footnotes: boolean(false, 'Footnotes (renderSource)'),
  },
  variantKeys: ['variant', 'presentation', 'size'],
  states: {
    thinking: { props: { status: 'thinking', text: '' } },
    tool: { props: { status: 'tool', text: '', steps: [{ id: 's1', label: 'Searching your notes for “budget”', status: 'running' }] }, description: 'The trace names the step that is running.' },
    streaming: { props: { status: 'streaming', text: answer.slice(0, 70), steps } },
    done: { props: { status: 'done', text: answer, steps, sources } },
    traced: { props: { status: 'done', text: answer, steps, sources, defaultExpanded: true }, description: 'The steps behind the answer, open.' },
    error: { props: { status: 'error', text: '' } },
    refusal: { props: { status: 'refusal', text: '' } },
  },
  review: ['tool', 'streaming', 'done'],
  frame: { width: 400, padding: 16, background: 'bg' },
  render: (p) => {
    const { tint, radius, icons, labels, footnotes, variant, size, ...rest } = p as typeof p & Record<string, unknown>
    const tintHex = tints[tint as keyof typeof tints]
    const r = radius === 'auto' ? undefined : Number(radius)
    return (
      <View style={{ gap: 20 }}>
        <UserMessage text={question[labels as string] ?? question.default!} variant={variant} tint={tintHex} size={size} radius={r} />
        <AssistantMessage
          {...(rest as object as { text: string })}
          variant={variant}
          size={size}
          tint={tintHex}
          radius={r}
          icons={iconSets[icons as string]}
          labels={copy[labels as string]}
          text={(rest.text as string) ?? answer}
          renderSource={footnotes ? (src, i) => <Footnote source={src} index={i} /> : undefined}
          onRetry={() => {}}
        />
      </View>
    )
  },
})
