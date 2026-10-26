import { useCallback } from 'react'
import { embedMany } from 'ai'
import { useOndai } from '../context'
import { cosine } from '../vector'
import type { ProviderId } from '../types'
import { useLocalModel } from './use-local-model'

export interface EmbeddingsState {
  available: boolean
  provider: ProviderId | undefined
  embed: (texts: string[]) => Promise<number[][]>
  embedOne: (text: string) => Promise<number[]>
  similarity: (a: ArrayLike<number>, b: ArrayLike<number>) => number
}

/** Local text embeddings (Apple NLContextualEmbedding, llama GGUF, or the mock). */
export function useEmbeddings(options: { localOnly?: boolean; provider?: ProviderId } = {}): EmbeddingsState {
  const ondai = useOndai()
  const model = useLocalModel('embeddings', options)
  const embed = useCallback(
    async (texts: string[]) => {
      if (!texts.length) return []
      const r = await ondai.resolve('embeddings', options)
      const m = r.adapter.embeddingModel!()
      const res = await embedMany({ model: m, values: texts })
      return res.embeddings
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ondai, options.localOnly, options.provider],
  )
  return {
    available: model.isReady,
    provider: model.provider,
    embed,
    embedOne: async (t) => (await embed([t]))[0] ?? [],
    similarity: cosine,
  }
}
