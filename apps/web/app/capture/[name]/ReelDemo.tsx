'use client'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { z } from 'zod'
import { createOndai, OndaiProvider, type PendingConfirmation } from '@ondai/core'
import { mockAdapter, ScriptedEmbeddingModel, type ScriptSource } from '@ondai/core/mock'
import type { PlaygroundDef } from '@ondai/playground'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { BorderBeam } from '@ondai/registry/components/border-beam'
import { CommandBar, defineAction, defineActions } from '@ondai/registry/components/command-bar'
import { ShimmerText } from '@ondai/registry/components/shimmer-text'
import { Surface } from '@ondai/registry/components/surface'
import { ToolConfirmCard, type ToolCallStatus } from '@ondai/registry/components/tool-confirm-card'
import LiveDemoTree from '@/components/site/LiveDemoTree'
import { reelMemo, voiceMemo, type DemoName } from '@/components/site/demos'

/** The recorder moves a reel on with `window.dispatchEvent(new Event('reel:next'))`. */
function useCue() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const on = () => setN((x) => x + 1)
    window.addEventListener('reel:next', on)
    return () => window.removeEventListener('reel:next', on)
  }, [])
  return n
}

/** Props the playgrounds' own controls add that these scenes do not take. */
const strip = ({ tint: _t, radius: _r, icons: _i, labels: _l, ...rest }: Record<string, unknown>) => rest

/* ------------------------------------------------------------------ */
/* Command bar: a sentence becomes an expense, and the list shows it.  */
/* ------------------------------------------------------------------ */

type Expense = { id: string; merchant: string; category: string; amount: number }
const startExpenses: Expense[] = [
  { id: 'e1', merchant: 'Blue Bottle', category: 'Coffee', amount: 4.8 },
  { id: 'e2', merchant: 'Uber', category: 'Transport', amount: 18.6 },
  { id: 'e3', merchant: 'Whole Foods', category: 'Groceries', amount: 63 },
]
const euro = (n: number) => `€${n.toFixed(2)}`
const categoryName: Record<string, string> = { food: 'Food & drinks', transport: 'Transport', home: 'Home', other: 'Other' }

function ExpenseRow({ e, fresh }: { e: Expense; fresh?: boolean }) {
  const t = useTheme()
  return (
    <Animated.View
      entering={fresh ? FadeIn.duration(420) : undefined}
      layout={LinearTransition.duration(320)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10, marginHorizontal: -10, borderRadius: 10, backgroundColor: fresh ? t.colors.muted : 'transparent' }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text }]} numberOfLines={1}>
          {e.merchant}
        </Text>
        <Text style={[typeStyle(t, 'xs'), { color: t.colors.textTertiary }]}>{fresh ? `${e.category} · just now` : e.category}</Text>
      </View>
      <Text style={[typeStyle(t, 'sm', { weight: 'medium' }), { color: t.colors.text, fontVariant: ['tabular-nums'] }]}>{euro(e.amount)}</Text>
    </Animated.View>
  )
}

