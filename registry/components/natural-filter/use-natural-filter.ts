import { useCallback, useMemo, useState } from 'react'
import type { z } from 'zod'
import { describeSchema, humanize, refineObject, useStructured, type FieldInfo, type StructuredState } from '@ondai/core'
import { naturalFilterInstructions } from './prompts'

export interface FilterChip {
  key: string
  label: string
  value: unknown
  display: string
  confidence: number
  /** Enum options, so chips can cycle values. */
  options?: string[]
}

export interface UseNaturalFilterOptions<S extends z.ZodObject<z.ZodRawShape>> {
  schema: S
  instructions?: string
  aliases?: Record<string, Record<string, string[]>>
  /** Display names for the schema's fields ("maxDistanceKm" → "Within"). Defaults to the humanized key. */
  fieldLabels?: Partial<Record<keyof z.infer<S> & string, string>>
  /** Format a value for its chip. */
  format?: (key: string, value: unknown) => string
  onChange?: (filter: Partial<z.infer<S>>) => void
  component?: string
  localOnly?: boolean
}

export interface NaturalFilterState<S extends z.ZodObject<z.ZodRawShape>> extends Omit<StructuredState<Record<string, unknown>>, 'object' | 'run' | 'partial'> {
  filter: Partial<z.infer<S>>
  chips: FilterChip[]
  run: (query: string) => Promise<Partial<z.infer<S>>>
  set: (key: keyof z.infer<S> & string, value: unknown) => void
  remove: (key: keyof z.infer<S> & string) => void
  clear: () => void
  fieldInfo: FieldInfo[]
}

/** "cheap Italian open now" becomes a typed filter object. Chips are editable and removable. */
export function useNaturalFilter<S extends z.ZodObject<z.ZodRawShape>>(options: UseNaturalFilterOptions<S>): NaturalFilterState<S> {
  const { schema, instructions, aliases, fieldLabels, format, onChange, component = 'natural-filter', localOnly } = options
  const fieldInfo = useMemo(() => describeSchema(schema), [schema])
  const [filter, setFilter] = useState<Partial<z.infer<S>>>({})
  const [conf, setConf] = useState<Record<string, number>>({})
  const partial = useMemo(() => (schema as unknown as { partial: () => z.ZodObject<z.ZodRawShape> }).partial(), [schema])
  const structured = useStructured<Record<string, unknown>>({
    schema: partial as never,
    instructions: naturalFilterInstructions(fieldInfo, instructions),
    component,
    localOnly,
    refine: (obj) => {
      const r = refineObject(fieldInfo, obj, { aliases })
      return { object: r.object, confidence: r.confidence }
    },
  })
  const update = useCallback(
    (next: Partial<z.infer<S>>) => {
      setFilter(next)
      onChange?.(next)
    },
    [onChange],
  )
  const run = useCallback(
    async (query: string) => {
      const obj = await structured.run(query)
      const r = refineObject(fieldInfo, obj, { aliases })
      const next: Record<string, unknown> = {}
      const c: Record<string, number> = {}
      for (const [k, v] of Object.entries(r.object)) {
        if (v === undefined || v === null || v === '' || v === false) continue
        next[k] = v
        c[k] = r.fields[k]?.confidence ?? 0.8
      }
      setConf(c)
      update(next as Partial<z.infer<S>>)
      return next as Partial<z.infer<S>>
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structured.run, fieldInfo, aliases, update],
  )
  const chips = useMemo<FilterChip[]>(
    () =>
      fieldInfo
        .filter((f) => (filter as Record<string, unknown>)[f.name] !== undefined)
        .map((f) => {
          const v = (filter as Record<string, unknown>)[f.name]
          const display = format?.(f.name, v) ?? (typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v))
          return { key: f.name, label: fieldLabels?.[f.name as never] ?? humanize(f.name), value: v, display, confidence: conf[f.name] ?? 1, options: f.options }
        }),
    [fieldInfo, filter, conf, fieldLabels, format],
  )
  return {
    ...structured,
    filter,
    chips,
    fieldInfo,
    run,
    set: (k, v) => update({ ...filter, [k]: v }),
    remove: (k) => {
      const next = { ...filter }
      delete (next as Record<string, unknown>)[k]
      update(next)
    },
    clear: () => update({}),
    reset: () => {
      structured.reset()
      update({})
    },
  }
}
