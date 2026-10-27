import Link from 'next/link'
import { Glyph } from './Glyph'
import { gitConfig } from '@/lib/shared'

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[color:var(--ondai-hairline)]">
      <div className="wrap flex flex-col gap-6 py-10 text-[14px] text-[color:var(--ondai-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2 text-[color:var(--ondai-text)]">
          <Glyph size={16} />
          <span className="font-medium">ondai</span>
          <span className="text-[color:var(--ondai-text-tertiary)]">MIT license</span>
        </span>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          <Link href="/docs" className="hover:text-[color:var(--ondai-text)]">
            Docs
          </Link>
          <Link href="/playground" className="hover:text-[color:var(--ondai-text)]">
            Playground
          </Link>
          <Link href="/themes" className="hover:text-[color:var(--ondai-text)]">
            Themes
          </Link>
          <a href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`} target="_blank" rel="noreferrer" className="hover:text-[color:var(--ondai-text)]">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
