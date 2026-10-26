import type { LanguageModelV3 } from '@ai-sdk/provider'
import { AppState, Platform } from 'react-native'
import type { Availability, Capability, OndaiErrorKind, ProviderAdapter } from '../types'

/** Shape of `import * as mod from '@react-native-ai/adk'` (0.12). */
export interface AdkModule {
  createAdkProvider(options?: {
    modelType?: 'gemini' | 'genai-nano'
    modelName?: string
    instruction?: string
    availableTools?: Record<string, unknown>
  }): {
    (): LanguageModelV3
    isNanoSupported(): Promise<boolean>
    isAvailable(modelType?: 'gemini' | 'genai-nano'): Promise<boolean>
    prepareNano(): Promise<void>
  }
}

export interface NanoAdapterOptions {
  instruction?: string
}

/** Gemini Nano via ML Kit GenAI through @react-native-ai/adk. Android 14+ physical devices only. */
export function nanoAdapter(mod: AdkModule, options: NanoAdapterOptions = {}): ProviderAdapter {
  const caps = new Set<Capability>(['text', 'structured', 'tools', 'vision'])
  const base = mod.createAdkProvider({ modelType: 'genai-nano', modelName: 'gemini-nano', instruction: options.instruction })
  let prepared = false
  return {
    id: 'nano',
    label: 'Nano',
    locality: 'on-device',
    capabilities: caps,
    contextWindow: 4096,
    async availability(): Promise<Availability> {
      if (Platform.OS !== 'android') return { status: 'unavailable', reason: 'unsupported-os', detail: Platform.OS, provider: 'nano' }
      if (AppState.currentState !== 'active') return { status: 'unavailable', reason: 'background-blocked', provider: 'nano' }
      try {
        const supported = await base.isNanoSupported()
        if (!supported) return { status: 'unavailable', reason: 'device-not-eligible', detail: 'No AICore / Gemini Nano on this device', provider: 'nano' }
        const ready = await base.isAvailable('genai-nano')
        if (!ready) return { status: 'preparing', provider: 'nano' }
        return { status: 'ready', provider: 'nano' }
      } catch (e) {
        return { status: 'unavailable', reason: 'unknown', detail: String(e), provider: 'nano' }
      }
    },
    async prepare() {
      if (prepared) return
      await base.prepareNano()
      prepared = true
    },
    languageModel(opts) {
      if (opts?.tools && Object.keys(opts.tools).length) {
        return mod.createAdkProvider({ modelType: 'genai-nano', modelName: 'gemini-nano', instruction: options.instruction, availableTools: opts.tools })()
      }
      return base()
    },
    classifyError(error): OndaiErrorKind | undefined {
      const msg = error instanceof Error ? error.message : String(error)
      if (/BUSY|quota|rate/i.test(msg)) return 'quota'
      if (/foreground|background/i.test(msg)) return 'unavailable'
      return undefined
    },
  }
}
