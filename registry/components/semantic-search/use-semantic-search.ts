import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createVectorIndex, keywordScore, useEmbeddings, useLocalModel, type SearchHit, type VectorIndex, type VectorStorage } from '@ondai/core'
import type { AiState } from '@ondai/tokens'

export interface SearchItem<M = Record<string, unknown>> {
  id: string
  /** The text that gets embedded and keyword-matched. */
  text: string
  metadata?: M
}

export interface UseSemanticSearchOptions<M> {
  items: SearchItem<M>[]
  /** Persist embeddings (e.g. sqliteStorage from @ondai/core/expo). In-memory by default. */
  storage?: VectorStorage
  indexName?: string
  k?: number
  /** Blend keyword overlap into the vector score (default true). */
  hybrid?: boolean
  /** Weight of the vector score in hybrid mode (default 0.65). */
  alpha?: number
  minScore?: number
  /** Embedding batch size while indexing. */
  batchSize?: number
  component?: string
}

export interface SemanticSearchState<M> {
  query: string
  setQuery: (q: string) => void
  results: SearchHit<M>[]
  search: (q: string) => Promise<SearchHit<M>[]>
  clear: () => void
  isIndexing: boolean
  indexProgress: [number, number] | null
  isSearching: boolean
  /** `vector` when embeddings are available, otherwise `keyword`. */
  mode: 'vector' | 'keyword'
  status: AiState
  error: Error | null
  provider?: string
  locality?: string
  reindex: () => Promise<void>
  index: VectorIndex<M>
}

/** Search by meaning over the app's own records: a local vector index plus keyword matching, with "why it matched". */
export function useSemanticSearch<M = Record<string, unknown>>(options: UseSemanticSearchOptions<M>): SemanticSearchState<M> {
  const { items, storage, indexName = 'search', k = 10, hybrid = true, alpha = 0.65, minScore = 0.08, batchSize = 16 } = options
  const embeddings = useEmbeddings()
  const model = useLocalModel('embeddings')
  const index = useMemo(() => createVectorIndex<M>({ name: indexName, storage }), [indexName, storage])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit<M>[]>([])
  const [isIndexing, setIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState<[number, number] | null>(null)
  const [isSearching, setSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const mode: SemanticSearchState<M>['mode'] = model.isReady ? 'vector' : 'keyword'
  const itemsRef = useRef(items)
  itemsRef.current = items

  const reindex = useCallback(async () => {
    if (!model.isReady) return
    await index.ready
    const missing = itemsRef.current.filter((it) => !index.has(it.id))
    if (!missing.length) return
    setIndexing(true)
    setIndexProgress([0, missing.length])
    try {
      for (let i = 0; i < missing.length; i += batchSize) {
        const batch = missing.slice(i, i + batchSize)
        const vectors = await embeddings.embed(batch.map((b) => b.text))
        await index.add(batch.map((b, j) => ({ id: b.id, text: b.text, metadata: b.metadata as Record<string, unknown>, vector: vectors[j] ?? [] })))
        setIndexProgress([Math.min(missing.length, i + batch.length), missing.length])
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setIndexing(false)
      setIndexProgress(null)
    }
  }, [index, embeddings, batchSize, model.isReady])

  useEffect(() => {
    void reindex()
  }, [reindex, items.length])

  const search = useCallback(
    async (q: string) => {
      setQuery(q)
      if (!q.trim()) {
        setResults([])
        return []
      }
      setSearching(true)
      setError(null)
      try {
        let hits: SearchHit<M>[]
        if (model.isReady) {
          await index.ready
          const [vector] = await embeddings.embed([q])
          hits = hybrid ? index.searchHybrid(vector ?? null, q, { k, alpha, minScore }) : index.search(vector ?? [], { k, minScore })
        } else {
          hits = itemsRef.current
            .map((it) => ({ id: it.id, score: keywordScore(q, it.text), text: it.text, metadata: it.metadata as M, why: { keyword: keywordScore(q, it.text), terms: q.toLowerCase().split(/\s+/).filter((w) => it.text.toLowerCase().includes(w)) } }))
            .filter((h) => h.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, k)
        }
        setResults(hits)
        return hits
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
        return []
      } finally {
        setSearching(false)
      }
    },
    [index, embeddings, model.isReady, hybrid, k, alpha, minScore],
  )

  const status: AiState = isIndexing ? 'preparing' : isSearching ? 'thinking' : error ? 'error' : results.length ? 'done' : 'idle'
  return { query, setQuery, results, search, clear: () => (setQuery(''), setResults([])), isIndexing, indexProgress, isSearching, mode, status, error, provider: model.provider, locality: model.locality, reindex, index }
}
