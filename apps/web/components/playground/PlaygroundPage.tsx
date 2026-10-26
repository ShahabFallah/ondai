'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { PlaygroundDef, PlaygroundQuery } from '@ondai/playground'
import { decodeQuery, encodeQuery, defaultCode } from '@ondai/playground'
import { playgrounds, type PlaygroundName } from '@ondai/registry/playgrounds'
import { ControlsPanel } from './ControlsPanel'
import { Preview } from './Preview'

export function PlaygroundPage({ name }: { name: string }) {
  const [def, setDef] = useState<PlaygroundDef | null>(null)
  const [error, setError] = useState<string | null>(null)
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let alive = true
    const loader = playgrounds[name as PlaygroundName]
    if (!loader) {
      setError(`No playground named "${name}".`)
      return
    }
    loader()
      .then((m) => alive && setDef(m.default))
      .catch((e) => alive && setError(String(e)))
    return () => {
      alive = false
    }
  }, [name])

  const query = useMemo(() => (def ? decodeQuery(def, params) : null), [def, params])
  const setQuery = useCallback(
    (next: PlaygroundQuery) => {
      if (!def) return
      const qs = encodeQuery(def, next)
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [def, pathname, router],
  )

  if (error) return <p className="p-8 text-[color:var(--ondai-danger)]">{error}</p>
  if (!def || !query) return <p className="p-8 ondai-mono text-[color:var(--ondai-text-tertiary)]">loading playground…</p>
  const code = def.code ? def.code(query.props) : defaultCode(def, query.props)
  const embed = query.embed

  return (
    <div className={embed ? '' : 'flex flex-col lg:flex-row min-h-[calc(100vh-56px)]'}>
      <section className={embed ? 'flex justify-center' : 'flex-1 flex items-center justify-center p-6 lg:p-12 bg-[color:var(--ondai-bg)]'}>
        <Preview def={def} query={query} />
      </section>
      {!embed ? (
        <aside className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-[color:var(--ondai-hairline)] bg-[color:var(--ondai-surface)] p-5 flex flex-col gap-6 overflow-y-auto">
          <ControlsPanel def={def} query={query} onChange={setQuery} />
          <div className="flex flex-col gap-2">
            <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">Code</span>
            <pre className="rounded-[12px] ondai-hairline bg-[color:var(--ondai-bg)] p-3 text-[12px] leading-5 overflow-x-auto font-mono text-[color:var(--ondai-text-secondary)]">
              <code>{code}</code>
            </pre>
            <button
              onClick={() => void navigator.clipboard.writeText(code)}
              className="self-start ondai-mono rounded-full ondai-hairline px-3 py-1.5 text-[color:var(--ondai-text-secondary)] hover:text-[color:var(--ondai-text)]"
            >
              Copy
            </button>
          </div>
          <p className="ondai-mono text-[color:var(--ondai-text-tertiary)]">Simulated output. Real inference runs on device.</p>
        </aside>
      ) : null}
    </div>
  )
}
