'use client'
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Check, Copy } from 'lucide-react'
import { AI_MARK_EVEN_ODD, AI_MARK_PATHS, ClaudeMark, GeminiMark, GrokMark, OpenAIMark, type AiMark } from '@/components/site/BrandMarks'
import { CHIP_CORE, CHIP_RING } from '@/components/site/Logo'
import { ease, useCanvasLoop } from '@/components/fx/visible'
import { Reveal } from './Reveal'
import './add-with-ai.css'

/**
 * "Add it with your assistant": four cards, one per assistant, each on its own brand field.
 *
 * Each card draws the assistant's mark as a field of fine dots. Hovering it runs the install: the dots
 * leave the mark, nearest the pointer first, and gather into Ondai's chip, which then pulses at its core.
 * Leaving the card sends them home. The pointer parts the dots it passes over. Below the mark: the prompt
 * to paste, and the assistant's own transcript of running the install.
 *
 * The brand colours are the one exception to the site's black and white.
 */

type Assistant = {
  id: AiMark
  name: string
  Mark: ComponentType<{ className?: string; size?: number }>
  prompt: string
  /** How this assistant prints a shell call in its transcript. */
  tool: string
  wrap: boolean
  component: string
  title: string
}

const ASSISTANTS: Assistant[] = [
  {
    id: 'claude',
    name: 'Claude',
    Mark: ClaudeMark,
    prompt: "Add Ondai's CommandBar to my Expo app.",
    tool: 'Bash',
    wrap: true,
    component: 'command-bar',
    title: 'CommandBar',
  },
  {
    id: 'openai',
    name: 'Codex',
    Mark: OpenAIMark,
    prompt: 'Put a Summarize button on my notes screen.',
    tool: 'Ran',
    wrap: false,
    component: 'summarize',
    title: 'Summarize',
  },
  {
    id: 'grok',
    name: 'Grok',
    Mark: GrokMark,
    prompt: 'Let people dictate into the composer, offline.',
    tool: 'Run',
    wrap: false,
    component: 'voice-input',
    title: 'VoiceInput',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    Mark: GeminiMark,
    prompt: 'Suggest replies in my chat with Gemini Nano.',
    tool: 'Shell',
    wrap: false,
    component: 'smart-reply',
    title: 'SmartReply',
  },
]

