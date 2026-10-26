'use client'
import { useCallback } from 'react'
import type { PlaygroundDef, PlaygroundQuery } from '@ondai/playground'
import { PlaygroundHost } from '@ondai/playground/host'

/** The react-native-web tree. Loaded client-only so nothing from react-native runs on the server. */
export default function PreviewTree({ def, query }: { def: PlaygroundDef; query: PlaygroundQuery }) {
  const onReady = useCallback(() => {
    ;(window as unknown as { __ondaiPlayground?: unknown }).__ondaiPlayground = { name: def.name, review: def.review, states: Object.keys(def.states), freeze: Object.fromEntries(Object.entries(def.states).map(([k, v]) => [k, v.freezeAt ?? 0])) }
    document.documentElement.dataset.ready = 'true'
  }, [def])
  return <PlaygroundHost def={def} query={query} onReady={onReady} />
}
