import type { ComponentType, ReactElement } from 'react'
import type { Availability } from '@ondai/core'
import type { ScriptSource } from '@ondai/core/mock'
import { defaultValues, type ControlValues, type Controls } from './controls'

export interface PlaygroundState {
  /** Mock provider script driving the model for this state. */
  script?: ScriptSource
  /** Override availability (unavailable / preparing states). */
  availability?: Availability
  /** Extra props merged over control values. */
  props?: Record<string, unknown>
  /** Ms into the script at which `/review` and visual tests freeze the state (manual clock). */
  freezeAt?: number
  /** Short human description shown under the state in the playground. */
  description?: string
  /** Imperative setup after mount (e.g. type a query), via the host's actions. */
  setup?: (actions: PlaygroundActions) => void | Promise<void>
}

export interface PlaygroundActions {
  /** Trigger the component's primary action (e.g. submit the input) when wired. */
  run?: () => void
  /** Focus the main input when wired. */
  focus?: () => void
}

export interface PlaygroundFrame {
  width: number
  height?: number
  padding: number
  background: 'bg' | 'surface' | 'transparent'
  /** Center the component vertically (default true). */
  center?: boolean
}

export interface PlaygroundDef<CS extends Controls = Controls, P = any> {
  name: string
  title: string
  category: 'primitive' | 'agentic' | 'input' | 'text' | 'organize' | 'search' | 'vision' | 'voice' | 'feed'
  description: string
  component: ComponentType<P>
  controls: CS
  states: Record<string, PlaygroundState>
  defaultState: string
  /** State ids rendered on `/review` and in visual snapshots. */
  review: string[]
  frame: PlaygroundFrame
  /** Custom render when the component needs children/callbacks/sample data. */
  render?(props: ControlValues<CS> & Record<string, any>, ctx: PlaygroundRenderContext): ReactElement
  /** Code snippet generator shown as "live code" in the docs. */
  code?(props: ControlValues<CS>): string
  /** Which control keys are variants (shown as segmented pickers first). */
  variantKeys?: Array<keyof CS & string>
}

export interface PlaygroundRenderContext {
  state: string
  stateDef: PlaygroundState
  /** Registers imperative actions for the state setup. */
  bind: (actions: PlaygroundActions) => void
}

export type PlaygroundInput<CS extends Controls, P> = Omit<PlaygroundDef<CS, P>, 'defaultState' | 'review' | 'frame'> &
  Partial<Pick<PlaygroundDef<CS, P>, 'defaultState' | 'review' | 'frame'>>

const defaultFrame: PlaygroundFrame = { width: 390, padding: 16, background: 'bg', center: true }

export function definePlayground<CS extends Controls, P>(input: PlaygroundInput<CS, P>): PlaygroundDef<CS, P> {
  const stateIds = Object.keys(input.states)
  return {
    ...input,
    defaultState: input.defaultState ?? stateIds[0] ?? 'idle',
    review: input.review ?? stateIds,
    frame: { ...defaultFrame, ...input.frame },
  }
}

export function playgroundDefaults<CS extends Controls>(def: PlaygroundDef<CS>): ControlValues<CS> {
  return defaultValues(def.controls)
}

/** Default code generator: `<Title prop="value" />` with non-default props only. */
export function defaultCode<CS extends Controls>(def: PlaygroundDef<CS>, props: ControlValues<CS>): string {
  const pascal = def.title.replace(/\s+/g, '')
  const parts: string[] = []
  for (const [k, c] of Object.entries(def.controls)) {
    const v = (props as Record<string, unknown>)[k]
    if (v === c.default) continue
    if (typeof v === 'string') parts.push(`${k}="${v}"`)
    else if (typeof v === 'boolean') parts.push(v ? k : `${k}={false}`)
    else parts.push(`${k}={${JSON.stringify(v)}}`)
  }
  const attrs = parts.length ? `\n  ${parts.join('\n  ')}\n` : ' '
  return `<${pascal}${attrs}/>`
}
