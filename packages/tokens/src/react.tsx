import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Platform, StyleSheet, useColorScheme } from 'react-native'
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native'
import { resolveTheme, type Theme, type ThemeInput } from './themes'
import { tracking, type FontSizeKey, type FontWeightKey } from './typography'

export type MotionMode = 'system' | 'off'

interface ThemeContextValue {
  theme: Theme
  input: ThemeInput
  motion: MotionMode
  reduceMotion: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export interface ThemeProviderProps extends ThemeInput {
  children: ReactNode
  /** `off` freezes all animation (used by the review page and visual tests). */
  motion?: MotionMode
}

export function ThemeProvider({ children, motion = 'system', ...input }: ThemeProviderProps) {
  const systemScheme = useColorScheme()
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => mounted && setReduceMotion(!!v))
      .catch(() => {})
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduceMotion(!!v))
    return () => {
      mounted = false
      sub?.remove?.()
    }
  }, [])

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = input.scheme ?? (systemScheme === 'light' ? 'light' : 'dark')
    return { theme: resolveTheme({ ...input, scheme }), input, motion, reduceMotion }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.theme, input.accent, input.scheme, input.customAccent, systemScheme, motion, reduceMotion])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

const fallback: ThemeContextValue = { theme: resolveTheme(), input: {}, motion: 'system', reduceMotion: false }

/** The resolved theme. Works without a provider (defaults to Void + ion). */
export function useTheme(): Theme {
  return (useContext(ThemeContext) ?? fallback).theme
}

/** `{ enabled }`: false when the OS asks for reduced motion or the host froze motion. */
export function useMotion(): { enabled: boolean; mode: MotionMode; reduceMotion: boolean } {
  const ctx = useContext(ThemeContext) ?? fallback
  return { enabled: ctx.motion !== 'off' && !ctx.reduceMotion, mode: ctx.motion, reduceMotion: ctx.reduceMotion }
}

export function useThemeInput(): ThemeInput {
  return (useContext(ThemeContext) ?? fallback).input
}

/** Memoized StyleSheet built from the current theme. */
export type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>

export function useStyles<T extends NamedStyles>(factory: (theme: Theme) => T): T {
  const theme = useTheme()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)) as T, [theme])
}

export const hairlineWidth = Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth

export interface TypeOptions {
  weight?: FontWeightKey
  mono?: boolean
  /** Uppercase mono tag style: wider tracking. */
  tag?: boolean
}

/** Text style for a size on the scale, with the right family per platform and tracking rules. */
export function typeStyle(theme: Theme, size: FontSizeKey, opts: TypeOptions = {}): TextStyle {
  const weight = opts.weight ?? 'regular'
  const mono = !!opts.mono
  const px = theme.fontSizes[size]
  const family =
    Platform.OS === 'web'
      ? mono
        ? theme.fontFamilies.web.mono
        : theme.fontFamilies.web.sans
      : mono
        ? theme.fontFamilies.native.mono[weight]
        : theme.fontFamilies.native.sans[weight]
  return {
    fontFamily: family,
    fontWeight: theme.fontWeights[weight],
    fontSize: px,
    lineHeight: theme.lineHeights[size],
    letterSpacing: opts.tag ? px * 0.06 : tracking(px, mono),
    ...(opts.tag ? { textTransform: 'uppercase' as const } : null),
  }
}
