'use client'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, Plus } from 'lucide-react'
import { useTheme } from 'next-themes'
import { resolveTheme, themeToCssVars, type AccentName, type ThemeName } from '@ondai/tokens'
import { Segmented } from '../ui/Segmented'
import '../ui/ui.css'
import './themes.css'

const ThemePreview = dynamic(() => import('./ThemePreview'), {
  ssr: false,
  loading: () => <p className="ondai-waiting label p-8">Mounting the screens…</p>,
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
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const copy = useCallback((key: string, text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(null), 1500)
  }, [])
  return { copied, copy }
}

const isColor = (v: string) => /^(#|rgba?\(|hsla?\()/i.test(v.trim())

/** `--name: value;` lines, with a tiny chip for every colour. */
function CssLines({ vars }: { vars: Record<string, string> }) {
  return (
    <pre className="th-code">
      <span className="k">:root</span> {'{'}
      {'\n'}
      {Object.entries(vars).map(([k, v]) => (
        <span key={k} className="th-line">
          {'  '}
          <span className="n">{k}</span>: {isColor(v) ? <i className="th-chip" style={{ background: v }} /> : null}
          {v};{'\n'}
        </span>
      ))}
      {'}'}
    </pre>
  )
}

function Row({ title, value, children }: { title: string; value: string; children: ReactNode }) {
  return (
    <div className="th-row">
      <div className="th-row-head">
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      {children}
    </div>
  )
}

export default function ThemesClient() {
  const [theme, setThemeState] = useState<StudioTheme>('paper')
  const picked = useRef(false)
  const { resolvedTheme } = useTheme()
  // Start in the site's own mode (Paper by day, Void by night) until the visitor picks one.
  useEffect(() => {
    if (!picked.current && resolvedTheme) setThemeState(resolvedTheme === 'dark' ? 'void' : 'paper')
  }, [resolvedTheme])
  const setTheme = (t: StudioTheme) => {
    picked.current = true
    setThemeState(t)
  }
  const [accent, setAccent] = useState<AccentName>('ion')
  const [custom, setCustom] = useState<Stops>({ a: '#7CF7FF', b: '#8B7CFF', c: '#FF7CE5' })
  const [format, setFormat] = useState<'css' | 'json'>('css')
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
  // The page follows the preview: Paper puts the stage in daylight, Void and Glass at night.
  const tone = theme === 'paper' ? 'tone-light' : 'tone-dark'

  return (
    <div className="flex flex-col gap-4">
      <section className={`th-stage ${tone}`} data-theme={theme} aria-label="Preview">
        <div className="th-panel" role="group" aria-label="Theme controls">
          <Row title="Theme" value={themeLabel[theme]}>
            <Segmented label="Theme" options={['void', 'paper', 'glass'] as const} value={theme} onChange={setTheme} format={(v) => themeLabel[v]} />
          </Row>

          <Row title="Accent" value={accentLabel[accent]}>
            <div className="th-accents" role="radiogroup" aria-label="Accent">
              {accentOrder.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={a === accent} aria-label={accentLabel[a]} title={accentLabel[a]} className="th-accent" style={{ background: gradient(presetStops[a]) }} onClick={() => setAccent(a)}>
                  {a === 'custom' ? <Plus size={16} strokeWidth={2} aria-hidden /> : null}
                </button>
              ))}
            </div>
          </Row>

          <div className="th-stops" data-open={accent === 'custom'} aria-hidden={accent !== 'custom'}>
            <div className="th-stops-inner">
              {(['a', 'b', 'c'] as const).map((k) => (
                <label key={k} className="th-stop">
                  <input type="color" value={custom[k]} aria-label={`Stop ${k}`} tabIndex={accent === 'custom' ? 0 : -1} onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value.toUpperCase() }))} />
                  <span>{custom[k]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="th-bar" aria-hidden style={{ background: `linear-gradient(90deg, ${resolved.colors.accent.a}, ${resolved.colors.accent.b}, ${resolved.colors.accent.c})` }} />

          <div className="th-export">
            <button type="button" className="th-btn" onClick={() => copy('json', json)}>
              {copied === 'json' ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
              {copied === 'json' ? 'Copied' : 'JSON'}
            </button>
            <button type="button" className="th-btn th-btn-ink" onClick={() => copy('css', css)}>
              {copied === 'css' ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
              {copied === 'css' ? 'Copied' : 'Copy CSS'}
            </button>
          </div>
        </div>

        <div className="th-screens">
          <ThemePreview theme={theme} accent={accent} custom={custom} />
        </div>
      </section>

      <div className="th-lower">
        <section className="ui-card th-card" aria-labelledby="palette">
          <div className="th-card-head">
            <h2 id="palette">Palette</h2>
            <span>
              {themeLabel[theme]} · {accentLabel[accent]}
            </span>
          </div>
          <div className="th-swatches">
            {swatches.map((s) => (
              <button key={s.key} type="button" className="th-swatch" onClick={() => copy(`sw-${s.key}`, s.value)} aria-label={`Copy ${s.key} ${s.value}`}>
                <i style={{ background: s.value }} />
                <span>{s.key}</span>
                <small>{copied === `sw-${s.key}` ? 'Copied' : s.value}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="ui-card th-card th-card-code" aria-labelledby="tokens">
          <div className="th-card-head">
            <h2 id="tokens">Tokens</h2>
            <div className="flex items-center gap-1">
              <Segmented size="sm" label="Format" options={['css', 'json'] as const} value={format} onChange={setFormat} format={(v) => v.toUpperCase()} />
              <button type="button" className="ui-icon-btn" aria-label={`Copy ${format.toUpperCase()}`} onClick={() => copy('code', format === 'css' ? css : json)}>
                {copied === 'code' ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.75} />}
              </button>
            </div>
          </div>
          {format === 'css' ? <CssLines vars={vars} /> : <pre className="th-code">{json}</pre>}
        </section>
      </div>
    </div>
  )
}
