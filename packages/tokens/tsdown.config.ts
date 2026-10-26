import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.tsx',
    'tailwind-preset': 'src/tailwind-preset.ts',
    css: 'src/css.ts',
  },
  format: ['esm'],
  platform: 'neutral',
  dts: true,
  clean: true,
  external: ['react', 'react-native'],
})
