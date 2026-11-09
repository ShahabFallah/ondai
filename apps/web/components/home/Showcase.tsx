import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { GooLink } from './GooLink'
import { Reveal } from './Reveal'
import { ReelVideo } from './ReelVideo'
import './reels.css'

interface Reel {
  name: string
  title: string
  line: string
  /** What the clip shows, for screen readers. */
  label: string
  /** The recording's width and height (scripts/record-reels.mjs), so the card holds its shape before it loads. */
  size: [number, number]
}

// Order is the reading order; reels.css places them (one wide clip, then pairs of mixed widths).
const reels: Reel[] = [
  { name: 'command-bar', title: 'Command bar', line: 'Say it. The app does it.', label: 'Typing "Remind me to call Sam tomorrow" into a command bar, which creates the task Call Sam, due tomorrow.', size: [600, 375] },
  { name: 'smart-reply', title: 'Smart reply', line: 'The reply, already written.', label: 'A message arrives asking about a printout and a ride; three replies are suggested and the first is sent.', size: [380, 484] },
  { name: 'auto-tag', title: 'Auto tag', line: 'Tags that pick themselves.', label: 'Writing a note about a train to Lyon for a workshop; the tags travel, work and finance are suggested and accepted.', size: [380, 444] },
  { name: 'rewrite', title: 'Rewrite', line: 'Your draft, made better.', label: 'A rough draft about a budget is rewritten in a formal tone, shown as a diff, and accepted.', size: [640, 366] },
  { name: 'smart-input', title: 'Smart input', line: 'Forms that fill themselves.', label: 'Typing "Lunch with Sam at Nopa, 24 dollars" fills merchant, amount, currency and category.', size: [480, 416] },
  { name: 'natural-filter', title: 'Natural filter', line: 'Search the way you talk.', label: 'Typing "cheap italian open now within 2 km" becomes four filters and narrows the list to two restaurants.', size: [600, 350] },
]

export function Showcase() {
  return (
    <section className="section home-section" aria-labelledby="reels-title">
      <div className="wrap">
        <header className="home-head home-head-row">
          <div>
            <h2 id="reels-title" className="home-h2">
              Watch them work.
            </h2>
            <p className="home-sub">Real components, recorded as they run. On a phone, the device&rsquo;s own model answers.</p>
          </div>
          <GooLink href="/docs/components">All components</GooLink>
        </header>
        <Reveal className="reels reveal">
          {reels.map((r) => (
            <Link key={r.name} href={`/docs/components/${r.name}`} className="reel" data-reel={r.name}>
              <span className="reel-frame" style={{ aspectRatio: `${r.size[0]} / ${r.size[1]}` }}>
                <ReelVideo name={r.name} label={r.label} />
              </span>
              <span className="reel-cap">
                <span className="reel-text">
                  <span className="reel-title">{r.title}</span>
                  <span className="reel-line">{r.line}</span>
                </span>
                <ArrowUpRight className="reel-arrow" size={16} strokeWidth={1.75} aria-hidden />
              </span>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
