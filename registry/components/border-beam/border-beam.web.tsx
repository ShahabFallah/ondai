import { View } from 'react-native'
import { BorderBeam as WebBeam } from 'border-beam'
import { useMotion, useTheme } from '@ondai/tokens/react'
import type { BorderBeamProps } from './border-beam'

export type { BorderBeamProps } from './border-beam'

const LAP = { md: 2.6, sm: 2.2, line: 3.4, 'pulse-inner': 2.6, 'pulse-outside': 2.6 } as const

/** Web: libraries.dev's own CSS border beam (MIT), with the same Ondai defaults as the native Skia port. */
export function BorderBeam({ children, active = true, tone = 'colorful', size = 'md', radius = 'lg', strength = 1, style }: BorderBeamProps) {
  const t = useTheme()
  const motion = useMotion()
  const r = typeof radius === 'number' ? radius : t.radii[radius]
  return (
    <View style={[{ borderRadius: r }, style]}>
      <WebBeam
        active={active}
        size={size}
        colorVariant={tone}
        theme={t.scheme}
        borderRadius={r}
        strength={strength}
        duration={motion.enabled ? LAP[size] : 1e9}
        staticColors={!motion.enabled || tone === 'mono'}
      >
        {children}
      </WebBeam>
    </View>
  )
}

export default BorderBeam
