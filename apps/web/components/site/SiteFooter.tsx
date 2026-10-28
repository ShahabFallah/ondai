'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Star } from 'lucide-react'
import { manifest } from '@ondai/registry/manifest'
import { gitConfig } from '@/lib/shared'
import { Logo } from './Logo'
import './footer.css'

/**
 * Site footer: one inset panel. Brand, a line, GitHub and the install command on the left; four
 * link columns on the right; a meta row; then "ondai" set to the panel's exact width and cut by its
 * bottom edge. The letters hold a faint mosaic of component thumbnails that drifts sideways and
 * lights up under a spotlight (the pointer, or a slow idle wander when there is none).
 */

const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`
const features = manifest.filter((m) => m.hasPlayground && m.category !== 'primitive')
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
      { label: 'Installation', href: '/docs/installation' },
      { label: 'Theming', href: '/docs/theming' },
      { label: 'Device support', href: '/docs/device-support' },
      { label: 'llms.txt', href: '/llms.txt', plain: true },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub', href: githubUrl, plain: true },
      { label: 'Changelog', href: `${githubUrl}/commits/${gitConfig.branch}`, plain: true },
      { label: 'Launch notes', href: `${githubUrl}/tree/${gitConfig.branch}/docs/launch`, plain: true },
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

/* ------------------------------------------------------------------ */
/* The wordmark                                                         */
/* ------------------------------------------------------------------ */

/*
 * Set like the logo (Logo.tsx, logo.css) at 1000 px: the chip "o" is 0.515 em square on the
 * x-height, 0.035 em before "ndai" in Inter 600 (display cut) tracked -0.035 em.
 */
const CHIP = 515
/** The chip's die (ring, even-odd) and core, copied from Logo.tsx (it does not export them). 100 × 100. */
const CHIP_RING =
  'M100 50L99.9 61.9L99.6 67.9L99 72.6L98.2 76.6L97.2 80.1L95.9 83.3L94.5 86.1L92.7 88.6L90.8 90.8L88.6 92.7L86.1 94.5L83.3 95.9L80.1 97.2L76.6 98.2L72.6 99L67.9 99.6L61.9 99.9L50 100L38.1 99.9L32.1 99.6L27.4 99L23.4 98.2L19.9 97.2L16.7 95.9L13.9 94.5L11.4 92.7L9.2 90.8L7.3 88.6L5.5 86.1L4.1 83.3L2.8 80.1L1.8 76.6L1 72.6L0.4 67.9L0.1 61.9L0 50L0.1 38.1L0.4 32.1L1 27.4L1.8 23.4L2.8 19.9L4.1 16.7L5.5 13.9L7.3 11.4L9.2 9.2L11.4 7.3L13.9 5.5L16.7 4.1L19.9 2.8L23.4 1.8L27.4 1L32.1 0.4L38.1 0.1L50 0L61.9 0.1L67.9 0.4L72.6 1L76.6 1.8L80.1 2.8L83.3 4.1L86.1 5.5L88.6 7.3L90.8 9.2L92.7 11.4L94.5 13.9L95.9 16.7L97.2 19.9L98.2 23.4L99 27.4L99.6 32.1L99.9 38.1ZM80 50L79.9 59.9L79.8 63.8L79.5 66.8L79.1 69.3L78.6 71.4L78 73.2L77.2 74.8L76.3 76.2L75.3 77.4L74.2 78.5L72.9 79.5L71.4 80.3L69.7 81L67.8 81.5L65.5 82L62.8 82.3L59.1 82.4L50 82.5L40.9 82.4L37.2 82.3L34.5 82L32.2 81.5L30.3 81L28.6 80.3L27.1 79.5L25.8 78.5L24.7 77.4L23.7 76.2L22.8 74.8L22 73.2L21.4 71.4L20.9 69.3L20.5 66.8L20.2 63.8L20.1 59.9L20 50L20.1 40.1L20.2 36.2L20.5 33.2L20.9 30.7L21.4 28.6L22 26.8L22.8 25.2L23.7 23.8L24.7 22.6L25.8 21.5L27.1 20.5L28.6 19.7L30.3 19L32.2 18.5L34.5 18L37.2 17.7L40.9 17.6L50 17.5L59.1 17.6L62.8 17.7L65.5 18L67.8 18.5L69.7 19L71.4 19.7L72.9 20.5L74.2 21.5L75.3 22.6L76.3 23.8L77.2 25.2L78 26.8L78.6 28.6L79.1 30.7L79.5 33.2L79.8 36.2L79.9 40.1Z'
const CHIP_CORE =
  'M60.5 50L60.4 54.2L60.2 55.8L59.9 57.1L59.4 58.1L58.8 58.8L58.1 59.4L57.1 59.9L55.8 60.2L54.2 60.4L50 60.5L45.8 60.4L44.2 60.2L42.9 59.9L41.9 59.4L41.2 58.8L40.6 58.1L40.1 57.1L39.8 55.8L39.6 54.2L39.5 50L39.6 45.8L39.8 44.2L40.1 42.9L40.6 41.9L41.2 41.2L41.9 40.6L42.9 40.1L44.2 39.8L45.8 39.6L50 39.5L54.2 39.6L55.8 39.8L57.1 40.1L58.1 40.6L58.8 41.2L59.4 41.9L59.9 42.9L60.2 44.2L60.4 45.8Z'
const CHIP_DROP = 4 // the chip sits 0.004 em under the baseline, like the logo
const NDAI_X = CHIP + 35
const CHIP_AT = `translate(0 ${CHIP_DROP - CHIP}) scale(${CHIP / 100})`
const TRACKING = -35
/** Right edge and ascent of the ink at 1000 px, measured in Chromium; refined on the client. */
const FALLBACK: Box = { right: 2335, ascent: 732 }
const VISIBLE = 0.72 // share of the ascender left above the panel's bottom edge: the chip's core still shows
/** 27 component thumbnails in a 9 × 3 grid; a paper cut for light mode and a lifted cut for dark. */
const MOSAIC = { light: '/img/footer-mosaic-light.webp', dark: '/img/footer-mosaic-dark.webp', w: 2448, h: 528 }

interface Box {
  right: number
  ascent: number
}

function Wordmark() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<SVGTextElement>(null)
  const spotRef = useRef<SVGCircleElement>(null)
  const patternRef = useRef<SVGPatternElement>(null)
  const [box, setBox] = useState<Box>(FALLBACK)
  const [near, setNear] = useState(false)

  const vbX = 0
  const vbY = -box.ascent
  const vbW = box.right
  const vbH = Math.round(box.ascent * VISIBLE)
  const patW = vbW * 0.94
  const patH = (patW * MOSAIC.h) / MOSAIC.w
  const radius = vbW * 0.19

  // Fit: measure the real ink box once the font is in, so the word spans the panel exactly.
  useEffect(() => {
    let cancelled = false
    const measure = () => {
      const el = textRef.current
      if (!el || cancelled) return
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx) return
      ctx.font = `600 1000px ${getComputedStyle(el).fontFamily}`
      if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${TRACKING}px`
      const m = ctx.measureText('ndai')
      const next = {
        right: Math.round(NDAI_X + m.actualBoundingBoxRight),
        ascent: Math.round(Math.max(CHIP - CHIP_DROP, m.actualBoundingBoxAscent)),
      }
      if (next.right > NDAI_X && next.ascent > 0) setBox((b) => (b.right === next.right && b.ascent === next.ascent ? b : next))
    }
    void document.fonts?.ready.then(measure)
    return () => {
      cancelled = true
    }
  }, [])

  // The light and the drift. One rAF loop, only while the footer is on screen.
  useEffect(() => {
    const wrap = wrapRef.current
    const spot = spotRef.current
    const pattern = patternRef.current
    if (!wrap || !spot || !pattern) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const panel = wrap.closest('.footer-panel') ?? wrap

    const target = { x: vbX + vbW * 0.5, y: vbY + vbH * 0.6, a: 0 }
    const cur = { ...target }
    let pointer = false
    let raf = 0
    let last = 0
    let shift = 0
    let visible = false

    const onMove = (e: Event) => {
      const pe = e as PointerEvent
      if (pe.pointerType === 'touch') return
      const r = wrap.getBoundingClientRect()
      const inside = pe.clientY > r.top - 140 && pe.clientY < r.bottom + 40
      pointer = inside
      wrap.dataset.hot = inside ? 'true' : 'false'
      if (!inside) return
      target.x = vbX + ((pe.clientX - r.left) / r.width) * vbW
      target.y = vbY + ((pe.clientY - r.top) / r.height) * vbH
    }
    const onLeave = () => {
      wrap.dataset.hot = 'false'
      pointer = false
    }

    const tick = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 16
      last = t
      const still = reduce.matches
      if (!pointer) {
        if (still) {
          target.a = 0
        } else {
          // Idle wander: a slow Lissajous across the word, at half strength.
          target.x = vbX + vbW * (0.5 + 0.4 * Math.sin(t * 0.00021))
          target.y = vbY + vbH * (0.55 + 0.3 * Math.sin(t * 0.00037 + 1.3))
          target.a = 0.55
        }
      } else {
        target.a = 1
      }
      const k = still ? 1 : 1 - Math.pow(1 - 0.12, dt / 16)
      cur.x += (target.x - cur.x) * k
      cur.y += (target.y - cur.y) * k
      cur.a += (target.a - cur.a) * (still ? 1 : 1 - Math.pow(1 - 0.06, dt / 16))
      spot.setAttribute('cx', cur.x.toFixed(1))
      spot.setAttribute('cy', cur.y.toFixed(1))
      spot.setAttribute('opacity', cur.a.toFixed(3))
      if (!still) {
        shift = (shift + (dt * patW) / 140000) % patW
        pattern.setAttribute('x', (-shift).toFixed(1))
      }
      if (visible) raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true)
        const now = !!entry && entry.intersectionRatio > 0 && entry.isIntersecting
        if (now && !visible) {
          visible = true
          last = 0
          raf = requestAnimationFrame(tick)
        } else if (!now) {
          visible = false
          cancelAnimationFrame(raf)
        }
      },
      { rootMargin: '400px 0px' },
    )
    io.observe(wrap)
    panel.addEventListener('pointermove', onMove)
    panel.addEventListener('pointerleave', onLeave)
    return () => {
      visible = false
      cancelAnimationFrame(raf)
      io.disconnect()
      panel.removeEventListener('pointermove', onMove)
      panel.removeEventListener('pointerleave', onLeave)
    }
  }, [vbX, vbY, vbW, vbH, patW])

  return (
    <div ref={wrapRef} className="footer-mark" aria-hidden="true">
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} style={{ aspectRatio: `${vbW} / ${vbH}` }} className="footer-mark-svg">
        <defs>
          <clipPath id="ondai-fm-clip">
            {/* clipPath takes shapes, not groups: each path carries the chip's placement. */}
            <path d={CHIP_RING} clipRule="evenodd" transform={CHIP_AT} />
            <path d={CHIP_CORE} transform={CHIP_AT} />
            <text ref={textRef} x={NDAI_X} y="0" className="footer-mark-text" style={{ letterSpacing: TRACKING }}>
              ndai
            </text>
          </clipPath>
          <linearGradient id="ondai-fm-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="footer-mark-stop-a" />
            <stop offset="1" className="footer-mark-stop-b" />
          </linearGradient>
          <pattern ref={patternRef} id="ondai-fm-tiles" patternUnits="userSpaceOnUse" x="0" y={vbY} width={patW} height={patH}>
            {near ? (
              <>
                <image href={MOSAIC.light} width={patW} height={patH} preserveAspectRatio="none" className="footer-mark-img-light" />
                <image href={MOSAIC.dark} width={patW} height={patH} preserveAspectRatio="none" className="footer-mark-img-dark" />
              </>
            ) : null}
          </pattern>
          <radialGradient id="ondai-fm-spot-g">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="ondai-fm-spot" maskUnits="userSpaceOnUse" x={vbX} y={vbY} width={vbW} height={vbH}>
            <circle ref={spotRef} cx={vbX + vbW / 2} cy={vbY + vbH * 0.6} r={radius} fill="url(#ondai-fm-spot-g)" opacity="0" />
          </mask>
        </defs>
        <g clipPath="url(#ondai-fm-clip)">
          <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#ondai-fm-fill)" />
          <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#ondai-fm-tiles)" className="footer-mark-faint" />
          <g mask="url(#ondai-fm-spot)">
            <rect x={vbX} y={vbY} width={vbW} height={vbH} className="footer-mark-glow" />
            <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#ondai-fm-tiles)" />
          </g>
        </g>
        {/* The chip's core, lit violet while the pointer is on the word: the logo's hover, at scale. */}
        <path d={CHIP_CORE} transform={CHIP_AT} className="footer-mark-core" />
      </svg>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-panel">
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
          <span className="footer-meta-dot" aria-hidden="true" />
          <span>MIT</span>
          <span className="footer-status">
            <span className="footer-status-dot" aria-hidden="true" />
            All models local
          </span>
          <span className="footer-meta-end">Light or dark, your system decides.</span>
        </div>

        <Wordmark />
      </div>
    </footer>
  )
}
