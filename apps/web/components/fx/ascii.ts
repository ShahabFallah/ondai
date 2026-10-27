'use client'

/**
 * Shared sampling helpers for the ASCII / mosaic effects: image loading, cover-fit cropping, sampling an
 * image to a cell grid (colour + luminance), deterministic hashes for churn, and a glyph atlas so a
 * frame of a few thousand characters is a few thousand `drawImage` calls instead of `fillText`.
 */

export const DEFAULT_RAMP = ' .:-=+*#%@'
export const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

/** Integer hash of a cell and a step, uniform in [0, 1). */
export function hash3(x: number, y: number, k: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(k | 0, 1274126177)) | 0
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  h ^= h >>> 16
  h = Math.imul(h, 2246822519)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    if (/^https?:/.test(src) && !src.startsWith(location.origin)) img.crossOrigin = 'anonymous'
    img.onload = () => {
      const done = () => resolve(img)
      if (typeof img.decode === 'function') img.decode().then(done, done)
      else done()
    }
    img.onerror = () => reject(new Error(`Could not load ${src}`))
    img.src = src
  })
}

export interface Crop {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** The source rectangle that covers a box of the given aspect (like `object-fit: cover`). */
export function coverCrop(imgW: number, imgH: number, boxW: number, boxH: number): Crop {
  if (boxW <= 0 || boxH <= 0) return { sx: 0, sy: 0, sw: imgW, sh: imgH }
  const scale = Math.max(boxW / imgW, boxH / imgH)
  const sw = boxW / scale
  const sh = boxH / scale
  return { sx: (imgW - sw) / 2, sy: (imgH - sh) / 2, sw, sh }
}

export interface Sample {
  cols: number
  rows: number
  /** RGBA, row-major, `cols * rows * 4`. */
  rgba: Uint8ClampedArray
  /** Relative luminance 0–1 per cell. */
  lum: Float32Array
}

let scratch: HTMLCanvasElement | null = null

/** Sample an image's crop to a `cols × rows` grid in one draw on an offscreen canvas. */
export function sampleImage(img: CanvasImageSource & { width?: number; height?: number }, cols: number, rows: number, crop: Crop): Sample {
  cols = Math.max(1, cols | 0)
  rows = Math.max(1, rows | 0)
  scratch ??= document.createElement('canvas')
  const c = scratch
  if (c.width !== cols || c.height !== rows) {
    c.width = cols
    c.height = rows
  }
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { cols, rows, rgba: new Uint8ClampedArray(cols * rows * 4), lum: new Float32Array(cols * rows) }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, cols, rows)
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, cols, rows)
  const rgba = ctx.getImageData(0, 0, cols, rows).data
  const lum = new Float32Array(cols * rows)
  for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
    lum[i] = (0.2126 * rgba[j] + 0.7152 * rgba[j + 1] + 0.0722 * rgba[j + 2]) / 255
  }
  return { cols, rows, rgba, lum }
}

export function glyphIndex(lum: number, rampLength: number): number {
  const i = Math.round(lum * (rampLength - 1))
  return i < 0 ? 0 : i >= rampLength ? rampLength - 1 : i
}

const ATLAS_COLS = 64
const ATLAS_MAX_SLOTS = 4096

/**
 * Characters pre-rendered once per (glyph, colour) and stamped with `drawImage`. Colours are quantised to
 * 5 bits per channel; brightness changes should go through `globalAlpha` so nothing bands.
 */
export class GlyphAtlas {
  readonly cell: number
  readonly dpr: number
  readonly ramp: string
  private readonly cd: number
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private slots = new Map<number, number>()
  private next = 0

  constructor(cell: number, dpr: number, ramp = DEFAULT_RAMP, font = MONO_FONT) {
    this.cell = cell
    this.dpr = dpr
    this.ramp = ramp
    this.cd = Math.ceil(cell * dpr)
    this.canvas = document.createElement('canvas')
    this.canvas.width = ATLAS_COLS * this.cd
    this.canvas.height = this.cd * 8
    this.ctx = this.canvas.getContext('2d')
    if (this.ctx) {
      this.ctx.font = `${Math.round(cell * 1.15 * dpr)}px ${font}`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
    }
    this.font = font
  }
  private font: string

  private slot(glyph: number, r: number, g: number, b: number): number {
    const key = (glyph << 15) | ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    let s = this.slots.get(key)
    if (s !== undefined) return s
    if (this.next >= ATLAS_MAX_SLOTS) {
      this.slots.clear()
      this.next = 0
      this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
    s = this.next++
    const rows = Math.ceil((s + 1) / ATLAS_COLS)
    if (rows * this.cd > this.canvas.height) {
      const grown = document.createElement('canvas')
      grown.width = this.canvas.width
      grown.height = Math.min(ATLAS_MAX_SLOTS / ATLAS_COLS, rows * 2) * this.cd
      const gctx = grown.getContext('2d')
      if (gctx) {
        gctx.drawImage(this.canvas, 0, 0)
        gctx.font = `${Math.round(this.cell * 1.15 * this.dpr)}px ${this.font}`
        gctx.textAlign = 'center'
        gctx.textBaseline = 'middle'
      }
      this.canvas = grown
      this.ctx = gctx
    }
    const ctx = this.ctx
    if (ctx) {
      const x = (s % ATLAS_COLS) * this.cd
      const y = Math.floor(s / ATLAS_COLS) * this.cd
      ctx.clearRect(x, y, this.cd, this.cd)
      ctx.fillStyle = `rgb(${(r >> 3) << 3},${(g >> 3) << 3},${(b >> 3) << 3})`
      ctx.fillText(this.ramp[glyph] ?? ' ', x + this.cd / 2, y + this.cd / 2 + this.cd * 0.04)
    }
    this.slots.set(key, s)
    return s
  }

  /** Stamp one glyph at CSS coordinates (the target context is expected to carry the DPR transform). */
  draw(ctx: CanvasRenderingContext2D, glyph: number, r: number, g: number, b: number, x: number, y: number): void {
    if (glyph <= 0) return
    const s = this.slot(glyph, r < 0 ? 0 : r > 255 ? 255 : r | 0, g < 0 ? 0 : g > 255 ? 255 : g | 0, b < 0 ? 0 : b > 255 ? 255 : b | 0)
    const sx = (s % ATLAS_COLS) * this.cd
    const sy = Math.floor(s / ATLAS_COLS) * this.cd
    ctx.drawImage(this.canvas, sx, sy, this.cd, this.cd, x, y, this.cell, this.cell)
  }
}
