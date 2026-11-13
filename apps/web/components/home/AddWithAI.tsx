'use client'
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Check, Copy } from 'lucide-react'
import { AI_MARK_EVEN_ODD, AI_MARK_PATHS, ClaudeMark, GeminiMark, GrokMark, OpenAIMark, type AiMark } from '@/components/site/BrandMarks'
import { CHIP_CORE, CHIP_RING } from '@/components/site/Logo'
import { devicePixelRatioCapped, ease, useCanvasLoop } from '@/components/fx/visible'
import { Reveal } from './Reveal'
import './add-with-ai.css'

/**
 * "Add it with your assistant": four cards, one per assistant, each on its own brand field.
 *
 * At rest each card shows the assistant's mark as a solid, lit shape: it floats, glows, and a band of light
 * sweeps across it. Hovering runs the install: the mark breaks into fine dots, nearest the pointer first,
 * they fly into Ondai's chip, and the chip sets solid and pulses at its core. Leaving reverses it. The pointer parts the dots it passes over. On touch screens the install
 * plays as the card reaches the middle of the screen, and a tap plays it again. Below the mark: the prompt
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
  /** One anti-aliased dot, pre-drawn in the brand colour at device resolution and stamped for every point. */
  sprite: HTMLCanvasElement | null
  spriteKey: string
  /** The solid shapes, drawn into `solid` (glyph-sized, device pixels) and lit before they go on screen. */
  solid: HTMLCanvasElement | null
  markPath: Path2D | null
  markEvenOdd: boolean
  ringPath: Path2D | null
  corePath: Path2D | null
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
    sprite: null,
    spriteKey: '',
    solid: null,
    markPath: null,
    markEvenOdd: false,
    ringPath: null,
    corePath: null,
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

/** A round dot with a soft rim, drawn at 2x its on-screen size so stamping it down keeps the edge smooth. */
function dotSprite(rgb: string, dot: number) {
  const px = Math.max(4, Math.ceil(dot * devicePixelRatioCapped() * 2))
  const c = document.createElement('canvas')
  c.width = c.height = px
  const g = c.getContext('2d')
  if (!g) return null
  const r = px / 2
  const grad = g.createRadialGradient(r, r, 0, r, r, r)
  grad.addColorStop(0, `rgba(${rgb},1)`)
  grad.addColorStop(0.62, `rgba(${rgb},1)`)
  grad.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = grad
  g.beginPath()
  g.arc(r, r, r, 0, Math.PI * 2)
  g.fill()
  return c
}

