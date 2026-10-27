import ReviewClient from '@/components/review/ReviewClient'
import { SiteHeader } from '@/components/site/SiteHeader'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Review grid', description: 'Every Ondai component in every review state, Void and Paper.' }

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k])
  return (
    <>
      <SiteHeader />
      <main className="wrap min-h-screen pt-10 pb-16">
        <header className="mb-8 max-w-[64ch]">
          <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Review grid</h1>
          <p className="lead mt-2 text-[16px]">Every component in every review state, in Void and Paper. Filter with component, theme, motion and clock in the URL.</p>
        </header>
        <ReviewClient component={one('component')} theme={one('theme')} motion={one('motion')} clock={one('clock')} />
      </main>
    </>
  )
}
