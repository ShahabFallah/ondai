'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * "ondai", set like the logo across the full width of the footer and cut by its bottom edge. Plain
 * ink: the word is the picture. The letter positions are measured once the font is in, so the word
 * spans the width exactly.
 */

/*
 * Geometry at 1000 units = 1 em, as in Logo.tsx / logo.css: the chip "o" is 0.515 em square on the
 * x-height, 0.035 em before "ndai", which is Geist 600 tracked -0.035 em.
 */
const CHIP = 515
const CHIP_DROP = 4
const NDAI_X = CHIP + 35
const TRACKING = -35
const WORD = 'ndai'
/** Room above the ink. */
const PAD_TOP = 16
/**
 * The footer cuts the word this far above the baseline: about two thirds of the x-height letters
 * show, and three quarters of the ascenders.
 */
const CUT = 180
/** The ink box and letter positions at 1000 px in Geist, measured in Chromium; refined on the client. */
const FALLBACK: Box = { right: 2417, ascent: 719, xs: [0, 566, 1139.2, 1674] }

/** The chip's die (ring, even-odd) and core from Logo.tsx, 100 × 100. */
const CHIP_RING =
  'M100 50L99.9 61.9L99.6 67.9L99 72.6L98.2 76.6L97.2 80.1L95.9 83.3L94.5 86.1L92.7 88.6L90.8 90.8L88.6 92.7L86.1 94.5L83.3 95.9L80.1 97.2L76.6 98.2L72.6 99L67.9 99.6L61.9 99.9L50 100L38.1 99.9L32.1 99.6L27.4 99L23.4 98.2L19.9 97.2L16.7 95.9L13.9 94.5L11.4 92.7L9.2 90.8L7.3 88.6L5.5 86.1L4.1 83.3L2.8 80.1L1.8 76.6L1 72.6L0.4 67.9L0.1 61.9L0 50L0.1 38.1L0.4 32.1L1 27.4L1.8 23.4L2.8 19.9L4.1 16.7L5.5 13.9L7.3 11.4L9.2 9.2L11.4 7.3L13.9 5.5L16.7 4.1L19.9 2.8L23.4 1.8L27.4 1L32.1 0.4L38.1 0.1L50 0L61.9 0.1L67.9 0.4L72.6 1L76.6 1.8L80.1 2.8L83.3 4.1L86.1 5.5L88.6 7.3L90.8 9.2L92.7 11.4L94.5 13.9L95.9 16.7L97.2 19.9L98.2 23.4L99 27.4L99.6 32.1L99.9 38.1ZM80 50L79.9 59.9L79.8 63.8L79.5 66.8L79.1 69.3L78.6 71.4L78 73.2L77.2 74.8L76.3 76.2L75.3 77.4L74.2 78.5L72.9 79.5L71.4 80.3L69.7 81L67.8 81.5L65.5 82L62.8 82.3L59.1 82.4L50 82.5L40.9 82.4L37.2 82.3L34.5 82L32.2 81.5L30.3 81L28.6 80.3L27.1 79.5L25.8 78.5L24.7 77.4L23.7 76.2L22.8 74.8L22 73.2L21.4 71.4L20.9 69.3L20.5 66.8L20.2 63.8L20.1 59.9L20 50L20.1 40.1L20.2 36.2L20.5 33.2L20.9 30.7L21.4 28.6L22 26.8L22.8 25.2L23.7 23.8L24.7 22.6L25.8 21.5L27.1 20.5L28.6 19.7L30.3 19L32.2 18.5L34.5 18L37.2 17.7L40.9 17.6L50 17.5L59.1 17.6L62.8 17.7L65.5 18L67.8 18.5L69.7 19L71.4 19.7L72.9 20.5L74.2 21.5L75.3 22.6L76.3 23.8L77.2 25.2L78 26.8L78.6 28.6L79.1 30.7L79.5 33.2L79.8 36.2L79.9 40.1Z'
const CHIP_CORE =
  'M60.5 50L60.4 54.2L60.2 55.8L59.9 57.1L59.4 58.1L58.8 58.8L58.1 59.4L57.1 59.9L55.8 60.2L54.2 60.4L50 60.5L45.8 60.4L44.2 60.2L42.9 59.9L41.9 59.4L41.2 58.8L40.6 58.1L40.1 57.1L39.8 55.8L39.6 54.2L39.5 50L39.6 45.8L39.8 44.2L40.1 42.9L40.6 41.9L41.2 41.2L41.9 40.6L42.9 40.1L44.2 39.8L45.8 39.6L50 39.5L54.2 39.6L55.8 39.8L57.1 40.1L58.1 40.6L58.8 41.2L59.4 41.9L59.9 42.9L60.2 44.2L60.4 45.8Z'
const CHIP_AT = `translate(0 ${CHIP_DROP - CHIP}) scale(${CHIP / 100})`

interface Box {
  right: number
  ascent: number
  /** x of each letter of "ndai" after NDAI_X, for the SVG (SVG letter-spacing is not reliable). */
  xs: number[]
}

/* ------------------------------------------------------------------ */
/* Letterforms                                                          */
/* ------------------------------------------------------------------ */

/** x of each letter of "ndai" at `px`, kerning kept: each letter starts where the prefix ends. */
function letterXs(ctx: CanvasRenderingContext2D, px: number): number[] {
  return Array.from(WORD, (_, i) => ctx.measureText(WORD.slice(0, i)).width + (i * TRACKING * px) / 1000)
}

function measure(family: string): Box | null {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return null
  ctx.font = `600 1000px ${family}`
  const xs = letterXs(ctx, 1000)
  const last = ctx.measureText(WORD[WORD.length - 1]!)
  const all = ctx.measureText(WORD)
  const right = Math.round(NDAI_X + xs[xs.length - 1]! + last.actualBoundingBoxRight)
  const ascent = Math.round(Math.max(CHIP - CHIP_DROP, all.actualBoundingBoxAscent))
  return right > NDAI_X && ascent > 0 ? { right, ascent, xs: xs.map((x) => Math.round(x * 10) / 10) } : null
}

export function FooterMark() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    const wrap = wrapRef.current
    if (!wrap) return
    const fam = getComputedStyle(wrap).fontFamily
    const fonts = document.fonts
    const ready = fonts ? fonts.load(`600 100px ${fam}`).then(() => fonts.ready) : Promise.resolve()
    void ready
      .catch(() => {})
      .then(() => {
        if (cancelled) return
        const next = measure(fam)
        if (next) setBox((b) => (b.right === next.right && b.ascent === next.ascent && b.xs.join() === next.xs.join() ? b : next))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The visible part of the word: from the top of the ink down to the cut.
  const vbY = -box.ascent - PAD_TOP
  const vbH = box.ascent + PAD_TOP - CUT
  return (
    <div ref={wrapRef} className="footer-mark" style={{ aspectRatio: `${box.right} / ${vbH}` }} aria-hidden="true">
      <svg className="footer-mark-svg" viewBox={`0 ${vbY} ${box.right} ${vbH}`} preserveAspectRatio="none" focusable="false">
        <path d={CHIP_RING} fillRule="evenodd" transform={CHIP_AT} />
        <path d={CHIP_CORE} transform={CHIP_AT} />
        <text x={box.xs.map((x) => NDAI_X + x).join(' ')} y="0" className="footer-mark-text">
          {WORD}
        </text>
      </svg>
    </div>
  )
}
