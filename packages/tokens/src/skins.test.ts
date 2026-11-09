import { describe, expect, it } from 'vitest'
import { contrast, luminance } from './colors'
import { bevelInk, bevelStops, candyStops, onColor, resolveSkin, skinNames, toSkin } from './skins'
import { resolveTheme } from './themes'

const isHex = (c: string) => /^#[0-9a-f]{6}$/i.test(c)

describe('skins', () => {
  it('maps old names and unknown values to clean', () => {
    expect(toSkin('auto')).toBe('clean')
    expect(toSkin('solid')).toBe('clean')
    expect(toSkin(undefined)).toBe('clean')
    expect(toSkin('pop')).toBe('pop')
  })
  for (const theme of ['void', 'paper'] as const)
    for (const accent of ['mono', 'ion', 'ember'] as const)
      for (const skin of skinNames)
        it(`${skin} on ${theme} with ${accent}: primary ink reads on its fill`, () => {
          const s = resolveSkin(resolveTheme({ theme, accent }), skin)
          expect(s.skin).toBe(skin)
          // Metal keys carry body-coloured fills with theme text; every opaque primary must hold 3:1 for its icon and label.
          if (isHex(s.primary.fill) && isHex(s.primary.fg)) expect(contrast(s.primary.fill, s.primary.fg)).toBeGreaterThanOrEqual(3)
          expect(s.radius.control).toBeGreaterThanOrEqual(10)
          expect(s.radius.control).toBeLessThanOrEqual(12)
        })
  it('tint overrides the accent', () => {
    const s = resolveSkin(resolveTheme({ theme: 'paper', accent: 'mono' }), 'pop', { tint: '#2563EB' })
    expect(s.tint).toBe('#2563EB')
    expect(s.primary.fill).toBe('#2563EB')
    expect(s.onTint).toBe(onColor('#2563EB'))
  })
  it('candy turns ink into graphite and white into pearl', () => {
    expect(candyStops('#09090B', false).top).not.toBe('#09090B')
    expect(candyStops('#FFFFFF', true).gloss).toBe(0)
  })
  it('lists bevel as a variant', () => {
    expect(skinNames).toContain('bevel')
    expect(toSkin('bevel')).toBe('bevel')
  })
  it('bevel keys are lit from above: a lighter top, a deeper bottom and a lighter edge on colour', () => {
    for (const color of ['#3B82F6', '#FF5A5F', '#C0392B']) {
      const b = bevelStops(color, false)
      expect(luminance(b.top)).toBeGreaterThan(luminance(b.bottom))
      expect(luminance(b.border)).toBeGreaterThan(luminance(b.bottom))
      // Tinted keys carry a white legend, as the reference keys do.
      expect(bevelInk(b)).toBe('#FFFFFF')
    }
  })
  for (const theme of ['void', 'paper'] as const)
    it(`bevel on ${theme} in mono: every key, chip and tile is a lit key`, () => {
      const s = resolveSkin(resolveTheme({ theme, accent: 'mono' }), 'bevel')
      expect(s.primary.bevel).toBeDefined()
      expect(s.secondary.bevel).toBeDefined()
      expect(s.tile.bevel).toBeDefined()
      // Graphite on paper and a lit charcoal on void: the primary is the lighter, lit key on void, the ink one on paper.
      if (theme === 'void') expect(luminance(s.primary.bevel!.top)).toBeGreaterThan(luminance(s.secondary.bevel!.top))
      else expect(luminance(s.primary.bevel!.bottom)).toBeLessThan(0.02)
      expect(contrast(s.primary.fill, s.primary.fg)).toBeGreaterThanOrEqual(3)
    })
  it('bevel takes the tint for the primary key and the tiles', () => {
    const s = resolveSkin(resolveTheme({ theme: 'paper', accent: 'mono' }), 'bevel', { tint: '#3B82F6' })
    expect(s.primary.bevel!.top).not.toBe(s.secondary.bevel!.top)
    expect(s.tile.ink).toBe('#FFFFFF')
  })
  it('metal keeps the liquid metal for the primary key only', () => {
    for (const theme of ['void', 'paper'] as const) {
      const s = resolveSkin(resolveTheme({ theme, accent: 'mono' }), 'metal')
      expect(s.metal.liquid.ring.length).toBeGreaterThan(6)
      expect(s.metal.faceInk).toBe(s.metal.liquid.ink)
      expect(contrast(s.metal.liquid.face[1], s.metal.liquid.ink)).toBeGreaterThanOrEqual(4.5)
      // Secondary keys, tiles and rows are quiet, opaque surfaces.
      expect(isHex(s.secondary.fill)).toBe(true)
      expect(s.tile.fill).toBe(s.metal.well)
    }
  })
  it('glass gives panels, controls and the primary key a lit edge', () => {
    const s = resolveSkin(resolveTheme({ theme: 'paper', accent: 'mono' }), 'glass')
    expect(s.glass?.blur).toBeGreaterThan(0)
    expect(s.glass!.panel.sheen).toBeGreaterThan(0)
    expect(s.glass!.control.rimTop).not.toBe(s.glass!.control.rimSide)
  })
})
