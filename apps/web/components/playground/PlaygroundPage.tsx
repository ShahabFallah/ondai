'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import type { PlaygroundDef, PlaygroundQuery } from '@ondai/playground'
import { decodeQuery, encodeQuery, defaultCode } from '@ondai/playground'
import { playgrounds, type PlaygroundName } from '@ondai/registry/playgrounds'
import { Segmented } from '../ui/Segmented'
import { CopyCommand } from '../site/CopyCommand'
import { PropsTable, Switch } from './PropsTable'
import { Preview } from './Preview'

const stateOrder = ['idle', 'focus', 'thinking', 'streaming', 'tool', 'confirm', 'done', 'error', 'refusal', 'unavailable', 'preparing']
const themeLabel: Record<string, string> = { void: 'Void', paper: 'Paper', glass: 'Glass' }
const accentLabel: Record<string, string> = { ion: 'Ion', mono: 'Mono', aurora: 'Aurora', ember: 'Ember' }
const deviceLabel: Record<string, string> = { apple: 'Apple', nano: 'Nano', llama: 'Llama', unavailable: 'No model' }
const frameLabel: Record<string, string> = { none: 'No frame', iphone: 'iPhone', android: 'Android' }

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="Copy code"
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
    >
      {done ? <Check size={16} /> : <Copy size={16} />}
    </button>
  )
}

export function PlaygroundPage({ name }: { name: string }) {
  const [def, setDef] = useState<PlaygroundDef | null>(null)
  const [error, setError] = useState<string | null>(null)
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let alive = true
    const loader = playgrounds[name as PlaygroundName]
    if (!loader) {
      setError(`No playground named "${name}".`)
      return
    }
    loader()
      .then((m) => alive && setDef(m.default))
      .catch((e) => alive && setError(String(e)))
    return () => {
      alive = false
    }
  }, [name])

  const query = useMemo(() => (def ? decodeQuery(def, params) : null), [def, params])
  const setQuery = useCallback(
    (next: PlaygroundQuery) => {
      if (!def) return
      const qs = encodeQuery(def, next)
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [def, pathname, router],
  )

  if (error) return <p className="p-8 text-[color:var(--ondai-danger)]">{error}</p>
  if (!def || !query) return <p className="ondai-waiting p-8 text-[14px] text-[color:var(--ondai-text-tertiary)]">Loading the playground…</p>
  const code = def.code ? def.code(query.props) : defaultCode(def, query.props)
  if (query.embed) {
    // Same box structure as the first release so the committed visual baselines stay valid.
    return (
      <div className="flex min-h-screen" data-embed="1">
        <div className="min-w-0 flex-1">
          <section className="flex justify-center">
            <Preview def={def} query={query} />
          </section>
        </div>
      </div>
    )
  }

  const set = (patch: Partial<PlaygroundQuery>) => setQuery({ ...query, ...patch })
  const rank = (s: string) => (stateOrder.indexOf(s) === -1 ? 100 : stateOrder.indexOf(s))
  const states = Object.keys(def.states).sort((a, b) => rank(a) - rank(b))
  const stateInfo = def.states[query.state]?.description

  return (
    <div className="pb-24">
      <header>
        <h1 className="text-[32px] font-semibold tracking-[-0.025em]">{def.title}</h1>
        <p className="lead mt-2 max-w-[64ch] text-[16px]">{def.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <CopyCommand command={`npx ondai add ${def.name}`} />
          <Link href={`/docs/components/${def.name}`} className="btn btn-secondary">
            Read the docs
          </Link>
        </div>
      </header>

      <div role="tablist" aria-label="State" className="mt-10 flex overflow-x-auto border-b border-[color:var(--ondai-hairline)]">
        {states.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={s === query.state} className="tab" onClick={() => set({ state: s })}>
            {s}
          </button>
        ))}
      </div>
      <p className="label mt-3 min-h-5">{stateInfo ?? ' '}</p>

      <section className="card mt-4 p-2" aria-label="Preview">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-2 py-2">
          <Segmented options={['void', 'paper', 'glass'] as const} value={query.theme} onChange={(theme) => set({ theme })} label="Theme" format={(v) => themeLabel[v] ?? v} />
          <Segmented options={['ion', 'mono', 'aurora', 'ember'] as const} value={query.accent} onChange={(accent) => set({ accent })} label="Accent" format={(v) => accentLabel[v] ?? v} />
          <Segmented options={['apple', 'nano', 'llama', 'unavailable'] as const} value={query.device} onChange={(device) => set({ device })} label="Simulated device" format={(v) => deviceLabel[v] ?? v} />
          <Segmented options={['none', 'iphone', 'android'] as const} value={query.frame} onChange={(frame) => set({ frame })} label="Frame" format={(v) => frameLabel[v] ?? v} />
          <div className="ml-auto flex items-center gap-2 text-[13px] text-[color:var(--ondai-text-secondary)]">
            <span>Motion</span>
            <Switch checked={query.motion === 'system'} onChange={(on) => set({ motion: on ? 'system' : 'off' })} label="Motion" />
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[color:var(--ondai-text-secondary)]">
            <span className="whitespace-nowrap">{query.tps} tok/s</span>
            <input type="range" className="range w-28" min={5} max={200} step={5} value={query.tps} onChange={(e) => set({ tps: Number(e.target.value) })} aria-label="Mock speed, tokens per second" />
          </div>
        </div>
        <div className="card-stage flex min-h-[420px] items-center justify-center overflow-auto p-4 sm:p-8">
          <Preview def={def} query={query} />
        </div>
      </section>

      <section className="card mt-3 p-2" aria-label="Code">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="label">Code</span>
          <CopyButton text={code} />
        </div>
        <pre className="code-block px-3 pb-3">{code}</pre>
      </section>

      <section className="mt-12" aria-labelledby="props">
        <h2 id="props" className="text-[20px] font-semibold tracking-tight">
          Props
        </h2>
        <p className="label mt-1 mb-4">Every control updates the URL, so a state is a link you can share.</p>
        <PropsTable def={def} query={query} onChange={setQuery} />
      </section>

      <p className="label mt-10">Simulated output. In an app, the same component runs on the phone&apos;s own model.</p>
    </div>
  )
}
