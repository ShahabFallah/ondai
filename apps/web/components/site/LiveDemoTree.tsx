'use client'
import { useEffect, useMemo, useState } from 'react'
import { playgroundDefaults, queryDefaults, type PlaygroundDef, type PlaygroundQuery } from '@ondai/playground'
import { PlaygroundHost } from '@ondai/playground/host'
import { playgrounds, type PlaygroundName } from '@ondai/registry/playgrounds'
import { demos, type DemoName } from './demos'

/** The react-native-web tree for one live demo. Loaded client-only; the mock answers from `demos.ts`. */
export default function LiveDemoTree({ name, theme }: { name: DemoName; theme: 'void' | 'paper' | 'glass' }) {
  const [def, setDef] = useState<PlaygroundDef | null>(null)
  useEffect(() => {
    let alive = true
    playgrounds[name as PlaygroundName]()
      .then((m) => alive && setDef(m.default))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [name])

  const demo = demos[name]
  const live = useMemo<PlaygroundDef | null>(() => (def ? { ...def, states: { live: { script: demo.script } }, defaultState: 'live', review: [] } : null), [def, demo])
  const query = useMemo<PlaygroundQuery | null>(() => (def ? { ...queryDefaults, props: { ...(playgroundDefaults(def) as Record<string, unknown>), ...demo.props } as PlaygroundQuery['props'], state: 'live', theme, tps: 60 } : null), [def, demo, theme])

  if (!live || !query) return null
  return <PlaygroundHost def={live} query={query} bare />
}
