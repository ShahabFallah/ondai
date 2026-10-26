import Link from 'next/link'
import { manifest } from '@ondai/registry/manifest'
import { Glyph } from '@/components/site/Glyph'
import { CopyCommand } from '@/components/site/CopyCommand'
import { HeroPreview } from '@/components/site/HeroPreview'

const why = [
  { title: 'Free', body: 'No API bill. The model ships with the phone.' },
  { title: 'Private', body: 'Text, photos and voice never leave the device.' },
  { title: 'Offline', body: 'Airplane mode on. Everything still works.' },
  { title: 'Fast', body: 'First token in hundreds of milliseconds, no round trip.' },
]

const devices = [
  { platform: 'iPhone', models: '15 Pro / Pro Max, 16 family, 16e, 17 family, Air', model: 'Apple Foundation Models · iOS 26+' },
  { platform: 'iPad / Mac', models: 'iPad Pro and Air (M1+), iPad mini (A17 Pro), Apple silicon Macs', model: 'Apple Foundation Models · iOS 26 / macOS 26' },
  { platform: 'Android', models: 'Pixel 9–11, Galaxy S26 / Z Fold7–8 / Z Flip8, OnePlus 13–15, Xiaomi 15/17, and others with AICore', model: 'Gemini Nano · Android 14+' },
  { platform: 'Any phone', models: 'Opt-in GGUF model (~1 GB download)', model: 'Llama via llama.rn' },
]

export default function HomePage() {
  const featured = manifest.filter((m) => m.hasPlayground && m.category !== 'primitive')
  return (
    <main className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px]" style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgba(139,124,255,0.18), transparent 70%)' }} />
      <section className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 pt-20 pb-16 text-center lg:flex-row lg:text-left lg:gap-16 lg:pt-28">
        <div className="flex-1 flex flex-col items-center lg:items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full ondai-hairline px-3 py-1 ondai-mono text-[color:var(--ondai-text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ondai-gradient)' }} /> on device · apple · nano · llama
          </span>
          <h1 className="text-[44px] leading-[1.02] font-semibold tracking-[-0.02em] sm:text-[64px]">
            AI that lives
            <br />
            on the phone.
          </h1>
          <p className="max-w-[520px] text-[17px] leading-7 text-[color:var(--ondai-text-secondary)]">
            Copy-paste React Native components for on-device AI. Each one is a complete feature powered by the model already on the user&apos;s phone: free, private, offline and fast.
          </p>
          <CopyCommand command="npx ondai add command-bar" />
          <div className="flex gap-3">
            <Link href="/docs" className="rounded-[12px] bg-[color:var(--ondai-text)] px-4 py-2.5 text-[15px] font-medium text-[color:var(--ondai-bg)]">
              Read the docs
            </Link>
            <Link href="/playground" className="rounded-[12px] ondai-hairline px-4 py-2.5 text-[15px] font-medium text-[color:var(--ondai-text)]">
              Open the playground
            </Link>
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <HeroPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-[24px] font-medium tracking-tight">Components</h2>
          <Link href="/playground" className="ondai-mono text-[color:var(--ondai-text-secondary)]">
            all {manifest.length} in the playground →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((m) => (
            <Link key={m.name} href={`/docs/components/${m.name}`} className="group flex flex-col gap-2 rounded-[16px] ondai-hairline bg-[color:var(--ondai-surface)] p-5 transition-colors hover:bg-[color:var(--ondai-elevated)]">
              <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">{m.category}</span>
              <span className="text-[17px] font-medium tracking-tight">{m.title}</span>
              <span className="text-[14px] leading-6 text-[color:var(--ondai-text-secondary)]">{m.description}</span>
              <span className="mt-2 ondai-mono text-[color:var(--ondai-text-tertiary)]">{Object.entries(m.variants).map(([k, v]) => `${k}: ${v.length}`).join(' · ') || 'primitive'}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-[24px] font-medium tracking-tight">Why on-device</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {why.map((w) => (
            <div key={w.title} className="rounded-[16px] ondai-hairline p-5">
              <div className="mb-2 text-[20px] font-medium tracking-tight">{w.title}</div>
              <div className="text-[14px] leading-6 text-[color:var(--ondai-text-secondary)]">{w.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-2 text-[24px] font-medium tracking-tight">Runs on</h2>
        <p className="mb-8 text-[14px] text-[color:var(--ondai-text-secondary)]">Device lists change with every hardware launch. See the docs for the current matrix.</p>
        <div className="overflow-hidden rounded-[16px] ondai-hairline">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[color:var(--ondai-surface)]">
              <tr>
                <th className="px-4 py-3 ondai-mono text-[color:var(--ondai-text-tertiary)]">Platform</th>
                <th className="px-4 py-3 ondai-mono text-[color:var(--ondai-text-tertiary)]">Devices</th>
                <th className="px-4 py-3 ondai-mono text-[color:var(--ondai-text-tertiary)]">Model</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.platform} className="border-t border-[color:var(--ondai-hairline)]">
                  <td className="px-4 py-3 font-medium">{d.platform}</td>
                  <td className="px-4 py-3 text-[color:var(--ondai-text-secondary)]">{d.models}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[color:var(--ondai-text-secondary)]">{d.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-6 text-[24px] font-medium tracking-tight">Built on</h2>
        <div className="flex flex-wrap gap-3">
          {[
            ['Callstack react-native-ai', 'https://github.com/callstackincubator/ai', 'Apple, Gemini Nano and llama.rn providers'],
            ['Vercel AI SDK', 'https://ai-sdk.dev', 'generateText, streamText, structured output, tools'],
            ['Expo', 'https://expo.dev', 'dev builds, router, modules'],
            ['Reanimated', 'https://docs.swmansion.com/react-native-reanimated/', 'the ion motion'],
          ].map(([name, href, what]) => (
            <a key={name} href={href} target="_blank" rel="noreferrer" className="flex flex-col gap-1 rounded-[14px] ondai-hairline px-4 py-3 hover:bg-[color:var(--ondai-surface)]">
              <span className="text-[15px] font-medium">{name}</span>
              <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">{what}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-12 border-t border-[color:var(--ondai-hairline)]">
        <span className="flex items-center gap-2">
          <Glyph size={16} /> <span className="text-[14px] font-medium">ondai</span>
          <span className="ondai-mono text-[color:var(--ondai-text-tertiary)] ml-2">mit · 0.1.0</span>
        </span>
        <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">copy. paste. private ai.</span>
      </footer>
    </main>
  )
}
