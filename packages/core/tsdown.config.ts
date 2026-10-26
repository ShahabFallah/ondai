import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    headless: 'src/headless.ts',
    mock: 'src/mock/index.ts',
    apple: 'src/providers/apple.ts',
    adk: 'src/providers/adk.ts',
    llama: 'src/providers/llama.ts',
    expo: 'src/expo/index.ts',
  },
  format: ['esm'],
  platform: 'neutral',
  dts: true,
  clean: true,
  external: [/^react/, /^react-native/, /^@react-native-ai\//, /^expo/, 'ai', /^@ai-sdk\//, 'zod', /^@ondai\//],
})
