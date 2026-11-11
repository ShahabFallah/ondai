'use client'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AppleMark, GeminiMark, GoogleMark } from '@/components/site/BrandMarks'
import { CHIP_CORE, CHIP_RING, Logo } from '@/components/site/Logo'
import './film.css'

/*
 * The product film. One clock (seconds since start) drives everything: a requestAnimationFrame loop writes
 * transforms straight onto the elements (no React renders per frame) and fires the timeline's events: typing
 * into a component, switching its playground state (which remounts it, so its scripted model starts from
 * zero), tapping a button. The components are the real registry components in the playground embed, one
 * iframe each, loaded up front in their resting state so nothing waits on the network mid-film.
 */

const STAGE = { w: 1600, h: 900 }
/** The phone's screen in CSS px (an iPhone's points), and its body around it. */
const SCREEN = { w: 375, h: 812, r: 54 }
const BAND = 3
const GLASS = 12
const BODY = { w: SCREEN.w + (BAND + GLASS) * 2, h: SCREEN.h + (BAND + GLASS) * 2, r: SCREEN.r + BAND + GLASS }
/** Where the app content starts under the status bar. */
const TOP = 50
/** Film length: the end card holds until here; record-film.mjs adds the loop fade after it. */
export const FILM_LENGTH = 16.9

// ---------- easing ----------
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1
  const b = (a1: number, a2: number) => 3 * a2 - 6 * a1
  const c = (a1: number) => 3 * a1
  const at = (t: number, a1: number, a2: number) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t
  const slope = (t: number, a1: number, a2: number) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1)
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const s = slope(t, x1, x2)
      if (Math.abs(s) < 1e-6) break
      t -= (at(t, x1, x2) - x) / s
    }
    return at(Math.min(1, Math.max(0, t)), y1, y2)
  }
}
/** The site's curves (global.css). */
const easeOut = bezier(0.23, 1, 0.32, 1)
const easeInOut = bezier(0.77, 0, 0.175, 1)
const easeSoft = bezier(0.2, 0.8, 0.2, 1)
const easeCam = bezier(0.65, 0, 0.25, 1)
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

// ---------- the script ----------
type Shot = { name: string; initial: string; label: string; title: ReactNode; line: string; at: number }
const SHOTS: Shot[] = [
  { name: 'command-bar', initial: 'idle', label: 'CommandBar', title: 'Say it. The app does it.', line: 'A request becomes one of your app’s actions, picked by the model on the phone.', at: 1.7 },
  { name: 'agent-run', initial: 'idle', label: 'AgentRun', title: 'An agent that asks first.', line: 'Every step runs on the device. Anything risky waits for your OK.', at: 4.4 },
  { name: 'semantic-search', initial: 'idle', label: 'SemanticSearch', title: 'Search by meaning.', line: 'A local index over your own notes. Nothing leaves the phone.', at: 8.9 },
  { name: 'voice-memo', initial: 'record', label: 'VoiceMemo', title: <>Talk. Get the <span style={{ whiteSpace: 'nowrap' }}>to-dos.</span></>, line: 'Speech in; a summary and the tasks you mentioned out, ready to add.', at: 11.45 },
]
const OUTRO = 13.95
const DINNER = 'Dinner at Luigi’s was 42 euros'
const TRIP = 'my trip to Portugal'

const MARKS: { key: string; node: ReactNode }[] = [
  { key: 'apple', node: <AppleMark size={34} /> },
  { key: 'gemini', node: <GeminiMark size={32} /> },
  { key: 'google', node: <GoogleMark size={30} /> },
  {
    key: 'ondai',
    node: (
      <svg width={32} height={32} viewBox="0 0 100 100" aria-hidden="true">
        <path d={CHIP_RING} fill="currentColor" fillRule="evenodd" />
        <path d={CHIP_CORE} fill="currentColor" />
      </svg>
    ),
  },
]

const dolly = (t: number) => easeCam(seg(t, 1.5, 2.55))

