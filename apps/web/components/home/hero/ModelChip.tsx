'use client'
import { useEffect, useRef } from 'react'

/**
 * The model on the phone's chip: a die, the brand's squircle, with a small network drawn on it. A wave of
 * signal runs through the layers, input to output, lighting each node as it passes; the pins along the
 * die's edges warm a little as it works. Nothing leaves the die: no arcs, no servers.
 *
 * Drawn on a 2D canvas at the device pixel ratio, monochrome (the frame is greyscale anyway), in the
 * site theme: the die stays dark and lit in both themes (chips are dark); by day it sits on a light board
 * with dark pins and a soft shadow, by night on a dark one. The colours come
 * from the `--hx-chip-*` variables in hero.css and are read again when the theme changes. It pauses off
 * screen and in a hidden tab; reduced motion draws one still frame mid-wave.
 */

const FRAME_MS = 1000 / 30
/** Nodes per layer, input to output. */
const LAYERS = [3, 5, 5, 4, 2]
/** Seconds for one wave to cross the network, and between waves. */
const CROSS = 1.5
const EVERY = 2.1
/** How long a node keeps its light after the wave passes (s). */
const DECAY = 0.55
const PINS = 6

type Node = { x: number; y: number; layer: number }

/** Colours from hero.css (`--hx-chip-*`); `ink`, `rim` and `shade` are `r,g,b` for use with an alpha. */
type Palette = { die1: string; die2: string; die3: string; ink: string; rim: string; shade: string; line: number; pin: string; drop: number }

const DARK: Palette = { die1: '#34343a', die2: '#1c1c20', die3: '#121214', ink: '255,255,255', rim: '255,255,255', shade: '255,255,255', line: 0.07, pin: '255,255,255', drop: 0 }

function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  const rgb = (name: string, fallback: string) => v(name, fallback).replace(/\s+/g, ',')
  return {
    die1: v('--hx-chip-die-1', DARK.die1),
    die2: v('--hx-chip-die-2', DARK.die2),
    die3: v('--hx-chip-die-3', DARK.die3),
    ink: rgb('--hx-chip-ink', DARK.ink),
    rim: rgb('--hx-chip-rim', DARK.rim),
    shade: rgb('--hx-chip-shade', DARK.shade),
    line: Number(v('--hx-chip-line', String(DARK.line))) || DARK.line,
    pin: rgb('--hx-chip-pin', DARK.pin),
    drop: Number(v('--hx-chip-drop', '0')) || 0,
  }
}
type Edge = { a: Node; b: Node; w: number }

/** Fixed pseudo-random weights, so SSR and every frame agree. */
function weight(i: number) {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return s - Math.floor(s)
}

function squircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, n = 3.4) {
  ctx.beginPath()
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = cx + r * Math.sign(c) * Math.abs(c) ** (2 / n)
    const y = cy + r * Math.sign(s) * Math.abs(s) ** (2 / n)
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.closePath()
}

function layout(cx: number, cy: number, r: number) {
  const nodes: Node[] = []
  const span = r * 1.18
  LAYERS.forEach((count, l) => {
    const x = cx - span / 2 + (span * l) / (LAYERS.length - 1)
    const gap = Math.min(r * 0.3, (r * 1.2) / Math.max(1, count - 1))
    for (let k = 0; k < count; k++) nodes.push({ x, y: cy + (k - (count - 1) / 2) * gap, layer: l })
  })
  const edges: Edge[] = []
  let i = 0
  for (const a of nodes)
    for (const b of nodes) if (b.layer === a.layer + 1) edges.push({ a, b, w: 0.35 + 0.65 * weight(i++) })
  return { nodes, edges }
}

