import { Text, View } from 'react-native'
import { CircleCheck, ClipboardCopy, Hash, RefreshCcw, ScrollText, TextQuote } from 'lucide-react-native'
import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { skinNames } from '@ondai/tokens'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { Summarize, type SummarizeIcons, type SummarizeLabels, type SummaryBulletProps } from './summarize'
import { longDocument, sampleSummaryBullets, sampleSummaryOneLine, sampleSummaryParagraph, sampleThread } from './sample-data'

type Length = 'oneLine' | 'bullets' | 'paragraph'
export const summaryByLength: Record<Length, string> = { oneLine: sampleSummaryOneLine, bullets: sampleSummaryBullets, paragraph: sampleSummaryParagraph }

/** The scripted summary in the length the component asked for, so the Length control shows its own shape. */
const byLength = (call: { system?: string }): string => {
  const sys = (call.system ?? '').toLowerCase()
  return sys.includes('one plain sentence') ? sampleSummaryOneLine : sys.includes('paragraph') ? sampleSummaryParagraph : sampleSummaryBullets
}

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<SummarizeIcons>> = {
  default: {},
  alternate: { title: ScrollText, run: TextQuote, copy: ClipboardCopy, copied: CircleCheck, again: RefreshCcw, bullet: Hash },
  none: { title: null, run: null, toggle: null, bullet: null, copy: null, copied: null, again: null, retry: null },
}

const copy: Record<string, Partial<SummarizeLabels>> = {
  default: {},
  terse: { title: 'Gist', run: 'Sum up', thinking: 'Reading', idle: 'The short version, on device.', copy: 'Copy', again: 'Redo', retry: 'Retry' },
  italiano: {
    title: 'Riassunto',
    run: 'Riassumi',
    thinking: 'Sto leggendo il thread',
    reading: 'Leggo la parte {part} di {total}',
    idle: 'Il succo in poche righe, sul dispositivo.',
    retry: 'Riprova',
    copy: 'Copia',
    copied: 'Copiato',
    again: 'Riassumi di nuovo',
    preparing: 'Preparo il modello',
    tokens: '{count} token',
  },
}

/** A numbered row through the `renderBullet` slot. */
function NumberedRow({ text: row, index }: SummaryBulletProps) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Text style={[typeStyle(t, 'md', { weight: 'medium' }), { width: 18, color: t.colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{index + 1}</Text>
      <Text style={[typeStyle(t, 'md'), { flex: 1, color: t.colors.text }]}>{row}</Text>
    </View>
  )
}

/** The content the summary refers to, for the inline, sheet and tooltip layouts. */
function Message() {
  const t = useTheme()
  return (
    <View style={{ gap: 4 }}>
      <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text }]}>Alex · Friday plans</Text>
      <Text numberOfLines={3} style={[typeStyle(t, 'sm'), { color: t.colors.textSecondary }]}>
        {sampleThread}
      </Text>
    </View>
  )
}

export default definePlayground({
  name: 'summarize',
  title: 'Summarize',
  category: 'text',
  description: 'The gist of long text. Card, inline link, sheet or tooltip. Streams, and map-reduces input that does not fit the on-device context.',
  component: Summarize,
  controls: {
    variant: select(skinNames, 'clean', 'Variant'),
    presentation: select(['card', 'inline', 'sheet', 'tooltip'], 'card', 'Presentation'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    length: select(['oneLine', 'bullets', 'paragraph'], 'bullets', 'Length'),
    emphasis: select(['plain', 'quote', 'highlighted'], 'plain', 'Emphasis'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    rows: select(['default', 'numbered'], 'default', 'Rows (renderBullet)'),
    title: text('Summary', 'Title'),
    showBadge: boolean(true, 'Badge'),
    showActions: boolean(true, 'Copy and again keys'),
    collapsed: boolean(false, 'Collapsed'),
  },
  variantKeys: ['variant', 'presentation', 'size', 'length', 'emphasis'],
  states: {
    idle: { props: { autoRun: false }, description: 'Before the first run: the empty state and the summarize key.' },
    thinking: { script: mockScript.thinking(60_000) },
    streaming: { script: (call) => mockScript.thinking(300).stream(byLength(call), 40), freezeAt: 1600 },
    done: { script: (call) => mockScript.thinking(200).stream(byLength(call), 400), freezeAt: 3000 },
    long: {
      script: (call) => (call.callIndex < 6 ? mockScript.thinking(500).text('- note from part ' + (call.callIndex + 1)) : mockScript.thinking(300).stream(byLength(call), 40)),
      props: { text: longDocument, maxInputTokens: 120 },
      description: 'Long input: map-reduce with progress.',
    },
    error: { script: mockScript.error('context-overflow') },
    refusal: { script: mockScript.refusal() },
    unavailable: { availability: { status: 'unavailable', reason: 'not-enabled' } },
    preparing: { availability: { status: 'preparing', provider: 'llama', progress: 0.62 } },
  },
  review: ['idle', 'thinking', 'streaming', 'done', 'refusal'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p, ctx) => {
    const { tint, radius, icons, labels, title, rows, ...rest } = p as typeof p & Record<string, unknown>
    const length = (p.length ?? 'bullets') as Length
    // Remount when the length changes so the summary runs again in the new shape.
    const scriptedLength = `${ctx.state}-${length}`
    const presentation = p.presentation as string
    return (
      <Summarize
        {...(rest as object)}
        key={scriptedLength}
        text={(p.text as string) ?? sampleThread}
        length={length}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        // The title control only speaks for itself while the copy set leaves it alone.
        title={labels === 'default' || title !== 'Summary' ? (title as string) : undefined}
        renderBullet={rows === 'numbered' ? (b) => <NumberedRow {...b} /> : undefined}
      >
        {presentation === 'card' ? undefined : <Message />}
      </Summarize>
    )
  },
})
