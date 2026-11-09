'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A short, staged animation that plays once when its element scrolls into view and again on hover.
 *
 * `times` are the moments (ms) at which steps 1..n begin; step 0 is the start pose and step n the rest
 * pose. The element renders `data-step={step}` and CSS transitions carry each step to the next, so a
 * replay rewinds smoothly instead of jumping. Before hydration, with reduced motion, or when the element
 * is already on screen at mount, the step is n: the drawing is complete and nothing moves.
 */
export function useSequence<T extends HTMLElement>(times: number[], { delay = 0 }: { delay?: number } = {}) {
  const ref = useRef<T>(null)
  const last = times.length
  const [step, setStep] = useState(last)
  // The first rewind to the start pose happens off screen and must not animate.
  const [instant, setInstant] = useState(false)
  const timers = useRef<number[]>([])
  const busy = useRef(false)
  const reduced = useRef(true)

  // Keyed by value, so a caller passing a fresh array each render does not restart anything.
  const sig = times.join(',')
  const play = useCallback(
    (wait: number) => {
      const at = sig.split(',').map(Number)
      timers.current.forEach(clearTimeout)
      timers.current = []
      busy.current = true
      setStep(0)
      at.forEach((t, i) => {
        timers.current.push(window.setTimeout(() => setStep(i + 1), wait + t))
      })
      timers.current.push(window.setTimeout(() => (busy.current = false), wait + at[at.length - 1]))
    },
    [sig],
  )

  useEffect(() => {
    const el = ref.current
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!el || reduced.current || typeof IntersectionObserver === 'undefined') return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return
    setInstant(true)
    setStep(0)
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        setInstant(false)
        play(delay + 300)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [delay, play])

  useEffect(() => {
    const t = timers
    return () => t.current.forEach(clearTimeout)
  }, [])

  /** Replays from the start pose, after a pause long enough for the rewind to read. */
  const replay = useCallback(() => {
    if (reduced.current || busy.current) return false
    setInstant(false)
    play(760)
    return true
  }, [play])

  return { ref, step, instant, replay }
}
