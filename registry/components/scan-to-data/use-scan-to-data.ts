import { useCallback, useMemo, useRef, useState } from 'react'
import type { z } from 'zod'
import { describeSchema, refineObject, useStructured, type RefinedField, type StructuredState } from '@ondai/core'
import { scanInstructions } from './prompts'
import { mergeAliases, presetAliases, presets, type ScanPreset } from './schema'

export interface ScanImage {
  uri: string
  base64?: string
  width?: number
  height?: number
}

export interface UseScanToDataOptions<S extends z.ZodObject<z.ZodRawShape>> {
  preset?: ScanPreset
  /** Required when preset is `custom`. */
  schema?: S
  /** On-device OCR (e.g. ML Kit text recognition, Apple Vision). Returns the recognized text. */
  ocr?: (image: ScanImage) => Promise<string>
  instructions?: string
  /** Extra words per enum value, added to the preset's own (receipts already map "restaurant" to food and "VISA" to card). */
  aliases?: Record<string, Record<string, string[]>>
  component?: string
  localOnly?: boolean
}

export interface ScanToDataState<T> extends Omit<StructuredState<Record<string, unknown>>, 'object' | 'run' | 'partial'> {
  data: Partial<T> | null
  fields: Record<string, RefinedField>
  ocrText: string
  /** `ocr` while reading the image, then the structured phases. */
  phase: 'idle' | 'ocr' | 'extract' | 'done' | 'error'
  scan: (image: ScanImage) => Promise<Partial<T>>
  /** Skip OCR: extract from text you already have. */
  scanText: (text: string) => Promise<Partial<T>>
  ocrAvailable: boolean
  fieldInfo: ReturnType<typeof describeSchema>
}

/** Camera or photo → OCR on device → structured data for a preset (receipt, business card, event) or your own schema. */
export function useScanToData<S extends z.ZodObject<z.ZodRawShape>>(options: UseScanToDataOptions<S>): ScanToDataState<z.infer<S>> {
  const { preset = 'receipt', schema, ocr, instructions, aliases: extraAliases, component = 'scan-to-data', localOnly } = options
  const aliases = useMemo(() => mergeAliases(presetAliases[preset], extraAliases), [preset, extraAliases])
  const resolved = useMemo(() => (preset === 'custom' ? schema : (presets[preset] as unknown as S)) as S, [preset, schema])
  if (!resolved) throw new Error('[ondai] ScanToData: preset "custom" needs a schema')
  const fieldInfo = useMemo(() => describeSchema(resolved), [resolved])
  const partial = useMemo(() => (resolved as unknown as { partial: () => z.ZodObject<z.ZodRawShape> }).partial(), [resolved])
  const [data, setData] = useState<Partial<z.infer<S>> | null>(null)
  const [fields, setFields] = useState<Record<string, RefinedField>>({})
  const [ocrText, setOcrText] = useState('')
  const [phase, setPhase] = useState<ScanToDataState<unknown>['phase']>('idle')
  const ocrRef = useRef(ocr)
  ocrRef.current = ocr
  const structured = useStructured<Record<string, unknown>>({
    schema: partial as never,
    instructions: scanInstructions(preset, fieldInfo, instructions),
    component,
    localOnly,
    refine: (obj) => {
      const r = refineObject(fieldInfo, obj, { aliases })
      return { object: r.object, confidence: r.confidence }
    },
  })

  const scanText = useCallback(
    async (text: string) => {
      setOcrText(text)
      setPhase('extract')
      try {
        const obj = await structured.run(text)
        const r = refineObject(fieldInfo, obj, { aliases })
        const next: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(r.object)) if (v !== undefined) next[k] = v
        setData(next as Partial<z.infer<S>>)
        setFields(r.fields)
        setPhase('done')
        return next as Partial<z.infer<S>>
      } catch (e) {
        setPhase('error')
        throw e
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structured.run, fieldInfo, aliases],
  )
  const scan = useCallback(
    async (image: ScanImage) => {
      if (!ocrRef.current) throw new Error('OCR is not configured. Pass `ocr` (e.g. ML Kit text recognition) to ScanToData.')
      setPhase('ocr')
      setData(null)
      setFields({})
      let text: string
      try {
        text = await ocrRef.current(image)
      } catch (e) {
        setPhase('error')
        throw e
      }
      return scanText(text)
    },
    [scanText],
  )
  return { ...structured, data, fields, ocrText, phase, scan, scanText, ocrAvailable: !!ocr, fieldInfo, reset: () => (structured.reset(), setData(null), setFields({}), setOcrText(''), setPhase('idle')) }
}
