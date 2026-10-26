'use client'
import dynamic from 'next/dynamic'
import type { PlaygroundDef, PlaygroundQuery } from '@ondai/playground'

const PreviewTree = dynamic(() => import('./PreviewTree'), {
  ssr: false,
  loading: () => <p className="ondai-mono ondai-waiting text-[color:var(--ondai-text-tertiary)] p-8">mounting…</p>,
})

export function Preview({ def, query }: { def: PlaygroundDef; query: PlaygroundQuery }) {
  const frame = query.frame
  const bg = query.theme === 'paper' ? '#FAFAFA' : '#07080A'
  if (frame === 'none') {
    return (
      <div data-theme={query.theme} className="rounded-[22px] ondai-hairline overflow-hidden" style={{ background: bg }}>
        <PreviewTree def={def} query={query} />
      </div>
    )
  }
  const android = frame === 'android'
  return (
    <div
      data-theme={query.theme}
      className="relative overflow-hidden"
      style={{ width: 390 + 24, height: 844 + 24, borderRadius: android ? 36 : 56, padding: 12, background: '#15181C', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.6)' }}
    >
      {!android ? <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, borderRadius: 20, background: '#000', zIndex: 2 }} /> : null}
      <div style={{ width: 390, height: 844, borderRadius: android ? 24 : 44, overflow: 'hidden', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PreviewTree def={def} query={query} />
      </div>
    </div>
  )
}
