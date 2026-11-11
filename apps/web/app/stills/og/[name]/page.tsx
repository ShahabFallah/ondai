import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { aiComponents, displayTitle } from '@/lib/ai-components'
import { COMPONENT_LINES } from '@/lib/component-lines'
import { CHIP_CORE, CHIP_RING } from '@/components/site/Logo'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Link previews (Open Graph), 1200 × 630, not linked anywhere. `site` is the main card; any AI component
 * name is that component's card. `scripts/render-og.mjs` screenshots each at 2x into `public/og/`.
 * Light, monochrome, lit like the site; the pictures are the components' own stills (bevel).
 */

const WALL = ['summarize', 'command-bar', 'translate', 'text-to-event', 'smart-reply', 'ask-page']
const INK = '#0d0d0f'
const SOFT = '#5b5b63'

function Chip({ size, color = INK }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d={CHIP_RING} fill={color} fillRule="evenodd" />
      <path d={CHIP_CORE} fill={color} />
    </svg>
  )
}

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Chip size={34} />
      <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', color: INK }}>ondai</span>
    </div>
  )
}

/** A component still as a lifted card. */
function Still({ name, size, style }: { name: string; size: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.09,
        overflow: 'hidden',
        background: '#eeedf0',
        boxShadow: '0 0 0 1px rgba(13,13,15,0.06), 0 2px 4px rgba(13,13,15,0.04), 0 30px 60px -24px rgba(13,13,15,0.32)',
        ...style,
      }}
    >
      <img src={`/thumbs/light/${name}.webp`} alt="" width={size} height={size} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}

const frame: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  width: 1200,
  height: 630,
  overflow: 'hidden',
  // Window light: a soft diagonal fall across a pale board.
  background:
    'radial-gradient(120% 90% at 85% 10%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%), linear-gradient(115deg, rgba(13,13,15,0.035) 0 18%, transparent 18% 34%, rgba(13,13,15,0.03) 34% 46%, transparent 46%), #f1f1f4',
  fontFamily: 'var(--font-geist-sans), Geist, system-ui, sans-serif',
  color: INK,
}

function SiteCard() {
  return (
    <div style={frame}>
      {/* The wall: six components, tilted back, fading out at the edges. */}
      <div
        style={{
          position: 'absolute',
          left: 560,
          top: -40,
          width: 760,
          height: 720,
          perspective: 1600,
          maskImage: 'linear-gradient(90deg, transparent 0, #000 16%, #000 100%), linear-gradient(180deg, transparent 0, #000 12%, #000 88%, transparent 100%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 236px)', gap: 22, transform: 'rotateX(16deg) rotateY(-20deg) rotateZ(6deg) translate(40px, 70px)', transformOrigin: '30% 50%' }}>
          {WALL.map((n, i) => (
            <Still key={n} name={n} size={236} style={{ transform: `translateY(${i % 3 === 1 ? -36 : 0}px)` }} />
          ))}
        </div>
      </div>
      {/* Words. */}
      <div style={{ position: 'absolute', left: 72, top: 64, bottom: 64, width: 560, display: 'flex', flexDirection: 'column' }}>
        <Wordmark />
        <h1 style={{ margin: '48px 0 0', fontSize: 54, lineHeight: 1.05, fontWeight: 600, letterSpacing: '-0.04em', maxWidth: 520 }}>
          AI components for on-device foundation models.
        </h1>
        <p style={{ margin: '22px 0 0', fontSize: 23, lineHeight: 1.4, color: SOFT, letterSpacing: '-0.01em', maxWidth: 480 }}>
          Production-ready UI that runs on Apple Intelligence and Gemini Nano. Private, offline, instant.
        </p>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 46, padding: '0 18px', borderRadius: 12, background: INK, color: '#fff', fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontSize: 19 }}>
            npx ondai add summarize
          </span>
          <span style={{ fontSize: 19, color: SOFT }}>ondai.dev</span>
        </div>
      </div>
    </div>
  )
}

function ComponentCard({ name }: { name: string }) {
  const m = aiComponents.find((c) => c.name === name)!
  const line = COMPONENT_LINES[name] ?? m.description
  return (
    <div style={frame}>
      <div style={{ position: 'absolute', right: 70, top: 55, display: 'flex' }}>
        <Still name={name} size={520} />
      </div>
      <div style={{ position: 'absolute', left: 72, top: 64, bottom: 64, width: 500, display: 'flex', flexDirection: 'column' }}>
        <Wordmark />
        <span style={{ marginTop: 56, fontSize: 20, color: SOFT, letterSpacing: '-0.005em' }}>AI component</span>
        <h1 style={{ margin: '8px 0 0', fontSize: 76, lineHeight: 1, fontWeight: 600, letterSpacing: '-0.045em' }}>{displayTitle(m.title)}</h1>
        <p style={{ margin: '24px 0 0', fontSize: 28, lineHeight: 1.3, color: SOFT, letterSpacing: '-0.015em' }}>{line}</p>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', height: 46, padding: '0 18px', borderRadius: 12, background: INK, color: '#fff', fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontSize: 19 }}>
            npx ondai add {name}
          </span>
        </div>
      </div>
    </div>
  )
}

export function generateStaticParams() {
  return [{ name: 'site' }, ...aiComponents.map((m) => ({ name: m.name }))]
}

export default async function OgPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  if (name !== 'site' && !aiComponents.some((m) => m.name === name)) notFound()
  return (
    <>
      <style>{`nextjs-portal, .ambient { display: none !important; } html, body { background: #f1f1f4 !important; }`}</style>
      {name === 'site' ? <SiteCard /> : <ComponentCard name={name} />}
    </>
  )
}
