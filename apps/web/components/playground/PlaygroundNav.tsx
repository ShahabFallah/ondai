import Link from 'next/link'
import { manifest } from '@ondai/registry/manifest'

/** Category order shared by the sidebar and the gallery. Categories not listed here are appended. */
export const categoryOrder: ReadonlyArray<readonly [string, string]> = [
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
  const items = manifest.filter((m) => m.hasPlayground)
  const known = categoryOrder.map(([id]) => id)
  const extra = [...new Set(items.map((m) => m.category))].filter((c) => !known.includes(c)).map((c) => [c, c.charAt(0).toUpperCase() + c.slice(1)] as const)
  const groups = [...categoryOrder, ...extra].map(([c, title]) => ({ c, title, items: items.filter((m) => m.category === c) })).filter((g) => g.items.length)
  return (
    <nav aria-label="Components" className="flex flex-col gap-6">
      <Link href="/playground" className="sidebar-link text-[color:var(--ondai-text)]">
        All components
      </Link>
      {groups.map((g) => (
        <div key={g.c}>
          <div className="label mb-1 px-2.5">{g.title}</div>
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
