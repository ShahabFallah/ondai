'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlaygroundDef } from '@ondai/playground'
import { playgroundDefaults, queryDefaults } from '@ondai/playground'
import { PlaygroundHost } from '@ondai/playground/host'
import { playgrounds } from '@ondai/registry/playgrounds'

type Theme = 'void' | 'paper' | 'glass'

export default function ReviewGrid({ component, theme, motion, clock }: { component?: string; theme?: string; motion?: string; clock?: string }) {
  const [defs, setDefs] = useState<PlaygroundDef[]>([])
  const pending = useRef(0)
  const themes: Theme[] = theme === 'void' || theme === 'paper' || theme === 'glass' ? [theme] : ['void', 'paper']
  const themeKey = themes.join(',')
  const motionMode = motion === 'off' ? 'off' : 'system'
  const clockMode = clock === 'manual' ? 'manual' : 'real'

  useEffect(() => {
    const names = Object.keys(playgrounds).filter((n) => !component || n === component)
    Promise.all(names.map((n) => playgrounds[n as keyof typeof playgrounds]().then((m) => m.default))).then((loaded) => setDefs(loaded))
  }, [component])

  const cells = useMemo(
    () =>
      defs.flatMap((def) =>
        def.review.flatMap((state) =>
          themes.map((th) => ({
            key: `${def.name}-${state}-${th}`,
            def,
            query: { ...queryDefaults, props: playgroundDefaults(def), state, theme: th, motion: motionMode, clock: clockMode, t: def.states[state]?.freezeAt ?? 0 } as const,
          })),
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defs, themeKey, motionMode, clockMode],
  )

  useEffect(() => {
    // Only report ready once the definitions have loaded; an empty grid is not a finished grid.
    if (!defs.length) {
      document.documentElement.dataset.ready = 'false'
      return
    }
    pending.current = cells.length
    document.documentElement.dataset.ready = cells.length ? 'false' : 'true'
  }, [cells, defs.length])

  const onReady = () => {
    pending.current -= 1
    if (pending.current <= 0) document.documentElement.dataset.ready = 'true'
  }

  const groups = useMemo(() => {
    const out: { def: PlaygroundDef; cells: typeof cells }[] = []
    for (const c of cells) {
      const last = out[out.length - 1]
      if (last && last.def.name === c.def.name) last.cells.push(c)
      else out.push({ def: c.def, cells: [c] })
    }
    return out
  }, [cells])

  return (
    <div className="flex flex-col gap-14">
      {groups.map((g) => (
        <section key={g.def.name} aria-labelledby={g.def.name} className="flex flex-col gap-5">
          <h2 id={g.def.name} className="text-[18px] leading-[1.3] font-semibold tracking-[-0.02em] text-[color:var(--fg)]">
            {g.def.title}
          </h2>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-8">
            {g.cells.map((c) => (
              <figure key={c.key} className="m-0 flex min-w-0 max-w-full flex-col gap-2.5">
                <div data-theme={c.query.theme} className="ondai-hairline max-w-full overflow-hidden rounded-[var(--r-card)]" style={{ background: c.query.theme === 'paper' ? '#FAFAFA' : '#07080A' }}>
                  <PlaygroundHost def={c.def} query={c.query} onReady={onReady} />
                </div>
                <figcaption className="flex items-center gap-2 px-1 text-[12.5px]">
                  <span className="font-medium text-[color:var(--fg)]">{c.query.state}</span>
                  <span className="ondai-mono text-[color:var(--fg-2)]">{c.query.theme}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
