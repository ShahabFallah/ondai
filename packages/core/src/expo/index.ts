import type { VectorEntry, VectorStorage } from '../vector'

/** Minimal subset of expo-sqlite used here (duck-typed; expo-sqlite is an optional peer). */
export interface SQLiteDatabaseLike {
  execAsync(sql: string): Promise<void>
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>
  withTransactionAsync(fn: () => Promise<void>): Promise<void>
}

export interface SqliteStorageOptions {
  /** `openDatabaseAsync` from expo-sqlite, injected to keep core free of native imports. */
  open: (name: string) => Promise<SQLiteDatabaseLike>
  databaseName?: string
}

interface Row {
  id: string
  text: string | null
  metadata: string | null
  vector: Uint8Array
}

/**
 * Persistent vector storage on expo-sqlite. Vectors are stored as Float32 blobs; similarity runs in JS.
 * Chosen over MMKV because collections are scanned and filtered as sets, not read as single keys.
 */
export function sqliteStorage(options: SqliteStorageOptions): VectorStorage {
  let dbPromise: Promise<SQLiteDatabaseLike> | undefined
  const db = () =>
    (dbPromise ??= options.open(options.databaseName ?? 'ondai-vectors.db').then(async (d) => {
      await d.execAsync(
        'CREATE TABLE IF NOT EXISTS vectors (collection TEXT NOT NULL, id TEXT NOT NULL, text TEXT, metadata TEXT, vector BLOB NOT NULL, PRIMARY KEY (collection, id));',
      )
      return d
    }))
  return {
    async load(name) {
      const rows = await (await db()).getAllAsync<Row>('SELECT id, text, metadata, vector FROM vectors WHERE collection = ?', name)
      return rows.map((r) => ({
        id: r.id,
        text: r.text ?? undefined,
        metadata: r.metadata ? (JSON.parse(r.metadata) as Record<string, unknown>) : undefined,
        vector: new Float32Array(r.vector.buffer, r.vector.byteOffset, r.vector.byteLength / 4),
      }))
    },
    async save(name, entries: VectorEntry[]) {
      const d = await db()
      await d.withTransactionAsync(async () => {
        await d.runAsync('DELETE FROM vectors WHERE collection = ?', name)
        for (const e of entries) {
          const f = e.vector instanceof Float32Array ? e.vector : Float32Array.from(e.vector)
          await d.runAsync(
            'INSERT INTO vectors (collection, id, text, metadata, vector) VALUES (?, ?, ?, ?, ?)',
            name,
            e.id,
            e.text ?? null,
            e.metadata ? JSON.stringify(e.metadata) : null,
            new Uint8Array(f.buffer, f.byteOffset, f.byteLength),
          )
        }
      })
    },
    async clear(name) {
      await (await db()).runAsync('DELETE FROM vectors WHERE collection = ?', name)
    },
  }
}
