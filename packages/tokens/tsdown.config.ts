import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.tsx',
    'tailwind-preset': 'src/tailwind-preset.ts',
    css: 'src/css.ts',
  },
  // ESM everywhere, plus CommonJS so a `require`d tailwind.config.js can load the preset.
  format: ['esm', 'cjs'],
  platform: 'neutral',
  dts: true,
  clean: true,
  external: ['react', 'react-native'],
})
