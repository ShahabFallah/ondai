import Link from 'next/link'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { manifest, type ManifestEntry } from '@ondai/registry/manifest'
import { categoryOrder } from '@/components/playground/PlaygroundNav'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export const metadata = { title: 'Playground', description: 'Every Ondai component on a scripted on-device model: switch its state, theme, accent and device, then copy the code.' }

// Thumbnails are real renders written by scripts/thumbs.mjs. A component without one gets its title on the stage.
const thumbsDir = [join(process.cwd(), 'public', 'thumbs'), join(process.cwd(), 'apps', 'web', 'public', 'thumbs')].find((d) => existsSync(d))
const hasThumb = (name: string) => !!thumbsDir && existsSync(join(thumbsDir, `${name}.png`))

function GalleryCard({ m }: { m: ManifestEntry }) {
  return (
    <Link href={`/playground/${m.name}`} className="card flex flex-col p-2" aria-label={`${m.title} playground`}>
      <div className="stage flex aspect-[16/10] items-center justify-center">
        {hasThumb(m.name) ? (
          <img src={`/thumbs/${m.name}.png`} alt="" width={960} height={600} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="h3 text-[color:var(--ondai-text-secondary)]">{m.title}</span>
        )}
      </div>
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-[15px] font-medium">{m.title}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[color:var(--ondai-text-secondary)]">{m.description}</p>
      </div>
    </Link>
  )
}

export default function PlaygroundIndex() {
  const items = manifest.filter((m) => m.hasPlayground)
  const known = categoryOrder.map(([id]) => id)
  const extra = [...new Set(items.map((m) => m.category))].filter((c) => !known.includes(c)).map((c) => [c, c.charAt(0).toUpperCase() + c.slice(1)] as [string, string])
  const groups = [...categoryOrder, ...extra].map(([id, title]) => ({ id, title, items: items.filter((m) => m.category === id) })).filter((g) => g.items.length)

  return (
    <>
      <SiteHeader />
      <main className="wrap pt-24 pb-24">
        <header className="max-w-[64ch]">
          <h1 className="h2">Playground</h1>
          <p className="lead mt-3">
            All {items.length} components on a scripted on-device model. Open one to switch its state, theme, accent and device, and copy the code for the look you land on.
          </p>
        </header>
        {groups.map((g) => (
          <section key={g.id} className="mt-12" aria-labelledby={`cat-${g.id}`}>
            <div className="mb-4 flex items-baseline gap-3">
              <h2 id={`cat-${g.id}`} className="text-[15px] font-medium">
                {g.title}
              </h2>
              <span className="label">{g.items.length === 1 ? '1 component' : `${g.items.length} components`}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((m) => (
                <GalleryCard key={m.name} m={m} />
              ))}
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  )
}
