'use client'
import { useRef } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { LiveDemo } from '@/components/site/LiveDemo'
import { AutoType } from './AutoType'
import { Screen } from './Bento'
import { fillInput, submitInput } from './fill-input'

const prompts = ['Remind me to call Sam tomorrow', 'Email Priya the budget', 'Spent 12 at Blue Bottle', 'Switch to dark mode']

/** The CommandBar card's stage: prompt chips on the left that type themselves into the live bar and press Enter. */
export function CommandBarStage() {
  const demo = useRef<HTMLDivElement>(null)
  const run = (p: string) => {
    if (fillInput(demo.current, p)) setTimeout(() => submitInput(demo.current), 120)
  }
  return (
    <AutoType prompt={prompts[0]!} delay={700} className="bento-stage cb-stage">
      <div className="cb-try">
        <span className="cb-try-label">Try one</span>
        <div className="cb-chips">
          {prompts.map((p) => (
            <button key={p} type="button" className="cb-chip" onClick={() => run(p)}>
              <span>{p}</span>
              <CornerDownLeft size={13} strokeWidth={1.6} aria-hidden />
            </button>
          ))}
        </div>
      </div>
      <div ref={demo} className="cb-screen-wrap">
        <Screen label="Assistant">
          <LiveDemo name="command-bar" props={{ showKeyHints: false }} />
        </Screen>
      </div>
    </AutoType>
  )
}
