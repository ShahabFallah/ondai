import Link from 'next/link'
import { ThinkingOrb } from '@/components/fx'
import { CopyCommand } from '@/components/site/CopyCommand'
import { Reveal } from './Reveal'

export function ClosingCta() {
  return (
    <section className="section home-section cta-section" aria-labelledby="cta">
      <div className="wrap">
        <Reveal className="cta reveal">
          <div className="cta-orb" aria-hidden>
            <ThinkingOrb state="idle" size={56} />
          </div>
          <h2 id="cta" className="cta-title">
            Your users already paid for the model.
          </h2>
          <p className="cta-sub">Put it to work.</p>
          <div className="cta-actions">
            <CopyCommand command="npx ondai init" />
            <Link href="/docs/installation" className="btn btn-primary">
              Get started
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
