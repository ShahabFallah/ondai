'use client'
import { useRef, type CSSProperties } from 'react'
import { clamp01, ease, ION, mixRgb, rgba, toRgb, useCanvasLoop } from './visible'

/**
 * ThinkingOrb: a glass sphere with living light inside.
 *
 * Canvas 2D. Soft discs (radial gradients, additive) orbit inside a circular clip over a near-black
 * core; a rim vignette, a top-left specular arc and a bottom caustic make it read as a sphere, and a
 * faint halo spills outside it. Every state is a set of target parameters that ease over ~400 ms.
 * Colour lives in the light, never in the fill.
 */

export type OrbState = 'idle' | 'thinking' | 'listening' | 'speaking' | 'done'

export interface ThinkingOrbProps {
  /** What the model is doing. Default `thinking`. */
  state?: OrbState
  /** Layout size in CSS px (the halo spills ~25% outside it). Default 64. Reads at 20 inline and 200 hero. */
  size?: number
  /** Three light colours. Default: the ion stops. */
  colors?: [string, string, string]
  /** Motion multiplier. Default 1. */
  speed?: number
  /** 0–1 input level (number or getter) that pushes the light outward while `listening`. */
  level?: number | (() => number)
  /** Stop the loop; the last frame stays. */
  paused?: boolean
  className?: string
  style?: CSSProperties
  /** Accessible name. Without it the orb is decorative (`aria-hidden`). */
  label?: string
}

interface Params {
  active: number
  swirl: number
  orbit: number
  radius: number
  bright: number
  pulseAmp: number
  pulseHz: number
  sparks: number
  merge: number
  core: number
  push: number
  halo: number
}

const STATES: Record<OrbState, Params> = {
  idle: { active: 3, swirl: 0.32, orbit: 0.3, radius: 0.56, bright: 0.72, pulseAmp: 0.07, pulseHz: 0.22, sparks: 0, merge: 0, core: 0.05, push: 0, halo: 0.5 },
  thinking: { active: 7, swirl: 1.35, orbit: 0.4, radius: 0.46, bright: 0.92, pulseAmp: 0.04, pulseHz: 0.55, sparks: 1, merge: 0, core: 0.1, push: 0, halo: 0.75 },
  listening: { active: 5, swirl: 0.55, orbit: 0.26, radius: 0.5, bright: 0.85, pulseAmp: 0, pulseHz: 0.4, sparks: 0, merge: 0, core: 0.22, push: 1, halo: 0.7 },
  speaking: { active: 5, swirl: 0.75, orbit: 0.3, radius: 0.5, bright: 1, pulseAmp: 0.2, pulseHz: 2.5, sparks: 0, merge: 0, core: 0.85, push: 0, halo: 1 },
  done: { active: 3, swirl: 0.12, orbit: 0.02, radius: 0.64, bright: 0.85, pulseAmp: 0.03, pulseHz: 0.18, sparks: 0, merge: 1, core: 0.6, push: 0, halo: 0.7 },
}

const KEYS = Object.keys(STATES.idle) as (keyof Params)[]
const SLOTS = 8
const SPARKS = 10
const TAU = 0.13 // ~95 % of a state change lands within 400 ms

/** Deterministic per-slot character so every orb looks the same on every mount. */
function slotSeed(i: number, k: number): number {
  let h = (i + 1) * 374761393 + (k + 1) * 668265263
  h = (h ^ (h >>> 13)) * 1274126177
  h ^= h >>> 16
  return ((h >>> 0) % 10000) / 10000
}

interface Slot {
  angle: number
  speed: number
  orbitMul: number
  sizeMul: number
  wobbleF: number
  wobbleA: number
  wobbleP: number
  mix: number
  weight: number
}

interface Spark {
  born: number
  life: number
  x: number
  y: number
  size: number
  col: number
}

