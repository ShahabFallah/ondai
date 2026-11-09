import { useEffect, useId, useState, type ReactNode } from 'react'
import { Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { luminance, type BevelStops, type CandyStops, type GlassEdge, type Material, type RadiusKey, type SkinInput, type SkinTokens, type Theme } from '@ondai/tokens'
import { useMotion, useSkin, useTheme } from '@ondai/tokens/react'
import { IonBorder } from '../ion-border/ion-border'

export interface SurfaceProps extends Omit<ViewProps, 'style'> {
  children?: ReactNode
  /** `auto` follows the theme's material. Only the `clean` skin reads it; `glass` forces glass. */
  material?: 'auto' | Material
  /**
   * The look: `clean` (the theme material), `minimal`, `glass`, `pop`, `candy`, `metal`, `shine` or `bevel`.
   * Defaults to the nearest SkinProvider, so AI components set it once for every surface inside.
   */
  skin?: SkinInput
  /** Primary colour override (hex) for the skin's glow and gloss. */
  tint?: string
  /** `card` rests in the layout; `floating` is a sheet, menu or bar above it; `inset` is a quiet well inside a card. */
  elevation?: 'inset' | 'card' | 'floating'
  /** Defaults to the skin's container radius (inset: its inset radius); `clean` keeps `lg`. */
  radius?: RadiusKey | number
  /** Liquid Glass reacts to touch (iOS 26). Set on pressable surfaces. */
  interactive?: boolean
  style?: StyleProp<ViewStyle>
}

type Resolved = 'solid' | 'glass' | 'liquid' | 'tonal'

const liquid = Platform.OS === 'ios' && isLiquidGlassAvailable()

function resolve(material: Material): Resolved {
  if (material === 'solid') return 'solid'
  if (material === 'native') return liquid ? 'liquid' : Platform.OS === 'android' ? 'tonal' : 'glass'
  return 'glass'
}

/** One edge per surface: a ring drawn as a shadow, plus depth only where the surface truly floats. */
function edge(t: Theme, kind: Resolved, elevation: NonNullable<SurfaceProps['elevation']>): string | undefined {
  const dark = t.scheme === 'dark'
  if (kind === 'tonal' || kind === 'liquid') return undefined
  if (elevation === 'inset') return undefined
  if (kind === 'glass') {
    const depth = elevation === 'floating' ? t.shadows.lg : dark ? '0 8px 24px rgba(0,0,0,0.28)' : '0 6px 20px rgba(16,16,20,0.07)'
    return `inset 0 1px 0 ${t.colors.glassHighlight}, ${t.shadows.ring}, ${depth}`
  }
  if (elevation === 'floating') return `${t.shadows.ring}, ${t.shadows.lg}`
  return dark ? `inset 0 1px 0 rgba(255,255,255,0.04), ${t.shadows.ring}` : `${t.shadows.ring}, 0 1px 2px rgba(16,16,20,0.04)`
}

/** Layout keys stay on the outer box when a skin wraps the content in a ring; everything else styles the content. */
const outerKeys = new Set(['margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'marginStart', 'marginEnd', 'width', 'minWidth', 'maxWidth', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'position', 'top', 'left', 'right', 'bottom', 'zIndex'])

export function splitStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>
  const outer: Record<string, unknown> = {}
  const inner: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(flat)) (outerKeys.has(k) ? outer : inner)[k] = v
  return { outer: outer as ViewStyle, inner: inner as ViewStyle }
}

/**
 * The container every card-shaped component draws with. With the `clean` skin it follows the theme
 * material: solid is an opaque card with a single soft edge; glass is a blurred translucent panel on every
 * platform; native is Liquid Glass on iOS 26 and a Material 3 tonal container on Android. The other skins
 * draw their own container: `minimal`, `glass` (frosted, with a lit rim and a specular wash), `pop` (a slab with a
 * solid side), `candy` (glossy, glowing), `metal` (quiet, with a fine brushed hairline), `shine` (a lit edge with a
 * slow sheen) and `bevel` (calm, with a soft top light).
 */
export function Surface({ children, material = 'auto', skin: skinProp, tint, elevation = 'card', radius, interactive, style, ...rest }: SurfaceProps) {
  const t = useTheme()
  const s = useSkin(skinProp, tint)
  const skin = s.skin
  const r = radius === undefined ? (skin === 'clean' ? t.radii.lg : elevation === 'inset' ? s.radius.inset : s.radius.container) : typeof radius === 'number' ? radius : t.radii[radius]
  const dark = t.scheme === 'dark'

  if (skin === 'clean') {
    return (
      <MaterialSurface kind={resolve(material === 'auto' ? t.material : material)} t={t} r={r} elevation={elevation} interactive={interactive} style={style} rest={rest}>
        {children}
      </MaterialSurface>
    )
  }

  if (skin === 'glass' && s.glass) {
    // A frosted panel: the blur and the fill behind, the lit rim and the specular wash over it. An inset part is
    // a lighter glass with no blur of its own (it already sits on the panel's).
    const inset = elevation === 'inset'
    const p = inset ? s.inset : s.container
    return (
      <View {...rest} style={[{ borderRadius: r }, isolate, p.shadow && !inset ? ({ boxShadow: p.shadow } as ViewStyle) : null, inset ? { backgroundColor: p.fill } : null, style]}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, under]}>
          {inset ? null : <Frost radius={r} dark={dark} fill={p.fill} blur={s.glass.blur} />}
          <GlassEdgeLayer radius={r} edge={inset ? s.glass.control : s.glass.panel} />
        </View>
        {children}
      </View>
    )
  }

  if (elevation === 'inset') {
    const p = s.inset
    return (
      <View {...rest} style={[{ borderRadius: r, backgroundColor: p.fill, borderWidth: p.borderWidth, borderColor: p.border }, p.shadow ? ({ boxShadow: p.shadow } as ViewStyle) : null, style]}>
        {children}
      </View>
    )
  }

  const p = s.container
  const { outer, inner } = splitStyle(style)

  if (skin === 'pop') {
    // A chunky slab: the face sits on a solid side (the ledge) with the same ink edge, and a flat floor under it.
    const ledge = elevation === 'floating' ? (p.ledge ?? 9) : Math.round((p.ledge ?? 9) * 0.6)
    const floor = 4
    return (
      <View {...rest} style={[{ paddingBottom: ledge + floor }, outer]}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ledge, bottom: floor, borderRadius: r, backgroundColor: p.side, borderWidth: p.borderWidth, borderColor: p.border, boxShadow: `0 ${floor}px 0 0 ${p.floor}` } as ViewStyle} />
        <View style={[{ borderRadius: r, backgroundColor: p.fill, borderWidth: p.borderWidth, borderColor: p.border }, inner]}>{children}</View>
      </View>
    )
  }

  if (skin === 'metal') {
    // Quiet: a plain body with a fine brushed hairline round it. The liquid metal is kept for the primary key.
    return (
      <View {...rest} style={[{ borderRadius: r, backgroundColor: p.fill }, p.shadow ? ({ boxShadow: p.shadow } as ViewStyle) : null, style]}>
        <BrushedStroke radius={r} stops={s.metal.stroke} width={1} />
        {children}
      </View>
    )
  }

  if (skin === 'shine') {
    // A satin body lit from the top left, a lit edge that fades round, and a broad gleam parked across the
    // panel that sweeps through every few seconds.
    return (
      <View {...rest} style={[{ borderRadius: r, backgroundColor: p.fill }, p.shadow ? ({ boxShadow: p.shadow } as ViewStyle) : null, outer]}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, overflow: 'hidden' }]}>
          <FaceGradient radius={r} stops={dark ? ['#202025', '#141417', '#0E0E10'] : ['#FFFFFF', '#F5F5F7', '#ECECEF']} />
          <Sweep color={dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,1)'} period={7000} duration={1600} width={0.38} />
        </View>
        <BrushedStroke radius={r} width={1} stops={dark ? ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.35)'] : ['rgba(9,9,11,0.38)', 'rgba(9,9,11,0.1)', 'rgba(9,9,11,0.08)', 'rgba(9,9,11,0.26)']} />
        <View style={[{ borderRadius: r }, inner]}>{children}</View>
      </View>
    )
  }

  if (skin === 'candy') {
    return (
      <View {...rest} style={[{ borderRadius: r, backgroundColor: p.fill, borderWidth: p.borderWidth, borderColor: p.border }, p.shadow ? ({ boxShadow: p.shadow } as ViewStyle) : null, style]}>
        <PanelGloss radius={Math.max(0, r - p.borderWidth)} tint={s.tint} dark={dark} />
        {children}
      </View>
    )
  }

  // minimal (a hairline only) and bevel (a calm panel: a soft top light, a hairline, a drop; the keys carry the 3D).
  return (
    <View {...rest} style={[{ borderRadius: r, backgroundColor: p.fill, borderWidth: p.borderWidth, borderColor: p.border }, p.shadow ? ({ boxShadow: p.shadow } as ViewStyle) : null, style]}>
      {children}
    </View>
  )
}

