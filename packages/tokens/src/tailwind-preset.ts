import { fontFamilies, fontSizes, lineHeights } from './typography'
import { radii, spacing } from './layout'

/**
 * Tailwind preset (v3 and v4 config-compatible object). Colors point at CSS variables so the
 * same classes work with NativeWind / react-native-reusables and on the website.
 *
 *   // tailwind.config.ts
 *   import ondai from '@ondai/tokens/tailwind-preset'
 *   export default { presets: [ondai], content: [...] }
 */
const v = (name: string) => `var(${name})`

export const ondaiPreset = {
  theme: {
    extend: {
      colors: {
        background: v('--background'),
        foreground: v('--foreground'),
        card: { DEFAULT: v('--card'), foreground: v('--card-foreground') },
        popover: { DEFAULT: v('--popover'), foreground: v('--popover-foreground') },
        primary: { DEFAULT: v('--primary'), foreground: v('--primary-foreground') },
        secondary: { DEFAULT: v('--secondary'), foreground: v('--secondary-foreground') },
        muted: { DEFAULT: v('--muted'), foreground: v('--muted-foreground') },
        accent: { DEFAULT: v('--accent'), foreground: v('--accent-foreground') },
        destructive: { DEFAULT: v('--destructive'), foreground: v('--destructive-foreground') },
        border: v('--border'),
        input: v('--input'),
        ring: v('--ring'),
        ondai: {
          bg: v('--ondai-bg'),
          surface: v('--ondai-surface'),
          elevated: v('--ondai-elevated'),
          hairline: v('--ondai-hairline'),
          text: v('--ondai-text'),
          'text-secondary': v('--ondai-text-secondary'),
          'text-tertiary': v('--ondai-text-tertiary'),
          accent: v('--ondai-accent'),
          'accent-a': v('--ondai-accent-a'),
          'accent-b': v('--ondai-accent-b'),
          'accent-c': v('--ondai-accent-c'),
          'accent-soft': v('--ondai-accent-soft'),
          success: v('--ondai-success'),
          warning: v('--ondai-warning'),
          danger: v('--ondai-danger'),
        },
      },
      borderRadius: Object.fromEntries(Object.entries(radii).map(([k, val]) => [k, `${val}px`])),
      spacing: Object.fromEntries(Object.entries(spacing).map(([k, val]) => [`o${k}`, `${val}px`])),
      fontFamily: { sans: fontFamilies.web.sans.split(', '), mono: fontFamilies.web.mono.split(', ') },
      fontSize: Object.fromEntries(
        (Object.keys(fontSizes) as Array<keyof typeof fontSizes>).map((k) => [
          k,
          [`${fontSizes[k]}px`, { lineHeight: `${lineHeights[k]}px` }],
        ]),
      ),
      backgroundImage: { 'ondai-gradient': v('--ondai-gradient') },
    },
  },
}

export default ondaiPreset