function CommandBarReel(props: Record<string, unknown>) {
  const t = useTheme()
  const [list, setList] = useState(startExpenses)
  const [fresh, setFresh] = useState<string | null>(null)
  const total = list.reduce((a, e) => a + e.amount, 0)
  const actions = useMemo(
    () =>
      defineActions([
        defineAction({
          id: 'expense.add',
          title: 'Add expense',
          description: 'Log money you spent',
          // Generous keywords, so the suggestion holds while the whole sentence is typed.
          keywords: ['spent', 'paid', 'dinner', 'lunch', 'euros', 'cost', 'at', 'was', 'for', 'luigi', 'luigis'],
          params: z.object({ amount: z.number(), merchant: z.string(), category: z.enum(['food', 'transport', 'home', 'other']).optional() }),
          preview: (p) => `Added ${euro(p.amount)} at ${p.merchant}`,
          run: (p) => {
            const id = `${p.merchant}-${p.amount}`
            setList((l) => [{ id, merchant: p.merchant, category: categoryName[p.category ?? 'other'] ?? 'Other', amount: p.amount }, ...l])
            setFresh(id)
            return `Logged ${p.amount} at ${p.merchant}`
          },
        }),
        defineAction({ id: 'task.create', title: 'Create task', description: 'Add a task to your list', keywords: ['todo', 'remind'], params: z.object({ title: z.string() }), run: () => 'ok' }),
        defineAction({ id: 'screen.expenses', title: 'Expenses', group: 'screens', keywords: ['money', 'budget'], run: () => 'ok' }),
      ]),
    [],
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 18 }}>
      <View style={{ flex: 1, minWidth: 0 }} testID="reel-bar">
        <CommandBar
          {...(strip(props) as object)}
          actions={actions}
          inline
          open
          // Between the first letter and the first full word nothing matches; the reel shows no hint there.
          renderEmpty={() => null}
          frame={(panel, busy) => (
            <BorderBeam active={busy} radius="xl" tone="mono">
              {panel}
            </BorderBeam>
          )}
        />
      </View>
      <View style={{ width: 236 }} testID="reel-expenses">
        <Surface skin={props.variant as never} elevation="floating" radius={18} style={{ padding: 16, gap: 10 }}>
          <View style={{ gap: 2 }}>
            <Text style={[typeStyle(t, 'xs', { weight: 'medium' }), { color: t.colors.textTertiary }]}>Expenses · this week</Text>
            <Animated.Text key={total} entering={FadeIn.duration(300)} style={[typeStyle(t, '2xl', { weight: 'semibold' }), { color: t.colors.text, fontVariant: ['tabular-nums'], letterSpacing: -0.5 }]}>
              {euro(total)}
            </Animated.Text>
          </View>
          <View>
            {list.map((e) => (
              <ExpenseRow key={e.id} e={e} fresh={e.id === fresh} />
            ))}
          </View>
        </Surface>
      </View>
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* A local mock scope: its own transcript, script or embeddings.       */
/* ------------------------------------------------------------------ */

function MockScope({ script, transcript, embeddings, children }: { script?: ScriptSource; transcript?: string; embeddings?: ScriptedEmbeddingModel; children: ReactNode }) {
  const ondai = useMemo(() => {
    const base = mockAdapter({ script, transcript, speed: 1.5, simulated: true })
    const adapter = embeddings ? { ...base, embeddingModel: () => embeddings } : base
    return createOndai({ providers: { [adapter.id]: adapter }, policy: { order: [adapter.id], prewarm: 'never' } })
  }, [script, transcript, embeddings])
  return (
    <OndaiProvider value={ondai} withoutTheme>
      {children}
    </OndaiProvider>
  )
}

/**
 * The mock's own embeddings hash letters, so "Portugal" would never find "Lisbon". For the reel, a small
 * hand-made meaning space stands in for the device's model: words that mean the same land together.
 */
const concepts: string[][] = [
  ['flight', 'fly', 'flying', 'trip', 'travel', 'abroad', 'vacation', 'holiday', 'seat', 'airport', 'hotel', 'train', 'tickets', 'journey', 'getaway', 'cabin'],
  ['lisbon', 'portugal', 'portuguese', 'porto', 'praça', 'comércio'],
  ['lyon', 'france', 'paris', 'french'],
  ['budget', 'money', 'expense', 'cost', 'spend', 'finance', 'pay', 'invoice', 'price'],
  ['lasagna', 'recipe', 'cook', 'cooking', 'dinner', 'food', 'eat', 'meal', 'béchamel', 'ragù', 'dish', 'snacks'],
  ['dentist', 'doctor', 'health', 'appointment', 'insurance', 'running', 'run', '5k', 'intervals', 'fitness', 'workout'],
  ['landlord', 'tap', 'leaking', 'kitchen', 'repair', 'fix', 'plumber', 'apartment', 'flat', 'rent'],
  ['garden', 'beds', 'fence', 'plants', 'tomatoes', 'basil', 'grow'],
  ['review', 'meeting', 'client', 'workshop', 'design', 'work', 'office', 'headcount', 'marketing'],
  ['gift', 'gifts', 'present', 'birthday', 'record', 'grinder', 'socks'],
  ['book', 'club', 'read', 'reading', 'novel', 'overstory'],
  ['wifi', 'password', 'internet', 'network'],
]
class MeaningEmbeddings extends ScriptedEmbeddingModel {
  constructor() {
    super(concepts.length + 256)
  }
  override async doEmbed(options: Parameters<ScriptedEmbeddingModel['doEmbed']>[0]) {
    const embed = (text: string) => {
      const words = text.toLowerCase().match(/[\p{L}\d]+/gu) ?? []
      const meaning = concepts.map((c) => words.filter((w) => c.some((k) => w === k || (k.length > 4 && w.startsWith(k)))).length)
      const m = Math.sqrt(meaning.reduce((a, b) => a + b * b, 0)) || 1
      // Plus a dimension of its own per text, so a close match reads like a real model's (high, never a flat
      // 100%) while unrelated notes stay at zero.
      const own = new Array<number>(256).fill(0)
      let h = 2166136261
      for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
      own[(h >>> 0) % 256] = 0.34
      return [...meaning.map((x) => (x / m) * 0.94), ...own]
    }
    return { embeddings: options.values.map(embed), warnings: [] }
  }
}

