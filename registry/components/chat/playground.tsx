import { Text, View } from 'react-native'
import { Bot, CircleArrowUp, CircleStop, CornerDownLeft, Lightbulb, Paperclip } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { Chat, type ChatEmptyProps, type ChatIcons, type ChatLabels } from './chat'
import { chatSuggestions, sampleConversation, sampleReply } from './sample-data'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<ChatIcons>> = {
  default: {},
  alternate: { send: CircleArrowUp, stop: CircleStop, attach: Paperclip, avatar: Bot, suggestion: Lightbulb, suggestionGo: CornerDownLeft },
  none: { avatar: null, suggestion: null, suggestionGo: null, expand: null },
}

const copy: Record<string, Partial<ChatLabels>> = {
  default: {},
  terse: { placeholder: 'Message', emptyTitle: 'Ask away', emptyHint: 'On device.', thinking: 'Hmm', thought: '{time}', retry: 'Again' },
  italiano: {
    placeholder: 'Chiedi qualcosa',
    send: 'Invia',
    stop: 'Ferma',
    emptyTitle: 'Come posso aiutarti?',
    emptyHint: 'Gira su questo telefono. Quello che scrivi resta qui.',
    thinking: 'Ci penso',
    thought: 'Ha pensato per {time}',
    copy: 'Copia',
    copied: 'Copiato',
    retry: 'Chiedi di nuovo',
    refusal: 'Il modello sul dispositivo ha preferito non rispondere.',
  },
}
const suggestionSets: Record<string, string[]> = {
  default: chatSuggestions,
  terse: ['Lyon, Saturday', 'Reply to Priya', 'Budget notes'],
  italiano: ['Un sabato lento a Lione', 'Rispondi a Priya per venerdì', 'Cosa ho annotato sul budget?'],
}

/** `renderEmpty`: an app's own welcome, with the suggestions as plain links. */
function Welcome({ suggestions, send }: ChatEmptyProps) {
  const t = useTheme()
  return (
    <View style={{ gap: 10, alignItems: 'center', paddingBottom: 12 }}>
      <Text style={[typeStyle(t, 'lg', { weight: 'semibold' }), { color: t.colors.text }]}>Good evening, Sam</Text>
      {suggestions.slice(0, 2).map((s) => (
        <Text key={s} onPress={() => send(s)} style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary, textDecorationLine: 'underline' }]}>
          {s}
        </Text>
      ))}
    </View>
  )
}

export default definePlayground({
  name: 'chat',
  title: 'Chat',
  category: 'chat',
  description: "A complete on-device conversation: streamed turns with their trace, stop mid-reply, retry, and history trimmed to the model's context.",
  component: Chat,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    replies: select(['plain', 'card'], 'plain', 'Replies'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '12', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    placeholder: text('Ask anything', 'Placeholder'),
    showBadge: boolean(true, 'Badge'),
    customEmpty: boolean(false, 'Own welcome (renderEmpty)'),
  },
  variantKeys: ['variant', 'replies', 'size'],
  states: {
    empty: { description: 'Suggestions to start from.' },
    thinking: { script: mockScript.thinking(60_000), props: { initialPrompt: 'Plan a slow Saturday in Lyon' }, description: 'Waiting for the first word.' },
    streaming: { script: mockScript.thinking(700).stream(sampleReply, 30), props: { initialPrompt: 'Plan a slow Saturday in Lyon' }, freezeAt: 2600 },
    done: { props: { initialMessages: sampleConversation }, description: 'A finished turn: thought time, copy and retry.' },
    refusal: { script: mockScript.refusal(), props: { initialPrompt: 'Write a fake doctor’s note' } },
  },
  review: ['empty', 'streaming', 'done'],
  frame: { width: 390, height: 560, padding: 16, background: 'bg', center: false },
  render: (p) => {
    const { tint, radius, icons, labels, placeholder, customEmpty, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <View style={{ height: 528 }}>
        <Chat
          {...(rest as object)}
          tint={tints[tint as keyof typeof tints]}
          radius={radius === 'auto' ? undefined : Number(radius)}
          icons={iconSets[icons as string]}
          labels={copy[labels as string]}
          // The placeholder control only speaks for itself while the copy set leaves it alone.
          placeholder={labels === 'default' || placeholder !== 'Ask anything' ? (placeholder as string) : undefined}
          suggestions={suggestionSets[labels as string]}
          renderEmpty={customEmpty ? (e) => <Welcome {...e} /> : undefined}
          system="You are a helpful assistant inside a phone app. Be brief and concrete."
        />
      </View>
    )
  },
})
