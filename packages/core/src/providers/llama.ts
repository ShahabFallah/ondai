import type { EmbeddingModelV3, LanguageModelV3 } from '@ai-sdk/provider'
import type { Availability, Capability, ProviderAdapter } from '../types'

/** Shape of `import * as mod from '@react-native-ai/llama'` (0.12). */
export interface LlamaModule {
  llama: {
    languageModel(modelPath: string, options?: Record<string, unknown>): LanguageModelV3 & { prepare(): Promise<unknown>; unload(): Promise<void> }
    textEmbeddingModel(modelPath: string, options?: Record<string, unknown>): EmbeddingModelV3 & { prepare(): Promise<unknown>; unload(): Promise<void> }
  }
  downloadModel(modelId: string, onProgress?: (p: { percentage: number }) => void): Promise<string>
  isModelDownloaded(modelId: string): Promise<boolean>
  getModelPath(modelId: string): string
  removeModel(modelId: string): Promise<void>
}

export interface LlamaAdapterOptions {
  /** HuggingFace id: `owner/repo/file.gguf`. */
  modelId: string
  /** Optional embedding GGUF. */
  embeddingModelId?: string
  /** `always` downloads on first use; `wifi-only` requires the app to call `download()` explicitly; `never` only uses a present model. */
  autoDownload?: 'always' | 'wifi-only' | 'never'
  contextWindow?: number
  contextParams?: Record<string, unknown>
}

export interface LlamaAdapter extends ProviderAdapter {
  download(onProgress?: (p: { percentage: number }) => void): Promise<void>
  remove(): Promise<void>
  unload(): Promise<void>
  progress: number
}

/** GGUF models through llama.rn. Opt-in fallback for devices without a built-in model. */
export function llamaAdapter(mod: LlamaModule, options: LlamaAdapterOptions): LlamaAdapter {
  const caps = new Set<Capability>(['text', 'structured', ...(options.embeddingModelId ? (['embeddings'] as const) : [])])
  let downloading: Promise<void> | undefined
  let model: ReturnType<LlamaModule['llama']['languageModel']> | undefined
  let embedding: ReturnType<LlamaModule['llama']['textEmbeddingModel']> | undefined
  let prepared = false
  const adapter: LlamaAdapter = {
    id: 'llama',
    label: 'Llama',
    locality: 'local',
    capabilities: caps,
    // The llama provider ignores the AI SDK response schema; ask for JSON in the prompt and validate it here.
    structuredOutput: 'prompt',
    contextWindow: options.contextWindow ?? 4096,
    progress: 0,
    async availability(): Promise<Availability> {
      if (downloading) return { status: 'preparing', provider: 'llama', progress: adapter.progress }
      try {
        const present = await mod.isModelDownloaded(options.modelId)
        if (present) return { status: 'ready', provider: 'llama' }
        if (options.autoDownload === 'always') {
          void adapter.download()
          return { status: 'preparing', provider: 'llama', progress: 0 }
        }
        return { status: 'unavailable', reason: 'model-downloading', detail: 'Model not downloaded yet', provider: 'llama' }
      } catch (e) {
        return { status: 'unavailable', reason: 'unknown', detail: String(e), provider: 'llama' }
      }
    },
    async download(onProgress) {
      if (!downloading) {
        downloading = mod
          .downloadModel(options.modelId, (p) => {
            adapter.progress = p.percentage / 100
            onProgress?.(p)
          })
          .then(() => undefined)
          .finally(() => (downloading = undefined))
      }
      await downloading
    },
    async remove() {
      await adapter.unload()
      await mod.removeModel(options.modelId)
    },
    async unload() {
      await model?.unload()
      await embedding?.unload()
      model = undefined
      embedding = undefined
      prepared = false
    },
    async prepare() {
      if (prepared) return
      const m = adapter.languageModel!()
      await (m as unknown as { prepare(): Promise<unknown> }).prepare()
      prepared = true
    },
    languageModel() {
      return (model ??= mod.llama.languageModel(mod.getModelPath(options.modelId), { contextParams: options.contextParams }))
    },
    embeddingModel: options.embeddingModelId
      ? () => (embedding ??= mod.llama.textEmbeddingModel(mod.getModelPath(options.embeddingModelId!)))
      : undefined,
  }
  return adapter
}
