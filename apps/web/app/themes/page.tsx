import ThemesClient from '@/components/themes/ThemesClient'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export const metadata = { title: 'Themes', description: 'Theme and accent studio with token export.' }

export default function ThemesPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap pt-24 pb-24">
        <header className="mb-8 max-w-[64ch]">
          <h1 className="h2">Themes</h1>
          <p className="lead mt-3">Pick a theme and an accent, or set your own three stops. The screens are the real components on a scripted model; export the tokens as JSON or CSS variables when they look right.</p>
        </header>
        <ThemesClient />
      </main>
      <SiteFooter />
    </>
  )
}
