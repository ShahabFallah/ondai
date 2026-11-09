/**
 * Type scale (pt). A small app scale: 11 labels, 13 secondary, 14 body and controls, 16 emphasis,
 * 20/24 titles. Steps above 24 exist for rare display moments only.
 */
export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const
export type FontSizeKey = keyof typeof fontSizes

export const fontWeights = { regular: '400', medium: '500', semibold: '600' } as const
export type FontWeightKey = keyof typeof fontWeights

/** Line heights land on the 2pt grid: 20 on 14, 22 on 16. */
export const lineHeights: Record<FontSizeKey, number> = {
  xs: 14,
  sm: 18,
  md: 20,
  lg: 22,
  xl: 26,
  '2xl': 30,
  '3xl': 38,
  '4xl': 46,
}

/** Letter spacing in pt. Geist is already tight: none at UI sizes, a little off large titles. */
export function tracking(size: number, mono = false): number {
  if (mono || size < 16) return 0
  if (size >= 24) return size * -0.02
  if (size >= 20) return size * -0.015
  return size * -0.01
}

/**
 * Font families. Native uses the expo-google-fonts registered names (one family per weight);
 * web uses CSS families with system fallbacks.
 */
export const fontFamilies = {
  web: {
    sans: "Geist, 'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'Geist Mono', 'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  native: {
    sans: { regular: 'Geist_400Regular', medium: 'Geist_500Medium', semibold: 'Geist_600SemiBold' },
    mono: { regular: 'GeistMono_400Regular', medium: 'GeistMono_500Medium', semibold: 'GeistMono_600SemiBold' },
  },
} as const
