/** 4pt grid. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  14: 56,
} as const
export type SpacingKey = keyof typeof spacing

export const radii = { none: 0, sm: 6, md: 10, lg: 14, xl: 20, pill: 999 } as const
export type RadiusKey = keyof typeof radii

/** Minimum touch target (pt). */
export const touchTarget = 44

/** Elevation levels. Depth comes from light (hairlines, inner highlights, glow), not shadows. */
export const elevationLevels = {
  0: { hairline: false, highlight: 0, blur: 0, glow: 0 },
  1: { hairline: true, highlight: 0, blur: 0, glow: 0 },
  2: { hairline: true, highlight: 0.08, blur: 0, glow: 0 },
  3: { hairline: true, highlight: 0.08, blur: 24, glow: 0.2 },
} as const
export type ElevationLevel = keyof typeof elevationLevels
