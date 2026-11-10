import { useRef, useState, type ComponentRef, type RefObject } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { BookOpenText, CircleHelp, Link2, MessageSquareQuote, SearchX, Send, Square, TextQuote } from 'lucide-react-native'
import { mockScript, type MockCallInfo } from '@ondai/core/mock'
import { boolean, definePlayground, select, text } from '@ondai/playground'
import { alpha, skinNames } from '@ondai/tokens'
import { typeStyle, useSkin, useTheme } from '@ondai/tokens/react'
import { Surface } from '../surface/surface'
import { AskPage, type AskPageIcons, type AskPageLabels, type AskPageProps } from './ask-page'
import { NOT_IN_PAGE, type PageQuote } from './prompts'
import { longPage, sampleMissingQuestion, samplePage, samplePageTitle, sampleQuestion, sampleReply, sampleSuggestions } from './sample-data'

/** Scripted replies per question, quoting the sample page word for word. Anything else is not in the page. */
const replies: Array<[RegExp, string]> = [
  [/cat|dog|pet/i, sampleReply],
  [/rent|due/i, 'ANSWER: Rent is $1,850 a month, due on the 1st. If it arrives after the 5th, a $75 late fee is added.\nQUOTE: Rent is $1,850 a month and is due on the 1st\nQUOTE: after the 5th carry a $75 late fee\nFOLLOW: How much notice do I need to move out?\nFOLLOW: Is there parking?'],
  [/late fee/i, 'ANSWER: The late fee is $75, charged when rent arrives after the 5th of the month.\nQUOTE: Payments that arrive after the 5th carry a $75 late fee\nFOLLOW: When is rent due?'],
  [/move out|notice|leave/i, "ANSWER: Give 60 days' written notice to move out at the end of the 12-month term. Leaving early costs one month's rent.\nQUOTE: give 60 days' written notice\nQUOTE: ending the lease early costs one month's rent\nFOLLOW: How long is the lease?"],
  [/aquarium/i, 'ANSWER: Only for large tanks: aquariums over 20 gallons need written approval first.\nQUOTE: Aquariums over 20 gallons need written approval\nFOLLOW: Can I have a cat?'],
  [/park/i, 'ANSWER: Each unit gets one space in the garage. Guests park on the street.\nQUOTE: Each unit has one parking space in the garage\nFOLLOW: What are the quiet hours?'],
]
const replyFor = (call: MockCallInfo) => {
  const q = call.prompt.split('Question:').pop() ?? ''
  return replies.find(([re]) => re.test(q))?.[1] ?? NOT_IN_PAGE
}

