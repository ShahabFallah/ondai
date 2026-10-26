import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Metric } from '@ondai/core'

interface MetricsCtx {
  last: Metric | null
  all: Metric[]
  push: (m: Metric) => void
}
const Ctx = createContext<MetricsCtx | null>(null)

export function MetricsProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Metric[]>([])
  const value = useMemo<MetricsCtx>(() => ({ last: all[all.length - 1] ?? null, all, push: (m) => setAll((a) => [...a.slice(-49), m]) }), [all])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useMetrics = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('MetricsProvider missing')
  return v
}
