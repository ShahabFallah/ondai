import ThemesClient from '@/components/themes/ThemesClient'

export default function ThemesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="text-[24px] font-medium tracking-tight">Themes</h1>
        <p className="text-[13px] text-[color:var(--ondai-text-secondary)]">Pick a theme and accent, or set custom stops, then export the tokens as JSON or CSS variables.</p>
      </header>
      <ThemesClient />
    </main>
  )
}