/** Named tints for the playground; any hex works in an app. */
const tints = { accent: undefined, strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' } as const

const iconSets: Record<string, Partial<AskPageIcons>> = {
  default: {},
  alternate: { title: BookOpenText, send: Send, stop: Square, quote: TextQuote, jump: Link2, followUp: CircleHelp, notFound: SearchX },
  none: { title: null, quote: null, jump: null, followUp: null, notFound: null },
}

const copy: Record<string, Partial<AskPageLabels>> = {
  default: {},
  terse: { title: 'Ask', placeholder: 'Ask…', idle: 'From this page only.', thinking: 'Reading', quotes: 'Sources', followUps: 'Next', notFoundTitle: 'Not here', notFoundHint: 'The page does not say.', suggested: 'Try' },
  italiano: {
    title: 'Chiedi alla pagina',
    placeholder: 'Chiedi qualcosa su questa pagina…',
    idle: 'Le risposte vengono solo da questa pagina, sul dispositivo.',
    suggested: 'Prova',
    thinking: 'Leggo la pagina',
    quotes: 'Dalla pagina',
    jump: 'Vai a questo punto della pagina',
    followUps: 'Chiedi ancora',
    notFoundTitle: 'Non è in questa pagina',
    notFoundHint: 'Questa pagina non lo dice. Prova a chiederlo in un altro modo.',
    trimmed: 'Ho letto le parti pertinenti',
    retry: 'Riprova',
    preparing: 'Preparo il modello',
    send: 'Chiedi',
    stop: 'Ferma',
    inputLabel: 'Domanda su questa pagina',
  },
}

/** The page on screen: tapping a quote scrolls here and lights the quoted words. */
function PageView({ text, title, focus, scrollRef, offsets }: { text: string; title: string; focus: PageQuote | null; scrollRef: RefObject<ComponentRef<typeof ScrollView> | null>; offsets: RefObject<number[]> }) {
  const t = useTheme()
  const s = useSkin()
  const wash = /^#[0-9a-f]{6}$/i.test(s.tint) ? alpha(s.tint, s.dark ? 0.32 : 0.18) : t.colors.muted
  const paragraphs: Array<{ p: string; start: number }> = []
  for (const p of text.split('\n\n')) {
    const prev = paragraphs[paragraphs.length - 1]
    paragraphs.push({ p, start: text.indexOf(p, prev ? prev.start + prev.p.length : 0) })
  }
  return (
    <Surface elevation="inset" radius={14} style={{ padding: 0, overflow: 'hidden' }}>
      <ScrollView ref={scrollRef} focusable accessibilityLabel={title} style={{ maxHeight: 170 }} contentContainerStyle={{ padding: 14, gap: 8 }}>
        <Text style={[typeStyle(t, 'sm', { weight: 'semibold' }), { color: t.colors.text }]}>{title}</Text>
        {paragraphs.map(({ p, start }, i) => {
          const hit = focus && focus.start >= start && focus.start < start + p.length ? focus : null
          const a = hit ? hit.start - start : 0
          const b = hit ? Math.min(p.length, hit.end - start) : 0
          return (
            <Text key={i} onLayout={(e) => (offsets.current[i] = e.nativeEvent.layout.y)} style={[typeStyle(t, 'xs'), { color: t.colors.textSecondary }]}>
              {hit ? (
                <>
                  {p.slice(0, a)}
                  <Text style={{ color: t.colors.text, backgroundColor: wash, fontWeight: '600' }}>{p.slice(a, b)}</Text>
                  {p.slice(b)}
                </>
              ) : (
                p
              )}
            </Text>
          )
        })}
      </ScrollView>
    </Surface>
  )
}

/** AskPage over a scrolling page, with the jump wired to scroll and highlight. */
function AskPageDemo({ text = samplePage, ...props }: Partial<AskPageProps>) {
  const [focus, setFocus] = useState<PageQuote | null>(null)
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null)
  const offsets = useRef<number[]>([])
  const jump = (q: PageQuote) => {
    setFocus(q)
    const i = text.slice(0, q.start).split('\n\n').length - 1
    scrollRef.current?.scrollTo({ y: Math.max(0, (offsets.current[i] ?? 0) - 8), animated: true })
  }
  return (
    <AskPage {...props} text={text} pageTitle={samplePageTitle} onJump={jump} onAsk={() => setFocus(null)}>
      <PageView text={text} title={samplePageTitle} focus={focus} scrollRef={scrollRef} offsets={offsets} />
    </AskPage>
  )
}

/** `renderQuote`: a quote as a footnote line. */
function Footnote({ quote, index, onPress }: { quote: PageQuote; index: number; onPress: () => void }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <MessageSquareQuote size={13} strokeWidth={1.75} color={t.colors.textTertiary} />
      <Text onPress={onPress} style={[typeStyle(t, 'xs'), { flex: 1, color: t.colors.textTertiary }]}>{`[${index + 1}] ${quote.text}`}</Text>
    </View>
  )
}

