import { alpha, contrast, hexToRgba, luminance, mix } from './colors'
import type { Theme } from './themes'

/**
 * The look axis every AI component exposes as `variant`, and every primitive as `skin`.
 * One name changes the container, the actions, the chips and the fields together.
 *
 * - `clean`: the house look. Quiet surfaces that follow the theme material (solid, glass or native).
 * - `minimal`: no fill and no depth; hairlines only, for components that sit inside an existing card.
 * - `glass`: frosted panels like visionOS: real blur, a specular top edge and a 1px light rim; controls on lighter glass.
 * - `pop`: a pushable 3D key. Flat face, a darker edge and a solid side under it; pressing sinks the face.
 * - `candy`: glossy and round-lit. A radial fill, a white top highlight, a fading shine line and a soft glow.
 * - `metal`: quiet surfaces with a fine brushed hairline; only the primary key is liquid metal (a flowing chrome rim).
 * - `shine`: quiet surfaces with a slow light that sweeps across the primary key and travels round the edge.
 * - `bevel`: lit 3D keys. A vertical gradient, a bright inner top line, a lighter 1px edge, a darker lip and a soft drop.
 */
export type Skin = 'clean' | 'minimal' | 'glass' | 'pop' | 'candy' | 'metal' | 'shine' | 'bevel'

/** Earlier names still accepted: `auto` and `solid` both mean `clean`. */
export type SkinInput = Skin | 'auto' | 'solid'

export const skinNames: readonly Skin[] = ['clean', 'minimal', 'glass', 'pop', 'candy', 'metal', 'shine', 'bevel']

export function toSkin(value?: string | null): Skin {
  return value && (skinNames as readonly string[]).includes(value) ? (value as Skin) : 'clean'
}

/** One painted part: fill, ink, edge and depth. */
export interface SkinPaint {
  fill: string
  fg: string
  /** Secondary ink on this paint (descriptions, placeholders). */
  fgMuted: string
  border: string
  borderWidth: number
  /** CSS box-shadow (React Native 0.76+ and react-native-web both read it). */
  shadow?: string
}

/** A glossy candy fill, computed from one colour. */
export interface CandyStops {
  /** Body, top to bottom. */
  top: string
  bottom: string
  /** The light that bounces up inside the candy from its lower lip. */
  bounce: string
  /** Opacity of the white gloss over the top half. */
  gloss: number
  /** 1px border, a step lighter than the body (darker for pearl, so it still has an edge on paper). */
  border: string
  /** Inset top highlight. */
  highlight: string
  /** The 1px fading shine line near the top edge. */
  shine: string
  /** Coloured outer glow. */
  glow: string
}

/** A lit key (`bevel`): lighter at the top, deeper at the bottom, with a bright inner top line and a darker lip. */
export interface BevelStops {
  /** Body, top to bottom. */
  top: string
  bottom: string
  /** 1px edge, a step lighter than the body (darker for white keys, so they still have an edge on paper). */
  border: string
  /** The bright 1px line just inside the top edge. */
  highlight: string
  /** The darker 1px line just inside the bottom edge. */
  lowlight: string
  /** Outer shadow: a tight contact shadow and a soft drop. */
  drop: string
}

/** The glass edge: a 1px rim lit from above (bright top, faint sides, a softer bottom) and a specular wash over the top. */
export interface GlassEdge {
  rimTop: string
  rimSide: string
  rimBottom: string
  /** Opacity of the white specular wash that fades down from the top edge. */
  sheen: number
}

/** The pushable key: face, a darker edge round it, and the side that shows below. */
export interface PopPaint extends SkinPaint {
  side: string
}

