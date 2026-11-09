'use client'
import { useEffect, useRef } from 'react'
import { LAND_BITS, LAND_LAT0, LAND_RINGS, LAND_STEP } from './land'

/**
 * A dotted globe rising from the foot of its frame, turning slowly on its axis, with one lit point that
 * stays put: the phone. The world turns under it and nothing leaves it, no arcs and no servers.
 *
 * Drawn on a 2D canvas at the device pixel ratio. Land is a dot on each latitude ring (Natural Earth,
 * baked into `land.ts`), lit from the upper left and fading at the limb. It pauses off screen and in a
 * hidden tab; reduced motion draws one still frame.
 */

type Dot = { lat: number; lon: number; ring: number; k: number }

const DEG = Math.PI / 180
/** One turn every 52 s. */
const SPIN = (2 * Math.PI) / 52
/** Pitch: the north pole leans toward the viewer. */
const TILT = 0.4
/** The longitude under the lit point at rest (central Europe). */
const LON0 = 11
/** The lit point on the sphere, in sphere units from its centre (x right, y up). */
const PIN = { x: -0.1, y: 0.6 }
const FRAME_MS = 1000 / 30

let landDots: Dot[] | null = null
function dots(): Dot[] {
  if (landDots) return landDots
  const bytes = Uint8Array.from(atob(LAND_BITS), (c) => c.charCodeAt(0))
  const out: Dot[] = []
  let bit = 0
  for (let r = 0; r < LAND_RINGS; r++) {
    const lat = LAND_LAT0 + r * LAND_STEP
    const n = Math.max(1, Math.round((360 / LAND_STEP) * Math.cos(lat * DEG)))
    for (let k = 0; k < n; k++, bit++) {
      if (bytes[bit >> 3]! & (1 << (bit & 7))) out.push({ lat: lat * DEG, lon: (-180 + ((k + 0.5) * 360) / n) * DEG, ring: r, k })
    }
  }
  landDots = out
  return out
}

/** Alpha buckets: dots are batched into one path per bucket, so a frame is a dozen fills, not thousands. */
const BUCKETS = 12

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, angle: number, breath: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const R = w * 0.64
  const cx = w * 0.5
  const cy = h * 0.27 + R
  const px = cx + PIN.x * R
  const py = cy - PIN.y * R

  // The body: graphite, lit from the upper left, darker toward the limb.
  const body = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.92, 0, cx - R * 0.2, cy - R * 0.5, R * 1.25)
  body.addColorStop(0, '#4a4a50')
  body.addColorStop(0.32, '#26262a')
  body.addColorStop(0.75, '#141416')
  body.addColorStop(1, '#0e0e10')
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()

  // Land dots on latitude rings. Small frames take every other ring and dot, so they never merge.
  const spacing = R * LAND_STEP * DEG
  const stride = spacing < 1.7 ? 2 : 1
  const dotR = Math.min(0.85, Math.max(0.42, spacing * stride * 0.26))
  const sinT = Math.sin(TILT)
  const cosT = Math.cos(TILT)
  // Light from the upper left and front.
  const lx = -0.45
  const ly = 0.62
  const lz = 0.64
  const glowR = Math.max(9, R * 0.16)
  const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D())
  for (const d of dots()) {
    if (stride === 2 && (d.ring % 2 || d.k % 2)) continue
    const cl = Math.cos(d.lat)
    const a = d.lon + angle
    const x = cl * Math.sin(a)
    const y0 = Math.sin(d.lat)
    const z0 = cl * Math.cos(a)
    const y = y0 * cosT - z0 * sinT
    const z = z0 * cosT + y0 * sinT
    if (z <= 0.02) continue
    const sx = cx + x * R
    const sy = cy - y * R
    if (sy > h + 2 || sx < -2 || sx > w + 2) continue
    const lit = Math.max(0, x * lx + y * ly + z * lz)
    const limb = Math.min(1, z / 0.45)
    let alpha = (0.22 + 0.78 * lit) * limb * limb
    // Land near the phone catches its light.
    const dd = Math.hypot(sx - px, sy - py)
    if (dd < glowR) alpha += 0.55 * (1 - dd / glowR) ** 2 * breath
    const b = Math.min(BUCKETS - 1, Math.floor(Math.min(1, alpha) * BUCKETS))
    if (b <= 0) continue
    const r = dotR * (0.55 + 0.45 * limb)
    paths[b]!.moveTo(sx + r, sy)
    paths[b]!.arc(sx, sy, r, 0, Math.PI * 2)
  }
  for (let b = 1; b < BUCKETS; b++) {
    ctx.fillStyle = `rgba(255,255,255,${((b + 0.5) / BUCKETS).toFixed(3)})`
    ctx.fill(paths[b]!)
  }

  // The rim: a thin lit edge and a faint air around the top of the sphere.
  const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.6, cy)
  rim.addColorStop(0, 'rgba(255,255,255,0.42)')
  rim.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  rim.addColorStop(1, 'rgba(255,255,255,0.03)')
  ctx.beginPath()
  ctx.arc(cx, cy, R - 0.5, Math.PI, Math.PI * 2)
  ctx.strokeStyle = rim
  ctx.lineWidth = 1
  ctx.stroke()
  const air = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 1.14)
  air.addColorStop(0, 'rgba(255,255,255,0.09)')
  air.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath()
  ctx.arc(cx, cy, R * 1.14, 0, Math.PI * 2)
  ctx.arc(cx, cy, R, 0, Math.PI * 2, true)
  ctx.fillStyle = air
  ctx.fill()

  // The phone: one steady point with a soft breathing light. Nothing goes out from it.
  const halo = ctx.createRadialGradient(px, py, 0, px, py, glowR)
  halo.addColorStop(0, `rgba(255,255,255,${(0.34 * breath).toFixed(3)})`)
  halo.addColorStop(0.35, `rgba(255,255,255,${(0.1 * breath).toFixed(3)})`)
  halo.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = halo
  ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2)
  const core = Math.max(1.2, R * 0.024)
  ctx.beginPath()
  ctx.arc(px, py, core + 1.2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(px, py, core, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
}

export function Globe({ reduced }: { reduced: boolean }) {
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
    let elapsed = 0
    let onScreen = false
    const base = -LON0 * DEG

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
      const breath = 0.78 + 0.22 * Math.sin((elapsed * 2 * Math.PI) / 5.2)
      draw(ctx, w, h, dpr, base + elapsed * SPIN, breath)
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
    const still = () => {
      if (w) draw(ctx, w, h, dpr, base + elapsed * SPIN, 1)
    }

    const ro = new ResizeObserver(([e]) => {
      if (!e) return
      w = e.contentRect.width
      h = e.contentRect.height
      dpr = Math.min(window.devicePixelRatio || 1, 3)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      still()
      canvas.dataset.ready = 'true'
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      onScreen = !!e?.isIntersecting
      if (onScreen) start()
      else stop()
    })
    io.observe(canvas)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced])

  return <canvas ref={ref} className="hx-globe" />
}
