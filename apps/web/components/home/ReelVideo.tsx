'use client'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

/** A touch quicker than real time; the takes are paced for it. */
const RATE = 1.15
const reduce = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * One recorded reel (public/reels). Plays only while it is on screen, follows the site theme, and under
 * reduced motion shows the answer as a still instead of playing.
 */
export function ReelVideo({ name, label }: { name: string; label: string }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [still, setStill] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
  const base = `/reels/${name}-${theme}`

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    setStill(reduce())
    const on = () => setStill(reduce())
    mq?.addEventListener('change', on)
    return () => mq?.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    const v = ref.current
    if (!v || still || typeof IntersectionObserver === 'undefined') return
    v.playbackRate = RATE
    const io = new IntersectionObserver(
      (entries) => {
        // Entries for one target can arrive batched, oldest first: only the newest is the current state.
        const e = entries[entries.length - 1]
        if (e?.isIntersecting) {
          v.playbackRate = RATE
          v.play().catch(() => {})
        } else v.pause()
      },
      { threshold: 0.15 },
    )
    // Buffer the whole clip a screen ahead, so it is moving the moment it is seen.
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        v.preload = 'auto'
        near.disconnect()
      },
      { rootMargin: '100% 0px' },
    )
    near.observe(v)
    io.observe(v)
    return () => {
      near.disconnect()
      io.disconnect()
      v.pause()
    }
  }, [still, theme, mounted])

  // Before hydration the theme is unknown: both posters, the stylesheet shows the right one.
  if (!mounted) {
    return (
      <>
        <img className="reel-media reel-only-light" src={`/reels/${name}-light.jpg`} alt="" aria-hidden />
        <img className="reel-media reel-only-dark" src={`/reels/${name}-dark.jpg`} alt="" aria-hidden />
      </>
    )
  }
  if (still) {
    return <img className="reel-media" src={`${base}-still.jpg`} alt={label} />
  }
  return (
    <video key={theme} ref={ref} className="reel-media" muted playsInline loop preload="metadata" poster={`${base}.jpg`} aria-label={label}>
      {/* H.264 first: Safari and Chrome both play it; VP9 is the fallback for builds without H.264. */}
      <source src={`${base}.mp4`} type="video/mp4" />
      <source src={`${base}.webm`} type="video/webm" />
    </video>
  )
}
