'use client'
import { useIndicator } from './useIndicator'
import './ui.css'

/** A segmented control: one choice, a thumb that slides to it. */
export function Segmented<T extends string>({ options, value, onChange, label, format, size = 'md' }: { options: readonly T[]; value: T; onChange: (v: T) => void; label?: string; format?: (v: T) => string; size?: 'sm' | 'md' }) {
  const { ref, style, animate } = useIndicator<HTMLDivElement>(`${value}|${options.join(',')}`)
  return (
    <div ref={ref} role="radiogroup" aria-label={label} className="seg" data-size={size}>
      <span aria-hidden className="ui-ind seg-thumb" data-animate={animate} style={style} />
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={o === value} data-active={o === value} className="seg-item" onClick={() => onChange(o)}>
          {format ? format(o) : o}
        </button>
      ))}
    </div>
  )
}
