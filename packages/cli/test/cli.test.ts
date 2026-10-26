import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { add } from '../src/commands/add'
import { diff } from '../src/commands/diff'
import { runDoctor } from '../src/commands/doctor'
import { list } from '../src/commands/list'
import { resolveRegistryUrl, resolveTree } from '../src/registry'
import { writeConfig } from '../src/config'

const registryDir = resolve(import.meta.dirname, '..', '..', '..', 'apps', 'web', 'public', 'r')
const registry = pathToFileURL(registryDir).href

function fakeApp() {
  const cwd = mkdtempSync(join(tmpdir(), 'ondai-cli-'))
  writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: 'app', dependencies: { expo: '~58.0.19', 'react-native': '0.88.0', 'expo-dev-client': '~58.0.15', '@ondai/core': '0.1.0', ai: '^6.0.0', '@ungap/structured-clone': '1', '@stardazed/streams-text-encoding': '1', 'react-native-reanimated': '4.7.1', 'react-native-worklets': '0.13.0' } }))
  writeFileSync(join(cwd, 'app.json'), JSON.stringify({ expo: { name: 'app', plugins: [['expo-build-properties', { android: { minSdkVersion: 26 } }]] } }))
  writeFileSync(join(cwd, 'pnpm-lock.yaml'), '')
  writeConfig(cwd, { registry, componentsDir: 'components/ondai' })
  return cwd
}

describe('ondai cli', () => {
  it('resolves the registry url by precedence', () => {
    expect(resolveRegistryUrl('http://a/', 'http://b', 'http://c')).toBe('http://a')
    expect(resolveRegistryUrl(undefined, 'http://b/', 'http://c')).toBe('http://b')
    expect(resolveRegistryUrl(undefined, undefined, 'http://c')).toBe('http://c')
  })
  it('resolves registry dependencies first, deduplicated', async () => {
    const items = await resolveTree(registry, ['command-bar'])
    const names = items.map((i) => i.name)
    expect(names[names.length - 1]).toBe('command-bar')
    expect(names).toContain('ion-border')
    expect(new Set(names).size).toBe(names.length)
    expect(names.indexOf('sheet')).toBeLessThan(names.indexOf('tool-confirm-card'))
  })
  it('adds a component with its files and reports dependencies, then diff is clean', async () => {
    const cwd = fakeApp()
    const r = await add({ cwd, names: ['on-device-badge'], yes: true, install: false })
    expect(r.written).toContain('components/ondai/on-device-badge/on-device-badge.tsx')
    expect(existsSync(join(cwd, 'components/ondai/on-device-badge/index.ts'))).toBe(true)
    const again = await add({ cwd, names: ['on-device-badge'], yes: true, install: false })
    expect(again.written).toHaveLength(0)
    const patches = await diff({ cwd, name: 'on-device-badge' })
    expect(patches).toHaveLength(0)
    writeFileSync(join(cwd, 'components/ondai/on-device-badge/index.ts'), '// changed\n')
    const changed = await diff({ cwd, name: 'on-device-badge' })
    expect(changed).toHaveLength(1)
    expect(changed[0]).toContain('changed')
  })
  it('honors a custom componentsDir and the dry run', async () => {
    const cwd = fakeApp()
    mkdirSync(join(cwd, 'src'), { recursive: true })
    writeConfig(cwd, { registry, componentsDir: 'src/ui/ai' })
    const r = await add({ cwd, names: ['key-hint'], yes: true, dryRun: true })
    expect(r.written).toContain('src/ui/ai/key-hint/key-hint.tsx')
    expect(existsSync(join(cwd, 'src/ui/ai/key-hint/key-hint.tsx'))).toBe(false)
  })
  it('lists the registry and runs doctor', async () => {
    const cwd = fakeApp()
    const index = await list({ cwd, json: true })
    expect(index.items.length).toBeGreaterThan(10)
    const checks = runDoctor(cwd)
    expect(checks.find((c) => c.name === 'ai (Vercel AI SDK)')?.status).toBe('ok')
    expect(checks.find((c) => c.name === 'Android minSdkVersion')?.status).toBe('ok')
    expect(checks.filter((c) => c.status === 'fail')).toHaveLength(0)
    const bad = mkdtempSync(join(tmpdir(), 'ondai-bad-'))
    writeFileSync(join(bad, 'package.json'), JSON.stringify({ name: 'x', dependencies: { 'react-native': '0.88.0', ai: '^7.0.0' } }))
    const badChecks = runDoctor(bad)
    expect(badChecks.find((c) => c.name === 'ai (Vercel AI SDK)')?.status).toBe('warn')
    expect(badChecks.find((c) => c.name === 'Polyfills')?.status).toBe('fail')
    expect(readFileSync(join(cwd, 'ondai.json'), 'utf8')).toContain('componentsDir')
  })
})
