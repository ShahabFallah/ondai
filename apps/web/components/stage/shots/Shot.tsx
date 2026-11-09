'use client'
import { useEffect, useState } from 'react'
import { HeroShot } from './Hero'
import { DocsShot } from './Docs'
import { shots, type ShotName } from './names'

// The page around a shot is empty and transparent, so a screenshot with omitBackground keeps real alpha.
const PAGE = `
html, body { background: transparent !important; margin: 0 !important; overflow: hidden !important; min-height: 0 !important; }
.ambient, nextjs-portal { display: none !important; }
`

export function Shot({ name, dark }: { name: string; dark: boolean }) {
  const [width, height] = shots[name as ShotName]
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => live && setReady(true))))
    return () => {
      live = false
    }
  }, [])
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE }} />
      <div id="shot" data-shot-ready={ready || undefined} style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        {name === 'hero' && <HeroShot dark={dark} />}
        {name === 'hero-sm' && <HeroShot dark={dark} compact />}
        {name.startsWith('docs-') && <DocsShot name={name.slice(5)} dark={dark} />}
      </div>
    </>
  )
}
