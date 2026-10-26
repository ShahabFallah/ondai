// AI SDK polyfills for the React Native runtime (https://react-native-ai.dev/docs/polyfills).
// Skipped on web, where the browser already provides these globals.
import { Platform } from 'react-native'

if (Platform.OS !== 'web') {
  const g = globalThis as Record<string, unknown>
  if (typeof g.structuredClone !== 'function') {
    g.structuredClone = require('@ungap/structured-clone').default
  }
  if (typeof g.TextEncoderStream !== 'function' || typeof g.TextDecoderStream !== 'function') {
    const { TextEncoderStream, TextDecoderStream } = require('@stardazed/streams-text-encoding')
    g.TextEncoderStream = TextEncoderStream
    g.TextDecoderStream = TextDecoderStream
  }
}
