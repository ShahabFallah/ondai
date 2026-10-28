'use client'
import { useCallback, type CSSProperties, type ReactNode } from 'react'
import { BorderBeam, ImageReveal, LiquidMetal, VoiceGlow } from '@/components/fx'

/** One 64 px tile with a hover lift and a name tooltip. */
function Tile({
  i,
  name,
  tone,
  children,
}: {
  i: number
  name: string
  tone: 'dark' | 'light'
  children: ReactNode
}) {
  return (
    <li className="hx-tile-wrap hx-in" style={{ '--i': i } as CSSProperties}>
      <span className="hx-tile" data-tone={tone} tabIndex={0} aria-label={name}>
        {children}
      </span>
      <span className="hx-tip" role="presentation">
        {name}
      </span>
    </li>
  )
}

/** VoiceInput: light rising from the bottom of a little mic tile, with level bars. */
function VoiceTile() {
  const level = useCallback(() => {
    const t = performance.now() / 1000
    return 0.45 + 0.3 * Math.sin(t * 3.1) * Math.sin(t * 1.3 + 1) + 0.15 * Math.sin(t * 7.7)
  }, [])
  return (
    <VoiceGlow level={level} radius={16} strength={0.95} className="hx-voice">
      <span className="hx-voice-box">
        <span className="hx-bars" aria-hidden>
          {[0, 1, 2, 3, 4].map((b) => (
            <span key={b} style={{ '--b': b } as CSSProperties} />
          ))}
        </span>
      </span>
    </VoiceGlow>
  )
}

/** IonBorder: the beam travelling around a tiny on-device chip. */
function BeamTile() {
  return (
    <BorderBeam radius={16} size="md" strength={0.9} duration={3.2} className="hx-beam">
      <span className="hx-chip" aria-hidden>
        <span className="hx-chip-core">AI</span>
      </span>
    </BorderBeam>
  )
}

/** AgentAvatar: a soft lit face that glances and blinks. */
function FaceTile() {
  return (
    <span className="hx-face" aria-hidden>
      <span className="hx-face-body">
        <span className="hx-face-eyes">
          <span />
          <span />
        </span>
      </span>
    </span>
  )
}

export function Tiles() {
  return (
    <ul className="hx-tiles" aria-label="A few of the components">
      <Tile i={0} name="VoiceInput" tone="dark">
        <VoiceTile />
      </Tile>
      <Tile i={1} name="IonBorder" tone="light">
        <BeamTile />
      </Tile>
      <Tile i={2} name="LiquidMetal" tone="light">
        <LiquidMetal size={46} strength={0.75} interactive={false} />
      </Tile>
      <Tile i={3} name="AgentAvatar" tone="light">
        <FaceTile />
      </Tile>
      <Tile i={4} name="ImageReveal" tone="dark">
        <ImageReveal
          src="/img/fx/field.png"
          alt=""
          mode="mosaic"
          cell={6}
          style={{ height: '100%' }}
          className="hx-reveal"
        />
      </Tile>
    </ul>
  )
}
