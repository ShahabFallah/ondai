/**
 * Ondai color tokens.
 * Quiet by default: 95% of the UI is a cool 12-step gray scale.
 * The accent ("ion") is reserved for AI states: thinking, streaming, focus on AI inputs.
 */

/** 12-step cool gray scale for dark surfaces (index 0 = darkest). */
export const grayDark = [
  '#07080A', // 0  void background
  '#0E1013', // 1  surface
  '#15181C', // 2  elevated
  '#1C2025', // 3  elevated hover
  '#242931', // 4  hairline-strong / input bg
  '#2E343D', // 5  border emphasis
  '#3A414B', // 6  disabled text on dark
  '#4B535E', // 7
  '#5D636B', // 8  tertiary text
  '#7B828B', // 9
  '#9BA1A9', // 10 secondary text
  '#EDEFF2', // 11 primary text
] as const

/** 12-step cool gray scale for light surfaces (index 0 = lightest). */
export const grayLight = [
  '#FAFAFA', // 0  paper background
  '#FFFFFF', // 1  surface
  '#F3F4F6', // 2  elevated
  '#ECEEF1', // 3  elevated hover
  '#E3E6EA', // 4  input bg
  '#D4D8DE', // 5  border emphasis
  '#B9BFC7', // 6  disabled
  '#A0A7B0', // 7
  '#8A9099', // 8  tertiary text
  '#6F757E', // 9
  '#5C6168', // 10 secondary text
  '#0B0C0E', // 11 primary text
] as const

export interface AccentStops {
  /** Three gradient stops, left → right. */
  readonly a: string
  readonly b: string
  readonly c: string
}

/** Accent presets. `ion` is the default and the only one that should feel "electric". */
export const accents = {
  ion: { a: '#7CF7FF', b: '#8B7CFF', c: '#FF7CE5' },
  aurora: { a: '#5EF2B8', b: '#38C8E8', c: '#4F8DFF' },
  ember: { a: '#FFB547', b: '#FF6B4A', c: '#FF3D7F' },
  /** Resolved per scheme at theme time (white on dark, black on light). */
  mono: { a: '#FFFFFF', b: '#C9CED6', c: '#9BA1A9' },
} as const satisfies Record<string, AccentStops>

export const monoLight: AccentStops = { a: '#0B0C0E', b: '#3A414B', c: '#6F757E' }

export type AccentName = keyof typeof accents | 'custom'

export const semantic = {
  success: '#3DDC97',
  warning: '#FFB547',
  danger: '#FF5C6C',
  info: '#7CB8FF',
} as const

/** Parse #RGB / #RRGGBB / #RRGGBBAA into [r,g,b,a]. */
export function hexToRgba(hex: string): [number, number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
}

/** `alpha('#7CF7FF', 0.2)` → `rgba(124,247,255,0.2)`. */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgba(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}

/** Linear blend of two hex colors (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgba(a)
  const [r2, g2, b2] = hexToRgba(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t)
  const to = (v: number) => v.toString(16).padStart(2, '0')
  return `#${to(c(r1, r2))}${to(c(g1, g2))}${to(c(b1, b2))}`.toUpperCase()
}

/** Relative luminance (WCAG). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgba(hex).slice(0, 3).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two hex colors. */
export function contrast(a: string, b: string): number {
  const l1 = luminance(a)
  const l2 = luminance(b)
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}
