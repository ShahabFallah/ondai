import type { CSSProperties, ReactNode } from 'react'
import { BorderBeam, LiquidMetal, MetalText } from '@/components/fx'

/** Review page for the metal effects. Imports nothing from the site chrome. */

export const metadata = { title: 'fx · metal', robots: { index: false, follow: false } }

const card: CSSProperties = {
  width: 300,
  height: 180,
  borderRadius: 24,
  background: '#0E1013',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06), inset 0 1px 0 rgba(255,255,255,.05), 0 1px 2px rgba(0,0,0,.4)',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  gap: 4,
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 56 }}>
      <h2 style={{ fontSize: 13, fontWeight: 500, color: '#9BA1A9', margin: '0 0 20px' }}>{title}</h2>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 40 }}>{children}</div>
    </section>
  )
}

export default function MetalFxPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#07080A',
        color: '#EDEFF2',
        padding: '48px 40px 160px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Metal</h1>
      <p style={{ fontSize: 14, color: '#9BA1A9', margin: '6px 0 0' }}>
        LiquidMetal and BorderBeam are libraries.dev&apos;s metal-fx and border-beam; MetalText is an SVG filter. Review only.
      </p>

      <Section title="LiquidMetal · ring, 48 / 64 / 96 px">
        <LiquidMetal size={48} />
        <LiquidMetal size={64} preset="silver" />
        <LiquidMetal size={96} preset="gold" />
      </Section>

      <Section title="LiquidMetal · pill">
        <LiquidMetal shape="pill">
          <span style={{ color: '#07080A', fontSize: 15, fontWeight: 500 }}>Get started</span>
        </LiquidMetal>
        <LiquidMetal shape="pill" width={260} height={56}>
          <code style={{ color: '#07080A', fontSize: 14, fontFamily: 'var(--font-mono)' }}>npx ondai add</code>
        </LiquidMetal>
      </Section>

      <Section title="MetalText · 180 px">
        <MetalText fontSize={180}>ondai</MetalText>
      </Section>

      <Section title="BorderBeam · sm / md / inactive">
        <BorderBeam size="sm">
          <div style={card}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>Beam sm</span>
            <span style={{ fontSize: 14, color: '#9BA1A9' }}>The compact beam</span>
          </div>
        </BorderBeam>
        <BorderBeam size="md" strength={1}>
          <div style={card}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>Beam md</span>
            <span style={{ fontSize: 14, color: '#9BA1A9' }}>Around the whole border</span>
          </div>
        </BorderBeam>
        <BorderBeam active={false}>
          <div style={card}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>Inactive</span>
            <span style={{ fontSize: 14, color: '#9BA1A9' }}>Faded out</span>
          </div>
        </BorderBeam>
      </Section>
    </main>
  )
}