function MaterialSurface({ kind, t, r, elevation, interactive, style, rest, children }: { kind: Resolved; t: Theme; r: number; elevation: NonNullable<SurfaceProps['elevation']>; interactive?: boolean; style?: StyleProp<ViewStyle>; rest: Omit<ViewProps, 'style'>; children?: ReactNode }) {
  const dark = t.scheme === 'dark'
  const shadow = edge(t, kind, elevation)
  const base: ViewStyle = { borderRadius: r, ...(shadow ? ({ boxShadow: shadow } as ViewStyle) : null) }

  if (kind === 'liquid') {
    return (
      <GlassView {...rest} glassEffectStyle="regular" colorScheme={t.scheme} isInteractive={interactive} style={[base, style]}>
        {children}
      </GlassView>
    )
  }

  if (kind === 'tonal') {
    const bg = elevation === 'inset' ? t.colors.muted : elevation === 'floating' ? t.colors.tonalHigh : t.colors.tonal
    return (
      <View {...rest} style={[base, { backgroundColor: bg, elevation: elevation === 'floating' ? 3 : 0 }, style]}>
        {children}
      </View>
    )
  }

  if (kind === 'glass') {
    const fill = t.colors.glassFill
    if (elevation === 'inset') {
      return (
        <View {...rest} style={[base, { backgroundColor: fill }, style]}>
          {children}
        </View>
      )
    }
    // The shadow lives on the outer view; the blur is a layer clipped to the corners.
    return (
      <View {...rest} style={[base, style]}>
        <Frost radius={r} dark={dark} fill={fill} blur={24} />
        {children}
      </View>
    )
  }

  const bg = elevation === 'inset' ? t.colors.muted : elevation === 'floating' ? (dark ? t.colors.elevated : t.colors.surface) : t.colors.surface
  return (
    <View {...rest} style={[base, { backgroundColor: bg }, style]}>
      {children}
    </View>
  )
}

