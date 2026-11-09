/** Every stage shot, with its design size in CSS px (heroes rendered at 2x, the docs pictures at 4x: 1440 x 1080). */
export const shots = {
  hero: [1040, 810],
  'hero-sm': [390, 720],
  'docs-installation': [360, 270],
  'docs-how-it-works': [360, 270],
  'docs-core': [360, 270],
  'docs-providers': [360, 270],
  'docs-theming': [360, 270],
  'docs-device-support': [360, 270],
} as const satisfies Record<string, readonly [number, number]>

export type ShotName = keyof typeof shots
export const shotNames = Object.keys(shots)
