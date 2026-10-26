import { RootProvider } from 'fumadocs-ui/provider/next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { generateCss } from '@ondai/tokens'
import './global.css'

const tokensCss = generateCss()

export const metadata = {
  title: { default: 'Ondai · AI that lives on the phone', template: '%s · Ondai' },
  description: 'Beautiful on-device AI components for React Native. Free, private, offline, fast.',
  openGraph: { images: ['/og.png'] },
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`} data-theme="void" suppressHydrationWarning>
      <head>
        <style id="ondai-tokens" dangerouslySetInnerHTML={{ __html: tokensCss }} />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider theme={{ defaultTheme: 'dark', forcedTheme: 'dark' }}>{children}</RootProvider>
      </body>
    </html>
  )
}