/* ---------------------------------------------------------------------------------------------- */
/* Skin painters, shared by Surface, Button, Chip, Field and the AI components                     */
/* ---------------------------------------------------------------------------------------------- */

/**
 * On web a text field is not positioned, so an absolutely placed layer (a blur, a wash) paints over its text.
 * Containers that hold one `isolate` (a stacking context of their own) and put such layers `under` their content.
 */
const isolate = (Platform.OS === 'web' ? { isolation: 'isolate' } : null) as ViewStyle | null
const under = (Platform.OS === 'web' ? { zIndex: -1 } : null) as ViewStyle | null

/** The web backdrop blur for glass parts that paint their own fill (what expo-blur's BlurView does on web). */
export const frost = { backdropFilter: 'blur(28px) saturate(1.7)', WebkitBackdropFilter: 'blur(28px) saturate(1.7)' } as unknown as ViewStyle

/**
 * Real frosting behind a glass part, clipped to its corners, with the translucent fill over it: expo-blur's
 * BlurView on iOS and Android, the same backdrop filter on web (with our own fill and a saturation lift, so the
 * colours behind come through richer, as Apple's materials do). Place it first inside the part.
 */
export function Frost({ radius, dark, fill, blur = 28 }: { radius: number; dark: boolean; fill: string; blur?: number }) {
  if (Platform.OS === 'web') {
    const f = `blur(${blur}px) saturate(1.7)`
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: fill, backdropFilter: f, WebkitBackdropFilter: f } as ViewStyle]} />
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <BlurView intensity={Math.min(100, blur * 2.2)} tint={dark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
    </View>
  )
}

/**
 * The lit edge of a glass part: a 1px rim bright along the top, faint down the sides and a little brighter again
 * along the bottom (light passing through the slab), and a specular wash that fades down from the top edge.
 */
export function GlassEdgeLayer({ radius: radiusIn, edge }: { radius: number; edge: GlassEdge }) {
  return (
    <Layer>
      {(w, h, id) => {
        const radius = Math.min(radiusIn, w / 2, h / 2)
        const ri = Math.max(0, radius - 0.5)
        // The wash covers a fixed depth (not a share of the height), so tall panels and short keys catch the same light.
        const depth = Math.min(h, Math.max(18, Math.min(64, h * 0.5)))
        return (
          <>
            <Defs>
              <LinearGradient id={`gs-${id}`} x1="0" y1="0" x2="0" y2={depth / h}>
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={edge.sheen} />
                <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={edge.sheen * 0.3} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id={`gr-${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={edge.rimTop} />
                <Stop offset={Math.min(0.45, 22 / h)} stopColor={edge.rimSide} />
                <Stop offset={Math.max(0.55, 1 - 22 / h)} stopColor={edge.rimSide} />
                <Stop offset="1" stopColor={edge.rimBottom} />
              </LinearGradient>
            </Defs>
            {edge.sheen > 0 ? <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill={`url(#gs-${id})`} /> : null}
            <Rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={ri} ry={ri} fill="none" stroke={`url(#gr-${id})`} strokeWidth={1} />
          </>
        )
      }}
    </Layer>
  )
}

/**
 * A glass control (a key, a tile, a row, a well): a lighter glass with its own lit rim and wash. `blur` frosts
 * what is behind it as well (keys that may sit straight on the app); rows and tiles on a panel leave it off.
 */
export function GlassFace({ radius, fill, edge, shadow, blur = 0, dark }: { radius: number; fill: string; edge: GlassEdge; shadow?: string; blur?: number; dark: boolean }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius }, shadow ? ({ boxShadow: shadow } as ViewStyle) : null]}>
      {blur ? <Frost radius={radius} dark={dark} fill={fill} blur={blur} /> : <View style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: fill }]} />}
      <GlassEdgeLayer radius={radius} edge={edge} />
    </View>
  )
}

