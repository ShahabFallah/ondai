import { useCallback, useMemo, useRef, useState } from 'react'
import type { z } from 'zod'
import { describeSchema, refineObject, useStructured, type RefinedField, type StructuredState } from '@ondai/core'
import { smartFormInstructions } from './prompts'

export interface UseSmartFormOptions<S extends z.ZodObject<z.ZodRawShape>> {
  schema: S
  /** Domain hints for the model ("expenses app; merchants are restaurants and shops"). */
  instructions?: string
  /** Aliases per enum field: { category: { food: ['lunch', 'dinner'] } }. */
  aliases?: Record<string, Record<string, string[]>>
  /** Labels for fields in the UI. */
  labels?: Partial<Record<keyof z.infer<S> & string, string>>
  /** Called with the refined values after each successful fill. */
  onFill?: (values: Partial<z.infer<S>>, fields: Record<string, RefinedField>) => void
  component?: string
  localOnly?: boolean
}

export interface SmartFormState<S extends z.ZodObject<z.ZodRawShape>> extends Omit<StructuredState<Record<string, unknown>>, 'object' | 'run'> {
  values: Partial<z.infer<S>>
  /** Per-field confidence and whether a deterministic correction was applied. */
  fields: Record<string, RefinedField>
  fill: (text: string) => Promise<Partial<z.infer<S>>>
  /** Accept a field (marks confidence 1). */
  confirmField: (name: keyof z.infer<S> & string) => void
  /** Revert a field to its previous value. */
  undoField: (name: keyof z.infer<S> & string) => void
  /** Manually edit a field. */
  setField: (name: keyof z.infer<S> & string, value: unknown) => void
  /** Push values into any form library: apply((name, value) => form.setValue(name, value)). */
  apply: (setter: (name: string, value: unknown) => void) => void
  undoAll: () => void
  fieldInfo: ReturnType<typeof describeSchema>
}

/** Text (or transcribed voice / OCR text) fills your zod form, with deterministic refinement and per-field confidence. */
export function useSmartForm<S extends z.ZodObject<z.ZodRawShape>>(options: UseSmartFormOptions<S>): SmartFormState<S> {
  const { schema, instructions, aliases, onFill, component = 'smart-input', localOnly } = options
  const fieldInfo = useMemo(() => describeSchema(schema), [schema])
  const [values, setValues] = useState<Partial<z.infer<S>>>({})
  const [fields, setFields] = useState<Record<string, RefinedField>>({})
  const previous = useRef<Partial<z.infer<S>>>({})
  const partial = useMemo(() => (schema as unknown as { partial: () => z.ZodObject<z.ZodRawShape> }).partial(), [schema])

  const structured = useStructured<Record<string, unknown>>({
    schema: partial as never,
    instructions: smartFormInstructions(fieldInfo, instructions),
    component,
    localOnly,
    refine: (obj) => {
      const r = refineObject(fieldInfo, obj, { aliases })
      return { object: r.object, confidence: r.confidence }
    },
  })

  const fill = useCallback(
    async (text: string) => {
      const obj = await structured.run(text)
      const r = refineObject(fieldInfo, obj, { aliases })
      previous.current = values
      const next = { ...values, ...(r.object as Partial<z.infer<S>>) }
      for (const k of Object.keys(r.fields)) if (r.object[k] === undefined) delete (next as Record<string, unknown>)[k]
      setValues(next)
      setFields(r.fields)
      onFill?.(next, r.fields)
      return next
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structured.run, fieldInfo, aliases, values, onFill],
  )

  return {
    ...structured,
    values,
    fields,
    fieldInfo,
    fill,
    confirmField: (name) => setFields((f) => ({ ...f, [name]: { ...(f[name] ?? { value: values[name] }), confidence: 1 } })),
    undoField: (name) => {
      setValues((v) => ({ ...v, [name]: previous.current[name] }))
      setFields((f) => ({ ...f, [name]: { value: previous.current[name], confidence: 1 } }))
    },
    setField: (name, value) => {
      setValues((v) => ({ ...v, [name]: value }))
      setFields((f) => ({ ...f, [name]: { value, confidence: 1 } }))
    },
    apply: (setter) => {
      for (const [k, v] of Object.entries(values)) if (v !== undefined) setter(k, v)
    },
    undoAll: () => {
      setValues(previous.current)
      setFields({})
    },
    reset: () => {
      structured.reset()
      setValues({})
      setFields({})
      previous.current = {}
    },
  }
}