export function AddWithAI() {
  return (
    <section className="section home-section aiadd" aria-labelledby="aiadd-title">
      <div className="wrap">
        <header className="aiadd-head">
          <h2 id="aiadd-title" className="home-h2">
            Add it with your assistant.
          </h2>
          <p className="home-sub">Copy a prompt into Claude, Codex, Grok or Gemini. It reads the docs and runs the install.</p>
        </header>
        <Reveal className="aiadd-reveal">
          <ul className="aiadd-grid">
            {ASSISTANTS.map((a, i) => (
              <li key={a.id} className="aiadd-item" style={{ '--i': i } as CSSProperties}>
                <AssistantCard a={a} />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* One card                                                             */
/* ------------------------------------------------------------------ */

type Rect = { x: number; y: number; w: number; h: number }

/**
 * The dot field. Every dot has two homes: a point of the assistant's mark and a point of Ondai's chip.
 * Both point sets are sorted by angle around the centre, so dot i of the mark travels to dot i of the chip
 * and the whole field turns as one while it changes shape.
 */
type Field = {
  ready: boolean
  w: number
  h: number
  n: number
  /** Home in the mark, home in the chip (CSS px). */
  mx: Float32Array
  my: Float32Array
  cx: Float32Array
  cy: Float32Array
  /** 1 for the dots that form the chip's core (they pulse once the chip has formed). */
  core: Uint8Array
  /** When each dot leaves, 0..STAGGER: dots nearest the pointer's way in go first. */
  delay: Float32Array
  /** A per-dot phase for the resting breath and the side of its arc. */
  phase: Float32Array
  dot: number
  glyph: Rect
  rgb: string
  colorAt: number
  /** The install, 0 (the mark) to 1 (the chip), moved at a constant speed and eased per dot. */
  p: number
  pTo: number
  /** Pointer, eased in the frame loop; `near` fades the push in and out. */
  px: number
  py: number
  fx: number
  fy: number
  near: number
  nearTo: number
}

function emptyField(): Field {
  return {
    ready: false,
    w: 0,
    h: 0,
    n: 0,
    mx: new Float32Array(0),
    my: new Float32Array(0),
    cx: new Float32Array(0),
    cy: new Float32Array(0),
    core: new Uint8Array(0),
    delay: new Float32Array(0),
    phase: new Float32Array(0),
    dot: 1.6,
    glyph: { x: 0, y: 0, w: 0, h: 0 },
    rgb: '255,255,255',
    colorAt: -1,
    p: 0,
    pTo: 0,
    px: 0,
    py: 0,
    fx: 0,
    fy: 0,
    near: 0,
    nearTo: 0,
  }
}

/** A small seeded random, so every card draws the same field on every visit. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEEDS: Record<AiMark, number> = { claude: 11, openai: 23, grok: 37, gemini: 53 }
/** Seconds for the whole field to move from the mark to the chip. */
const TRAVEL = 1.15
/** How much of the travel is spent waiting for the far dots to leave. */
const STAGGER = 0.5
/** Pointer push: radius and strength (CSS px). */
const PUSH_R = 52
const PUSH = 12

/** Points on a pitch-spaced grid inside `paths` (drawn into `rect` at `scale` from their own box). */
function sample(paths: Array<{ d: string; evenodd: boolean; tag: number }>, rect: Rect, scale: number, pitch: number) {
  const w = Math.ceil(rect.w)
  const h = Math.ceil(rect.h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { x: [] as number[], y: [] as number[], tag: [] as number[] }
  const xs: number[] = []
  const ys: number[] = []
  const tags: number[] = []
  // One pass per path, so each point knows which part of the shape it belongs to.
  for (const p of paths) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.setTransform(scale, 0, 0, scale, (w - scale * (p.tag === 2 ? 24 : 100)) / 2, (h - scale * (p.tag === 2 ? 24 : 100)) / 2)
    ctx.fillStyle = '#fff'
    ctx.fill(new Path2D(p.d), p.evenodd ? 'evenodd' : 'nonzero')
    const data = ctx.getImageData(0, 0, w, h).data
    for (let y = pitch / 2; y < h; y += pitch)
      for (let x = pitch / 2; x < w; x += pitch) {
        if (data[((y | 0) * w + (x | 0)) * 4 + 3] < 140) continue
        xs.push(rect.x + x)
        ys.push(rect.y + y)
        tags.push(p.tag)
      }
  }
  return { x: xs, y: ys, tag: tags }
}

/** Indices of the points sorted by angle around (ox, oy), then by distance: a stable walk round the shape. */
function byAngle(x: number[], y: number[], ox: number, oy: number) {
  return x
    .map((_, i) => i)
    .sort((a, b) => {
      const da = Math.atan2(y[a]! - oy, x[a]! - ox) - Math.atan2(y[b]! - oy, x[b]! - ox)
      return da !== 0 ? da : Math.hypot(x[a]! - ox, y[a]! - oy) - Math.hypot(x[b]! - ox, y[b]! - oy)
    })
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function AssistantCard({ a }: { a: Assistant }) {
  const cardRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const f = useRef<Field>(emptyField())
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const build = (w: number, h: number) => {
    const s = f.current
    const card = cardRef.current
    const stage = stageRef.current
    if (!card || !stage || w <= 0 || h <= 0) return

    // The mark sits in the stage: the space between the name and the prompt.
    const cr = card.getBoundingClientRect()
    const sr = stage.getBoundingClientRect()
    const size = Math.min(sr.width * 0.8, sr.height * 0.84, 250)
    const glyph = { x: sr.left - cr.left + (sr.width - size) / 2, y: sr.top - cr.top + (sr.height - size) / 2, w: size, h: size }
    const pitch = Math.max(4, Math.round(size / 46))
    const dot = Math.max(1.4, pitch * 0.34)

    const mark = sample([{ d: AI_MARK_PATHS[a.id], evenodd: AI_MARK_EVEN_ODD[a.id], tag: 2 }], glyph, size / 24, pitch)
    // The chip a little smaller than the mark, so the field gathers in as it installs.
    const chip = sample(
      [
        { d: CHIP_RING, evenodd: true, tag: 0 },
        { d: CHIP_CORE, evenodd: false, tag: 1 },
      ],
      glyph,
      (size * 0.8) / 100,
      pitch,
    )
    if (!mark.x.length || !chip.x.length) return

    const ox = glyph.x + size / 2
    const oy = glyph.y + size / 2
    const mi = byAngle(mark.x, mark.y, ox, oy)
    const ci = byAngle(chip.x, chip.y, ox, oy)
    const n = Math.max(mi.length, ci.length)
    const r = rng(SEEDS[a.id])
    const mx = new Float32Array(n)
    const my = new Float32Array(n)
    const cx = new Float32Array(n)
    const cy = new Float32Array(n)
    const core = new Uint8Array(n)
    const phase = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      // The larger set is walked once; the smaller one is spread evenly across it (some homes are shared).
      const m = mi[Math.floor((i * mi.length) / n)]!
      const c = ci[Math.floor((i * ci.length) / n)]!
      mx[i] = mark.x[m]!
      my[i] = mark.y[m]!
      cx[i] = chip.x[c]!
      cy[i] = chip.y[c]!
      core[i] = chip.tag[c] === 1 ? 1 : 0
      phase[i] = r()
    }
    Object.assign(s, { ready: true, w, h, n, mx, my, cx, cy, core, phase, dot, glyph, delay: new Float32Array(n), colorAt: -1 })
    aim(s.px || ox, s.py || oy + size)
  }

  /** Orders the departure from a point: the dots nearest it leave first. */
  const aim = (x: number, y: number) => {
    const s = f.current
    if (!s.n) return
    let far = 1
    const d = new Float32Array(s.n)
    for (let i = 0; i < s.n; i++) {
      d[i] = Math.hypot(s.mx[i]! - x, s.my[i]! - y)
      if (d[i]! > far) far = d[i]!
    }
    for (let i = 0; i < s.n; i++) s.delay[i] = (d[i]! / far) * STAGGER
  }

  const loop = useCanvasLoop(canvasRef, {
    onResize: build,
    draw(ctx, w, h, t, dt) {
      const s = f.current
      if (!s.ready) return
      const card = cardRef.current
      if (card && (s.colorAt < 0 || t - s.colorAt > 0.5 || dt === 0)) {
        const v = getComputedStyle(card).getPropertyValue('--ai-line-rgb').trim()
        if (v) s.rgb = v.replace(/\s+/g, ',')
        s.colorAt = t
      }
      // The install runs at a constant speed in both directions; under reduced motion it jumps.
      if (dt === 0) s.p = s.pTo
      else s.p = Math.min(1, Math.max(0, s.p + (s.pTo > s.p ? dt : -dt) / TRAVEL))
      s.near = ease(s.near, s.nearTo, dt, 0.25)
      s.fx = ease(s.fx, s.px, dt, 0.12)
      s.fy = ease(s.fy, s.py, dt, 0.12)

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = `rgb(${s.rgb})`
      const span = 1 + STAGGER
      const dot = s.dot
      const half = dot / 2
      const swirl = s.glyph.w * 0.16
      const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.6))
      const push = s.near > 0.01 && dt !== 0
      for (let i = 0; i < s.n; i++) {
        const local = Math.min(1, Math.max(0, s.p * span - s.delay[i]!))
        const e = easeInOut(local)
        const ax = s.mx[i]!
        const ay = s.my[i]!
        const bx = s.cx[i]!
        const by = s.cy[i]!
        // In flight each dot bows off the straight line, all to the same side: the field turns as it moves.
        const lx = bx - ax
        const ly = by - ay
        const len = Math.hypot(lx, ly) || 1
        const bow = Math.sin(Math.PI * e) * swirl * (0.6 + 0.4 * s.phase[i]!)
        let x = ax + lx * e - (ly / len) * bow
        let y = ay + ly * e + (lx / len) * bow
        // At rest the mark breathes, barely.
        if (dt !== 0 && (e === 0 || e === 1)) {
          const ph = s.phase[i]! * 6.283
          x += Math.sin(t * 0.9 + ph) * 0.45
          y += Math.cos(t * 1.1 + ph) * 0.45
        }
        if (push) {
          const dx = x - s.fx
          const dy = y - s.fy
          const d = Math.hypot(dx, dy)
          if (d < PUSH_R && d > 0.01) {
            const k = (1 - d / PUSH_R) ** 2 * PUSH * s.near
            x += (dx / d) * k
            y += (dy / d) * k
          }
        }
        let alpha = e === 0 ? 0.62 : e === 1 ? 0.92 : 0.95
        if (e === 1 && s.core[i]) alpha *= pulse
        ctx.globalAlpha = alpha
        ctx.fillRect(x - half, y - half, dot, dot)
      }
      ctx.globalAlpha = 1
    },
  })

  // The stage can change height without the card doing so (a web font arriving rewraps the prompt).
  const buildRef = useRef(build)
  buildRef.current = build
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === 'undefined') return
    let last = -1
    const ro = new ResizeObserver(() => {
      const s = f.current
      const hgt = stage.offsetHeight
      if (!s.ready || hgt === last) return
      last = hgt
      buildRef.current(s.w, s.h)
      loop.invalidate()
    })
    ro.observe(stage)
    return () => ro.disconnect()
  }, [loop])

  const point = (e: ReactPointerEvent<HTMLElement>) => {
    const card = cardRef.current
    if (!card) return null
    const r = card.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onEnter = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return
    const s = f.current
    const p = point(e)
    if (!p) return
    // Only a fresh install re-orders the departure; coming back mid-way keeps the motion continuous.
    if (s.p === 0) aim(p.x, p.y)
    s.px = s.fx = p.x
    s.py = s.fy = p.y
    s.pTo = 1
    s.nearTo = 1
    cardRef.current?.setAttribute('data-active', '')
    loop.invalidate()
  }
  const move = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return
    const p = point(e)
    if (!p) return
    const s = f.current
    s.px = p.x
    s.py = p.y
    cardRef.current?.style.setProperty('--mx', `${p.x}px`)
    cardRef.current?.style.setProperty('--my', `${p.y}px`)
    loop.invalidate()
  }
  const onLeave = () => {
    const s = f.current
    s.pTo = 0
    s.nearTo = 0
    cardRef.current?.removeAttribute('data-active')
    loop.invalidate()
  }

  const copy = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const text = `${a.prompt} Read ${origin}/llms.txt, then run npx ondai add ${a.component}.`
    void navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }

  const call = `npx ondai add ${a.component}`
  const Mark = a.Mark
  return (
    <article ref={cardRef} className="aiadd-card" data-brand={a.id} aria-labelledby={`aiadd-${a.id}`} onPointerEnter={onEnter} onPointerMove={move} onPointerLeave={onLeave}>
      <span className="aiadd-field" aria-hidden />
      <span className="aiadd-glow" aria-hidden />
      <canvas ref={canvasRef} className="aiadd-canvas" aria-hidden />
      <span className="aiadd-grain" aria-hidden />
      <span className="aiadd-sheen" aria-hidden />

      <header className="aiadd-name">
        <Mark className="aiadd-mark" size={20} />
        <h3 id={`aiadd-${a.id}`}>{a.name}</h3>
      </header>
      <div ref={stageRef} className="aiadd-stage" />

      <div className="aiadd-body">
        <p className="aiadd-prompt">{a.prompt}</p>
        <div className="aiadd-pane" aria-label={`${a.name} runs ${call} and adds ${a.title}`}>
          <p className="aiadd-call">
            <span className="aiadd-dot" aria-hidden />
            <span className="aiadd-line">
              <b>{a.tool}</b>
              {a.wrap ? `(${call})` : ` ${call}`}
            </span>
          </p>
          <p className="aiadd-result">
            <span className="aiadd-elbow" aria-hidden />
            <span className="aiadd-line">
              Added <b>{a.title}</b>
              <span className="aiadd-path">components/ondai/{a.component}</span>
            </span>
          </p>
        </div>
        <button type="button" className="aiadd-copy" onClick={copy} aria-label={copied ? 'Copied' : `Copy the prompt for ${a.name}`}>
          <span className="aiadd-copy-label">{copied ? 'Copied' : 'Copy prompt'}</span>
          <span className="aiadd-copy-icon" aria-hidden>
            {copied ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
          </span>
        </button>
      </div>
    </article>
  )
}
