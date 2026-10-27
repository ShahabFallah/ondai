'use client'
import { useEffect, useRef, type RefObject } from 'react'

/**
 * Visibility and frame-loop plumbing shared by the Canvas 2D effects.
 *
 * `observeVisible` watches an element imperatively: on screen (IntersectionObserver) and the tab shown
 * (the state-based React hook lives in `./useVisible`). `useCanvasLoop` owns a canvas: DPR-aware sizing from CSS or explicit props, a rAF loop that only
 * runs while visible / not paused / motion allowed, one still frame under `prefers-reduced-motion`,
 * and cleanup. Callbacks are read through a latest-ref so nothing re-renders per frame.
 */

export const MAX_DPR = 2

export function devicePixelRatioCapped(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.devicePixelRatio || 1, MAX_DPR)
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Calls `onChange(visible)` immediately and whenever the element enters/leaves the viewport or the tab hides. */
export function observeVisible(el: Element, onChange: (visible: boolean) => void): () => void {
  let onScreen = true
  let tabShown = typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  let last: boolean | null = null
  const emit = () => {
    const v = onScreen && tabShown
    if (v !== last) {
      last = v
      onChange(v)
    }
  }
  let io: IntersectionObserver | null = null
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) onScreen = e.isIntersecting
        emit()
      },
      { rootMargin: '64px' },
    )
    io.observe(el)
  }
  const onVis = () => {
    tabShown = document.visibilityState !== 'hidden'
    emit()
  }
  document.addEventListener('visibilitychange', onVis)
  emit()
  return () => {
    io?.disconnect()
    document.removeEventListener('visibilitychange', onVis)
  }
}

export interface CanvasLoopOptions {
  /** Stop the loop (the last frame stays on screen). */
  paused?: boolean
  /** Explicit CSS size. Without it the canvas box is measured with a ResizeObserver. */
  width?: number
  height?: number
  /** Called after the canvas is (re)sized, with CSS pixel dimensions. */
  onResize?: (w: number, h: number) => void
  /** Draw one frame. `t` is effect time in seconds (only advances while running), `dt` the frame delta. */
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void
  /** Draw the one still frame used under reduced motion. Defaults to `draw` with dt = 0. */
  still?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

export interface CanvasLoopHandle {
  /** Draw one frame now if the loop is not running (e.g. a prop changed while paused or reduced). */
  invalidate: () => void
}

export function useCanvasLoop(ref: RefObject<HTMLCanvasElement | null>, options: CanvasLoopOptions): CanvasLoopHandle {
  const opts = useRef(options)
  opts.current = options
  const ctl = useRef<{ recompute: () => void; invalidate: () => void } | null>(null)
  const handle = useRef<CanvasLoopHandle>({ invalidate: () => ctl.current?.invalidate() })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let dpr = devicePixelRatioCapped()
    let visible = true
    let reduced = prefersReducedMotion()
    let raf = 0
    let running = false
    let t = 0
    let lastNow = 0
    let disposed = false

    const size = () => {
      const o = opts.current
      let cw: number
      let ch: number
      if (o.width != null && o.height != null) {
        cw = o.width
        ch = o.height
        canvas.style.width = `${cw}px`
        canvas.style.height = `${ch}px`
      } else {
        const r = canvas.getBoundingClientRect()
        cw = r.width
        ch = r.height
      }
      dpr = devicePixelRatioCapped()
      const pw = Math.max(1, Math.round(cw * dpr))
      const ph = Math.max(1, Math.round(ch * dpr))
      const changed = pw !== canvas.width || ph !== canvas.height || cw !== w || ch !== h
      w = cw
      h = ch
      if (changed) {
        canvas.width = pw
        canvas.height = ph
        o.onResize?.(w, h)
      }
      return changed
    }

    const frame = (ctxTime: number, dt: number) => {
      if (w <= 0 || h <= 0) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, w, h)
      opts.current.draw(ctx, w, h, ctxTime, dt)
    }

    const stillFrame = () => {
      if (w <= 0 || h <= 0) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, w, h)
      const o = opts.current
      if (o.still) o.still(ctx, w, h)
      else o.draw(ctx, w, h, t, 0)
    }

    const tick = (now: number) => {
      if (!running || disposed) return
      const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 1 / 60
      lastNow = now
      t += dt
      frame(t, dt)
      raf = requestAnimationFrame(tick)
    }

    const shouldRun = () => visible && !reduced && !opts.current.paused

    const recompute = () => {
      if (disposed) return
      size()
      const want = shouldRun()
      if (want && !running) {
        running = true
        lastNow = 0
        raf = requestAnimationFrame(tick)
      } else if (!want && running) {
        running = false
        cancelAnimationFrame(raf)
        raf = 0
      }
      if (!running) stillFrame()
    }

    const invalidate = () => {
      if (!running) stillFrame()
    }

    const stopVisible = observeVisible(canvas, (v) => {
      visible = v
      recompute()
    })

    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    const onMq = () => {
      reduced = !!mq?.matches
      recompute()
    }
    mq?.addEventListener('change', onMq)

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (size()) {
          if (running) frame(t, 0)
          else stillFrame()
        }
      })
      ro.observe(canvas)
    }
    const onWinResize = () => {
      if (size()) {
        if (running) frame(t, 0)
        else stillFrame()
      }
    }
    window.addEventListener('resize', onWinResize)

    ctl.current = { recompute, invalidate }
    recompute()

    return () => {
      disposed = true
      running = false
      cancelAnimationFrame(raf)
      stopVisible()
      mq?.removeEventListener('change', onMq)
      ro?.disconnect()
      window.removeEventListener('resize', onWinResize)
      ctl.current = null
    }
  }, [ref])

  const { paused, width, height } = options
  useEffect(() => {
    ctl.current?.recompute()
  }, [paused, width, height])

  return handle.current
}

/* Small maths shared by the effects. */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Frame-rate independent ease toward a target. `tau` is the time constant in seconds (~95% in 3·tau). */
export function ease(current: number, target: number, dt: number, tau: number): number {
  if (dt <= 0) return target
  return current + (target - current) * (1 - Math.exp(-dt / tau))
}

/** Parse `#rgb`, `#rrggbb`, `rgb(a)(...)` into [r, g, b] 0–255. Anything else becomes mid grey. */
export function toRgb(color: string): [number, number, number] {
  const c = color.trim()
  if (c[0] === '#') {
    let hx = c.slice(1)
    if (hx.length === 3 || hx.length === 4) hx = hx.split('').map((ch) => ch + ch).join('')
    const n = parseInt(hx.slice(0, 6), 16)
    if (!Number.isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  return [155, 161, 169]
}

export const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a > 1 ? 1 : a})`

export function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export const ION: [string, string, string] = ['#7CF7FF', '#8B7CFF', '#FF7CE5']
