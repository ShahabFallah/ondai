import { LogoMark } from './Logo'

/**
 * Legacy name for the Ondai mark. Renders the chip from `Logo.tsx` so older imports keep working.
 * `mono` is accepted for compatibility; the mark is always single colour (currentColor) now.
 */
export function Glyph({ size = 24, className }: { size?: number; mono?: boolean; className?: string }) {
  return <LogoMark size={size} className={className} />
}
