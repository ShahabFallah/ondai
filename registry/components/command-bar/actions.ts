import { z } from 'zod'
import type { ToolRisk } from '@ondai/core'

export interface CommandAction<P extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>> {
  id: string
  title: string
  description?: string
  /** Extra words users might type. */
  keywords?: string[]
  /** `actions` (do something), `screens` (navigate), `items` (open a record). */
  group?: 'actions' | 'screens' | 'items'
  /** Lucide icon name or any React node is resolved by the component. */
  icon?: string
  risk?: ToolRisk
  /** Parameters the model should extract. Keep them flat with enums. */
  params?: P
  run: (params: z.infer<P>) => void | Promise<unknown> | string
  /** Optional preview text shown before running (e.g. "Create task · Buy milk · tomorrow"). */
  preview?: (params: z.infer<P>) => string
}

/** Typed helper that keeps `run` parameters inferred from `params`. */
export function defineAction<P extends z.ZodObject<z.ZodRawShape>>(action: CommandAction<P>): CommandAction<P> {
  return action
}

export function defineActions(actions: Array<CommandAction<any>>): Array<CommandAction<any>> {
  const ids = new Set<string>()
  for (const a of actions) {
    if (ids.has(a.id)) throw new Error(`[ondai] duplicate action id "${a.id}"`)
    ids.add(a.id)
  }
  return actions
}

/** Turn expo-router style routes into navigation actions. */
export function routesToActions(routes: Array<{ href: string; title: string; keywords?: string[] }>, navigate: (href: string) => void): Array<CommandAction<any>> {
  return routes.map((r) => ({ id: `route:${r.href}`, title: r.title, keywords: r.keywords, group: 'screens', risk: 'low', run: () => navigate(r.href) }))
}

export const emptyParams = z.object({})
