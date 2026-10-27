'use client'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { coverCrop, DEFAULT_RAMP, GlyphAtlas, glyphIndex, hash3, loadImage, sampleImage, type Sample } from './ascii'
import { clamp01, devicePixelRatioCapped, ION, mixRgb, toRgb, useCanvasLoop } from './visible'

/**
 * ImageReveal: an image that resolves out of a churning mosaic or an ASCII field as `progress` rises.
 *
 * The image is sampled once to the cell grid (offscreen canvas). Each frame the real image is drawn
 * underneath and only the unrevealed cells are painted on top: mosaic tiles take a neighbour's colour,
 * jittered in lightness and swapped every ~100 ms by a time hash; ASCII cells draw a ramp glyph by
 * luminance in a muted colour. A cell is revealed when its hash (biased toward the centre) drops below
 * `progress`, and flashes white for 200 ms when it does.
 */

export interface ImageRevealProps {
  src: string
  alt: string
  /** Default `mosaic`. */
  mode?: 'mosaic' | 'ascii'
  /** 0–1, or `'auto'` to loop: reveal ~2.4 s, hold ~1.8 s, dissolve ~0.9 s. Default `'auto'`. */
  progress?: number | 'auto'
  /** Several images to cycle through in `'auto'` mode (replaces `src`). */
  images?: string[]
  /** Cell size in CSS px. Default 12. */
  cell?: number
  /** Unrevealed cells pick up the ion colours now and then. Default true. */
  tint?: boolean
  colors?: [string, string, string]
  paused?: boolean
  className?: string
  style?: CSSProperties
  /** Explicit size; otherwise the component fills its container at the image's aspect ratio. */
  width?: number
  height?: number
  /** Fires each time progress reaches 1. */
  onRevealed?: () => void
}

const REVEAL = 2.4
const HOLD = 1.8
const DISSOLVE = 0.9
const GAP = 0.35
const PERIOD = REVEAL + HOLD + DISSOLVE + GAP
const BIAS = 0.42
const FLASH = 0.2
const BG = '#07080A'

const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2)

interface Grid {
  cols: number
  rows: number
  thr: Float32Array
  revealedAt: Float32Array
}

function buildGrid(cols: number, rows: number): Grid {
  const n = cols * rows
  const thr = new Float32Array(n)
  const cx = (cols - 1) / 2
  const cy = (rows - 1) / 2
  const maxD = Math.hypot(cx, cy) || 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const d = Math.hypot(c - cx, r - cy) / maxD
      thr[r * cols + c] = hash3(c, r, 1) * (1 - BIAS) + d * BIAS
    }
  }
  return { cols, rows, thr, revealedAt: new Float32Array(n).fill(-1) }
}

