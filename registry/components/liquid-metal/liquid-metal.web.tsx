import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { MetalFx } from 'metal-fx'
import { useMotion, useTheme } from '@ondai/tokens/react'
import type { LiquidMetalProps } from './liquid-metal'

export type { LiquidMetalProps, MetalPreset } from './liquid-metal'

/** Web: libraries.dev's own WebGL2 metal-fx (MIT; Paper Shaders' liquidMetal, Apache-2.0), with the native wrapper's defaults. */
export function LiquidMetal({ children, shape = 'button', preset = 'chromatic', active = false, radius, strength = 1, ringWidth, glow = true, fill, block, style }: LiquidMetalProps) {
  const t = useTheme()
  const motion = useMotion()
  const r = radius === undefined ? undefined : typeof radius === 'number' ? radius : t.radii[radius]
  // metal-fx measures its host on mount; wait one frame so the host has its final size.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const h = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(h)
  }, [])
  // metal-fx reveals a ring on its first composite. A ring that mounts while others already run can miss that
  // composite (metal-fx 2.0.11) and stay hidden with its content; show the content anyway after a moment.
  const root = useRef<{ style: { visibility: string; opacity: string } } | null>(null)
  useEffect(() => {
    if (!ready) return
    const h = setTimeout(() => {
      const el = root.current
      if (el && el.style.visibility === 'hidden') {
        el.style.visibility = 'visible'
        el.style.opacity = '1'
      }
    }, 600)
    return () => clearTimeout(h)
  }, [ready])
  if (!ready) return <View style={[{ alignSelf: 'flex-start', opacity: 0 }, style]}>{children}</View>
  return (
    <View style={[{ alignSelf: 'flex-start' }, style]}>
      <MetalFx ref={root as never} variant={shape} preset={preset} theme={t.scheme} strength={active ? strength : strength * 0.85} borderRadius={r ?? 999} paused={!motion.enabled} ringCssPx={ringWidth} disableGlow={!glow} style={block ? { display: 'flex', width: '100%' } : undefined}>
        {/* One host element for metal-fx to measure; it carries the body colour (native draws it on the canvas). */}
        <View style={[{ borderRadius: r ?? 999, backgroundColor: fill }, block ? { width: '100%' } : null]}>{children}</View>
      </MetalFx>
    </View>
  )
}

export default LiquidMetal
