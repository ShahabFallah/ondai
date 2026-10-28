import type { ReactNode } from 'react'
import { Reveal } from './Reveal'
import { RouterVisual, StatesVisual, TerminalVisual } from './HowVisuals'

const steps: Array<{ title: string; line: string; visual: ReactNode }> = [
  { title: 'Add it', line: 'The source lands in your repo.', visual: <TerminalVisual /> },
  { title: 'It finds the model', line: 'Whatever the phone already has.', visual: <RouterVisual /> },
  { title: 'Every state, designed', line: 'No spinner and a prayer.', visual: <StatesVisual /> },
]

export function HowItRuns() {
  return (
    <section className="section home-section" aria-labelledby="how">
      <div className="wrap">
        <header className="home-head">
          <h2 id="how" className="home-h2">
            Three steps. No servers.
          </h2>
          <p className="home-sub">No API keys, no token bill.</p>
        </header>
        <Reveal className="reveal">
          <ol className="how">
            {steps.map((s, i) => (
              <li key={s.title} className="how-item">
                <div className="how-head">
                  <span className="how-n" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="how-title">{s.title}</h3>
                    <p className="how-line">{s.line}</p>
                  </div>
                </div>
                <div className="how-vis">{s.visual}</div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
