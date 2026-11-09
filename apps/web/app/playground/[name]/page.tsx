import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { PlaygroundPage } from '@/components/playground/PlaygroundPage'
import { manifest } from '@ondai/registry/manifest'

/**
 * Only the embed survives: docs previews (components/docs/ComponentPreview.tsx) and scripts/thumbs.mjs
 * render `/playground/<name>?embed=1`. Without `embed` the URL goes to the component's docs page.
 */
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const m = manifest.find((x) => x.name === name)
  return { title: m ? `${m.title} preview` : 'Preview', description: m?.description, robots: { index: false } }
}

export function generateStaticParams() {
  return manifest.filter((m) => m.hasPlayground).map((m) => ({ name: m.name }))
}

export default async function Page({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { name } = await params
  const sp = await searchParams
  const embed = sp.embed === '1' || sp.embed === 'true'
  if (!embed) redirect(manifest.some((m) => m.name === name) ? `/docs/components/${name}` : '/docs/components')
  return (
    <Suspense fallback={null}>
      <PlaygroundPage name={name} />
    </Suspense>
  )
}
