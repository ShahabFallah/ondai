'use client'
import type { CSSProperties, ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { BorderBeam as Beam } from 'border-beam'

/**
 * BorderBeam on the site: libraries.dev's border beam (MIT, github.com/Jakubantalik/Libraries.dev),
 * the same effect the registry's `border-beam` component draws with Skia on phones.
 */
export interface BorderBeamProps {
  children?: ReactNode
  /** Corner radius in px. Match it to the wrapped card. */
  radius?: number
  /** `md` circles the whole border; `sm` is the compact beam for small chips. */
  size?: 'sm' | 'md'
  /** 0 to 1. */
  strength?: number
  /** false: the beam fades out. */
  active?: boolean
  /** Seconds per lap. */
  duration?: number
  tone?: 'colorful' | 'mono' | 'ocean' | 'sunset'
  className?: string
  style?: CSSProperties
}

export function BorderBeam({ children, radius = 24, size = 'md', strength = 1, active = true, duration = 2.6, tone = 'colorful', className, style }: BorderBeamProps) {
  const { resolvedTheme } = useTheme()
  return (
    <Beam active={active} size={size} colorVariant={tone} theme={resolvedTheme === 'light' ? 'light' : 'dark'} borderRadius={radius} strength={strength} duration={duration} className={className} style={style}>
      {children}
    </Beam>
  )
}
