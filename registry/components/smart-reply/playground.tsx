import { Pressable, Text, View } from 'react-native'
import { ArrowUpLeft, MessageCircle, Reply, Shuffle } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { SmartReplyDemo } from './smart-reply.demo'
import type { SmartReplyIcons, SmartReplyItemProps, SmartReplyLabels } from './smart-reply'
import { sampleReplies } from './sample-data'

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<SmartReplyIcons>> = {
  default: {},
  alternate: { reply: MessageCircle, insert: ArrowUpLeft, accept: Reply, more: Shuffle },
  none: { reply: null, insert: null, more: null },
}

const copy: Record<string, Partial<SmartReplyLabels>> = {
  default: {},
  terse: { placeholder: 'Message', thinking: 'Thinking', thinkingOne: 'Thinking', more: 'Again', empty: 'Nothing yet.', toneNeutral: 'Plain', toneFriendly: 'Warm', toneFormal: 'Polite', toneBrief: 'Short' },
  italiano: {
    placeholder: 'Rispondi…',
    inputLabel: 'Risposta',
    thinking: 'Penso a qualche risposta',
    thinkingOne: 'Penso a una risposta',
    more: 'Altre',
    moreLabel: 'Altri suggerimenti',
    accept: 'Usa il suggerimento',
    empty: 'Niente da suggerire qui.',
    tone: 'Tono',
    toneNeutral: 'Neutro',
    toneFriendly: 'Cordiale',
    toneFormal: 'Formale',
    toneBrief: 'Breve',
  },
}

/** A reply drawn through the `renderReply` slot: a quoted line with an index. */
function QuoteReply({ text: reply, index, onPress }: SmartReplyItemProps) {
  const t = useTheme()
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, paddingHorizontal: 12 }}>
      <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{index + 1}</Text>
      <View style={{ flex: 1, borderLeftWidth: 2, borderLeftColor: t.colors.hairlineStrong, paddingLeft: 10 }}>
        <Text style={[typeStyle(t, 'sm'), { color: t.colors.text }]}>{reply}</Text>
      </View>
    </Pressable>
  )
}

export default definePlayground({
  name: 'smart-reply',
  title: 'SmartReply',
  category: 'text',
  description: 'Three reply suggestions for the last message: chips, a stack, or ghost text inside the input.',
  component: SmartReplyDemo,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['chips', 'stack', 'ghost'], 'chips', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    replyStyle: select(['default', 'quote'], 'default', 'Replies (renderReply)'),
    highlight: boolean(true, 'Highlight first'),
    tone: select(['neutral', 'friendly', 'formal', 'brief'], 'neutral', 'Tone'),
    showTone: boolean(false, 'Tone picker'),
    showBadge: boolean(true, 'Badge'),
    placeholder: text('Reply…', 'Placeholder'),
  },
  variantKeys: ['variant', 'presentation', 'size'],
  states: {
    thinking: { script: mockScript.thinking(60_000) },
    done: { script: mockScript.thinking(600).object({ replies: sampleReplies }), freezeAt: 1500 },
    empty: { script: () => mockScript.thinking(300).text(''), freezeAt: 1200, description: 'The model had nothing to suggest.' },
    typing: { script: mockScript.thinking(300).object({ replies: sampleReplies }), props: { presentation: 'ghost' }, freezeAt: 1200, description: 'Ghost text waits in the field; return or tab takes it.' },
    error: { script: mockScript.error('unknown') },
    unavailable: { availability: { status: 'unavailable', reason: 'device-not-eligible' } },
  },
  review: ['thinking', 'done', 'typing'],
  frame: { width: 380, padding: 20, background: 'surface' },
  render: (p) => {
    const { tint, radius, icons, labels, replyStyle, placeholder, tone, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <SmartReplyDemo
        {...(rest as object)}
        // The tone control sets the starting tone, so the run restarts with it.
        key={tone as string}
        tone={tone as never}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        placeholder={labels === 'default' || placeholder !== 'Reply…' ? (placeholder as string) : undefined}
        renderReply={replyStyle === 'quote' ? (r) => <QuoteReply {...r} /> : undefined}
      />
    )
  },
})
