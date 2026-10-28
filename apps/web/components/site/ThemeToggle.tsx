'use client'
import { useId, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'

/**
 * One icon button that cycles System → Light → Dark. The icon is a single drawing that morphs:
 * light is a small sun with rays, dark is a large disc bitten into a crescent, system is a half-lit
 * disc in a ring. Shapes move with transforms only, so it stays smooth everywhere. Styles live in nav.css.
 */

type Mode = 'system' | 'light' | 'dark'
const ORDER: Mode[] = ['system', 'light', 'dark']
const LABEL: Record<Mode, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const RAYS = Array.from({ length: 8 }, (_, i) => i * 45)

const noop = () => () => {}
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const mode: Mode = mounted && (theme === 'light' || theme === 'dark') ? theme : 'system'
  const maskId = `tt-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]

  return (
    <button
      type="button"
      className={`theme-toggle${className ? ` ${className}` : ''}`}
      data-mode={mode}
      aria-label={`Theme: ${LABEL[mode]}. Switch to ${LABEL[next].toLowerCase()}.`}
      title={`Theme: ${LABEL[mode]}`}
      onClick={() => setTheme(next)}
    >
      <svg className="tt-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#fff" />
            {/* The bite that turns the disc into a crescent. */}
            <circle className="tt-bite" cx="17" cy="7" r="6.4" fill="#000" />
            {/* The half that system mode leaves unlit. */}
            <rect className="tt-half" x="12" y="0" width="12" height="24" fill="#000" />
          </mask>
        </defs>
        <g className="tt-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {RAYS.map((a) => (
            <line key={a} x1="12" y1="2.6" x2="12" y2="4.4" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
        <circle className="tt-ring" cx="12" cy="12" r="7.6" stroke="currentColor" strokeWidth="1.7" />
        <circle className="tt-disc" cx="12" cy="12" r="8.4" fill="currentColor" mask={`url(#${maskId})`} />
      </svg>
    </button>
  )
}
