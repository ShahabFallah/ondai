/** Controls DSL. One definition drives the web controls panel, the on-device Stories screen and URL state. */

export interface SelectControl<T extends string = string> {
  kind: 'select'
  options: readonly T[]
  default: T
  label?: string
}
export interface BooleanControl {
  kind: 'boolean'
  default: boolean
  label?: string
}
export interface TextControl {
  kind: 'text'
  default: string
  label?: string
  multiline?: boolean
  placeholder?: string
}
export interface NumberControl {
  kind: 'number'
  default: number
  min?: number
  max?: number
  step?: number
  label?: string
}
export type Control = SelectControl | BooleanControl | TextControl | NumberControl
export type Controls = Record<string, Control>

export const select = <const T extends string>(options: readonly T[], def: T, label?: string): SelectControl<T> => ({
  kind: 'select',
  options,
  default: def,
  label,
})
export const boolean = (def: boolean, label?: string): BooleanControl => ({ kind: 'boolean', default: def, label })
export const text = (def: string, label?: string, opts: { multiline?: boolean; placeholder?: string } = {}): TextControl => ({
  kind: 'text',
  default: def,
  label,
  ...opts,
})
export const number = (def: number, opts: { min?: number; max?: number; step?: number; label?: string } = {}): NumberControl => ({
  kind: 'number',
  default: def,
  ...opts,
})

export type ControlValue<C extends Control> = C extends SelectControl<infer T>
  ? T
  : C extends BooleanControl
    ? boolean
    : C extends TextControl
      ? string
      : number

export type ControlValues<CS extends Controls> = { [K in keyof CS]: ControlValue<CS[K]> }

export function defaultValues<CS extends Controls>(controls: CS): ControlValues<CS> {
  const out: Record<string, unknown> = {}
  for (const [k, c] of Object.entries(controls)) out[k] = c.default
  return out as ControlValues<CS>
}

export function coerceValue(control: Control, raw: string | undefined): unknown {
  if (raw === undefined) return control.default
  switch (control.kind) {
    case 'select':
      return (control.options as readonly string[]).includes(raw) ? raw : control.default
    case 'boolean':
      return raw === '1' || raw === 'true'
    case 'number': {
      const n = Number(raw)
      return Number.isFinite(n) ? n : control.default
    }
    case 'text':
      return raw
  }
}

export function serializeValue(control: Control, value: unknown): string {
  if (control.kind === 'boolean') return value ? '1' : '0'
  return String(value)
}
