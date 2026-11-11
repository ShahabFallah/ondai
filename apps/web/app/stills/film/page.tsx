import type { Metadata } from 'next'
import { Film } from './Film'

export const metadata: Metadata = { title: 'Film', robots: { index: false, follow: false } }

/**
 * The product film (not linked anywhere): a phone rises, the on-device models' marks orbit it, and four real
 * registry components work on its screen through the playground embed. A fixed 1600 × 900 stage scaled to the
 * window. `?theme=light|dark`; `?manual=1` waits for `window.__filmStart()` (scripts/record-film.mjs records it
 * into assets/film/). Without `manual` it starts once the four components have loaded.
 */
export default async function FilmPage({ searchParams }: { searchParams: Promise<{ theme?: string; manual?: string }> }) {
  const { theme, manual } = await searchParams
  return <Film dark={theme === 'dark'} manual={manual === '1'} />
}
