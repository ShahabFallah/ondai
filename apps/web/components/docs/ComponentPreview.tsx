/**
 * Live preview of a registry component (mock provider) inside the docs, via the playground embed route.
 * The card holds one stage; the embed draws the component's own frame inside it, with air around, so
 * there is a single ring at the stage edge. `height` is the iframe height; docs pages size it per component.
 */
export function ComponentPreview({ name, state, height = 480, query = '' }: { name: string; state?: string; height?: number; query?: string }) {
  const qs = new URLSearchParams(query)
  qs.set('embed', '1')
  if (state) qs.set('state', state)
  const src = `/playground/${name}?${qs.toString()}`
  return (
    <div className="not-prose card my-8 p-2">
      <div className="stage py-4">
        <iframe src={src} title={`${name} preview`} className="block w-full border-0 bg-transparent" style={{ height }} loading="lazy" />
      </div>
      <div className="label flex items-center justify-between gap-3 px-3 pt-3 pb-1.5">
        <span>Simulated output. In an app this runs on the phone&apos;s own model.</span>
        <a href={`/playground/${name}${state ? `?state=${state}` : ''}`} className="whitespace-nowrap text-[color:var(--ondai-text)] underline-offset-4 hover:underline">
          Open in the playground
        </a>
      </div>
    </div>
  )
}
