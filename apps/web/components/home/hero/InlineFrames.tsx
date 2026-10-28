'use client'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Cpu, WifiOff } from 'lucide-react'
import { ThinkingOrb, type OrbState } from '@/components/fx'
import { useBoxHeight, useReducedMotion } from './hooks'

/**
 * The small screens that sit inside the headline, each with a floating tag on a corner.
 * Sized in `em` so they scale with the headline; the effects inside are drawn at the real pixel size.
 */
function Frame({
  i,
  tag,
  icon,
  corner,
  className,
  children,
}: {
  i: number
  tag: string
  icon: ReactNode
  corner: 'tr' | 'br'
  className: string
  children: ReactNode
}) {
  return (
    <span className="hx-frame-wrap hx-in" style={{ '--i': i } as CSSProperties} aria-hidden>
      <span className={`hx-frame ${className}`}>{children}</span>
      <span className="hx-tag" data-corner={corner}>
        {icon}
        {tag}
      </span>
    </span>
  )
}

const ORB_CYCLE: [OrbState, number][] = [
  ['idle', 1400],
  ['listening', 1800],
  ['thinking', 2600],
  ['done', 1600],
]

/** "thinks": the ThinkingOrb walking through its states. */
export function OrbFrame({ i }: { i: number }) {
  const box = useRef<HTMLSpanElement>(null)
  const h = useBoxHeight(box)
  const reduced = useReducedMotion()
  const [step, setStep] = useState(2)
  useEffect(() => {
    if (reduced) return
    const t = setTimeout(() => setStep((s) => (s + 1) % ORB_CYCLE.length), ORB_CYCLE[step]![1])
    return () => clearTimeout(t)
  }, [step, reduced])
  const state = reduced ? 'idle' : ORB_CYCLE[step]![0]
  return (
    <Frame
      i={i}
      tag="On device"
      icon={<Cpu size={12} strokeWidth={1.75} />}
      corner="tr"
      className="hx-frame-orb"
    >
      <span ref={box} className="hx-frame-fill" data-state={state}>
        {h > 0 ? <ThinkingOrb state={state} size={Math.round(h * 0.62)} /> : null}
      </span>
    </Frame>
  )
}

const COMMANDS = [
  { ask: 'Remind me to call Sam', what: 'Call Sam', meta: 'Tomorrow' },
  { ask: 'Spent 12 at Blue Bottle', what: 'Blue Bottle', meta: '$12.00' },
  { ask: 'Email Priya the budget', what: 'Budget to Priya', meta: 'Sent' },
]
type Phase = 'typing' | 'thinking' | 'answer'
const CHAR_MS = 52

/** "phone": a tiny screen where a command gets typed, thought about and answered. */
export function TypeFrame({ i }: { i: number }) {
  const reduced = useReducedMotion()
  const [n, setN] = useState(0)
  const [len, setLen] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')
  const cmd = COMMANDS[n]!

  useEffect(() => {
    if (reduced) return
    let t: ReturnType<typeof setTimeout>
    if (phase === 'typing') {
      if (len < cmd.ask.length)
        t = setTimeout(() => setLen(len + 1), len === 0 ? 700 : CHAR_MS + (len % 5 === 0 ? 40 : 0))
      else t = setTimeout(() => setPhase('thinking'), 380)
    } else if (phase === 'thinking') t = setTimeout(() => setPhase('answer'), 1100)
    else
      t = setTimeout(() => {
        setPhase('typing')
        setLen(0)
        setN((v) => (v + 1) % COMMANDS.length)
      }, 2200)
    return () => clearTimeout(t)
  }, [phase, len, cmd.ask.length, reduced])

  const shown = reduced ? COMMANDS[0]! : cmd
  const p: Phase = reduced ? 'answer' : phase
  const text = reduced ? '' : p === 'answer' ? '' : cmd.ask.slice(0, len)

  return (
    <Frame
      i={i}
      tag="Offline"
      icon={<WifiOff size={12} strokeWidth={1.75} />}
      corner="br"
      className="hx-frame-type"
    >
      <span className="hx-mini" data-phase={p}>
        <span className="hx-mini-bar">
          <span className="hx-mini-dot" />
          <span className="hx-mini-text">
            {text || <span className="hx-mini-ph">Ask anything</span>}
            {p === 'typing' ? <span className="hx-mini-caret" /> : null}
          </span>
          <span className="hx-mini-sweep" />
        </span>
        <span className="hx-mini-result" key={`${n}-${p === 'answer'}`}>
          <span className="hx-mini-check">
            <Check size="0.9em" strokeWidth={3} />
          </span>
          <span className="hx-mini-what">{shown.what}</span>
          <span className="hx-mini-meta">{shown.meta}</span>
        </span>
      </span>
    </Frame>
  )
}
