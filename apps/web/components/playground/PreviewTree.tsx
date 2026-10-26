'use client'
import { useCallback } from 'react'
import type { PlaygroundDef, PlaygroundQuery } from '@ondai/playground'
import { PlaygroundHost } from '@ondai/playground/host'

/** The react-native-web tree. Loaded client-only so nothing from react-native runs on the server. */
export default function PreviewTree({ def, query }: { def: PlaygroundDef; query: PlaygroundQuery }) {
  const onReady = useCallback(() => {
    document.documentElement.dataset.ready = 'true'
  }, [])
  return <PlaygroundHost def={def} query={query} onReady={onReady} />
}
