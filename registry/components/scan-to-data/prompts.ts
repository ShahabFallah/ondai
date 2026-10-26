import { describeForPrompt, type FieldInfo } from '@ondai/core'
import type { ScanPreset } from './schema'

const presetHints: Record<ScanPreset, string> = {
  receipt: 'The text is OCR from a receipt. The total is the final amount paid.',
  businessCard: 'The text is OCR from a business card.',
  event: 'The text is OCR from a poster, invitation or screenshot about an event.',
  custom: 'The text is OCR from a photo.',
}

export function scanInstructions(preset: ScanPreset, fields: FieldInfo[], extra?: string): string {
  return [presetHints[preset], `Extract these fields and return JSON only: ${describeForPrompt(fields)}.`, 'OCR may contain mistakes; copy values carefully. Leave out fields that are not present.', extra].filter(Boolean).join(' ')
}
