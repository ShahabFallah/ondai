import ThemesClient from '@/components/themes/ThemesClient'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

export const metadata = { title: 'Themes', description: 'Theme and accent studio with token export.' }

export default function ThemesPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap pt-24 pb-24">
        <header className="mb-10 max-w-[40rem] pt-6 sm:pt-10">
          <h1 className="ui-title">Tune the light.</h1>
          <p className="ui-sub mt-3">Three themes, any accent. Real components, live. Take the tokens when it feels right.</p>
        </header>
        <ThemesClient />
      </main>
      <SiteFooter />
    </>
  )
}
