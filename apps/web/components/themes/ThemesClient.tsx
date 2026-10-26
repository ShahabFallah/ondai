'use client'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { resolveTheme, themeToCssVars, type AccentName, type ThemeName } from '@ondai/tokens'
import { Segmented } from '../ui/Segmented'

const ThemePreview = dynamic(() => import('./ThemePreview'), { ssr: false })

export default function ThemesClient() {
  const [theme, setTheme] = useState<Exclude<ThemeName, 'system'>>('void')
  const [accent, setAccent] = useState<AccentName>('ion')
  const [custom, setCustom] = useState({ a: '#7CF7FF', b: '#8B7CFF', c: '#FF7CE5' })
  const resolved = useMemo(() => resolveTheme({ theme, accent, customAccent: custom }), [theme, accent, custom])
  const vars = useMemo(() => themeToCssVars(resolved), [resolved])
  const json = useMemo(() => JSON.stringify({ theme, accent, customAccent: accent === 'custom' ? custom : undefined, colors: resolved.colors }, null, 2), [theme, accent, custom, resolved])
  const css = useMemo(() => `:root {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`, [vars])
  const swatches = Object.entries(resolved.colors).filter(([, v]) => typeof v === 'string') as Array<[string, string]>
  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <aside className="flex flex-col gap-5">
        <Segmented label="Theme" options={['void', 'paper', 'glass'] as const} value={theme} onChange={setTheme} />
        <Segmented label="Accent" options={['ion', 'mono', 'aurora', 'ember', 'custom'] as const} value={accent} onChange={setAccent} />
        {accent === 'custom' ? (
          <div className="grid grid-cols-3 gap-3">
            {(['a', 'b', 'c'] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1.5">
                <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">stop {k}</span>
                <input type="color" value={custom[k]} onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value.toUpperCase() }))} className="h-9 w-full rounded-[8px] bg-transparent" />
                <span className="font-mono text-[11px] text-[color:var(--ondai-text-secondary)]">{custom[k]}</span>
              </label>
            ))}
          </div>
        ) : null}
        <div className="h-3 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${resolved.colors.accent.a}, ${resolved.colors.accent.b}, ${resolved.colors.accent.c})` }} />
        <div className="grid grid-cols-4 gap-2">
          {swatches.slice(0, 16).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1">
              <div className="h-8 rounded-[8px] ondai-hairline" style={{ background: v }} />
              <span className="ondai-mono truncate text-[color:var(--ondai-text-tertiary)]" title={k}>
                {k}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">Export</span>
          <div className="flex gap-2">
            <button onClick={() => void navigator.clipboard.writeText(json)} className="ondai-mono rounded-full ondai-hairline px-3 py-1.5 text-[color:var(--ondai-text-secondary)] hover:text-[color:var(--ondai-text)]">
              copy json
            </button>
            <button onClick={() => void navigator.clipboard.writeText(css)} className="ondai-mono rounded-full ondai-hairline px-3 py-1.5 text-[color:var(--ondai-text-secondary)] hover:text-[color:var(--ondai-text)]">
              copy css vars
            </button>
          </div>
          <pre className="max-h-64 overflow-auto rounded-[12px] ondai-hairline bg-[color:var(--ondai-bg)] p-3 font-mono text-[11px] leading-4 text-[color:var(--ondai-text-secondary)]">{css}</pre>
        </div>
      </aside>
      <section data-theme={theme} className="rounded-[22px] ondai-hairline overflow-hidden" style={{ background: resolved.colors.bg }}>
        <ThemePreview theme={theme} accent={accent} custom={custom} />
      </section>
    </div>
  )
}
