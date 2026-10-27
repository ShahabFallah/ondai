import { RootProvider } from 'fumadocs-ui/provider/next'
import { Instrument_Sans } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import { generateCss } from '@ondai/tokens'
import './global.css'

// Site chrome: Instrument Sans (OFL), the closest open match to OpenAI Sans' round geometric character,
// set at 400/500 with normal tracking. Component previews keep Geist from the tokens, like the apps they stand in for.
const siteSans = Instrument_Sans({ subsets: ['latin'], axes: ['wdth'], variable: '--font-site-sans', display: 'swap' })

const tokensCss = generateCss()

export const metadata = {
  title: { default: 'Ondai · AI that lives on the phone', template: '%s · Ondai' },
  description: 'Beautiful on-device AI components for React Native. Free, private, offline, fast.',
  openGraph: { images: ['/og.png'] },
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${siteSans.variable} ${GeistMono.variable} dark`} data-theme="void" suppressHydrationWarning>
      <head>
        <style id="ondai-tokens" dangerouslySetInnerHTML={{ __html: tokensCss }} />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider theme={{ defaultTheme: 'dark', forcedTheme: 'dark' }}>{children}</RootProvider>
      </body>
    </html>
  )
}
