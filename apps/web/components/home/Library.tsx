import Link from 'next/link'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Smartphone } from 'lucide-react'
import type { ManifestEntry } from '@ondai/registry/manifest'
import { aiComponents, displayTitle } from '@/lib/ai-components'
import { LoopShot } from '@/components/site/LoopShot'
import { Reveal } from './Reveal'

const thumbsDir = [join(process.cwd(), 'public', 'thumbs'), join(process.cwd(), 'apps', 'web', 'public', 'thumbs')].find((d) => existsSync(d))
const withThumb = aiComponents.filter((m) => !!thumbsDir && existsSync(join(thumbsDir, 'light', `${m.name}.webp`)))
const hasLoop = (name: string) => !!thumbsDir && existsSync(join(thumbsDir, '..', 'loops', 'light', `${name}.mp4`)) && existsSync(join(thumbsDir, '..', 'loops', 'dark', `${name}.mp4`))
const half = Math.ceil(withThumb.length / 2)
const rows = [withThumb.slice(0, half), withThumb.slice(half)]

const devices = [
  { icon: Smartphone, text: 'iPhone 15 Pro and newer' },
  { icon: Smartphone, text: 'Pixel 9 and newer' },
]

function Tile({ m, ghost }: { m: ManifestEntry; ghost?: boolean }) {
  return (
    <Link href={`/docs/components/${m.name}`} className="wall-tile" tabIndex={ghost ? -1 : undefined} aria-hidden={ghost || undefined}>
      <span className="wall-shot">
        <LoopShot name={m.name} loop={!ghost && hasLoop(m.name)} />
      </span>
      <span className="wall-name">{displayTitle(m.title)}</span>
    </Link>
  )
}

export function Library() {
  return (
    <section className="section section-tight home-section" aria-labelledby="library">
      <div className="wrap">
        <header className="home-head">
          <h2 id="library" className="home-h2">
            Every component is yours.
          </h2>
          <p className="home-sub">Copy the source. Change anything.</p>
        </header>
      </div>
      <Reveal className="wall reveal">
        {rows.map((row, r) => (
          <div key={r} className="wall-row" data-dir={r % 2 ? 'right' : 'left'}>
            <div className="wall-track" style={{ ['--n' as string]: row.length }}>
              {row.map((m) => (
                <Tile key={m.name} m={m} />
              ))}
              {row.map((m) => (
                <Tile key={`${m.name}-ghost`} m={m} ghost />
              ))}
            </div>
          </div>
        ))}
      </Reveal>
      <div className="wrap">
        <div className="devices">
          <span className="devices-label">Runs on</span>
          <ul className="devices-list">
            {devices.map(({ icon: Icon, text }) => (
              <li key={text} className="devices-chip">
                <Icon size={14} strokeWidth={1.6} aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
