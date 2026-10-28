import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SiteHeader } from '@/components/site/SiteHeader'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="wrap flex min-h-[100dvh] flex-1 flex-col items-center justify-center pt-24 pb-20 text-center">
        <span className="inline-flex h-7 items-center rounded-[var(--r-sm)] bg-[var(--hover)] px-2.5 font-mono text-[12px] text-[color:var(--fg-2)] shadow-[inset_0_0_0_1px_var(--line)]">
          404
        </span>
        <h1 className="mt-6 max-w-[16ch] text-[clamp(34px,5vw,56px)] leading-[1.06] font-semibold tracking-[-0.035em] text-balance text-[color:var(--fg)]">
          Not found on this device.
        </h1>
        <p className="mt-4 text-[16px] leading-[1.55] text-[color:var(--fg-2)]">We searched offline and privately. Nothing.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <Link href="/" className="btn btn-primary">
            <ArrowLeft size={15} aria-hidden />
            Back home
          </Link>
          <Link href="/docs" className="btn btn-secondary">
            Read the docs
          </Link>
        </div>
      </main>
    </>
  )
}
