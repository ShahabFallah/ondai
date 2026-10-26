/** Type scale (pt). Tight tracking on large sizes, slightly wide on mono labels. */
export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 44,
} as const
export type FontSizeKey = keyof typeof fontSizes

export const fontWeights = { regular: '400', medium: '500', semibold: '600' } as const
export type FontWeightKey = keyof typeof fontWeights

/** Line heights are multiples chosen to land on the 4pt grid. */
export const lineHeights: Record<FontSizeKey, number> = {
  xs: 16,
  sm: 20,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 52,
}

/** Letter spacing in pt (negative = tighter). Large sizes -1% to -2%; mono labels +2%. */
export function tracking(size: number, mono = false): number {
  if (mono) return size * 0.02
  if (size >= 32) return size * -0.02
  if (size >= 20) return size * -0.015
  if (size >= 17) return size * -0.01
  return 0
}

/**
 * Font families. Native uses the expo-google-fonts registered names (one family per weight);
 * web uses CSS families with system fallbacks.
 */
export const fontFamilies = {
  web: {
    sans: "Geist, 'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  native: {
    sans: { regular: 'Geist_400Regular', medium: 'Geist_500Medium', semibold: 'Geist_600SemiBold' },
    mono: { regular: 'GeistMono_400Regular', medium: 'GeistMono_500Medium', semibold: 'GeistMono_600SemiBold' },
  },
} as const
