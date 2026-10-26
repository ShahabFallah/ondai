import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

export const itemSchema = z.object({
  name: z.string(),
  type: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  devDependencies: z.array(z.string()).default([]),
  registryDependencies: z.array(z.string()).default([]),
  files: z.array(z.object({ path: z.string(), type: z.string(), target: z.string().optional(), content: z.string().optional() })),
  docs: z.string().optional(),
  categories: z.array(z.string()).optional(),
  meta: z.any().optional(),
})
export type RegistryItem = z.infer<typeof itemSchema>

export const indexSchema = z.object({ name: z.string(), homepage: z.string().optional(), items: z.array(itemSchema.omit({ files: true }).extend({ files: z.array(z.object({ path: z.string(), type: z.string(), target: z.string().optional() })) })) })
export type RegistryIndex = z.infer<typeof indexSchema>

export function resolveRegistryUrl(flag: string | undefined, configured: string | undefined, fallback: string): string {
  return (flag ?? process.env.ONDAI_REGISTRY ?? configured ?? fallback).replace(/\/$/, '')
}

export async function fetchJson(url: string): Promise<unknown> {
  if (url.startsWith('file:')) return JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

export async function fetchIndex(registry: string): Promise<RegistryIndex> {
  return indexSchema.parse(await fetchJson(`${registry}/registry.json`))
}

export async function fetchItem(registry: string, name: string): Promise<RegistryItem> {
  return itemSchema.parse(await fetchJson(`${registry}/${name}.json`))
}

/** Resolve an item plus its registry dependencies, depth-first, deduplicated, dependencies first. */
export async function resolveTree(registry: string, names: string[]): Promise<RegistryItem[]> {
  const out: RegistryItem[] = []
  const seen = new Set<string>()
  const visit = async (name: string, chain: string[]) => {
    if (seen.has(name)) return
    if (chain.includes(name)) throw new Error(`Circular registryDependencies: ${[...chain, name].join(' → ')}`)
    const item = await fetchItem(registry, name)
    for (const dep of item.registryDependencies) await visit(dep, [...chain, name])
    seen.add(name)
    out.push(item)
  }
  for (const n of names) await visit(n, [])
  return out
}
