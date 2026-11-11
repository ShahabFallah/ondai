import type { Availability, Capability, ProviderAdapter, ProviderId } from '../types'
import { realClock, type Clock } from './clock'
import { toScript } from './scripts'
import {
  ScriptedEmbeddingModel,
  ScriptedLanguageModel,
  ScriptedSpeechModel,
  ScriptedTranscriptionModel,
  type ScriptSource,
} from './scripted-model'

export * from './clock'
export * from './scripts'
export * from './scripted-model'

export type SimulatedDevice = 'apple' | 'nano' | 'llama' | 'cloud' | 'unavailable'

export interface MockAdapterOptions {
  script?: ScriptSource
  clock?: Clock
  speed?: number
  /** Which real provider to impersonate in badges (locality stays accurate via `simulated`). */
  simulate?: SimulatedDevice
  /** Explicit availability override (wins over the script's). */
  availability?: Availability
  capabilities?: Capability[]
  transcript?: string
  embeddingDimension?: number
  /** Label as a simulated device (default true on web). */
  simulated?: boolean
}

const labels: Record<SimulatedDevice, { id: ProviderId; label: string; locality: ProviderAdapter['locality'] }> = {
  apple: { id: 'apple', label: 'Apple', locality: 'on-device' },
  nano: { id: 'nano', label: 'Nano', locality: 'on-device' },
  llama: { id: 'llama', label: 'Llama', locality: 'local' },
  cloud: { id: 'cloud', label: 'Cloud', locality: 'cloud' },
  unavailable: { id: 'apple', label: 'Apple', locality: 'on-device' },
}

/** A provider adapter backed by scripted models. Powers tests, the web playground and on-device stories. */
export function mockAdapter(options: MockAdapterOptions = {}): ProviderAdapter & { options: MockAdapterOptions } {
  const sim = labels[options.simulate ?? 'apple']
  const script = options.script ?? { steps: [] }
  const staticScript = typeof script === 'function' ? undefined : toScript(script)
  const availability: Availability =
    options.availability ??
    (options.simulate === 'unavailable'
      ? { status: 'unavailable', reason: 'device-not-eligible', provider: sim.id }
      : (staticScript?.availability ?? { status: 'ready', provider: sim.id }))
  const caps = new Set<Capability>(options.capabilities ?? ['text', 'structured', 'tools', 'embeddings', 'transcription', 'speech', 'vision'])
  const clock = options.clock ?? realClock
  return {
    options,
    id: sim.id,
    label: sim.label,
    locality: options.simulated === false ? sim.locality : 'simulated',
    capabilities: caps,
    contextWindow: staticScript?.contextWindow ?? 4096,
    async availability() {
      return availability.status === 'ready' ? { ...availability, provider: sim.id } : availability
    },
    async prepare() {},
    languageModel() {
      return new ScriptedLanguageModel({ script, clock, speed: options.speed, provider: sim.id })
    },
    embeddingModel() {
      return new ScriptedEmbeddingModel(options.embeddingDimension ?? staticScript?.embeddingDimension ?? 64)
    },
    transcriptionModel() {
      return new ScriptedTranscriptionModel(options.transcript ?? 'Remind me to call Sam tomorrow at nine.', clock)
    },
    speechModel() {
      return new ScriptedSpeechModel()
    },
  }
}

/** Alias matching the spec wording. */
export const createMockProvider = mockAdapter