export function ImageReveal({
  src,
  alt,
  mode = 'mosaic',
  progress = 'auto',
  images,
  cell = 12,
  tint = true,
  colors,
  paused,
  className,
  style,
  width,
  height,
  onRevealed,
}: ImageRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const live = useRef({ mode, progress, cell, tint, colors, onRevealed })
  live.current = { mode, progress, cell, tint, colors, onRevealed }

  // Keyed by content, so an inline `images` array does not reload on every render.
  const srcKey = useMemo(() => (images && images.length ? images : [src]).join('|'), [images, src])

  const st = useRef({
    imgs: [] as (HTMLImageElement | null)[],
    idx: 0,
    sample: null as Sample | null,
    sampleKey: '',
    grid: null as Grid | null,
    atlas: null as GlyphAtlas | null,
    atlasKey: '',
    cycle: -1,
    switched: -1,
    wasFull: false,
    lastP: 0,
  })

  const handle = useCanvasLoop(canvasRef, {
    paused,
    width,
    height,
    draw(ctx, w, h, t, dt) {
      const s = st.current
      const L = live.current
      const cellPx = Math.max(4, L.cell)
      const img = s.imgs[s.idx] ?? s.imgs.find((i) => i) ?? null

      ctx.fillStyle = BG
      ctx.fillRect(0, 0, w, h)
      if (!img) return

      // Progress.
      let p: number
      if (L.progress === 'auto') {
        if (dt === 0 && t === 0) p = 1
        else {
          const cycle = Math.floor(t / PERIOD)
          const u = t - cycle * PERIOD
          if (u < REVEAL) p = easeInOut(u / REVEAL)
          else if (u < REVEAL + HOLD) p = 1
          else if (u < REVEAL + HOLD + DISSOLVE) p = 1 - easeInOut((u - REVEAL - HOLD) / DISSOLVE)
          else {
            p = 0
            if (s.switched !== cycle && s.imgs.length > 1) {
              s.switched = cycle
              const next = (s.idx + 1) % s.imgs.length
              if (s.imgs[next]) {
                s.idx = next
                s.sampleKey = ''
              }
            }
          }
        }
      } else p = clamp01(L.progress)
      if (p >= 1 && !s.wasFull) L.onRevealed?.()
      s.wasFull = p >= 1

      const cols = Math.ceil(w / cellPx)
      const rows = Math.ceil(h / cellPx)
      const crop = coverCrop(img.naturalWidth, img.naturalHeight, w, h)
      const key = `${s.idx}:${cols}x${rows}:${img.src}`
      if (s.sampleKey !== key) {
        s.sample = sampleImage(img, cols, rows, crop)
        s.sampleKey = key
      }
      if (!s.grid || s.grid.cols !== cols || s.grid.rows !== rows) s.grid = buildGrid(cols, rows)
      const sample = s.sample!
      const grid = s.grid
      const dpr = devicePixelRatioCapped()
      const atlasKey = `${cellPx}@${dpr}`
      if (L.mode === 'ascii' && s.atlasKey !== atlasKey) {
        s.atlas = new GlyphAtlas(cellPx, dpr, DEFAULT_RAMP)
        s.atlasKey = atlasKey
      }

      // The real image underneath.
      ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h)

      const palette = (L.colors ?? ION).map(toRgb) as [[number, number, number], [number, number, number], [number, number, number]]
      const rgba = sample.rgba
      const lum = sample.lum
      const ascii = L.mode === 'ascii'
      const atlas = s.atlas
      const still = dt === 0

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c
          const revealed = grid.thr[i] < p
          const x = c * cellPx
          const y = r * cellPx
          if (revealed) {
            if (grid.revealedAt[i] < 0) grid.revealedAt[i] = still ? -2 : t
            continue
          }
          grid.revealedAt[i] = -1

          // Churn: every ~100 ms (offset per cell) borrow a neighbour's sample.
          const k = Math.floor((t + hash3(c, r, 3)) * 10)
          const nc = Math.min(cols - 1, Math.max(0, c + Math.floor(hash3(c, r, k) * 3) - 1))
          const nr = Math.min(rows - 1, Math.max(0, r + Math.floor(hash3(c, r, k + 1) * 3) - 1))
          const j = (nr * cols + nc) * 4
          const light = 0.8 + hash3(c, r, k + 2) * 0.4
          let cr = Math.min(255, rgba[j] * light)
          let cg = Math.min(255, rgba[j + 1] * light)
          let cb = Math.min(255, rgba[j + 2] * light)
          const tinted = L.tint && hash3(c, r, k + 4) < 0.06
          if (tinted) {
            const ion = palette[(c + r + k) % 3]
            cr = cr + (ion[0] - cr) * 0.6
            cg = cg + (ion[1] - cg) * 0.6
            cb = cb + (ion[2] - cb) * 0.6
          }
          if (ascii && atlas) {
            ctx.fillStyle = BG
            ctx.fillRect(x, y, cellPx, cellPx)
            const lv = clamp01(lum[nr * cols + nc] * light)
            const g = glyphIndex(lv, DEFAULT_RAMP.length)
            if (g > 0) {
              // Muted: pulled toward grey, lifted so dark areas still read.
              const grey = 70 + lv * 150
              const mr = tinted ? cr : cr + (grey - cr) * 0.65
              const mg = tinted ? cg : cg + (grey - cg) * 0.65
              const mb = tinted ? cb : cb + (grey - cb) * 0.65
              atlas.draw(ctx, g, mr | 0, mg | 0, mb | 0, x, y)
            }
          } else {
            ctx.fillStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`
            ctx.fillRect(x, y, cellPx, cellPx)
          }
        }
      }

      // Fresh cells flash.
      if (!still) {
        ctx.globalCompositeOperation = 'lighter'
        const edge = mixRgb(palette[0], palette[1], 0.5)
        for (let i = 0; i < grid.revealedAt.length; i++) {
          const at = grid.revealedAt[i]
          if (at < 0) continue
          const u = (t - at) / FLASH
          if (u >= 1) continue
          const a = (1 - u) * 0.75
          const x = (i % cols) * cellPx
          const y = Math.floor(i / cols) * cellPx
          ctx.fillStyle = `rgba(${255 - (255 - edge[0]) * u * 0.6 | 0},${255 - (255 - edge[1]) * u * 0.6 | 0},${255 - (255 - edge[2]) * u * 0.6 | 0},${a})`
          ctx.fillRect(x, y, cellPx, cellPx)
        }
        ctx.globalCompositeOperation = 'source-over'
      }
    },
  })

  // Load every image; the first one sets the aspect ratio when no explicit size is given.
  useEffect(() => {
    let alive = true
    const s = st.current
    const list = srcKey.split('|')
    s.imgs = list.map(() => null)
    s.idx = 0
    s.sampleKey = ''
    list.forEach((u, i) => {
      loadImage(u)
        .then((img) => {
          if (!alive) return
          s.imgs[i] = img
          if (i === 0 && wrapRef.current && (width == null || height == null)) {
            wrapRef.current.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`
          }
          handle.invalidate()
        })
        .catch(() => {})
    })
    return () => {
      alive = false
    }
  }, [srcKey, width, height, handle])

  // A progress change while not animating (reduced motion, paused) still needs a frame.
  useEffect(() => {
    handle.invalidate()
  }, [progress, mode, cell, tint, handle])

  const sized = width != null && height != null
  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...(sized ? { width, height } : { width: '100%' }), ...style }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        style={{ display: 'block', ...(sized ? {} : { position: 'absolute', inset: 0, width: '100%', height: '100%' }) }}
      />
    </div>
  )
}

export default ImageReveal
