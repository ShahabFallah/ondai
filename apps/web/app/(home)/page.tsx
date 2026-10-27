import Link from 'next/link'
import type { ReactNode } from 'react'
import { manifest } from '@ondai/registry/manifest'
import { CopyCommand } from '@/components/site/CopyCommand'
import { IonField } from '@/components/site/IonField'
import { LiveDemo } from '@/components/site/LiveDemo'
import type { DemoName } from '@/components/site/demos'

const devices = [
  { platform: 'iPhone', models: 'iPhone 15 Pro and newer, including the 16 and 17 families and the Air', model: 'Apple Foundation Models, iOS 26' },
  { platform: 'iPad and Mac', models: 'iPad Pro and Air with M1 or newer, iPad mini with A17 Pro, Apple silicon Macs', model: 'Apple Foundation Models, iOS 26 and macOS 26' },
  { platform: 'Android', models: 'Pixel 9 and newer, Galaxy S26 and the latest Fold and Flip, OnePlus 13 and newer, other AICore phones', model: 'Gemini Nano, Android 14' },
  { platform: 'Any phone', models: 'An opt-in GGUF model, about a 1 GB download', model: 'Llama through llama.rn' },
]

function Demo({ name, title, hint, children }: { name: DemoName; title: string; hint: string; children?: ReactNode }) {
  return (
    <article className="card mb-3 flex break-inside-avoid flex-col p-2">
      <div className="px-3 pt-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-medium tracking-tight">{title}</h3>
          <Link href={`/docs/components/${name}`} className="label underline-offset-4 hover:underline">
            Docs
          </Link>
        </div>
        <p className="mt-1 text-[13px] leading-5 text-[color:var(--ondai-text-secondary)]">{hint}</p>
      </div>
      <div className="card-stage p-4">{children ?? <LiveDemo name={name} />}</div>
    </article>
  )
}

export default function HomePage() {
  const count = manifest.filter((m) => m.hasPlayground).length
  return (
    <main className="relative">
      <section className="relative overflow-hidden">
        <IonField />
        <div className="wrap relative flex flex-col items-center pt-24 pb-16 text-center sm:pt-32 sm:pb-20">
          <h1 className="display max-w-[14ch]">The model is already on the phone.</h1>
          <p className="lead mt-6 max-w-[58ch]">
            Ondai is a set of copy-paste React Native components. Each one is a finished on-device AI feature: a command bar, forms that fill themselves, summaries, replies, filters. Free to run, private by design, and working in airplane mode.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/docs/installation" className="btn btn-primary">
              Get started
            </Link>
            <Link href="/playground" className="btn btn-secondary">
              Browse components
            </Link>
          </div>
          <div className="mt-6">
            <CopyCommand command="npx ondai add command-bar" />
          </div>
        </div>
      </section>

      <section className="wrap mt-4" aria-labelledby="try">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="try" className="h2">
              Try them here.
            </h2>
            <p className="mt-2 max-w-[60ch] text-[15px] leading-6 text-[color:var(--ondai-text-secondary)]">
              Everything on this page answers from a scripted mock in your browser. Installed in an app, the same code runs on the phone&apos;s own model.
            </p>
          </div>
          <Link href="/playground" className="label underline-offset-4 hover:underline">
            All {count} components in the playground
          </Link>
        </div>

        <div className="columns-1 gap-3 md:columns-2 xl:columns-3">
          <Demo name="command-bar" title="CommandBar" hint="Type what you want done and press Enter. Try “remind me to call Sam tomorrow”, “email Priya the budget” or “spent 12 at Blue Bottle”." />
          <Demo name="smart-reply" title="SmartReply" hint="Three replies for the last message in a thread. Tap one to use it." />
          <Demo name="smart-input" title="SmartInput" hint="Describe an expense in your own words. The form fills itself, with a confidence mark on every field." />
          <Demo name="natural-filter" title="NaturalFilter" hint="Search the way you talk: “cheap italian open now within 2 km, best rated first”." />
          <Demo name="summarize" title="Summarize" hint="A long thread, one tap, a streamed TL;DR." />
          <Demo name="rewrite" title="Rewrite" hint="Shorten, expand, warm up or fix a draft, then accept the diff." />
          <Demo name="auto-tag" title="AutoTag" hint="Tags picked from the app’s own list and fuzzy-matched after the model answers." />
        </div>
      </section>

      <section className="wrap mt-28" aria-labelledby="how">
        <h2 id="how" className="h2 max-w-[22ch]">
          Three commands between you and a shipped AI feature.
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-[17px] font-medium tracking-tight">Add the component</h3>
            <p className="mt-2 text-[15px] leading-6 text-[color:var(--ondai-text-secondary)]">
              The CLI copies TypeScript source into your project, the way shadcn/ui does. You own the files: change the prompts, the schema, the styling.
            </p>
            <pre className="code-block mt-4 rounded-[12px] bg-[color:var(--ondai-surface)] p-4">npx ondai init{'\n'}npx ondai add summarize</pre>
          </div>
          <div>
            <h3 className="text-[17px] font-medium tracking-tight">It picks the model on the device</h3>
            <p className="mt-2 text-[15px] leading-6 text-[color:var(--ondai-text-secondary)]">
              Apple Foundation Models on iPhone, Gemini Nano on Android, an optional Llama download anywhere else. The runtime routes by capability, handles cold starts and token budgets, and shows where it ran.
            </p>
          </div>
          <div>
            <h3 className="text-[17px] font-medium tracking-tight">Every state is designed</h3>
            <p className="mt-2 text-[15px] leading-6 text-[color:var(--ondai-text-secondary)]">
              Idle, thinking, streaming, tool call, confirmation, done, error, refusal, no model. The same quiet language in every component, so your app never shows a spinner and a prayer.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap mt-28" aria-labelledby="runs">
        <h2 id="runs" className="h2">
          Runs on
        </h2>
        <p className="mt-2 max-w-[60ch] text-[15px] leading-6 text-[color:var(--ondai-text-secondary)]">
          Device lists change with every hardware launch. The docs keep the current matrix.
        </p>
        <div className="card mt-8 overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="text-[color:var(--ondai-text-secondary)]">
                <th className="px-5 py-3 font-medium">Platform</th>
                <th className="px-5 py-3 font-medium">Devices</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Model</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.platform} className="border-t border-[color:var(--ondai-hairline)] align-top">
                  <td className="px-5 py-3 font-medium whitespace-nowrap">{d.platform}</td>
                  <td className="px-5 py-3 text-[color:var(--ondai-text-secondary)]">{d.models}</td>
                  <td className="hidden px-5 py-3 text-[color:var(--ondai-text-secondary)] sm:table-cell">{d.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
