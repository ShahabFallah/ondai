import ReviewClient from '@/components/review/ReviewClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Review grid', description: 'Every Ondai component in every review state, Void and Paper.' }

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k])
  return (
    <main className="min-h-screen bg-[color:var(--ondai-bg)] p-8 lg:p-12">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-[24px] font-medium tracking-tight">Review</h1>
        <p className="text-[13px] text-[color:var(--ondai-text-secondary)]">Every component, every review state, in Void and Paper. Add ?component=name, ?theme=void|paper|glass, ?motion=off, ?clock=manual.</p>
      </header>
      <ReviewClient component={one('component')} theme={one('theme')} motion={one('motion')} clock={one('clock')} />
    </main>
  )
}
