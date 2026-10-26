import { Suspense } from 'react'
import { PlaygroundPage } from '@/components/playground/PlaygroundPage'
import { manifest } from '@ondai/registry/manifest'
import { PlaygroundNav } from '@/components/playground/PlaygroundNav'

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
  return (
    <div className="flex min-h-screen">
      {!embed ? <PlaygroundNav current={name} /> : null}
      <div className="flex-1 min-w-0">
        <Suspense fallback={null}>
          <PlaygroundPage name={name} />
        </Suspense>
      </div>
    </div>
  )
}
