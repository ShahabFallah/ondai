/** The Ondai glyph: a rounded square (the phone) with a glowing ion dot. Works at 16px and in monochrome. */
export function Glyph({ size = 24, mono = false }: { size?: number; mono?: boolean }) {
  const id = `ion-${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="6" y1="10" x2="18" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7CF7FF" />
          <stop offset="0.5" stopColor="#8B7CFF" />
          <stop offset="1" stopColor="#FF7CE5" />
        </linearGradient>
      </defs>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" stroke={mono ? 'currentColor' : 'rgba(255,255,255,0.22)'} strokeWidth="1.5" />
      <circle cx="12" cy="13" r="2.6" fill={mono ? 'currentColor' : `url(#${id})`} />
      {!mono ? <circle cx="12" cy="13" r="5.5" fill={`url(#${id})`} opacity="0.18" /> : null}
    </svg>
  )
}