/** Points on a pitch-spaced grid inside `paths` (drawn into `rect` at `scale` from their own box). */
function sample(paths: Array<{ d: string; evenodd: boolean; tag: number }>, rect: Rect, scale: number, pitch: number) {
  const w = Math.ceil(rect.w)
  const h = Math.ceil(rect.h)
  if (!(w > 0 && h > 0)) return { x: [] as number[], y: [] as number[], tag: [] as number[] }
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

const smooth01 = (v: number) => {
  const x = Math.min(1, Math.max(0, v))
  return x * x * (3 - 2 * x)
}

type Shape = { path: Path2D | null; evenOdd: boolean; vb: number; scale: number; alpha: number }

/**
 * Draws shapes solid into the field's glyph box: the brand ink, lit from above, with a band of light sweeping
 * across every few seconds, then a soft glow of its own colour around it.
 */
function drawSolid(ctx: CanvasRenderingContext2D, s: Field, t: number, moving: boolean, alpha: number, shapes: Shape[], glow: number) {
  const o = s.solid
  const g = o?.getContext('2d')
  if (!o || !g) return
  const dpr = o.width / s.glyph.w
  const size = s.glyph.w
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.clearRect(0, 0, o.width, o.height)
  for (const sh of shapes) {
    if (!sh.path) continue
    const off = (size - sh.scale * sh.vb) / 2
    g.setTransform(dpr * sh.scale, 0, 0, dpr * sh.scale, dpr * off, dpr * off)
    g.globalAlpha = sh.alpha
    g.fillStyle = `rgb(${s.rgb})`
    g.fill(sh.path, sh.evenOdd ? 'evenodd' : 'nonzero')
  }
  // Light: brighter at the top, a little shade at the foot, and the sweeping band.
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-atop'
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  const shade = g.createLinearGradient(0, 0, 0, size)
  shade.addColorStop(0, 'rgba(255,255,255,0.22)')
  shade.addColorStop(0.55, 'rgba(255,255,255,0)')
  shade.addColorStop(1, 'rgba(0,0,0,0.16)')
  g.fillStyle = shade
  g.fillRect(0, 0, size, size)
  if (moving) {
    const cycle = (t % 4.2) / 4.2
    const x = -size * 0.6 + cycle * size * 2.6
    const band = g.createLinearGradient(x - size * 0.3, 0, x + size * 0.3, size * 0.5)
    band.addColorStop(0, 'rgba(255,255,255,0)')
    band.addColorStop(0.5, 'rgba(255,255,255,0.55)')
    band.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = band
    g.fillRect(0, 0, size, size)
  }
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = `rgba(${s.rgb},${glow})`
  ctx.shadowBlur = size * 0.12
  ctx.drawImage(o, s.glyph.x, s.glyph.y, size, size)
  ctx.restore()
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function AssistantCard({ a }: { a: Assistant }) {
  const cardRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const f = useRef<Field>(emptyField())
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const replay = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
      if (replay.current) clearTimeout(replay.current)
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
    // Mid-resize the stage can measure nothing; keep the last field until it has room again.
    if (!(size >= 24)) return
    const glyph = { x: sr.left - cr.left + (sr.width - size) / 2, y: sr.top - cr.top + (sr.height - size) / 2, w: size, h: size }
    // A fine, even grid: about 60 dots across the mark.
    const pitch = Math.max(3, size / 60)
    const dot = Math.max(1.6, pitch * 0.58)

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
    const solid = s.solid ?? document.createElement('canvas')
    solid.width = solid.height = Math.ceil(size * devicePixelRatioCapped())
    Object.assign(s, {
      ready: true, w, h, n, mx, my, cx, cy, core, phase, dot, glyph, delay: new Float32Array(n), colorAt: -1, spriteKey: '', solid,
      markPath: new Path2D(AI_MARK_PATHS[a.id]),
      markEvenOdd: AI_MARK_EVEN_ODD[a.id],
      ringPath: new Path2D(CHIP_RING),
      corePath: new Path2D(CHIP_CORE),
    })
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
      const key = `${s.rgb}/${s.dot}/${devicePixelRatioCapped()}`
      if (s.spriteKey !== key) {
        s.sprite = dotSprite(s.rgb, s.dot)
        s.spriteKey = key
      }
      const sprite = s.sprite
      if (!sprite) return
      // The install runs at a constant speed in both directions; under reduced motion it jumps.
      if (dt === 0) s.p = s.pTo
      else s.p = Math.min(1, Math.max(0, s.p + (s.pTo > s.p ? dt : -dt) / TRAVEL))
      s.near = ease(s.near, s.nearTo, dt, 0.25)
      s.fx = ease(s.fx, s.px, dt, 0.12)
      s.fy = ease(s.fy, s.py, dt, 0.12)

      ctx.clearRect(0, 0, w, h)
      const moving = dt !== 0
      // The mark breaks into dots as the install starts; the chip sets solid as the last dots land.
      const shatter = smooth01(s.p / 0.1)
      const set = smooth01((s.p - 0.86) / 0.14)
      // The whole stage floats, slowly.
      const g = s.glyph
      const gx = g.x + g.w / 2
      const gy = g.y + g.h / 2
      const breathe = moving ? 1 + 0.014 * Math.sin(t * 1.3) : 1
      ctx.save()
      ctx.translate(gx, gy + (moving ? Math.sin(t * 0.9) * 3 : 0))
      ctx.scale(breathe, breathe)
      ctx.translate(-gx, -gy)
      const glow = 0.5 + 0.5 * Math.sin(t * 1.6)
      if (shatter < 1) drawSolid(ctx, s, t, moving, 1 - shatter, [{ path: s.markPath, evenOdd: s.markEvenOdd, vb: 24, scale: g.w / 24, alpha: 1 }], 0.32 + 0.18 * glow)
      if (set > 0)
        drawSolid(ctx, s, t, moving, set, [
          { path: s.ringPath, evenOdd: true, vb: 100, scale: (g.w * 0.8) / 100, alpha: 1 },
          { path: s.corePath, evenOdd: false, vb: 100, scale: (g.w * 0.8) / 100, alpha: 0.55 + 0.45 * glow },
        ], 0.4 + 0.3 * glow)
      const dotsOn = shatter * (1 - set)
      if (dotsOn <= 0.001) {
        ctx.restore()
        return
      }
      const span = 1 + STAGGER
      const dot = s.dot
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
        // In flight the dots swell and brighten.
        let alpha = (0.8 + 0.2 * s.phase[i]!) * dotsOn
        if (e === 1 && s.core[i]) alpha *= pulse
        const k = dot * (1 + 0.5 * Math.sin(Math.PI * e))
        ctx.globalAlpha = alpha
        ctx.drawImage(sprite, x - k / 2, y - k / 2, k, k)
      }
      ctx.globalAlpha = 1
      ctx.restore()
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

  const install = (x: number, y: number) => {
    const s = f.current
    if (s.p === 0) aim(x, y)
    s.pTo = 1
    cardRef.current?.style.setProperty('--mx', `${x}px`)
    cardRef.current?.style.setProperty('--my', `${y}px`)
    cardRef.current?.setAttribute('data-active', '')
    loop.invalidate()
  }
  /** A tap on a touch screen sends the dots home and plays the install again from where the finger was. */
  const onTap = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch' || (e.target as Element).closest('button')) return
    const p = point(e)
    if (!p) return
    const s = f.current
    if (s.pTo === 1 && s.p > 0.5) {
      s.pTo = 0
      cardRef.current?.removeAttribute('data-active')
      loop.invalidate()
      if (replay.current) clearTimeout(replay.current)
      replay.current = setTimeout(() => install(p.x, p.y), TRAVEL * 1000 * 0.9)
    } else install(p.x, p.y)
  }

  // Touch screens have no hover: while the card is on screen the install plays on its own, over and over.
  // Mark, dots, chip, a beat, and back, each time from a different edge.
  const cycle = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const card = cardRef.current
    if (!card || typeof IntersectionObserver === 'undefined' || !window.matchMedia('(hover: none)').matches) return
    let turn = 0
    const stop = () => {
      if (cycle.current) clearTimeout(cycle.current)
      cycle.current = null
    }
    const forward = () => {
      const w = card.clientWidth
      const from = [
        [w / 2, 0],
        [w, card.clientHeight * 0.3],
        [w / 2, card.clientHeight * 0.6],
        [0, card.clientHeight * 0.3],
      ][turn++ % 4]!
      install(from[0]!, from[1]!)
      cycle.current = setTimeout(back, (TRAVEL + 2.2) * 1000)
    }
    const back = () => {
      onLeave()
      cycle.current = setTimeout(forward, (TRAVEL + 1.4) * 1000)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        stop()
        if (entry.isIntersecting) cycle.current = setTimeout(forward, 350)
        else onLeave()
      },
      { threshold: 0.45 },
    )
    io.observe(card)
    return () => {
      stop()
      io.disconnect()
    }
    // Set up once; the handlers only touch refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <article ref={cardRef} className="aiadd-card" data-brand={a.id} aria-labelledby={`aiadd-${a.id}`} onPointerEnter={onEnter} onPointerMove={move} onPointerLeave={(e) => e.pointerType !== 'touch' && onLeave()} onPointerUp={onTap}>
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
