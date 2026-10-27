import type { OndaiErrorKind } from './types'

export class OndaiError extends Error {
  readonly kind: OndaiErrorKind
  readonly retryable: boolean
  readonly raw: unknown
  readonly provider?: string

  constructor(kind: OndaiErrorKind, message: string, options: { raw?: unknown; provider?: string } = {}) {
    super(message)
    this.name = 'OndaiError'
    this.kind = kind
    this.raw = options.raw
    this.provider = options.provider
    this.retryable = kind === 'context-overflow' || kind === 'network' || kind === 'invalid-output'
  }
}

/** Calm, human copy per error kind. Components show these verbatim. */
export const errorMessages: Record<OndaiErrorKind, string> = {
  'context-overflow': 'That was a bit too long for the on-device model. Try a shorter selection.',
  refusal: 'The on-device model declined this request.',
  'unsupported-language': 'The on-device model does not support this language yet.',
  quota: 'The on-device model is busy right now. Try again in a moment.',
  unavailable: 'On-device AI is not available on this device.',
  cancelled: 'Stopped.',
  'invalid-output': 'The model returned something unexpected. Try again.',
  'tool-error': 'The action could not be completed.',
  network: 'No connection.',
  unknown: 'Something went wrong. Try again.',
}

const patterns: Array<[OndaiErrorKind, RegExp]> = [
  ['cancelled', /abort|cancel/i],
  ['context-overflow', /context ?window|exceeded.*context|exceeds the maximum|too (many|long)|token limit|exceededContextWindowSize/i],
  ['refusal', /guardrail|safety|refus|unsafe|sensitive content|violat/i],
  ['unsupported-language', /unsupported ?language|locale|language.*not supported/i],
  ['quota', /rate ?limit|quota|busy|throttl|RATE_LIMITED|BUSY/i],
  ['unavailable', /not available|unavailable|MODEL_UNAVAILABLE|not eligible|not enabled|not ready|UNSUPPORTED_OS|unsupported (ios|os)/i],
  ['invalid-output', /invalid.*(json|schema|output)|parse|decod|no object generated|does not match/i],
  ['tool-error', /tool/i],
  ['network', /network|fetch failed|ECONN|ENOTFOUND|offline/i],
]

/** Best-effort classification of any thrown value. Providers' own codes win when present. */
export function classifyError(error: unknown, hint?: OndaiErrorKind): OndaiErrorKind {
  if (hint) return hint
  if (error instanceof OndaiError) return error.kind
  const text = errorText(error)
  const code = (error as { code?: unknown })?.code
  if (typeof code === 'string') {
    const byCode = patterns.find(([, re]) => re.test(code))
    if (byCode) return byCode[0]
  }
  for (const [kind, re] of patterns) if (re.test(text)) return kind
  return 'unknown'
}

export function errorText(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return `${error.name}: ${error.message}`
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function toOndaiError(error: unknown, provider?: string, hint?: OndaiErrorKind): OndaiError {
  if (error instanceof OndaiError) return error
  const kind = classifyError(error, hint)
  return new OndaiError(kind, errorMessages[kind], { raw: error, provider })
}
