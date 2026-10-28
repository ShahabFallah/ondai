'use client'
import { useEffect, useRef, useState } from 'react'
import { useVisible } from '@/components/fx/useVisible'

/** Runs `step` on a timer chain while the element is on screen; resets to `initial` when it leaves. */
function useLoop<T>(initial: T, next: (s: T) => [T, number], firstDelay: number) {
  const ref = useRef<HTMLDivElement>(null)
  const { visible, reduced } = useVisible(ref, { rootMargin: '0px' })
  const [state, setState] = useState(initial)
  const nextRef = useRef(next)
  nextRef.current = next
  useEffect(() => {
    if (!visible || reduced) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    let cur = initial
    const tick = () => {
      if (!alive) return
      const [s, ms] = nextRef.current(cur)
      cur = s
      setState(s)
      timer = setTimeout(tick, ms)
    }
    timer = setTimeout(tick, firstDelay)
    return () => {
      alive = false
      clearTimeout(timer)
      setState(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduced])
  return { ref, state, reduced }
}

/* 1. A terminal that types the install command and prints what it added. */
const CMD = 'npx ondai add summarize'
const OUT = ['+ components/ondai/summarize.tsx', '+ components/ondai/streaming-text.tsx', 'Done. 2 files, 0 servers.']

export function TerminalVisual() {
  // n counts typed characters, then printed output lines after CMD.length.
  const total = CMD.length + OUT.length
  const { ref, state: n, reduced } = useLoop(0, (s) => {
    if (s < CMD.length) return [s + 1, s + 1 === CMD.length ? 520 : 38 + Math.round(Math.random() * 40)]
    if (s < total) return [s + 1, s + 1 === total ? 2600 : 260]
    return [0, 500]
  }, 500)
  const shown = reduced ? total : n
  const typed = CMD.slice(0, Math.min(shown, CMD.length))
  const lines = OUT.slice(0, Math.max(0, shown - CMD.length))
  return (
    <div ref={ref} className="term" aria-label={`Terminal: ${CMD}`} role="img">
      <div className="term-bar" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="term-body" aria-hidden>
        <div>
          <span className="term-prompt">~/app $</span> {typed}
          {shown <= CMD.length && <span className="term-caret" />}
        </div>
        {lines.map((l, i) => (
          <div key={l} className={i === OUT.length - 1 ? 'term-done' : 'term-out'}>
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}

/* 2. The router: one call, three models, the one this phone has lights up. */
const models = [
  { name: 'Apple', on: 'iPhone' },
  { name: 'Gemini Nano', on: 'Pixel' },
  { name: 'Llama', on: 'any phone' },
]
const ys = [20, 60, 100]

export function RouterVisual() {
  const { ref, state: pick } = useLoop(0, (s) => [(s + 1) % models.length, 2200], 2200)
  return (
    <div ref={ref} className="route" role="img" aria-label="The runtime routes each call to Apple Foundation Models, Gemini Nano or Llama, whichever the phone has">
      <div className="route-src" aria-hidden>
        <span className="route-src-dot" />
        summarize()
      </div>
      <svg className="route-wires" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden>
        {ys.map((y, i) => (
          <path key={y} d={`M0 60 C 50 60, 50 ${y}, 100 ${y}`} data-on={i === pick ? 'true' : undefined} vectorEffect="non-scaling-stroke" pathLength={1} />
        ))}
      </svg>
      <ul className="route-dst" aria-hidden>
        {models.map((m, i) => (
          <li key={m.name} data-on={i === pick ? 'true' : undefined}>
            <span className="route-name">{m.name}</span>
            <span className="route-on">{m.on}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Streams `text` in over `ms`, word by word, the way tokens arrive. */
function Typer({ text, ms }: { text: string; ms: number }) {
  const words = text.split(' ')
  const [n, setN] = useState(0)
  useEffect(() => {
    const step = ms / words.length
    const t = setInterval(() => setN((k) => (k >= words.length ? k : k + 1)), step)
    return () => clearInterval(t)
  }, [ms, words.length])
  return (
    <>
      {words.slice(0, n).join(' ')}
      <span className="term-caret states-caret" />
    </>
  )
}

/* 3. One response walking through its states. */
const states = [
  { id: 'idle', ms: 1500 },
  { id: 'thinking', ms: 1500 },
  { id: 'streaming', ms: 2300 },
  { id: 'done', ms: 2200 },
] as const
const ANSWER = 'Venue is set for Friday at noon. Budget is in, headcount due Wednesday.'

export function StatesVisual() {
  const { ref, state: i, reduced } = useLoop(0, (s) => {
    const n = (s + 1) % states.length
    return [n, states[n]!.ms]
  }, states[0].ms)
  const cur = reduced ? 3 : i
  const id = states[cur]!.id
  return (
    <div ref={ref} className="states" role="img" aria-label="A response moving through idle, thinking, streaming and done">
      <div className="states-card" data-state={id} aria-hidden>
        {id === 'idle' && (
          <div className="states-idle">
            <span />
            <span />
          </div>
        )}
        {id === 'thinking' && (
          <div className="states-think">
            <span className="states-dots">
              <i />
              <i />
              <i />
            </span>
            Thinking
          </div>
        )}
        {(id === 'streaming' || id === 'done') && (
          <p className="states-text">
            {id === 'streaming' ? <Typer text={ANSWER} ms={1800} /> : ANSWER}
          </p>
        )}
        {id === 'done' && <span className="states-foot">On device · 0.4 s</span>}
      </div>
      <ol className="states-strip" aria-hidden>
        {states.map((s, k) => (
          <li key={s.id} data-on={k === cur ? 'true' : undefined} data-past={k < cur ? 'true' : undefined} style={{ ['--ms' as string]: `${s.ms}ms` }}>
            {s.id}
          </li>
        ))}
      </ol>
    </div>
  )
}
