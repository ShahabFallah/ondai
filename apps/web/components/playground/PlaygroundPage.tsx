'use client'
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, Copy, RotateCcw } from 'lucide-react'
import type { PlaygroundDef, PlaygroundQuery, PlaygroundTheme } from '@ondai/playground'
import { decodeQuery, encodeQuery, defaultCode } from '@ondai/playground'
import { playgrounds, type PlaygroundName } from '@ondai/registry/playgrounds'
import { Segmented } from '../ui/Segmented'
import { useIndicator } from '../ui/useIndicator'
import { PropsTable, Switch } from './PropsTable'
import { Preview } from './Preview'
import '../ui/ui.css'
import './playground.css'

const stateOrder = ['idle', 'focus', 'thinking', 'streaming', 'tool', 'confirm', 'done', 'error', 'refusal', 'unavailable', 'preparing']
const themeLabel: Record<string, string> = { void: 'Void', paper: 'Paper', glass: 'Glass' }
const accentLabel: Record<string, string> = { ion: 'Ion', mono: 'Mono', aurora: 'Aurora', ember: 'Ember' }
const deviceLabel: Record<string, string> = { apple: 'Apple', nano: 'Nano', llama: 'Llama', unavailable: 'No model' }
const frameLabel: Record<string, string> = { none: 'None', iphone: 'iPhone', android: 'Android' }

type PageLink = { name: string; title: string }
export type PlaygroundMeta = { line?: string; category?: string; prev?: PageLink; next?: PageLink }

function useCopy() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 1500)
    return () => clearTimeout(t)
  }, [done])
  return {
    done,
    copy: (text: string) => {
      void navigator.clipboard?.writeText(text).catch(() => {})
      setDone(true)
    },
  }
}

function InstallCommand({ command }: { command: string }) {
  const { done, copy } = useCopy()
  return (
    <button type="button" className="pg-install" onClick={() => copy(command)} aria-label={done ? 'Copied' : `Copy ${command}`}>
      <i aria-hidden>$</i>
      <span>{command}</span>
      <b aria-hidden>{done ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}</b>
    </button>
  )
}

/** A whisper of syntax colour: keywords recede, tags and strings stand forward. */
function highlight(code: string): ReactNode[] {
  const re = /('[^'\n]*'|"[^"\n]*"|`[^`]*`)|(<\/?[A-Za-z][\w.]*)|\b(import|from|export|const|let|function|return|await|async|true|false|null|undefined)\b/g
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of code.matchAll(re)) {
    if (m.index > last) out.push(code.slice(last, m.index))
    out.push(
      <span key={i++} className={m[1] ? 's' : m[2] ? 't' : 'k'}>
        {m[0]}
      </span>,
    )
    last = m.index + m[0].length
  }
  out.push(code.slice(last))
  return out
}

function CodeCard({ code, file }: { code: string; file: string }) {
  const { done, copy } = useCopy()
  const lines = useMemo(() => highlight(code), [code])
  return (
    <section className="ui-card pg-code" aria-label="Code">
      <div className="pg-code-head">
        <span>{file}</span>
        <button type="button" className="ui-icon-btn" aria-label={done ? 'Copied' : 'Copy code'} onClick={() => copy(code)}>
          {done ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.75} />}
        </button>
      </div>
      <pre>{lines}</pre>
    </section>
  )
}

function StateTabs({ states, value, onChange }: { states: string[]; value: string; onChange: (s: string) => void }) {
  const { ref, style, animate } = useIndicator<HTMLDivElement>(value)
  return (
    <div ref={ref} role="tablist" aria-label="State" className="pg-tabs">
      <span aria-hidden className="ui-ind pg-tab-ind" data-animate={animate} style={style} />
      {states.map((s) => (
        <button key={s} type="button" role="tab" aria-selected={s === value} data-active={s === value} className="pg-tab" onClick={() => onChange(s)}>
          {s}
        </button>
      ))}
    </div>
  )
}

