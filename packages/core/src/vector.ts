import { normalizeText } from './parse'

export interface VectorEntry {
  id: string
  vector: Float32Array | number[]
  text?: string
  metadata?: Record<string, unknown>
}

export interface VectorStorage {
  load(name: string): Promise<VectorEntry[]>
  save(name: string, entries: VectorEntry[]): Promise<void>
  clear(name: string): Promise<void>
}

/** Default storage: in memory (web playground, tests). Use `@ondai/core/expo` for SQLite persistence. */
export function memoryStorage(): VectorStorage {
  const store = new Map<string, VectorEntry[]>()
  return {
    async load(name) {
      return store.get(name) ?? []
    },
    async save(name, entries) {
      store.set(name, entries)
    },
    async clear(name) {
      store.delete(name)
    },
  }
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < n; i++) {
    const x = a[i]!
    const y = b[i]!
    dot += x * y
    na += x * x
    nb += y * y
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'at', 'by', 'it', 'this', 'that'])

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((t) => t.length > 1 && !stop.has(t))
}

/** Simple keyword relevance (0..1): fraction of query tokens found, with prefix matches counted at half. */
export function keywordScore(query: string, text: string): number {
  const q = tokenize(query)
  if (!q.length) return 0
  const t = tokenize(text)
  const set = new Set(t)
  let score = 0
  for (const qt of q) {
    if (set.has(qt)) score += 1
    else if (t.some((tt) => tt.startsWith(qt) || qt.startsWith(tt))) score += 0.5
  }
  return score / q.length
}

export interface SearchHit<M = Record<string, unknown>> {
  id: string
  score: number
  text?: string
  metadata?: M
  /** Which signals matched, for "why it matched" UI. */
  why: { vector?: number; keyword?: number; terms?: string[] }
}

export interface SearchOptions<M> {
  k?: number
  minScore?: number
  filter?: (entry: VectorEntry & { metadata?: M }) => boolean
}

export interface VectorIndex<M = Record<string, unknown>> {
  readonly name: string
  ready: Promise<void>
  add(entries: VectorEntry[]): Promise<void>
  upsert(entries: VectorEntry[]): Promise<void>
  remove(ids: string[]): Promise<void>
  clear(): Promise<void>
  size(): number
  all(): VectorEntry[]
  has(id: string): boolean
  search(vector: ArrayLike<number>, options?: SearchOptions<M>): SearchHit<M>[]
  /** Blend vector similarity and keyword overlap. `alpha` = weight of the vector score (default 0.65). */
  searchHybrid(vector: ArrayLike<number> | null, query: string, options?: SearchOptions<M> & { alpha?: number }): SearchHit<M>[]
}

export interface VectorIndexOptions {
  name?: string
  storage?: VectorStorage
  /** Expected vector length; entries with a different length are rejected. */
  dimension?: number
}

export function createVectorIndex<M = Record<string, unknown>>(options: VectorIndexOptions = {}): VectorIndex<M> {
  const name = options.name ?? 'default'
  const storage = options.storage ?? memoryStorage()
  let entries: VectorEntry[] = []
  const byId = new Map<string, number>()

  const reindex = () => {
    byId.clear()
    entries.forEach((e, i) => byId.set(e.id, i))
  }
  const persist = () => storage.save(name, entries)
  const check = (e: VectorEntry) => {
    if (options.dimension && e.vector.length !== options.dimension) {
      throw new Error(`Vector for "${e.id}" has ${e.vector.length} dims, expected ${options.dimension}`)
    }
    return { ...e, vector: e.vector instanceof Float32Array ? e.vector : Float32Array.from(e.vector) }
  }

  const ready = storage.load(name).then((loaded) => {
    entries = loaded.map(check)
    reindex()
  })

  const rank = (scores: Map<string, SearchHit<M>>, k: number, minScore: number) =>
    [...scores.values()].filter((h) => h.score >= minScore).sort((a, b) => b.score - a.score).slice(0, k)

  const index: VectorIndex<M> = {
    name,
    ready,
    async add(items) {
      for (const e of items) {
        if (byId.has(e.id)) continue
        entries.push(check(e))
        byId.set(e.id, entries.length - 1)
      }
      await persist()
    },
    async upsert(items) {
      for (const e of items) {
        const i = byId.get(e.id)
        if (i === undefined) {
          entries.push(check(e))
          byId.set(e.id, entries.length - 1)
        } else entries[i] = check(e)
      }
      await persist()
    },
    async remove(ids) {
      const rm = new Set(ids)
      entries = entries.filter((e) => !rm.has(e.id))
      reindex()
      await persist()
    },
    async clear() {
      entries = []
      reindex()
      await storage.clear(name)
    },
    size: () => entries.length,
    all: () => entries.slice(),
    has: (id) => byId.has(id),
    search(vector, opts = {}) {
      const k = opts.k ?? 10
      const hits = new Map<string, SearchHit<M>>()
      for (const e of entries) {
        if (opts.filter && !opts.filter(e as VectorEntry & { metadata?: M })) continue
        const s = cosine(vector, e.vector)
        hits.set(e.id, { id: e.id, score: s, text: e.text, metadata: e.metadata as M, why: { vector: s } })
      }
      return rank(hits, k, opts.minScore ?? -1)
    },
    searchHybrid(vector, query, opts = {}) {
      const k = opts.k ?? 10
      const alpha = vector ? (opts.alpha ?? 0.65) : 0
      const qTokens = tokenize(query)
      const hits = new Map<string, SearchHit<M>>()
      for (const e of entries) {
        if (opts.filter && !opts.filter(e as VectorEntry & { metadata?: M })) continue
        const v = vector ? cosine(vector, e.vector) : 0
        const kw = e.text ? keywordScore(query, e.text) : 0
        const score = alpha * v + (1 - alpha) * kw
        const terms = e.text ? qTokens.filter((t) => tokenize(e.text!).some((x) => x === t || x.startsWith(t))) : []
        hits.set(e.id, { id: e.id, score, text: e.text, metadata: e.metadata as M, why: { vector: vector ? v : undefined, keyword: kw, terms } })
      }
      return rank(hits, k, opts.minScore ?? 0.0001)
    },
  }
  return index
}
