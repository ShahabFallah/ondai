import { notFound } from 'next/navigation'
import { demos, type DemoName } from '@/components/site/demos'
import { CaptureStage } from './CaptureStage'

// A bare stage for recording the landing page reels (scripts/record-reels.mjs). Not linked anywhere.
export const metadata = { title: 'Capture', robots: { index: false, follow: false } }

export default async function Page({ params, searchParams }: { params: Promise<{ name: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { name } = await params
  const sp = await searchParams
  if (!(name in demos)) notFound()
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k])
  const theme = one('theme') === 'dark' ? 'dark' : 'light'
  const width = Number(one('w')) || 380
  return <CaptureStage name={name as DemoName} theme={theme} width={width} />
}
