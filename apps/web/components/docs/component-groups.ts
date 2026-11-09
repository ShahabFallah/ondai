import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { manifest } from '@ondai/registry/manifest'
import meta from '@/content/docs/components/meta.json'
import { COMPONENT_LINES } from '@/lib/component-lines'
import { displayTitle, GROUPS, groupOf, isAiComponent, type GroupId } from '@/lib/ai-components'

/**
 * Every AI component with a docs page, in the sidebar's order (content/docs/components/meta.json; anything
 * missing from it goes last). Core UI stays in the registry but is not listed on the site. Server only: the
 * thumbnails and loops are checked on disk (scripts/thumbs.mjs and scripts/loops.mjs write them).
 */

export type ComponentEntry = { name: string; title: string; line: string; thumb: boolean; loop: boolean }
export type ComponentGroup = { id: GroupId; title: string; items: ComponentEntry[] }

const thumbsDir = [join(process.cwd(), 'public', 'thumbs'), join(process.cwd(), 'apps', 'web', 'public', 'thumbs')].find((d) => existsSync(d))
const hasThumb = (name: string) => !!thumbsDir && existsSync(join(thumbsDir, 'light', `${name}.webp`)) && existsSync(join(thumbsDir, 'dark', `${name}.webp`))
const loopsDir = thumbsDir && join(thumbsDir, '..', 'loops')
const hasLoop = (name: string) => !!loopsDir && existsSync(join(loopsDir, 'light', `${name}.mp4`)) && existsSync(join(loopsDir, 'dark', `${name}.mp4`))

export function getComponentGroups(): ComponentGroup[] {
  const order = meta.pages.filter((p) => !p.startsWith('---') && !p.startsWith('['))
  const rank = (name: string) => {
    const i = order.indexOf(name)
    return i === -1 ? order.length : i
  }
  const all = manifest.filter((m) => m.hasPlayground && isAiComponent(m)).sort((a, b) => rank(a.name) - rank(b.name))
  const toItem = (m: (typeof all)[number]): ComponentEntry => ({
    name: m.name,
    title: displayTitle(m.title),
    line: COMPONENT_LINES[m.name] ?? `${m.description.split(/[.:]/)[0]}.`,
    thumb: hasThumb(m.name),
    loop: hasLoop(m.name),
  })
  // Grouped by what they do (lib/ai-components.ts GROUPS), each in the sidebar's order.
  return GROUPS.map((g) => ({ id: g.id, title: g.title, items: all.filter((m) => groupOf(m.category) === g.id).map(toItem) })).filter((g) => g.items.length)
}
