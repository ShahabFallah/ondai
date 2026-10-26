import base from '@ondai/config/eslint'
export default [
  ...base,
  { ignores: ['ios/**', 'android/**', '.expo/**', 'metro.config.js', 'babel.config.js', 'expo-env.d.ts'] },
  {
    // Platform-conditional native requires: the other platform's module must never be loaded.
    files: ['src/ondai.ts', 'src/polyfills.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off', '@typescript-eslint/consistent-type-imports': 'off' },
  },
]
