'use client'
import { DEFAULT_VARIANT } from '@/lib/ai-components'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { reels, type DemoName } from '@/components/site/demos'

// The react-native-web tree is client-only.
const ReelDemo = dynamic(() => import('./ReelDemo'), { ssr: false })

type Cam = { x: number; y: number; s: number }
type FocusOpts = { ms: number; s?: number; fill?: number; fillH?: number; max?: number; x?: number; y?: number }

// Slow ease-in-out for a camera move across the screen (on-screen movement, not an entrance).
const ease = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)

declare global {
  interface Window {
    __reel?: {
      ready: boolean
      /**
       * Push in on an element: its centre lands at the frame centre (or at `x`/`y`, 0..1 of the frame).
       * `fill`/`fillH` size it to that share of the frame width/height (capped by `max`); `s` sets the scale outright.
       */
      focus: (selector: string, o: FocusOpts) => Promise<void>
      to: (cam: Partial<Cam>, ms: number) => Promise<void>
      reset: (ms: number) => Promise<void>
      /** Fades the whole stage content (the loop dips out to the empty stage before it starts again). */
      fade: (opacity: number, ms: number) => Promise<void>
      cam: () => Cam
    }
  }
}

/**
 * One registry component on the scripted mock, on a clean stage, inside a "camera" the recorder drives.
 * The camera is moved from requestAnimationFrame (not a compositor animation) so Chrome repaints the
 * text at every scale and it stays sharp while zoomed.
 */
export function CaptureStage({ name, theme, width }: { name: DemoName; theme: 'light' | 'dark'; width: number }) {
  const cam = useRef<HTMLDivElement>(null)
  const state = useRef<Cam>({ x: 0, y: 0, s: 1 })
  const [ready, setReady] = useState(false)
  const reel = reels[name as keyof typeof reels]

  useEffect(() => {
    const el = cam.current
    if (!el) return
    const apply = (c: Cam) => {
      state.current = c
      el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) scale(${c.s})`
    }
    let raf = 0
    const to = (target: Partial<Cam>, ms: number) =>
      new Promise<void>((resolve) => {
        cancelAnimationFrame(raf)
        const from = { ...state.current }
        const end = { ...from, ...target }
        if (ms <= 0) {
          apply(end)
          resolve()
          return
        }
        const t0 = performance.now()
        const step = (now: number) => {
          const k = Math.min(1, (now - t0) / ms)
          const e = ease(k)
          apply({ x: from.x + (end.x - from.x) * e, y: from.y + (end.y - from.y) * e, s: from.s + (end.s - from.s) * e })
          if (k < 1) raf = requestAnimationFrame(step)
          else resolve()
        }
        raf = requestAnimationFrame(step)
      })
    const focus = (selector: string, o: FocusOpts) => {
      const target = document.querySelector(selector)
      if (!target) return Promise.resolve()
      const r = target.getBoundingClientRect()
      const c = state.current
      const at = o
      const byW = (window.innerWidth * (o.fill ?? 0.9)) / (r.width / c.s)
      const byH = o.fillH ? (window.innerHeight * o.fillH) / (r.height / c.s) : Infinity
      const s = o.s ?? Math.min(o.max ?? 2, byW, byH)
      const ms = o.ms
      // Back out the current camera to get the element's resting position.
      const cx = (r.left + r.width / 2 - c.x) / c.s
      const cy = (r.top + r.height / 2 - c.y) / c.s
      const vx = window.innerWidth * (at.x ?? 0.5)
      const vy = window.innerHeight * (at.y ?? 0.5)
      return to({ s, x: vx - s * cx, y: vy - s * cy }, ms)
    }
    const fade = (opacity: number, ms: number) =>
      new Promise<void>((resolve) => {
        el.style.transition = `opacity ${ms}ms cubic-bezier(0.4, 0, 0.2, 1)`
        el.style.opacity = String(opacity)
        setTimeout(resolve, ms)
      })
    window.__reel = { ready: false, focus, to, reset: (ms) => to({ x: 0, y: 0, s: 1 }, ms), fade, cam: () => ({ ...state.current }) }
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (ready && window.__reel) window.__reel.ready = true
  }, [ready])

  return (
    <div className={`capture ${theme === 'dark' ? 'dark' : ''}`} data-capture={name} data-ready={ready ? 'true' : 'false'}>
      <style>{`
        nextjs-portal, .ambient { display: none !important; }
        html, body { background: ${theme === 'dark' ? '#09090B' : '#FAFAFA'}; overflow: hidden; }
        .capture { position: fixed; inset: 0; overflow: hidden; background: ${theme === 'dark' ? '#09090B' : '#FAFAFA'}; }
        .capture-cam { position: absolute; inset: 0; transform-origin: 0 0; display: flex; justify-content: center; align-items: ${reel?.align === 'top' ? 'flex-start' : 'center'}; padding-top: ${reel?.top ?? 0}px; }
        .capture-col { width: ${width}px; }
        .capture * { caret-color: currentColor; }
        /* Screencast only sends a frame when something repaints; this keeps it at the display rate. */
        .capture-tick { position: absolute; left: 0; top: 0; width: 2px; height: 2px; background: currentColor; opacity: 0.002; animation: capture-tick 1s linear infinite; }
        @keyframes capture-tick { from { transform: translateX(0); } to { transform: translateX(1px); } }
      `}</style>
      <span className="capture-tick" aria-hidden />
      <div ref={cam} className="capture-cam">
        <div className="capture-col" data-capture-col>
          <ReelDemo name={name} theme={theme === 'dark' ? 'void' : 'paper'} props={{ variant: DEFAULT_VARIANT, ...reel?.props }} onReady={() => setReady(true)} />
        </div>
      </div>
    </div>
  )
}
