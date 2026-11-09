import { accents, alpha, grayDark, grayLight, monoLight, semantic, type AccentName, type AccentStops } from './colors'
import { elevationLevels, radii, spacing, touchTarget } from './layout'
import { durations, springs } from './motion'
import { fontFamilies, fontSizes, fontWeights, lineHeights } from './typography'

/** `void` is dark, `paper` is light, `system` follows the OS. `glass` is kept as an alias for dark + glass material. */
export type ThemeName = 'void' | 'paper' | 'glass' | 'system'
export type ColorScheme = 'dark' | 'light'
/**
 * How containers are drawn. `solid`: opaque cards. `glass`: blurred translucent panels on every platform.
 * `native`: the platform's own material (Liquid Glass on iOS 26, Material 3 tonal surfaces on Android), glass elsewhere.
 */
export type Material = 'solid' | 'glass' | 'native'

export interface ThemeInput {
  /** `system` resolves with `scheme`. */
  theme?: ThemeName
  /** Needed when `theme` is `system`; ignored otherwise. */
  scheme?: ColorScheme
  accent?: AccentName
  /** Three stops when `accent` is `custom`. */
  customAccent?: AccentStops
  /** Container material. Defaults to `solid` (`glass` for the `glass` theme name). */
  material?: Material
}

export interface ThemeColors {
  bg: string
  surface: string
  elevated: string
  elevatedHover: string
  /** Quiet secondary fill: tracks, skeletons, secondary buttons, code spans. */
  muted: string
  /** Text field fill. Fields read as surface + border, never as a gray slab. */
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
  /** 1px specular line along the top inside edge of glass and raised surfaces. */
  glassHighlight: string
  /** Material 3 tonal containers (Android `native`). */
  tonal: string
  tonalHigh: string
  overlay: string
  gray: readonly string[]
}

/** CSS-syntax box shadows; React Native 0.76+ and react-native-web both take them as `boxShadow`. */
export interface ThemeShadows {
  /** A 1px edge drawn as a shadow, so a card has one edge and no border box. */
  ring: string
  /** Resting card. */
  sm: string
  /** Raised card, popover. */
  md: string
  /** Floating panel, sheet, command bar. */
  lg: string
}

export interface Theme {
  name: Exclude<ThemeName, 'system'>
  scheme: ColorScheme
  accentName: AccentName
  colors: ThemeColors
  shadows: ThemeShadows
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
  material: Material
  /** True when the material is translucent (`glass`, or `native` off Android). Components use blur + translucent fills. */
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
  const material: Material = input.material ?? (themeName === 'glass' ? 'glass' : 'solid')
  const isGlass = material !== 'solid'

  const colors: ThemeColors = {
    bg: g[0],
    surface: isGlass ? (dark ? alpha('#1C1C20', 0.52) : alpha('#FFFFFF', 0.56)) : dark ? '#121214' : '#FFFFFF',
    elevated: isGlass ? (dark ? alpha('#26262B', 0.6) : alpha('#FFFFFF', 0.72)) : g[2],
    elevatedHover: isGlass ? (dark ? alpha('#FFFFFF', 0.1) : alpha('#000000', 0.06)) : g[3],
    muted: isGlass ? (dark ? alpha('#FFFFFF', 0.08) : alpha('#000000', 0.05)) : g[2],
    input: isGlass ? (dark ? alpha('#000000', 0.18) : alpha('#FFFFFF', 0.6)) : dark ? '#0E0E10' : '#FFFFFF',
    hairline: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    hairlineStrong: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.13)',
    text: g[11],
    textSecondary: g[10],
    textTertiary: g[8],
    textDisabled: g[6],
    onAccent: accentName === 'mono' ? (dark ? '#09090B' : '#FFFFFF') : '#09090B',
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
    glassFill: dark ? 'rgba(30,30,34,0.5)' : 'rgba(255,255,255,0.55)',
    glassStroke: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
    glassHighlight: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.95)',
    tonal: dark ? '#1D1D21' : '#F1F1F4',
    tonalHigh: dark ? '#26262B' : '#E8E8EC',
    overlay: dark ? 'rgba(0,0,0,0.55)' : 'rgba(10,12,14,0.35)',
    gray: g,
  }

  const shadows: ThemeShadows = dark
    ? {
        ring: isGlass ? '0 0 0 1px rgba(255,255,255,0.1)' : '0 0 0 1px rgba(255,255,255,0.07)',
        sm: '0 1px 2px rgba(0,0,0,0.5)',
        md: '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.35)',
        lg: '0 2px 6px rgba(0,0,0,0.5), 0 24px 48px rgba(0,0,0,0.5)',
      }
    : {
        ring: isGlass ? '0 0 0 1px rgba(0,0,0,0.06)' : '0 0 0 1px rgba(0,0,0,0.07)',
        sm: '0 1px 2px rgba(16,16,20,0.05)',
        md: '0 1px 2px rgba(16,16,20,0.05), 0 6px 20px rgba(16,16,20,0.06)',
        lg: '0 2px 6px rgba(16,16,20,0.05), 0 20px 48px rgba(16,16,20,0.12)',
      }

  return {
    name,
    scheme,
    accentName,
    colors,
    shadows,
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
    material,
    glass: isGlass,
  }
}

export const themes = {
  void: resolveTheme({ theme: 'void' }),
  paper: resolveTheme({ theme: 'paper' }),
  glass: resolveTheme({ theme: 'glass' }),
} as const

export const materials: readonly Material[] = ['solid', 'glass', 'native']

export const themeNames: readonly ThemeName[] = ['void', 'paper', 'glass', 'system']
export const accentNames: readonly AccentName[] = ['ion', 'mono', 'aurora', 'ember', 'custom']
