'use client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { manifest } from '@ondai/registry/manifest'
import { DEFAULT_VARIANT, isAiComponent } from '@/lib/ai-components'
import { Segmented } from '../ui/Segmented'
import { PROVIDERS } from './RunsOn'

const noop = () => () => {}
const isClient = () => true
const isServer = () => false

interface Variant {
  key: string
  label: string
  options: string[]
  value: string
}

/**
 * Live preview of a registry component inside the docs, via the embed route (`/playground/<name>?embed=1`).
 *
 * Above the stage: the component's variants (its playground `variantKeys`), which the embed reports
 * over `postMessage` and switches in place. Below it: a Mock tag, because no model runs in a browser
 * and every answer here is scripted, and the providers it runs on as their marks.
 *
 * The stage follows the site theme (Paper in light, Void in dark) unless `query` pins one; the accent is
 * always the monochrome one. The iframe mounts once the theme is known, so it never loads twice.
 */
export function ComponentPreview({
  name,
  state,
  height = 480,
  query = '',
}: {
  name: string
  state?: string
  height?: number
  query?: string
}) {
  const { resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(noop, isClient, isServer)
  const frame = useRef<HTMLIFrameElement>(null)
  const [variants, setVariants] = useState<Variant[]>([])

  const entry = manifest.find((m) => m.name === name)
  const qs = new URLSearchParams(query)
  qs.set('embed', '1')
  qs.set('accent', 'mono')
  if (state) qs.set('state', state)
  // AI components open in the site's default variant unless the page asks for another.
  if (!qs.has('variant') && entry && isAiComponent(entry)) qs.set('variant', DEFAULT_VARIANT)
  // Simulate a provider the component really runs on (Photo caption is not on Apple yet).
  if (!qs.has('device') && entry?.runsOn?.length && !entry.runsOn.includes('apple') && entry.runsOn.includes('nano')) qs.set('device', 'nano')
  if (!qs.has('theme')) qs.set('theme', resolvedTheme === 'dark' ? 'void' : 'paper')
  const src = `/playground/${name}?${qs.toString()}`
  const ready = mounted && resolvedTheme !== undefined

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return
      if (e.data?.type === 'ondai:variants' && Array.isArray(e.data.variants))
        setVariants(e.data.variants as Variant[])
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // On a phone each variant group scrolls sideways: bring the selected option into view (e.g. bevel, last in its row).
  const bar = useRef<HTMLDivElement>(null)
  const hasVariants = variants.length > 0
  useEffect(() => {
    if (!hasVariants) return
    for (const group of bar.current?.querySelectorAll<HTMLElement>('.docs-preview-variant .seg') ?? []) {
      const on = group.querySelector<HTMLElement>('.seg-item[data-active="true"]')
      if (on && group.scrollWidth > group.clientWidth) group.scrollLeft = on.offsetLeft - (group.clientWidth - on.offsetWidth) / 2
    }
  }, [hasVariants])

  const choose = (key: string, value: string) => {
    setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, value } : v)))
    frame.current?.contentWindow?.postMessage(
      { type: 'ondai:set', key, value },
      window.location.origin,
    )
  }

  const model = !!entry?.capabilities.length
  const on = new Set(entry?.runsOn ?? ['apple', 'nano', 'cloud'])
  const limits = entry?.limits ?? []

  return (
    <div className="not-prose docs-preview">
      {variants.length ? (
        <div ref={bar} className="docs-preview-bar" aria-label="Variants">
          {variants.map((v) => (
            <div key={v.key} className="docs-preview-variant">
              <span className="docs-preview-variant-label">{v.label}</span>
              <Segmented
                size="sm"
                label={v.label}
                options={v.options}
                value={v.value}
                onChange={(o) => choose(v.key, o)}
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="docs-preview-stage">
        {ready ? (
          <iframe
            ref={frame}
            key={src}
            src={src}
            title={`${name} preview`}
            style={{ height }}
            loading="lazy"
          />
        ) : (
          <div aria-hidden style={{ height }} />
        )}
      </div>
      <div className="docs-preview-foot">
        {model ? (
          <span className="docs-mock" tabIndex={0} aria-describedby={`${name}-mock`}>
            <span className="docs-mock-dot" aria-hidden="true" />
            Mock
            <span className="docs-mock-note">· scripted answers</span>
            <span id={`${name}-mock`} role="tooltip" className="docs-mock-tip">
              No model runs in a browser, so every answer here is scripted. On a phone it comes from
              the model.
            </span>
          </span>
        ) : (
          <span className="docs-mock" data-plain="true">
            No model needed
          </span>
        )}
        {model ? (
          <div className="docs-preview-runs-wrap">
            <span className="docs-preview-variant-label" aria-hidden="true">
              Runs on
            </span>
            <ul className="docs-preview-runs" aria-label="Runs on">
              {PROVIDERS.map(({ id, maker, Mark }) => (
                <li
                  key={id}
                  data-supported={on.has(id)}
                  title={on.has(id) ? maker : `${maker}: not supported`}
                >
                  <Mark />
                  <span className="sr-only">
                    {on.has(id) ? `${maker}: supported` : `${maker}: not supported`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {limits.length ? (
        <ul className="docs-preview-limits" aria-label="Limits">
          {limits.map((l) => (
            <li key={l}>{withCode(l)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** `code` spans in a limit line become <code>. */
function withCode(text: string) {
  return text.split(/(`[^`]+`)/).map((part, i) => (part.startsWith('`') && part.endsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part))
}
