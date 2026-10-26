import Link from 'next/link'
import { manifest } from '@ondai/registry/manifest'

const order = ['primitive', 'agentic', 'input', 'text', 'organize', 'search', 'vision', 'voice', 'feed']

export function PlaygroundNav({ current }: { current?: string }) {
  const groups = order.map((c) => ({ c, items: manifest.filter((m) => m.category === c && m.hasPlayground) })).filter((g) => g.items.length)
  return (
    <nav className="hidden md:flex w-[220px] shrink-0 flex-col gap-6 border-r border-[color:var(--ondai-hairline)] bg-[color:var(--ondai-bg)] p-5 sticky top-0 h-screen overflow-y-auto">
      <Link href="/" className="flex items-center gap-2">
        <span className="inline-block h-4 w-4 rounded-[5px] bg-[color:var(--ondai-elevated)] ondai-hairline relative">
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'var(--ondai-gradient)' }} />
        </span>
        <span className="text-[15px] font-medium tracking-tight">ondai</span>
        <span className="ondai-mono text-[color:var(--ondai-text-tertiary)] ml-1">playground</span>
      </Link>
      <Link href="/review" className="ondai-mono text-[color:var(--ondai-text-secondary)] hover:text-[color:var(--ondai-text)]">
        → review grid
      </Link>
      {groups.map((g) => (
        <div key={g.c} className="flex flex-col gap-1">
          <span className="ondai-mono text-[color:var(--ondai-text-tertiary)] mb-1">{g.c}</span>
          {g.items.map((m) => (
            <Link
              key={m.name}
              href={`/playground/${m.name}`}
              className={`rounded-[8px] px-2 py-1.5 text-[13px] ${m.name === current ? 'bg-[color:var(--ondai-elevated)] text-[color:var(--ondai-text)]' : 'text-[color:var(--ondai-text-secondary)] hover:text-[color:var(--ondai-text)]'}`}
            >
              {m.title}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
