'use client'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { useVisible } from './useVisible'

/**
 * MetalText: chrome lettering as an inline SVG.
 *
 * The glyphs are filled with a vertical chrome gradient (white → light grey → a thin dark seam at the
 * horizon → grey → white). A filter then makes the surface liquid: feTurbulence + feDisplacementMap
 * warp the outline slightly, feSpecularLighting with a point light that drifts adds the bevel and the
 * shimmer across the face, and a faint drop shadow seats it on the page.
 *
 * The SVG works in user units where 1 em = 100, and sizes itself in `em`, so it inherits the font
 * size (or takes `fontSize`) and stays crisp at any size. The glyph box is measured once (and again
 * when web fonts finish loading). The light moves in a small rAF loop that only runs while the text
 * is on screen; under reduced motion it holds still.
 */

export interface MetalTextProps {
  /** The text to render as chrome. */
  children: string
  className?: string
  /** CSS px. Defaults to the inherited font size. */
  fontSize?: number
  /** Font weight (default 500). */
  weight?: number
  style?: CSSProperties
}

const EM = 100
const PAD_X = 0.14 * EM
const PAD_Y = 0.2 * EM

interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function MetalText({ children, className = '', fontSize, weight = 500, style }: MetalTextProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const gradId = `mt-g-${uid}`
  const filterId = `mt-f-${uid}`
  const svgRef = useRef<SVGSVGElement>(null)
  const textRef = useRef<SVGTextElement>(null)
  const lightRef = useRef<SVGFEPointLightElement>(null)
  const clock = useRef(0)
  const { visible, reduced } = useVisible(svgRef)
  // Measured glyph box in user units; before measurement, an estimate keeps the layout close.
  const [box, setBox] = useState<Box>(() => ({ x: 0, y: -0.72 * EM, w: 0.56 * EM * children.length, h: 0.92 * EM }))

  useEffect(() => {
    const text = textRef.current
    if (!text) return
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const b = text.getBBox()
      if (b.width <= 0 || b.height <= 0) return
      setBox((prev) =>
        prev.x === b.x && prev.y === b.y && prev.w === b.width && prev.h === b.height
          ? prev
          : { x: b.x, y: b.y, w: b.width, h: b.height },
      )
    }
    measure()
    document.fonts?.ready.then(measure)
    return () => {
      cancelled = true
    }
  }, [children, weight])

  useEffect(() => {
    const light = lightRef.current
    const svg = svgRef.current
    if (!light || !svg) return
    const cx = box.x + box.w / 2
    const cy = box.y + box.h * 0.3
    const set = (t: number) => {
      light.setAttribute('x', (cx + Math.cos(t * 0.5) * box.w * 0.55).toFixed(1))
      light.setAttribute('y', (cy + Math.sin(t * 0.8) * box.h * 0.3 - box.h * 0.35).toFixed(1))
      light.setAttribute('z', String(EM * 2.4))
    }
    if (reduced || !visible) {
      set(reduced ? 1.2 : clock.current)
      svg.dataset.running = 'false'
      return
    }
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      if (last) {
        const dt = Math.min(0.05, (now - last) / 1000)
        clock.current += dt
      }
      last = now
      set(clock.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    svg.dataset.running = 'true'
    return () => {
      cancelAnimationFrame(raf)
      svg.dataset.running = 'false'
    }
  }, [box, visible, reduced])

  const vw = box.w + PAD_X * 2
  const vh = box.h + PAD_Y * 2

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={`${box.x - PAD_X} ${box.y - PAD_Y} ${vw} ${vh}`}
      width={`${vw / EM}em`}
      height={`${vh / EM}em`}
      role="img"
      aria-label={children}
      data-running="false"
      style={{ display: 'block', overflow: 'visible', fontSize: fontSize != null ? `${fontSize}px` : undefined, ...style }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9ced6" />
          <stop offset="0.12" stopColor="#f6f7f9" />
          <stop offset="0.3" stopColor="#b4bac3" />
          <stop offset="0.46" stopColor="#eef0f3" />
          <stop offset="0.5" stopColor="#1a1d21" />
          <stop offset="0.535" stopColor="#4a4f57" />
          <stop offset="0.74" stopColor="#8e949c" />
          <stop offset="0.9" stopColor="#e4e7eb" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <filter id={filterId} x="-10%" y="-30%" width="120%" height="160%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.016" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="liquid" />
          <feGaussianBlur in="liquid" stdDeviation="2.2" result="soft" />
          <feComposite in="soft" in2="noise" operator="arithmetic" k1="0" k2="1" k3="0.35" k4="0" result="bump" />
          <feSpecularLighting in="bump" surfaceScale="6" specularConstant="1.25" specularExponent="22" lightingColor="#ffffff" result="spec">
            <fePointLight ref={lightRef} x="0" y="-80" z="240" />
          </feSpecularLighting>
          <feComposite in="spec" in2="liquid" operator="in" result="specIn" />
          <feComposite in="specIn" in2="liquid" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lit" />
          <feDropShadow in="lit" dx="0" dy="3" stdDeviation="5" floodColor="#000000" floodOpacity="0.5" />
        </filter>
      </defs>
      <text
        ref={textRef}
        x="0"
        y="0"
        fontSize={EM}
        fontWeight={weight}
        letterSpacing="-0.02em"
        fill={`url(#${gradId})`}
        filter={`url(#${filterId})`}
      >
        {children}
      </text>
    </svg>
  )
}
