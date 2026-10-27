import ThemesClient from '@/components/themes/ThemesClient'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export const metadata = { title: 'Themes', description: 'Theme and accent builder with token export.' }

export default function ThemesPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap pt-10 pb-16 lg:pt-14">
        <header className="mb-10 max-w-[64ch]">
          <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Themes</h1>
          <p className="lead mt-2 text-[16px]">Pick a theme and an accent, or set your own three stops, then export the tokens as JSON or CSS variables for your app.</p>
        </header>
        <ThemesClient />
      </main>
      <SiteFooter />
    </>
  )
}
