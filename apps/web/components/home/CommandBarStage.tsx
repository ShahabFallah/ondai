'use client'
import { useRef } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { LiveDemo } from '@/components/site/LiveDemo'
import { fillInput } from './fill-input'

const prompts = ['Remind me to call Sam tomorrow', 'Email Priya the budget', 'Spent 12 at Blue Bottle']

/** The CommandBar stage: example prompts on the left that type themselves into the live demo on the right. */
export function CommandBarStage() {
  const demo = useRef<HTMLDivElement>(null)
  return (
    <div className="show-split">
      <div className="try-list">
        <span className="try-label">Try typing…</span>
        {prompts.map((p) => (
          <button key={p} type="button" className="try-chip" onClick={() => fillInput(demo.current, p)}>
            <CornerDownLeft size={13} strokeWidth={1.5} />
            {p}
          </button>
        ))}
        <p className="label muted mt-2">Then press Enter. The model picks an action, previews it, and asks before anything risky.</p>
      </div>
      <div ref={demo} className="show-demo">
        <LiveDemo name="command-bar" />
      </div>
    </div>
  )
}
