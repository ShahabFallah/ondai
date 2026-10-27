import { LiveDemo } from '@/components/site/LiveDemo'
import type { DemoName } from '@/components/site/demos'
import { SpotCard } from './SpotCard'

const items: Array<{ name: DemoName; title: string; tagline: string }> = [
  { name: 'thinking-indicator', title: 'ThinkingIndicator', tagline: 'A breathing sphere while the model works.' },
  { name: 'ion-border', title: 'IonBorder', tagline: 'A comet of light rides the edge of any container.' },
  { name: 'agent-avatar', title: 'AgentAvatar', tagline: 'A face for the assistant. It looks where you point.' },
  { name: 'voice-input', title: 'VoiceInput', tagline: 'Level-driven bars and a streamed transcript.' },
  { name: 'image-reveal', title: 'ImageReveal', tagline: 'An image resolves as the model reads it.' },
]

export function Primitives() {
  return (
    <section className="section section-tight" aria-labelledby="primitives">
      <div className="wrap">
        <div className="section-head">
          <h2 id="primitives" className="h2">
            Primitives, alive.
          </h2>
          <p className="lead">The small parts every feature is built from, in SVG and Reanimated so they run the same on a phone.</p>
        </div>
        <div className="prim-grid">
          {items.map((item) => (
            <SpotCard key={item.name} className="prim-card">
              <div className="stage prim-stage">
                <LiveDemo name={item.name} title={item.title} />
              </div>
              <div className="prim-meta">
                <h3 className="prim-title">{item.title}</h3>
                <p className="prim-tagline">{item.tagline}</p>
              </div>
            </SpotCard>
          ))}
        </div>
      </div>
    </section>
  )
}