/** The phone's pose over the film: centre x, top y, scale, tilt (deg), opacity. */
function phonePose(t: number) {
  const rise = easeOut(seg(t, 0.05, 1.7))
  let cx = 800
  let top = lerp(980, 92, rise)
  let s = 0.84
  let tilt = lerp(28, 0, easeOut(seg(t, 0.05, 1.9)))
  let op = easeSoft(seg(t, 0.05, 0.7))
  // Dolly in: the phone moves right and comes closer, its foot leaving the frame.
  const dolly = easeCam(seg(t, 1.5, 2.55))
  cx = lerp(cx, 1088, dolly)
  top = lerp(top, 38, dolly)
  s = lerp(s, 1.46, dolly)
  // Out: back to the centre, pulling away and sinking out of frame.
  const out = easeCam(seg(t, OUTRO, OUTRO + 1.25))
  cx = lerp(cx, 800, out)
  top = lerp(top, 1000, out)
  s = lerp(s, 0.9, out)
  tilt = lerp(tilt, -10, out)
  op = op * (1 - easeSoft(seg(t, OUTRO + 0.6, OUTRO + 1.25)))
  return { cx, top, s, tilt, op }
}

type Act = { at: number; fn: () => boolean | void; done?: boolean }
type Run = { from: number; to: number; fn: (p: number) => void }

