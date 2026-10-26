import { defineConfig } from 'tsdown'
export default defineConfig({ entry: { index: 'src/index.ts' }, format: ['esm'], platform: 'node', target: 'node22', dts: false, clean: true, banner: { js: '#!/usr/bin/env node' } })
