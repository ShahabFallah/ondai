import Link from 'next/link'
import { manifest } from '@ondai/registry/manifest'

const order: Array<[string, string]> = [
  ['agentic', 'Agentic'],
  ['input', 'Input'],
  ['text', 'Text'],
  ['search', 'Search'],
  ['organize', 'Organize'],
  ['vision', 'Vision'],
  ['voice', 'Voice'],
  ['feed', 'Feed'],
  ['primitive', 'Primitives'],
]

export function PlaygroundNav({ current }: { current?: string }) {
  const groups = order.map(([c, title]) => ({ c, title, items: manifest.filter((m) => m.category === c && m.hasPlayground) })).filter((g) => g.items.length)
  return (
    <nav aria-label="Components" className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.c}>
          <div className="label mb-1 px-2.5 font-medium text-[color:var(--ondai-text)]">{g.title}</div>
          {g.items.map((m) => (
            <Link key={m.name} href={`/playground/${m.name}`} className="sidebar-link" data-active={m.name === current}>
              {m.title}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
