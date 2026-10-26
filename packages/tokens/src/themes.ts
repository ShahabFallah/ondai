import { accents, alpha, grayDark, grayLight, monoLight, semantic, type AccentName, type AccentStops } from './colors'
import { elevationLevels, radii, spacing, touchTarget } from './layout'
import { durations, springs } from './motion'
import { fontFamilies, fontSizes, fontWeights, lineHeights } from './typography'

export type ThemeName = 'void' | 'paper' | 'glass' | 'system'
export type ColorScheme = 'dark' | 'light'

export interface ThemeInput {
  /** `system` resolves with `scheme`. */
  theme?: ThemeName
  /** Needed when `theme` is `system`; ignored otherwise. */
  scheme?: ColorScheme
  accent?: AccentName
  /** Three stops when `accent` is `custom`. */
  customAccent?: AccentStops
}

export interface ThemeColors {
  bg: string
  surface: string
  elevated: string
  elevatedHover: string
  input: string
  hairline: string
  hairlineStrong: string
  text: string
  textSecondary: string
  textTertiary: string
  textDisabled: string
  /** Text drawn on top of a solid accent fill. */
  onAccent: string
  accent: AccentStops & {
    /** Primary accent color for solid fills, rings and carets. */
    solid: string
    /** 1px focus ring color. */
    ring: string
    /** Soft tinted background. */
    soft: string
    /** Glow for elevation 3 while active. */
    glow: string
    gradient: readonly [string, string, string]
  }
  success: string
  successSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  info: string
  infoSoft: string
  /** Glass surfaces: translucent fill over app content. */
  glassFill: string
  glassStroke: string
  overlay: string
  gray: readonly string[]
}

export interface Theme {
  name: Exclude<ThemeName, 'system'>
  scheme: ColorScheme
  accentName: AccentName
  colors: ThemeColors
  spacing: typeof spacing
  radii: typeof radii
  touchTarget: number
  fontSizes: typeof fontSizes
  lineHeights: typeof lineHeights
  fontWeights: typeof fontWeights
  fontFamilies: typeof fontFamilies
  springs: typeof springs
  durations: typeof durations
  elevation: typeof elevationLevels
  /** True for `glass`: components use blur + translucent fills. */
  glass: boolean
}

function resolveAccent(name: AccentName, scheme: ColorScheme, custom?: AccentStops): AccentStops {
  if (name === 'custom') return custom ?? accents.ion
  if (name === 'mono') return scheme === 'dark' ? accents.mono : monoLight
  return accents[name]
}

export function resolveTheme(input: ThemeInput = {}): Theme {
  const themeName = input.theme ?? 'void'
  const scheme: ColorScheme =
    themeName === 'system' ? (input.scheme ?? 'dark') : themeName === 'paper' ? 'light' : 'dark'
  const name: Theme['name'] =
    themeName === 'system' ? (scheme === 'dark' ? 'void' : 'paper') : themeName
  const accentName = input.accent ?? 'ion'
  const stops = resolveAccent(accentName, scheme, input.customAccent)
  const dark = scheme === 'dark'
  const g = dark ? grayDark : grayLight
  const solid = accentName === 'mono' ? stops.a : stops.b
  const isGlass = name === 'glass'

  const colors: ThemeColors = {
    bg: g[0],
    surface: isGlass ? (dark ? alpha('#0E1013', 0.72) : alpha('#FFFFFF', 0.72)) : g[1],
    elevated: isGlass ? (dark ? alpha('#15181C', 0.8) : alpha('#FFFFFF', 0.84)) : g[2],
    elevatedHover: g[3],
    input: isGlass ? (dark ? alpha('#FFFFFF', 0.06) : alpha('#000000', 0.04)) : g[4],
    hairline: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    hairlineStrong: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)',
    text: g[11],
    textSecondary: g[10],
    textTertiary: g[8],
    textDisabled: g[6],
    onAccent: accentName === 'mono' ? (dark ? '#07080A' : '#FFFFFF') : '#07080A',
    accent: {
      ...stops,
      solid,
      ring: alpha(solid, dark ? 0.6 : 0.55),
      soft: alpha(solid, dark ? 0.12 : 0.1),
      glow: alpha(solid, 0.2),
      gradient: [stops.a, stops.b, stops.c],
    },
    success: semantic.success,
    successSoft: alpha(semantic.success, 0.14),
    warning: semantic.warning,
    warningSoft: alpha(semantic.warning, 0.14),
    danger: semantic.danger,
    dangerSoft: alpha(semantic.danger, 0.14),
    info: semantic.info,
    infoSoft: alpha(semantic.info, 0.14),
    glassFill: dark ? 'rgba(14,16,19,0.6)' : 'rgba(255,255,255,0.6)',
    glassStroke: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    overlay: dark ? 'rgba(0,0,0,0.55)' : 'rgba(10,12,14,0.35)',
    gray: g,
  }

  return {
    name,
    scheme,
    accentName,
    colors,
    spacing,
    radii,
    touchTarget,
    fontSizes,
    lineHeights,
    fontWeights,
    fontFamilies,
    springs,
    durations,
    elevation: elevationLevels,
    glass: isGlass,
  }
}

export const themes = {
  void: resolveTheme({ theme: 'void' }),
  paper: resolveTheme({ theme: 'paper' }),
  glass: resolveTheme({ theme: 'glass' }),
} as const

export const themeNames: readonly ThemeName[] = ['void', 'paper', 'glass', 'system']
export const accentNames: readonly AccentName[] = ['ion', 'mono', 'aurora', 'ember', 'custom']
