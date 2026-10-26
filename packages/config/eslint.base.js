import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

/** Shared flat config. Packages spread this and add their own ignores. */
export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/.expo/**', '**/node_modules/**', '**/generated/**', '**/jest.config.cjs', '**/jest.setup.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser, ...globals.node, __DEV__: 'readonly' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Reanimated on web without the worklets Babel plugin needs explicit dependency arrays.
      'react-hooks/exhaustive-deps': [
        'warn',
        { additionalHooks: '(useAnimatedStyle|useDerivedValue|useAnimatedProps|useAnimatedReaction)' },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'off',
      // Ondai hooks intentionally use the "latest ref" pattern (ref.current = options during render) and
      // auto-run effects that start a request; both are safe here and would need React Compiler to be rewritten.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/test-utils.tsx'],
    languageOptions: { globals: { ...globals.jest } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
)
