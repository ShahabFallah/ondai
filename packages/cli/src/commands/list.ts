import { DEFAULT_REGISTRY, readConfig } from '../config'
import { fetchIndex, resolveRegistryUrl } from '../registry'
import { dim, mono, title } from '../ui'

export async function list(opts: { cwd: string; registry?: string; json?: boolean }) {
  const config = readConfig(opts.cwd)
  const registry = resolveRegistryUrl(opts.registry, config?.registry, DEFAULT_REGISTRY)
  const index = await fetchIndex(registry)
  if (opts.json) {
    console.log(JSON.stringify(index.items, null, 2))
    return index
  }
  console.log(title(`${index.items.length} components ${dim(registry)}`))
  const groups = new Map<string, typeof index.items>()
  for (const it of index.items) {
    const g = it.categories?.[0] ?? 'other'
    groups.set(g, [...(groups.get(g) ?? []), it])
  }
  for (const [g, items] of groups) {
    console.log(`${dim(g.toUpperCase())}`)
    for (const it of items) console.log(`  ${mono(it.name.padEnd(20))} ${it.description ?? ''}`)
  }
  console.log()
  return index
}
