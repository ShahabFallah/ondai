'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { submitInput } from './fill-input'

/** Sets a react-native-web TextInput's value the way typing does, without focusing it (no keyboard pops up). */
function setValue(input: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Types `prompt` into the live demo once, the first time the card is properly on screen, then presses
 * Enter, so the card shows the component doing its job. Stops if the visitor gets there first.
 */
export function AutoType({ prompt, delay = 500, disabled, className, children }: { prompt: string; delay?: number; disabled?: boolean; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (disabled || !root || typeof IntersectionObserver === 'undefined') return
    const timers: ReturnType<typeof setTimeout>[] = []
    let started = false
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const run = () => {
      const input = root.querySelector<HTMLInputElement>('input, textarea')
      if (!input) {
        // The demo chunk is still loading; try again shortly.
        timers.push(setTimeout(run, 400))
        return
      }
      if (input.value || document.activeElement === input) return
      if (reduced) {
        setValue(input, prompt)
        timers.push(setTimeout(() => submitInput(root), 60))
        return
      }
      let i = 0
      const tick = () => {
        if (document.activeElement === input) return
        i++
        setValue(input, prompt.slice(0, i))
        if (i < prompt.length) timers.push(setTimeout(tick, 32 + Math.random() * 38))
        else timers.push(setTimeout(() => submitInput(root), 380))
      }
      tick()
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((e) => e.isIntersecting)) return
        started = true
        io.disconnect()
        timers.push(setTimeout(run, delay))
      },
      { threshold: 0.6 },
    )
    io.observe(root)
    return () => {
      io.disconnect()
      for (const t of timers) clearTimeout(t)
    }
  }, [prompt, delay, disabled])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