/** 0..1 light of a point at position `p` (0 = input layer, 1 = output) when the wave front is at `front`. */
function lightAt(p: number, front: number) {
  const since = (front - p) * CROSS // seconds since the front passed
  if (since < -0.06) return 0
  if (since < 0) return 1 + since / 0.06
  return Math.max(0, 1 - since / DECAY) ** 1.6
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, t: number, pal: Palette) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const r = Math.min(h * 0.36, w * 0.3)
  const cx = w / 2
  const cy = h / 2
  // Where the wave is: it crosses in CROSS seconds, then rests until the next one.
  const cycle = t % EVERY
  const front = cycle / CROSS // 0..>1
  const busy = front <= 1 ? 1 : Math.max(0, 1 - (cycle - CROSS) / 0.5)

  // Pins: short legs on every side, warmer while the network works.
  const pinLen = r * 0.2
  const pinW = Math.max(1, r * 0.055)
  // Pins sit on the board, so they take the board's ink; on a light board they read darker and steadier.
  ctx.fillStyle = `rgba(${pal.pin},${((pal.drop ? 0.3 : 0.14) + 0.16 * busy).toFixed(3)})`
  for (let k = 0; k < PINS; k++) {
    const o = -r * 0.62 + (r * 1.24 * k) / (PINS - 1)
    ctx.fillRect(cx + o - pinW / 2, cy - r - pinLen - 1, pinW, pinLen)
    ctx.fillRect(cx + o - pinW / 2, cy + r + 1, pinW, pinLen)
    ctx.fillRect(cx - r - pinLen - 1, cy + o - pinW / 2, pinLen, pinW)
    ctx.fillRect(cx + r + 1, cy + o - pinW / 2, pinLen, pinW)
  }

  // The die: graphite, lit from the upper left, with a thin lit edge.
  const body = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  body.addColorStop(0, pal.die1)
  body.addColorStop(0.5, pal.die2)
  body.addColorStop(1, pal.die3)
  squircle(ctx, cx, cy, r)
  ctx.fillStyle = body
  if (pal.drop) {
    // On a light board the die casts a soft shadow, so it sits on the board rather than in it.
    ctx.shadowColor = `rgba(0,0,0,${pal.drop})`
    ctx.shadowBlur = r * 0.35
    ctx.shadowOffsetY = r * 0.12
  }
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.4, cy + r * 0.4)
  rim.addColorStop(0, `rgba(${pal.rim},0.45)`)
  rim.addColorStop(1, `rgba(${pal.shade},0.1)`)
  ctx.strokeStyle = rim
  ctx.lineWidth = 1
  ctx.stroke()

  // The network.
  const { nodes, edges } = layout(cx, cy, r)
  const pos = (n: Node) => n.layer / (LAYERS.length - 1)
  const line = Math.max(0.5, r * 0.012)
  for (const e of edges) {
    const pa = pos(e.a)
    const pb = pos(e.b)
    // The edge glows while the front is between its ends.
    const along = (front - pa) / (pb - pa)
    const hot = along > 0 && along < 1 ? Math.sin(along * Math.PI) : 0
    const a = pal.line + 0.38 * hot * e.w
    ctx.strokeStyle = `rgba(${pal.ink},${a.toFixed(3)})`
    ctx.lineWidth = line
    ctx.beginPath()
    ctx.moveTo(e.a.x, e.a.y)
    ctx.lineTo(e.b.x, e.b.y)
    ctx.stroke()
    // A spark riding the strongest edges.
    if (hot > 0 && e.w > 0.62) {
      const sx = e.a.x + (e.b.x - e.a.x) * along
      const sy = e.a.y + (e.b.y - e.a.y) * along
      ctx.fillStyle = `rgba(${pal.ink},${(0.85 * hot).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(sx, sy, line * 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const nodeR = Math.max(1.1, r * 0.06)
  for (const n of nodes) {
    const lit = lightAt(pos(n), front)
    if (lit > 0.02) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, nodeR * 4)
      g.addColorStop(0, `rgba(${pal.ink},${(0.35 * lit).toFixed(3)})`)
      g.addColorStop(1, `rgba(${pal.ink},0)`)
      ctx.fillStyle = g
      ctx.fillRect(n.x - nodeR * 4, n.y - nodeR * 4, nodeR * 8, nodeR * 8)
    }
    ctx.beginPath()
    ctx.arc(n.x, n.y, nodeR, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${pal.ink},${(0.3 + 0.7 * lit).toFixed(3)})`
    ctx.fill()
  }
}

export function ModelChip({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0
    let last = 0
    // Start mid-wave, so the first (and the reduced-motion) frame already shows the network at work.
    let elapsed = CROSS * 0.55
    let onScreen = false
    let pal = readPalette(canvas)

    const frame = (now: number) => {
      raf = 0
      if (!onScreen || document.hidden || !w) return
      const dt = last ? Math.min(100, now - last) : 0
      if (last && dt < FRAME_MS - 2) {
        raf = requestAnimationFrame(frame)
        return
      }
      last = now
      elapsed += dt / 1000
      draw(ctx, w, h, dpr, elapsed, pal)
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (reduced || raf || !onScreen || document.hidden) return
      last = 0
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const ro = new ResizeObserver(([e]) => {
      if (!e) return
      w = e.contentRect.width
      h = e.contentRect.height
      dpr = Math.min(window.devicePixelRatio || 1, 3)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      if (w) draw(ctx, w, h, dpr, elapsed, pal)
      canvas.dataset.ready = 'true'
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      onScreen = !!e?.isIntersecting
      if (onScreen) start()
      else stop()
    })
    io.observe(canvas)
    // The theme is a class on <html> (next-themes): read the colours again and redraw when it changes.
    const themes = new MutationObserver(() => {
      pal = readPalette(canvas)
      if (w) draw(ctx, w, h, dpr, elapsed, pal)
    })
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      themes.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced])

  return <canvas ref={ref} className="hx-globe" />
}
