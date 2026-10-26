'use client'
export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">{label}</span> : null}
      <div role="radiogroup" aria-label={label} className="flex rounded-[12px] bg-[color:var(--ondai-elevated)] p-0.5 ondai-hairline">
        {options.map((o) => {
          const on = o === value
          return (
            <button
              key={o}
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o)}
              className={`flex-1 min-h-8 rounded-[10px] px-2 text-[12px] font-mono tracking-wide transition-colors ${on ? 'bg-[color:var(--ondai-surface)] text-[color:var(--ondai-text)] shadow-[inset_0_0_0_1px_var(--ondai-hairline-strong)]' : 'text-[color:var(--ondai-text-tertiary)] hover:text-[color:var(--ondai-text-secondary)]'}`}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}
