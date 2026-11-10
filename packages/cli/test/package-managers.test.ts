import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectPackageManager, expoCommand, installCommand, runCommand } from '../src/project'

/** A throwaway app folder two levels deep, so a lockfile above it is not this repo's. */
function app(lockfile?: string) {
  const root = mkdtempSync(join(tmpdir(), 'ondai-pm-'))
  const cwd = join(root, 'a', 'b')
  mkdirSync(cwd, { recursive: true })
  if (lockfile) writeFileSync(join(cwd, lockfile), '')
  return cwd
}

describe('package managers', () => {
  it.each([
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
  ])('detects %s as %s', (file, pm) => {
    expect(detectPackageManager(app(file), '')).toBe(pm)
  })

  it('falls back to the manager that ran the CLI when there is no lockfile yet', () => {
    expect(detectPackageManager(app(), 'pnpm/10.33.2 npm/? node/v22.23.4 darwin arm64')).toBe('pnpm')
    expect(detectPackageManager(app(), 'bun/1.3.0 npm/? node/v24.3.0 darwin arm64')).toBe('bun')
    expect(detectPackageManager(app(), 'yarn/4.9.1 npm/? node/v22.23.4 darwin arm64')).toBe('yarn')
    expect(detectPackageManager(app(), '')).toBe('npm')
  })

  it('installs through Expo with the right manager, and directly otherwise', () => {
    expect(installCommand('npm', ['zod'], { expo: true })).toEqual(['npx', 'expo', 'install', 'zod'])
    expect(installCommand('pnpm', ['zod'], { expo: true })).toEqual(['pnpm', 'expo', 'install', 'zod'])
    expect(installCommand('yarn', ['zod'], { expo: true })).toEqual(['yarn', 'expo', 'install', 'zod'])
    expect(installCommand('bun', ['zod'], { expo: true })).toEqual(['bunx', 'expo', 'install', 'zod'])
    expect(installCommand('bun', ['zod'])).toEqual(['bun', 'add', 'zod'])
    expect(installCommand('yarn', ['zod'])).toEqual(['yarn', 'add', 'zod'])
  })

  it('prints hints for the manager in use', () => {
    expect(runCommand('pnpm', 'ondai add chat')).toBe('pnpm dlx ondai add chat')
    expect(runCommand('bun', 'ondai add chat')).toBe('bunx ondai add chat')
    expect(expoCommand('yarn', 'prebuild')).toBe('yarn expo prebuild')
  })
})
