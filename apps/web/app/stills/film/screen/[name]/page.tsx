import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FilmScreenLoader } from './FilmScreenLoader'

export const metadata: Metadata = { title: 'Film screen', robots: { index: false, follow: false } }

const NAMES = ['command-bar', 'agent-run', 'semantic-search', 'voice-memo']

/**
 * What the phone in the film (../../Film.tsx) shows: one registry component on the scripted mock, labelled
 * as the on-device model it stands in for. Not linked anywhere. `?theme=paper|void&state=<state>`; the film
 * moves it on with `{ type: 'ondai:state', value }` messages, like the playground embed.
 */
export default async function FilmScreenPage({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<{ theme?: string; state?: string }> }) {
  const { name } = await params
  const { theme, state } = await searchParams
  if (!NAMES.includes(name)) notFound()
  return <FilmScreenLoader name={name} theme={theme === 'void' ? 'void' : 'paper'} state={state ?? 'idle'} />
}
