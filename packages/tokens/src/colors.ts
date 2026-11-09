/**
 * Ondai color tokens.
 * Quiet by default: 95% of the UI is a cool 12-step gray scale.
 * The accent ("ion") is reserved for AI states: thinking, streaming, focus on AI inputs.
 */

/** 12-step neutral scale for dark surfaces (index 0 = darkest). Barely cool, so it reads as ink, not blue. */
export const grayDark = [
  '#09090B', // 0  void background
  '#111113', // 1  surface
  '#18181B', // 2  elevated / muted fill
  '#1F1F23', // 3  elevated hover
  '#26262B', // 4  pressed / track
  '#303036', // 5  border emphasis
  '#45454D', // 6  disabled text on dark
  '#5A5A63', // 7
  '#7D7D86', // 8  tertiary text (4.6:1 on bg)
  '#93939B', // 9
  '#ADADB5', // 10 secondary text
  '#EDEDEF', // 11 primary text
] as const

/** 12-step neutral scale for light surfaces (index 0 = lightest). */
export const grayLight = [
  '#FAFAFA', // 0  paper background
  '#FFFFFF', // 1  surface
  '#F4F4F5', // 2  elevated / muted fill
  '#EDEDEF', // 3  elevated hover
  '#E4E4E7', // 4  pressed / track
  '#D4D4D8', // 5  border emphasis
  '#A1A1AA', // 6  disabled
  '#8B8B93', // 7
  '#6B6B74', // 8  tertiary text (5.1:1 on bg)
  '#5A5A62', // 9
  '#4B4B53', // 10 secondary text
  '#09090B', // 11 primary text
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

export const monoLight: AccentStops = { a: '#09090B', b: '#3F3F46', c: '#71717A' }

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
