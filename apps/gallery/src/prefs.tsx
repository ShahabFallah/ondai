import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AccentName, ThemeName } from '@ondai/tokens'

export interface Prefs {
  theme: ThemeName
  accent: AccentName
  /** Use the scripted mock instead of the real on-device model. */
  useMock: boolean
  showLatency: boolean
  setPrefs: (patch: Partial<Omit<Prefs, 'setPrefs'>>) => void
}

const Ctx = createContext<Prefs | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ theme: 'void' as ThemeName, accent: 'ion' as AccentName, useMock: false, showLatency: true })
  const value = useMemo<Prefs>(() => ({ ...state, setPrefs: (p) => setState((s) => ({ ...s, ...p })) }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrefs(): Prefs {
  const v = useContext(Ctx)
  if (!v) throw new Error('PrefsProvider missing')
  return v
}
