import { useCallback, useEffect, useState } from 'react'
import { useOndai } from '../context'
import type { Availability, Capability, Locality, ProviderId } from '../types'

export interface UseLocalModelOptions {
  localOnly?: boolean
  provider?: ProviderId
  /** Prewarm as soon as the provider is ready (default: follows policy.prewarm === 'on-mount'). */
  prewarm?: boolean
}

export interface LocalModelState {
  availability: Availability | undefined
  isReady: boolean
  isChecking: boolean
  provider: ProviderId | undefined
  locality: Locality | undefined
  label: string | undefined
  contextWindow: number | undefined
  prewarm: () => Promise<void>
  refresh: () => Promise<void>
}

/** Availability of the best provider for a capability, kept in sync with the router. */
export function useLocalModel(capability: Capability = 'text', options: UseLocalModelOptions = {}): LocalModelState {
  const ondai = useOndai()
  const [availability, setAvailability] = useState<Availability | undefined>()
  const [resolved, setResolved] = useState<{ provider: ProviderId; locality: Locality; label: string; contextWindow?: number } | undefined>()
  const { localOnly, provider, prewarm: wantPrewarm } = options

  useEffect(() => {
    let alive = true
    const check = async () => {
      const av = await ondai.availability(capability, { localOnly, provider })
      if (!alive) return
      setAvailability(av)
      try {
        const r = await ondai.resolve(capability, { localOnly, provider })
        if (alive) setResolved({ provider: r.provider, locality: r.locality, label: r.adapter.label, contextWindow: r.adapter.contextWindow })
      } catch {
        if (alive) setResolved(undefined)
      }
    }
    void check()
    const unsub = ondai.subscribe(() => void check())
    return () => {
      alive = false
      unsub()
    }
  }, [ondai, capability, localOnly, provider])

  const prewarm = useCallback(() => ondai.prewarm(capability), [ondai, capability])
  const refresh = useCallback(() => ondai.refresh(), [ondai])

  useEffect(() => {
    if ((wantPrewarm ?? ondai.policy.prewarm === 'on-mount') && availability?.status === 'ready') void prewarm()
  }, [wantPrewarm, ondai.policy.prewarm, availability?.status, prewarm])

  return {
    availability,
    isReady: availability?.status === 'ready',
    isChecking: availability === undefined,
    provider: resolved?.provider,
    locality: resolved?.locality,
    label: resolved?.label,
    contextWindow: resolved?.contextWindow,
    prewarm,
    refresh,
  }
}
