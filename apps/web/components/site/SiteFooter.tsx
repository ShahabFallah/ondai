'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Star } from 'lucide-react'
import { manifest } from '@ondai/registry/manifest'
import { displayTitle } from '@/lib/ai-components'
import { gitConfig } from '@/lib/shared'
import { Logo } from './Logo'
import { FooterMark } from './FooterMark'
import './footer.css'

/**
 * Site footer, full width. Brand, the line, GitHub and the install command on the left; three link
 * columns on the right; a short meta row; then "ondai" across the whole width in plain ink.
 */

const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`
const FEATURED = ['command-bar', 'smart-input', 'summarize', 'smart-reply', 'voice-input']
const features = FEATURED.flatMap((n) => manifest.filter((m) => m.name === n))
const INSTALL = 'npx ondai init'

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
      { label: 'Components', href: '/docs/components' },
      { label: 'Installation', href: '/docs/installation' },
      { label: 'Theming', href: '/docs/theming' },
      { label: 'Device support', href: '/docs/device-support' },
    ],
  },
  {
    title: 'Components',
    links: features.map((m) => ({ label: displayTitle(m.title), href: `/docs/components/${m.name}` })),
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub', href: githubUrl, plain: true },
      { label: 'Changelog', href: `${githubUrl}/commits/${gitConfig.branch}`, plain: true },
      { label: 'llms.txt', href: '/llms.txt', plain: true },
      { label: 'MIT license', href: 'https://opensource.org/license/mit', plain: true },
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

function GitHubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

function InstallCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  return (
    <button
      type="button"
      className="footer-install"
      data-copied={copied || undefined}
      aria-label={copied ? 'Copied' : `Copy ${INSTALL}`}
      onClick={() => {
        void navigator.clipboard?.writeText(INSTALL).catch(() => {})
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1600)
      }}
    >
      <span className="footer-install-prompt" aria-hidden="true">
        $
      </span>
      <span>{INSTALL}</span>
      <span className="footer-install-icon" aria-hidden="true">
        <Copy size={13} strokeWidth={1.75} className="footer-install-copy" />
        <Check size={13} strokeWidth={2} className="footer-install-check" />
      </span>
    </button>
  )
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" className="footer-logo">
            <Logo size={24} />
            <span className="sr-only"> home</span>
          </Link>
          <p className="footer-line">The cloud called. We let it ring.</p>
          <div className="footer-actions">
            <a href={githubUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary footer-star">
              <GitHubMark />
              <span>Star on GitHub</span>
              <Star size={13} strokeWidth={1.75} className="footer-star-icon" aria-hidden="true" />
            </a>
            <InstallCopy />
          </div>
        </div>
        <nav className="footer-cols" aria-label="Footer">
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

      <div className="footer-meta">
        <span>© 2026 Ondai</span>
      </div>

      <FooterMark />
    </footer>
  )
}
