'use client'
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated'
import { z } from 'zod'
import { createOndai, OndaiProvider, type Availability } from '@ondai/core'
import { mockAdapter, ScriptedEmbeddingModel, type ScriptSource } from '@ondai/core/mock'
import { playgroundDefaults, queryDefaults, type PlaygroundDef, type PlaygroundQuery, type PlaygroundState } from '@ondai/playground'
import { PlaygroundHost } from '@ondai/playground/host'
import { playgrounds } from '@ondai/registry/playgrounds'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { BorderBeam } from '@ondai/registry/components/border-beam'
import { CommandBar, defineAction, defineActions } from '@ondai/registry/components/command-bar'
import { Surface } from '@ondai/registry/components/surface'
import { demos } from '@/components/site/demos'

/*
 * One component for the phone in the film. It runs on the scripted mock, but labelled as the on-device model
 * it stands in for (`simulated: false`), so its badge reads as it would on an iPhone. Each component sits in
 * its own mock scope: the state's script, plus a small meaning space for search. The CommandBar and the
 * search's meaning space follow the landing page reels (app/capture/[name]/ReelDemo.tsx).
 */

const SPEED = 2.5 // the mock at 100 tokens a second

function Scope({ script, availability, embeddings, children }: { script?: ScriptSource; availability?: Availability; embeddings?: ScriptedEmbeddingModel; children: ReactNode }) {
  const ondai = useMemo(() => {
    const base = mockAdapter({ script, availability, speed: SPEED, simulated: false })
    const adapter = embeddings ? { ...base, embeddingModel: () => embeddings } : base
    return createOndai({ providers: { [adapter.id]: adapter }, policy: { order: [adapter.id], prewarm: 'never' } })
  }, [script, availability, embeddings])
  return (
    <OndaiProvider value={ondai} withoutTheme>
      {children}
    </OndaiProvider>
  )
}

/**
 * The mock's own embeddings hash letters, so "Portugal" would never find "Lisbon". As in the reel, a small
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
      const own = new Array<number>(256).fill(0)
      let h = 2166136261
      for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
      own[(h >>> 0) % 256] = 0.34
      return [...meaning.map((x) => (x / m) * 0.94), ...own]
    }
    return { embeddings: options.values.map(embed), warnings: [] }
  }
}
const meaning = new MeaningEmbeddings()

/* The CommandBar shot: a sentence becomes an expense, and the list under it shows it. */

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

function FilmCommandBar({ tint: _t, radius: _r, icons: _i, labels: _l, ...props }: Record<string, unknown>) {
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
    <View style={{ gap: 16 }}>
      <CommandBar
        {...(props as object)}
        actions={actions}
        inline
        open
        renderEmpty={() => null}
        frame={(panel, busy) => (
          <BorderBeam active={busy} radius="xl" tone="mono">
            {panel}
          </BorderBeam>
        )}
      />
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
  )
}

/** The page behind the phone's screen takes the component's own background. */
function Backdrop() {
  const t = useTheme()
  useEffect(() => {
    document.documentElement.style.background = t.colors.bg
    document.body.style.background = t.colors.bg
  }, [t.colors.bg])
  return null
}

type Film = { states?: Record<string, PlaygroundState>; component?: ComponentType<Record<string, unknown>>; props?: Record<string, unknown>; embeddings?: ScriptedEmbeddingModel }
const FILM: Record<string, Film> = {
  'command-bar': {
    states: { idle: { script: demos['command-bar'].script } },
    component: FilmCommandBar,
    props: { presentation: 'inline', showKeyHints: false, showVoice: false, autoFocus: false, placeholder: 'Ask or do anything' },
  },
  'semantic-search': { props: { recent: false, showWhy: false, highlight: false, k: 2, placeholder: 'Search your notes by meaning' }, embeddings: meaning },
  'agent-run': {},
  'voice-memo': {},
}

export default function FilmScreen({ name, theme, state: initial }: { name: string; theme: 'paper' | 'void'; state: string }) {
  const [base, setBase] = useState<PlaygroundDef | null>(null)
  const [state, setState] = useState(initial)
  const film = FILM[name]!

  useEffect(() => {
    const loader = (playgrounds as Partial<Record<string, () => Promise<{ default: PlaygroundDef }>>>)[name]
    let alive = true
    loader?.().then((m) => alive && setBase(m.default))
    return () => {
      alive = false
    }
  }, [name])

  // `{ type: 'ondai:state', value }` from the film moves to another state (the host remounts, the script restarts).
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === 'ondai:state') setState(String(e.data.value))
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [])

  const def = useMemo<PlaygroundDef | null>(() => {
    if (!base) return null
    const Component = film.component ?? base.component
    const inner = film.component ? undefined : base.render
    return {
      ...base,
      component: Component,
      states: film.states ?? base.states,
      render: (p, ctx) => (
        <Scope script={ctx.stateDef.script} availability={ctx.stateDef.availability} embeddings={film.embeddings}>
          <Backdrop />
          {inner ? inner(p, ctx) : <Component {...p} />}
        </Scope>
      ),
    }
  }, [base, film])

  const query = useMemo<PlaygroundQuery | null>(
    () =>
      def
        ? {
            ...queryDefaults,
            props: { ...(playgroundDefaults(def) as Record<string, unknown>), variant: 'bevel', ...film.props } as PlaygroundQuery['props'],
            state: def.states[state] ? state : Object.keys(def.states)[0]!,
            theme,
            accent: 'mono',
            tps: 100,
          }
        : null,
    [def, film, state, theme],
  )

  if (!def || !query) return null
  return (
    <div style={{ padding: '10px 14px' }}>
      <PlaygroundHost def={def} query={query} bare onReady={() => document.documentElement.setAttribute('data-film-ready', '1')} />
    </div>
  )
}
