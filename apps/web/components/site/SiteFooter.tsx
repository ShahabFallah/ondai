import Link from 'next/link'
import { manifest } from '@ondai/registry/manifest'
import { AsciiCanvas, MetalText } from '@/components/fx'
import { gitConfig } from '@/lib/shared'
import { Glyph } from './Glyph'
import './footer.css'

/**
 * Site footer: an ASCII band (the phone, quiet), four link columns, the chrome wordmark, one legal line.
 * No border-top; space and the stage band separate it from the page.
 */

const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`
const features = manifest.filter((m) => m.hasPlayground && m.category !== 'primitive')

interface FooterLink {
  label: string
  href: string
  /** Rendered as a plain anchor: external URLs and route handlers (no client navigation). */
  plain?: boolean
}

const columns: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Product',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'Components', href: `/docs/components/${features[0]?.name ?? 'command-bar'}` },
      { label: 'Playground', href: '/playground' },
      { label: 'Themes', href: '/themes' },
    ],
  },
  {
    title: 'Components',
    links: features.slice(0, 6).map((m) => ({ label: m.title, href: `/docs/components/${m.name}` })),
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub', href: githubUrl, plain: true },
      { label: 'llms.txt', href: '/llms.txt', plain: true },
      { label: 'Review grid', href: '/review' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'MIT license', href: 'https://opensource.org/license/mit', plain: true },
      { label: 'Built in the open', href: `${githubUrl}/commits/${gitConfig.branch}`, plain: true },
      { label: 'Launch notes', href: `${githubUrl}/tree/${gitConfig.branch}/docs/launch`, plain: true },
    ],
  },
]

function FooterAnchor({ link }: { link: FooterLink }) {
  if (link.plain) {
    const external = /^https?:/.test(link.href)
    return (
      <a href={link.href} className="footer-link" {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {link.label}
      </a>
    )
  }
  return (
    <Link href={link.href} className="footer-link">
      {link.label}
    </Link>
  )
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-band stage" aria-hidden="true">
          <AsciiCanvas src="/img/footer-phone.png" cell={8} drift colorMode="image" className="footer-ascii" />
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <span className="footer-brand-row">
              <Glyph size={18} />
              <span>ondai</span>
            </span>
            <p className="footer-tagline">On-device AI components for React Native.</p>
          </div>
          <nav className="contents" aria-label="Footer">
            {columns.map((c) => (
              <div key={c.title} className="footer-col">
                <h2 className="footer-col-title">{c.title}</h2>
                <ul>
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <FooterAnchor link={l} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="footer-mark">
          <MetalText className="wordmark">ondai</MetalText>
        </div>
        <p className="footer-legal">© 2026 Ondai. MIT.</p>
      </div>
    </footer>
  )
}