export default definePlayground({
  name: 'ask-page',
  title: 'AskPage',
  category: 'search',
  description: 'Ask about the page on screen. The answer streams in grounded in its text, with quotes that jump to the source and follow-up questions, and it says so when the page does not hold the answer.',
  component: AskPageDemo,
  controls: {
    variant: select(skinNames, 'bevel', 'Variant'),
    presentation: select(['card', 'inline', 'sheet'], 'card', 'Presentation'),
    quoteStyle: select(['cards', 'rule', 'chips'], 'cards', 'Quotes'),
    size: select(['sm', 'md', 'lg'], 'md', 'Size'),
    tint: select(Object.keys(tints) as Array<keyof typeof tints>, 'accent', 'Tint'),
    radius: select(['auto', '10', '16', '24'], 'auto', 'Radius'),
    icons: select(Object.keys(iconSets), 'default', 'Icons'),
    labels: select(Object.keys(copy), 'default', 'Copy'),
    quotes: select(['default', 'footnotes'], 'default', 'Quote rows (renderQuote)'),
    title: text('Ask this page', 'Title'),
    showQuotes: boolean(true, 'Quotes'),
    showFollowUps: boolean(true, 'Follow-ups'),
    suggestions: boolean(true, 'Starter questions'),
    showBadge: boolean(true, 'Badge'),
  },
  variantKeys: ['variant', 'presentation', 'quoteStyle', 'size'],
  states: {
    idle: { script: (call) => mockScript.thinking(300).stream(replyFor(call), 60), description: 'Before the first question: a hint and starter questions.' },
    thinking: { script: mockScript.thinking(60_000), props: { initialQuestion: sampleQuestion, autoRun: true, open: true } },
    streaming: { script: (call) => mockScript.thinking(300).stream(replyFor(call), 30), props: { initialQuestion: sampleQuestion, autoRun: true, open: true }, freezeAt: 1500 },
    done: { script: (call) => mockScript.thinking(200).stream(replyFor(call), 400), props: { initialQuestion: sampleQuestion, autoRun: true, open: true }, freezeAt: 3000, description: 'The answer, the quotes it rests on (tap to jump) and follow-ups.' },
    notFound: { script: (call) => mockScript.thinking(400).text(replyFor(call)), props: { initialQuestion: sampleMissingQuestion, autoRun: true, open: true }, freezeAt: 1500, description: 'The page does not hold the answer, and it says so instead of guessing.' },
    long: { script: (call) => mockScript.thinking(300).stream(replyFor(call), 400), props: { text: longPage, initialQuestion: 'How do I move out?', autoRun: true, maxInputTokens: 220, open: true }, freezeAt: 3000, description: 'A long page: only the parts that match the question are read.' },
    error: { script: mockScript.error('unknown'), props: { initialQuestion: sampleQuestion, autoRun: true, open: true } },
    refusal: { script: mockScript.refusal(), props: { initialQuestion: sampleQuestion, autoRun: true, open: true } },
    unavailable: { availability: { status: 'unavailable', reason: 'not-enabled' } },
    preparing: { availability: { status: 'preparing', provider: 'llama', progress: 0.62 } },
  },
  review: ['idle', 'thinking', 'streaming', 'done', 'notFound'],
  frame: { width: 400, padding: 16, background: 'bg' },
  render: (p, ctx) => {
    const { tint, radius, icons, labels, title, quotes, suggestions, ...rest } = p as typeof p & Record<string, unknown>
    return (
      <AskPageDemo
        {...(rest as object)}
        key={ctx.state}
        tint={tints[tint as keyof typeof tints]}
        radius={radius === 'auto' ? undefined : Number(radius)}
        icons={iconSets[icons as string]}
        labels={copy[labels as string]}
        // The title control only speaks for itself while the copy set leaves it alone.
        title={labels === 'default' || title !== 'Ask this page' ? (title as string) : undefined}
        suggestions={suggestions ? sampleSuggestions : undefined}
        renderQuote={quotes === 'footnotes' ? (q) => <Footnote {...q} /> : undefined}
      />
    )
  },
})