export function Film({ dark, manual }: { dark: boolean; manual: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const glintRef = useRef<HTMLDivElement>(null)
  const screenRefs = useRef<(HTMLDivElement | null)[]>([])
  const frameRefs = useRef<(HTMLIFrameElement | null)[]>([])
  const capRefs = useRef<(HTMLDivElement | null)[]>([])
  const tileRefs = useRef<(HTMLDivElement | null)[]>([])
  const touchRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const endChipRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState<boolean[]>(SHOTS.map(() => false))
  const [screenBg, setScreenBg] = useState(dark ? '#0b0b0d' : '#fafafa')
  const startRef = useRef<number | null>(null)

  const theme = dark ? 'void' : 'paper'
  const src = (s: Shot) => `/stills/film/screen/${s.name}?${new URLSearchParams({ theme, state: s.initial })}`

  // Fit the 1600 × 900 stage to the window.
  useEffect(() => {
    const fit = () => {
      const k = Math.min(window.innerWidth / STAGE.w, window.innerHeight / STAGE.h)
      if (stageRef.current) stageRef.current.style.transform = `scale(${k})`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Each screen (./screen/[name]): wait for the component, take its background for the phone's screen.
  const onFrameLoad = (i: number) => {
    const f = frameRefs.current[i]
    const poll = () => {
      const doc = f?.contentDocument
      if (!doc || doc.documentElement.getAttribute('data-film-ready') !== '1') return void setTimeout(poll, 100)
      if (i === 0) setScreenBg(getComputedStyle(doc.body).backgroundColor)
      const style = doc.createElement('style')
      style.textContent = `
        html, body { overflow: hidden !important; }
        nextjs-portal, .ambient { display: none !important; }
        ::-webkit-scrollbar { display: none; }
        input, textarea { caret-color: currentColor; }
      `
      doc.head.appendChild(style)
      setTimeout(() => setReady((r) => r.map((v, j) => (j === i ? true : v))), 500)
    }
    poll()
  }

  const allReady = ready.every(Boolean)

  useEffect(() => {
    if (!allReady) return
    let raf = 0
    const frames = () => frameRefs.current
    const doc = (i: number) => frames()[i]?.contentDocument ?? null
    const post = (i: number, value: string) => frames()[i]?.contentWindow?.postMessage({ type: 'ondai:state', value }, location.origin)
    const findButton = (i: number, text?: string) => {
      const d = doc(i)
      if (!d) return null
      const all = [...d.querySelectorAll<HTMLElement>('button, [role="button"]')]
      return (text ? all.find((b) => b.textContent?.trim() === text) : all[0]) ?? null
    }
    const typeInto = (i: number, text: string, n: number) => {
      const input = doc(i)?.querySelector<HTMLInputElement>('input, textarea')
      if (!input) return
      const value = text.slice(0, n)
      if (input.value === value) return
      const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    const submit = (i: number) => {
      const input = doc(i)?.querySelector<HTMLInputElement>('input, textarea')
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }))
    }
    // A touch: a soft dot over the button's centre (phone coordinates), then the press itself.
    let touch: { at: number; x: number; y: number } | null = null
    const tap = (i: number, el: HTMLElement | null, t: number) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      touch = { at: t, x: r.left + r.width / 2, y: TOP + r.top + r.height / 2 }
    }

    const S = SHOTS.map((s) => s.at)
    const acts: Act[] = [
      // 1. CommandBar: the sentence is typed (the matching action rises to the top), then it runs.
      { at: 2.75, fn: () => submit(0) },
      // 2. AgentRun: tap Run, the steps play; tap Confirm on the approval card.
      { at: S[1] + 0.75, fn: () => tap(1, findButton(1, 'Run'), S[1] + 0.75) },
      { at: S[1] + 0.95, fn: () => post(1, 'running') },
      {
        // Once the approval card has been on screen and settled for a moment.
        at: S[1] + 2.4,
        fn: () => {
          const b = findButton(1, 'Confirm')
          const r = b?.getBoundingClientRect()
          if (!b || !r || r.height < 10 || r.bottom > SCREEN.h - TOP) {
            confirmSeen = null
            return false
          }
          const rect = `${Math.round(r.top)}:${Math.round(r.height)}`
          if (!confirmSeen || confirmSeen.rect !== rect) confirmSeen = { at: now(), rect }
          if (now() - confirmSeen.at < 0.6) return false
          tap(1, b, now())
          later.push({ at: now() + 0.2, fn: () => void b.click() })
        },
      },
      // 4. VoiceMemo: tap the mic, the memo is read.
      { at: S[3] + 0.6, fn: () => tap(3, findButton(3), S[3] + 0.6) },
      { at: S[3] + 0.8, fn: () => post(3, 'done') },
    ]
    const later: Act[] = []
    let confirmSeen: { at: number; rect: string } | null = null
    const runs: Run[] = [
      { from: 1.45, to: 2.5, fn: (p) => typeInto(0, DINNER, Math.round(p * DINNER.length)) },
      // 3. SemanticSearch: the search runs as the words land (by meaning: no word of it is in the note).
      { from: S[2] + 0.45, to: S[2] + 1.35, fn: (p) => typeInto(2, TRIP, Math.round(p * TRIP.length)) },
    ]

    let endChip = { x: 800, y: 430, size: 60 }
    const measureEnd = () => {
      const stage = stageRef.current!.getBoundingClientRect()
      const k = stage.width / STAGE.w
      const r = endChipRef.current?.querySelector('.ondai-logo-o')?.getBoundingClientRect()
      if (r) endChip = { x: (r.left - stage.left + r.width / 2) / k, y: (r.top - stage.top + r.height / 2) / k, size: r.width / k }
    }

    const now = () => (startRef.current === null ? 0 : (performance.now() - startRef.current) / 1000)

    const tick = () => {
      const t = now()
      for (const a of [...acts, ...later]) if (!a.done && t >= a.at && a.fn() !== false) a.done = true
      for (const r of runs) if (t >= r.from && t <= r.to + 0.2) r.fn(seg(t, r.from, r.to))

      // Phone.
      const p = phonePose(t)
      const phone = phoneRef.current!
      phone.style.transform = `translate(${p.cx - BODY.w / 2}px, ${p.top}px) perspective(2400px) rotateX(${p.tilt}deg) scale(${p.s})`
      phone.style.opacity = String(p.op)
      // One light sweep across the glass as the phone settles.
      const g = seg(t, 1.0, 2.4)
      glintRef.current!.style.transform = `translateX(${lerp(-140, 140, easeInOut(g))}%) skewX(-18deg)`
      glintRef.current!.style.opacity = String(g > 0 && g < 1 ? Math.sin(g * Math.PI) * (dark ? 0.5 : 0.7) : 0)

      // Screens: each shot slides up into place while the last lifts away.
      SHOTS.forEach((s, i) => {
        const el = screenRefs.current[i]!
        const next = SHOTS[i + 1]?.at ?? OUTRO + 0.9
        const inP = i === 0 ? 1 : easeOut(seg(t, s.at + 0.12, s.at + 0.8))
        const outP = easeInOut(seg(t, next, next + 0.45))
        const op = inP * (1 - outP)
        el.style.opacity = String(op)
        el.style.visibility = op <= 0.001 ? 'hidden' : 'visible'
        el.style.transform = `translateY(${lerp(34, 0, inP) - 20 * outP}px) scale(${1 - 0.025 * outP})`
      })
      // Touch dot.
      const td = touchRef.current!
      if (touch) {
        const k = t - touch.at
        const inK = easeOut(seg(k, 0, 0.16))
        const outK = easeSoft(seg(k, 0.36, 0.7))
        td.style.opacity = String(inK * (1 - outK) * 0.95)
        td.style.transform = `translate(${touch.x - 22}px, ${touch.y - 22}px) scale(${lerp(1.5, 1, inK) - 0.08 * Math.sin(seg(k, 0.1, 0.3) * Math.PI) + 0.3 * outK})`
      } else td.style.opacity = '0'

      // Captions.
      SHOTS.forEach((s, i) => {
        const el = capRefs.current[i]!
        const next = SHOTS[i + 1]?.at ?? OUTRO
        const kids = [...el.children] as HTMLElement[]
        kids.forEach((kid, j) => {
          const inP = easeOut(seg(t, s.at + 0.25 + j * 0.07, s.at + 1.0 + j * 0.07))
          const outP = easeInOut(seg(t, next - 0.05 + j * 0.04, next + 0.4 + j * 0.04))
          kid.style.opacity = String(inP * (1 - outP))
          kid.style.transform = `translateY(${lerp(22, 0, inP) - 14 * outP}px)`
        })
      })
      const brand = brandRef.current!
      const bIn = easeOut(seg(t, 1.9, 2.8)) * (1 - easeInOut(seg(t, OUTRO, OUTRO + 0.4)))
      brand.style.opacity = String(bIn)

      // The marks orbit the phone on a tilted ring around its waist, passing behind it.
      const ringY = p.top + p.s * lerp(600, 560, dolly(t))
      const rx = p.s * lerp(300, 318, dolly(t))
      const ry = p.s * lerp(58, 48, dolly(t))
      const conv = easeCam(seg(t, OUTRO + 0.25, OUTRO + 1.45))
      MARKS.forEach((_, i) => {
        const el = tileRefs.current[i]!
        const a = -Math.PI / 2 + i * (Math.PI / 2) + t * ((Math.PI * 2) / 15) + 0.5
        const depth = Math.sin(a)
        const x = p.cx + rx * Math.cos(a)
        const y = ringY + ry * depth
        const appear = easeOut(seg(t, 0.55 + i * 0.12, 1.6 + i * 0.12))
        const size = 76 * Math.sqrt(p.s) * lerp(0.78, 1.04, (depth + 1) / 2) * lerp(0.6, 1, appear)
        // Converge on the wordmark's chip.
        const fx = lerp(x, endChip.x, conv)
        const fy = lerp(y, endChip.y, conv)
        const fs = lerp(size, endChip.size * 1.25, conv)
        el.style.transform = `translate(${fx - fs / 2}px, ${fy - fs / 2}px) scale(${fs / 76})`
        el.style.opacity = String(appear * lerp(0.55, 1, (depth + 1) / 2) ** (1 - conv) * (1 - easeSoft(seg(t, OUTRO + 1.05, OUTRO + 1.5))))
        el.style.zIndex = depth > 0 || conv > 0.2 ? '4' : '1'
      })

      // End card.
      const end = endRef.current!
      const kids = [...end.children] as HTMLElement[]
      kids.forEach((kid, j) => {
        const inP = easeOut(seg(t, OUTRO + 0.8 + j * 0.15, OUTRO + 1.65 + j * 0.15))
        kid.style.opacity = String(inP)
        kid.style.transform = `translateY(${lerp(18, 0, inP)}px)`
      })

      raf = requestAnimationFrame(tick)
    }

    const start = () => {
      measureEnd()
      startRef.current = performance.now()
      return Date.now()
    }
    // The recorder's handles (scripts/record-film.mjs).
    Object.assign(window, { __filmLength: FILM_LENGTH, __filmStart: start, __filmReady: true })
    raf = requestAnimationFrame(tick)
    let auto: ReturnType<typeof setTimeout> | undefined
    if (!manual) auto = setTimeout(start, 400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(auto)
      Object.assign(window, { __filmReady: false })
    }
  }, [allReady, manual, dark])

  return (
    <div ref={rootRef} className="film" data-dark={dark || undefined}>
      <div ref={stageRef} className="film-stage">
        <div className="film-light" aria-hidden="true" />

        <div ref={brandRef} className="film-brand" style={{ opacity: 0 }}>
          <Logo size={34} />
        </div>

        <div className="film-captions">
          {SHOTS.map((s, i) => (
            <div key={s.name} ref={(el) => void (capRefs.current[i] = el)} className="film-caption">
              <div className="film-eyebrow" style={{ opacity: 0 }}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span className="film-eyebrow-rule" />
                <span>{s.label}</span>
              </div>
              <h2 style={{ opacity: 0 }}>{s.title}</h2>
              <p style={{ opacity: 0 }}>{s.line}</p>
            </div>
          ))}
        </div>

        {MARKS.map((m, i) => (
          <div key={m.key} ref={(el) => void (tileRefs.current[i] = el)} className="film-tile" style={{ opacity: 0 }}>
            {m.node}
          </div>
        ))}

        <div ref={phoneRef} className="film-phone" style={{ width: BODY.w, height: BODY.h, borderRadius: BODY.r, opacity: 0, transform: 'translate(0, 1000px)' } as CSSProperties}>
          <div className="film-phone-glass" style={{ inset: BAND, borderRadius: BODY.r - BAND }} />
          <div className="film-screen" style={{ left: BAND + GLASS, top: BAND + GLASS, width: SCREEN.w, height: SCREEN.h, borderRadius: SCREEN.r, background: screenBg }}>
            {SHOTS.map((s, i) => (
              <div key={s.name} ref={(el) => void (screenRefs.current[i] = el)} className="film-app" style={{ top: TOP, height: SCREEN.h - TOP, opacity: i === 0 ? 1 : 0 }}>
                <iframe ref={(el) => void (frameRefs.current[i] = el)} src={src(s)} title={s.label} tabIndex={-1} onLoad={() => onFrameLoad(i)} />
              </div>
            ))}
            <StatusBar />
            <div className="film-island" />
            <div ref={touchRef} className="film-touch" style={{ opacity: 0 }} />
            <div className="film-glint-clip">
              <div ref={glintRef} className="film-glint" />
            </div>
            <div className="film-home" />
          </div>
        </div>

        <div ref={endRef} className="film-end">
          <div ref={endChipRef} style={{ opacity: 0 }}>
            <Logo size={132} />
          </div>
          <p className="film-end-line" style={{ opacity: 0 }}>
            AI components for on-device foundation models.
          </p>
          <div className="film-end-runs" style={{ opacity: 0 }}>
            <span>
              <AppleMark size={17} /> Apple Intelligence
            </span>
            <span className="film-dot" />
            <span>
              <GeminiMark size={16} /> Gemini Nano
            </span>
            <span className="film-dot" />
            <span>React Native</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="film-status">
      <span>9:41</span>
      <span className="film-status-icons">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
          <path d="M8 2.6c2.2 0 4.2.9 5.7 2.3l1.1-1.1A9.6 9.6 0 0 0 8 1C5.4 1 3 2 1.2 3.8l1.1 1.1A8 8 0 0 1 8 2.6Zm0 3.2c1.3 0 2.5.5 3.4 1.3l1.1-1.1A6.4 6.4 0 0 0 8 4.2c-1.7 0-3.3.7-4.5 1.8l1.1 1.1A4.8 4.8 0 0 1 8 5.8ZM8 9l1.9-1.9a2.7 2.7 0 0 0-3.8 0L8 9Z" transform="translate(0 1.5)" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" strokeOpacity="0.4" />
          <rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  )
}
