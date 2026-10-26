import { mockScript } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { Summarize } from './summarize'
import { longDocument, sampleSummaryBullets, sampleSummaryOneLine, sampleSummaryParagraph, sampleThread } from './sample-data'

const byLength = { oneLine: sampleSummaryOneLine, bullets: sampleSummaryBullets, paragraph: sampleSummaryParagraph } as const

export default definePlayground({
  name: 'summarize',
  title: 'Summarize',
  category: 'text',
  description: 'A TL;DR for long text. Card, inline link, sheet or tooltip. Streams, and map-reduces input that does not fit the on-device context.',
  component: Summarize,
  controls: {
    presentation: select(['card', 'inline', 'sheet', 'tooltip'], 'card', 'Presentation'),
    length: select(['oneLine', 'bullets', 'paragraph'], 'bullets', 'Length'),
    style: select(['plain', 'quote', 'highlighted'], 'plain', 'Style'),
    title: text('TL;DR', 'Title'),
    showBadge: boolean(true, 'Badge'),
    collapsed: boolean(false, 'Collapsed'),
  },
  variantKeys: ['presentation', 'length', 'style'],
  states: {
    idle: { props: { autoRun: false } },
    thinking: { script: mockScript.thinking(60_000) },
    streaming: { script: mockScript.thinking(300).stream(sampleSummaryBullets, 40), freezeAt: 1600 },
    done: { script: mockScript.thinking(200).stream(sampleSummaryBullets, 400), freezeAt: 3000 },
    long: {
      script: (call) => (call.callIndex < 6 ? mockScript.thinking(500).text('- note from part ' + (call.callIndex + 1)) : mockScript.thinking(300).stream(sampleSummaryBullets, 40)),
      props: { text: longDocument, maxInputTokens: 120 },
      description: 'Long input: map-reduce with progress.',
    },
    error: { script: mockScript.error('context-overflow') },
    refusal: { script: mockScript.refusal() },
    unavailable: { availability: { status: 'unavailable', reason: 'not-enabled' } },
    preparing: { availability: { status: 'preparing', provider: 'llama', progress: 0.62 } },
  },
  review: ['thinking', 'streaming', 'done', 'refusal'],
  frame: { width: 380, padding: 20, background: 'bg' },
  render: (p, ctx) => {
    const length = (p.length ?? 'bullets') as keyof typeof byLength
    const script = ctx.stateDef.script
    const scriptedLength = typeof script === 'function' ? undefined : length
    return <Summarize {...(p as object)} text={(p.text as string) ?? sampleThread} length={length} key={scriptedLength} />
  },
})