function makeSlots(): Slot[] {
  const out: Slot[] = []
  for (let i = 0; i < SLOTS; i++) {
    const dir = slotSeed(i, 0) < 0.5 ? -1 : 1
    out.push({
      angle: slotSeed(i, 1) * Math.PI * 2,
      speed: dir * (0.45 + slotSeed(i, 2) * 0.55),
      orbitMul: 0.7 + slotSeed(i, 3) * 0.6,
      sizeMul: 0.8 + slotSeed(i, 4) * 0.45,
      wobbleF: 0.6 + slotSeed(i, 5) * 1.2,
      wobbleA: 0.05 + slotSeed(i, 6) * 0.1,
      wobbleP: slotSeed(i, 7) * Math.PI * 2,
      mix: slotSeed(i, 8) * 0.6,
      weight: 0,
    })
  }
  return out
}

interface Sim {
  cur: Params
  slots: Slot[]
  sparks: Spark[]
  pulsePhase: number
  breathPhase: number
  lv: number
  seed: number
  primed: boolean
}

function makeSim(): Sim {
  return {
    cur: { ...STATES.thinking },
    slots: makeSlots(),
    sparks: Array.from({ length: SPARKS }, (): Spark => ({ born: -10, life: 0.6, x: 0, y: 0, size: 1, col: 0 })),
    pulsePhase: 0,
    breathPhase: 0,
    lv: 0,
    seed: 0,
    primed: false,
  }
}

