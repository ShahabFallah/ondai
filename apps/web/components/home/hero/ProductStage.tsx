'use client'
import { useEffect, useRef, type CSSProperties } from 'react'
import { Sparkles } from 'lucide-react'
import { ThinkingOrb } from '@/components/fx'
import { StagePhone } from './StagePhone'

const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/**
 * The product shot under the fold: the phone rises as the stage scrolls in, two floating cards flank it,
 * and everything drifts a little with the pointer. One rAF loop writes CSS variables; nothing re-renders.
 */
export function ProductStage() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--rise', '1')
      return
    }
    const cur = { x: 0, y: 0, rise: 0 }
    const tgt = { x: 0, y: 0, rise: 0 }
    let raf = 0
    let running = false

    const measure = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      // 0 when the stage top sits at the fold, 1 once it has climbed ~45% of the viewport.
      tgt.rise = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.45) - 0.12))
    }
    const tick = () => {
      cur.x = lerp(cur.x, tgt.x, 0.08)
      cur.y = lerp(cur.y, tgt.y, 0.08)
      cur.rise = lerp(cur.rise, tgt.rise, 0.12)
      el.style.setProperty('--px', cur.x.toFixed(4))
      el.style.setProperty('--py', cur.y.toFixed(4))
      el.style.setProperty('--rise', cur.rise.toFixed(4))
      const settled =
        Math.abs(cur.x - tgt.x) < 0.001 &&
        Math.abs(cur.y - tgt.y) < 0.001 &&
        Math.abs(cur.rise - tgt.rise) < 0.001
      if (settled) {
        running = false
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const kick = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(tick)
    }
    const onScroll = () => {
      measure()
      kick()
    }
    const onMove = (e: PointerEvent) => {
      tgt.x = (e.clientX / window.innerWidth - 0.5) * 2
      tgt.y = (e.clientY / window.innerHeight - 0.5) * 2
      kick()
    }
    measure()
    kick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div ref={root} className="hx-stage" style={{ '--rise': 0 } as CSSProperties}>
      <div className="hx-stage-panel" aria-hidden />
      <div className="hx-stage-glow" aria-hidden />

      <div className="hx-float hx-float-l" aria-hidden>
        <div className="hx-card">
          <div className="hx-card-head">
            <span className="hx-av">P</span>
            <span className="hx-card-who">
              <b>Priya</b>
              <span>now</span>
            </span>
          </div>
          <p className="hx-bubble">Budget is in. Can you look before Friday?</p>
          <div className="hx-card-label">
            <Sparkles size={12} strokeWidth={1.75} />
            Suggested replies
          </div>
          <div className="hx-replies">
            <span style={{ '--k': 0 } as CSSProperties}>On it</span>
            <span style={{ '--k': 1 } as CSSProperties}>Looks good to me</span>
            <span style={{ '--k': 2 } as CSSProperties}>Can we talk tomorrow?</span>
          </div>
        </div>
        <span className="hx-tag hx-float-tag">SmartReply</span>
      </div>

      <div className="hx-stage-phone">
        <StagePhone />
      </div>

      <div className="hx-float hx-float-r" aria-hidden>
        <div className="hx-card">
          <div className="hx-card-head">
            <ThinkingOrb state="done" size={22} />
            <span className="hx-card-who">
              <b>Q3 planning</b>
              <span>48 messages</span>
            </span>
          </div>
          <ul className="hx-sum">
            <li style={{ '--k': 0 } as CSSProperties}>Launch moves to May 12</li>
            <li style={{ '--k': 1 } as CSSProperties}>Marketing budget up 8%</li>
            <li style={{ '--k': 2 } as CSSProperties}>Priya books the venue</li>
          </ul>
          <div className="hx-card-foot">
            <span className="hx-live-dot" />
            Summarized on device in 0.4 s
          </div>
        </div>
        <span className="hx-tag hx-float-tag">Summarize</span>
      </div>
    </div>
  )
}
