'use client'
import { cloneElement, useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import type { PlaygroundDef } from '@ondai/playground'
import { typeStyle, useTheme } from '@ondai/tokens/react'
import { AutoTag } from '@ondai/registry/components/auto-tag'
import { BorderBeam } from '@ondai/registry/components/border-beam'
import { Field } from '@ondai/registry/components/field'
import { SmartReply } from '@ondai/registry/components/smart-reply'
import LiveDemoTree from '@/components/site/LiveDemoTree'
import type { DemoName } from '@/components/site/demos'

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

type Msg = { from: 'me' | 'them'; text: string }
const thread: Msg[] = [
  { from: 'them', text: 'Hey! Are we still on for Friday at noon?' },
  { from: 'me', text: 'Yes, venue is confirmed.' },
  { from: 'them', text: 'Great. Can you bring the revised budget printout, and do you want me to pick you up?' },
]

function Bubble({ m, enter }: { m: Msg; enter?: boolean }) {
  const t = useTheme()
  const mine = m.from === 'me'
  return (
    <Animated.View
      entering={enter ? FadeIn.duration(260) : undefined}
      style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '84%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: mine ? t.colors.text : t.colors.muted }}
    >
      <Text style={[typeStyle(t, 'md'), { color: mine ? t.colors.bg : t.colors.text }]}>{m.text}</Text>
    </Animated.View>
  )
}

/** The chat as it happens: the last message arrives on cue, replies get written, one is sent and the chips go. */
function SmartReplyReel(props: Record<string, unknown>) {
  const cue = useCue()
  const [sent, setSent] = useState<string | null>(null)
  const shown = cue > 0 ? thread : thread.slice(0, 2)
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        {shown.map((m, i) => (
          <Bubble key={i} m={m} enter={i === 2} />
        ))}
        {sent ? <Bubble m={{ from: 'me', text: sent }} enter /> : null}
      </View>
      {cue > 0 && !sent ? <SmartReply {...props} thread={shown} onSelect={setSent} /> : null}
    </View>
  )
}

const noteTags = ['work', 'personal', 'finance', 'travel', 'health', 'ideas', 'recipes', 'family']

/** A blank note: tags are asked for once the writer pauses, so they arrive as the sentence does. */
function AutoTagReel(props: Record<string, unknown>) {
  const [text, setText] = useState('')
  const [settled, setSettled] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  useEffect(() => {
    const h = setTimeout(() => text.trim().length >= 12 && setSettled(text.trim()), 420)
    return () => clearTimeout(h)
  }, [text])
  return (
    <View style={{ gap: 12 }}>
      <Field label="Note" value={text} onChangeText={setText} placeholder="Write a note" multiline numberOfLines={3} scrollEnabled={false} />
      <AutoTag {...props} tags={noteTags} text={settled} selected={selected} onChange={setSelected} />
    </View>
  )
}

const adapters: Partial<Record<DemoName, (def: PlaygroundDef) => PlaygroundDef>> = {
  // The playground wraps the bar in the colourful beam; the site is black and white.
  'command-bar': (def) => ({
    ...def,
    render: (p, ctx) =>
      cloneElement(def.render!(p, ctx) as ReactElement<{ frame?: unknown }>, {
        frame: (panel: ReactNode, busy: boolean) => (
          <BorderBeam active={busy} radius="xl" tone="mono">
            {panel}
          </BorderBeam>
        ),
      }),
  }),
  'smart-reply': (def) => ({ ...def, component: SmartReplyReel, render: undefined }),
  'auto-tag': (def) => ({ ...def, component: AutoTagReel, render: undefined }),
}

export default function ReelDemo({ name, theme, props, onReady }: { name: DemoName; theme: 'void' | 'paper'; props?: Record<string, unknown>; onReady?: () => void }) {
  return <LiveDemoTree name={name} theme={theme} overrides={props} onReady={onReady} adapt={adapters[name]} />
}
