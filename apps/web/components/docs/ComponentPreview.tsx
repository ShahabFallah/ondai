'use client'
import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { ArrowUpRight } from 'lucide-react'

const noop = () => () => {}
const isClient = () => true
const isServer = () => false

/**
 * Live preview of a registry component (mock provider) inside the docs, via the playground embed route
 * (`/playground/<name>?embed=1`). The stage follows the site theme: Paper in light mode, Void in dark,
 * unless the page's own `query` pins a theme. The iframe mounts once the theme is known, so it never
 * loads twice on first paint. `height` is the iframe height; docs pages size it per component.
 */
export function ComponentPreview({ name, state, height = 480, query = '' }: { name: string; state?: string; height?: number; query?: string }) {
  const { resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(noop, isClient, isServer)

  const qs = new URLSearchParams(query)
  qs.set('embed', '1')
  if (state) qs.set('state', state)
  if (!qs.has('theme')) qs.set('theme', resolvedTheme === 'dark' ? 'void' : 'paper')
  const src = `/playground/${name}?${qs.toString()}`
  const ready = mounted && resolvedTheme !== undefined

  return (
    <div className="not-prose docs-preview">
      <div className="docs-preview-stage">
        {ready ? (
          <iframe key={src} src={src} title={`${name} preview`} style={{ height }} loading="lazy" />
        ) : (
          <div aria-hidden style={{ height }} />
        )}
      </div>
      <div className="docs-preview-foot">
        <span>Simulated on this page. Real on the phone.</span>
        <a href={`/playground/${name}${state ? `?state=${state}` : ''}`}>
          Open in playground
          <ArrowUpRight size={14} aria-hidden />
        </a>
      </div>
    </div>
  )
}
