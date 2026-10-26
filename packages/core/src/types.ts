import type { EmbeddingModelV3, LanguageModelV3, SpeechModelV3, TranscriptionModelV3 } from '@ai-sdk/provider'

export type Capability =
  | 'text'
  | 'structured'
  | 'tools'
  | 'vision'
  | 'embeddings'
  | 'transcription'
  | 'speech'

export const capabilities: readonly Capability[] = [
  'text',
  'structured',
  'tools',
  'vision',
  'embeddings',
  'transcription',
  'speech',
]

export type ProviderId = 'apple' | 'nano' | 'llama' | 'cloud' | 'mock' | (string & {})

export type UnavailableReason =
  | 'device-not-eligible'
  | 'not-enabled'
  | 'model-downloading'
  | 'unsupported-os'
  | 'unsupported-language'
  | 'background-blocked'
  | 'quota'
  | 'no-provider'
  | 'unknown'

export type Availability =
  | { status: 'ready'; provider: ProviderId }
  | { status: 'preparing'; provider: ProviderId; progress?: number }
  | { status: 'unavailable'; reason: UnavailableReason; detail?: string; provider?: ProviderId }

/** Where a provider runs; drives the OnDeviceBadge label. */
export type Locality = 'on-device' | 'local' | 'cloud' | 'simulated'

export interface ProviderAdapter {
  id: ProviderId
  /** Short human label, e.g. "Apple", "Nano", "Llama". */
  label: string
  locality: Locality
  capabilities: ReadonlySet<Capability>
  availability(): Promise<Availability>
  /** Warm the model (cold start is ~1–2s on Apple). Safe to call repeatedly. */
  prepare?(): Promise<void>
  languageModel?(options?: { tools?: Record<string, unknown> }): LanguageModelV3
  embeddingModel?(): EmbeddingModelV3
  transcriptionModel?(options?: { language?: string }): TranscriptionModelV3
  speechModel?(options?: { language?: string }): SpeechModelV3
  /** Provider-specific error classification; return undefined to fall back to text matching. */
  classifyError?(error: unknown): OndaiErrorKind | undefined
  /** Context window in tokens, when known. */
  contextWindow?: number
}

export type OndaiErrorKind =
  | 'context-overflow'
  | 'refusal'
  | 'unsupported-language'
  | 'quota'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-output'
  | 'tool-error'
  | 'network'
  | 'unknown'

export interface Policy {
  /** Providers tried in order for every capability. */
  order: ProviderId[]
  /** Cloud is only used when true AND a cloud provider is configured. */
  allowCloud: boolean
  /** `on-focus`: components prewarm when they gain focus; `on-mount`; `never`. */
  prewarm: 'on-focus' | 'on-mount' | 'never'
  /** Worst-case input budget in tokens (Apple Foundation Models: 4,096 on iOS 26). */
  tokenBudget: number
}

export interface Metric {
  component?: string
  capability: Capability
  provider: ProviderId
  latencyMs: number
  /** Time to first token for streams. */
  ttftMs?: number
  inputTokens?: number
  outputTokens?: number
  tokensPerSecond?: number
  ok: boolean
  errorKind?: OndaiErrorKind
  at: number
}

export interface OndaiConfig {
  providers: Partial<Record<ProviderId, ProviderAdapter | undefined>>
  policy?: Partial<Policy>
  /** Local metrics callback. Ondai never sends anything anywhere. */
  onMetric?: (metric: Metric) => void
  /** Debug logging of raw provider availability and errors. */
  debug?: boolean
}

export interface Resolved {
  adapter: ProviderAdapter
  provider: ProviderId
  locality: Locality
}
