import { createContext, createElement, isValidElement, useContext, useEffect, useMemo, useState, type ComponentType, type ReactElement, type ReactNode } from 'react'
import { AccessibilityInfo, Platform, StyleSheet, useColorScheme } from 'react-native'
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native'
import { resolveTheme, type Theme, type ThemeInput } from './themes'
import { resolveSkin, toSkin, type Skin, type SkinInput, type SkinTokens } from './skins'
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
  }, [input.theme, input.accent, input.scheme, input.customAccent, input.material, systemScheme, motion, reduceMotion])

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
  /** Small label style (sentence case, sans, medium). Kept for older call sites; never uppercase. */
  tag?: boolean
}

/** Text style for a size on the scale, with the right family per platform and tracking rules. */
export function typeStyle(theme: Theme, size: FontSizeKey, opts: TypeOptions = {}): TextStyle {
  const weight = opts.weight ?? (opts.tag ? 'medium' : 'regular')
  // Labels read as sentence-case sans; mono stays for numbers, keys and code.
  const mono = !!opts.mono && !opts.tag
  const px = theme.fontSizes[size]
  const family =
    Platform.OS === 'web'
      ? // A host page can point the components at its own font files (the website maps these to next/font).
        mono
        ? `var(--ondai-font-family-mono, ${theme.fontFamilies.web.mono})`
        : `var(--ondai-font-family, ${theme.fontFamilies.web.sans})`
      : mono
        ? theme.fontFamilies.native.mono[weight]
        : theme.fontFamilies.native.sans[weight]
  return {
    fontFamily: family,
    fontWeight: theme.fontWeights[weight],
    fontSize: px,
    lineHeight: theme.lineHeights[size],
    letterSpacing: tracking(px, mono),
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* Skins: the look axis (`variant` on AI components, `skin` on primitives)                        */
/* ---------------------------------------------------------------------------------------------- */

interface SkinContextValue {
  skin: Skin
  tint?: string
}

const SkinContext = createContext<SkinContextValue | null>(null)

export interface SkinProviderProps {
  /** The look for everything inside. `auto` and `solid` are accepted as `clean`. */
  skin?: SkinInput
  /** Primary colour override (hex). Defaults to the theme accent. */
  tint?: string
  children: ReactNode
}

/**
 * Sets the skin for every primitive inside: Surface, Button, Chip and Field read it when their own `skin`
 * prop is left out. AI components wrap their tree in one, so `variant` reaches every nested part.
 * Wrap a whole app to give it one look.
 */
export function SkinProvider({ skin, tint, children }: SkinProviderProps) {
  const parent = useContext(SkinContext)
  const value = useMemo<SkinContextValue>(
    () => ({ skin: skin === undefined ? (parent?.skin ?? 'clean') : toSkin(skin), tint: tint ?? parent?.tint }),
    [skin, tint, parent?.skin, parent?.tint],
  )
  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>
}

/** The skin name in scope: the prop if given, else the nearest SkinProvider, else `clean`. */
export function useSkinName(skin?: SkinInput): Skin {
  const ctx = useContext(SkinContext)
  return skin === undefined ? (ctx?.skin ?? 'clean') : toSkin(skin)
}

/** Resolved colours, radii and depths for a skin, from the theme and accent (or a `tint` override). */
export function useSkin(skin?: SkinInput, tint?: string): SkinTokens {
  const t = useTheme()
  const ctx = useContext(SkinContext)
  const name = skin === undefined ? (ctx?.skin ?? 'clean') : toSkin(skin)
  const color = tint ?? ctx?.tint
  return useMemo(() => resolveSkin(t, name, { tint: color }), [t, name, color])
}

/* ---------------------------------------------------------------------------------------------- */
/* Icons: every icon inside a component can be replaced                                            */
/* ---------------------------------------------------------------------------------------------- */

/** What a component passes to an icon it draws. Lucide icons take these props as they are. */
export interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
  fill?: string
}

/**
 * An icon override: a component such as a lucide icon (`Search`), drawn with the component's own size and
 * colour, or a ready element (`<MyLogo />`), drawn as given. `null` hides the icon.
 */
export type IconInput = ComponentType<IconProps> | ReactElement | null

/** Draws an icon slot: the override if there is one, else the default component. */
export function renderIcon(override: IconInput | undefined, fallback: ComponentType<IconProps> | null, props: IconProps): ReactNode {
  if (override === null) return null
  if (override !== undefined) {
    if (isValidElement(override)) return override
    return createElement(override as ComponentType<IconProps>, props)
  }
  return fallback ? createElement(fallback, props) : null
}