export interface SkinTokens {
  skin: Skin
  dark: boolean
  /** The primary colour: the `tint` override, else the accent. In `mono` it is ink on paper and white on void. */
  tint: string
  /** Text and icons drawn on the tint. */
  onTint: string
  radius: {
    /** Buttons, fields, keys. */
    control: number
    /** Panels, cards, composers. */
    container: number
    /** Wells and rows inside a container. */
    inset: number
  }
  /** `pop` travel of a primary key in pt (its visible side), per control size. Zero for every other skin. */
  depth: { sm: number; md: number; lg: number }
  /** `pop` travel of secondary keys, keycap tiles and rows. */
  depthSecondary: { sm: number; md: number; lg: number }
  /** Floating and card containers. `side` and `ledge` give a `pop` panel its solid side; `floor` is the flat shadow under it. */
  container: SkinPaint & { side?: string; floor?: string; ledge?: number }
  /** Quiet wells inside a container (attachments, rows, previews). */
  inset: SkinPaint
  primary: SkinPaint & { side?: string; floor?: string; candy?: CandyStops; bevel?: BevelStops }
  secondary: SkinPaint & { side?: string; floor?: string; candy?: CandyStops; bevel?: BevelStops }
  /** Small tiles behind row icons (and the hovered row) in the expressive skins: fill, icon ink and candy gloss. */
  tile: { fill: string; ink: string; candy?: CandyStops; bevel?: BevelStops }
  field: SkinPaint
  chip: SkinPaint & { selectedFill: string; selectedFg: string }
  /** `glass` only: the blur radius (pt) and the lit edges of panels, controls (keys, rows, tiles, wells) and the primary key. */
  glass?: { blur: number; panel: GlassEdge; control: GlassEdge; primary: GlassEdge }
  /** Hover and pressed fill for rows inside a container. */
  rowHover: string
  /** Loading placeholders (Skeleton): the theme's muted fill in `clean` and `minimal`, a see-through ink elsewhere so it reads on candy, chrome, glass and pop panels. */
  placeholder: string
  metal: {
    /** The `liquid-metal` fx preset that matches the accent (for apps that pass the live shader through a slot). */
    preset: 'chromatic' | 'silver' | 'gold'
    /** The fine brushed hairline round quiet metal parts. Four stops, top left to bottom right. */
    stroke: readonly [string, string, string, string]
    /** Polished-steel bands, light and dark alternating (small chrome details such as waveform bars). */
    rim: readonly string[]
    /** Polished chrome, top to bottom, with a dark horizon just under the middle (small chrome details). */
    face: readonly string[]
    /** Ink on the primary (liquid-metal) key. */
    faceInk: string
    /** Quiet face of secondary keys, hovered rows and bubbles, top to bottom, and its ink. */
    plate: readonly [string, string]
    plateInk: string
    /** Panel body, top to bottom. */
    body: readonly [string, string]
    /** The small icon well inside a metal key. */
    well: string
    /**
     * The one liquid-metal part: the primary key. `ring` and `flow` are two sets of chrome bands (with thin
     * chromatic fringes) that drift round the rim in opposite directions; `face` is the body inside the rim.
     */
    liquid: { ring: readonly string[]; flow: readonly string[]; face: readonly [string, string]; ink: string; glow: readonly [string, string] }
  }
  shine: {
    /** The light that sweeps across a primary key. */
    sweep: string
    /** The glint that travels round the edge. */
    glint: string
    /** Seconds per lap of the edge glint. */
    lap: number
  }
}

const isHex = (c: string) => /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c)
/** A hex colour without its alpha, or the fallback when `c` is not hex (an rgba() or a named colour). */
const solidHex = (c: string, fallback: string) => (!isHex(c) ? fallback : c.length > 7 ? c.slice(0, 7) : c)

/** `#FFFFFF` or near-black, whichever reads better on `color`. */
export function onColor(color: string): string {
  if (!isHex(color)) return '#FFFFFF'
  return contrast(color, '#FFFFFF') >= contrast(color, '#09090B') ? '#FFFFFF' : '#09090B'
}

const darken = (c: string, t: number) => (isHex(c) ? mix(c, '#000000', t) : c)
const lighten = (c: string, t: number) => (isHex(c) ? mix(c, '#FFFFFF', t) : c)
const lum = (c: string) => (isHex(c) ? luminance(c) : 0.5)

/** Candy gloss for any colour. Dark colours turn to glossy graphite, white turns to pearl. */
export function candyStops(color: string, dark: boolean): CandyStops {
  const c = solidHex(color, dark ? '#FFFFFF' : '#09090B')
  const L = lum(c)
  if (L < 0.02) {
    // Ink cannot get darker: lift the top so the gloss and the bounce have room to read (glossy graphite).
    return { top: mix(c, '#FFFFFF', 0.26), bottom: c, bounce: mix(c, '#FFFFFF', 0.5), gloss: 0.3, border: mix(c, '#FFFFFF', 0.34), highlight: 'rgba(255,255,255,0.35)', shine: 'rgba(255,255,255,0.9)', glow: alpha('#000000', 0.35) }
  }
  if (L > 0.8) {
    // White cannot get lighter: sink the bottom a little and keep a darker edge (pearl).
    return { top: '#FFFFFF', bottom: mix(c, '#000000', dark ? 0.2 : 0.12), bounce: '#FFFFFF', gloss: 0, border: mix(c, '#000000', dark ? 0.06 : 0.16), highlight: 'rgba(255,255,255,1)', shine: 'rgba(255,255,255,1)', glow: dark ? alpha('#FFFFFF', 0.22) : alpha('#000000', 0.12) }
  }
  return { top: lighten(c, 0.2), bottom: darken(c, 0.16), bounce: lighten(c, 0.55), gloss: 0.38, border: lighten(c, 0.32), highlight: 'rgba(255,255,255,0.5)', shine: 'rgba(255,255,255,0.9)', glow: alpha(c, 0.45) }
}

