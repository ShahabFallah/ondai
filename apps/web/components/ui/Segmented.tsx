'use client'

/** A row of pills, one selected. Labels are shown as written in the playground definition. */
export function Segmented<T extends string>({ options, value, onChange, label, format }: { options: readonly T[]; value: T; onChange: (v: T) => void; label?: string; format?: (v: T) => string }) {
  return (
    <div role="radiogroup" aria-label={label} className="pill-group">
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={o === value} className="pill" onClick={() => onChange(o)}>
          {format ? format(o) : o}
        </button>
      ))}
    </div>
  )
}
