import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Gallery } from '@/components/playground/Gallery'
import { catalogGroups } from '@/components/playground/catalog'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export const metadata = { title: 'Playground', description: 'Every Ondai component on a scripted on-device model: switch its state, theme, accent and device, then copy the code.' }

// Thumbnails are real renders written by scripts/thumbs.mjs. A component without one gets its title on the stage.
const thumbsDir = [join(process.cwd(), 'public', 'thumbs'), join(process.cwd(), 'apps', 'web', 'public', 'thumbs')].find((d) => existsSync(d))

export default function PlaygroundIndex() {
  const groups = catalogGroups()
  const names = groups.flatMap((g) => g.items.map((m) => m.name))
  const thumbs = names.filter((n) => !!thumbsDir && existsSync(join(thumbsDir, `${n}.png`)))

  return (
    <>
      <SiteHeader />
      <main className="wrap pt-24 pb-24">
        <header className="mb-10 max-w-[40rem] pt-6 sm:pt-10">
          <h1 className="ui-title">Playground</h1>
          <p className="ui-sub mt-3">{names.length} components, all alive. Pick one and poke every state.</p>
        </header>
        <Gallery groups={groups} thumbs={thumbs} />
      </main>
      <SiteFooter />
    </>
  )
}
