/** Component tests run with jest-expo (the only maintained preset for Reanimated 4 + RN 0.88). */
module.exports = {
  preset: 'jest-expo/ios',
  rootDir: __dirname,
  testMatch: ['<rootDir>/components/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Watchman is broken on some Macs (missing Homebrew boost); the crawler is fine for this size.
  watchman: false,
  // Reanimated 4 swaps web-only modules for Jest through its resolver.
  resolver: require.resolve('react-native-reanimated/jest/resolver.js'),
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native|react-native-reanimated|react-native-worklets|@ondai/.*|ai|@ai-sdk/.*))',
  ],
  moduleNameMapper: {
    '^@ondai/registry/components/(.*)$': '<rootDir>/components/$1',
    // lucide ships ESM only under `exports`; Jest needs the CJS build.
    '^lucide-react-native$': '<rootDir>/../node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
}
