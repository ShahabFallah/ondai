import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import * as Device from 'expo-device'
import type { AccentName, Material, ThemeName } from '@ondai/tokens'

/** Simulators cannot run Apple Foundation Models themselves; they use the Mac bridge (src/mac-bridge.ts) instead. */
export const isSimulator = !Device.isDevice

export interface Prefs {
  theme: ThemeName
  /** Container material: solid cards, blurred glass, or the platform's own (Liquid Glass on iOS 26). */
  material: Material
  accent: AccentName
  /** Use the scripted mock instead of the real on-device model. */
  useMock: boolean
  showLatency: boolean
  setPrefs: (patch: Partial<Omit<Prefs, 'setPrefs'>>) => void
}

const Ctx = createContext<Prefs | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ theme: 'void' as ThemeName, material: 'solid' as Material, accent: 'ion' as AccentName, useMock: process.env.EXPO_PUBLIC_ONDAI_MOCK === '1', showLatency: true })
  const setPrefs = useCallback<Prefs['setPrefs']>((p) => setState((s) => ({ ...s, ...p })), [])
  const value = useMemo<Prefs>(() => ({ ...state, setPrefs }), [state, setPrefs])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrefs(): Prefs {
  const v = useContext(Ctx)
  if (!v) throw new Error('PrefsProvider missing')
  return v
}
