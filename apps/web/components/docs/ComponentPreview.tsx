/** Live preview of a registry component (mock provider) inside the docs, via the playground embed route. */
export function ComponentPreview({ name, state, height = 420, query = '' }: { name: string; state?: string; height?: number; query?: string }) {
  const qs = new URLSearchParams(query)
  qs.set('embed', '1')
  if (state) qs.set('state', state)
  const src = `/playground/${name}?${qs.toString()}`
  return (
    <div className="not-prose card my-6 overflow-hidden p-2">
      <div className="card-stage">
        <iframe src={src} title={`${name} preview`} className="block w-full border-0" style={{ height }} loading="lazy" />
      </div>
      <div className="flex items-center justify-between gap-3 px-3 pt-3 pb-1">
        <span className="label">Simulated output. In an app this runs on the phone&apos;s own model.</span>
        <a href={`/playground/${name}${state ? `?state=${state}` : ''}`} className="label whitespace-nowrap text-[color:var(--ondai-text)] underline-offset-4 hover:underline">
          Open in the playground
        </a>
      </div>
    </div>
  )
}
