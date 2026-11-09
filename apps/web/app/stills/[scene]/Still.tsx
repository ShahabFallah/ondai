'use client'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Layer, Scene } from './scenes'

/** On a phone the badge names the real provider; the stills show what the phone shows. */
function relabel(doc: Document) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeValue?.includes('Simulated')) n.nodeValue = n.nodeValue.replace('Simulated', 'On device')
  }
}

const FILL = `
[data-embed] > div > section { height: 100vh !important; align-items: stretch !important; }
[data-embed] > div > section > * { height: 100% !important; max-height: none !important; }
`

const INJECT = `
html, body { background: transparent !important; overflow: hidden !important; }
nextjs-portal, .ambient { display: none !important; }
[data-embed] > div > section { min-height: 0 !important; padding: 0 !important; align-items: flex-start !important; justify-content: center !important; background: transparent !important; }
`

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A registry component through the playground embed, auto-sized to its content. */
function Embed({ layer, dark, fill, onSize }: { layer: Omit<Layer, 'x' | 'y' | 'scale'>; dark: boolean; fill?: boolean; onSize?: (h: number) => void }) {
  const [height, setHeight] = useState(fill ? undefined : 400)
  const qs = new URLSearchParams({ embed: '1', theme: dark ? 'void' : 'paper', accent: 'mono' })
  if (layer.state) qs.set('state', layer.state)
  if (layer.query) for (const [k, v] of new URLSearchParams(layer.query)) qs.set(k, v)
  const src = `/playground/${layer.name}?${qs}`

  const ref = useRef<HTMLIFrameElement>(null)
  const started = useRef(false)
  const onLoad = () => {
    const frame = ref.current
    const doc = frame?.contentDocument
    if (!frame || !doc || started.current) return
    started.current = true
    const style = doc.createElement('style')
    style.textContent = INJECT + (fill ? FILL : '')
    doc.head.appendChild(style)
    let tries = 0
    let readyAt = 0
    const measure = () => {
      tries++
      if (!readyAt && (doc.querySelector('[data-ready="true"]') || tries > 40)) readyAt = tries
      // Scripted states stream and then freeze; give them time to land on their final frame.
      const ready = readyAt && tries - readyAt > 24
      if (ready) relabel(doc)
      if (ready && fill) {
        frame.dataset.ready = 'true'
        return
      }
      const section = doc.querySelector('[data-embed] > div > section') as HTMLElement | null
      const el = (section?.firstElementChild as HTMLElement | null) ?? doc.body
      const h = Math.ceil(el.getBoundingClientRect().height)
      if (ready && h > 20) {
        setHeight(h)
        onSize?.(h)
        frame.dataset.ready = 'true'
      } else window.setTimeout(measure, 150)
    }
    window.setTimeout(measure, 300)
  }

  // The frame can finish loading before hydration attaches onLoad; catch that case too.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (ref.current?.contentDocument?.readyState === 'complete' && ref.current.contentDocument.querySelector('[data-embed]')) {
        window.clearInterval(id)
        onLoad()
      }
    }, 200)
    return () => window.clearInterval(id)
  })

  return (
    <iframe
      ref={ref}
      src={src}
      title={layer.name}
      onLoad={onLoad}
      scrolling="no"
      style={{ width: layer.width, height: fill ? '100%' : height, border: 0, display: 'block', background: 'transparent', colorScheme: dark ? 'dark' : 'light', filter: 'grayscale(1)' }}
    />
  )
}

