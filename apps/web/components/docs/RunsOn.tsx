import type { ReactNode } from 'react'
import { AppleMark, GoogleMark, MetaMark } from '@/components/site/BrandMarks'

/**
 * "Runs on" for a component page: the four places a model can come from, as monochrome marks with the
 * model's name under each. Unsupported ones are dimmed. Used from the component MDX as
 * `<RunsOn capabilities="tools, structured, text" on="apple,nano,llama,cloud" />`.
 */

export type Provider = 'apple' | 'nano' | 'llama' | 'cloud'

function CloudMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  )
}

export const PROVIDERS: { id: Provider; name: string; maker: string; Mark: (props: { className?: string }) => ReactNode }[] = [
  { id: 'apple', name: 'Apple FM', maker: 'Apple Foundation Models', Mark: AppleMark },
  { id: 'nano', name: 'Gemini Nano', maker: 'Gemini Nano', Mark: GoogleMark },
  // Llama (llama.rn) has an adapter but is not yet compatible with the React Native version Ondai targets.
  { id: 'llama', name: 'Llama', maker: 'Llama (not yet supported)', Mark: MetaMark },
  { id: 'cloud', name: 'Cloud', maker: 'A cloud model', Mark: CloudMark },
]

const LABEL: Record<string, string> = {
  text: 'text',
  structured: 'structured output',
  tools: 'tool calling',
  embeddings: 'embeddings',
  transcription: 'transcription',
  vision: 'images',
  speech: 'speech',
}

function needsLine(caps: string[]) {
  if (!caps.length) return 'Pure UI. No model needed, so it runs everywhere.'
  const words = caps.map((c) => LABEL[c] ?? c)
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
  return `Needs ${list}.`
}

export function RunsOn({ capabilities = '', on = 'apple,nano,llama,cloud' }: { capabilities?: string; on?: string }) {
  const caps = capabilities
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
  const supported = new Set(on.split(',').map((p) => p.trim()))
  return (
    <div className="not-prose docs-runs">
      <ul className="docs-runs-row">
        {PROVIDERS.map(({ id, name, maker, Mark }) => {
          const ok = supported.has(id)
          return (
            <li key={id} className="docs-runs-item" data-supported={ok}>
              <span className="docs-runs-mark">
                <Mark />
              </span>
              <span className="docs-runs-name" aria-hidden="true">
                {name}
              </span>
              <span className="sr-only">{ok ? `${maker}: supported` : `${maker}: not supported`}</span>
            </li>
          )
        })}
      </ul>
      <p className="docs-runs-needs">{needsLine(caps)}</p>
    </div>
  )
}
