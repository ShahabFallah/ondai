'use client'
import { RotateCcw } from 'lucide-react'
import type { Control, PlaygroundDef, PlaygroundQuery } from '@ondai/playground'
import { Segmented } from '../ui/Segmented'

function Row({ name, label, changed, onReset, children }: { name: string; label?: string; changed: boolean; onReset: () => void; children: React.ReactNode }) {
  return (
    <div className="pg-prop">
      <div className="pg-prop-name">
        <code>{name}</code>
        {label && label.toLowerCase() !== name.toLowerCase() ? <small>{label}</small> : null}
        {changed ? (
          <button type="button" className="pg-prop-reset" onClick={onReset} aria-label={`Reset ${name}`} title="Reset">
            <RotateCcw size={13} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="ui-switch" onClick={() => onChange(!checked)} />
}

/** The component's own props, one row each: name in mono, a live control beside it. */
export function PropsTable({ def, query, onChange }: { def: PlaygroundDef; query: PlaygroundQuery; onChange: (q: PlaygroundQuery) => void }) {
  const setProp = (k: string, v: unknown) => onChange({ ...query, props: { ...query.props, [k]: v } as PlaygroundQuery['props'] })
  const entries = Object.entries(def.controls) as Array<[string, Control]>
  const variantKeys = def.variantKeys ?? []
  const ordered = [...entries.filter(([k]) => variantKeys.includes(k)), ...entries.filter(([k]) => !variantKeys.includes(k))]

  return (
    <div>
      <div className="pg-props-head" aria-hidden>
        <span>Prop</span>
        <span>Value</span>
      </div>
      {ordered.map(([k, c]) => {
        const v = (query.props as Record<string, unknown>)[k]
        const label = c.label ?? k
        const row = { name: k, label: c.label, changed: v !== c.default, onReset: () => setProp(k, c.default) }
        switch (c.kind) {
          case 'select':
            return (
              <Row key={k} {...row}>
                <Segmented options={c.options} value={String(v)} onChange={(x) => setProp(k, x)} label={label} size="sm" />
              </Row>
            )
          case 'boolean':
            return (
              <Row key={k} {...row}>
                <Switch checked={!!v} onChange={(x) => setProp(k, x)} label={label} />
              </Row>
            )
          case 'number': {
            const min = c.min ?? 0
            const max = c.max ?? 100
            const fill = `${((Number(v) - min) / (max - min || 1)) * 100}%`
            return (
              <Row key={k} {...row}>
                <div className="flex items-center gap-3">
                  <input type="range" className="ui-range w-full max-w-[260px]" style={{ ['--fill' as string]: fill }} min={min} max={max} step={c.step ?? 1} value={Number(v)} onChange={(e) => setProp(k, Number(e.target.value))} aria-label={label} />
                  <span className="w-12 font-mono text-[12.5px] text-[color:var(--fg-2)] tabular-nums">{String(v)}</span>
                </div>
              </Row>
            )
          }
          case 'text':
            return (
              <Row key={k} {...row}>
                {c.multiline ? (
                  <textarea value={String(v)} rows={3} onChange={(e) => setProp(k, e.target.value)} className="ui-input max-w-[440px] py-2 leading-5" style={{ height: 'auto' }} aria-label={label} />
                ) : (
                  <input value={String(v)} placeholder={c.placeholder} onChange={(e) => setProp(k, e.target.value)} className="ui-input max-w-[440px]" aria-label={label} />
                )}
              </Row>
            )
        }
      })}
    </div>
  )
}