export function PlaygroundPage({ name, meta }: { name: string; meta?: PlaygroundMeta }) {
  const [def, setDef] = useState<PlaygroundDef | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState(0)
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()

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

  const decoded = useMemo(() => (def ? decodeQuery(def, params) : null), [def, params])
  // Outside embeds, a URL without `theme` previews in the site's own mode: Paper in light, Void in dark.
  const siteTheme: PlaygroundTheme | null = resolvedTheme ? (resolvedTheme === 'dark' ? 'void' : 'paper') : null
  const themeInUrl = params.has('theme')
  const query = useMemo(() => {
    if (!decoded || decoded.embed || themeInUrl || !siteTheme) return decoded
    return { ...decoded, theme: siteTheme }
  }, [decoded, themeInUrl, siteTheme])

  const setQuery = useCallback(
    (next: PlaygroundQuery) => {
      if (!def) return
      const sp = new URLSearchParams(encodeQuery(def, next))
      if (!next.embed) {
        // Keep following the site until the visitor picks a theme; once picked, always write it.
        const picked = themeInUrl || (query && next.theme !== query.theme)
        if (picked) sp.set('theme', next.theme)
        else sp.delete('theme')
      }
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [def, pathname, router, query, themeInUrl],
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
  // Wait for the site mode so the stage never flashes the wrong theme.
  if (!themeInUrl && !siteTheme) return <p className="ondai-waiting p-8 text-[14px] text-[color:var(--ondai-text-tertiary)]">Loading the playground…</p>

  const set = (patch: Partial<PlaygroundQuery>) => setQuery({ ...query, ...patch })
  const rank = (s: string) => (stateOrder.indexOf(s) === -1 ? 100 : stateOrder.indexOf(s))
  const states = Object.keys(def.states).sort((a, b) => rank(a) - rank(b))
  const stateInfo = def.states[query.state]?.description
  const tone = query.theme === 'paper' ? 'tone-light' : 'tone-dark'
  const tpsFill = `${((query.tps - 5) / 195) * 100}%`

  return (
    <div className="pb-8">
      <header className="pt-2">
        <nav className="pg-crumbs" aria-label="Breadcrumb">
          <Link href="/playground">Playground</Link>
          {meta?.category ? (
            <Fragment>
              <ChevronRight size={13} strokeWidth={1.75} aria-hidden />
              <span>{meta.category}</span>
            </Fragment>
          ) : null}
        </nav>
        <h1 className="ui-title">{def.title}</h1>
        <p className="ui-sub mt-3 max-w-[60ch]">{meta?.line ?? def.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <InstallCommand command={`npx ondai add ${def.name}`} />
          <Link href={`/docs/components/${def.name}`} className="pg-link-btn">
            Docs
            <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </header>

      <div className="mt-10">
        <StateTabs states={states} value={query.state} onChange={(state) => set({ state })} />
        <p className="label mt-3 min-h-5">{stateInfo ?? ' '}</p>
      </div>

      <section className="ui-card pg-preview mt-4" aria-label="Preview">
        <div className="pg-toolbar" role="group" aria-label="Preview settings">
          <div className="pg-tool">
            <span>Theme</span>
            <Segmented size="sm" options={['void', 'paper', 'glass'] as const} value={query.theme} onChange={(theme) => set({ theme })} label="Theme" format={(v) => themeLabel[v] ?? v} />
          </div>
          <div className="pg-tool">
            <span>Accent</span>
            <Segmented size="sm" options={['ion', 'mono', 'aurora', 'ember'] as const} value={query.accent} onChange={(accent) => set({ accent })} label="Accent" format={(v) => accentLabel[v] ?? v} />
          </div>
          <div className="pg-tool">
            <span>Device</span>
            <Segmented size="sm" options={['apple', 'nano', 'llama', 'unavailable'] as const} value={query.device} onChange={(device) => set({ device })} label="Simulated device" format={(v) => deviceLabel[v] ?? v} />
          </div>
          <div className="pg-tool">
            <span>Frame</span>
            <Segmented size="sm" options={['none', 'iphone', 'android'] as const} value={query.frame} onChange={(frame) => set({ frame })} label="Frame" format={(v) => frameLabel[v] ?? v} />
          </div>
          <div className="pg-tool-end">
            <label className="pg-tool">
              <span>Motion</span>
              <Switch checked={query.motion === 'system'} onChange={(on) => set({ motion: on ? 'system' : 'off' })} label="Motion" />
            </label>
            <label className="pg-tool">
              <span>Speed</span>
              <input type="range" className="ui-range w-24" style={{ ['--fill' as string]: tpsFill }} min={5} max={200} step={5} value={query.tps} onChange={(e) => set({ tps: Number(e.target.value) })} aria-label="Mock speed, tokens per second" />
              <span className="w-[62px] font-mono text-[12px] text-[color:var(--fg-2)] tabular-nums">{query.tps} tok/s</span>
            </label>
          </div>
        </div>
        <div className={`pg-stage ${tone}`} data-preview={query.theme}>
          <div className="pg-stage-bar">
            <span className="pg-stage-tag">simulated · {deviceLabel[query.device]?.toLowerCase()}</span>
            <button type="button" className="ui-icon-btn" aria-label="Replay" title="Replay" onClick={() => setRun((n) => n + 1)}>
              <RotateCcw size={15} strokeWidth={1.75} />
            </button>
          </div>
          <Preview key={run} def={def} query={query} />
        </div>
      </section>

      <div className="mt-4">
        <CodeCard code={code} file={`${def.name}.tsx`} />
      </div>

      <section className="mt-14" aria-labelledby="props">
        <h2 id="props" className="text-[20px] font-[560] tracking-[-0.015em]">
          Props
        </h2>
        <p className="label mt-1">Every change lands in the URL. Share the state, not a screenshot.</p>
        <div className="mt-5">
          <PropsTable def={def} query={query} onChange={setQuery} />
        </div>
      </section>

      {meta?.prev || meta?.next ? (
        <nav className="pg-pager mt-14" aria-label="More components">
          {meta.prev ? (
            <Link href={`/playground/${meta.prev.name}`} data-dir="prev">
              <small>
                <ArrowLeft size={13} strokeWidth={1.75} aria-hidden />
                Previous
              </small>
              <span>{meta.prev.title}</span>
            </Link>
          ) : null}
          {meta.next ? (
            <Link href={`/playground/${meta.next.name}`} data-dir="next">
              <small>
                Next
                <ArrowRight size={13} strokeWidth={1.75} aria-hidden />
              </small>
              <span>{meta.next.title}</span>
            </Link>
          ) : null}
        </nav>
      ) : null}

      <p className="label mt-10 text-[color:var(--fg-3)]">Simulated output. On a phone, the same component runs on the phone&apos;s own model.</p>
    </div>
  )
}
