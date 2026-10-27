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

  return (
    <div className="flex flex-col gap-10">
      {cells.map((c, i) => {
        const header = i === 0 || cells[i - 1]!.def.name !== c.def.name
        return (
          <div key={c.key} className="flex flex-col gap-3">
            {header ? (
              <h2 className="text-[17px] font-medium tracking-tight mt-6" id={c.def.name}>
                {c.def.title}
              </h2>
            ) : null}
            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 min-w-0">
              <span className="ondai-mono sm:w-28 shrink-0 pt-2 text-[color:var(--ondai-text-tertiary)]">
                {c.query.state} · {c.query.theme}
              </span>
              <div data-theme={c.query.theme} className="rounded-[16px] ondai-hairline overflow-hidden max-w-full" style={{ background: c.query.theme === 'paper' ? '#FAFAFA' : '#07080A' }}>
                <PlaygroundHost def={c.def} query={c.query} onReady={onReady} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
