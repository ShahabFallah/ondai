'use client'
import dynamic from 'next/dynamic'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { resolveTheme, themeToCssVars, type AccentName, type ThemeName } from '@ondai/tokens'
import { Segmented } from '../ui/Segmented'
import './themes.css'

const ThemePreview = dynamic(() => import('./ThemePreview'), {
  ssr: false,
  loading: () => <p className="ondai-waiting label p-8">Mounting the screen…</p>,
})

type StudioTheme = Exclude<ThemeName, 'system'>
type Stops = { a: string; b: string; c: string }

const themeLabel: Record<StudioTheme, string> = { void: 'Void', paper: 'Paper', glass: 'Glass' }
const accentOrder: readonly AccentName[] = ['ion', 'mono', 'aurora', 'ember', 'custom']
const accentLabel: Record<AccentName, string> = { ion: 'Ion', mono: 'Mono', aurora: 'Aurora', ember: 'Ember', custom: 'Custom' }
const gradient = (s: readonly [string, string, string] | Stops) => ('a' in s ? `linear-gradient(135deg, ${s.a}, ${s.b}, ${s.c})` : `linear-gradient(135deg, ${s[0]}, ${s[1]}, ${s[2]})`)

/** The 16 colours worth a swatch, in the order a designer reads them. */
const swatchKeys = ['bg', 'surface', 'elevated', 'elevatedHover', 'input', 'hairline', 'hairlineStrong', 'text', 'textSecondary', 'textTertiary', 'accent.a', 'accent.b', 'accent.c', 'success', 'warning', 'danger'] as const

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<number>(0)
  const copy = useCallback((key: string, text: string) => {
    void navigator.clipboard.writeText(text)
    setCopied(key)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(null), 1500)
  }, [])
  return { copied, copy }
}

export default function ThemesClient() {
  const [theme, setTheme] = useState<StudioTheme>('void')
  const [accent, setAccent] = useState<AccentName>('ion')
  const [custom, setCustom] = useState<Stops>({ a: '#7CF7FF', b: '#8B7CFF', c: '#FF7CE5' })
  const { copied, copy } = useCopied()

  const resolved = useMemo(() => resolveTheme({ theme, accent, customAccent: custom }), [theme, accent, custom])
  const vars = useMemo(() => themeToCssVars(resolved), [resolved])
  const json = useMemo(() => JSON.stringify({ theme, accent, customAccent: accent === 'custom' ? custom : undefined, colors: resolved.colors }, null, 2), [theme, accent, custom, resolved])
  const css = useMemo(() => `:root {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`, [vars])
  // Each preset swatch shows its own stops for the current theme (mono flips between white and black).
  const presetStops = useMemo(() => Object.fromEntries(accentOrder.map((a) => [a, a === 'custom' ? custom : resolveTheme({ theme, accent: a }).colors.accent.gradient])) as Record<AccentName, Stops | readonly [string, string, string]>, [theme, custom])
  const swatches = swatchKeys.map((key) => {
    const value = key.startsWith('accent.') ? resolved.colors.accent[key.slice(7) as 'a' | 'b' | 'c'] : (resolved.colors[key as keyof typeof resolved.colors] as string)
    return { key, value }
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="themes-studio">
        <div className="glass themes-panel" role="group" aria-label="Theme controls">
          <div className="themes-row">
            <div className="themes-row-head">
              <span className="label">Theme</span>
              <strong>{themeLabel[theme]}</strong>
            </div>
            <Segmented label="Theme" options={['void', 'paper', 'glass'] as const} value={theme} onChange={setTheme} format={(v) => themeLabel[v]} />
          </div>

          <div className="themes-row">
            <div className="themes-row-head">
              <span className="label">Accent</span>
              <strong>{accentLabel[accent]}</strong>
            </div>
            <div className="accent-row" role="radiogroup" aria-label="Accent">
              {accentOrder.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={a === accent} aria-label={accentLabel[a]} title={accentLabel[a]} data-custom={a === 'custom'} className="accent-swatch" style={{ background: gradient(presetStops[a]) }} onClick={() => setAccent(a)} />
              ))}
            </div>
          </div>

          {accent === 'custom' ? (
            <div className="custom-stops">
              {(['a', 'b', 'c'] as const).map((k) => (
                <label key={k} className="custom-stop">
                  <input type="color" className="stop-input" value={custom[k]} aria-label={`Stop ${k}`} onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value.toUpperCase() }))} />
                  <span>{custom[k]}</span>
                </label>
              ))}
            </div>
          ) : null}

          <div className="themes-gradient" aria-hidden style={{ background: `linear-gradient(90deg, ${resolved.colors.accent.a}, ${resolved.colors.accent.b}, ${resolved.colors.accent.c})` }} />

          <div className="themes-export">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => copy('json', json)}>
              {copied === 'json' ? 'Copied' : 'Copy JSON'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => copy('css', css)}>
              {copied === 'css' ? 'Copied' : 'Copy CSS'}
            </button>
          </div>
        </div>

        <section className="stage themes-stage" data-theme={theme} aria-label="Preview" style={{ background: resolved.colors.bg }}>
          <ThemePreview theme={theme} accent={accent} custom={custom} />
        </section>
      </div>

      <section className="card p-5" aria-labelledby="colours">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="colours" className="text-[15px] font-medium">
            Colours
          </h2>
          <span className="label">
            {themeLabel[theme]} with {accentLabel[accent].toLowerCase()}. Hover a swatch for its value.
          </span>
        </div>
        <div className="swatch-ribbon">
          {swatches.map((s) => (
            <div key={s.key} className="swatch" title={`${s.key} ${s.value}`}>
              <i style={{ background: s.value }} />
              <span>{s.key}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-3 sm:p-4" aria-labelledby="vars">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="vars" className="text-[15px] font-medium">
              CSS variables
            </h2>
            <span className="label">shadcn names plus the ondai extras, ready for a web app.</span>
          </div>
          <button type="button" className="icon-btn" aria-label="Copy CSS variables" onClick={() => copy('vars', css)}>
            {copied === 'vars' ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <div className="stage">
          <pre className="code-block themes-code">{css}</pre>
        </div>
      </section>
    </div>
  )
}
