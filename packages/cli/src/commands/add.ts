import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import * as p from '@clack/prompts'
import { DEFAULT_REGISTRY, readConfig } from '../config'
import { detectPackageManager, detectProject, installCommand, runCommand } from '../project'
import { resolveRegistryUrl, resolveTree, type RegistryItem } from '../registry'
import { dim, fail, mono, ok, title, warn } from '../ui'

export interface AddOptions {
  cwd: string
  names: string[]
  registry?: string
  overwrite?: boolean
  yes?: boolean
  dryRun?: boolean
  install?: boolean
}

export function targetPath(item: RegistryItem, file: RegistryItem['files'][number], componentsDir: string): string {
  const target = file.target ?? `components/ondai/${item.name}/${file.path.split('/').pop()}`
  return target.replace(/^components\/ondai/, componentsDir)
}

export async function add(opts: AddOptions): Promise<{ written: string[]; skipped: string[]; installed: string[] }> {
  console.log(title(`add ${opts.names.join(' ')}`))
  const config = readConfig(opts.cwd)
  if (!config) console.log(warn(`no ondai.json; using defaults (run ${mono(runCommand(detectPackageManager(opts.cwd), 'ondai init'))} to configure)`))
  const componentsDir = config?.componentsDir ?? 'components/ondai'
  const registry = resolveRegistryUrl(opts.registry, config?.registry, DEFAULT_REGISTRY)
  const items = await resolveTree(registry, opts.names)
  const written: string[] = []
  const skipped: string[] = []
  const deps = new Set<string>()
  for (const item of items) {
    for (const d of item.dependencies) deps.add(d)
    for (const f of item.files) {
      if (f.content === undefined) continue
      const rel = targetPath(item, f, componentsDir)
      const abs = join(opts.cwd, rel)
      if (existsSync(abs) && readFileSync(abs, 'utf8') === f.content) {
        skipped.push(rel)
        continue
      }
      if (existsSync(abs) && !opts.overwrite) {
        if (opts.yes || opts.dryRun) {
          skipped.push(rel)
          console.log(warn(`${rel} exists (use --overwrite)`))
          continue
        }
        const answer = await p.confirm({ message: `${rel} exists and differs. Overwrite?`, initialValue: false })
        if (p.isCancel(answer) || !answer) {
          skipped.push(rel)
          continue
        }
      }
      if (!opts.dryRun) {
        mkdirSync(dirname(abs), { recursive: true })
        writeFileSync(abs, f.content)
      }
      written.push(rel)
      console.log(ok(`${opts.dryRun ? 'would write' : 'wrote'} ${mono(rel)}`))
    }
    if (item.docs) console.log(dim(`  ${item.title ?? item.name}: ${item.docs}`))
  }
  let installed: string[] = []
  const project = detectProject(opts.cwd)
  const missing = [...deps].filter((d) => !(d.replace(/@[\^~]?[\d.]+.*$/, '') in project.deps))
  if (missing.length && opts.install !== false && !opts.dryRun) {
    const cmd = installCommand(project.pm, missing, { expo: project.isExpo })
    console.log(dim(`$ ${cmd.join(' ')}`))
    const r = spawnSync(cmd[0]!, cmd.slice(1), { cwd: opts.cwd, stdio: 'inherit' })
    if (r.status === 0) installed = missing
    else console.log(fail('install failed; run the command above manually'))
  } else if (missing.length) {
    console.log(dim(`dependencies to install: ${missing.join(' ')}`))
  }
  console.log(`\n${ok(`${written.length} file(s) ${opts.dryRun ? 'planned' : 'written'}, ${skipped.length} unchanged`)}`)
  return { written, skipped, installed }
}
