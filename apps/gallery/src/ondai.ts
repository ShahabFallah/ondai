import { Platform } from 'react-native'
import { createOndai, type Ondai, type ProviderAdapter } from '@ondai/core'
import { mockAdapter, mockScript } from '@ondai/core/mock'
import { macBridgeAdapter } from './mac-bridge'
import { isSimulator } from './prefs'

/**
 * Real providers are required lazily per platform so the other platform's native module is never touched.
 * Gemini Nano needs a physical Android 14+ device. Apple needs iOS 26+ with Apple Intelligence: on a physical
 * iPhone it runs in-process; the iOS 26.2 simulator cannot run it, so there the same Apple
 * model is served by this Mac through the bridge (`pnpm bridge`, src/mac-bridge.ts).
 */
export function realProviders(): Record<string, ProviderAdapter> {
  const providers: Record<string, ProviderAdapter> = {}
  if (Platform.OS === 'ios' && isSimulator) {
    providers.apple = macBridgeAdapter()
  } else if (Platform.OS === 'ios') {
    const { appleAdapter } = require('@ondai/core/apple') as typeof import('@ondai/core/apple')
    const mod = require('@react-native-ai/apple')
    providers.apple = appleAdapter(mod)
  }
  if (Platform.OS === 'android') {
    const { nanoAdapter } = require('@ondai/core/adk') as typeof import('@ondai/core/adk')
    const mod = require('@react-native-ai/adk')
    providers.nano = nanoAdapter(mod)
  }
  return providers
}

export function createGalleryOndai(useMock: boolean, onMetric?: Parameters<typeof createOndai>[0]['onMetric']): Ondai {
  const scripted = mockAdapter({ script: mockScript.thinking(900).stream('This is a simulated on-device answer so every screen works without a model.', 36), simulated: true })
  const real = useMock ? {} : realProviders()
  const providers = useMock || !Object.keys(real).length ? { mock: scripted } : real
  return createOndai({ providers, policy: { order: ['apple', 'nano', 'llama', 'mock'], prewarm: 'on-focus' }, onMetric, debug: __DEV__ })
}
