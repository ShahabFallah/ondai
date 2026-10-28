import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import { generateCss } from '@ondai/tokens'
import { Ambient } from '@/components/site/Ambient'
import './global.css'

// Inter with the optical-size axis: the display cut at headline sizes, the text cut at body sizes.
const siteSans = Inter({ subsets: ['latin'], axes: ['opsz'], variable: '--font-site-sans', display: 'swap' })

const tokensCss = generateCss()

export const metadata = {
  title: { default: 'Ondai · AI that lives on the phone', template: '%s · Ondai' },
  description: 'On-device AI components for React Native. Free, private, offline.',
  openGraph: { images: ['/og.png'] },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${siteSans.variable} ${GeistMono.variable}`} data-theme="void" suppressHydrationWarning>
      <head>
        <style id="ondai-tokens" dangerouslySetInnerHTML={{ __html: tokensCss }} />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider theme={{ defaultTheme: 'system', enableSystem: true }}>
          <Ambient />
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
