/** Springs (Reanimated `withSpring` config). Physical, never linear. */
export const springs = {
  snappy: { damping: 22, stiffness: 320, mass: 1 },
  smooth: { damping: 26, stiffness: 180, mass: 1 },
  gentle: { damping: 30, stiffness: 120, mass: 1 },
} as const
export type SpringKey = keyof typeof springs

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
