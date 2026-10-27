'use client'
import type { Control, PlaygroundDef, PlaygroundQuery } from '@ondai/playground'
import { Segmented } from '../ui/Segmented'

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-[color:var(--ondai-hairline)] py-3 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-6">
      <div>
        <div className="text-[14px] font-medium">{label}</div>
        {hint ? <div className="text-[12px] text-[color:var(--ondai-text-tertiary)]">{hint}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />
}

/** The component's own props, one row each, like a Storybook controls table but quieter. */
export function PropsTable({ def, query, onChange }: { def: PlaygroundDef; query: PlaygroundQuery; onChange: (q: PlaygroundQuery) => void }) {
  const setProp = (k: string, v: unknown) => onChange({ ...query, props: { ...query.props, [k]: v } as PlaygroundQuery['props'] })
  const entries = Object.entries(def.controls) as Array<[string, Control]>
  const variantKeys = def.variantKeys ?? []
  const ordered = [...entries.filter(([k]) => variantKeys.includes(k)), ...entries.filter(([k]) => !variantKeys.includes(k))]

  return (
    <div>
      {ordered.map(([k, c]) => {
        const v = (query.props as Record<string, unknown>)[k]
        const label = c.label ?? k
        switch (c.kind) {
          case 'select':
            return (
              <Row key={k} label={label} hint={k}>
                <Segmented options={c.options} value={String(v)} onChange={(x) => setProp(k, x)} label={label} />
              </Row>
            )
          case 'boolean':
            return (
              <Row key={k} label={label} hint={k}>
                <Switch checked={!!v} onChange={(x) => setProp(k, x)} label={label} />
              </Row>
            )
          case 'number':
            return (
              <Row key={k} label={label} hint={k}>
                <div className="flex items-center gap-3">
                  <input type="range" className="range max-w-[260px]" min={c.min ?? 0} max={c.max ?? 100} step={c.step ?? 1} value={Number(v)} onChange={(e) => setProp(k, Number(e.target.value))} aria-label={label} />
                  <span className="w-10 text-[13px] text-[color:var(--ondai-text-secondary)] tabular-nums">{String(v)}</span>
                </div>
              </Row>
            )
          case 'text':
            return (
              <Row key={k} label={label} hint={k}>
                {c.multiline ? (
                  <textarea value={String(v)} rows={3} onChange={(e) => setProp(k, e.target.value)} className="input w-full max-w-[420px] py-2 leading-5" style={{ height: 'auto' }} aria-label={label} />
                ) : (
                  <input value={String(v)} placeholder={c.placeholder} onChange={(e) => setProp(k, e.target.value)} className="input w-full max-w-[420px]" aria-label={label} />
                )}
              </Row>
            )
        }
      })}
    </div>
  )
}
