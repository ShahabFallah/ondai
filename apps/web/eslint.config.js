import base from '@ondai/config/eslint'
export default [...base, { ignores: ['.next/**', '.source/**', 'public/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] }]
