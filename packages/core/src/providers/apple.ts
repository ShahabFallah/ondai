import type { EmbeddingModelV3, LanguageModelV3, SpeechModelV3, TranscriptionModelV3 } from '@ai-sdk/provider'
import { Platform } from 'react-native'
import type { Availability, Capability, OndaiErrorKind, ProviderAdapter } from '../types'

/** The shape of `import * as mod from '@react-native-ai/apple'` (0.12). Duck-typed so core has no hard dependency. */
export interface AppleModule {
  apple: {
    (): LanguageModelV3
    isAvailable(): boolean
    textEmbeddingModel(options?: { language?: string }): EmbeddingModelV3
    transcriptionModel(options?: { language?: string }): TranscriptionModelV3
    speechModel(options?: { language?: string }): SpeechModelV3
  }
  createAppleProvider(options?: { availableTools?: Record<string, unknown> }): { (): LanguageModelV3 }
  AppleTranscription?: { isAvailable(language: string): boolean }
  AppleEmbeddings?: { getInfo(language: string): Promise<{ dimension: number; hasAvailableAssets: boolean }> }
}

export interface AppleAdapterOptions {
  language?: string
  /** iOS 26 context window (tokens). Read `getModelInfo()` once the provider exposes it. */
  contextWindow?: number
}

function iosMajor(): number {
  const v = Platform.OS === 'ios' ? String(Platform.Version) : '0'
  return parseInt(v.split('.')[0] ?? '0', 10) || 0
}

/**
 * Apple Foundation Models via @react-native-ai/apple 0.12.
 * `isAvailable()` is a boolean there, so reasons are inferred defensively and the raw value is logged.
 */
export function appleAdapter(mod: AppleModule, options: AppleAdapterOptions = {}): ProviderAdapter {
  const caps = new Set<Capability>(['text', 'structured', 'tools', 'embeddings', 'transcription', 'speech'])
  const lang = options.language ?? 'en-US'
  let cachedModel: LanguageModelV3 | undefined
  return {
    id: 'apple',
    label: 'Apple',
    locality: 'on-device',
    capabilities: caps,
    contextWindow: options.contextWindow ?? 4096,
    async availability(): Promise<Availability> {
      if (Platform.OS !== 'ios') return { status: 'unavailable', reason: 'unsupported-os', detail: Platform.OS, provider: 'apple' }
      if (iosMajor() < 26) return { status: 'unavailable', reason: 'unsupported-os', detail: `iOS ${Platform.Version}`, provider: 'apple' }
      let raw: boolean
      try {
        raw = mod.apple.isAvailable()
      } catch (e) {
        return { status: 'unavailable', reason: 'unknown', detail: String(e), provider: 'apple' }
      }
      if (raw) return { status: 'ready', provider: 'apple' }
      // Apple's enum (deviceNotEligible / appleIntelligenceNotEnabled / modelNotReady) is not exposed by 0.12.
      return {
        status: 'unavailable',
        reason: 'unknown',
        detail: 'Apple Intelligence is off, not eligible, or the model is still downloading. Check Settings → Apple Intelligence & Siri.',
        provider: 'apple',
      }
    },
    async prepare() {
      const m = cachedModel ?? (cachedModel = mod.apple())
      await (m as { prepare?: () => Promise<void> }).prepare?.()
    },
    languageModel(opts) {
      if (opts?.tools && Object.keys(opts.tools).length) return mod.createAppleProvider({ availableTools: opts.tools })()
      return cachedModel ?? (cachedModel = mod.apple())
    },
    embeddingModel() {
      return mod.apple.textEmbeddingModel({ language: lang })
    },
    transcriptionModel(opts) {
      return mod.apple.transcriptionModel({ language: opts?.language ?? lang })
    },
    speechModel(opts) {
      return mod.apple.speechModel({ language: opts?.language ?? lang })
    },
    classifyError(error): OndaiErrorKind | undefined {
      const msg = error instanceof Error ? error.message : String(error)
      if (/MODEL_UNAVAILABLE|not available/i.test(msg)) return 'unavailable'
      if (/exceededContextWindowSize|context window/i.test(msg)) return 'context-overflow'
      if (/guardrail|unsafe|safety/i.test(msg)) return 'refusal'
      if (/unsupportedLanguage|language.*locale/i.test(msg)) return 'unsupported-language'
      if (/rateLimited|RATE_LIMITED/i.test(msg)) return 'quota'
      return undefined
    },
  }
}
