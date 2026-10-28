import type { EmbeddingModelV3, LanguageModelV3 } from '@ai-sdk/provider'
import type { Capability, ProviderAdapter } from './types'

export interface CloudAdapterOptions {
  /** Any AI SDK language model (e.g. from @ai-sdk/openai). Only used when `policy.allowCloud` is true. */
  model: LanguageModelV3 | (() => LanguageModelV3)
  embeddingModel?: EmbeddingModelV3
  label?: string
  capabilities?: Capability[]
  contextWindow?: number
}

/** Developer-supplied cloud model. Opt-in; never selected unless `allowCloud: true`. */
export function cloudAdapter(options: CloudAdapterOptions): ProviderAdapter {
  const caps = new Set<Capability>(options.capabilities ?? ['text', 'structured', 'tools', 'vision', ...(options.embeddingModel ? (['embeddings'] as const) : [])])
  return {
    id: 'cloud',
    label: options.label ?? 'Cloud',
    locality: 'cloud',
    capabilities: caps,
    contextWindow: options.contextWindow ?? 128_000,
    async availability() {
      return { status: 'ready', provider: 'cloud' }
    },
    languageModel() {
      return typeof options.model === 'function' ? options.model() : options.model
    },
    embeddingModel: options.embeddingModel ? () => options.embeddingModel! : undefined,
  }
}

/** Helper to build a custom adapter with defaults filled in. */
export function defineAdapter(adapter: Omit<ProviderAdapter, 'capabilities'> & { capabilities: Capability[] }): ProviderAdapter {
  return { ...adapter, capabilities: new Set(adapter.capabilities) }
}