export function ThinkingOrb({
  state = 'thinking',
  size = 64,
  colors,
  speed = 1,
  level,
  paused,
  className,
  style,
  label,
}: ThinkingOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pad = Math.round(size * 0.25)
  const box = size + pad * 2

  const live = useRef({ state, speed, level, colors })
  live.current = { state, speed, level, colors }

  // Simulation state lives in a ref: the loop mutates it every frame and React never sees it.
  const simRef = useRef<Sim | null>(null)
  if (simRef.current === null) simRef.current = makeSim()

  useCanvasLoop(canvasRef, {
    paused,
    width: box,
    height: box,
    draw(ctx, w, h, t, dt) {
      const sim = simRef.current!
      const { state: st, speed: spd, level: lvl, colors: cols } = live.current
      const target = STATES[st] ?? STATES.thinking
      const cur = sim.cur
      for (const k of KEYS) cur[k] = ease(cur[k], target[k], dt, TAU)
      const sp = spd

      const palette = (cols ?? ION).map(toRgb) as [[number, number, number], [number, number, number], [number, number, number]]
      const cx = w / 2
      const cy = h / 2
      const R = size / 2 - 0.5

      // Input level (prop or a synthetic pattern while listening with no level given).
      let want = 0
      if (cur.push > 0.01) {
        if (typeof lvl === 'function') want = clamp01(lvl())
        else if (typeof lvl === 'number') want = clamp01(lvl)
        else want = clamp01(0.25 + 0.75 * Math.max(0, Math.sin(t * 1.9) * 0.5 + Math.sin(t * 5.1) * 0.35 + Math.sin(t * 0.7) * 0.3))
      }
      sim.lv = ease(sim.lv, want, dt, want > sim.lv ? 0.05 : 0.22)
      const push = sim.lv * cur.push

      // Rhythms accumulate so a frequency change never jumps.
      sim.pulsePhase += cur.pulseHz * sp * dt
      sim.breathPhase += 0.25 * sp * dt
      const raw = 0.5 - 0.5 * Math.cos(sim.pulsePhase * Math.PI * 2)
      const pulse = Math.pow(raw, 1.6) * cur.pulseAmp
      const breath = Math.sin(sim.breathPhase * Math.PI * 2) * 0.03
      const bright = cur.bright + push * 0.35 + pulse * 1.2

      // Slot weights (how many blobs are alive). A still frame (reduced motion) is primed so the light
      // sits where a mid-motion frame would have it, not at the seed phase.
      const prime = dt === 0 && !sim.primed ? 1.7 : 0
      sim.primed = true
      for (let i = 0; i < SLOTS; i++) {
        const s = sim.slots[i]
        s.weight = ease(s.weight, i < cur.active ? 1 : 0, dt, TAU)
        s.angle += s.speed * cur.swirl * sp * (dt + prime)
      }

      // Halo outside the sphere.
      const haloA = 0.16 * cur.halo * (0.75 + bright * 0.4)
      const haloCol = mixRgb(mixRgb(palette[0], palette[1], 0.5), palette[2], 0.25)
      const halo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.5)
      halo.addColorStop(0, rgba(haloCol, haloA))
      halo.addColorStop(0.45, rgba(haloCol, haloA * 0.35))
      halo.addColorStop(1, rgba(haloCol, 0))
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()

      // Near-black glass body, lit faintly from the top-left.
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, 0, cx, cy, R * 1.25)
      body.addColorStop(0, '#101319')
      body.addColorStop(0.6, '#080A0E')
      body.addColorStop(1, '#040507')
      ctx.fillStyle = body
      ctx.fillRect(0, 0, w, h)

      // The light.
      ctx.globalCompositeOperation = 'lighter'
      const orbitR = R * (cur.orbit + push * 0.32) * (1 - cur.merge * 0.9)
      for (let i = 0; i < SLOTS; i++) {
        const s = sim.slots[i]
        if (s.weight < 0.015) continue
        const wob = Math.sin(t * s.wobbleF * sp + s.wobbleP) * s.wobbleA * R
        const ox = Math.cos(s.angle) * orbitR * s.orbitMul + wob
        const oy = Math.sin(s.angle) * orbitR * s.orbitMul * 0.82 - wob * 0.5
        const br = R * (cur.radius * s.sizeMul) * (1 + breath + pulse * 0.8 + push * 0.25)
        const col = mixRgb(palette[i % 3], palette[(i + 1) % 3], s.mix)
        const a = (0.62 * bright * s.weight) / (1 + cur.merge * 1.1)
        const g = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, br)
        g.addColorStop(0, rgba(col, a))
        g.addColorStop(0.3, rgba(col, a * 0.55))
        g.addColorStop(0.65, rgba(col, a * 0.14))
        g.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = g
        ctx.fillRect(cx + ox - br, cy + oy - br, br * 2, br * 2)
      }

      // Bright core (speaking / done).
      if (cur.core > 0.01) {
        const cr = R * (0.3 + pulse * 0.6 + cur.merge * 0.3)
        const ca = cur.core * (0.26 + pulse * 1.4)
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr)
        cg.addColorStop(0, `rgba(255,255,255,${Math.min(0.9, ca)})`)
        cg.addColorStop(0.35, rgba(mixRgb(palette[0], palette[1], 0.5), ca * 0.45))
        cg.addColorStop(1, rgba(palette[1], 0))
        ctx.fillStyle = cg
        ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2)
      }

      // Sparks: tiny points that flare and fade while thinking.
      if (cur.sparks > 0.05 && dt > 0) {
        for (let i = 0; i < SPARKS; i++) {
          const k = sim.sparks[i]
          if (t - k.born < k.life) continue
          sim.seed = (sim.seed + 1) | 0
          if (slotSeed(sim.seed, 11) < cur.sparks * sp * dt * 2.2) {
            const ang = slotSeed(sim.seed, 12) * Math.PI * 2
            const rad = Math.sqrt(slotSeed(sim.seed, 13)) * R * 0.72
            k.born = t
            k.life = 0.45 + slotSeed(sim.seed, 14) * 0.5
            k.x = cx + Math.cos(ang) * rad
            k.y = cy + Math.sin(ang) * rad
            k.size = 0.6 + slotSeed(sim.seed, 15) * 0.8
            k.col = Math.floor(slotSeed(sim.seed, 16) * 3)
          }
        }
      }
      for (let i = 0; i < SPARKS; i++) {
        const k = sim.sparks[i]
        const u = (t - k.born) / k.life
        if (u < 0 || u >= 1) continue
        const env = u < 0.12 ? u / 0.12 : 1 - (u - 0.12) / 0.88
        const sr = Math.max(1.2, R * 0.075 * k.size)
        const sa = env * 0.9 * cur.sparks
        const sg = ctx.createRadialGradient(k.x, k.y, 0, k.x, k.y, sr)
        sg.addColorStop(0, `rgba(255,255,255,${sa})`)
        sg.addColorStop(0.3, rgba(palette[k.col], sa * 0.7))
        sg.addColorStop(1, rgba(palette[k.col], 0))
        ctx.fillStyle = sg
        ctx.fillRect(k.x - sr, k.y - sr, sr * 2, sr * 2)
      }

      // Caustic pooling at the bottom of the glass.
      {
        const ccol = mixRgb(palette[0], palette[1], 0.4)
        const ca = 0.22 * bright
        ctx.save()
        ctx.translate(cx, cy + R * 0.74)
        ctx.scale(R * 0.5, R * 0.17)
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        cg.addColorStop(0, rgba(ccol, ca))
        cg.addColorStop(1, rgba(ccol, 0))
        ctx.fillStyle = cg
        ctx.fillRect(-1, -1, 2, 2)
        ctx.restore()
      }

      // Depth: the rim falls into shadow.
      ctx.globalCompositeOperation = 'source-over'
      const vig = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(0.72, 'rgba(0,0,0,0.14)')
      vig.addColorStop(0.92, 'rgba(0,0,0,0.5)')
      vig.addColorStop(1, 'rgba(0,0,0,0.82)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)

      // Glass: a lit rim (top-left white, bottom-right a whisper of the light), then the specular arc.
      const rimW = Math.max(0.8, R * 0.035)
      const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
      rim.addColorStop(0, 'rgba(255,255,255,0.42)')
      rim.addColorStop(0.45, 'rgba(255,255,255,0.05)')
      rim.addColorStop(0.75, rgba(palette[2], 0.06))
      rim.addColorStop(1, rgba(palette[1], 0.28))
      ctx.strokeStyle = rim
      ctx.lineWidth = rimW
      ctx.beginPath()
      ctx.arc(cx, cy, R - rimW / 2, 0, Math.PI * 2)
      ctx.stroke()

      const a0 = Math.PI * 1.12
      const a1 = Math.PI * 1.46
      const ar = R * 0.8
      const sx0 = cx + Math.cos(a0) * ar
      const sy0 = cy + Math.sin(a0) * ar
      const sx1 = cx + Math.cos(a1) * ar
      const sy1 = cy + Math.sin(a1) * ar
      ctx.lineCap = 'round'
      const glow = ctx.createLinearGradient(sx0, sy0, sx1, sy1)
      glow.addColorStop(0, 'rgba(255,255,255,0)')
      glow.addColorStop(0.5, 'rgba(255,255,255,0.12)')
      glow.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.strokeStyle = glow
      ctx.lineWidth = Math.max(2, R * 0.2)
      ctx.beginPath()
      ctx.arc(cx, cy, ar, a0, a1)
      ctx.stroke()
      const spec = ctx.createLinearGradient(sx0, sy0, sx1, sy1)
      spec.addColorStop(0, 'rgba(255,255,255,0)')
      spec.addColorStop(0.5, 'rgba(255,255,255,0.55)')
      spec.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.strokeStyle = spec
      ctx.lineWidth = Math.max(1, R * 0.055)
      ctx.beginPath()
      ctx.arc(cx, cy, ar, a0, a1)
      ctx.stroke()

      // A soft window reflection just inside the arc.
      ctx.save()
      ctx.translate(cx - R * 0.4, cy - R * 0.46)
      ctx.rotate(-Math.PI / 4)
      ctx.scale(R * 0.22, R * 0.1)
      const win = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      win.addColorStop(0, 'rgba(255,255,255,0.2)')
      win.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = win
      ctx.fillRect(-1, -1, 2, 2)
      ctx.restore()

      ctx.restore()
    },
  })

  return (
    <span
      className={className}
      style={{ position: 'relative', display: 'inline-block', width: size, height: size, verticalAlign: 'middle', flex: 'none', ...style }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', left: -pad, top: -pad, width: box, height: box, pointerEvents: 'none', display: 'block' }} />
    </span>
  )
}

export default ThinkingOrb