/* ------------------------------------------------------------------ */
/* Tool confirm card: a payment is proposed, read, and approved.       */
/* ------------------------------------------------------------------ */

type Msg = { from: 'me' | 'them'; text: string }
function Bubble({ m }: { m: Msg }) {
  const t = useTheme()
  const mine = m.from === 'me'
  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '86%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: mine ? t.colors.text : t.colors.muted }}
    >
      <Text style={[typeStyle(t, 'md'), { color: mine ? t.colors.bg : t.colors.text }]}>{m.text}</Text>
    </Animated.View>
  )
}

const payment: PendingConfirmation = {
  id: 'pay-1',
  toolName: 'sendMoney',
  title: 'Send €32.00 to Marco',
  description: 'Leaves your account right away and can’t be undone.',
  input: { to: 'Marco Rossi', amount: '€32.00', from: 'Everyday account', note: 'Half of dinner at Luigi’s' },
  risk: 'high',
  confirm: () => {},
  cancel: () => {},
}

function ToolConfirmReel(props: Record<string, unknown>) {
  const cue = useCue()
  const [phase, setPhase] = useState<'ask' | 'thinking' | 'card'>('ask')
  const [status, setStatus] = useState<ToolCallStatus>('pending')
  useEffect(() => {
    if (cue < 1) return
    setPhase('thinking')
    const h = setTimeout(() => setPhase('card'), 1100)
    return () => clearTimeout(h)
  }, [cue])
  const approve = () => {
    setStatus('running')
    setTimeout(() => setStatus('done'), 1300)
  }
  return (
    <View style={{ gap: 14 }}>
      <Bubble m={{ from: 'me', text: 'Send Marco my half of dinner. The bill was €64.' }} />
      {phase === 'thinking' ? (
        <ShimmerText size="sm" active>
          Working out the amount
        </ShimmerText>
      ) : null}
      {phase === 'card' ? (
        <Animated.View entering={FadeInDown.duration(320)}>
          <ToolConfirmCard
            {...(strip(props) as object)}
            pending={payment}
            status={status}
            runningLabel="Sending €32.00 to Marco"
            result="Sent just now"
            fieldLabels={{ to: 'To', amount: 'Amount', from: 'From', note: 'Note' }}
            onApprove={approve}
            onCancel={() => setStatus('denied')}
          />
        </Animated.View>
      ) : null}
      {status === 'done' ? <Bubble m={{ from: 'them', text: 'Done. Marco has his €32.' }} /> : null}
    </View>
  )
}

/* ------------------------------------------------------------------ */

const meaning = new MeaningEmbeddings()

const adapters: Partial<Record<DemoName, (def: PlaygroundDef) => PlaygroundDef>> = {
  'command-bar': (def) => ({ ...def, component: CommandBarReel, render: undefined }),
  'semantic-search': (def) => ({ ...def, render: (p, ctx) => <MockScope embeddings={meaning}>{def.render!(p, ctx)}</MockScope> }),
  'voice-memo': (def) => ({
    ...def,
    render: (p, ctx) => (
      <MockScope script={voiceMemo} transcript={reelMemo.transcript}>
        {def.render!(p, ctx)}
      </MockScope>
    ),
  }),
  'tool-confirm-card': (def) => ({ ...def, component: ToolConfirmReel, render: undefined }),
}

export default function ReelDemo({ name, theme, props, onReady }: { name: DemoName; theme: 'void' | 'paper'; props?: Record<string, unknown>; onReady?: () => void }) {
  return <LiveDemoTree name={name} theme={theme} overrides={props} onReady={onReady} adapt={adapters[name]} />
}
