import { Suspense } from 'react'
import { PlaygroundPage } from '@/components/playground/PlaygroundPage'
import { manifest } from '@ondai/registry/manifest'
import { PlaygroundNav } from '@/components/playground/PlaygroundNav'
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
  return (
    <>
      <SiteHeader />
      <div className="wrap flex gap-10 pt-24 pb-16">
        <aside className="sticky top-24 hidden max-h-[calc(100vh-120px)] w-[200px] shrink-0 self-start overflow-y-auto pb-8 lg:block">
          <PlaygroundNav current={name} />
        </aside>
        <main className="min-w-0 flex-1">
          <Suspense fallback={null}>
            <PlaygroundPage name={name} />
          </Suspense>
        </main>
      </div>
      <SiteFooter />
    </>
  )
}
