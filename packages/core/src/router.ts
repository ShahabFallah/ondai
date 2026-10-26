import { OndaiError, classifyError, errorMessages, toOndaiError } from './errors'
import type { Availability, Capability, Metric, OndaiConfig, OndaiErrorKind, Policy, ProviderAdapter, ProviderId, Resolved } from './types'

export const defaultPolicy: Policy = {
  order: ['apple', 'nano', 'llama', 'cloud'],
  allowCloud: false,
  prewarm: 'on-focus',
  tokenBudget: 4096,
}

export interface ResolveOptions {
  /** Never route to cloud, even if allowed. */
  localOnly?: boolean
  /** Try only this provider. */
  provider?: ProviderId
}

type Listener = () => void

export interface Ondai {
  readonly config: OndaiConfig
  readonly policy: Policy
  /** Configured adapters in policy order. */
  adapters(): ProviderAdapter[]
  adapter(id: ProviderId): ProviderAdapter | undefined
  /** First provider that is ready and supports the capability. Throws OndaiError('unavailable'). */
  resolve(capability: Capability, options?: ResolveOptions): Promise<Resolved>
  /** Overall availability for a capability (the best candidate's state, or unavailable). */
  availability(capability?: Capability, options?: ResolveOptions): Promise<Availability>
  /** Cached availability per provider, refreshed with `refresh()`. */
  availabilityOf(id: ProviderId): Promise<Availability>
  refresh(): Promise<void>
  prewarm(capability?: Capability): Promise<void>
  /** Subscribe to availability changes. */
  subscribe(listener: Listener): () => void
  /** Record a local metric (never leaves the device). */
  track(metric: Omit<Metric, 'at'>): void
  /** Classify any error, using the provider's classifier when it has one. */
  classify(error: unknown, provider?: ProviderId): OndaiErrorKind
  /** Wrap a thrown value into an OndaiError with a human message. */
  wrapError(error: unknown, provider?: ProviderId): OndaiError
  /** Replace the mock adapter's script at runtime (playground). */
  setAdapter(id: ProviderId, adapter: ProviderAdapter | undefined): void
}

export function createOndai(config: OndaiConfig): Ondai {
  const policy: Policy = { ...defaultPolicy, ...config.policy }
  const adapters = new Map<ProviderId, ProviderAdapter>()
  for (const [id, a] of Object.entries(config.providers)) if (a) adapters.set(id, { ...a, id: a.id ?? id })
  const cache = new Map<ProviderId, Availability>()
  const inflight = new Map<ProviderId, Promise<Availability>>()
  const listeners = new Set<Listener>()
  const log = (...args: unknown[]) => {
    if (config.debug) console.log('[ondai]', ...args)
  }
  const notify = () => listeners.forEach((l) => l())

  const ordered = () => {
    const seen = new Set<ProviderId>()
    const out: ProviderAdapter[] = []
    for (const id of policy.order) {
      const a = adapters.get(id)
      if (a && !seen.has(id)) {
        out.push(a)
        seen.add(id)
      }
    }
    for (const [id, a] of adapters) if (!seen.has(id)) out.push(a)
    return out
  }

  const availabilityOf = (id: ProviderId): Promise<Availability> => {
    const a = adapters.get(id)
    if (!a) return Promise.resolve({ status: 'unavailable', reason: 'no-provider', provider: id })
    const cached = cache.get(id)
    if (cached) return Promise.resolve(cached)
    const pending = inflight.get(id)
    if (pending) return pending
    const p = a
      .availability()
      .catch((e): Availability => {
        log('availability error', id, e)
        return { status: 'unavailable', reason: 'unknown', detail: String(e), provider: id }
      })
      .then((av) => {
        log('availability', id, av)
        cache.set(id, av)
        inflight.delete(id)
        notify()
        return av
      })
    inflight.set(id, p)
    return p
  }

  const candidates = (capability: Capability, options: ResolveOptions = {}) =>
    ordered().filter((a) => {
      if (options.provider && a.id !== options.provider) return false
      if (a.locality === 'cloud' && (!policy.allowCloud || options.localOnly)) return false
      return a.capabilities.has(capability)
    })

  const ondai: Ondai = {
    config,
    policy,
    adapters: ordered,
    adapter: (id) => adapters.get(id),
    async resolve(capability, options) {
      const list = candidates(capability, options)
      let best: Availability | undefined
      for (const a of list) {
        const av = await availabilityOf(a.id)
        if (av.status === 'ready') return { adapter: a, provider: a.id, locality: a.locality }
        if (!best || av.status === 'preparing') best = av
      }
      const reason = best?.status === 'preparing' ? 'model-downloading' : best?.status === 'unavailable' ? best.reason : 'no-provider'
      throw new OndaiError('unavailable', errorMessages.unavailable, { raw: best ?? reason })
    },
    async availability(capability = 'text', options) {
      const list = candidates(capability, options)
      if (!list.length) return { status: 'unavailable', reason: 'no-provider' }
      let fallback: Availability | undefined
      for (const a of list) {
        const av = await availabilityOf(a.id)
        if (av.status === 'ready') return av
        if (av.status === 'preparing') fallback = av
        else if (!fallback) fallback = av
      }
      return fallback ?? { status: 'unavailable', reason: 'no-provider' }
    },
    availabilityOf,
    async refresh() {
      cache.clear()
      await Promise.all([...adapters.keys()].map(availabilityOf))
    },
    async prewarm(capability = 'text') {
      try {
        const r = await ondai.resolve(capability)
        await r.adapter.prepare?.()
      } catch (e) {
        log('prewarm skipped', e)
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    track(metric) {
      const m: Metric = { ...metric, at: Date.now() }
      log('metric', m)
      config.onMetric?.(m)
    },
    classify(error, provider) {
      const a = provider ? adapters.get(provider) : undefined
      return classifyError(error, a?.classifyError?.(error))
    },
    wrapError(error, provider) {
      const a = provider ? adapters.get(provider) : undefined
      return toOndaiError(error, provider, a?.classifyError?.(error))
    },
    setAdapter(id, adapter) {
      if (adapter) adapters.set(id, { ...adapter, id })
      else adapters.delete(id)
      cache.delete(id)
      inflight.delete(id)
      notify()
    },
  }
  return ondai
}
