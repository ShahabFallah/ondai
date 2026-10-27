'use client'
import { useEffect, useRef, type CSSProperties } from 'react'
import { coverCrop, DEFAULT_RAMP, GlyphAtlas, glyphIndex, loadImage, sampleImage, type Sample } from './ascii'
import { devicePixelRatioCapped, toRgb, useCanvasLoop } from './visible'

/**
 * AsciiCanvas: a still (or slowly drifting) ASCII render of an image, meant as a quiet background texture.
 *
 * The image is sampled once per grid size; every cell draws one ramp glyph by luminance from a glyph
 * atlas. `mono` uses one colour with alpha by brightness, `image` keeps the sample colour. With `drift`
 * a slow brightness wave crosses the field; without it the loop never runs and only resizes redraw.
 */

export interface AsciiCanvasProps {
  src: string
  /** Cell size in CSS px. Default 10. */
  cell?: number
  /** Characters from dark to bright. Default ` .:-=+*#%@`. */
  ramp?: string
  /** Glyph colour in `mono` mode. Default: the secondary text colour (`--ondai-text-secondary`). */
  color?: string
  /** Default `mono`. */
  colorMode?: 'mono' | 'image'
  /** Slow brightness wave across the field. Default false. */
  drift?: boolean
  paused?: boolean
  className?: string
  style?: CSSProperties
  /** Explicit size; otherwise the canvas fills its container (cover). */
  width?: number
  height?: number
  /** Accessible name. Without it the canvas is decorative (`aria-hidden`). */
  label?: string
}

export function AsciiCanvas({ src, cell = 10, ramp = DEFAULT_RAMP, color, colorMode = 'mono', drift = false, paused, className, style, width, height, label }: AsciiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const live = useRef({ cell, ramp, color, colorMode, drift })
  live.current = { cell, ramp, color, colorMode, drift }
  const st = useRef({ img: null as HTMLImageElement | null, sample: null as Sample | null, sampleKey: '', atlas: null as GlyphAtlas | null, atlasKey: '', resolved: '' })

  const handle = useCanvasLoop(canvasRef, {
    paused: paused || !drift,
    width,
    height,
    draw(ctx, w, h, t) {
      const s = st.current
      const L = live.current
      const img = s.img
      if (!img) return
      const cellPx = Math.max(4, L.cell)
      const cols = Math.ceil(w / cellPx)
      const rows = Math.ceil(h / cellPx)
      const crop = coverCrop(img.naturalWidth, img.naturalHeight, w, h)
      const key = `${cols}x${rows}:${img.src}`
      if (s.sampleKey !== key) {
        s.sample = sampleImage(img, cols, rows, crop)
        s.sampleKey = key
      }
      const dpr = devicePixelRatioCapped()
      const atlasKey = `${cellPx}@${dpr}:${L.ramp}`
      if (s.atlasKey !== atlasKey) {
        s.atlas = new GlyphAtlas(cellPx, dpr, L.ramp)
        s.atlasKey = atlasKey
      }
      const atlas = s.atlas!
      const sample = s.sample!
      const mono = L.colorMode !== 'image'
      const [mr, mg, mb] = toRgb(L.color ?? s.resolved ?? '#9BA1A9')
      const lum = sample.lum
      const rgba = sample.rgba
      const n = L.ramp.length
      const driftOn = L.drift

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c
          // A mild lift so dark renders still fill the field.
          let lv = Math.pow(lum[i], 0.72)
          if (driftOn) {
            const wave = 0.5 + 0.5 * Math.sin(c * 0.09 - r * 0.13 + t * 0.7) * Math.sin(c * 0.03 + t * 0.23)
            lv = lv * (0.78 + 0.34 * wave)
          }
          if (lv > 1) lv = 1
          const g = glyphIndex(lv, n)
          if (g <= 0) continue
          const x = c * cellPx
          const y = r * cellPx
          if (mono) {
            ctx.globalAlpha = 0.28 + 0.72 * lv
            atlas.draw(ctx, g, mr, mg, mb, x, y)
          } else {
            const j = i * 4
            // Slightly muted so the texture stays quiet.
            const grey = 90 + lv * 140
            ctx.globalAlpha = 0.45 + 0.55 * lv
            atlas.draw(ctx, g, (rgba[j] + (grey - rgba[j]) * 0.3) | 0, (rgba[j + 1] + (grey - rgba[j + 1]) * 0.3) | 0, (rgba[j + 2] + (grey - rgba[j + 2]) * 0.3) | 0, x, y)
          }
        }
      }
      ctx.globalAlpha = 1
    },
  })

  useEffect(() => {
    let alive = true
    st.current.img = null
    st.current.sampleKey = ''
    loadImage(src)
      .then((img) => {
        if (!alive) return
        st.current.img = img
        handle.invalidate()
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [src, handle])

  // Resolve the default colour from the theme once the canvas is in the document.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const v = getComputedStyle(el).getPropertyValue('--ondai-text-secondary').trim()
    st.current.resolved = v || '#9BA1A9'
    handle.invalidate()
  }, [handle])

  useEffect(() => {
    handle.invalidate()
  }, [cell, ramp, color, colorMode, handle])

  const sized = width != null && height != null
  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', ...(sized ? { width, height } : { width: '100%', height: '100%' }), ...style }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    />
  )
}

export default AsciiCanvas
