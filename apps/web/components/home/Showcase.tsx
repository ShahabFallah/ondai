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

// Order is the reading order; reels.css places them (the command bar wide beside one portrait, then three portraits).
const reels: Reel[] = [
  { name: 'command-bar', title: 'Command bar', line: 'Say it. The app does it.', label: 'Typing "Dinner at Luigi\'s was 42 euros" into a command bar; it adds the expense, and the expense list beside it shows Luigi\'s, 42 euros, on top with the weekly total going from 86.40 to 128.40 euros.', size: [640, 400] },
  { name: 'semantic-search', title: 'Semantic search', line: 'Find it by what it means.', label: 'Searching notes for "my trip to Portugal" finds the flight to Lisbon first; "something to cook for friends" finds Grandma\'s lasagna recipe. Neither note contains the words searched for.', size: [400, 500] },
  { name: 'voice-memo', title: 'Voice memo', line: 'Talk. Get the to-dos.', label: 'Recording a voice memo about a client call; the transcript appears, then a summary with three to-dos (send Dana the pricing deck by Thursday, book a room for the kickoff, ask Leo to fix the login bug), which are added to Reminders.', size: [400, 500] },
  { name: 'tool-confirm-card', title: 'Tool confirm card', line: 'Nothing risky without your OK.', label: 'Asking to send Marco half of a 64 euro dinner bill; a high-risk card shows the payment of 32 euros to Marco Rossi for review, it is confirmed, sends, and reports done.', size: [400, 500] },
  { name: 'agent-run', title: 'Agent run', line: 'Many steps, one request.', label: 'An agent finds a quiet dinner spot near Priya\'s office and checks Friday evening on its own, asks for approval before creating the event, and once confirmed books Luigi\'s Trattoria at 19:30 and invites Priya.', size: [400, 500] },
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
