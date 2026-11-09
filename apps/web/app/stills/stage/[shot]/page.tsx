import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Shot } from '@/components/stage/shots/Shot'
import { shotNames } from '@/components/stage/shots/names'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Stageshow compositions for the site's pictures (not linked anywhere): faux product UI built with the
 * stage kit in `components/stage/kit`. `scripts/render-hero.mjs` screenshots each shot at 2x into
 * `public/img/stills/`. `?theme=light|dark` picks the look.
 */
export default async function StageShotPage({ params, searchParams }: { params: Promise<{ shot: string }>; searchParams: Promise<{ theme?: string }> }) {
  const { shot } = await params
  const { theme } = await searchParams
  if (!shotNames.includes(shot)) notFound()
  return <Shot name={shot} dark={theme === 'dark'} />
}
