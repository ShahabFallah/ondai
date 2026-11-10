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
  const pm: PackageManager = detectPackageManager(cwd)
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

/**
 * The install command for the app. Expo projects go through `npx expo install`, which pins Expo SDK
 * modules (expo-haptics, expo-blur, react-native-reanimated…) to the versions the app's SDK expects and
 * passes everything else to the app's package manager.
 */
/**
 * The app's package manager: its lockfile first (also one folder up, for monorepos), then the manager
 * that ran this CLI (`pnpm dlx ondai`, `yarn dlx ondai`, `bunx ondai` set npm_config_user_agent), then npm.
 */
export function detectPackageManager(cwd: string, userAgent = process.env.npm_config_user_agent ?? ''): PackageManager {
  for (const dir of [cwd, join(cwd, '..'), join(cwd, '..', '..')]) {
    if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm'
    if (existsSync(join(dir, 'bun.lock')) || existsSync(join(dir, 'bun.lockb'))) return 'bun'
    if (existsSync(join(dir, 'yarn.lock'))) return 'yarn'
    if (existsSync(join(dir, 'package-lock.json'))) return 'npm'
  }
  const agent = userAgent.split('/')[0]
  return agent === 'pnpm' || agent === 'yarn' || agent === 'bun' ? agent : 'npm'
}

/** How to run a package's binary with this manager, e.g. `pnpm dlx ondai add x`. */
export function runCommand(pm: PackageManager, command: string): string {
  return `${{ npm: 'npx', pnpm: 'pnpm dlx', yarn: 'yarn dlx', bun: 'bunx' }[pm]} ${command}`
}

/** How to run the project's own Expo CLI with this manager, e.g. `pnpm expo prebuild`. */
export function expoCommand(pm: PackageManager, args: string): string {
  return `${{ npm: 'npx expo', pnpm: 'pnpm expo', yarn: 'yarn expo', bun: 'bunx expo' }[pm]} ${args}`
}

export function installCommand(pm: PackageManager, packages: string[], options: { expo?: boolean } = {}): string[] {
  if (!packages.length) return []
  if (options.expo) return [...expoCommand(pm, 'install').split(' '), ...packages]
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
