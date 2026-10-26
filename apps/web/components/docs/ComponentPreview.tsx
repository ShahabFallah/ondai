/** Live preview of a registry component (mock provider) inside the docs, via the playground embed route. */
export function ComponentPreview({ name, state, height = 420, query = '' }: { name: string; state?: string; height?: number; query?: string }) {
  const qs = new URLSearchParams(query)
  qs.set('embed', '1')
  if (state) qs.set('state', state)
  const src = `/playground/${name}?${qs.toString()}`
  return (
    <div className="not-prose my-6 overflow-hidden rounded-[16px] ondai-hairline bg-[color:var(--ondai-bg)]">
      <iframe src={src} title={`${name} preview`} className="block w-full border-0" style={{ height }} loading="lazy" />
      <div className="flex items-center justify-between px-3 py-2 border-t border-[color:var(--ondai-hairline)]">
        <span className="ondai-mono text-[color:var(--ondai-text-tertiary)]">Simulated output. Real inference runs on device.</span>
        <a href={`/playground/${name}${state ? `?state=${state}` : ''}`} className="ondai-mono text-[color:var(--ondai-text-secondary)] hover:text-[color:var(--ondai-text)]">
          Open in playground →
        </a>
      </div>
    </div>
  )
}
