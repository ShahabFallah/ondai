import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { detectPackageManager, detectProject, runCommand } from '../project'
import { dim, fail, mono, ok, title, warn } from '../ui'

export interface Check {
  name: string
  status: 'ok' | 'warn' | 'fail'
  detail: string
}

function major(range: string | undefined): number | undefined {
  const m = range?.match(/(\d+)/)
  return m ? Number(m[1]) : undefined
}

export function runDoctor(cwd: string): Check[] {
  const checks: Check[] = []
  const node = process.versions.node
  checks.push({ name: 'Node', status: Number(node.split('.')[0]) >= 22 ? 'ok' : 'fail', detail: `${node} (Expo SDK 58 / RN 0.88 need 22.13+)` })
  let project
  try {
    project = detectProject(cwd)
  } catch (e) {
    checks.push({ name: 'Project', status: 'fail', detail: String((e as Error).message) })
    return checks
  }
  const d = project.deps
  checks.push({ name: 'Project', status: 'ok', detail: project.isExpo ? `Expo ${project.expoSdk}` : project.isBare ? `React Native ${project.reactNative}` : 'unknown' })
  const rn = d['react-native']
  checks.push({ name: 'React Native', status: rn ? 'ok' : 'fail', detail: rn ? `${rn} ${dim('(providers need 0.76+ and the New Architecture)')}` : 'missing' })
  checks.push({ name: '@ondai/core', status: d['@ondai/core'] ? 'ok' : 'fail', detail: d['@ondai/core'] ?? `missing — run ${mono(runCommand(detectPackageManager(cwd), 'ondai init'))}` })
  const ai = d.ai
  checks.push({ name: 'ai (Vercel AI SDK)', status: !ai ? 'fail' : major(ai) === 6 ? 'ok' : 'warn', detail: ai ? `${ai} ${major(ai) === 6 ? '' : dim('(@react-native-ai 0.12 needs v6)')}` : 'missing' })
  checks.push({ name: 'Reanimated 4 + worklets', status: d['react-native-reanimated'] && d['react-native-worklets'] ? 'ok' : 'warn', detail: `${d['react-native-reanimated'] ?? 'missing'} / ${d['react-native-worklets'] ?? 'missing'}` })
  checks.push({ name: 'Apple provider', status: d['@react-native-ai/apple'] ? 'ok' : 'warn', detail: d['@react-native-ai/apple'] ?? 'not installed (iOS 26 on-device model)' })
  checks.push({ name: 'Gemini Nano provider', status: d['@react-native-ai/adk'] ? 'ok' : 'warn', detail: d['@react-native-ai/adk'] ?? 'not installed (Android 14+ with AICore)' })
  checks.push({ name: 'Polyfills', status: d['@ungap/structured-clone'] && d['@stardazed/streams-text-encoding'] ? 'ok' : 'fail', detail: d['@ungap/structured-clone'] ? 'installed' : 'missing @ungap/structured-clone / @stardazed/streams-text-encoding' })
  if (project.isExpo) {
    const appJsonPath = ['app.json', 'app.config.json'].map((f) => join(cwd, f)).find(existsSync)
    if (appJsonPath) {
      const app = JSON.parse(readFileSync(appJsonPath, 'utf8'))
      const expo = app.expo ?? app
      checks.push({ name: 'New Architecture', status: expo.newArchEnabled === false ? 'fail' : 'ok', detail: expo.newArchEnabled === false ? 'newArchEnabled is false' : 'enabled (SDK 53+ default)' })
      const plugins: unknown[] = expo.plugins ?? []
      const bp = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-build-properties') as [string, { android?: { minSdkVersion?: number } }] | undefined
      const minSdk = bp?.[1]?.android?.minSdkVersion
      checks.push({ name: 'Android minSdkVersion', status: minSdk && minSdk >= 26 ? 'ok' : 'warn', detail: minSdk ? String(minSdk) : 'not set (Gemini Nano needs 26 via expo-build-properties)' })
      checks.push({ name: 'Dev client', status: d['expo-dev-client'] ? 'ok' : 'warn', detail: d['expo-dev-client'] ? 'installed' : 'missing (Expo Go cannot load native providers)' })
    }
  }
  checks.push({ name: 'ondai.json', status: existsSync(join(cwd, 'ondai.json')) ? 'ok' : 'warn', detail: existsSync(join(cwd, 'ondai.json')) ? 'found' : `missing — run ${mono(runCommand(detectPackageManager(cwd), 'ondai init'))}` })
  return checks
}

export function doctor(cwd: string): Check[] {
  console.log(title('doctor'))
  const checks = runDoctor(cwd)
  for (const c of checks) console.log(`${c.status === 'ok' ? ok(c.name) : c.status === 'warn' ? warn(c.name) : fail(c.name)} ${dim('·')} ${c.detail}`)
  const fails = checks.filter((c) => c.status === 'fail').length
  console.log(`\n${fails ? fail(`${fails} problem(s)`) : ok('all good')}\n`)
  return checks
}
