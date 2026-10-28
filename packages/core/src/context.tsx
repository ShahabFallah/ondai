import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { ThemeProvider, type ThemeProviderProps } from '@ondai/tokens/react'
import type { Ondai } from './router'
import type { Availability, Capability, ProviderId } from './types'

const OndaiContext = createContext<Ondai | null>(null)

export interface OndaiProviderProps extends Omit<ThemeProviderProps, 'children'> {
  value: Ondai
  children: ReactNode
  /** Skip the built-in ThemeProvider (when the app already provides one). */
  withoutTheme?: boolean
}

export function OndaiProvider({ value, children, withoutTheme, ...theme }: OndaiProviderProps) {
  useEffect(() => {
    if (value.policy.prewarm === 'on-mount') void value.prewarm()
  }, [value])
  const inner = <OndaiContext.Provider value={value}>{children}</OndaiContext.Provider>
  return withoutTheme ? inner : <ThemeProvider {...theme}>{inner}</ThemeProvider>
}

export function useOndai(): Ondai {
  const ctx = useContext(OndaiContext)
  if (!ctx) throw new Error('[ondai] Wrap your app in <OndaiProvider value={createOndai(...)}>.')
  return ctx
}

export function useOndaiOptional(): Ondai | null {
  return useContext(OndaiContext)
}

const unknownAvailability: Availability = { status: 'unavailable', reason: 'unknown', detail: 'checking' }

/** Cached availability of a provider, re-rendering when the router refreshes. */
export function useProviderAvailability(id: ProviderId | undefined): Availability | undefined {
  const ondai = useOndai()
  const subscribe = useMemo(() => (cb: () => void) => ondai.subscribe(cb), [ondai])
  const get = () => {
    if (!id) return undefined
    let snapshot: Availability | undefined
    void ondai.availabilityOf(id).then((a) => (snapshot = a))
    return snapshot
  }
  return useSyncExternalStore(subscribe, get, get)
}

export type { Capability }
export { unknownAvailability }