export function Still({ scene, dark }: { scene: Scene; dark: boolean }) {
  const [sizes, setSizes] = useState<Record<string, number>>({})
  const [ready, setReady] = useState(false)
  const setSize = useCallback((key: string, h: number) => setSizes((s) => ({ ...s, [key]: h })), [])

  // Ready once every embed has reported in, plus a beat for fonts and images.
  useEffect(() => {
    const id = window.setInterval(() => {
      const frames = Array.from(document.querySelectorAll('iframe'))
      if (frames.length && frames.every((f) => f.dataset.ready === 'true')) {
        window.clearInterval(id)
        window.setTimeout(() => setReady(true), 600)
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [])

  const photo = `/img/stills/src-phone-${dark ? 'dark' : 'light'}.png`
  const s = scene.screen
  const ink = dark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.34)'
  const shadow = dark ? 'drop-shadow(0 28px 48px rgba(0,0,0,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))' : 'drop-shadow(0 28px 44px rgba(0,0,0,0.16)) drop-shadow(0 2px 4px rgba(0,0,0,0.06))'

  const links: Array<{ from: Box; side: 'left' | 'right' }> = []
  for (const g of scene.groups)
    for (const l of g.layers) {
      const h = sizes[`${l.name}-${l.x}`]
      if (l.link && h) links.push({ from: { x: l.x, y: l.y, w: l.width * l.scale, h: h * l.scale }, side: l.link })
    }

  return (
    <div
      data-still-ready={ready}
      className={dark ? 'dark' : undefined}
      style={{ position: 'fixed', left: 0, top: 0, width: scene.width, height: scene.height, overflow: 'hidden', background: dark ? '#050506' : '#e9e9ea', zIndex: 10 }}
    >
      {scene.photo === 'phone' ? (
        <img src={photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        // The wall left of the phone (x 0..600 of the 1536 px photograph), slightly soft.
        <div style={{ position: 'absolute', inset: -8, backgroundImage: `url(${photo})`, backgroundSize: `${(1536 * scene.width) / 600}px auto`, backgroundPosition: '0px -150px', backgroundRepeat: 'no-repeat', filter: 'blur(2px)' }} />
      )}

      {s ? (
        <div style={{ position: 'absolute', left: s.x, top: s.y, width: s.w, height: s.h, borderRadius: s.radius, overflow: 'hidden', background: dark ? '#0a0a0c' : '#fafafa' }}>
          <div style={{ width: s.layer.width, height: (s.h / s.w) * s.layer.width, transform: `scale(${s.w / s.layer.width})`, transformOrigin: '0 0', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)', color: dark ? '#f2f2f3' : '#0d0d0f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 34px 0', fontSize: 16, fontWeight: 600 }}>
              <span>9:41</span>
              <svg width="44" height="13" viewBox="0 0 44 13" fill="currentColor" aria-hidden>
                <rect x="0" y="8" width="3" height="5" rx="1" />
                <rect x="5" y="5.5" width="3" height="7.5" rx="1" />
                <rect x="10" y="3" width="3" height="10" rx="1" />
                <rect x="15" y="0.5" width="3" height="12.5" rx="1" />
                <rect x="23.5" y="1" width="18" height="11" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.4" />
                <rect x="25.5" y="3" width="14" height="7" rx="1.5" />
                <rect x="42.5" y="4.5" width="1.5" height="4" rx="0.75" opacity="0.4" />
              </svg>
            </div>
            <div style={{ padding: '44px 24px 0' }}>
              <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>Assistant · offline</p>
              <p style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', margin: '2px 0 0' }}>Saturday</p>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <Embed layer={s.layer} dark={dark} fill />
            </div>
          </div>
          {/* Dynamic island and a faint glass reflection. */}
          <span style={{ position: 'absolute', top: 6, left: '50%', width: s.w * 0.3, height: 9, marginLeft: -(s.w * 0.15), borderRadius: 9, background: '#000' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: s.radius, background: 'linear-gradient(115deg, rgba(255,255,255,0.10), transparent 38%)', pointerEvents: 'none' }} />
        </div>
      ) : null}

      {s && links.length ? (
        <svg width={scene.width} height={scene.height} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden>
          {links.map(({ from, side }, i) => {
            const sx = side === 'left' ? from.x + from.w : from.x
            const sy = from.y + from.h / 2
            const ex = side === 'left' ? s.x - 5 : s.x + s.w + 5
            const ey = Math.min(Math.max(sy, s.y + 70), s.y + s.h - 70)
            const mid = (sx + ex) / 2
            return (
              <g key={i}>
                <path d={`M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ey}, ${ex} ${ey}`} fill="none" stroke={ink} strokeWidth={1} />
                <circle cx={sx} cy={sy} r={2.5} fill={ink} />
                <circle cx={ex} cy={ey} r={2.5} fill={ink} />
              </g>
            )
          })}
        </svg>
      ) : null}

      {scene.groups.map((g, gi) => (
        <div key={gi} style={g.style ?? { position: 'absolute', inset: 0 }}>
          {g.layers.map((l) => (
            <div
              key={`${l.name}-${l.x}-${l.y}`}
              style={
                g.flow
                  ? ({ breakInside: 'avoid', marginBottom: 16, width: l.width, zoom: l.scale, filter: shadow } as CSSProperties)
                  : l.center
                    ? ({ position: 'absolute', left: `calc(50% + ${l.x}px)`, top: `calc(50% + ${l.y}px)`, width: l.width, transform: `translate(-50%, -50%) scale(${l.scale})`, filter: shadow } as CSSProperties)
                    : ({
                  position: 'absolute',
                  left: l.x,
                  top: l.y,
                  width: l.width,
                  transform: `${l.transform ?? ''} scale(${l.scale})`,
                  transformOrigin: '0 0',
                  filter: shadow,
                  } as CSSProperties)
              }
            >
              <Embed layer={l} dark={dark} onSize={(h) => setSize(`${l.name}-${l.x}`, h)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
