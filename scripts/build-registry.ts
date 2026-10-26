/**
 * Builds the component registry:
 *  - validates every registry/components/<name>/meta.json
 *  - enforces the import allowlist and reanimated dependency arrays (copy-paste safety, web safety)
 *  - emits registry/registry.json, apps/web/public/r/<name>.json (shadcn registry-item format),
 *    registry/generated/playgrounds.ts and registry/generated/manifest.ts
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import ts from 'typescript'
import { z } from 'zod'

const root = resolve(import.meta.dirname, '..')
const componentsDir = join(root, 'registry', 'components')
const outDir = join(root, 'apps', 'web', 'public', 'r')
const genDir = join(root, 'registry', 'generated')

const metaSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  description: z.string(),
  category: z.enum(['primitive', 'agentic', 'input', 'text', 'organize', 'search', 'vision', 'voice', 'feed']),
  priority: z.enum(['P0', 'P1', 'P2']),
  capabilities: z.array(z.enum(['text', 'structured', 'tools', 'vision', 'embeddings', 'transcription', 'speech'])),
  variants: z.record(z.string(), z.array(z.string())).default({}),
  dependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).default([]),
  files: z.array(z.string()).min(1),
  docs: z.string().optional(),
  /** Token budget + long-input strategy, shown in docs. */
  budget: z.object({ input: z.number(), strategy: z.string() }).optional(),
  runsOn: z.array(z.enum(['apple', 'nano', 'llama', 'cloud'])).optional(),
})
type Meta = z.infer<typeof metaSchema>

const allowlist = new Set([
  'react',
  'react-native',
  'react-native-reanimated',
  'react-native-svg',
  'lucide-react-native',
  'expo-haptics',
  'expo-blur',
  'expo-clipboard',
  'expo-image-picker',
  'zod',
  'react-hook-form',
  '@ondai/core',
  '@ondai/tokens',
])
const reanimatedHooks = new Set(['useAnimatedStyle', 'useDerivedValue', 'useAnimatedProps', 'useAnimatedReaction'])

interface Problem {
  file: string
  message: string
}

function packageOf(specifier: string): string {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/')
  return specifier.split('/')[0]!
}