/** The pop key for a face colour: an edge and a side a clear step darker, or for ink a lifted face over an ink side. */
export function popPaint(face: string, dark: boolean): { face: string; side: string; border: string } {
  const c = solidHex(face, dark ? '#FFFFFF' : '#09090B')
  const L = lum(c)
  if (L < 0.02) return { face: mix(c, '#FFFFFF', 0.2), side: c, border: c }
  if (L > 0.8) return { face: c, side: mix(c, '#000000', dark ? 0.4 : 0.22), border: mix(c, '#000000', dark ? 0.5 : 0.6) }
  return { face: c, side: darken(c, 0.38), border: darken(c, 0.55) }
}

/**
 * The lit key for any colour: a vertical gradient (lighter top, deeper bottom), a lighter 1px edge, a bright inner
 * top line, a darker lip and a soft drop. Ink lifts to graphite so the light has room to read; white stays a
 * paper key with a grey edge; dark charcoal keys on void keep a faint light edge.
 */
export function bevelStops(color: string, dark: boolean): BevelStops {
  const c = solidHex(color, dark ? '#FFFFFF' : '#09090B')
  const L = lum(c)
  const drop = (a: number, b: number) => `0 1px 1px rgba(0,0,0,${a}), 0 4px 10px -3px rgba(0,0,0,${b})`
  if (L > 0.8)
    // A white key: paper face that greys a touch towards its lip, a grey edge, a white top line.
    return { top: '#FFFFFF', bottom: mix(c, '#000000', 0.055), border: mix(c, '#000000', dark ? 0.1 : 0.15), highlight: 'rgba(255,255,255,1)', lowlight: 'rgba(0,0,0,0.06)', drop: drop(dark ? 0.4 : 0.07, dark ? 0.5 : 0.1) }
  if (L < 0.035) {
    // Ink and charcoal: lift the top to graphite, keep the edge a step lighter so it reads on void.
    const top = mix(c, '#FFFFFF', dark ? 0.2 : 0.24)
    return { top, bottom: c, border: mix(c, '#FFFFFF', dark ? 0.2 : 0.28), highlight: `rgba(255,255,255,${dark ? 0.2 : 0.26})`, lowlight: 'rgba(0,0,0,0.35)', drop: drop(dark ? 0.6 : 0.2, dark ? 0.6 : 0.22) }
  }
  // A colour: the body runs from the colour, lifted a touch, down to a deeper shade of it, so a white legend
  // reads on bright tints too (the way a lit red or blue key looks).
  return { top: lighten(c, 0.1), bottom: darken(c, 0.18), border: lighten(c, 0.24), highlight: 'rgba(255,255,255,0.4)', lowlight: `rgba(0,0,0,${dark ? 0.25 : 0.16})`, drop: drop(dark ? 0.5 : 0.14, dark ? 0.55 : 0.18) }
}

/** The legend on a lit key: white wherever it holds 3:1 (keys carry short medium-weight labels and icons), else ink. */
export function bevelInk(b: BevelStops): string {
  return isHex(b.bottom) && contrast(b.bottom, '#FFFFFF') >= 3 ? '#FFFFFF' : onColor(b.bottom)
}

/** The fallback for parts that paint a bevel key as a flat fill: the gradient and the edges as inset shadows. */
const bevelShadow = (b: BevelStops) => `inset 0 1px 0 ${b.highlight}, inset 0 -1px 0 ${b.lowlight}, inset 0 14px 18px -12px rgba(255,255,255,0.14), ${b.drop}`

/**
 * Resolves a skin against the theme. Every colour comes from the theme and the accent (or the `tint`
 * override), so `mono` gives graphite candy, white keys on void and ink keys on paper.
 */
