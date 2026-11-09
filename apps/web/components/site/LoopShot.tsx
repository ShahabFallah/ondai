'use client'
import { useEffect, useRef } from 'react'

/**
 * A component's still with its loop (scripts/loops.mjs) on top, one pair per theme (`.only-light` /
 * `.only-dark`). The loop plays while the pointer is over the closest link or `[data-loop-host]` around it
 * and rewinds when it leaves; `autoPlay` plays it as soon as it mounts. Without a loop, or under reduced
 * motion, only the still shows.
 */
export function LoopShot({ name, loop, autoPlay = false, className }: { name: string; loop: boolean; autoPlay?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !loop || autoPlay) return
    const host = el.closest<HTMLElement>('a, [data-loop-host]') ?? el
    const videos = () => Array.from(el.querySelectorAll('video'))
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const play = () => {
      if (reduced()) return
      for (const v of videos()) if (v.checkVisibility?.() ?? v.offsetParent) void v.play().catch(() => {})
    }
    const stop = () => {
      for (const v of videos()) {
        v.pause()
        v.currentTime = 0
      }
    }
    host.addEventListener('pointerenter', play)
    host.addEventListener('pointerleave', stop)
    host.addEventListener('focusin', play)
    host.addEventListener('focusout', stop)
    return () => {
      host.removeEventListener('pointerenter', play)
      host.removeEventListener('pointerleave', stop)
      host.removeEventListener('focusin', play)
      host.removeEventListener('focusout', stop)
    }
  }, [loop, autoPlay])

  return (
    <span ref={ref} className={`loop-shot${className ? ` ${className}` : ''}`} aria-hidden="true">
      {(['light', 'dark'] as const).map((theme) => (
        <span key={theme} className={`loop-shot-layer only-${theme}`}>
          <img src={`/thumbs/${theme}/${name}.webp`} alt="" loading="lazy" decoding="async" draggable={false} />
          {loop ? (
            <video
              src={`/loops/${theme}/${name}.mp4`}
              poster={`/thumbs/${theme}/${name}.webp`}
              muted
              loop
              playsInline
              preload={autoPlay ? 'auto' : 'none'}
              autoPlay={autoPlay}
              disablePictureInPicture
            />
          ) : null}
        </span>
      ))}
    </span>
  )
}
