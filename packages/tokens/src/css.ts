import { fontFamilies, fontSizes, lineHeights } from './typography'
import { radii, spacing } from './layout'
import { resolveTheme, type Theme, type ThemeInput } from './themes'

/** Flat CSS custom properties for a theme (shadcn-compatible names + ondai extras). */
export function themeToCssVars(theme: Theme): Record<string, string> {
  const c = theme.colors
  return {
    '--background': c.bg,
    '--foreground': c.text,
    '--card': c.surface,
    '--card-foreground': c.text,
    '--popover': c.elevated,
    '--popover-foreground': c.text,
    '--primary': c.accent.solid,
    '--primary-foreground': c.onAccent,
    '--secondary': c.elevated,
    '--secondary-foreground': c.text,
    '--muted': c.muted,
    '--muted-foreground': c.textSecondary,
    '--accent': c.accent.soft,
    '--accent-foreground': c.text,
    '--destructive': c.danger,
    '--destructive-foreground': '#FFFFFF',
    '--border': c.hairline,
    '--input': c.input,
    '--ring': c.accent.ring,
    '--radius': `${radii.lg}px`,
    // ondai extras
    '--ondai-bg': c.bg,
    '--ondai-surface': c.surface,
    '--ondai-elevated': c.elevated,
    '--ondai-hairline': c.hairline,
    '--ondai-hairline-strong': c.hairlineStrong,
    '--ondai-text': c.text,
    '--ondai-text-secondary': c.textSecondary,
    '--ondai-text-tertiary': c.textTertiary,
    '--ondai-accent-a': c.accent.a,
    '--ondai-accent-b': c.accent.b,
    '--ondai-accent-c': c.accent.c,
    '--ondai-accent': c.accent.solid,
    '--ondai-accent-soft': c.accent.soft,
    '--ondai-accent-glow': c.accent.glow,
    '--ondai-accent-ring': c.accent.ring,
    '--ondai-gradient': `linear-gradient(90deg, ${c.accent.a}, ${c.accent.b}, ${c.accent.c})`,
    '--ondai-success': c.success,
    '--ondai-warning': c.warning,
    '--ondai-danger': c.danger,
    '--ondai-font-sans': fontFamilies.web.sans,
    '--ondai-font-mono': fontFamilies.web.mono,
  }
}

/** A complete stylesheet string: `:root` (void), `[data-theme=paper]`, `[data-theme=glass]`, plus scale vars. */
export function generateCss(inputs: Array<ThemeInput & { selector: string }> = defaultSelectors): string {
  const scale = [
    ...Object.entries(fontSizes).map(([k, v]) => `  --ondai-text-${k}: ${v}px;`),
    ...Object.entries(lineHeights).map(([k, v]) => `  --ondai-leading-${k}: ${v}px;`),
    ...Object.entries(spacing).map(([k, v]) => `  --ondai-space-${k}: ${v}px;`),
    ...Object.entries(radii).map(([k, v]) => `  --ondai-radius-${k}: ${v}px;`),
  ].join('\n')
  const blocks = inputs.map(({ selector, ...input }) => {
    const vars = themeToCssVars(resolveTheme(input))
    const body = Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n')
    return `${selector} {\n${body}\n}`
  })
  return `:root {\n${scale}\n}\n\n${blocks.join('\n\n')}\n`
}

export const defaultSelectors: Array<ThemeInput & { selector: string }> = [
  { selector: ':root, [data-theme="void"]', theme: 'void' },
  { selector: '[data-theme="paper"]', theme: 'paper' },
  { selector: '[data-theme="glass"]', theme: 'glass' },
  { selector: '[data-accent="mono"]', theme: 'void', accent: 'mono' },
  { selector: '[data-theme="paper"][data-accent="mono"]', theme: 'paper', accent: 'mono' },
  { selector: '[data-accent="aurora"]', theme: 'void', accent: 'aurora' },
  { selector: '[data-theme="paper"][data-accent="aurora"]', theme: 'paper', accent: 'aurora' },
  { selector: '[data-accent="ember"]', theme: 'void', accent: 'ember' },
  { selector: '[data-theme="paper"][data-accent="ember"]', theme: 'paper', accent: 'ember' },
]
