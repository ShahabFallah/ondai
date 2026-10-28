import ReviewClient from '@/components/review/ReviewClient'
import { SiteHeader } from '@/components/site/SiteHeader'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Review grid', description: 'Every Ondai component in every review state, Void and Paper.' }

const params = ['component=key-hint', 'theme=paper', 'motion=off', 'clock=manual']

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k])
  return (
    <>
      <SiteHeader />
      <main className="wrap min-h-screen pt-28 pb-24">
        <header className="mb-10 max-w-[64ch]">
          <h1 className="text-[clamp(30px,3.2vw,38px)] leading-[1.1] font-semibold tracking-[-0.03em] text-[color:var(--fg)]">Review grid</h1>
          <p className="mt-3 text-[16.5px] leading-[1.55] text-[color:var(--fg-2)]">Every component, every review state. Void and Paper, side by side.</p>
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] text-[color:var(--fg-2)]">Filter in the URL</span>
            {params.map((p) => (
              <code key={p} className="inline-flex h-6 items-center rounded-[var(--r-xs)] bg-[var(--hover)] px-2 font-mono text-[12px] text-[color:var(--fg-2)] shadow-[inset_0_0_0_1px_var(--line)]">
                {p}
              </code>
            ))}
          </div>
        </header>
        <ReviewClient component={one('component')} theme={one('theme')} motion={one('motion')} clock={one('clock')} />
      </main>
    </>
  )
}
