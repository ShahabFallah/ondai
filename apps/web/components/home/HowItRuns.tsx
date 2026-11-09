import { Steps } from './how/Steps'
import './how.css'

/**
 * "Three steps. No servers." Three square cards of grainy window light, each a thin-line drawing that acts
 * its step out (components/home/how/Steps.tsx), with a title and one line beneath. The closing card
 * (ClosingCta) follows straight after as their conclusion.
 */
export function HowItRuns() {
  return (
    <section className="section home-section how" aria-labelledby="how">
      <div className="wrap">
        <header className="home-head">
          <h2 id="how" className="home-h2">
            Three steps. No servers.
          </h2>
          <p className="home-sub">No API keys, no token bill.</p>
        </header>
        <Steps />
      </div>
    </section>
  )
}