/**
 * A lit key's body (`bevel`): a vertical gradient (lighter top, deeper bottom), a faint light from the top left,
 * a 1px edge a step lighter than the body, a bright 1px line inside the top edge and a darker one inside the lip.
 * Fills its parent; put the drop shadow (`stops.drop`) on the parent.
 */
export function BevelFill({ stops, radius: radiusIn }: { stops: BevelStops; radius: number }) {
  return (
    <Layer>
      {(w, h, id) => {
        const radius = Math.min(radiusIn, w / 2, h / 2)
        const r1 = Math.max(0, radius - 0.5)
        const r2 = Math.max(0, radius - 1.5)
        return (
          <>
            <Defs>
              <LinearGradient id={`bb-${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stops.top} />
                <Stop offset="1" stopColor={stops.bottom} />
              </LinearGradient>
              <RadialGradient id={`bl-${id}`} cx="22%" cy="0%" rx="70%" ry="110%" fx="22%" fy="0%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.12} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
              <LinearGradient id={`be-${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stops.highlight} />
                <Stop offset={Math.min(0.4, 8 / h)} stopColor={stops.highlight} stopOpacity={0} />
                <Stop offset={Math.max(0.6, 1 - 6 / h)} stopColor={stops.lowlight} stopOpacity={0} />
                <Stop offset="1" stopColor={stops.lowlight} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill={`url(#bb-${id})`} />
            <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill={`url(#bl-${id})`} />
            <Rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={r2} ry={r2} fill="none" stroke={`url(#be-${id})`} strokeWidth={1} />
            <Rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={r1} ry={r1} fill="none" stroke={stops.border} strokeWidth={1} />
          </>
        )
      }}
    </Layer>
  )
}

/** An absolutely placed SVG that knows its own size. */
function Layer({ children, style }: { children: (w: number, h: number, id: string) => ReactNode; style?: StyleProp<ViewStyle> }) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) setSize({ w: width, h: height })
  }
  return (
    <View pointerEvents="none" onLayout={onLayout} style={[StyleSheet.absoluteFill, style]}>
      {size.w > 0 ? (
        <Svg width={size.w} height={size.h}>
          {children(size.w, size.h, id)}
        </Svg>
      ) : null}
    </View>
  )
}

/**
 * The candy key's body: a top-to-bottom fill, light bouncing up from the lower lip, a white gloss over the
 * top half, a 1px shine line that fades at both ends, and a 1px border a step lighter than the body.
 */
