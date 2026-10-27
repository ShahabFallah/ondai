import Link from 'next/link'
import type { ComponentType } from 'react'
import { AlignLeft, Command, MessageSquareReply, PenLine, SlidersHorizontal, Tags, TextCursorInput } from 'lucide-react'
import { LiveDemo } from '@/components/site/LiveDemo'
import type { DemoName } from '@/components/site/demos'
import { CommandBarStage } from './CommandBarStage'
import { SpotCard } from './SpotCard'

interface Item {
  name: DemoName
  title: string
  tagline: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  /** Centre small components in the well; lists that grow stay at the top. */
  align?: 'start' | 'center'
  /** Let a wide toolbar use the whole well. */
  wide?: boolean
}

const items: Item[] = [
  { name: 'smart-input', title: 'SmartInput', tagline: 'Describe an expense; the form fills itself, with a confidence mark on every field.', icon: TextCursorInput, align: 'center' },
  { name: 'natural-filter', title: 'NaturalFilter', tagline: 'Search the way you talk: “cheap italian open now within 2 km”.', icon: SlidersHorizontal },
  { name: 'summarize', title: 'Summarize', tagline: 'A long thread, one tap, a streamed TL;DR.', icon: AlignLeft, align: 'center' },
  { name: 'rewrite', title: 'Rewrite', tagline: 'Shorten, expand, warm up or fix a draft, then accept the diff.', icon: PenLine, align: 'center', wide: true },
  { name: 'smart-reply', title: 'SmartReply', tagline: 'Three replies for the last message in a thread. Tap one to use it.', icon: MessageSquareReply, align: 'center' },
  { name: 'auto-tag', title: 'AutoTag', tagline: 'Tags picked from the app’s own list and fuzzy-matched after the model answers.', icon: Tags, align: 'center' },
]

function Meta({ name, title, tagline, icon: Icon }: Omit<Item, 'align'>) {
  return (
    <div className="show-meta">
      <span className="show-icon" aria-hidden>
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div className="show-text">
        <h3 className="show-title">{title}</h3>
        <p className="show-tagline">{tagline}</p>
      </div>
      <Link href={`/docs/components/${name}`} className="show-docs">
        Docs
      </Link>
    </div>
  )
}

export function Showcase() {
  return (
    <section className="section" aria-labelledby="try">
      <div className="wrap">
        <div className="section-head">
          <h2 id="try" className="h2">
            Try them here.
          </h2>
          <p className="lead">Every demo is the real component on a scripted mock in your browser; in an app, the same code runs on the phone&apos;s model.</p>
        </div>
        <div className="show-grid">
          <SpotCard className="show-card show-wide">
            <Meta name="command-bar" title="CommandBar" tagline="Type what you want done. Natural language becomes one of your app’s actions, chosen on device." icon={Command} />
            <div className="stage show-stage">
              <CommandBarStage />
            </div>
          </SpotCard>
          {items.map(({ align = 'start', wide, ...item }) => (
            <SpotCard key={item.name} className="show-card">
              <Meta {...item} />
              <div className="stage show-stage" data-align={align}>
                <div className="show-demo" data-wide={wide ? 'true' : undefined}>
                  <LiveDemo name={item.name} title={item.title} />
                </div>
              </div>
            </SpotCard>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/playground" className="btn btn-secondary">
            All components in the playground
          </Link>
        </div>
      </div>
    </section>
  )
}
