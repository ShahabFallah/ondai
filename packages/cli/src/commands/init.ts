import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import * as p from '@clack/prompts'
import { DEFAULT_REGISTRY, readConfig, writeConfig } from '../config'
import { detectProject, expoCommand, installCommand, runCommand } from '../project'
import { dim, mono, ok, title, warn } from '../ui'

export interface InitOptions {
  cwd: string
  registry?: string
  yes?: boolean
  install?: boolean
  componentsDir?: string
}

const corePackages = ['@ondai/core', '@ondai/tokens', 'ai@^6', 'zod@^4', '@ungap/structured-clone', '@stardazed/streams-text-encoding']
const nativePackages = ['@react-native-ai/apple', '@react-native-ai/adk', 'react-native-reanimated', 'react-native-worklets', 'react-native-svg', 'lucide-react-native', 'expo-haptics', 'expo-blur', 'expo-clipboard', 'expo-image-picker']

export async function init(opts: InitOptions) {
  console.log(title('init'))
  const project = detectProject(opts.cwd)
  console.log(ok(`${project.isExpo ? `Expo ${project.expoSdk ?? ''}` : project.isBare ? `bare React Native ${project.reactNative ?? ''}` : 'unknown project'} · ${project.pm}${project.hasNativeWind ? ' · nativewind' : ''}`))
  if (!project.isExpo && !project.isBare) throw new Error('This does not look like a React Native app (no expo or react-native dependency).')
  const existing = readConfig(opts.cwd)
  let componentsDir = opts.componentsDir ?? existing?.componentsDir ?? 'components/ondai'
  if (!opts.yes) {
    const answer = await p.text({ message: 'Where should components be copied?', initialValue: componentsDir })
    if (p.isCancel(answer)) return
    componentsDir = String(answer)
  }
  writeConfig(opts.cwd, { registry: opts.registry ?? existing?.registry ?? DEFAULT_REGISTRY, componentsDir, alias: existing?.alias })
  console.log(ok(`wrote ${mono('ondai.json')}`))

  const providerDir = join(opts.cwd, componentsDir)
  mkdirSync(providerDir, { recursive: true })
  const providerFile = join(providerDir, 'provider.tsx')
  if (!existsSync(providerFile)) {
    writeFileSync(providerFile, PROVIDER_TEMPLATE)
    console.log(ok(`wrote ${mono(`${componentsDir}/provider.tsx`)}`))
  }
  const polyfills = join(opts.cwd, 'ondai-polyfills.ts')
  if (!existsSync(polyfills)) {
    writeFileSync(polyfills, POLYFILLS_TEMPLATE)
    console.log(ok(`wrote ${mono('ondai-polyfills.ts')} ${dim('(import it first in your entry file)')}`))
  }

  const packages = [...corePackages, ...nativePackages.filter((n) => !(n in project.deps))]
  if (opts.install !== false) {
    const cmd = installCommand(project.pm, packages, { expo: project.isExpo })
    console.log(dim(`$ ${cmd.join(' ')}`))
    const r = spawnSync(cmd[0]!, cmd.slice(1), { cwd: opts.cwd, stdio: 'inherit' })
    if (r.status !== 0) console.log(warn('install failed; run the command above manually'))
  } else {
    console.log(dim(`skipped install. Run: ${installCommand(project.pm, packages, { expo: project.isExpo }).join(' ')}`))
  }

  console.log(`\n${dim('Next steps')}`)
  console.log(`  1. Import ${mono('./ondai-polyfills')} at the very top of your entry file.`)
  console.log(`  2. Wrap your app in ${mono('<OndaiProvider>')} from ${mono(`${componentsDir}/provider.tsx`)}.`)
  console.log(`  3. Rebuild the dev client: ${mono(project.isExpo ? `${expoCommand(project.pm, 'prebuild')} && ${expoCommand(project.pm, 'run:ios')}` : 'cd ios && pod install && cd .. && npx react-native run-ios')}.`)
  console.log(`     iOS: Apple Foundation Models need iOS 26 and Apple Intelligence on (works in the simulator on Apple-silicon Macs).`)
  console.log(`     Android: set ${mono('minSdkVersion 26')} and the META-INF packaging excludes from the @react-native-ai/adk README (expo-build-properties).`)
  console.log(`  4. ${mono(runCommand(project.pm, 'ondai add command-bar'))}\n`)
}

const PROVIDER_TEMPLATE = `import type { ReactNode } from 'react'
import { Platform } from 'react-native'
import { createOndai, OndaiProvider as Provider, type ProviderAdapter } from '@ondai/core'

// Providers are required per platform so the other platform's native module is never loaded.
function providers(): Record<string, ProviderAdapter> {
  const out: Record<string, ProviderAdapter> = {}
  if (Platform.OS === 'ios') {
    const { appleAdapter } = require('@ondai/core/apple') as typeof import('@ondai/core/apple')
    out.apple = appleAdapter(require('@react-native-ai/apple'))
  }
  if (Platform.OS === 'android') {
    const { nanoAdapter } = require('@ondai/core/adk') as typeof import('@ondai/core/adk')
    out.nano = nanoAdapter(require('@react-native-ai/adk'))
  }
  return out
}

export const ondai = createOndai({
  providers: providers(),
  policy: { order: ['apple', 'nano', 'cloud'], allowCloud: false, prewarm: 'on-focus' },
})

export function OndaiProvider({ children }: { children: ReactNode }) {
  return (
    <Provider value={ondai} theme="system" accent="ion">
      {children}
    </Provider>
  )
}
`

const POLYFILLS_TEMPLATE = `// AI SDK polyfills for the React Native runtime. Import this file first in your entry file.
import { Platform } from 'react-native'

if (Platform.OS !== 'web') {
  const g = globalThis as Record<string, unknown>
  if (typeof g.structuredClone !== 'function') g.structuredClone = require('@ungap/structured-clone').default
  if (typeof g.TextEncoderStream !== 'function' || typeof g.TextDecoderStream !== 'function') {
    const { TextEncoderStream, TextDecoderStream } = require('@stardazed/streams-text-encoding')
    g.TextEncoderStream = TextEncoderStream
    g.TextDecoderStream = TextDecoderStream
  }
}
`
