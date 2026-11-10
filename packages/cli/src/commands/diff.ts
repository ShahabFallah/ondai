import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createTwoFilesPatch } from 'diff'
import { DEFAULT_REGISTRY, readConfig } from '../config'
import { fetchItem, resolveRegistryUrl } from '../registry'
import { targetPath } from './add'
import { dim, ok, title, warn } from '../ui'

export async function diff(opts: { cwd: string; name: string; registry?: string }): Promise<string[]> {
  const config = readConfig(opts.cwd)
  const componentsDir = config?.componentsDir ?? 'components/ondai'
  const registry = resolveRegistryUrl(opts.registry, config?.registry, DEFAULT_REGISTRY)
  const item = await fetchItem(registry, opts.name)
  console.log(title(`diff ${opts.name}`))
  const patches: string[] = []
  for (const f of item.files) {
    const rel = targetPath(item, f, componentsDir)
    const abs = join(opts.cwd, rel)
    if (!existsSync(abs)) {
      console.log(warn(`${rel} is not installed`))
      continue
    }
    const local = readFileSync(abs, 'utf8')
    if (local === f.content) {
      console.log(ok(`${rel} ${dim('up to date')}`))
      continue
    }
    const patch = createTwoFilesPatch(`local/${rel}`, `registry/${rel}`, local, f.content ?? '')
    patches.push(patch)
    console.log(patch)
  }
  return patches
}
