/** Springs (Reanimated `withSpring` config). Physical, never linear. */
export const springs = {
  snappy: { damping: 22, stiffness: 320, mass: 1 },
  smooth: { damping: 26, stiffness: 180, mass: 1 },
  gentle: { damping: 30, stiffness: 120, mass: 1 },
} as const
export type SpringKey = keyof typeof springs

/**
 * Curves as cubic-bezier control points (Emil Kowalski's set). Use with Reanimated `Easing.bezier(...curve)`
 * or CSS `cubic-bezier(...)`. Never ease-in on UI; linear only for constant loops.
 */
export const curves = {
  /** Entering, exiting, most UI. */
  out: [0.23, 1, 0.32, 1],
  /** Something moving or morphing on screen. */
  inOut: [0.77, 0, 0.175, 1],
  /** Sheets and drawers (the iOS sheet curve). */
  sheet: [0.32, 0.72, 0, 1],
} as const
export type CurveKey = keyof typeof curves

/** UI timings in ms. Press is near-instant; exits run at about 70% of their entrance. */
export const timings = {
  press: 120,
  /** Toggles, chips, small state changes. */
  state: 180,
  /** Menus, popovers. */
  menu: 200,
  /** A panel or row entering. */
  enter: 240,
  exit: 170,
} as const

/** Reanimated v4 springs in Apple's two-parameter form, for anything a finger moved. */
export const gestureSprings = {
  settle: { duration: 400, dampingRatio: 1 },
  snapBack: { duration: 400, dampingRatio: 0.8 },
  sheet: { duration: 300, dampingRatio: 0.8 },
} as const

export const durations = {
  /** Token chunk fade/slide while streaming. */
  chunk: 120,
  /** Ion light fade-out on done. */
  settle: 300,
  /** One lap of the ion sweep around a border. */
  sweep: 2400,
  /** Pulse on the OnDeviceBadge dot while thinking. */
  pulse: 1600,
  /** Caret blink. */
  caret: 900,
  /** Shimmer loop on skeletons. */
  shimmer: 1800,
} as const

/** Streaming text motion: each chunk slides up 6pt while fading in. */
export const streaming = { slide: 6, chunkMs: durations.chunk } as const

/** The shared AI state language used by every component. */
export const aiStates = [
  'idle',
  'focus',
  'thinking',
  'streaming',
  'tool',
  'confirm',
  'done',
  'error',
  'refusal',
  'unavailable',
  'preparing',
] as const
export type AiState = (typeof aiStates)[number]

/** States where the accent light is visible. */
export const litStates: ReadonlySet<AiState> = new Set(['focus', 'thinking', 'streaming', 'tool', 'confirm', 'preparing'])
