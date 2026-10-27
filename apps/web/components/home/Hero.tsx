import Link from 'next/link'
import { CopyCommand } from '@/components/site/CopyCommand'
import { AsciiCanvas } from '@/components/fx'
import { HeroPhone } from './HeroPhone'

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1 id="hero-title" className="display max-w-[13ch]">
            The model is already on the phone.
          </h1>
          <p className="lead mt-6 max-w-[52ch]">
            Ondai is a set of copy-paste React Native components, each one a finished on-device AI feature: a command bar, forms that fill themselves, summaries, replies, filters. It runs on the phone&apos;s own model, so it is free, private, and works in airplane mode.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/docs/installation" className="btn btn-primary btn-lg">
              Get started
            </Link>
            <Link href="/playground" className="btn btn-secondary btn-lg">
              Browse components
            </Link>
          </div>
          <div className="mt-5">
            <CopyCommand command="npx ondai add command-bar" />
          </div>
        </div>
        <div className="hero-visual">
          <div className="relative">
            <AsciiCanvas src="/img/hero-chip.png" drift cell={10} color="var(--ondai-text-tertiary)" className="phone-ascii left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            <HeroPhone />
          </div>
          <p className="label muted mt-2 text-center">The real CommandBar on a scripted mock. Type a request and press Enter.</p>
        </div>
      </div>
    </section>
  )
}