export function resolveSkin(theme: Theme, skin: Skin, opts: { tint?: string } = {}): SkinTokens {
  const t = theme
  const c = t.colors
  const dark = t.scheme === 'dark'
  const tint = opts.tint ?? c.accent.solid
  const onTint = opts.tint ? onColor(opts.tint) : c.onAccent
  const metalPreset: SkinTokens['metal']['preset'] = t.accentName === 'ember' ? 'gold' : t.accentName === 'mono' ? 'silver' : 'chromatic'
  const opaqueSurface = dark ? '#121214' : '#FFFFFF'
  // The liquid-metal key: chrome bands with thin chromatic fringes (the preset's), a body inside, a two-tone glow.
  const liquidRing: Record<SkinTokens['metal']['preset'], readonly string[]> = {
    chromatic: ['#FFFFFF', '#9EF3FF', '#1E2436', '#5B4C8C', '#FFFFFF', '#F4F5F8', '#FF9BE6', '#151926', '#6E7891', '#FFF1A8', '#FFFFFF', '#262C40', '#A9F5FF', '#FFFFFF'],
    silver: ['#FFFFFF', '#CFE2FF', '#141925', '#3A4152', '#F7F8FA', '#FFFFFF', '#F0CFEF', '#0E121B', '#5E6678', '#FFFFFF', '#D6E6F8', '#151A24', '#9AA3B6', '#FFFFFF'],
    gold: ['#FFF8E1', '#FFE6A3', '#4A320B', '#9C7424', '#FFFDF4', '#F5D27A', '#FFB98A', '#3B2A0C', '#C9A24A', '#FFF8E1', '#FFFFFF', '#5A3D0E', '#F8DC8C', '#FFF8E1'],
  }
  const liquidFlow: Record<SkinTokens['metal']['preset'], readonly string[]> = {
    chromatic: ['#F7F8FB', '#0F1320', '#FFFFFF', '#7CF7FF', '#2B3147', '#FFFFFF', '#FF7CE5', '#0F1320', '#F7F8FB'],
    silver: ['#F7F8FB', '#10141E', '#FFFFFF', '#CFE0FF', '#2B3140', '#FFFFFF', '#EBD3F0', '#10141E', '#F7F8FB'],
    gold: ['#FFF8E1', '#3B2A0C', '#FFFFFF', '#FFD86B', '#5A3D0E', '#FFFDF4', '#FFB27A', '#3B2A0C', '#FFF8E1'],
  }
  const liquidGlow: Record<SkinTokens['metal']['preset'], readonly [string, string]> = {
    chromatic: ['rgba(255,124,229,0.42)', 'rgba(124,247,255,0.42)'],
    silver: dark ? ['rgba(255,255,255,0.2)', 'rgba(170,195,255,0.22)'] : ['rgba(110,130,175,0.3)', 'rgba(190,160,225,0.26)'],
    gold: ['rgba(245,200,90,0.45)', 'rgba(255,150,90,0.3)'],
  }
  const liquidFace: readonly [string, string] = opts.tint && isHex(opts.tint) ? [lighten(opts.tint, 0.1), darken(opts.tint, 0.06)] : dark ? ['#2E2E33', '#1C1C20'] : ['#FFFFFF', '#F0F0F2']

  // The clean look: today's kit. Everything else starts from it and changes what it needs.
  const base: SkinTokens = {
    skin,
    dark,
    tint,
    onTint,
    radius: { control: 10, container: 20, inset: 10 },
    depth: { sm: 0, md: 0, lg: 0 },
    depthSecondary: { sm: 0, md: 0, lg: 0 },
    container: { fill: c.surface, fg: c.text, fgMuted: c.textSecondary, border: 'transparent', borderWidth: 0, shadow: `${t.shadows.ring}, ${t.shadows.lg}` },
    inset: { fill: c.muted, fg: c.text, fgMuted: c.textSecondary, border: 'transparent', borderWidth: 0 },
    primary: { fill: opts.tint ?? c.text, fg: opts.tint ? onTint : c.bg, fgMuted: opts.tint ? onTint : c.bg, border: 'transparent', borderWidth: 0, shadow: dark ? undefined : '0 1px 2px rgba(16,16,20,0.16)' },
    secondary: { fill: c.surface, fg: c.text, fgMuted: c.textSecondary, border: 'transparent', borderWidth: 0, shadow: t.shadows.ring },
    field: { fill: c.input, fg: c.text, fgMuted: c.textTertiary, border: c.hairlineStrong, borderWidth: 1 },
    chip: { fill: c.muted, fg: c.text, fgMuted: c.textTertiary, border: 'transparent', borderWidth: 0, selectedFill: c.text, selectedFg: c.bg },
    rowHover: c.muted,
    // Every expressive panel paints its own body, so its placeholder is ink at low alpha rather than a fixed grey.
    placeholder: skin === 'clean' || skin === 'minimal' ? c.muted : dark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.06)',
    tile: { fill: 'transparent', ink: c.textSecondary },
    metal: {
      preset: metalPreset,
      stroke: dark ? ['#5E5E66', '#2A2A2F', '#45454D', '#26262B'] : ['#E4E4E7', '#B4B4BB', '#ECECEF', '#A1A1AA'],
      rim: dark
        ? ['#F4F4F5', '#3F3F46', '#D4D4D8', '#18181B', '#A1A1AA', '#52525B', '#FAFAFA', '#27272A', '#E4E4E7']
        : ['#FFFFFF', '#71717A', '#F4F4F5', '#3F3F46', '#D4D4D8', '#A1A1AA', '#FFFFFF', '#52525B', '#E4E4E7'],
      face: ['#FFFFFF', '#F2F2F4', '#D9D9DE', '#8E8E96', '#C4C4CA', '#ECECEF', '#FFFFFF'],
      // Ink on the primary key's face: that key is the liquid-metal one, so it follows the liquid body.
      faceInk: onColor(liquidFace[1]),
      plate: dark ? ['#222226', '#1B1B1E'] : ['#FFFFFF', '#F6F6F7'],
      plateInk: dark ? '#EDEDEF' : '#09090B',
      body: dark ? ['#161618', '#121214'] : ['#FFFFFF', '#FFFFFF'],
      well: dark ? '#1C1C1F' : '#F4F4F5',
      liquid: { ring: liquidRing[metalPreset], flow: liquidFlow[metalPreset], face: liquidFace, ink: onColor(liquidFace[1]), glow: liquidGlow[metalPreset] },
    },
    shine: { sweep: 'rgba(255,255,255,0.32)', glint: dark ? 'rgba(255,255,255,0.75)' : 'rgba(9,9,11,0.55)', lap: 6 },
  }

  switch (skin) {
    case 'clean':
      return base

    case 'minimal':
      return {
        ...base,
        radius: { control: 10, container: 14, inset: 8 },
        container: { ...base.container, fill: 'transparent', border: c.hairlineStrong, borderWidth: 1, shadow: undefined },
        inset: { ...base.inset, fill: 'transparent', border: c.hairline, borderWidth: 1 },
        primary: { ...base.primary, shadow: undefined },
        secondary: { ...base.secondary, fill: 'transparent', border: c.hairlineStrong, borderWidth: 1, shadow: undefined },
        field: { ...base.field, fill: 'transparent' },
        chip: { ...base.chip, fill: 'transparent', border: c.hairlineStrong, borderWidth: 1 },
      }

    case 'glass': {
      // visionOS in paper and void: real blur, a light rim lit from above, a specular wash over the top, and
      // controls on a lighter glass. Fills stay translucent enough to show what is behind, opaque enough for text.
      const keyTint = opts.tint ?? c.text
      const edge = (top: number, side: number, bottom: number, sheen: number, ink = '255,255,255'): GlassEdge => ({ rimTop: `rgba(${ink},${top})`, rimSide: `rgba(${ink},${side})`, rimBottom: `rgba(${ink},${bottom})`, sheen })
      const panel = dark ? edge(0.34, 0.08, 0.14, 0.08) : edge(1, 0.6, 0.85, 0.55)
      const control = dark ? edge(0.3, 0.09, 0.12, 0.07) : edge(1, 0.75, 0.9, 0.5)
      // The ink key on paper and any tinted key catch a cooler, fainter rim; the white key on void a bright one.
      const lightKey = !opts.tint && dark
      const primary = lightKey ? edge(1, 0.7, 0.8, 0.5) : edge(0.5, 0.14, 0.2, 0.18)
      const controlFill = dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.56)'
      const controlBorder = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)'
      const controlShadow = dark ? '0 0 0 0.5px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)' : '0 0 0 0.5px rgba(16,16,20,0.07), 0 1px 3px rgba(16,16,20,0.07)'
      return {
        ...base,
        radius: { control: 12, container: 24, inset: 14 },
        glass: { blur: 28, panel, control, primary },
        container: {
          ...base.container,
          fill: dark ? 'rgba(26,26,31,0.6)' : 'rgba(250,250,252,0.5)',
          border: panel.rimSide,
          borderWidth: 1,
          shadow: dark ? '0 0 0 0.5px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.3), 0 28px 56px -18px rgba(0,0,0,0.75)' : '0 0 0 0.5px rgba(16,16,20,0.08), 0 2px 6px rgba(16,16,20,0.05), 0 28px 56px -20px rgba(16,16,20,0.3)',
        },
        inset: { ...base.inset, fill: controlFill, border: controlBorder, borderWidth: 1 },
        primary: {
          fill: isHex(keyTint) ? alpha(keyTint, dark && !opts.tint ? 0.9 : 0.84) : keyTint,
          fg: opts.tint ? onTint : c.bg,
          fgMuted: opts.tint ? onTint : c.bg,
          border: primary.rimSide,
          borderWidth: 1,
          shadow: `0 1px 2px rgba(0,0,0,${dark ? 0.4 : 0.12}), 0 8px 18px -6px rgba(0,0,0,${dark ? 0.45 : 0.2})`,
        },
        secondary: { fill: controlFill, fg: c.text, fgMuted: c.textSecondary, border: controlBorder, borderWidth: 1, shadow: controlShadow },
        tile: { fill: controlFill, ink: c.text },
        field: { ...base.field, fill: dark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.5)', border: controlBorder, borderWidth: 1, shadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.35)' : 'inset 0 1px 2px rgba(16,16,20,0.05)' },
        chip: { ...base.chip, fill: controlFill, border: controlBorder, borderWidth: 1, shadow: controlShadow },
        rowHover: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
      }
    }

    case 'pop': {
      // A chunky physical slab: a face, a 2px ink edge, a solid side below it and a flat floor under that.
      const p = popPaint(tint, dark)
      const edge = dark ? '#8B8B93' : '#09090B'
      const face = dark ? '#26262B' : '#FFFFFF'
      const side = dark ? '#3A3A40' : mix('#FAFAFA', '#09090B', 0.2)
      const floor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(9,9,11,0.08)'
      const keyFace = dark ? '#34343A' : '#FFFFFF'
      return {
        ...base,
        radius: { control: 12, container: 18, inset: 12 },
        depth: { sm: 8, md: 10, lg: 12 },
        depthSecondary: { sm: 4, md: 5, lg: 6 },
        container: { fill: face, fg: c.text, fgMuted: c.textSecondary, border: edge, borderWidth: 2, side, floor, ledge: 9 },
        inset: { fill: dark ? '#1C1C20' : '#F4F4F5', fg: c.text, fgMuted: c.textSecondary, border: edge, borderWidth: 1.5 },
        primary: { fill: p.face, fg: onColor(p.face), fgMuted: onColor(p.face), border: p.border, borderWidth: 2, side: p.side, floor },
        secondary: { fill: keyFace, fg: c.text, fgMuted: c.textSecondary, border: edge, borderWidth: 2, side, floor },
        // Keycap tiles take the colour when there is one (a tint, or a coloured accent); in mono they stay neutral keys.
        tile: opts.tint || t.accentName !== 'mono' ? { fill: p.face, ink: onColor(p.face) } : { fill: keyFace, ink: c.text },
        field: { fill: dark ? '#111113' : '#FFFFFF', fg: c.text, fgMuted: c.textTertiary, border: edge, borderWidth: 2, shadow: `inset 0 3px 0 ${dark ? 'rgba(0,0,0,0.5)' : 'rgba(9,9,11,0.08)'}` },
        chip: { fill: keyFace, fg: c.text, fgMuted: c.textTertiary, border: edge, borderWidth: 1.5, shadow: `0 2px 0 0 ${side}, 0 2px 0 1.5px ${edge}`, selectedFill: p.face, selectedFg: onColor(p.face) },
        rowHover: keyFace,
      }
    }

    case 'candy': {
      const primary = candyStops(tint, dark)
      const secondary = candyStops(dark ? '#2A2A30' : '#FFFFFF', dark)
      const glowTint = lum(solidHex(tint, '#000000')) < 0.02 ? '#000000' : solidHex(tint, '#000000')
      return {
        ...base,
        radius: { control: 12, container: 22, inset: 12 },
        container: {
          fill: dark ? '#141416' : '#FFFFFF',
          fg: c.text,
          fgMuted: c.textSecondary,
          border: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          borderWidth: 1,
          // A soft tinted glow inside the panel and a coloured one outside it.
          shadow: `inset 0 1px 0 ${dark ? 'rgba(255,255,255,0.14)' : '#FFFFFF'}, inset 0 -26px 48px -30px ${alpha(glowTint, dark ? 0.7 : 0.32)}, inset 0 0 0 1px ${alpha(glowTint, dark ? 0.18 : 0.08)}, 0 2px 6px ${alpha(glowTint, dark ? 0.3 : 0.08)}, 0 22px 44px -16px ${alpha(glowTint, dark ? 0.6 : 0.34)}`,
        },
        inset: { fill: dark ? '#1E1E22' : '#F6F6F7', fg: c.text, fgMuted: c.textSecondary, border: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderWidth: 1, shadow: `inset 0 1px 0 ${dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'}` },
        primary: { fill: primary.bottom, fg: onColor(primary.bottom), fgMuted: onColor(primary.bottom), border: primary.border, borderWidth: 1, candy: primary, shadow: `0 1px 2px rgba(0,0,0,${dark ? 0.5 : 0.18}), 0 8px 22px -6px ${primary.glow}` },
        tile: { fill: primary.bottom, ink: onColor(primary.bottom), candy: primary },
        secondary: { fill: secondary.bottom, fg: c.text, fgMuted: c.textSecondary, border: secondary.border, borderWidth: 1, candy: secondary, shadow: `0 1px 2px rgba(0,0,0,${dark ? 0.5 : 0.1}), 0 4px 12px -4px rgba(0,0,0,${dark ? 0.5 : 0.12})` },
        field: { fill: dark ? '#0E0E10' : '#FFFFFF', fg: c.text, fgMuted: c.textTertiary, border: alpha(glowTint, dark ? 0.28 : 0.16), borderWidth: 1, shadow: `inset 0 2px 4px rgba(0,0,0,${dark ? 0.5 : 0.08}), 0 1px 0 ${dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'}` },
        chip: { fill: secondary.bottom, fg: c.text, fgMuted: c.textTertiary, border: secondary.border, borderWidth: 1, shadow: `inset 0 1px 0 ${secondary.highlight}, 0 1px 2px rgba(0,0,0,${dark ? 0.4 : 0.08})`, selectedFill: primary.bottom, selectedFg: onColor(primary.bottom) },
        rowHover: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)',
      }
    }

    case 'metal': {
      // Quiet surfaces with a fine brushed hairline. The primary key alone is liquid metal (see `metal.liquid`).
      const m = base.metal
      const lq = m.liquid
      return {
        ...base,
        radius: { control: 12, container: 20, inset: 12 },
        container: { fill: m.body[1], fg: c.text, fgMuted: c.textSecondary, border: 'transparent', borderWidth: 0, shadow: dark ? '0 24px 48px -16px rgba(0,0,0,0.7)' : '0 1px 2px rgba(16,16,20,0.04), 0 22px 44px -20px rgba(16,16,20,0.22)' },
        inset: { fill: m.well, fg: c.text, fgMuted: c.textSecondary, border: 'transparent', borderWidth: 0 },
        primary: { fill: lq.face[1], fg: lq.ink, fgMuted: lq.ink, border: 'transparent', borderWidth: 0, shadow: dark ? '0 6px 16px -6px rgba(0,0,0,0.8)' : '0 6px 16px -8px rgba(16,16,20,0.3)' },
        secondary: { fill: m.plate[0], fg: m.plateInk, fgMuted: c.textSecondary, border: m.stroke[1], borderWidth: 1, shadow: dark ? undefined : '0 1px 2px rgba(16,16,20,0.05)' },
        tile: { fill: m.well, ink: c.text },
        field: { fill: dark ? '#0F0F11' : '#FFFFFF', fg: c.text, fgMuted: c.textTertiary, border: m.stroke[1], borderWidth: 1 },
        chip: { fill: m.well, fg: c.text, fgMuted: c.textTertiary, border: m.stroke[1], borderWidth: 1, selectedFill: c.text, selectedFg: c.bg },
        rowHover: m.well,
      }
    }

    case 'shine': {
      const lightTint = lum(solidHex(tint, '#000000')) > 0.8
      const fill = lightTint ? mix(solidHex(tint, '#FFFFFF'), '#000000', 0.08) : tint
      return {
        ...base,
        radius: { control: 10, container: 20, inset: 10 },
        container: { ...base.container, fill: opaqueSurface, shadow: dark ? '0 24px 48px -16px rgba(0,0,0,0.6)' : '0 20px 44px -18px rgba(16,16,20,0.18)' },
        primary: { fill, fg: onColor(fill), fgMuted: onColor(fill), border: lightTint ? 'rgba(255,255,255,0.9)' : lighten(solidHex(tint, '#3F3F46'), 0.25), borderWidth: 1, shadow: `0 1px 2px rgba(0,0,0,${dark ? 0.5 : 0.16})` },
        secondary: { ...base.secondary, fill: opaqueSurface, border: c.hairlineStrong, borderWidth: 1, shadow: undefined },
        shine: { sweep: lightTint ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.45)', glint: base.shine.glint, lap: 6 },
      }
    }

    case 'bevel': {
      // Lit 3D keys: every key, chip, tile and the selected row is a small object lit from above. Panels stay calm:
      // a soft top light, a hairline and a drop. In mono the primary is a graphite key on paper and a lit charcoal
      // key on void; with a tint it is the tint.
      const keyColor = opts.tint ?? (dark ? '#3A3A40' : '#18181B')
      const primary = bevelStops(keyColor, dark)
      // On void a lit charcoal key: lift the top further and brighten its line so it reads as the main key.
      const lit: BevelStops = !opts.tint && dark ? { ...primary, top: '#5A5A62', bottom: '#323237', border: '#66666E', highlight: 'rgba(255,255,255,0.26)' } : primary
      const secondary: BevelStops = dark
        ? { top: '#232327', bottom: '#18181B', border: '#313136', highlight: 'rgba(255,255,255,0.1)', lowlight: 'rgba(0,0,0,0.4)', drop: '0 1px 1px rgba(0,0,0,0.5), 0 4px 10px -3px rgba(0,0,0,0.5)' }
        : bevelStops('#FFFFFF', false)
      // Tiles take the colour when there is one (a tint, or a coloured accent); in mono they are paper or charcoal keys.
      const coloured = !!opts.tint || t.accentName !== 'mono'
      const tile = coloured ? bevelStops(tint, dark) : secondary
      const keyFg = bevelInk(lit)
      return {
        ...base,
        radius: { control: 12, container: 20, inset: 12 },
        container: {
          fill: dark ? '#141416' : '#FFFFFF',
          fg: c.text,
          fgMuted: c.textSecondary,
          border: dark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.08)',
          borderWidth: 1,
          shadow: `inset 0 1px 0 ${dark ? 'rgba(255,255,255,0.07)' : '#FFFFFF'}, inset 0 40px 40px -40px ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,1)'}, 0 1px 2px rgba(0,0,0,${dark ? 0.5 : 0.05}), 0 20px 40px -18px rgba(0,0,0,${dark ? 0.7 : 0.18})`,
        },
        inset: { fill: dark ? '#0F0F11' : '#F6F6F7', fg: c.text, fgMuted: c.textSecondary, border: dark ? 'rgba(255,255,255,0.06)' : 'rgba(9,9,11,0.06)', borderWidth: 1, shadow: `inset 0 1px 2px rgba(0,0,0,${dark ? 0.5 : 0.05})` },
        primary: { fill: lit.bottom, fg: keyFg, fgMuted: keyFg, border: lit.border, borderWidth: 1, bevel: lit, shadow: bevelShadow(lit) },
        secondary: { fill: secondary.bottom, fg: c.text, fgMuted: c.textSecondary, border: secondary.border, borderWidth: 1, bevel: secondary, shadow: bevelShadow(secondary) },
        tile: { fill: tile.bottom, ink: coloured ? bevelInk(tile) : c.text, bevel: tile },
        field: { fill: dark ? '#0C0C0E' : '#FFFFFF', fg: c.text, fgMuted: c.textTertiary, border: dark ? 'rgba(255,255,255,0.1)' : 'rgba(9,9,11,0.12)', borderWidth: 1, shadow: `inset 0 1px 2px rgba(0,0,0,${dark ? 0.6 : 0.06})` },
        chip: { fill: secondary.bottom, fg: c.text, fgMuted: c.textTertiary, border: secondary.border, borderWidth: 1, shadow: bevelShadow(secondary), selectedFill: lit.bottom, selectedFg: keyFg },
        rowHover: secondary.bottom,
      }
    }
  }
}

/** Parses an rgba() or hex colour's alpha (used to decide whether a fill is see-through). */
export function colorAlpha(color: string): number {
  if (isHex(color)) return hexToRgba(color)[3]
  const m = color.match(/rgba?\(([^)]+)\)/)
  if (!m) return color === 'transparent' ? 0 : 1
  const parts = m[1]!.split(',').map((s) => s.trim())
  return parts.length === 4 ? Number(parts[3]) : 1
}
