import { describe, expect, it } from 'vitest'
import { contrast, resolveTheme, createVariants, generateCss, alpha, mix } from './index'

describe('resolveTheme', () => {
  it('void is dark with ion accent by default', () => {
    const t = resolveTheme()
    expect(t.name).toBe('void')
    expect(t.scheme).toBe('dark')
    expect(t.colors.bg).toBe('#09090B')
    expect(t.colors.accent.gradient).toEqual(['#7CF7FF', '#8B7CFF', '#FF7CE5'])
  })
  it('system follows scheme', () => {
    expect(resolveTheme({ theme: 'system', scheme: 'light' }).name).toBe('paper')
    expect(resolveTheme({ theme: 'system', scheme: 'dark' }).name).toBe('void')
  })
  it('mono accent flips with scheme', () => {
    expect(resolveTheme({ theme: 'void', accent: 'mono' }).colors.accent.solid).toBe('#FFFFFF')
    expect(resolveTheme({ theme: 'paper', accent: 'mono' }).colors.accent.solid).toBe('#09090B')
  })
  it('text meets WCAG AA on backgrounds in both themes', () => {
    for (const name of ['void', 'paper'] as const) {
      const t = resolveTheme({ theme: name })
      expect(contrast(t.colors.text, t.colors.bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t.colors.textSecondary, t.colors.surface)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t.colors.textTertiary, t.colors.bg)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('createVariants', () => {
  const v = createVariants({
    base: { padding: 4 },
    variants: { size: { sm: { height: 32 }, md: { height: 40 } }, tone: { solid: { opacity: 1 }, ghost: { opacity: 0.5 } } },
    compound: [{ when: { size: 'sm', tone: 'ghost' }, style: { padding: 2 } }],
    defaults: { size: 'md', tone: 'solid' },
  })
  it('applies defaults, variants and compound styles in order', () => {
    expect(v()).toEqual([{ padding: 4 }, { height: 40 }, { opacity: 1 }])
    expect(v({ size: 'sm', tone: 'ghost' })).toEqual([{ padding: 4 }, { height: 32 }, { opacity: 0.5 }, { padding: 2 }])
    expect(v.options.size).toEqual(['sm', 'md'])
    expect(v.resolve({ tone: 'ghost' })).toEqual({ size: 'md', tone: 'ghost' })
  })
})

describe('color utils', () => {
  it('alpha and mix', () => {
    expect(alpha('#7CF7FF', 0.2)).toBe('rgba(124,247,255,0.2)')
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })
})

describe('css', () => {
  it('emits variables for every theme selector', () => {
    const css = generateCss()
    expect(css).toContain('[data-theme="paper"]')
    expect(css).toContain('--ondai-accent-a: #7CF7FF')
    expect(css).toContain('--ondai-text-md: 14px')
  })
})

describe('material', () => {
  it('makes glass and native translucent in both schemes, and solid opaque', () => {
    for (const theme of ['void', 'paper'] as const) {
      const solid = resolveTheme({ theme })
      const glass = resolveTheme({ theme, material: 'glass' })
      const native = resolveTheme({ theme, material: 'native' })
      expect(solid.glass).toBe(false)
      expect(glass.glass && native.glass).toBe(true)
      expect(glass.colors.surface).not.toBe(solid.colors.surface)
      expect(glass.colors.surface).toMatch(/^rgba/)
      expect(native.material).toBe('native')
    }
  })

  it('keeps the old glass theme name as dark glass', () => {
    const t = resolveTheme({ theme: 'glass' })
    expect(t.scheme).toBe('dark')
    expect(t.material).toBe('glass')
  })
})
