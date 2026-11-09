import { coerceValue, serializeValue, type ControlValues, type Controls } from './controls'
import type { PlaygroundDef } from './define'

export type PlaygroundTheme = 'void' | 'paper' | 'glass'
export type PlaygroundMaterial = 'solid' | 'glass' | 'native'
export type PlaygroundAccent = 'ion' | 'mono' | 'aurora' | 'ember'
export type PlaygroundDevice = 'apple' | 'nano' | 'llama' | 'unavailable'

export interface PlaygroundQuery<CS extends Controls = Controls> {
  props: ControlValues<CS>
  state: string
  theme: PlaygroundTheme
  /** Container material: solid cards, blurred glass, or the platform's own (glass on web). */
  material: PlaygroundMaterial
  accent: PlaygroundAccent
  /** `off` freezes animation (review + visual tests). */
  motion: 'system' | 'off'
  /** `manual` uses a manual clock advanced to `t`. */
  clock: 'real' | 'manual'
  t: number
  /** Mock streaming speed, tokens/second. */
  tps: number
  /** Simulated provider shown in the OnDeviceBadge. */
  device: PlaygroundDevice
  /** Hide the controls panel (docs embeds, screenshots). */
  embed: boolean
  /** Phone frame around the preview. */
  frame: 'iphone' | 'android' | 'none'
}

export const reservedKeys = ['state', 'theme', 'material', 'accent', 'motion', 'clock', 't', 'tps', 'device', 'embed', 'frame'] as const

export const queryDefaults: Omit<PlaygroundQuery, 'props' | 'state'> = {
  theme: 'void',
  material: 'solid',
  accent: 'ion',
  motion: 'system',
  clock: 'real',
  t: 0,
  tps: 40,
  device: 'apple',
  embed: false,
  frame: 'none',
}

type ParamsLike = { get(key: string): string | null }

const pick = <T extends string>(raw: string | null | undefined, allowed: readonly T[], def: T): T =>
  raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : def

export function decodeQuery<CS extends Controls>(def: PlaygroundDef<CS>, params: ParamsLike): PlaygroundQuery<CS> {
  const props: Record<string, unknown> = {}
  for (const [k, c] of Object.entries(def.controls)) props[k] = coerceValue(c, params.get(k) ?? undefined)
  const stateRaw = params.get('state')
  const state = stateRaw && def.states[stateRaw] ? stateRaw : def.defaultState
  const t = Number(params.get('t'))
  const tps = Number(params.get('tps'))
  return {
    props: props as ControlValues<CS>,
    state,
    theme: pick(params.get('theme'), ['void', 'paper', 'glass'], queryDefaults.theme),
    material: pick(params.get('material'), ['solid', 'glass', 'native'], params.get('theme') === 'glass' ? 'glass' : queryDefaults.material),
    accent: pick(params.get('accent'), ['ion', 'mono', 'aurora', 'ember'], queryDefaults.accent),
    motion: pick(params.get('motion'), ['system', 'off'], queryDefaults.motion),
    clock: pick(params.get('clock'), ['real', 'manual'], queryDefaults.clock),
    t: Number.isFinite(t) && params.get('t') !== null ? t : queryDefaults.t,
    tps: Number.isFinite(tps) && tps > 0 ? tps : queryDefaults.tps,
    device: pick(params.get('device'), ['apple', 'nano', 'llama', 'unavailable'], queryDefaults.device),
    embed: params.get('embed') === '1' || params.get('embed') === 'true',
    frame: pick(params.get('frame'), ['iphone', 'android', 'none'], queryDefaults.frame),
  }
}

/** Encode only non-default values, so URLs stay short and shareable. */
export function encodeQuery<CS extends Controls>(def: PlaygroundDef<CS>, q: PlaygroundQuery<CS>): string {
  const sp = new URLSearchParams()
  for (const [k, c] of Object.entries(def.controls)) {
    const v = (q.props as Record<string, unknown>)[k]
    if (v !== undefined && v !== c.default) sp.set(k, serializeValue(c, v))
  }
  if (q.state !== def.defaultState) sp.set('state', q.state)
  for (const k of ['theme', 'material', 'accent', 'motion', 'clock', 'device', 'frame'] as const) {
    if (q[k] !== queryDefaults[k]) sp.set(k, String(q[k]))
  }
  if (q.t !== queryDefaults.t) sp.set('t', String(q.t))
  if (q.tps !== queryDefaults.tps) sp.set('tps', String(q.tps))
  if (q.embed) sp.set('embed', '1')
  return sp.toString()
}
