import Link from 'next/link'
import { AlignLeft, ArrowRight, Command, MessageSquareReply, PenLine, SlidersHorizontal, Tags, TextCursorInput } from 'lucide-react'
import { LiveDemo } from '@/components/site/LiveDemo'
import type { DemoName } from '@/components/site/demos'
import { BentoCard, CardMeta, Screen, type Icon } from './Bento'
import { AutoType } from './AutoType'
import { CommandBarStage } from './CommandBarStage'
import { Reveal } from './Reveal'

interface Item {
  name: DemoName
  area: string
  title: string
  line: string
  screen: string
  icon: Icon
  /** Typed into the demo once when the card comes into view. */
  auto?: string
  /** Chat-like demos sit at the bottom of their screen. */
  bottom?: boolean
  wide?: boolean
  props?: Record<string, unknown>
}

const items: Item[] = [
  { name: 'smart-input', area: 'si', title: 'SmartInput', line: 'Forms that fill themselves.', screen: 'New expense', icon: TextCursorInput, auto: 'Lunch at Nopa, 24 dollars yesterday', props: { presentation: 'card' } },
  { name: 'summarize', area: 'sum', title: 'Summarize', line: 'Forty messages, four lines.', screen: '#launch-week', icon: AlignLeft },
  { name: 'natural-filter', area: 'nf', title: 'NaturalFilter', line: 'Search the way you talk.', screen: 'Dinner nearby', icon: SlidersHorizontal, auto: 'cheap italian open now within 2 km', props: { presentation: 'bar' } },
  { name: 'smart-reply', area: 'sr', title: 'SmartReply', line: 'The reply, already written.', screen: 'Sam', icon: MessageSquareReply, bottom: true },
  { name: 'rewrite', area: 'rw', title: 'Rewrite', line: 'Your draft, but better.', screen: 'Draft to Priya', icon: PenLine, wide: true },
  { name: 'auto-tag', area: 'at', title: 'AutoTag', line: 'Tags that pick themselves.', screen: 'Notes', icon: Tags, wide: true },
]

export function Showcase() {
  return (
    <section className="section home-section" aria-labelledby="try">
      <div className="wrap">
        <header className="home-head home-head-row">
          <div>
            <h2 id="try" className="home-h2">
              Go on, poke them.
            </h2>
            <p className="home-sub">Real components on a scripted model. Type anything.</p>
          </div>
          <Link href="/playground" className="btn btn-secondary btn-sm home-head-link">
            All 26 components
            <ArrowRight size={14} strokeWidth={1.75} />
          </Link>
        </header>
        <Reveal className="bento reveal">
          <BentoCard area="cb" className="bento-wide">
            <CommandBarStage />
            <CardMeta name="command-bar" title="CommandBar" line="Say it. The app does it." icon={Command} />
          </BentoCard>
          {items.map((item) => (
            <BentoCard key={item.name} area={item.area}>
              <AutoType prompt={item.auto ?? ''} className="bento-stage" disabled={!item.auto}>
                <Screen label={item.screen} className={`${item.bottom ? 'bento-screen-bottom' : ''} ${item.wide ? 'bento-screen-wide' : ''}`}>
                  <LiveDemo name={item.name} title={item.title} props={item.props} />
                </Screen>
              </AutoType>
              <CardMeta name={item.name} title={item.title} line={item.line} icon={item.icon} />
            </BentoCard>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
