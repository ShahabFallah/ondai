import { Suspense } from 'react'
import { PlaygroundPage } from '@/components/playground/PlaygroundPage'
import { manifest } from '@ondai/registry/manifest'
import { PlaygroundNav } from '@/components/playground/PlaygroundNav'
import { catalogGroups } from '@/components/playground/catalog'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const m = manifest.find((x) => x.name === name)
  return { title: m ? `${m.title} playground` : 'Playground', description: m?.description }
}

export function generateStaticParams() {
  return manifest.filter((m) => m.hasPlayground).map((m) => ({ name: m.name }))
}

export default async function Page({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { name } = await params
  const sp = await searchParams
  const embed = sp.embed === '1' || sp.embed === 'true'
  if (embed) {
    return (
      <Suspense fallback={null}>
        <PlaygroundPage name={name} />
      </Suspense>
    )
  }
  const groups = catalogGroups()
  const flat = groups.flatMap((g) => g.items.map((m) => ({ ...m, group: g.title })))
  const at = flat.findIndex((m) => m.name === name)
  const here = flat[at]
  const link = (m?: { name: string; title: string }) => (m ? { name: m.name, title: m.title } : undefined)
  const meta = here ? { line: here.line, category: here.group, prev: link(flat[at - 1]), next: link(flat[at + 1]) } : undefined
  return (
    <>
      <SiteHeader />
      <div className="wrap flex gap-12 pt-24 pb-16">
        <PlaygroundNav current={name} groups={groups} />
        <main className="min-w-0 flex-1 pt-4">
          <Suspense fallback={null}>
            <PlaygroundPage name={name} meta={meta} />
          </Suspense>
        </main>
      </div>
      <SiteFooter />
    </>
  )
}
