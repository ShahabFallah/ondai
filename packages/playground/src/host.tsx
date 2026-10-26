import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { createOndai, OndaiProvider } from '@ondai/core'
import { manualClock, mockAdapter, realClock, type ManualClock } from '@ondai/core/mock'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.script, state.availability, clock, query.tps, query.device])

  const actions = useRef<PlaygroundActions>({})
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    let alive = true
    const run = async () => {
      await state.setup?.(actions.current)
      if (query.clock === 'manual' && 'advance' in clock) {
        // Let effects fire, then advance the scripted clock to the requested instant.
        await new Promise((r) => setTimeout(r, 30))
        await (clock as ManualClock).advance(query.t)
        await new Promise((r) => setTimeout(r, 30))
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
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <def.component {...(props as any)} />

  return (
    <OndaiProvider key={`${query.state}-${query.theme}-${query.accent}`} value={ondai} theme={query.theme} accent={query.accent} motion={query.motion}>
      {bare ? content : <Frame frame={def.frame} style={style}>{content}</Frame>}
    </OndaiProvider>
  )
}

function Frame({ frame, style, children }: { frame: PlaygroundDef['frame']; style?: StyleProp<ViewStyle>; children: ReactElement }) {
  const t = useTheme()
  const bg = frame.background === 'surface' ? t.colors.surface : frame.background === 'transparent' ? 'transparent' : t.colors.bg
  return (
    <View
      testID="playground-frame"
      style={[
        { width: frame.width, minHeight: frame.height, padding: frame.padding, backgroundColor: bg, justifyContent: frame.center === false ? 'flex-start' : 'center' },
        style,
      ]}
    >
      {children}
    </View>
  )
}
