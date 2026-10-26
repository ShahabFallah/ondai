import { useCallback, useEffect, useRef, useState } from 'react'
import type { AiState } from '@ondai/tokens'
import { useOndai } from '../context'
import { OndaiError } from '../errors'
import type { Capability, Locality, ProviderId, Resolved } from '../types'

export interface TaskMetrics {
  latencyMs: number
  ttftMs?: number
  tokensPerSecond?: number
}

export interface TaskState {
  status: AiState
  error: OndaiError | null
  provider: ProviderId | undefined
  locality: Locality | undefined
  label: string | undefined
  metrics: TaskMetrics | undefined
}

export interface TaskController extends TaskState {
  /** Resolve a provider, run `fn`, and manage status/error/metrics. */
  execute<T>(capability: Capability, fn: (ctx: TaskContext) => Promise<T>, options?: { localOnly?: boolean; provider?: ProviderId }): Promise<T>
  setStatus(status: AiState): void
  stop(): void
  reset(): void
  signal: () => AbortSignal | undefined
}

export interface TaskContext {
  resolved: Resolved
  signal: AbortSignal
  /** Call when the first token arrives, for TTFT. */
  firstToken(): void
  /** Report streamed output size for tok/s. */
  tokens(n: number): void
  setStatus(status: AiState): void
}

const errorStatus = (e: OndaiError): AiState => (e.kind === 'refusal' ? 'refusal' : e.kind === 'unavailable' ? 'unavailable' : 'error')

/** Shared machinery for every AI hook: status machine, cancellation, error mapping, local metrics. */
export function useTask(component?: string): TaskController {
  const ondai = useOndai()
  const [state, setState] = useState<TaskState>({ status: 'idle', error: null, provider: undefined, locality: undefined, label: undefined, metrics: undefined })
  const abortRef = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      // Defer so React StrictMode's simulated unmount/remount does not cancel a request that just started.
      const ac = abortRef.current
      setTimeout(() => {
        if (!mounted.current) ac?.abort()
      }, 0)
    }
  }, [])
  const update = useCallback((patch: Partial<TaskState>) => {
    if (mounted.current) setState((s) => ({ ...s, ...patch }))
  }, [])

  const execute = useCallback(
    async <T,>(capability: Capability, fn: (ctx: TaskContext) => Promise<T>, options: { localOnly?: boolean; provider?: ProviderId } = {}) => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      update({ status: 'thinking', error: null, metrics: undefined })
      const t0 = Date.now()
      let ttft: number | undefined
      let tokens = 0
      let resolved: Resolved | undefined
      try {
        resolved = await ondai.resolve(capability, options)
        update({ provider: resolved.provider, locality: resolved.locality, label: resolved.adapter.label })
        const out = await fn({
          resolved,
          signal: ac.signal,
          firstToken: () => {
            if (ttft === undefined) ttft = Date.now() - t0
          },
          tokens: (n) => (tokens = n),
          setStatus: (s) => update({ status: s }),
        })
        if (ac.signal.aborted) throw new OndaiError('cancelled', 'Stopped.')
        const latencyMs = Date.now() - t0
        const streamMs = ttft !== undefined ? Math.max(1, latencyMs - ttft) : latencyMs
        const metrics: TaskMetrics = { latencyMs, ttftMs: ttft, tokensPerSecond: tokens ? Math.round((tokens / streamMs) * 1000) : undefined }
        update({ status: 'done', metrics })
        ondai.track({ component, capability, provider: resolved.provider, latencyMs, ttftMs: ttft, outputTokens: tokens || undefined, tokensPerSecond: metrics.tokensPerSecond, ok: true })
        return out
      } catch (e) {
        const err = ondai.wrapError(e, resolved?.provider)
        if (err.kind !== 'cancelled') {
          ondai.track({ component, capability, provider: resolved?.provider ?? 'none', latencyMs: Date.now() - t0, ok: false, errorKind: err.kind })
        }
        update({ status: err.kind === 'cancelled' ? 'idle' : errorStatus(err), error: err.kind === 'cancelled' ? null : err })
        throw err
      }
    },
    [ondai, component, update],
  )

  return {
    ...state,
    execute,
    setStatus: (status) => update({ status }),
    stop: () => {
      abortRef.current?.abort()
      update({ status: 'idle' })
    },
    reset: () => {
      abortRef.current?.abort()
      update({ status: 'idle', error: null, metrics: undefined })
    },
    signal: () => abortRef.current?.signal,
  }
}