export function CandyFill({ stops, radius: radiusIn, border = 1 }: { stops: CandyStops; radius: number; border?: number }) {
  return (
    <Layer>
      {(w, h, id) => {
        // A pill passes a huge radius; SVG would clamp rx and ry separately into an ellipse, so clamp to the box.
        const radius = Math.min(radiusIn, w / 2, h / 2)
        const inset = border + 1
        const gr = Math.max(0, radius - inset)
        return (
          <>
            <Defs>
              <LinearGradient id={`cb-${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stops.top} />
                <Stop offset="1" stopColor={stops.bottom} />
              </LinearGradient>
              <RadialGradient id={`cf-${id}`} cx="50%" cy="100%" rx="62%" ry="75%" fx="50%" fy="100%">
                <Stop offset="0" stopColor={stops.bounce} stopOpacity={0.85} />
                <Stop offset="1" stopColor={stops.bounce} stopOpacity={0} />
              </RadialGradient>
              <LinearGradient id={`cg-${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={stops.gloss} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={stops.gloss * 0.15} />
              </LinearGradient>
              <LinearGradient id={`cs-${id}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={stops.shine} stopOpacity={0} />
                <Stop offset="0.5" stopColor={stops.shine} stopOpacity={1} />
                <Stop offset="1" stopColor={stops.shine} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill={`url(#cb-${id})`} />
            <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill={`url(#cf-${id})`} />
            {stops.gloss > 0 ? <Rect x={inset} y={inset} width={w - inset * 2} height={h * 0.48} rx={gr} ry={gr} fill={`url(#cg-${id})`} /> : null}
            <Line x1={radius * 0.8} y1={border + 1.5} x2={w - radius * 0.8} y2={border + 1.5} stroke={`url(#cs-${id})`} strokeWidth={1} />
            <Rect x={border / 2} y={border / 2} width={w - border} height={h - border} rx={Math.max(0, radius - border / 2)} ry={Math.max(0, radius - border / 2)} fill="none" stroke={stops.border} strokeWidth={border} />
          </>
        )
      }}
    </Layer>
  )
}

/** A candy panel's gloss: the tint glowing up from the bottom and a shine line along the top. */
function PanelGloss({ radius, tint, dark }: { radius: number; tint: string; dark: boolean }) {
  return (
    <Layer style={{ borderRadius: radius, overflow: 'hidden' }}>
      {(w, h, id) => (
        <>
          <Defs>
            <RadialGradient id={`pg-${id}`} cx="50%" cy="100%" rx="85%" ry="80%" fx="50%" fy="100%">
              <Stop offset="0" stopColor={tint} stopOpacity={dark ? 0.26 : 0.12} />
              <Stop offset="1" stopColor={tint} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={`pt-${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={dark ? 0.07 : 0.9} />
              <Stop offset="0.3" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id={`ps-${id}`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={dark ? 0.55 : 1} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} fill={`url(#pg-${id})`} />
          <Rect x={0} y={0} width={w} height={h} fill={`url(#pt-${id})`} />
          <Line x1={radius} y1={1.5} x2={w - radius} y2={1.5} stroke={`url(#ps-${id})`} strokeWidth={1} />
        </>
      )}
    </Layer>
  )
}

/** A brushed-metal edge: a still four-stop gradient stroke, for metal parts that do not carry the shader. */
export function BrushedStroke({ radius, stops, width = 1 }: { radius: number; stops: readonly [string, string, string, string]; width?: number }) {
  return (
    <Layer>
      {(w, h, id) => (
        <>
          <Defs>
            <LinearGradient id={`bs-${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={stops[0]} />
              <Stop offset="0.35" stopColor={stops[1]} />
              <Stop offset="0.65" stopColor={stops[2]} />
              <Stop offset="1" stopColor={stops[3]} />
            </LinearGradient>
          </Defs>
          <Rect x={width / 2} y={width / 2} width={w - width} height={h - width} rx={Math.max(0, radius - width / 2)} ry={Math.max(0, radius - width / 2)} fill="none" stroke={`url(#bs-${id})`} strokeWidth={width} />
        </>
      )}
    </Layer>
  )
}

/** A vertical gradient face (chrome, a plate, a panel body) filling its parent. Stops are spread evenly, top to bottom. */
export function FaceGradient({ stops, radius }: { stops: readonly string[]; radius: number }) {
  return (
    <Layer>
      {(w, h, id) => (
        <>
          <Defs>
            <LinearGradient id={`fg-${id}`} x1="0" y1="0" x2="0" y2="1">
              {stops.map((c, i) => (
                <Stop key={i} offset={stops.length > 1 ? i / (stops.length - 1) : 0} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          {/* Clamped to the box, so a pill's huge radius stays round instead of turning into an ellipse. */}
          <Rect x={0} y={0} width={w} height={h} rx={Math.min(radius, w / 2, h / 2)} ry={Math.min(radius, w / 2, h / 2)} fill={`url(#fg-${id})`} />
        </>
      )}
    </Layer>
  )
}

/**
 * A quiet metal plate: a face (a colour or gradient stops) with a fine brushed hairline round it. Passed the
 * chrome face (`skin.metal.face`), it is the primary key's paint and draws `LiquidChrome` instead.
 * `spin` is kept for older callers and no longer turns anything.
 */
export function ChromeRim({ children, radius, width = 1, skin, face, contentStyle, style }: { children?: ReactNode; radius: number; width?: number; skin: SkinTokens; face: string | readonly string[]; spin?: boolean; contentStyle?: StyleProp<ViewStyle>; style?: StyleProp<ViewStyle> }) {
  if (face === skin.metal.face)
    return (
      <LiquidChrome radius={radius} width={Math.max(2, width)} skin={skin} contentStyle={contentStyle} style={style}>
        {children}
      </LiquidChrome>
    )
  return (
    <View style={[{ borderRadius: radius, backgroundColor: typeof face === 'string' ? face : face[face.length - 1] }, style]}>
      {typeof face === 'string' ? null : <FaceGradient stops={face} radius={radius} />}
      <BrushedStroke radius={radius} stops={skin.metal.stroke} width={1} />
      <View style={contentStyle}>{children}</View>
    </View>
  )
}

/**
 * The liquid-metal key, drawn with react-native-svg and reanimated (no Skia): a rim of polished chrome whose
 * bands, with thin chromatic fringes, flow round the key. Two sets of bands drift in opposite directions at
 * different speeds, so the reflections merge and part like liquid rather than turning as one ring. A soft
 * light drifts across the face and the key glows faintly in the preset's two colours. With motion off the
 * bands hold at a fixed angle and the light rests at the top left.
 */
export function LiquidChrome({ children, radius, width = 2.5, skin, contentStyle, style }: { children?: ReactNode; radius: number; width?: number; skin: SkinTokens; contentStyle?: StyleProp<ViewStyle>; style?: StyleProp<ViewStyle> }) {
  const motion = useMotion()
  const [size, setSize] = useState({ w: 0, h: 0 })
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const a = useSharedValue(0)
  const b = useSharedValue(0)
  const g = useSharedValue(0.3)
  useEffect(() => {
    cancelAnimation(a)
    cancelAnimation(b)
    cancelAnimation(g)
    a.value = 0
    b.value = 0
    g.value = 0.3
    if (motion.enabled) {
      a.value = withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1, false)
      b.value = withRepeat(withTiming(-360, { duration: 15000, easing: Easing.linear }), -1, false)
      g.value = withRepeat(withSequence(withTiming(0.85, { duration: 3800, easing: Easing.inOut(Easing.sin) }), withTiming(0.15, { duration: 3800, easing: Easing.inOut(Easing.sin) })), -1, false)
    }
    return () => {
      cancelAnimation(a)
      cancelAnimation(b)
      cancelAnimation(g)
    }
  }, [motion.enabled, a, b, g])
  const turnA = useAnimatedStyle(() => ({ transform: [{ rotate: `${28 + a.value}deg` }] }), [a])
  const turnB = useAnimatedStyle(() => ({ transform: [{ rotate: `${-62 + b.value}deg` }] }), [b])
  const drift = useAnimatedStyle(() => ({ transform: [{ translateX: (g.value - 0.5) * size.w * 0.9 }] }), [g, size.w])
  const lq = skin.metal.liquid
  const d = Math.ceil(Math.hypot(size.w, size.h)) + 4
  const inner = Math.max(0, radius - width)
  const lightFace = luminance(lq.face[1]) > 0.6
  const bands = (stops: readonly string[], key: string) => (
    <Svg width={d} height={d}>
      <Defs>
        <LinearGradient id={`${key}-${id}`} x1="0" y1="0" x2="1" y2="0">
          {stops.map((c, i) => (
            <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={d} height={d} fill={`url(#${key}-${id})`} />
    </Svg>
  )
  const box: ViewStyle = { position: 'absolute', left: (size.w - d) / 2, top: (size.h - d) / 2, width: d, height: d }
  return (
    <View style={[{ borderRadius: radius, boxShadow: `-5px -3px 14px -7px ${lq.glow[0]}, 5px 4px 14px -7px ${lq.glow[1]}` } as ViewStyle, style]}>
      <View
        style={{ flexGrow: 1, borderRadius: radius, overflow: 'hidden', backgroundColor: lq.ring[2] }}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout
          if (Math.abs(w - size.w) > 0.5 || Math.abs(h - size.h) > 0.5) setSize({ w, h })
        }}
      >
        {size.w > 0 ? (
          <>
            <Animated.View pointerEvents="none" style={[box, turnA]}>
              {bands(lq.ring, 'lr')}
            </Animated.View>
            <Animated.View pointerEvents="none" style={[box, { opacity: 0.38 }, turnB]}>
              {bands(lq.flow, 'lf')}
            </Animated.View>
          </>
        ) : null}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: width, borderRadius: inner, overflow: 'hidden', backgroundColor: lq.face[1] }]}>
          <FaceGradient stops={lq.face} radius={inner} />
          {/* The light that follows the key round: a soft spot drifting along the top of the face. */}
          {size.w > 0 ? (
            <Animated.View style={[{ position: 'absolute', top: -size.h * 0.6, left: size.w * 0.05, width: size.w * 0.5, height: size.h * 1.3 }, drift]}>
              <Layer>
                {(w, h, lid) => (
                  <>
                    <Defs>
                      <RadialGradient id={`ll-${lid}`} cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0" stopColor={lightFace ? '#B9C6E0' : '#FFFFFF'} stopOpacity={lightFace ? 0.28 : 0.2} />
                        <Stop offset="1" stopColor={lightFace ? '#B9C6E0' : '#FFFFFF'} stopOpacity={0} />
                      </RadialGradient>
                    </Defs>
                    <Rect x={0} y={0} width={w} height={h} fill={`url(#ll-${lid})`} />
                  </>
                )}
              </Layer>
            </Animated.View>
          ) : null}
          {/* A hairline of light just inside the rim, like the lip of the metal catching the light. */}
          <View style={[StyleSheet.absoluteFill, { borderRadius: inner, borderWidth: 1, borderColor: lightFace ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.12)' }]} />
        </View>
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  )
}

/**
 * The shine rim: a short glint that travels round the edge (one lap every `skin.shine.lap` seconds).
 * Still frame: the glint rests at the top right corner.
 */
export function ShineRim({ children, radius, skin, fill, width = 1, contentStyle, borderColor }: { children?: ReactNode; radius: number; skin: SkinTokens; fill: string; width?: number; contentStyle?: StyleProp<ViewStyle>; borderColor?: string }) {
  const t = useTheme()
  // Light on dark fills (and on any colour), ink on light ones: the glint always reads against its own body.
  const light = /^#[0-9a-f]{6}$/i.test(fill) ? luminance(fill) < 0.6 : skin.dark
  const g = light ? { a: '#FFFFFF', b: '#FFFFFF', c: '#ADADB5' } : { a: '#52525B', b: '#71717A', c: '#D4D4D8' }
  return (
    <IonBorder active variant="beam" halo={false} hotHead={light} tail={120} speed={skin.shine.lap} radius={radius} width={width} fill={fill} borderColor={borderColor ?? t.colors.hairlineStrong} colors={g} contentStyle={contentStyle}>
      {children}
    </IonBorder>
  )
}

/**
 * A soft band of light across its parent (place it inside a clipped box). It rests a little left of the
 * middle, so a still frame always shows it, and every `period` ms it sweeps off to the right and back in
 * from the left. With motion off it stays at rest.
 */
export function Sweep({ color, period = 3600, duration = 1100, width = 0.45 }: { color: string; period?: number; duration?: number; width?: number }) {
  const motion = useMotion()
  const [w, setW] = useState(0)
  const rest = 0.42
  const p = useSharedValue(rest)
  useEffect(() => {
    cancelAnimation(p)
    p.value = rest
    if (!motion.enabled || w === 0) return
    const ease = Easing.bezier(0.45, 0, 0.25, 1)
    p.value = withRepeat(
      withSequence(withDelay(period, withTiming(1, { duration: duration * 0.55, easing: ease })), withTiming(0, { duration: 0 }), withTiming(rest, { duration: duration * 0.45, easing: Easing.bezier(0.23, 1, 0.32, 1) })),
      -1,
      false,
    )
    return () => cancelAnimation(p)
  }, [motion.enabled, w, p, period, duration])
  const band = Math.max(28, w * width)
  // A slanted band: a horizontal fade, sheared, so it never shows a hard edge on tall or wide parts.
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: -band + p.value * (w + band) }, { skewX: '-20deg' }] }), [p, w, band])
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <View pointerEvents="none" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={StyleSheet.absoluteFill}>
      {w > 0 ? (
        <Animated.View style={[{ position: 'absolute', top: -2, bottom: -2, left: 0, width: band }, move]}>
          <Svg width={band} height="100%">
            <Defs>
              <LinearGradient id={`sw-${id}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={color} stopOpacity={0} />
                <Stop offset="0.5" stopColor={color} stopOpacity={1} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={band} height="100%" fill={`url(#sw-${id})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  )
}

/** True when the skin draws icon tiles and input wells (the expressive looks). */
export const skinHasWells = (skin: SkinTokens['skin']) => skin === 'pop' || skin === 'candy' || skin === 'metal' || skin === 'glass' || skin === 'bevel'

/**
 * A small tile behind a row icon, in the skin: a keycap with a side for `pop`, a glossy sweet in the tint
 * for `candy`, a quiet well with a brushed hairline for `metal`, lighter glass for `glass`, a lit key for `bevel`.
 * `clean`, `minimal` and `shine` keep the icon bare. Draw the icon in `skin.tile.ink`.
 */
export function SkinTile({ children, size = 28, skin: skinProp }: { children?: ReactNode; size?: number; skin?: SkinInput }) {
  const s = useSkin(skinProp)
  const r = Math.round(size * 0.32)
  const box: ViewStyle = { width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' }
  switch (s.skin) {
    case 'pop': {
      const p = s.secondary
      const side = 3
      return (
        <View style={{ width: size, height: size + side }}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: side, bottom: 0, borderRadius: r, backgroundColor: p.side, borderWidth: 1.5, borderColor: p.border }} />
          <View style={[box, { backgroundColor: s.tile.fill, borderWidth: 1.5, borderColor: p.border }]}>{children}</View>
        </View>
      )
    }
    case 'candy':
      return (
        <View style={[box, { boxShadow: `0 3px 8px -2px ${s.tile.candy?.glow ?? 'transparent'}` } as ViewStyle]}>
          <CandyFill stops={s.tile.candy!} radius={r} />
          {/* Wrapped so the icon paints above the absolutely placed fill on web. */}
          <View>{children}</View>
        </View>
      )
    case 'metal':
      return (
        <View style={[box, { backgroundColor: s.tile.fill }]}>
          <BrushedStroke radius={r} stops={s.metal.stroke} width={1} />
          <View>{children}</View>
        </View>
      )
    case 'glass':
      return (
        <View style={box}>
          {s.glass ? <GlassFace radius={r} fill={s.tile.fill} edge={s.glass.control} shadow={s.secondary.shadow} dark={s.dark} /> : null}
          <View>{children}</View>
        </View>
      )
    case 'bevel':
      return (
        <View style={[box, { boxShadow: s.tile.bevel?.drop } as ViewStyle]}>
          <BevelFill stops={s.tile.bevel!} radius={r} />
          <View>{children}</View>
        </View>
      )
    default:
      return <View style={box}>{children}</View>
  }
}

/**
 * The background of a hovered or pressed row, in the skin: a keycap with a side for `pop`, a glossy pill
 * for `candy`, a quiet well for `metal`, lighter glass for `glass`, a lit sheen for `shine`, a lit key for
 * `bevel`, a quiet fill otherwise.
 * Place it first inside the row; it fills the row absolutely.
 */
export function SkinRowFace({ radius, skin: skinProp }: { radius: number; skin?: SkinInput }) {
  const s = useSkin(skinProp)
  const fill: ViewStyle = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius }
  switch (s.skin) {
    case 'pop': {
      const p = s.secondary
      return <View pointerEvents="none" style={[fill, { backgroundColor: p.fill, borderWidth: 2, borderColor: p.border, boxShadow: `0 3px 0 0 ${p.side}, 0 3px 0 2px ${p.border}` } as ViewStyle]} />
    }
    case 'candy':
      return (
        <View pointerEvents="none" style={[fill, { boxShadow: s.secondary.shadow } as ViewStyle]}>
          <CandyFill stops={s.secondary.candy!} radius={radius} />
        </View>
      )
    case 'metal':
      return (
        <View pointerEvents="none" style={[fill, { backgroundColor: s.rowHover }]}>
          <BrushedStroke radius={radius} stops={s.metal.stroke} width={1} />
        </View>
      )
    case 'glass':
      return s.glass ? <GlassFace radius={radius} fill={s.rowHover} edge={s.glass.control} dark={s.dark} /> : <View pointerEvents="none" style={[fill, { backgroundColor: s.rowHover }]} />
    case 'bevel':
      return (
        <View pointerEvents="none" style={[fill, { boxShadow: s.secondary.bevel?.drop } as ViewStyle]}>
          <BevelFill stops={s.secondary.bevel!} radius={radius} />
        </View>
      )
    case 'shine':
      return (
        <View pointerEvents="none" style={[fill, { backgroundColor: s.rowHover, overflow: 'hidden' }]}>
          <Sweep color={s.dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)'} period={4200} />
        </View>
      )
    default:
      return <View pointerEvents="none" style={[fill, { backgroundColor: s.rowHover }]} />
  }
}

/**
 * The well an input sits in, in the skin: a pressed-in field with an ink edge for `pop`, a soft glossy
 * well for `candy`, a field with a brushed hairline for `metal`, lighter glass for `glass`, a recessed field
 * for `bevel`. Other skins return a plain view (the input sits on the panel).
 */
export function SkinWell({ children, radius, style, skin: skinProp }: { children?: ReactNode; radius?: number; style?: StyleProp<ViewStyle>; skin?: SkinInput }) {
  const s = useSkin(skinProp)
  const r = radius ?? s.radius.control
  const f = s.field
  if (!skinHasWells(s.skin)) return <View style={style}>{children}</View>
  if (s.skin === 'metal')
    return (
      <View style={[{ borderRadius: r, backgroundColor: f.fill }, style]}>
        <BrushedStroke radius={r} stops={s.metal.stroke} width={1} />
        {children}
      </View>
    )
  if (s.skin === 'glass' && s.glass)
    return (
      <View style={[{ borderRadius: r, backgroundColor: f.fill }, isolate, f.shadow ? ({ boxShadow: f.shadow } as ViewStyle) : null, style]}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, under]}>
          <GlassEdgeLayer radius={r} edge={{ ...s.glass.control, sheen: s.glass.control.sheen * 0.5 }} />
        </View>
        {children}
      </View>
    )
  return (
    <View style={[{ borderRadius: r, backgroundColor: f.fill, borderWidth: f.borderWidth, borderColor: f.border }, f.shadow ? ({ boxShadow: f.shadow } as ViewStyle) : null, style]}>
      {children}
    </View>
  )
}

export default Surface
