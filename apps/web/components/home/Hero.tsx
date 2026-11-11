import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { OrbFrame, TypeFrame } from './hero/InlineFrames'
import { ModelMarks } from './hero/ModelMarks'
import { HeroStill } from './HeroStill'
import './hero.css'

/** One headline word that rises and unblurs in the entrance sequence. */
function W({ i, children }: { i: number; children: ReactNode }) {
  return (
    <span className="hx-word hx-in" style={{ '--i': i } as CSSProperties}>
      {children}
    </span>
  )
}

/** Split button: a short fact, a divider, the action. The labels roll on hover. */
function SplitCta() {
  const face = (
    <>
      <span className="hx-cta-a">Free</span>
      <span className="hx-cta-b">
        Get started
        <ArrowRight size={15} strokeWidth={2} />
      </span>
    </>
  )
  return (
    <Link href="/docs/installation" className="btn btn-primary hx-cta">
      <span className="hx-cta-roll">
        <span className="hx-cta-face">{face}</span>
        <span className="hx-cta-face" aria-hidden>
          {face}
        </span>
      </span>
    </Link>
  )
}

export function Hero() {
  return (
    <section className="hx" aria-labelledby="hero-title">
      <div className="hx-intro">
        <h1 id="hero-title" className="hx-title" aria-label="Your app thinks on the phone.">
          <span className="hx-line">
            <W i={3}>Your</W>
            <W i={4}>app</W>
            <OrbFrame i={5} />
            <W i={6}>thinks</W>
          </span>
          <span className="hx-line">
            <W i={7}>on</W>
            <W i={8}>the</W>
            <TypeFrame i={9} />
            <W i={10}>phone.</W>
          </span>
        </h1>

        <p className="hx-lead hx-in" style={{ '--i': 11 } as CSSProperties}>
          AI components that leverage the foundation models already on the device. Apple Intelligence
          and Gemini Nano, wired into production-ready UI. Private, offline, instant.
        </p>

        <div className="hx-actions hx-in" style={{ '--i': 12 } as CSSProperties}>
          <SplitCta />
          <Link href="/docs/components" className="btn btn-secondary hx-secondary">
            Browse components
          </Link>
        </div>

        <p className="hx-proof hx-in" style={{ '--i': 13 } as CSSProperties}>
          <ModelMarks />
          Runs on iPhone 15 Pro and Pixel 9, and newer
        </p>
      </div>

      <HeroStill />
    </section>
  )
}
