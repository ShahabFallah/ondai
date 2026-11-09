import { RootProvider } from 'fumadocs-ui/provider/next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { generateCss } from '@ondai/tokens'
import { Ambient } from '@/components/site/Ambient'
import './global.css'


/** Shown in the search dialog before anything is typed: where most people start. */
const SEARCH_SUGGESTIONS: [string, string][] = [
  ['Install Ondai in an Expo app', '/docs/installation'],
  ['How it works', '/docs/how-it-works'],
  ['Summarize long text', '/docs/components/summarize'],
  ['Command bar: say it, the app does it', '/docs/components/command-bar'],
  ['Translate on the phone', '/docs/components/translate'],
  ['Which phones have a model', '/docs/device-support'],
  ['Theming and variants', '/docs/theming'],
]

const tokensCss = generateCss()

export const metadata = {
  title: { default: 'Ondai · AI that lives on the phone', template: '%s · Ondai' },
  description: 'On-device AI components for React Native. Free, private, offline.',
  openGraph: { images: ['/og.png'] },
  icons: {
    icon: [
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} data-theme="void" suppressHydrationWarning>
      <head>
        <style id="ondai-tokens" dangerouslySetInnerHTML={{ __html: tokensCss }} />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider theme={{ defaultTheme: 'system', enableSystem: true }} search={{ links: SEARCH_SUGGESTIONS }}>
          <Ambient />
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
