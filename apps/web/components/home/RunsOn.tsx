import { Figure } from './Figure'
import type { FigureKind } from './FigureInner'
import { SpotCard } from './SpotCard'

const devices: Array<{ platform: string; models: string; model: string; figure: FigureKind }> = [
  { platform: 'iPhone', models: 'iPhone 15 Pro and newer, including the 16 and 17 families and the Air.', model: 'Apple Foundation Models, iOS 26', figure: 'phone' },
  { platform: 'iPad and Mac', models: 'iPad Pro and Air with M1 or newer, iPad mini with A17 Pro, Apple silicon Macs.', model: 'Apple Foundation Models, iPadOS 26 and macOS 26', figure: 'laptop' },
  { platform: 'Android', models: 'Pixel 9 and newer, Galaxy S26 and the latest Fold and Flip, OnePlus 13 and newer, other AICore phones.', model: 'Gemini Nano, Android 14', figure: 'hub' },
  { platform: 'Any phone', models: 'An opt-in GGUF model, about a 1 GB download, served on the device.', model: 'Llama through llama.rn', figure: 'router' },
]

export function RunsOn() {
  return (
    <section className="section section-tight" aria-labelledby="runs">
      <div className="wrap">
        <div className="section-head">
          <h2 id="runs" className="h2">
            Runs on.
          </h2>
          <p className="lead">Device lists change with every hardware launch; the docs keep the current matrix.</p>
        </div>
        <div className="runs-grid">
          {devices.map((d) => (
            <SpotCard key={d.platform} className="runs-card">
              <div className="runs-figure">
                <Figure kind={d.figure} label={`${d.platform}: ${d.model}`} />
              </div>
              <div className="runs-text">
                <h3 className="runs-platform">{d.platform}</h3>
                <p className="runs-models">{d.models}</p>
                <p className="runs-model">{d.model}</p>
              </div>
            </SpotCard>
          ))}
        </div>
      </div>
    </section>
  )
}
