'use client'
import type { Control, PlaygroundDef, PlaygroundQuery } from '@ondai/playground'
import { Segmented } from '../ui/Segmented'

const stateOrder = ['idle', 'focus', 'thinking', 'streaming', 'tool', 'confirm', 'done', 'error', 'refusal', 'unavailable', 'preparing']

export function ControlsPanel({ def, query, onChange }: { def: PlaygroundDef; query: PlaygroundQuery; onChange: (q: PlaygroundQuery) => void }) {
  const set = (patch: Partial<PlaygroundQuery>) => onChange({ ...query, ...patch })
  const setProp = (k: string, v: unknown) => onChange({ ...query, props: { ...query.props, [k]: v } })
  const variantKeys = def.variantKeys ?? []
  const entries = Object.entries(def.controls) as Array<[string, Control]>
  const variants = entries.filter(([k]) => variantKeys.includes(k))
  const others = entries.filter(([k]) => !variantKeys.includes(k))
  const states = Object.keys(def.states).sort((a, b) => (stateOrder.indexOf(a) + 100) % 101 - ((stateOrder.indexOf(b) + 100) % 101))

  const renderControl = ([k, c]: [string, Control]) => {
    const v = (query.props as Record<string, unknown>)[k]
    const label = c.label ?? k
    switch (c.kind) {
      case 'select':
        return <Segmented key={k} label={label} options={c.options} value={String(v)} onChange={(x) => setProp(k, x)} />
      case 'boolean':
        return (
          <label key={k} className="flex items-center justify-between gap-3 min-h-8">
            <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">{label}</span>
            <button
              role="switch"
              aria-checked={!!v}
              onClick={() => setProp(k, !v)}
              className={`relative h-6 w-10 rounded-full transition-colors ${v ? 'bg-[color:var(--ondai-accent)]' : 'bg-[color:var(--ondai-elevated)] ondai-hairline'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${v ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </label>
        )
      case 'number':
        return (
          <label key={k} className="flex flex-col gap-1.5">
            <span className="flex justify-between ondai-mono text-[color:var(--ondai-text-tertiary)]">
              <span>{label}</span>
              <span className="text-[color:var(--ondai-text-secondary)]">{String(v)}</span>
            </span>
            <input type="range" min={c.min ?? 0} max={c.max ?? 100} step={c.step ?? 1} value={Number(v)} onChange={(e) => setProp(k, Number(e.target.value))} className="accent-[var(--ondai-accent)]" />
          </label>
        )
      case 'text':
        return (
          <label key={k} className="flex flex-col gap-1.5">
            <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">{label}</span>
            {c.multiline ? (
              <textarea value={String(v)} rows={3} onChange={(e) => setProp(k, e.target.value)} className="rounded-[10px] ondai-hairline bg-[color:var(--ondai-bg)] px-3 py-2 text-[13px] text-[color:var(--ondai-text)] outline-none focus:border-[color:var(--ondai-accent-ring)]" />
            ) : (
              <input value={String(v)} placeholder={c.placeholder} onChange={(e) => setProp(k, e.target.value)} className="h-9 rounded-[10px] ondai-hairline bg-[color:var(--ondai-bg)] px-3 text-[13px] text-[color:var(--ondai-text)] outline-none focus:border-[color:var(--ondai-accent-ring)]" />
            )}
          </label>
        )
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[17px] font-medium tracking-tight">{def.title}</h1>
        <p className="text-[13px] text-[color:var(--ondai-text-secondary)] mt-1">{def.description}</p>
      </div>
      <Segmented label="State" options={states} value={query.state} onChange={(state) => set({ state })} />
      {def.states[query.state]?.description ? <p className="text-[12px] text-[color:var(--ondai-text-tertiary)] -mt-3">{def.states[query.state]?.description}</p> : null}
      {variants.length ? <div className="flex flex-col gap-4">{variants.map(renderControl)}</div> : null}
      <div className="grid grid-cols-2 gap-3">
        <Segmented label="Theme" options={['void', 'paper', 'glass'] as const} value={query.theme} onChange={(theme) => set({ theme })} />
        <Segmented label="Accent" options={['ion', 'mono', 'aurora', 'ember'] as const} value={query.accent} onChange={(accent) => set({ accent })} />
      </div>
      <Segmented label="Simulated device" options={['apple', 'nano', 'llama', 'unavailable'] as const} value={query.device} onChange={(device) => set({ device })} />
      <Segmented label="Frame" options={['none', 'iphone', 'android'] as const} value={query.frame} onChange={(frame) => set({ frame })} />
      <label className="flex flex-col gap-1.5">
        <span className="flex justify-between ondai-mono text-[color:var(--ondai-text-tertiary)]">
          <span>Mock speed</span>
          <span className="text-[color:var(--ondai-text-secondary)]">{query.tps} tok/s</span>
        </span>
        <input type="range" min={5} max={200} step={5} value={query.tps} onChange={(e) => set({ tps: Number(e.target.value) })} className="accent-[var(--ondai-accent)]" />
      </label>
      <Segmented label="Motion" options={['system', 'off'] as const} value={query.motion} onChange={(motion) => set({ motion })} />
      {others.length ? <div className="flex flex-col gap-4 border-t border-[color:var(--ondai-hairline)] pt-5">{others.map(renderControl)}</div> : null}
    </div>
  )
}
