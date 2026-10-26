import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()
const useWebpack = process.env.NEXT_BUNDLER === 'webpack'

const webExts = ['.web.tsx', '.web.ts', '.web.jsx', '.web.js']
// Turbopack does not apply platform extensions inside node_modules, so native-only modules are
// aliased to browser implementations in @ondai/web-shims.
const shims = {
  'react-native': '@ondai/web-shims/react-native',
  'react-native-svg': '@ondai/web-shims/react-native-svg',
  'expo-haptics': '@ondai/web-shims/expo-haptics',
  'expo-blur': '@ondai/web-shims/expo-blur',
  'expo-clipboard': '@ondai/web-shims/expo-clipboard',
  'expo-image-picker': '@ondai/web-shims/expo-image-picker',
}

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  env: { EXPO_OS: 'web' },
  transpilePackages: [
    'react-native-reanimated',
    'react-native-worklets',
    'react-native-is-edge-to-edge',
    'lucide-react-native',
    '@ondai/core',
    '@ondai/tokens',
    '@ondai/playground',
    '@ondai/registry',
    '@ondai/web-shims',
  ],
  turbopack: {
    resolveAlias: shims,
    resolveExtensions: [...webExts, '.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  ...(useWebpack && {
    webpack: (cfg) => {
      cfg.resolve.alias = { ...cfg.resolve.alias, ...Object.fromEntries(Object.entries(shims).map(([k, v]) => [`${k}$`, v])) }
      cfg.resolve.extensions = [...webExts, ...cfg.resolve.extensions]
      return cfg
    },
  }),
}

export default withMDX(config)
