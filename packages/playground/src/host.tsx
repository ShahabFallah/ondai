import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { glassBackdrop } from './backdrop'
import { createOndai, OndaiProvider } from '@ondai/core'
import { manualClock, mockAdapter, realClock, type ManualClock } from '@ondai/core/mock'
import { mix } from '@ondai/tokens'
import { useTheme } from '@ondai/tokens/react'
import type { Controls } from './controls'
import type { PlaygroundActions, PlaygroundDef } from './define'
import type { PlaygroundQuery } from './query'

export interface PlaygroundHostProps<CS extends Controls = Controls> {
  def: PlaygroundDef<CS>
  query: PlaygroundQuery<CS>
  /** Extra style on the frame (web pages set widths). */
  style?: StyleProp<ViewStyle>
  /** Fired after mount, and after a manual clock has been advanced to `query.t`. */
  onReady?: () => void
  /** Render without the frame chrome (padding/background). */
  bare?: boolean
}

/** Manual clocks already advanced (or advancing) to their state's instant. */
const advanced = new WeakMap<ManualClock, Promise<void>>()

/**
 * Mounts a component with its own Ondai instance backed by the state's mock script.
 * Remounts on every state change so scripts start from zero.
 */
export function PlaygroundHost<CS extends Controls>({ def, query, style, onReady, bare }: PlaygroundHostProps<CS>) {
  const state = def.states[query.state] ?? {}
  const clock = useMemo<ManualClock | typeof realClock>(
    () => (query.clock === 'manual' ? manualClock() : realClock),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.clock, query.state, query.t],
  )
  const ondai = useMemo(() => {
    const adapter = mockAdapter({
      script: state.script,
      availability: state.availability,
      clock,
      speed: query.tps / 40,
      simulate: query.device,
      simulated: true,
    })
    return createOndai({ providers: { [adapter.id]: adapter }, policy: { order: [adapter.id], prewarm: 'never' } })
     
  }, [state.script, state.availability, clock, query.tps, query.device])

  const actions = useRef<PlaygroundActions>({})
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    let alive = true
    const run = async () => {
      await state.setup?.(actions.current)
      if (query.clock === 'manual' && 'advance' in clock) {
        // Let effects fire, then advance the scripted clock to the requested instant. Once per clock: effects
        // run twice in development (StrictMode), and a second advance would land at twice `t`.
        let advancing = advanced.get(clock as ManualClock)
        if (!advancing) {
          advancing = (async () => {
            await new Promise((r) => setTimeout(r, 30))
            await (clock as ManualClock).advance(query.t)
            await new Promise((r) => setTimeout(r, 30))
          })()
          advanced.set(clock as ManualClock, advancing)
        }
        await advancing
      }
      if (alive) readyRef.current?.()
    }
    void run()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ondai])

  const props = { ...(query.props as Record<string, unknown>), ...(state.props ?? {}) }
  const content: ReactElement = def.render
    ? def.render(props as never, { state: query.state, stateDef: state, bind: (a) => Object.assign(actions.current, a) })
    :  
      <def.component {...(props as any)} />

  return (
    <OndaiProvider key={`${query.state}-${query.theme}-${query.material}-${query.accent}`} value={ondai} theme={query.theme} material={query.material} accent={query.accent} motion={query.motion}>
      {bare ? content : <Frame frame={def.frame} style={style} glass={props.variant === 'glass' || props.skin === 'glass'} tint={props.tint}>{content}</Frame>}
    </OndaiProvider>
  )
}

/** The playground's named tints (each playground maps the same names); any hex passes through. */
const namedTints: Record<string, string> = { strawberry: '#FF5A5F', blueberry: '#3B82F6', moss: '#3F7D4E', graphite: '#3F3F46' }
const hexOf = (v: unknown) => (typeof v === 'string' ? (/^#[0-9a-f]{6}$/i.test(v) ? v : namedTints[v]) : undefined)

function Frame({ frame, style, glass, tint, children }: { frame: PlaygroundDef['frame']; style?: StyleProp<ViewStyle>; glass?: boolean; tint?: unknown; children: ReactElement }) {
  const t = useTheme()
  const bg = frame.background === 'surface' ? t.colors.surface : frame.background === 'transparent' ? 'transparent' : t.colors.bg
  // A colour for the backdrop's shapes: the tint, else a coloured accent. Mono keeps the shapes in ink.
  const colour = hexOf(tint) ?? (t.accentName !== 'mono' ? t.colors.accent.solid : undefined)
  return (
    <View
      testID="playground-frame"
      style={[
        { width: frame.width, maxWidth: '100%', minHeight: frame.height, padding: frame.padding, backgroundColor: bg, justifyContent: frame.center === false ? 'flex-start' : 'center' },
        style,
      ]}
    >
      {/* Glass needs something behind it, standing in for the app's own content (glass material or a glass variant). */}
      {(t.glass || glass) && frame.background !== 'transparent' ? <GlassBackdrop dark={t.scheme === 'dark'} colour={colour} /> : null}
      {children}
    </View>
  )
}

/**
 * What glass blurs in the playground: a grainy monochrome field with window light falling across it in soft
 * slats, and three large blurred shapes. In mono the shapes are ink (paper) or light (void); with a tint or a
 * coloured accent the two big ones take the colour and a warmer neighbour of it.
 */
function GlassBackdrop({ dark, colour }: { dark: boolean; colour?: string }) {
  const b = glassBackdrop
  const fill = StyleSheet.absoluteFill
  const shapes: Array<{ ink: string; opacity: number }> = colour
    ? dark
      ? [{ ink: colour, opacity: 0.62 }, { ink: mix(colour, '#FFD3A8', 0.5), opacity: 0.4 }, { ink: '#FFFFFF', opacity: 0.16 }]
      : [{ ink: colour, opacity: 0.78 }, { ink: mix(colour, '#FFD3A8', 0.55), opacity: 0.7 }, { ink: '#18181B', opacity: 0.3 }]
    : dark
      ? [{ ink: '#D4D4D8', opacity: 0.26 }, { ink: '#71717A', opacity: 0.38 }, { ink: '#FFFFFF', opacity: 0.18 }]
      : [{ ink: '#18181B', opacity: 0.62 }, { ink: '#71717A', opacity: 0.5 }, { ink: '#18181B', opacity: 0.38 }]
  return (
    <View pointerEvents="none" style={[fill, { overflow: 'hidden' }]}>
      <Image source={dark ? b.field.void : b.field.paper} resizeMode="cover" style={fill} />
      {b.shapes.map((src, i) => (
        <Image key={i} source={src} resizeMode="cover" style={[fill, { tintColor: shapes[i]!.ink, opacity: shapes[i]!.opacity }]} />
      ))}
      <Image source={b.grain} resizeMode="repeat" style={[fill, { opacity: dark ? 0.7 : 0.9 }]} />
    </View>
  )
}
export { backdropImage, glassBackdrop } from './backdrop'
