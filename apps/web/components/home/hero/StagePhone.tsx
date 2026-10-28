'use client'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CornerDownLeft, Mail, Receipt } from 'lucide-react'
import { BorderBeam, ThinkingOrb, type OrbState } from '@/components/fx'
import { LiveDemo } from '@/components/site/LiveDemo'
import { fillInput } from '../fill-input'
import { useSiteDark } from './hooks'

const hints = [
  { icon: CornerDownLeft, text: 'Remind me to call Sam tomorrow' },
  { icon: Mail, text: 'Email Priya the budget' },
  { icon: Receipt, text: 'Spent 12 at Blue Bottle' },
]

const THINK_MS = 1600
const DONE_MS = 2000

/**
 * The product shot's device: a CSS phone (titanium in light mode, graphite in dark) running the real
 * CommandBar on the scripted mock. The orb in the top bar listens while you type, thinks on Enter.
 */
export function StagePhone() {
  const screen = useRef<HTMLDivElement>(null)
  const dark = useSiteDark()
  const [on, setOn] = useState(false)
  const [orb, setOrb] = useState<OrbState>('idle')
  const [typing, setTyping] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  // Power on when the demo has mounted; a fallback so a slow chunk never leaves the screen dark.
  const powerOn = useCallback(() => setOn(true), [])
  useEffect(() => {
    const t = setTimeout(powerOn, 2500)
    return () => clearTimeout(t)
  }, [powerOn])

  // Deferred out of the input event: batched into it, the re-render makes the controlled
  // react-native-web TextInput inside the demo drop the keystroke.
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
        // The bar may have cleared itself after answering; the hints come back only when it is empty.
        const input = screen.current?.querySelector<HTMLInputElement>('input, textarea')
        setTyping(!!input?.value)
      }, THINK_MS + DONE_MS),
    )
  }

  return (
    <BorderBeam active={orb === 'thinking'} radius={54} size="md" className="hx-phone-beam">
      <div className="hx-phone" data-on={on ? 'true' : undefined}>
        <span className="hx-phone-btn hx-phone-btn-a" aria-hidden />
        <span className="hx-phone-btn hx-phone-btn-b" aria-hidden />
        <span className="hx-phone-btn hx-phone-btn-c" aria-hidden />
        <div
          ref={screen}
          className="hx-screen"
          onInputCapture={onInput}
          onKeyDownCapture={onKeyDown}
        >
          <div className="hx-status" aria-hidden>
            <span>9:41</span>
            <span className="hx-island" />
            <span className="hx-status-r">
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
                <rect x="0" y="7" width="3" height="4" rx="1" />
                <rect x="4.5" y="5" width="3" height="6" rx="1" />
                <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
                <rect x="13.5" y="0" width="3" height="11" rx="1" opacity="0.35" />
              </svg>
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                <rect
                  x="0.5"
                  y="0.5"
                  width="21"
                  height="11"
                  rx="3.5"
                  stroke="currentColor"
                  opacity="0.4"
                />
                <rect x="2" y="2" width="15" height="8" rx="2" fill="currentColor" />
                <path
                  d="M23 4v4c.8-.3 1.3-1.1 1.3-2S23.8 4.3 23 4Z"
                  fill="currentColor"
                  opacity="0.45"
                />
              </svg>
            </span>
          </div>
          <div className="hx-ui">
            <div className="hx-topbar">
              <ThinkingOrb state={orb} size={30} />
              <div className="hx-topbar-text">
                <span className="hx-topbar-title">Assistant</span>
                <span className="hx-topbar-sub">
                  {orb === 'thinking'
                    ? 'Thinking on device'
                    : orb === 'listening'
                      ? 'Listening'
                      : orb === 'done'
                        ? 'Done'
                        : 'Ready, offline'}
                </span>
              </div>
            </div>
            <div className="hx-demo">
              <LiveDemo
                name="command-bar"
                theme={dark ? 'void' : 'paper'}
                props={{
                  showVoice: false,
                  showKeyHints: false,
                  placeholder: 'Ask or do anything…',
                }}
                onReady={powerOn}
              />
            </div>
            <div className="hx-hints" hidden={typing || orb === 'thinking' || orb === 'done'}>
              <span className="hx-hints-label">Try</span>
              {hints.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  type="button"
                  className="hx-hint"
                  onClick={() => fillInput(screen.current, text)}
                >
                  <span className="hx-hint-icon">
                    <Icon size={13} strokeWidth={1.6} />
                  </span>
                  <span>{text}</span>
                </button>
              ))}
            </div>
          </div>
          <span className="hx-home" aria-hidden />
        </div>
      </div>
    </BorderBeam>
  )
}
