import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm'

export interface ProjectInfo {
  cwd: string
  packageJson: Record<string, any>
  deps: Record<string, string>
  isExpo: boolean
  isBare: boolean
  hasNativeWind: boolean
  hasTypeScript: boolean
  pm: PackageManager
  expoSdk?: string
  reactNative?: string
}

export function detectProject(cwd: string): ProjectInfo {
  const pkgPath = join(cwd, 'package.json')
  if (!existsSync(pkgPath)) throw new Error(`No package.json in ${cwd}. Run this inside your app.`)
  const packageJson = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, any>
  const deps = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) } as Record<string, string>
  const pm: PackageManager = existsSync(join(cwd, 'pnpm-lock.yaml')) ? 'pnpm' : existsSync(join(cwd, 'bun.lock')) || existsSync(join(cwd, 'bun.lockb')) ? 'bun' : existsSync(join(cwd, 'yarn.lock')) ? 'yarn' : 'npm'
  return {
    cwd,
    packageJson,
    deps,
    isExpo: 'expo' in deps,
    isBare: 'react-native' in deps && !('expo' in deps),
    hasNativeWind: 'nativewind' in deps,
    hasTypeScript: 'typescript' in deps || existsSync(join(cwd, 'tsconfig.json')),
    pm,
    expoSdk: deps.expo,
    reactNative: deps['react-native'],
  }
}

export function installCommand(pm: PackageManager, packages: string[]): string[] {
  if (!packages.length) return []
  switch (pm) {
    case 'pnpm':
      return ['pnpm', 'add', ...packages]
    case 'yarn':
      return ['yarn', 'add', ...packages]
    case 'bun':
      return ['bun', 'add', ...packages]
    default:
      return ['npm', 'install', ...packages]
  }
}
