'use client'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { CornerDownLeft, Mail, Receipt } from 'lucide-react'
import { BorderBeam, ThinkingOrb, type OrbState } from '@/components/fx'
import { LiveDemo } from '@/components/site/LiveDemo'
import { fillInput } from './fill-input'

const hints = [
  { icon: CornerDownLeft, text: 'Remind me to call Sam tomorrow' },
  { icon: Mail, text: 'Email Priya the budget' },
  { icon: Receipt, text: 'Spent 12 at Blue Bottle' },
]

const TILT = 6 // degrees, each axis
const THINK_MS = 1600
const DONE_MS = 2000

function reducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * The hero device. A CSS phone that tilts toward the pointer, powers on once the demo has mounted,
 * and whose orb listens while you type and thinks when you press Enter. The CommandBar inside is the
 * real registry component on the scripted mock.
 */
export function HeroPhone() {
  const tilt = useRef<HTMLDivElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  const [orb, setOrb] = useState<OrbState>('idle')
  const [typing, setTyping] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  // Power on when the demo is mounted; a fallback so a slow chunk never leaves the screen black.
  const powerOn = useCallback(() => setOn(true), [])
  useEffect(() => {
    const t = setTimeout(powerOn, 2500)
    return () => clearTimeout(t)
  }, [powerOn])

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = tilt.current
    if (!el || reducedMotion()) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--ry', `${(px * TILT * 2).toFixed(2)}deg`)
    el.style.setProperty('--rx', `${(-py * TILT * 2).toFixed(2)}deg`)
  }
  const onLeave = () => {
    const el = tilt.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  // The orb follows the input: listening while there is text, thinking on Enter, done, then idle.
  // The state change is deferred out of the input event: batched into it, the re-render makes the
  // controlled TextInput inside the demo drop the keystroke.
  const onInput = (e: { target: EventTarget }) => {
    const value = (e.target as HTMLInputElement).value ?? ''
    setTimeout(() => {
      setTyping(value.length > 0)
      setOrb((s) => (s === 'thinking' ? s : value ? 'listening' : 'idle'))
    }, 0)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return
    const value = (e.target as HTMLInputElement).value ?? ''
    if (!value.trim()) return
    clearTimers()
    setOrb('thinking')
    timers.current.push(
      setTimeout(() => setOrb('done'), THINK_MS),
      setTimeout(() => {
        setOrb('idle')
        setTyping(false)
      }, THINK_MS + DONE_MS),
    )
  }

  return (
    <div className="phone-scene" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="phone-glow" aria-hidden />
      <div ref={tilt} className="phone-tilt">
        <BorderBeam active={orb === 'thinking'} radius={48} size="md">
          <div className="phone" data-on={on ? 'true' : undefined}>
            <div ref={screen} className="phone-screen" onInputCapture={onInput} onKeyDownCapture={onKeyDown}>
              <div className="phone-island" aria-hidden />
              <div className="phone-ui">
                <div className="phone-topbar">
                  <ThinkingOrb state={orb} size={28} />
                  <span className="phone-topbar-title">Assistant</span>
                  <span className="phone-pill">On device</span>
                </div>
                <div className="phone-demo">
                  <LiveDemo name="command-bar" props={{ showVoice: false, showKeyHints: false, placeholder: 'Ask or do anything…' }} onReady={powerOn} />
                </div>
                <div className="phone-hints" hidden={typing || orb === 'thinking' || orb === 'done'}>
                  <span className="phone-hints-label">Try</span>
                  {hints.map(({ icon: Icon, text }) => (
                    <button key={text} type="button" className="phone-hint" onClick={() => fillInput(screen.current, text)}>
                      <span className="phone-hint-icon">
                        <Icon size={13} strokeWidth={1.5} />
                      </span>
                      <span>{text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </BorderBeam>
      </div>
    </div>
  )
}
