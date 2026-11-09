import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Still } from './Still'
import { scenes } from './scenes'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Composition stage for the site's stills (not linked anywhere). Each scene lays real registry components,
 * rendered through the playground embed, over a generated photograph; `scripts/render-stills.mjs`
 * screenshots it at 2x into `public/img/stills/`. `?theme=light|dark` picks the photograph and the
 * components' palette.
 */
export default async function StillPage({ params, searchParams }: { params: Promise<{ scene: string }>; searchParams: Promise<{ theme?: string }> }) {
  const { scene } = await params
  const { theme } = await searchParams
  const def = scenes[scene]
  if (!def) notFound()
  return <Still scene={def} dark={theme === 'dark'} />
}