function checkFile(dir: string, file: string, meta: Meta, problems: Problem[]): Set<string> {
  const path = join(dir, file)
  const src = readFileSync(path, 'utf8')
  const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const deps = new Set<string>()
  const visit = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text
      if (spec.startsWith('.')) {
        const m = spec.match(/^\.\.\/([a-z0-9-]+)\//)
        if (spec.startsWith('../')) {
          if (!m) problems.push({ file, message: `relative import must be ./x or ../<component>/x: ${spec}` })
          else if (!meta.registryDependencies.includes(m[1]!)) problems.push({ file, message: `imports ../${m[1]} but meta.registryDependencies does not list it` })
        }
      } else {
        const pkg = packageOf(spec)
        if (!allowlist.has(pkg)) problems.push({ file, message: `import "${spec}" is not in the registry allowlist` })
        deps.add(pkg)
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && reanimatedHooks.has(node.expression.text)) {
      if (node.arguments.length < 2) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart())
        problems.push({ file, message: `${node.expression.text} at line ${line + 1} needs an explicit dependency array (web without the worklets Babel plugin)` })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return deps
}

const names = readdirSync(componentsDir).filter((n) => existsSync(join(componentsDir, n, 'meta.json')))
const items: Array<Record<string, unknown>> = []
const problems: Problem[] = []
const playgroundEntries: string[] = []
const manifest: Array<Meta & { hasPlayground: boolean }> = []

for (const name of names.sort()) {
  const dir = join(componentsDir, name)
  const raw = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'))
  const parsed = metaSchema.safeParse(raw)
  if (!parsed.success) {
    problems.push({ file: `${name}/meta.json`, message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') })
    continue
  }
  const meta = parsed.data
  if (meta.name !== name) problems.push({ file: `${name}/meta.json`, message: `name "${meta.name}" does not match folder` })
  const deps = new Set<string>()
  for (const f of meta.files) {
    if (!existsSync(join(dir, f))) {
      problems.push({ file: `${name}/${f}`, message: 'listed in meta.files but missing' })
      continue
    }
    if (/\.(test|stories|demo)\.tsx?$/.test(f) || f.startsWith('playground')) problems.push({ file: `${name}/${f}`, message: 'test/story/demo/playground files must not be installed' })
    for (const d of checkFile(dir, f, meta, problems)) deps.add(d)
  }
  for (const r of meta.registryDependencies) if (!names.includes(r)) problems.push({ file: `${name}/meta.json`, message: `registryDependencies "${r}" does not exist` })
  deps.delete('react')
  deps.delete('react-native')
  const dependencies = meta.dependencies ?? [...deps].sort()
  const files = meta.files.map((f) => {
    const content = readFileSync(join(dir, f), 'utf8')
    return { path: `registry/components/${name}/${f}`, type: f === 'index.ts' ? 'registry:lib' : f.startsWith('use-') ? 'registry:hook' : 'registry:component', target: `components/ondai/${name}/${f}`, content }
  })
  const hash = createHash('sha256').update(files.map((f) => f.content).join('\n')).digest('hex').slice(0, 16)
  const hasPlayground = existsSync(join(dir, 'playground.ts')) || existsSync(join(dir, 'playground.tsx'))
  items.push({
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name,
    type: 'registry:component',
    title: meta.title,
    description: meta.description,
    dependencies,
    registryDependencies: meta.registryDependencies,
    files,
    docs: meta.docs,
    categories: [meta.category],
    meta: { ondai: { registryVersion: 1, hash, priority: meta.priority, capabilities: meta.capabilities, variants: meta.variants, budget: meta.budget, runsOn: meta.runsOn } },
  })
  if (hasPlayground) playgroundEntries.push(`  '${name}': () => import('../components/${name}/playground'),`)
  manifest.push({ ...meta, dependencies, hasPlayground })
}

if (problems.length) {
  console.error('Registry build failed:')
  for (const p of problems) console.error(`  ${p.file}: ${p.message}`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
mkdirSync(genDir, { recursive: true })
for (const item of items) writeFileSync(join(outDir, `${item.name}.json`), JSON.stringify(item, null, 2) + '\n')
const index = {
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: 'ondai',
  homepage: 'https://ondai.dev',
  items: items.map(({ files, ...rest }) => ({ ...rest, files: (files as Array<{ path: string; type: string; target: string }>).map(({ path, type, target }) => ({ path, type, target })) })),
}
writeFileSync(join(root, 'registry', 'registry.json'), JSON.stringify(index, null, 2) + '\n')
writeFileSync(join(outDir, 'registry.json'), JSON.stringify(index, null, 2) + '\n')
writeFileSync(
  join(genDir, 'playgrounds.ts'),
  `// Generated by scripts/build-registry.ts. Do not edit.\nimport type { PlaygroundDef } from '@ondai/playground'\n\nexport const playgrounds = {\n${playgroundEntries.join('\n')}\n} as const satisfies Record<string, () => Promise<{ default: PlaygroundDef<any, any> }>>\n\nexport type PlaygroundName = keyof typeof playgrounds\n`,
)
writeFileSync(
  join(genDir, 'manifest.ts'),
  `// Generated by scripts/build-registry.ts. Do not edit.\nexport interface ManifestEntry {\n  name: string\n  title: string\n  description: string\n  category: string\n  priority: 'P0' | 'P1' | 'P2'\n  capabilities: string[]\n  variants: Record<string, string[]>\n  dependencies: string[]\n  registryDependencies: string[]\n  files: string[]\n  hasPlayground: boolean\n  budget?: { input: number; strategy: string }\n  runsOn?: string[]\n}\n\nexport const manifest: ManifestEntry[] = ${JSON.stringify(manifest.map(({ docs: _d, ...m }) => m), null, 2)}\n`,
)
console.log(`registry: ${items.length} components → ${relative(root, outDir)}, ${relative(root, genDir)}`)
