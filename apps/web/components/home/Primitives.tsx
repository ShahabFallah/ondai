import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { LiveDemo } from '@/components/site/LiveDemo'
import type { DemoName } from '@/components/site/demos'
import { Reveal } from './Reveal'

/** `zoom` fits the larger primitives (laid out for a 360 px frame) into a shelf cell. */
const items: Array<{ name: DemoName; title: string; line: string; zoom?: number; props?: Record<string, unknown> }> = [
  { name: 'thinking-indicator', title: 'ThinkingIndicator', line: 'Thinks out loud.' },
  { name: 'agent-avatar', title: 'AgentAvatar', line: 'Follows your cursor.' },
  { name: 'ion-border', title: 'IonBorder', line: 'Light on the edge.', zoom: 0.86 },
  { name: 'voice-input', title: 'VoiceInput', line: 'Hears every word.', zoom: 0.62 },
  { name: 'image-reveal', title: 'ImageReveal', line: 'Sees, then shows.', zoom: 0.6 },
]

export function Primitives() {
  return (
    <section className="section section-tight home-section" aria-labelledby="primitives">
      <div className="wrap">
        <header className="home-head">
          <h2 id="primitives" className="home-h2">
            The toy shelf.
          </h2>
          <p className="home-sub">Small primitives with a pulse.</p>
        </header>
        <Reveal className="shelf reveal">
          {items.map((item) => (
            <div key={item.name} className="shelf-cell">
              <div className="shelf-stage">
                <div className="shelf-toy" style={item.zoom ? { zoom: item.zoom } : undefined}>
                  <LiveDemo name={item.name} title={item.title} props={item.props} />
                </div>
              </div>
              <Link href={`/playground/${item.name}`} className="shelf-meta" aria-label={`Open ${item.title} in the playground`}>
                <span className="shelf-title">{item.title}</span>
                <span className="shelf-line">{item.line}</span>
                <ArrowUpRight className="shelf-arrow" size={14} strokeWidth={1.75} aria-hidden />
              </Link>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
